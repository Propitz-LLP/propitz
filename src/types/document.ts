export type DocumentType =
  | 'Ownership Certificate'
  | 'Portfolio Statement'
  | 'Investment Agreement'
  | 'Tax Slip'
  | 'Platform Terms'

export interface InvestorDocument {
  id: string
  investorId: string
  propertyId: string | null
  type: DocumentType
  label: string
  storagePath: string
  signedUrl?: string
  issuedAt: string
  version: number
}
