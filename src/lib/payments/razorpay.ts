// Payment gateway abstraction — only this file knows about Razorpay.
// To add Cashfree or any other gateway: implement PaymentGateway and switch getPaymentGateway().

import { config } from '@/lib/config'
import crypto from 'crypto'

export interface CreateOrderParams {
  amount: number        // in paise (INR × 100)
  currency: string      // 'INR'
  receipt: string       // transaction reference
  notes?: Record<string, string>
}

export interface OrderResult {
  orderId: string
  amount: number
  currency: string
}

export interface PaymentGateway {
  createOrder(params: CreateOrderParams): Promise<OrderResult>
  verifyWebhookSignature(rawBody: string, signature: string): boolean
  initiateRefund(paymentId: string, amount: number): Promise<string>
}

// ── Razorpay implementation ──────────────────────────────────

class RazorpayGateway implements PaymentGateway {
  private getRazorpay() {
    const Razorpay = require('razorpay')
    return new Razorpay({
      key_id: config.razorpay.keyId,
      key_secret: config.razorpay.keySecret,
    })
  }

  async createOrder(params: CreateOrderParams): Promise<OrderResult> {
    const rp = this.getRazorpay()
    const order = await rp.orders.create({
      amount: params.amount,
      currency: params.currency,
      receipt: params.receipt,
      notes: params.notes,
    })
    return { orderId: order.id, amount: order.amount, currency: order.currency }
  }

  verifyWebhookSignature(rawBody: string, signature: string): boolean {
    const expected = crypto
      .createHmac('sha256', config.razorpay.webhookSecret)
      .update(rawBody)
      .digest('hex')
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
  }

  async initiateRefund(paymentId: string, amount: number): Promise<string> {
    const rp = this.getRazorpay()
    const refund = await rp.payments.refund(paymentId, { amount })
    return refund.id
  }
}

function getPaymentGateway(): PaymentGateway {
  return new RazorpayGateway()
}

export const paymentGateway = getPaymentGateway()
