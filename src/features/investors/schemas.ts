import { z } from 'zod'

// Admin adds an investor with minimal details; KYC + bank details come later.
// Phone is an international (E.164) number: a leading "+" country code and
// 8–15 digits total. Spaces, hyphens, dots and brackets are tolerated on input
// and stripped before storage.
export const investorSchema = z.object({
  name: z.string().min(1, 'Required'),
  email: z.string().email('Enter a valid email'),
  phone: z
    .string()
    .min(1, 'Required')
    .transform(v => v.replace(/[\s\-().]/g, ''))
    .refine(v => /^\+[1-9]\d{7,14}$/.test(v), 'Enter a valid mobile number with country code (e.g. +14155550123)'),
})

export type InvestorInput = z.infer<typeof investorSchema>

export const allocationSchema = z.object({
  investorId: z.string().uuid('Select an investor'),
  units: z.coerce.number().int().positive('Enter the number of units'),
})

export type AllocationInput = z.infer<typeof allocationSchema>
