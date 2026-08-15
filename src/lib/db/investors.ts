// All investor + KYC DB access lives here.
// To migrate to RDS: swap createClient() for a Drizzle/pg client. Query shapes stay the same.

import { createClient, createAdminClient } from '@/lib/supabase/server'
import type { Investor, KycSubmission, KycDocument } from '@/types'

export async function getInvestorById(id: string): Promise<Investor | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('investors')
    .select('*')
    .eq('id', id)
    .single()
  if (error || !data) return null
  return data as Investor
}

export async function getInvestorByEmail(email: string): Promise<Investor | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('investors')
    .select('*')
    .eq('email', email)
    .single()
  if (error || !data) return null
  return data as Investor
}

// Admin-context read — the JWT-role RLS policies never match this app's
// app_metadata role model, so admin flows must bypass RLS.
export async function getInvestorByIdAdmin(id: string): Promise<Investor | null> {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('investors')
    .select('*')
    .eq('id', id)
    .single()
  if (error || !data) return null
  return data as Investor
}

// KYC-approved investors only — the pool admin may allocate property units to.
export async function listApprovedInvestors(): Promise<Investor[]> {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('investors')
    .select('*')
    .eq('kycStatus', 'Approved')
    .order('name', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as Investor[]
}

export async function createInvestor(investor: Omit<Investor, 'createdAt'>): Promise<Investor> {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('investors')
    .insert(investor)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as Investor
}

export async function updateInvestorKycStatus(
  investorId: string,
  status: Investor['kycStatus'],
): Promise<void> {
  const supabase = await createAdminClient()
  const { error } = await supabase
    .from('investors')
    .update({ kycStatus: status })
    .eq('id', investorId)
  if (error) throw new Error(error.message)
}

// ── KYC Submissions ──────────────────────────────────────────

export async function getKycQueue(): Promise<KycSubmission[]> {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('kyc_submissions')
    .select('*, documents:kyc_documents(*), investors!inner(name, email, "kycStatus")')
    .in('investors.kycStatus', ['Submitted', 'Under Review', 'Rejected'])
    .order('submittedAt', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as KycSubmission[]
}

export async function getKycSubmissionByInvestor(investorId: string): Promise<KycSubmission | null> {
  // Admin client: called from server actions after requireAuth/requireAdmin,
  // and the JWT-role RLS policies don't match this app's app_metadata role model.
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('kyc_submissions')
    .select('*, documents:kyc_documents(*)')
    .eq('investorId', investorId)
    .limit(1)
    .single()
  if (error || !data) return null
  return data as KycSubmission
}

// One draft row per investor (unique index on investorId). Creates on first
// step save, merges fields on every subsequent save.
export async function upsertKycDraft(
  investorId: string,
  fields: Partial<Omit<KycSubmission, 'id' | 'investorId' | 'documents'>>,
): Promise<KycSubmission> {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('kyc_submissions')
    .upsert({ investorId, ...fields }, { onConflict: 'investorId' })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as KycSubmission
}

export async function createKycDocument(
  doc: Omit<KycDocument, 'id'>,
): Promise<KycDocument> {
  const supabase = await createAdminClient()
  // Replace semantics: one row per (submission, type)
  await supabase
    .from('kyc_documents')
    .delete()
    .eq('submissionId', doc.submissionId)
    .eq('type', doc.type)
  const { data, error } = await supabase
    .from('kyc_documents')
    .insert(doc)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as KycDocument
}

export async function updateKycReview(
  submissionId: string,
  reviewedBy: string,
  notes?: string,
): Promise<void> {
  const supabase = await createAdminClient()
  const { error } = await supabase
    .from('kyc_submissions')
    .update({ reviewedBy, notes, reviewedAt: new Date().toISOString() })
    .eq('id', submissionId)
  if (error) throw new Error(error.message)
}

export async function listAllInvestors(): Promise<Investor[]> {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('investors')
    .select('*')
    .order('createdAt', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as Investor[]
}
