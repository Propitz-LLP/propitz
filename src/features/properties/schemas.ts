import { z } from 'zod'

export const AREA_UNITS = ['sqft', 'sqm', 'sqyd', 'acres', 'cents', 'grounds', 'guntha'] as const
export type AreaUnit = typeof AREA_UNITS[number]

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
  totalArea: z.coerce.number().positive().optional(),
  areaUnit: z.enum(AREA_UNITS).optional(),
  imageUrl: z.string().url().optional(),
  coverEmoji: z.string().default('🏢'),
  coverGradient: z.string().default('linear-gradient(135deg,#1B3057,#2A4A7A)'),
  status: z.enum(['Draft', 'Open', 'Fully Subscribed', 'Closed']).default('Draft'),
})

export type PropertyInput = z.infer<typeof propertySchema>

export const valuationSchema = z.object({
  unitPrice: z.coerce.number().positive('Enter a price above zero'),
  quarter: z.string().min(1, 'Required'), // e.g. "Q2 FY26"
})

export type ValuationInput = z.infer<typeof valuationSchema>

export const propertyDocumentSchema = z.object({
  label: z.string().min(1, 'Required'),
})

export type PropertyDocumentInput = z.infer<typeof propertyDocumentSchema>

// ── Draft / completeness ──────────────────────────────────────────────
// A new listing can be parked as a Draft with only its identity filled in
// (name + slug). Everything else is completed section-by-section later. The
// `properties` table has no positive/NOT-NULL-without-default traps beyond
// these two once the action supplies zero/empty fallbacks, so this is all the
// gate a draft needs.
export const draftPropertySchema = z.object({
  name: z.string().min(1, 'Required'),
  slug: z.string().min(1, 'Required').regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers and hyphens only'),
})

export type DraftPropertyInput = z.infer<typeof draftPropertySchema>

// The accordion groups fields into sections; publishing (status → Open) is
// blocked until every mandatory section is Complete. This is the single source
// of truth for "what makes a section done", shared by the client (chips +
// publish gate) and the server (publish guard).
export type PropertySectionKey = 'basics' | 'financials' | 'returns' | 'description'
export type SectionStatus = 'complete' | 'partial' | 'empty'

export const PROPERTY_SECTION_ORDER: PropertySectionKey[] = ['basics', 'financials', 'returns', 'description']

export interface PropertyCompletenessValues {
  name?: string | null
  slug?: string | null
  city?: string | null
  district?: string | null
  state?: string | null
  assetType?: string | null
  description?: string | null
  totalValuation?: number | null
  totalUnits?: number | null
  unitPrice?: number | null
  minInvestmentUnits?: number | null
  holdingPeriod?: string | null
  lockInPeriod?: string | null
}

export const SECTION_REQUIRED: Record<PropertySectionKey, (keyof PropertyCompletenessValues)[]> = {
  basics: ['name', 'slug', 'city', 'district', 'state', 'assetType'],
  financials: ['totalValuation', 'totalUnits', 'unitPrice', 'minInvestmentUnits'],
  returns: ['holdingPeriod', 'lockInPeriod'],
  description: ['description'],
}

// A field counts as filled when a string is non-blank or a number is > 0
// (zero valuation/units is the empty state for our numeric fields).
function isFilled(v: unknown): boolean {
  if (typeof v === 'number') return Number.isFinite(v) && v > 0
  if (typeof v === 'string') return v.trim().length > 0
  return v != null
}

export function sectionStatus(key: PropertySectionKey, values: PropertyCompletenessValues): SectionStatus {
  const fields = SECTION_REQUIRED[key]
  const done = fields.filter(f => isFilled(values[f])).length
  if (done === fields.length) return 'complete'
  if (done === 0) return 'empty'
  return 'partial'
}

export function isPropertyComplete(values: PropertyCompletenessValues): boolean {
  return PROPERTY_SECTION_ORDER.every(k => sectionStatus(k, values) === 'complete')
}
