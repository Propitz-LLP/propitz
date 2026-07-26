// Audit abstraction — the ONLY place feature code writes an audit trail entry.
// To migrate to a dedicated audit service (e.g. AWS QLDB / CloudTrail-style
// ledger): rewrite this file only. Feature actions call recordAudit(); they
// never touch the audit_logs table or the DB layer directly.
//
// Atomicity: for the two atomic RPCs (approve_transaction_atomic,
// distribute_atomic) the audit row is written INSIDE the plpgsql transaction —
// recordAudit is NOT called for those. For JS-orchestrated admin actions (KYC,
// property) recordAudit is awaited immediately after the mutation; a failure
// throws (a lost audit entry is a compliance gap, not a cosmetic miss).

import { headers } from 'next/headers'
import { insertAuditLog } from '@/lib/db/audit'
import type { AuthUser, AuditAction, AuditEntityType } from '@/types'

interface RecordAuditInput {
  actor: Pick<AuthUser, 'id' | 'email'>
  action: AuditAction
  entityType: AuditEntityType
  entityId: string
  before?: Record<string, unknown> | null
  after?: Record<string, unknown> | null
}

// Best-effort client IP from the proxy headers (Vercel sets x-forwarded-for).
async function clientIp(): Promise<string | null> {
  try {
    const h = await headers()
    const fwd = h.get('x-forwarded-for')
    if (fwd) return fwd.split(',')[0].trim()
    return h.get('x-real-ip')
  } catch {
    return null
  }
}

export async function recordAudit(input: RecordAuditInput): Promise<void> {
  await insertAuditLog({
    id: crypto.randomUUID(),
    actorId: input.actor.id,
    actorEmail: input.actor.email,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    before: input.before ?? null,
    after: input.after ?? null,
    ip: await clientIp(),
  })
}
