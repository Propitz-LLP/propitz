'use server'

import { requireAdmin } from '@/lib/auth'
import { getOwnershipsByProperty } from '@/lib/db/ownerships'
import { getPropertyById } from '@/lib/db/properties'
import { createTransaction, createDistribution } from '@/lib/db/transactions'
import { getInvestorById } from '@/lib/db/investors'
import { calcDistributionFee } from '@/lib/payments/fees'
import { sendDistributionCredited } from '@/lib/notifications/email'
import { revalidatePath } from 'next/cache'

export async function previewDistributionAction(
  propertyId: string,
  perUnit: number,
  feePct: number,
) {
  await requireAdmin()

  const [property, ownerships] = await Promise.all([
    getPropertyById(propertyId),
    getOwnershipsByProperty(propertyId),
  ])
  if (!property) return { error: 'Property not found' }

  const holders = await Promise.all(
    ownerships.map(async (o) => {
      const investor = await getInvestorById(o.investorId)
      const gross = o.units * perUnit
      const fee = calcDistributionFee(gross, feePct)
      return { investor, units: o.units, gross, fee, net: gross - fee }
    })
  )

  const totalUnits = ownerships.reduce((s, o) => s + o.units, 0)
  const grossTotal = totalUnits * perUnit
  const feeTotal = calcDistributionFee(grossTotal, feePct)

  return {
    success: true,
    preview: {
      propertyName: property.name,
      holders,
      totalUnits,
      grossTotal,
      feeTotal,
      netTotal: grossTotal - feeTotal,
    },
  }
}

export async function confirmDistributionAction(data: {
  propertyId: string
  perUnit: number
  feePct: number
  period: string
  date: string
  notes?: string
}) {
  const admin = await requireAdmin()

  const [property, ownerships] = await Promise.all([
    getPropertyById(data.propertyId),
    getOwnershipsByProperty(data.propertyId),
  ])
  if (!property) return { error: 'Property not found' }

  const totalUnits = ownerships.reduce((s, o) => s + o.units, 0)
  const grossTotal = totalUnits * data.perUnit
  const feeTotal = calcDistributionFee(grossTotal, data.feePct)

  // Create distribution record
  await createDistribution({
    propertyId: data.propertyId,
    period: data.period,
    perUnit: data.perUnit,
    feePct: data.feePct,
    grossTotal,
    feeTotal,
    netTotal: grossTotal - feeTotal,
    investorCount: ownerships.length,
    date: data.date,
    status: 'Completed',
  })

  // Create per-investor transactions and notify
  for (const o of ownerships) {
    const investor = await getInvestorById(o.investorId)
    const gross = o.units * data.perUnit
    const fee = calcDistributionFee(gross, data.feePct)
    const net = gross - fee

    await createTransaction({
      id: `TXN-${Date.now()}-${o.investorId}`,
      investorId: o.investorId,
      propertyId: data.propertyId,
      type: 'Distribution',
      units: null,
      gross,
      fee,
      net,
      status: 'Completed',
      razorpayId: null,
      date: data.date,
      period: data.period,
      notes: data.notes ?? `${data.period} rental distribution — ${property.name}`,
    })

    if (investor) {
      await sendDistributionCredited(investor.email, investor.name, property.name, net, data.period)
    }
  }

  revalidatePath('/admin/transactions')
  revalidatePath('/transactions')
  return { success: true }
}
