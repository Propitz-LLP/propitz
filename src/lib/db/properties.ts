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
