'use server'

import { requireAuth, requireKyc } from '@/lib/auth'
import { calcOrderTotal } from '@/lib/payments/fees'
import { getPaymentProvider } from '@/lib/payments/methods'
import { createTransaction } from '@/lib/db/transactions'
import { getPropertyById, getAvailableUnits } from '@/lib/db/properties'
import {
  createReservation,
  getReservationById,
  updateReservationStatus,
  InsufficientUnitsError,
} from '@/lib/db/reservations'
import { config } from '@/lib/config'
import { revalidatePath } from 'next/cache'
import type { PaymentMethod } from '@/types'

// Step 1 of investing: hold the units for 15 minutes while the investor
// chooses a payment method. Atomic — two investors can't hold the same units.
export async function reserveUnitsAction(propertyId: string, units: number) {
  const user = await requireKyc()

  const property = await getPropertyById(propertyId)
  if (!property) return { error: 'Property not found' }
  if (property.status !== 'Open') return { error: 'Property is not accepting investments' }
  if (units < property.minInvestmentUnits) {
    return { error: `Minimum investment is ${property.minInvestmentUnits} units` }
  }
  if (units > 50) return { error: 'Maximum 50 units per order' }

  try {
    const reservation = await createReservation(
      propertyId, user.id, units, config.payments.reservationTtlSeconds,
    )
    return { success: true, reservationId: reservation.id, expiresAt: reservation.expiresAt }
  } catch (e) {
    if (e instanceof InsufficientUnitsError) {
      const available = await getAvailableUnits(property)
      return { error: available > 0 ? `Only ${available} units available` : 'No units available' }
    }
    throw e
  }
}

// Step 2: investor picked a payment method. Persist the transaction and hand
// off to the method's provider; the reservation transfers to the transaction.
export async function initiatePaymentAction(reservationId: string, method: PaymentMethod) {
  const user = await requireKyc()

  const reservation = await getReservationById(reservationId)
  if (!reservation || reservation.investorId !== user.id) return { error: 'Reservation not found' }
  if (reservation.status !== 'active') return { error: 'Reservation is no longer active' }
  if (new Date(reservation.expiresAt).getTime() < Date.now()) {
    await updateReservationStatus(reservationId, 'expired')
    return { error: 'Your hold expired. Please try again.' }
  }

  const provider = getPaymentProvider(method)
  if (!provider) return { error: 'This payment method is not available' }

  const property = await getPropertyById(reservation.propertyId)
  if (!property) return { error: 'Property not found' }

  // Totals are always computed server-side — client values are display-only
  const { subtotal, fee, gst, total } = calcOrderTotal(reservation.units, property.unitPrice)

  const transactionId = `TXN-${Date.now()}`
  await createTransaction({
    id: transactionId,
    investorId: user.id,
    propertyId: property.id,
    type: 'Investment',
    units: reservation.units,
    gross: subtotal,
    fee: fee + gst,
    net: total,
    status: 'Initiated',
    paymentMethod: method,
    reservationId,
    razorpayId: null,
    date: new Date().toISOString().slice(0, 10),
    notes: `${provider.label} — awaiting payment`,
  })

  const initiation = await provider.initiate({
    transactionId,
    investorId: user.id,
    propertyId: property.id,
    propertyName: property.name,
    units: reservation.units,
    totalRupees: total,
  })

  // Record the provider's reference and consume the hold — units now stay
  // held by the pending transaction until admin confirms or rejects payment.
  if (initiation.kind === 'offline_instructions') {
    const { createAdminClient } = await import('@/lib/supabase/server')
    const supabase = await createAdminClient()
    await supabase.from('transactions').update({ paymentRef: initiation.reference }).eq('id', transactionId)
  }
  await updateReservationStatus(reservationId, 'consumed')

  revalidatePath('/transactions')
  return { success: true, transactionId, initiation, breakdown: { subtotal, fee, gst, total } }
}

// Investor backs out before choosing a method — return units to the pool.
export async function releaseReservationAction(reservationId: string) {
  const user = await requireAuth()
  const reservation = await getReservationById(reservationId)
  if (reservation && reservation.investorId === user.id && reservation.status === 'active') {
    await updateReservationStatus(reservationId, 'released')
  }
  return { success: true }
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
