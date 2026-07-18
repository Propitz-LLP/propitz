'use server'

import { requireAdmin } from '@/lib/auth'
import { updateTransactionStatus, getTransactionByIdAdmin } from '@/lib/db/transactions'
import { allocateUnits } from '@/lib/db/ownerships'
import { reserveUnits, getPropertyByIdAdmin } from '@/lib/db/properties'
import { getInvestorByIdAdmin } from '@/lib/db/investors'
import { updateReservationStatus } from '@/lib/db/reservations'
import { generateAndStoreCertificate } from '@/lib/storage/certificates'
import { sendTransactionConfirmed, sendTransactionRejected } from '@/lib/notifications/email'
import { paymentGateway } from '@/lib/payments/razorpay'
import { toPaise } from '@/lib/payments/fees'
import { revalidatePath } from 'next/cache'

// Offline payments (cash/bank transfer) have no webhook — an admin confirms
// receipt manually, moving the transaction into the approval queue.
export async function recordPaymentReceivedAction(transactionId: string) {
  const admin = await requireAdmin()

  const txn = await getTransactionByIdAdmin(transactionId)
  if (!txn || txn.status !== 'Initiated') return { error: 'Transaction not found or not awaiting payment' }
  if (txn.paymentMethod === 'razorpay') {
    return { error: 'Online payments are confirmed automatically via the gateway' }
  }

  await updateTransactionStatus(transactionId, 'Payment Confirmed', admin.email)
  await updateTransactionStatus(transactionId, 'Admin Pending', admin.email)

  revalidatePath('/admin/transactions')
  revalidatePath('/transactions')
  return { success: true }
}

export async function approveTransactionAction(transactionId: string) {
  const admin = await requireAdmin()

  const txn = await getTransactionByIdAdmin(transactionId)
  if (!txn || txn.status !== 'Admin Pending') return { error: 'Transaction not found or not pending' }

  const [property, investor] = await Promise.all([
    txn.propertyId ? getPropertyByIdAdmin(txn.propertyId) : null,
    getInvestorByIdAdmin(txn.investorId),
  ])
  if (!property || !investor) return { error: 'Property or investor not found' }
  if (!txn.units) return { error: 'Invalid unit count' }

  // 1. Update transaction status
  await updateTransactionStatus(transactionId, 'Completed', admin.email)

  // 2. Allocate units to investor
  const ownership = await allocateUnits(investor.id, property.id, txn.units, property.unitPrice)

  // 3. Decrement available units on property
  await reserveUnits(property.id, txn.units)

  // 4. The hold is now absorbed into subscribedUnits — release it so the
  //    units aren't double-counted against availability
  if (txn.reservationId) await updateReservationStatus(txn.reservationId, 'released')

  // 5. Generate ownership certificate
  await generateAndStoreCertificate(investor, property, ownership)

  // 6. Notify investor
  await sendTransactionConfirmed(investor.email, investor.name, property.name, txn.units, txn.gross)

  revalidatePath('/admin/transactions')
  revalidatePath('/transactions')
  return { success: true }
}

export async function rejectTransactionAction(transactionId: string, reason: string) {
  const admin = await requireAdmin()

  const txn = await getTransactionByIdAdmin(transactionId)
  if (!txn || (txn.status !== 'Admin Pending' && txn.status !== 'Initiated')) {
    return { error: 'Transaction not found or not pending' }
  }

  const [property, investor] = await Promise.all([
    txn.propertyId ? getPropertyByIdAdmin(txn.propertyId) : null,
    getInvestorByIdAdmin(txn.investorId),
  ])

  await updateTransactionStatus(transactionId, 'Rejected', admin.email)

  // Return the held units to the pool
  if (txn.reservationId) await updateReservationStatus(txn.reservationId, 'released')

  // Refund via gateway for online payments only
  if (txn.razorpayId) {
    await paymentGateway.initiateRefund(txn.razorpayId, toPaise(txn.gross))
  }

  if (investor && property) {
    await sendTransactionRejected(investor.email, investor.name, property.name, reason)
  }

  revalidatePath('/admin/transactions')
  return { success: true }
}
