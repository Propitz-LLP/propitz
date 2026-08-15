import { z } from 'zod'

// Investors self-register (email + password → email confirmation → KYC). The
// admin's "Add Investor" only invites them, so all it needs is an email.
export const inviteSchema = z.object({
  email: z.string().email('Enter a valid email'),
})

export type InviteInput = z.infer<typeof inviteSchema>

export const allocationSchema = z.object({
  investorId: z.string().uuid('Select an investor'),
  units: z.coerce.number().int().positive('Enter the number of units'),
})

export type AllocationInput = z.infer<typeof allocationSchema>
