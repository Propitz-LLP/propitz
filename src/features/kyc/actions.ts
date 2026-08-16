'use server'

import { requireAuth, requireAdmin } from '@/lib/auth'
import {
  getInvestorById,
  getInvestorByIdAdmin,
  getKycSubmissionByInvestor,
  updateInvestorKycStatus,
  updateKycReview,
  upsertKycDraft,
  createKycDocument,
} from '@/lib/db/investors'
import { uploadKycDocument, getKycDocumentUrl } from '@/lib/storage/kyc-docs'
import { getStorageProvider, storage } from '@/lib/storage'
import { recordAudit } from '@/lib/audit'
import { recordNotification } from '@/lib/notifications/inapp'
import { sendKycApproved, sendKycRejected, sendKycReceived } from '@/lib/notifications/email'
import { revalidatePath } from 'next/cache'
import { step1AccountSchema, step2IdentitySchema, step3BankSchema, KYC_DOC_TYPES } from './schemas'
import type { KycDocType } from '@/types'

const DOC_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png']
const DOC_MAX_BYTES = 5 * 1024 * 1024

// Resolves whose KYC is being edited and authorizes it. With a targetInvestorId
// an admin edits that investor's KYC on their behalf; otherwise the signed-in
// investor edits their own. Either way the record must still be editable
// (Not Started / Rejected). Returns the effective investorId used for all writes.
async function resolveEditableKyc(targetInvestorId?: string) {
  if (targetInvestorId) {
    await requireAdmin()
    const investor = await getInvestorByIdAdmin(targetInvestorId)
    if (!investor) return { investorId: targetInvestorId, error: 'Investor profile not found' }
    if (investor.kycStatus !== 'Not Started' && investor.kycStatus !== 'Rejected') {
      return { investorId: targetInvestorId, error: 'KYC is already submitted and cannot be edited' }
    }
    return { investorId: targetInvestorId, investor, error: null }
  }
  const user = await requireAuth()
  const investor = await getInvestorById(user.id)
  if (!investor) return { investorId: user.id, error: 'Investor profile not found' }
  if (investor.kycStatus !== 'Not Started' && investor.kycStatus !== 'Rejected') {
    return { investorId: user.id, error: 'KYC is already submitted and cannot be edited' }
  }
  return { investorId: user.id, investor, error: null }
}

export async function saveKycStepAction(step: 1 | 2 | 3, formData: FormData, targetInvestorId?: string) {
  const { investorId, error } = await resolveEditableKyc(targetInvestorId)
  if (error) return { error: { _form: [error] } }

  const raw = Object.fromEntries(formData.entries())

  if (step === 1) {
    const parsed = step1AccountSchema.safeParse(raw)
    if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }
    // Phone + type live on the investors row, not the submission
    const { createAdminClient } = await import('@/lib/supabase/server')
    const supabase = await createAdminClient()
    const { error: dbError } = await supabase
      .from('investors')
      .update({ phone: parsed.data.phone, type: parsed.data.investorType })
      .eq('id', investorId)
    if (dbError) return { error: { _form: [dbError.message] } }
    await upsertKycDraft(investorId, { currentStep: 2 })
    return { success: true }
  }

  if (step === 2) {
    const parsed = step2IdentitySchema.safeParse(raw)
    if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }
    const { aadhaar, ...rest } = parsed.data
    await upsertKycDraft(investorId, {
      ...rest,
      // UIDAI: never persist the full Aadhaar — last 4 digits only
      aadhaarMasked: `XXXX XXXX ${aadhaar.slice(-4)}`,
      currentStep: 3,
    })
    return { success: true }
  }

  const parsed = step3BankSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }
  const { accountNumberConfirm: _confirm, accountNumber, ...bank } = parsed.data
  await upsertKycDraft(investorId, { ...bank, bankAccount: accountNumber, currentStep: 4 })
  return { success: true }
}

export async function uploadKycDocumentAction(formData: FormData, targetInvestorId?: string) {
  const { investorId, error } = await resolveEditableKyc(targetInvestorId)
  if (error) return { error }

  const docType = String(formData.get('docType')) as KycDocType
  const file = formData.get('file')
  if (!KYC_DOC_TYPES.includes(docType)) return { error: 'Unknown document type' }
  if (!(file instanceof File) || file.size === 0) return { error: 'Choose a file to upload' }
  if (!DOC_MIME_TYPES.includes(file.type)) return { error: 'Only PDF, JPG or PNG files are accepted' }
  if (file.size > DOC_MAX_BYTES) return { error: 'File must be under 5 MB' }

  const submission = await getKycSubmissionByInvestor(investorId)
    ?? await upsertKycDraft(investorId, { currentStep: 4 })

  const filename = `${Date.now()}_${file.name.replace(/[^\w.-]+/g, '_')}`
  const buffer = Buffer.from(await file.arrayBuffer())
  const path = await uploadKycDocument(investorId, submission.id, docType, buffer, filename, file.type)

  // Replace: remove the previous file for this doc type from storage
  const previous = submission.documents?.find(d => d.type === docType)
  if (previous) {
    await getStorageProvider().delete(storage.buckets.kycDocs, previous.storagePath).catch(() => {})
  }

  const doc = await createKycDocument({
    submissionId: submission.id,
    type: docType,
    storagePath: path,
    sizeBytes: file.size,
    uploadedAt: new Date().toISOString(),
  })
  return { success: true, document: doc }
}

