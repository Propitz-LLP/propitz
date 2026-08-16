'use client'

import { createContext, useContext } from 'react'
import type { Property, InvestorDocument, Investor } from '@/types'
import type { AreaUnit } from '../../schemas'
import type { PendingDoc } from '../PendingDocuments'

export type SeqKey = 'basics' | 'financials' | 'returns' | 'description' | 'documents' | 'investors'

// The Save & continue chain. Documents is the finishing step; Investors is a
// separate edit-only management section with its own allocate action, so it is
// intentionally NOT part of this sequence.
export const SEQUENCE: SeqKey[] = ['basics', 'financials', 'returns', 'description', 'documents']

// Ownership row joined with the holder's display fields (mirrors the db shape,
// declared here so this client module doesn't import the server db layer).
export interface OwnershipRow {
  id: string
  investorId: string
  propertyId: string
  units: number
  acquiredPrice: number
  acquiredDate: string
  investors?: { name: string; email: string; initials: string } | null
}

export function nextOf(key: SeqKey): SeqKey | null {
  const i = SEQUENCE.indexOf(key)
  return i >= 0 && i < SEQUENCE.length - 1 ? SEQUENCE[i + 1] : null
}

// Shared state + behaviour for the property form. Held by PropertyForm and read
// by each section component so the sections stay self-contained while the parent
// remains the single owner of form state (needed for the preview, completeness
// meter, and save/publish).
export interface PropertyFormApi {
  isEdit: boolean
  property?: Property
  documents?: InvestorDocument[]

  // ── investors (allocation) ──
  // All investors — the dropdown shows everyone; only KYC-approved are selectable.
  investors: Investor[]
  ownerships: OwnershipRow[]
  feeRatePct: number
  gstRatePct: number

  // ── field state ──
  name: string
  slug: string
  city: string
  district: string
  state: string
  pinCode: string
  assetType: string
  description: string
  totalVal: string
  totalUnits: string
  unitPrice: string
  minUnits: string
  yieldPct: string
  growthPct: string
  holdingPeriod: string
  lockInPeriod: string
  emoji: string
  totalArea: string
  areaUnit: AreaUnit
  imageFile: File | null
  imagePreview: string | null
  pendingDocs: PendingDoc[]

  // ── setters ──
  setSlug: (v: string) => void
  setSlugEdited: (v: boolean) => void
  setCity: (v: string) => void
  setDistrict: (v: string) => void
  setState: (v: string) => void
  setPinCode: (v: string) => void
  setAssetType: (v: string) => void
  setDescription: (v: string) => void
  setUnitPrice: (v: string) => void
  setMinUnits: (v: string) => void
  setYieldPct: (v: string) => void
  setGrowthPct: (v: string) => void
  setHoldingPeriod: (v: string) => void
  setLockInPeriod: (v: string) => void
  setEmoji: (v: string) => void
  setTotalArea: (v: string) => void
  setAreaUnit: (v: AreaUnit) => void
  setPendingDocs: (docs: PendingDoc[]) => void

  // ── cross-field handlers ──
  handleNameChange: (v: string) => void
  handleValuationChange: (v: string) => void
  handleTotalUnitsChange: (v: string) => void
  handleImageChange: (f: File | null) => void

  // ── computed helpers ──
  areaWords: string | null
  valuationWords: string | null
  unitPriceWords: string | null
  previewUnitPrice: number
  previewMinUnits: number

  // ── shared behaviour ──
  err: (field: string) => string | undefined
  saving: boolean
  persist: (advanceTo: SeqKey | null, finish?: boolean) => void
}

const Ctx = createContext<PropertyFormApi | null>(null)

export const PropertyFormProvider = Ctx.Provider

export function usePropertyForm(): PropertyFormApi {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('usePropertyForm must be used within a PropertyForm')
  return ctx
}
