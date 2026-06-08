import { createClient, createAdminClient } from '@/lib/supabase/server'
import type { InvestorDocument, DocumentType } from '@/types'

export async function getDocumentsByInvestor(investorId: string): Promise<InvestorDocument[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('investorId', investorId)
    .order('issuedAt', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as InvestorDocument[]
}

export async function createDocument(
  doc: Omit<InvestorDocument, 'id' | 'signedUrl'>,
): Promise<InvestorDocument> {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('documents')
    .insert(doc)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as InvestorDocument
}

export async function getDocumentById(id: string): Promise<InvestorDocument | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('id', id)
    .single()
  if (error || !data) return null
  return data as InvestorDocument
}
