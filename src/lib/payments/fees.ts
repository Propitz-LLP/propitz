import { config } from '@/lib/config'

// All fee calculations in one place — change rates in config, not scattered across features

export function calcPlatformFee(subtotal: number): number {
  return Math.round(subtotal * config.platform.feeRatePct / 100)
}

export function calcOrderTotal(units: number, unitPrice: number): {
  subtotal: number
  fee: number
  gst: number
  total: number
} {
  const subtotal = units * unitPrice
  const fee = calcPlatformFee(subtotal)
  // GST is charged on the platform fee, not the investment amount
  const gst = Math.round(fee * config.platform.gstOnFeeRatePct / 100)
  return { subtotal, fee, gst, total: subtotal + fee + gst }
}

export function calcExitFee(grossAmount: number): number {
  return Math.round(grossAmount * config.platform.exitFeeRatePct / 100)
}

export function calcManagementFee(portfolioValue: number): number {
  return Math.round(portfolioValue * config.platform.managementFeeRatePct / 100)
}

export function calcDistributionFee(grossAmount: number, feePct: number): number {
  return Math.round(grossAmount * feePct / 100)
}

// Convert rupees to paise for Razorpay
export function toPaise(rupees: number): number {
  return Math.round(rupees * 100)
}

export function formatInr(amount: number): string {
  return '₹' + amount.toLocaleString('en-IN')
}
