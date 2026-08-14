// Audit log entry — an append-only record of a privileged admin action.
// Written via src/lib/audit (recordAudit); never mutated after insert.

export type AuditAction =
  | 'kyc.under_review'
  | 'kyc.approve'
  | 'kyc.reject'
  | 'transaction.payment_received'
  | 'transaction.approve'
  | 'transaction.reject'
  | 'property.create'
  | 'property.update'
  | 'property.delete'
  | 'property.publish'
  | 'property.revalue'
  | 'document.upload'
  | 'document.delete'
  | 'distribution.run'

export type AuditEntityType =
  | 'investor'
  | 'transaction'
  | 'property'
  | 'document'
  | 'distribution'

export interface AuditLog {
  id: string
  actorId: string | null
  actorEmail: string
  action: AuditAction
  entityType: AuditEntityType
  entityId: string
  before: Record<string, unknown> | null
  after: Record<string, unknown> | null
  ip: string | null
  isArchived: boolean
  createdAt: string
}

export interface AuditLogFilter {
  actorEmail?: string
  action?: AuditAction
  entityType?: AuditEntityType
  from?: string // ISO date (inclusive)
  to?: string   // ISO date (inclusive)
  page?: number
  pageSize?: number
}
