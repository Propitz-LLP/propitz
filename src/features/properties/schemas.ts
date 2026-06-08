import { z } from 'zod'

export const propertySchema = z.object({
  name: z.string().min(1, 'Required'),
  slug: z.string().min(1, 'Required').regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers and hyphens only'),
  city: z.string().min(1, 'Required'),
  district: z.string().min(1, 'Required'),
  state: z.string().min(1, 'Required'),
  pinCode: z.string().optional(),
  assetType: z.enum(['Commercial', 'Residential', 'Land']),
  description: z.string().min(1, 'Required'),
  totalValuation: z.coerce.number().positive(),
  totalUnits: z.coerce.number().int().positive(),
  unitPrice: z.coerce.number().positive(),
  rentalYieldPct: z.coerce.number().min(0).max(100),
  capitalGrowthPct: z.coerce.number().min(0).max(100),
  holdingPeriod: z.string().min(1, 'Required'),
  lockInPeriod: z.string().min(1, 'Required'),
  minInvestmentUnits: z.coerce.number().int().positive(),
  coverEmoji: z.string().default('🏢'),
  coverGradient: z.string().default('linear-gradient(135deg,#1B3057,#2A4A7A)'),
  status: z.enum(['Draft', 'Open', 'Fully Subscribed', 'Closed']).default('Draft'),
})

export type PropertyInput = z.infer<typeof propertySchema>
