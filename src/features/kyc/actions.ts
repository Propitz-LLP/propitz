'use server'

import { requireAuth, requireAdmin } from '@/lib/auth'
import { createKycSubmission, updateInvestorKycStatus, updateKycReview } from '@/lib/db/investors'
import { sendKycApproved, sendKycRejected } from '@/lib/notifications/email'
import { getInvestorById } from '@/lib/db/investors'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

export async function submitKycAction(data: {
  pan: string
  aadhaarMasked: string
  bankAccount: string
  bankName: string
}) {
  const user = await requireAuth()

  await createKycSubmission({
    investorId: user.id,
    pan: data.pan,
    aadhaarMasked: data.aadhaarMasked,
    bankAccount: data.bankAccount,
    bankName: data.bankName,
    submittedAt: new Date().toISOString(),
  })

  await updateInvestorKycStatus(user.id, 'Submitted')
  revalidatePath('/onboarding/kyc')
  return { success: true }
}

export async function approveKycAction(investorId: string, submissionId: string) {
  const admin = await requireAdmin()

  await updateInvestorKycStatus(investorId, 'Approved')
  await updateKycReview(submissionId, admin.email)

  const investor = await getInvestorById(investorId)
  if (investor) {
    await sendKycApproved(investor.email, investor.name)
  }

  revalidatePath('/admin/kyc')
  return { success: true }
}

export async function rejectKycAction(
  investorId: string,
  submissionId: string,
  reason: string,
) {
  const admin = await requireAdmin()

  await updateInvestorKycStatus(investorId, 'Rejected')
  await updateKycReview(submissionId, admin.email, reason)

  const investor = await getInvestorById(investorId)
  if (investor) {
    await sendKycRejected(investor.email, investor.name, reason)
  }

  revalidatePath('/admin/kyc')
  return { success: true }
}
