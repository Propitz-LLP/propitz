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

export async function getPendingTransactions(): Promise<Transaction[]> {
  return getTransactions({ status: 'Admin Pending' })
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
