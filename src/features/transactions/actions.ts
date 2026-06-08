'use server'

import { requireAdmin } from '@/lib/auth'
import { updateTransactionStatus, getTransactionById } from '@/lib/db/transactions'
import { allocateUnits } from '@/lib/db/ownerships'
import { reserveUnits, getPropertyById } from '@/lib/db/properties'
import { getInvestorById } from '@/lib/db/investors'
import { generateAndStoreCertificate } from '@/lib/storage/certificates'
import { sendTransactionConfirmed, sendTransactionRejected } from '@/lib/notifications/email'
import { paymentGateway } from '@/lib/payments/razorpay'
import { revalidatePath } from 'next/cache'

export async function approveTransactionAction(transactionId: string) {
  const admin = await requireAdmin()

  const txn = await getTransactionById(transactionId)
  if (!txn || txn.status !== 'Admin Pending') return { error: 'Transaction not found or not pending' }

  const [property, investor] = await Promise.all([
    txn.propertyId ? getPropertyById(txn.propertyId) : null,
    getInvestorById(txn.investorId),
  ])
  if (!property || !investor) return { error: 'Property or investor not found' }
  if (!txn.units) return { error: 'Invalid unit count' }

  // 1. Update transaction status
  await updateTransactionStatus(transactionId, 'Completed', admin.email)

  // 2. Allocate units to investor
  const ownership = await allocateUnits(investor.id, property.id, txn.units, property.unitPrice)

  // 3. Decrement available units on property
  await reserveUnits(property.id, txn.units)

  // 4. Generate ownership certificate
  await generateAndStoreCertificate(investor, property, ownership)

  // 5. Notify investor
  await sendTransactionConfirmed(investor.email, investor.name, property.name, txn.units, txn.gross)

  revalidatePath('/admin/transactions')
  revalidatePath('/transactions')
  return { success: true }
}

export async function rejectTransactionAction(transactionId: string, reason: string) {
  const admin = await requireAdmin()

  const txn = await getTransactionById(transactionId)
  if (!txn || txn.status !== 'Admin Pending') return { error: 'Transaction not found or not pending' }

  const [property, investor] = await Promise.all([
    txn.propertyId ? getPropertyById(txn.propertyId) : null,
    getInvestorById(txn.investorId),
  ])

  await updateTransactionStatus(transactionId, 'Rejected', admin.email)

  // Initiate refund via payment gateway
  if (txn.razorpayId) {
    await paymentGateway.initiateRefund(txn.razorpayId, toPaise(txn.gross))
  }

  if (investor && property) {
    await sendTransactionRejected(investor.email, investor.name, property.name, reason)
  }

  revalidatePath('/admin/transactions')
  return { success: true }
}

function toPaise(rupees: number): number {
  return Math.round(rupees * 100)
}
