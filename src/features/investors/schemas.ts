import { z } from 'zod'

// Admin adds an investor with minimal details; KYC + bank details come later.
// Phone must be an Indian mobile: +91 country code followed by 10 digits.
// Spaces and hyphens are tolerated on input and stripped before storage.
export const investorSchema = z.object({
  name: z.string().min(1, 'Required'),
  email: z.string().email('Enter a valid email'),
  phone: z
    .string()
    .min(1, 'Required')
    .transform(v => v.replace(/[\s-]/g, ''))
    .refine(v => /^\+91\d{10}$/.test(v), 'Enter a valid mobile number: +91 followed by 10 digits'),
})

export type InvestorInput = z.infer<typeof investorSchema>

export const allocationSchema = z.object({
  investorId: z.string().uuid('Select an investor'),
  units: z.coerce.number().int().positive('Enter the number of units'),
})

export type AllocationInput = z.infer<typeof allocationSchema>
