// In-app notification — one row per investor-facing event, surfaced in the
// top-bar bell. Created alongside the matching email via recordNotification.

export type NotificationType =
  | 'kyc.received'
  | 'kyc.approved'
  | 'kyc.rejected'
  | 'transaction.confirmed'
  | 'transaction.rejected'
  | 'distribution.credited'

export interface Notification {
  id: string
  investorId: string
  type: NotificationType
  title: string
  body: string
  link: string | null
  readAt: string | null
  createdAt: string
}
