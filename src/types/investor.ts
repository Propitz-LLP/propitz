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

export type KycDocType = 'pan_card' | 'aadhaar' | 'cancelled_cheque' | 'selfie'
export type KycSubmissionStatus = 'draft' | 'pending' | 'approved' | 'rejected'

export interface KycSubmission {
  id: string
  investorId: string
  fullLegalName?: string
  pan: string
  dob?: string
  gender?: string
  address?: string
  aadhaarMasked: string
  bankAccount: string
  bankName: string
  ifsc?: string
  accountType?: string
  accountHolderName?: string
  currentStep: number
  status: KycSubmissionStatus
  submittedAt: string
  reviewedBy?: string
  reviewedAt?: string
  notes?: string
  documents: KycDocument[]
  // Present when the queue query joins the investors relation
  investors?: Pick<Investor, 'name' | 'email' | 'kycStatus'>
}

export interface KycDocument {
  id: string
  submissionId: string
  type: KycDocType
  storagePath: string
  sizeBytes: number
  uploadedAt: string
}
