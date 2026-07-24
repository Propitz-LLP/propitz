import { createClient, createAdminClient } from '@/lib/supabase/server'
import type { Transaction, TransactionStatus, TransactionType } from '@/types'

export interface TransactionFilters {
  investorId?: string
  type?: TransactionType
  propertyId?: string
  status?: TransactionStatus
}

export async function getTransactions(filters: TransactionFilters = {}): Promise<Transaction[]> {
  const supabase = await createClient()
  let query = supabase
    .from('transactions')
    .select('*, transaction_history(*)')
    .order('date', { ascending: false })

  if (filters.investorId) query = query.eq('investorId', filters.investorId)
  if (filters.type)       query = query.eq('type', filters.type)
  if (filters.propertyId) query = query.eq('propertyId', filters.propertyId)
  if (filters.status)     query = query.eq('status', filters.status)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []) as Transaction[]
}

export async function getTransactionById(id: string): Promise<Transaction | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('transactions')
    .select('*, transaction_history(*)')
    .eq('id', id)
    .single()
  if (error || !data) return null
  return data as Transaction
}

// Admin-context read — RLS admin policies never match (role lives in
// app_metadata); admin flows must bypass RLS.
export async function getTransactionByIdAdmin(id: string): Promise<Transaction | null> {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('transactions')
    .select('*, transaction_history(*)')
    .eq('id', id)
    .single()
  if (error || !data) return null
  return data as Transaction
}

// Admin-context list — same RLS caveat as above
export async function getTransactionsAdmin(filters: TransactionFilters = {}): Promise<Transaction[]> {
  const supabase = await createAdminClient()
  let query = supabase
    .from('transactions')
    .select('*, transaction_history(*)')
    .order('date', { ascending: false })

  if (filters.investorId) query = query.eq('investorId', filters.investorId)
  if (filters.type)       query = query.eq('type', filters.type)
  if (filters.propertyId) query = query.eq('propertyId', filters.propertyId)
  if (filters.status)     query = query.eq('status', filters.status)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []) as Transaction[]
}

export async function getPendingTransactions(): Promise<Transaction[]> {
  return getTransactionsAdmin({ status: 'Admin Pending' })
}

export async function createTransaction(
  txn: Omit<Transaction, 'history'>,
): Promise<Transaction> {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('transactions')
    .insert(txn)
    .select()
    .single()
  if (error) throw new Error(error.message)

  // Insert initial history entry
  await appendTransactionHistory(data.id, txn.status, 'System')
  return getTransactionById(data.id) as Promise<Transaction>
}

export async function updateTransactionStatus(
  id: string,
  status: TransactionStatus,
  by: string,
): Promise<void> {
  const supabase = await createAdminClient()
  const { error } = await supabase
    .from('transactions')
    .update({ status })
    .eq('id', id)
  if (error) throw new Error(error.message)
  await appendTransactionHistory(id, status, by)
}

// Atomic core of approval: status → Completed, ownership allocated, property
// counter decremented, reservation released — all in one DB transaction via
// the approve_transaction_atomic RPC (migration 007). Certificate generation
// and email happen outside this call, as best-effort follow-ups.
export async function approveTransactionAtomic(
  transactionId: string,
  reviewedBy: string,
): Promise<{ ownershipId: string }> {
  const supabase = await createAdminClient()
  const { data, error } = await supabase.rpc('approve_transaction_atomic', {
    p_transaction_id: transactionId,
    p_reviewed_by: reviewedBy,
  })
  if (error) throw new Error(error.message)
  return { ownershipId: (data as { ownershipId: string }[])[0].ownershipId }
}

// Atomic distribution payout: one Distribution transaction per holder + the
// summary row, all in one DB transaction via the distribute_atomic RPC
// (migration 008). A unique (propertyId, period) guard makes it idempotent —
// a retry raises 'already_distributed'. Emails are best-effort follow-ups.
export async function distributeAtomic(
  propertyId: string,
  period: string,
  perUnit: number,
  feePct: number,
  date: string,
  by: string,
): Promise<{
  distributionId: string
  investorCount: number
  grossTotal: number
  feeTotal: number
  netTotal: number
}> {
  const supabase = await createAdminClient()
  const { data, error } = await supabase.rpc('distribute_atomic', {
    p_property_id: propertyId,
    p_period: period,
    p_per_unit: perUnit,
    p_fee_pct: feePct,
    p_date: date,
    p_by: by,
  })
  if (error) throw new Error(error.message)
  const row = (data as {
    distributionId: string
    investorCount: number
    grossTotal: number
    feeTotal: number
    netTotal: number
  }[])[0]
  return row
}

export async function appendTransactionHistory(
  transactionId: string,
  status: TransactionStatus,
  by: string,
): Promise<void> {
  const supabase = await createAdminClient()
  const { error } = await supabase
    .from('transaction_history')
    .insert({ transactionId, status, date: new Date().toISOString().slice(0, 10), by })
  if (error) throw new Error(error.message)
}

export async function getDistributions(propertyId?: string) {
  const supabase = await createClient()
  let query = supabase
    .from('distributions')
    .select('*')
    .order('date', { ascending: false })
  if (propertyId) query = query.eq('propertyId', propertyId)
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function createDistribution(dist: Record<string, unknown>) {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('distributions')
    .insert(dist)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function getPendingFees(investorId?: string) {
  const supabase = await createAdminClient()
  let query = supabase
    .from('pending_fees')
    .select('*')
    .eq('status', 'Pending')
  if (investorId) query = query.eq('investorId', investorId)
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data ?? []
}
