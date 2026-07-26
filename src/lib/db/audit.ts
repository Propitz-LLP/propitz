// All audit_logs DB access lives here.
// To migrate to RDS: swap createAdminClient() for a Drizzle/pg client. Query shapes stay the same.
//
// audit_logs is append-only: there is intentionally no update or delete helper.
// The table's trigger (see migration 009) rejects UPDATE/DELETE even for the
// service role. Reads and the single insert both go through the admin client —
// the JWT-role RLS policy never matches this app's app_metadata role model.

import { createAdminClient } from '@/lib/supabase/server'
import type { AuditLog, AuditLogFilter } from '@/types'

interface InsertAuditLog {
  id: string
  actorId: string | null
  actorEmail: string
  action: AuditLog['action']
  entityType: AuditLog['entityType']
  entityId: string
  before?: Record<string, unknown> | null
  after?: Record<string, unknown> | null
  ip?: string | null
}

export async function insertAuditLog(entry: InsertAuditLog): Promise<void> {
  const supabase = await createAdminClient()
  const { error } = await supabase.from('audit_logs').insert({
    id: entry.id,
    actorId: entry.actorId,
    actorEmail: entry.actorEmail,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId,
    before: entry.before ?? null,
    after: entry.after ?? null,
    ip: entry.ip ?? null,
  })
  // Surface the failure to the caller (recordAudit) — unlike best-effort emails,
  // a lost audit entry is a compliance gap, not a cosmetic miss.
  if (error) throw new Error(`audit insert failed: ${error.message}`)
}

const DEFAULT_PAGE_SIZE = 50

export interface AuditLogPage {
  rows: AuditLog[]
  total: number
  page: number
  pageSize: number
}

export async function listAuditLogs(filter: AuditLogFilter = {}): Promise<AuditLogPage> {
  const supabase = await createAdminClient()
  const page = Math.max(1, filter.page ?? 1)
  const pageSize = filter.pageSize ?? DEFAULT_PAGE_SIZE
  const fromRow = (page - 1) * pageSize
  const toRow = fromRow + pageSize - 1

  let query = supabase
    .from('audit_logs')
    .select('*', { count: 'exact' })
    .eq('isArchived', false) // S11-02: archived rows excluded from default queries

  if (filter.actorEmail) query = query.ilike('actorEmail', `%${filter.actorEmail}%`)
  if (filter.action) query = query.eq('action', filter.action)
  if (filter.entityType) query = query.eq('entityType', filter.entityType)
  if (filter.from) query = query.gte('createdAt', filter.from)
  // `to` is a date; include the whole day by comparing against the next midnight
  if (filter.to) query = query.lt('createdAt', `${filter.to}T23:59:59.999Z`)

  const { data, count, error } = await query
    .order('createdAt', { ascending: false })
    .range(fromRow, toRow)

  if (error) throw new Error(error.message)
  return { rows: (data ?? []) as AuditLog[], total: count ?? 0, page, pageSize }
}

// Unpaginated read for CSV export. Caller enforces the 30-day range cap (S11-01).
export async function listAuditLogsForExport(filter: AuditLogFilter = {}): Promise<AuditLog[]> {
  const supabase = await createAdminClient()
  let query = supabase.from('audit_logs').select('*').eq('isArchived', false)

  if (filter.actorEmail) query = query.ilike('actorEmail', `%${filter.actorEmail}%`)
  if (filter.action) query = query.eq('action', filter.action)
  if (filter.entityType) query = query.eq('entityType', filter.entityType)
  if (filter.from) query = query.gte('createdAt', filter.from)
  if (filter.to) query = query.lt('createdAt', `${filter.to}T23:59:59.999Z`)

  const { data, error } = await query.order('createdAt', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as AuditLog[]
}
