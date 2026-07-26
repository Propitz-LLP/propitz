'use server'

import { requireAdmin } from '@/lib/auth'
import { updateTransactionStatus, getTransactionByIdAdmin, approveTransactionAtomic } from '@/lib/db/transactions'
import { getOwnershipById } from '@/lib/db/ownerships'
import { getPropertyByIdAdmin } from '@/lib/db/properties'
import { getInvestorByIdAdmin } from '@/lib/db/investors'
import { updateReservationStatus } from '@/lib/db/reservations'
import { recordAudit } from '@/lib/audit'
import { recordNotification } from '@/lib/notifications/inapp'
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

  await recordAudit({
    actor: admin,
    action: 'transaction.payment_received',
    entityType: 'transaction',
    entityId: transactionId,
    before: { status: txn.status },
    after: { status: 'Admin Pending', paymentMethod: txn.paymentMethod },
  })

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

  // Status, ownership ledger, property counter, reservation release, AND the
  // audit entry all happen atomically in one DB transaction
  // (approve_transaction_atomic RPC) — either every write lands or none does.
  // No recordAudit call here: the audit row is written inside the RPC (S6-07).
  let ownershipId: string
  try {
    ({ ownershipId } = await approveTransactionAtomic(transactionId, admin.email))
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    if (message.includes('insufficient_units')) return { error: 'Not enough units remain available' }
    if (message.includes('invalid_status')) return { error: 'Transaction is no longer pending' }
    throw e
  }
  const ownership = await getOwnershipById(ownershipId)
  if (!ownership) return { error: 'Approved, but ownership record could not be loaded' }

  // Certificate + email are best-effort follow-ups — a failure here must not
  // roll back the approval, which has already been committed.
  await generateAndStoreCertificate(investor, property, ownership).catch(() => {})
  await sendTransactionConfirmed(investor.email, investor.name, property.name, txn.units, txn.gross).catch(() => {})
  await recordNotification({
    investorId: txn.investorId,
    type: 'transaction.confirmed',
    title: 'Investment confirmed',
    body: `Your ${txn.units} unit${txn.units === 1 ? '' : 's'} in ${property.name} have been allocated. Your certificate is ready.`,
    link: '/documents',
  }).catch(() => {})

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

  await recordAudit({
    actor: admin,
    action: 'transaction.reject',
    entityType: 'transaction',
    entityId: transactionId,
    before: { status: txn.status },
    after: { status: 'Rejected', reason, refunded: Boolean(txn.razorpayId) },
  })

  // Return the held units to the pool
  if (txn.reservationId) await updateReservationStatus(txn.reservationId, 'released')

  // Refund via gateway for online payments only
  if (txn.razorpayId) {
    await paymentGateway.initiateRefund(txn.razorpayId, toPaise(txn.gross))
  }

  if (investor && property) {
    await sendTransactionRejected(investor.email, investor.name, property.name, reason)
  }
  await recordNotification({
    investorId: txn.investorId,
    type: 'transaction.rejected',
    title: 'Investment not approved',
    body: `Your investment${property ? ` in ${property.name}` : ''} was not approved: ${reason}${txn.razorpayId ? '. A refund has been initiated.' : '.'}`,
    link: '/transactions',
  }).catch(() => {})

  revalidatePath('/admin/transactions')
  return { success: true }
}
