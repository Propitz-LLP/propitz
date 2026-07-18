export type DocumentType =
  | 'Ownership Certificate'
  | 'Portfolio Statement'
  | 'Investment Agreement'
  | 'Tax Slip'
  | 'Platform Terms'
  | 'Due Diligence Report'
  | 'Title Report'
  | 'Brochure'

export interface InvestorDocument {
  id: string
  // null for property-level documents (due diligence, title report, brochure)
  investorId: string | null
  propertyId: string | null
  type: DocumentType
  label: string
  storagePath: string
  signedUrl?: string
  issuedAt: string
  version: number
}
