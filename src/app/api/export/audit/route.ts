// Streaming CSV export of the audit log — API route (non-JSON response).
// Range is capped at 30 days per S11-01 acceptance criteria to bound memory.
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { listAuditLogsForExport } from '@/lib/db/audit'
import type { AuditAction, AuditEntityType } from '@/types'

const MAX_RANGE_DAYS = 30
const DAY_MS = 24 * 60 * 60 * 1000

function csvCell(value: unknown): string {
  const s = value == null ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value)
  // Escape per RFC 4180 when the cell contains a comma, quote, or newline.
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export async function GET(request: NextRequest) {
  await requireAdmin()

  const sp = request.nextUrl.searchParams
  const from = sp.get('from') || undefined
  const to = sp.get('to') || undefined

  // Enforce the 30-day cap. If a range is given, it must be ≤ 30 days; if only
  // one bound (or none) is given, default the window to the last 30 days.
  const now = new Date()
  const toDate = to ? new Date(`${to}T23:59:59.999Z`) : now
  const fromDate = from ? new Date(from) : new Date(toDate.getTime() - MAX_RANGE_DAYS * DAY_MS)
  if (toDate.getTime() - fromDate.getTime() > MAX_RANGE_DAYS * DAY_MS + DAY_MS) {
    return NextResponse.json(
      { error: 'Export range cannot exceed 30 days. Narrow the date filter.' },
      { status: 400 },
    )
  }

  const logs = await listAuditLogsForExport({
    actorEmail: sp.get('actor') || undefined,
    action: (sp.get('action') as AuditAction) || undefined,
    entityType: (sp.get('entity') as AuditEntityType) || undefined,
    from: fromDate.toISOString().slice(0, 10),
    to: toDate.toISOString().slice(0, 10),
  })

  const header = ['Timestamp', 'Actor', 'Action', 'Entity Type', 'Entity ID', 'Before', 'After', 'IP']
  const lines = [header.join(',')]
  for (const l of logs) {
    lines.push([
      l.createdAt, l.actorEmail, l.action, l.entityType, l.entityId,
      l.before, l.after, l.ip,
    ].map(csvCell).join(','))
  }

  return new NextResponse(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="propitz_audit_${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
