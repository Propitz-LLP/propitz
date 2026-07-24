import { z } from 'zod'

// A distribution period is a free-text label the admin enters, e.g.
// "Q2 FY25-26" or "Jul 2026". Kept as text to match the distributions.period /
// transactions.period columns and the (propertyId, period) idempotency guard.
export const distributionSchema = z.object({
  propertyId: z.string().uuid('Select a property'),
  perUnit: z.coerce.number().positive('Per-unit amount must be greater than 0'),
  feePct: z.coerce.number().min(0, 'Fee cannot be negative').max(20, 'Fee cannot exceed 20%'),
  period: z.string().min(1, 'Required').max(40, 'Too long'),
  date: z.string().min(1, 'Required'),
  notes: z.string().max(500, 'Too long').optional(),
})

export type DistributionInput = z.infer<typeof distributionSchema>
