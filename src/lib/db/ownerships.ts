import { createClient, createAdminClient } from '@/lib/supabase/server'
import type { Ownership, Portfolio, PortfolioHolding } from '@/types'
import { getPropertyById } from './properties'
import { getTransactions } from './transactions'

export async function getOwnershipsByInvestor(investorId: string): Promise<Ownership[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('ownerships')
    .select('*')
    .eq('investorId', investorId)
  if (error) throw new Error(error.message)
  return (data ?? []) as Ownership[]
}

export async function getOwnershipsByProperty(propertyId: string): Promise<Ownership[]> {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('ownerships')
    .select('*')
    .eq('propertyId', propertyId)
  if (error) throw new Error(error.message)
  return (data ?? []) as Ownership[]
}

// Ownership row joined with the holder's display fields, for the admin
// property view (who owns how many units).
export interface OwnershipWithInvestor extends Ownership {
  investors?: { name: string; email: string; initials: string } | null
}

export async function getOwnershipsWithInvestorByProperty(propertyId: string): Promise<OwnershipWithInvestor[]> {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('ownerships')
    .select('*, investors(name, email, initials)')
    .eq('propertyId', propertyId)
    .order('units', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as OwnershipWithInvestor[]
}

export async function allocateUnits(
  investorId: string,
  propertyId: string,
  units: number,
  acquiredPrice: number,
): Promise<Ownership> {
  const supabase = await createAdminClient()

  // Upsert — if investor already owns units in this property, add to existing
  const { data: existing } = await supabase
    .from('ownerships')
    .select('*')
    .eq('investorId', investorId)
    .eq('propertyId', propertyId)
    .single()

  if (existing) {
    const { data, error } = await supabase
      .from('ownerships')
      .update({ units: existing.units + units })
      .eq('id', existing.id)
      .select()
      .single()
    if (error) throw new Error(error.message)
    return data as Ownership
  }

  const { data, error } = await supabase
    .from('ownerships')
    .insert({
      investorId,
      propertyId,
      units,
      acquiredPrice,
      acquiredDate: new Date().toISOString().slice(0, 10),
    })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as Ownership
}

// Remove an investor's holding in a property and return the freed units to the
// pool (decrement subscribedUnits). Returns the number of units released, or 0
// if there was no such ownership.
export async function removeOwnership(investorId: string, propertyId: string): Promise<number> {
  const supabase = await createAdminClient()

  const { data: existing } = await supabase
    .from('ownerships')
    .select('id, units')
    .eq('investorId', investorId)
    .eq('propertyId', propertyId)
    .single()
  if (!existing) return 0

  const { error: delError } = await supabase.from('ownerships').delete().eq('id', existing.id)
  if (delError) throw new Error(delError.message)

  const { data: property } = await supabase
    .from('properties')
    .select('subscribedUnits')
    .eq('id', propertyId)
    .single()
  if (property) {
    await supabase
      .from('properties')
      .update({
        subscribedUnits: Math.max(0, (property.subscribedUnits ?? 0) - existing.units),
        updatedAt: new Date().toISOString(),
      })
      .eq('id', propertyId)
  }

  return existing.units
}

export async function getOwnershipById(id: string): Promise<Ownership | null> {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('ownerships')
    .select('*')
    .eq('id', id)
    .single()
  if (error || !data) return null
  return data as Ownership
}

// Builds the full Portfolio aggregate for an investor
export async function getPortfolio(investorId: string): Promise<Portfolio> {
  const ownerships = await getOwnershipsByInvestor(investorId)

  const holdings: PortfolioHolding[] = await Promise.all(
    ownerships.map(async (o) => {
      const property = await getPropertyById(o.propertyId)
      const currentUnitPrice = property?.unitPrice ?? o.acquiredPrice
      const currentValue = o.units * currentUnitPrice
      const acquiredValue = o.units * o.acquiredPrice
      const unrealisedPnl = currentValue - acquiredValue
      return {
        ownership: o,
        propertyName: property?.name ?? 'Unknown',
        propertySlug: property?.slug ?? '',
        currentUnitPrice,
        currentValue,
        acquiredValue,
        unrealisedPnl,
        unrealisedPnlPct: acquiredValue > 0 ? (unrealisedPnl / acquiredValue) * 100 : 0,
      }
    })
  )

  const totalValue = holdings.reduce((s, h) => s + h.currentValue, 0)
  const totalInvested = holdings.reduce((s, h) => s + h.acquiredValue, 0)
  const unrealisedPnl = totalValue - totalInvested

  // Sum completed distributions YTD for this investor
  const currentYear = new Date().getFullYear().toString()
  const distTxns = await getTransactions({ investorId, type: 'Distribution', status: 'Completed' })
  const distributionsYtd = distTxns
    .filter(t => t.date.startsWith(currentYear))
    .reduce((s, t) => s + t.net, 0)

  return {
    holdings,
    totalValue,
    totalInvested,
    unrealisedPnl,
    unrealisedPnlPct: totalInvested > 0 ? (unrealisedPnl / totalInvested) * 100 : 0,
    distributionsYtd,
  }
}
