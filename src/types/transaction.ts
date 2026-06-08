export type TransactionType = 'Investment' | 'Distribution' | 'Fee' | 'Resale' | 'Refund'
export type TransactionStatus =
  | 'Initiated'
  | 'Payment Confirmed'
  | 'Admin Pending'
  | 'Processing'
  | 'Completed'
  | 'Rejected'

export interface Transaction {
  id: string
  investorId: string
  propertyId: string | null
  type: TransactionType
  units: number | null
  gross: number
  fee: number
  net: number
  status: TransactionStatus
  razorpayId: string | null
  date: string
  period?: string
  notes?: string
  history: TransactionHistoryEntry[]
}

export interface TransactionHistoryEntry {
  id: string
  transactionId: string
  status: TransactionStatus
  date: string
  by: string
}

export interface Distribution {
  id: string
  propertyId: string
  period: string
  perUnit: number
  feePct: number
  grossTotal: number
  feeTotal: number
  netTotal: number
  investorCount: number
  date: string
  status: 'Pending' | 'Completed'
}

export interface PendingFee {
  id: string
  investorId: string
  amount: number
  period: string
  status: 'Pending' | 'Completed'
}
