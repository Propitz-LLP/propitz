import { z } from 'zod'

export const personalDetailsSchema = z.object({
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().min(1, 'Required'),
  dateOfBirth: z.string().min(1, 'Required'),
  phone: z.string().regex(/^\+91\s?\d{10}$/, 'Enter valid Indian mobile number'),
  addressLine1: z.string().min(1, 'Required'),
  addressLine2: z.string().optional(),
  investorType: z.enum(['Individual - Resident Indian', 'Individual - NRI', 'HUF', 'Corporate Entity']),
})

export const identitySchema = z.object({
  pan: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Enter valid PAN (e.g. ABCDE1234F)'),
  aadhaar: z.string().regex(/^\d{12}$/, 'Enter 12-digit Aadhaar number'),
})

export const bankSchema = z.object({
  accountNumber: z.string().min(9, 'Enter valid account number'),
  ifscCode: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Enter valid IFSC code'),
  bankName: z.string().min(1, 'Required'),
  accountHolderName: z.string().min(1, 'Required'),
})

export type PersonalDetailsInput = z.infer<typeof personalDetailsSchema>
export type IdentityInput = z.infer<typeof identitySchema>
export type BankInput = z.infer<typeof bankSchema>
