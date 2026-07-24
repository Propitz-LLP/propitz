'use server'

import { requireAdmin } from '@/lib/auth'
import { getOwnershipsByProperty } from '@/lib/db/ownerships'
import { getPropertyByIdAdmin } from '@/lib/db/properties'
import { distributeAtomic } from '@/lib/db/transactions'
import { getInvestorByIdAdmin } from '@/lib/db/investors'
import { calcDistributionFee } from '@/lib/payments/fees'
import { config } from '@/lib/config'
import { sendDistributionCredited } from '@/lib/notifications/email'
import { distributionSchema } from './schemas'
import { revalidatePath } from 'next/cache'

// Default distribution fee rate — the form prefills this; the admin may override
// per run (validated 0–20% in distributionSchema).
export async function getDefaultDistributionFeePct(): Promise<number> {
  await requireAdmin()
  return config.platform.distributionFeeRatePct
}

export async function previewDistributionAction(
  propertyId: string,
  perUnit: number,
  feePct: number,
) {
  await requireAdmin()

  const [property, ownerships] = await Promise.all([
    getPropertyByIdAdmin(propertyId),
    getOwnershipsByProperty(propertyId),
  ])
  if (!property) return { error: 'Property not found' }

  // getInvestorByIdAdmin — admin flow reading *other* investors' rows, so it
  // must bypass RLS (the JWT-role policies never match this app's role model).
  const holders = await Promise.all(
    ownerships.map(async (o) => {
      const investor = await getInvestorByIdAdmin(o.investorId)
      const gross = o.units * perUnit
      const fee = calcDistributionFee(gross, feePct)
      return {
        investorId: o.investorId,
        investorName: investor?.name ?? 'Unknown investor',
        units: o.units,
        gross,
        fee,
        net: gross - fee,
      }
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

export async function confirmDistributionAction(raw: {
  propertyId: string
  perUnit: string | number
  feePct: string | number
  period: string
  date: string
  notes?: string
}) {
  const admin = await requireAdmin()

  const parsed = distributionSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }
  const data = parsed.data

  const property = await getPropertyByIdAdmin(data.propertyId)
  if (!property) return { error: 'Property not found' }

  // Summary row + one Distribution transaction per holder land atomically in
  // one DB transaction. The (propertyId, period) guard makes retries safe.
  let result: Awaited<ReturnType<typeof distributeAtomic>>
  try {
    result = await distributeAtomic(
      data.propertyId,
      data.period,
      data.perUnit,
      data.feePct,
      data.date,
      admin.email,
    )
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    if (message.includes('already_distributed')) {
      return { error: `A distribution for "${data.period}" already exists for this property` }
    }
    if (message.includes('property_not_open')) {
      return { error: 'Distributions can only run for Open or Fully Subscribed properties' }
    }
    if (message.includes('property_not_found')) return { error: 'Property not found' }
    throw e
  }

  // Notify each holder — best-effort follow-up, outside the committed payout.
  const ownerships = await getOwnershipsByProperty(data.propertyId)
  await Promise.all(
    ownerships.map(async (o) => {
      const investor = await getInvestorByIdAdmin(o.investorId)
      if (!investor) return
      const gross = o.units * data.perUnit
      const net = gross - calcDistributionFee(gross, data.feePct)
      await sendDistributionCredited(investor.email, investor.name, property.name, net, data.period).catch(() => {})
    })
  )

  revalidatePath('/admin/distributions')
  revalidatePath('/transactions')
  return { success: true, ...result }
}
