// All investor + KYC DB access lives here.
// To migrate to RDS: swap createClient() for a Drizzle/pg client. Query shapes stay the same.

import { createClient, createAdminClient } from '@/lib/supabase/server'
import type { Investor, KycSubmission } from '@/types'

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
    .select('*, kyc_documents(*)')
    .in('investors.kycStatus', ['Submitted', 'Under Review'])
    .order('submittedAt', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as KycSubmission[]
}

export async function getKycSubmissionByInvestor(investorId: string): Promise<KycSubmission | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('kyc_submissions')
    .select('*, kyc_documents(*)')
    .eq('investorId', investorId)
    .order('submittedAt', { ascending: false })
    .limit(1)
    .single()
  if (error || !data) return null
  return data as KycSubmission
}

export async function createKycSubmission(
  submission: Omit<KycSubmission, 'id' | 'documents'>,
): Promise<KycSubmission> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('kyc_submissions')
    .insert(submission)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as KycSubmission
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
