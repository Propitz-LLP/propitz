// Unit reservation (15-min hold) DB access. All writes go through the admin
// client — reservations are created/mutated only from server actions that have
// already authenticated the caller.

import { createAdminClient } from '@/lib/supabase/server'
import type { UnitReservation } from '@/types'

export class InsufficientUnitsError extends Error {}

export async function createReservation(
  propertyId: string,
  investorId: string,
  units: number,
  ttlSeconds: number,
): Promise<UnitReservation> {
  const supabase = await createAdminClient()
  const { data, error } = await supabase.rpc('reserve_units_atomic', {
    p_property_id: propertyId,
    p_investor_id: investorId,
    p_units: units,
    p_ttl_seconds: ttlSeconds,
  })
  if (error) {
    if (error.message.includes('insufficient_units')) throw new InsufficientUnitsError()
    throw new Error(error.message)
  }
  const reservation = await getReservationById(data as string)
  if (!reservation) throw new Error('Reservation not found after creation')
  return reservation
}

export async function getReservationById(id: string): Promise<UnitReservation | null> {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('unit_reservations')
    .select('*')
    .eq('id', id)
    .single()
  if (error || !data) return null
  return data as UnitReservation
}

export async function updateReservationStatus(
  id: string,
  status: UnitReservation['status'],
): Promise<void> {
  const supabase = await createAdminClient()
  const { error } = await supabase
    .from('unit_reservations')
    .update({ status })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

// Units currently held against a property (active TTL holds + consumed holds
// backing pending cash transactions)
export async function getHeldUnits(propertyId: string): Promise<number> {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('unit_reservations')
    .select('units, status, expiresAt')
    .eq('propertyId', propertyId)
    .in('status', ['active', 'consumed'])
  if (error) throw new Error(error.message)
  const now = Date.now()
  return (data ?? []).reduce((sum, r) => {
    // Active holds past their expiry don't count (lazy expiry — swept on next reserve)
    if (r.status === 'active' && new Date(r.expiresAt).getTime() < now) return sum
    return sum + r.units
  }, 0)
}
