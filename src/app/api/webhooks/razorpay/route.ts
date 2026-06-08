// Raw body is needed for HMAC verification — this must be an API route, not a server action
import { NextRequest, NextResponse } from 'next/server'
import { paymentGateway } from '@/lib/payments/razorpay'
import { createTransaction } from '@/lib/db/transactions'

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const signature = request.headers.get('x-razorpay-signature') ?? ''

  if (!paymentGateway.verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const event = JSON.parse(rawBody)

  if (event.event === 'payment.captured') {
    const payment = event.payload.payment.entity
    const notes = payment.notes ?? {}

    await createTransaction({
      id: `TXN-${Date.now()}`,
      investorId: notes.investorId,
      propertyId: notes.propertyId,
      type: 'Investment',
      units: parseInt(notes.units ?? '0'),
      gross: payment.amount / 100,          // paise → rupees
      fee: parseInt(notes.platformFee ?? '0'),
      net: payment.amount / 100 - parseInt(notes.platformFee ?? '0'),
      status: 'Admin Pending',
      razorpayId: payment.id,
      date: new Date().toISOString().slice(0, 10),
      notes: `Razorpay payment captured`,
    })
  }

  return NextResponse.json({ received: true })
}
