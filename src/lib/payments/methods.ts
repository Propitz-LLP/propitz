// Payment-method layer — sits ABOVE the gateway abstraction (razorpay.ts).
// A "method" is what the investor chooses (cash, razorpay, bank transfer);
// a "gateway" is infrastructure a method may use. To add a method: implement
// PaymentMethodProvider, register it in PROVIDERS, and enable it via the
// PAYMENT_METHODS env var. The UI renders whatever listEnabledMethods returns.

import { config } from '@/lib/config'
import type { PaymentMethod } from '@/types'

export interface PaymentContext {
  transactionId: string
  investorId: string
  propertyId: string
  propertyName: string
  units: number
  totalRupees: number
}

export type PaymentInitiation =
  | { kind: 'offline_instructions'; reference: string; instructions: string }
  | { kind: 'client_checkout'; orderId: string; keyId: string } // Razorpay — Sprint 5

export interface PaymentMethodProvider {
  method: PaymentMethod
  label: string
  description: string
  initiate(ctx: PaymentContext): Promise<PaymentInitiation>
}

// ── Cash (offline) ───────────────────────────────────────────

class CashProvider implements PaymentMethodProvider {
  method = 'cash' as const
  label = 'Cash / Offline Payment'
  description = 'Pay at the Propitz office or via bank deposit, quoting your reference number'

  async initiate(ctx: PaymentContext): Promise<PaymentInitiation> {
    const reference = `CASH-${ctx.transactionId}`
    return {
      kind: 'offline_instructions',
      reference,
      instructions:
        `Pay ₹${ctx.totalRupees.toLocaleString('en-IN')} at the Propitz office or by bank deposit, ` +
        `quoting reference ${reference}. Your ${ctx.units} units in ${ctx.propertyName} are held ` +
        `until our team confirms receipt of payment. You will be notified by email once confirmed.`,
    }
  }
}

// ── Razorpay (Sprint 5) ──────────────────────────────────────
// class RazorpayProvider implements PaymentMethodProvider {
//   method = 'razorpay' as const
//   label = 'Pay Online (UPI / Card / Netbanking)'
//   async initiate(ctx) {
//     const order = await paymentGateway.createOrder({ amount: toPaise(ctx.totalRupees), ... })
//     return { kind: 'client_checkout', orderId: order.orderId, keyId: config.razorpay.keyId }
//   }
// }

const PROVIDERS: Partial<Record<PaymentMethod, PaymentMethodProvider>> = {
  cash: new CashProvider(),
}

export function getPaymentProvider(method: PaymentMethod): PaymentMethodProvider | null {
  if (!config.payments.enabledMethods.includes(method)) return null
  return PROVIDERS[method] ?? null
}

export function listEnabledMethods(): { method: PaymentMethod; label: string; description: string }[] {
  return config.payments.enabledMethods
    .map(m => PROVIDERS[m as PaymentMethod])
    .filter((p): p is PaymentMethodProvider => !!p)
    .map(({ method, label, description }) => ({ method, label, description }))
}
