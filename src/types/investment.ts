export interface Ownership {
  id: string
  investorId: string
  propertyId: string
  units: number
  acquiredPrice: number
  acquiredDate: string
}

export interface PortfolioHolding {
  ownership: Ownership
  propertyName: string
  propertySlug: string
  currentUnitPrice: number
  currentValue: number
  acquiredValue: number
  unrealisedPnl: number
  unrealisedPnlPct: number
}

export interface Portfolio {
  holdings: PortfolioHolding[]
  totalValue: number
  totalInvested: number
  unrealisedPnl: number
  unrealisedPnlPct: number
  distributionsYtd: number
}
