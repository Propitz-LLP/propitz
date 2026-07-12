import { z } from 'zod'

// Step 1 — account confirmation (phone + investor type are editable)
export const step1AccountSchema = z.object({
  phone: z.string().regex(/^(\+91\s?)?\d{10}$/, 'Enter a valid Indian mobile number'),
  investorType: z.enum(['Individual - Resident Indian', 'Individual - NRI', 'HUF', 'Corporate Entity']),
})

// Step 2 — identity
export const step2IdentitySchema = z.object({
  fullLegalName: z.string().min(3, 'Enter your full legal name as on PAN'),
  pan: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, 'Enter a valid PAN (e.g. ABCDE1234F)'),
  dob: z.string().refine(v => {
    const d = new Date(v)
    if (isNaN(d.getTime())) return false
    const age = (Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000)
    return age >= 18 && age <= 100
  }, 'You must be at least 18 years old'),
  aadhaar: z.string().regex(/^\d{12}$/, 'Enter your 12-digit Aadhaar number'),
  gender: z.enum(['Male', 'Female', 'Other']),
  address: z.string().min(10, 'Enter your full residential address'),
})

// Step 3 — bank details
export const step3BankSchema = z.object({
  accountHolderName: z.string().min(3, 'Required'),
  accountNumber: z.string().regex(/^\d{9,18}$/, 'Enter a valid account number (9–18 digits)'),
  accountNumberConfirm: z.string(),
  ifsc: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Enter a valid 11-character IFSC code'),
  bankName: z.string().min(2, 'Required'),
  accountType: z.enum(['Savings', 'Current']),
}).refine(d => d.accountNumber === d.accountNumberConfirm, {
  message: 'Account numbers do not match',
  path: ['accountNumberConfirm'],
})

export const KYC_DOC_TYPES = ['pan_card', 'aadhaar', 'cancelled_cheque', 'selfie'] as const
export const KYC_DOC_LABELS: Record<(typeof KYC_DOC_TYPES)[number], string> = {
  pan_card: 'PAN Card',
  aadhaar: 'Aadhaar (masked copy)',
  cancelled_cheque: 'Cancelled Cheque',
  selfie: 'Selfie Photo',
}

export type Step1Input = z.infer<typeof step1AccountSchema>
export type Step2Input = z.infer<typeof step2IdentitySchema>
export type Step3Input = z.infer<typeof step3BankSchema>
