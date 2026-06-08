export type KycStatus = 'Not Started' | 'Submitted' | 'Under Review' | 'Approved' | 'Rejected'
export type InvestorType = 'Individual - Resident Indian' | 'Individual - NRI' | 'HUF' | 'Corporate Entity'

export interface Investor {
  id: string
  name: string
  email: string
  phone: string
  type: InvestorType
  kycStatus: KycStatus
  initials: string
  createdAt: string
}

export interface KycSubmission {
  id: string
  investorId: string
  pan: string
  aadhaarMasked: string
  bankAccount: string
  bankName: string
  submittedAt: string
  reviewedBy?: string
  reviewedAt?: string
  notes?: string
  documents: KycDocument[]
}

export interface KycDocument {
  id: string
  submissionId: string
  type: 'pan_card' | 'address_proof' | 'cancelled_cheque' | 'photograph'
  storagePath: string
  sizeBytes: number
  uploadedAt: string
}
