import { createClient, createAdminClient } from '@/lib/supabase/server'
import type { Property, ValuationHistory } from '@/types'

export async function listPublishedProperties(): Promise<Property[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .eq('status', 'Open')
    .order('createdAt', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as Property[]
}

export async function listAllProperties(): Promise<Property[]> {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .order('createdAt', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as Property[]
}

export async function getPropertyBySlug(slug: string): Promise<Property | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .eq('slug', slug)
    .single()
  if (error || !data) return null
  return data as Property
}

export async function getPropertyById(id: string): Promise<Property | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .eq('id', id)
    .single()
  if (error || !data) return null
  return data as Property
}

// Admin-context fetch — bypasses RLS so Draft/Closed properties are editable.
// Only call from routes already guarded by requireAdmin().
export async function getPropertyByIdAdmin(id: string): Promise<Property | null> {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .eq('id', id)
    .single()
  if (error || !data) return null
  return data as Property
}

export async function createProperty(
  property: Omit<Property, 'id' | 'createdAt' | 'updatedAt' | 'subscribedUnits'>,
): Promise<Property> {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('properties')
    .insert({ ...property, subscribedUnits: 0, status: 'Draft' })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as Property
}

export async function updateProperty(
  id: string,
  updates: Partial<Omit<Property, 'id' | 'createdAt'>>,
): Promise<Property> {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('properties')
    .update({ ...updates, updatedAt: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as Property
}

// True when investors have holdings or payment records tied to the property —
// such properties must be Closed, never deleted, to preserve financial records.
export async function propertyHasActivity(id: string): Promise<boolean> {
  const supabase = await createAdminClient()
  const [ownerships, transactions] = await Promise.all([
    supabase.from('ownerships').select('id', { count: 'exact', head: true }).eq('propertyId', id),
    supabase.from('transactions').select('id', { count: 'exact', head: true }).eq('propertyId', id),
  ])
  if (ownerships.error) throw new Error(ownerships.error.message)
  if (transactions.error) throw new Error(transactions.error.message)
  return (ownerships.count ?? 0) > 0 || (transactions.count ?? 0) > 0
}

// Hard delete — valuation history and distributions cascade away with the row.
export async function deletePropertyAdmin(id: string): Promise<void> {
  const supabase = await createAdminClient()
  const { error } = await supabase.from('properties').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// Sellable units right now: total − sold − held (active/consumed reservations).
// Recomputed on every call — financial figures must never be stale-cached (FR-05.2).
export async function getAvailableUnits(property: Property): Promise<number> {
  const { getHeldUnits } = await import('./reservations')
  const held = await getHeldUnits(property.id)
  return Math.max(0, property.totalUnits - property.subscribedUnits - held)
}

// Atomically decrement available units — called after transaction approval
export async function reserveUnits(propertyId: string, units: number): Promise<void> {
  const supabase = await createAdminClient()
  const { error } = await supabase.rpc('reserve_property_units', { p_property_id: propertyId, p_units: units })
  if (error) throw new Error(error.message)
}

export async function getValuationHistory(propertyId: string): Promise<ValuationHistory[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('valuation_history')
    .select('*')
    .eq('propertyId', propertyId)
    .order('recordedAt', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as ValuationHistory[]
}

export async function addValuationEntry(
  entry: Omit<ValuationHistory, 'id'>,
): Promise<ValuationHistory> {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('valuation_history')
    .insert(entry)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as ValuationHistory
}

// Revalue a property atomically: new price + valuation_history row + audit entry
// in one DB transaction (record_valuation_atomic RPC). Returns the previous
// price so the caller can report the % change and notify holders.
export async function recordValuationAtomic(
  propertyId: string,
  newPrice: number,
  quarter: string,
  by: string,
): Promise<{ valuationId: string; previousPrice: number }> {
  const supabase = await createAdminClient()
  const { data, error } = await supabase.rpc('record_valuation_atomic', {
    p_property_id: propertyId,
    p_new_price: newPrice,
    p_quarter: quarter,
    p_by: by,
  })
  if (error) throw new Error(error.message)
  const row = (data as { valuationId: string; previousPrice: number }[])[0]
  return { valuationId: row.valuationId, previousPrice: Number(row.previousPrice) }
}