export async function submitKycAction(targetInvestorId?: string) {
  const { investorId, investor, error } = await resolveEditableKyc(targetInvestorId)
  if (error || !investor) return { error: error ?? 'Investor profile not found' }

  const submission = await getKycSubmissionByInvestor(investorId)
  if (!submission) return { error: 'Complete the KYC form before submitting' }

  const missingFields = !submission.fullLegalName || !submission.pan || !submission.aadhaarMasked
    || !submission.bankAccount || !submission.ifsc
  if (missingFields) return { error: 'Some steps are incomplete. Go back and fill all required fields.' }

  const uploadedTypes = new Set((submission.documents ?? []).map(d => d.type))
  const missingDocs = KYC_DOC_TYPES.filter(t => !uploadedTypes.has(t))
  if (missingDocs.length > 0) return { error: 'All four documents must be uploaded before submitting.' }

  await upsertKycDraft(investorId, {
    status: 'pending',
    submittedAt: new Date().toISOString(),
    currentStep: 5,
    notes: undefined,
  })
  await updateInvestorKycStatus(investorId, 'Submitted')

  await sendKycReceived(investor.email, investor.name).catch(() => {})
  await recordNotification({
    investorId,
    type: 'kyc.received',
    title: 'KYC submitted',
    body: 'We’ve received your KYC details and started the review. We’ll notify you once it’s complete.',
    link: '/onboarding/kyc',
  }).catch(() => {})

  revalidatePath('/onboarding/kyc')
  revalidatePath('/admin/investors')
  revalidatePath('/admin/kyc')
  return { success: true }
}

export async function getKycStatusAction() {
  const user = await requireAuth()
  const investor = await getInvestorById(user.id)
  const submission = await getKycSubmissionByInvestor(user.id)
  return {
    kycStatus: investor?.kycStatus ?? 'Not Started',
    rejectionReason: investor?.kycStatus === 'Rejected' ? submission?.notes ?? null : null,
  }
}

// ── Admin review actions ──────────────────────────────────────

// 15-minute signed URL so an admin can view a private KYC document
export async function getKycDocumentUrlAction(storagePath: string) {
  await requireAdmin()
  const url = await getKycDocumentUrl('', storagePath)
  return { url }
}

export async function markKycUnderReviewAction(investorId: string) {
  const admin = await requireAdmin()
  const investor = await getInvestorByIdAdmin(investorId)
  if (investor?.kycStatus === 'Submitted') {
    await updateInvestorKycStatus(investorId, 'Under Review')
    await recordAudit({
      actor: admin,
      action: 'kyc.under_review',
      entityType: 'investor',
      entityId: investorId,
      before: { kycStatus: investor.kycStatus },
      after: { kycStatus: 'Under Review' },
    })
    revalidatePath('/admin/kyc')
  }
  return { success: true }
}

export async function approveKycAction(investorId: string, submissionId: string) {
  const admin = await requireAdmin()

  const prev = await getInvestorByIdAdmin(investorId)

  await updateInvestorKycStatus(investorId, 'Approved')
  await updateKycReview(submissionId, admin.email)
  await upsertKycDraft(investorId, { status: 'approved' })

  await recordAudit({
    actor: admin,
    action: 'kyc.approve',
    entityType: 'investor',
    entityId: investorId,
    before: { kycStatus: prev?.kycStatus ?? null },
    after: { kycStatus: 'Approved', submissionId },
  })

  const investor = await getInvestorByIdAdmin(investorId)
  if (investor) await sendKycApproved(investor.email, investor.name).catch(() => {})
  await recordNotification({
    investorId,
    type: 'kyc.approved',
    title: 'KYC approved',
    body: 'Your account is verified. You can now invest in properties.',
    link: '/properties',
  }).catch(() => {})

  revalidatePath('/admin/kyc')
  return { success: true }
}

export async function rejectKycAction(
  investorId: string,
  submissionId: string,
  reason: string,
) {
  const admin = await requireAdmin()
  if (reason.trim().length < 10) {
    return { error: 'Rejection reason must be at least 10 characters' }
  }

  const prev = await getInvestorByIdAdmin(investorId)

  await updateInvestorKycStatus(investorId, 'Rejected')
  await updateKycReview(submissionId, admin.email, reason.trim())
  await upsertKycDraft(investorId, { status: 'rejected' })

  await recordAudit({
    actor: admin,
    action: 'kyc.reject',
    entityType: 'investor',
    entityId: investorId,
    before: { kycStatus: prev?.kycStatus ?? null },
    after: { kycStatus: 'Rejected', reason: reason.trim(), submissionId },
  })

  const investor = await getInvestorByIdAdmin(investorId)
  if (investor) await sendKycRejected(investor.email, investor.name, reason.trim()).catch(() => {})
  await recordNotification({
    investorId,
    type: 'kyc.rejected',
    title: 'KYC needs attention',
    body: `Your KYC was not approved: ${reason.trim()}. Please review and resubmit.`,
    link: '/onboarding/kyc',
  }).catch(() => {})

  revalidatePath('/admin/kyc')
  return { success: true }
}
