'use server'

import { requireAuth, requireKyc } from '@/lib/auth'
import { paymentGateway } from '@/lib/payments/razorpay'
import { calcOrderTotal, toPaise } from '@/lib/payments/fees'
import { createTransaction } from '@/lib/db/transactions'
import { getPropertyById } from '@/lib/db/properties'
import { revalidatePath } from 'next/cache'

export async function createOrderAction(propertyId: string, units: number) {
  const user = await requireKyc()

  const property = await getPropertyById(propertyId)
  if (!property) return { error: 'Property not found' }
  if (property.status !== 'Open') return { error: 'Property is not accepting investments' }

  const availableUnits = property.totalUnits - property.subscribedUnits
  if (units > availableUnits) return { error: `Only ${availableUnits} units available` }
  if (units < property.minInvestmentUnits) {
    return { error: `Minimum investment is ${property.minInvestmentUnits} units` }
  }

  const { subtotal, fee, total } = calcOrderTotal(units, property.unitPrice)

  const order = await paymentGateway.createOrder({
    amount: toPaise(total),
    currency: 'INR',
    receipt: `${user.id}-${propertyId}-${Date.now()}`,
    notes: {
      investorId: user.id,
      propertyId,
      units: String(units),
      platformFee: String(fee),
    },
  })

  return { success: true, order, breakdown: { subtotal, fee, total } }
}

export async function requestResaleAction(propertyId: string, units: number, askPrice: number) {
  const user = await requireAuth()
  const property = await getPropertyById(propertyId)
  if (!property) return { error: 'Property not found' }

  const gross = units * askPrice
  const { calcExitFee } = await import('@/lib/payments/fees')
  const fee = calcExitFee(gross)

  await createTransaction({
    id: `TXN-${Date.now()}`,
    investorId: user.id,
    propertyId,
    type: 'Resale',
    units,
    gross,
    fee,
    net: gross - fee,
    status: 'Initiated',
    razorpayId: null,
    date: new Date().toISOString().slice(0, 10),
    notes: 'Resale request',
  })

  revalidatePath('/transactions')
  return { success: true }
}
