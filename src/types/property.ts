export type PropertyStatus = 'Draft' | 'Open' | 'Fully Subscribed' | 'Closed'
export type AssetType = 'Commercial' | 'Residential' | 'Land'

export interface Property {
  id: string
  name: string
  slug: string
  city: string
  district: string
  state: string
  pinCode?: string
  assetType: AssetType
  description: string
  totalValuation: number
  totalUnits: number
  subscribedUnits: number
  unitPrice: number
  rentalYieldPct: number
  capitalGrowthPct: number
  holdingPeriod: string
  lockInPeriod: string
  minInvestmentUnits: number
  status: PropertyStatus
  coverEmoji: string
  coverGradient: string
  createdAt: string
  updatedAt: string
}

export interface ValuationHistory {
  id: string
  propertyId: string
  unitPrice: number
  quarter: string
  recordedAt: string
}
