import { requireAdmin } from '@/lib/auth'
import { listAuditLogs } from '@/lib/db/audit'
import { AuditFilters } from '@/features/audit/components/AuditFilters'
import type { AuditAction, AuditEntityType, AuditLogFilter } from '@/types'

const ACTION_BADGE: Record<string, string> = {
  approve: 'badge-green',
  publish: 'badge-green',
  reject: 'badge-red',
  delete: 'badge-red',
  create: 'badge-navy',
  update: 'badge-navy',
  run: 'badge-navy',
  payment_received: 'badge-amber',
  under_review: 'badge-amber',
}

function badgeFor(action: string): string {
  const verb = action.split('.')[1] ?? ''
  return ACTION_BADGE[verb] ?? 'badge-amber'
}

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function jsonCell(value: Record<string, unknown> | null): string {
  if (!value) return '—'
  return Object.entries(value).map(([k, v]) => `${k}: ${v ?? '—'}`).join(', ')
}

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  await requireAdmin()
  const sp = await searchParams

  const page = Math.max(1, Number(sp.page) || 1)
  const filter: AuditLogFilter = {
    actorEmail: sp.actor || undefined,
    action: (sp.action as AuditAction) || undefined,
    entityType: (sp.entity as AuditEntityType) || undefined,
    from: sp.from || undefined,
    to: sp.to || undefined,
    page,
  }

  const { rows, total, pageSize } = await listAuditLogs(filter)
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  // CSV export carries the same filters
  const exportParams = new URLSearchParams(
    Object.entries({ actor: sp.actor, action: sp.action, entity: sp.entity, from: sp.from, to: sp.to })
      .filter(([, v]) => v) as [string, string][],
  )
  const exportHref = `/api/export/audit${exportParams.toString() ? `?${exportParams}` : ''}`

  function pageHref(p: number): string {
    const next = new URLSearchParams(
      Object.entries({ actor: sp.actor, action: sp.action, entity: sp.entity, from: sp.from, to: sp.to })
        .filter(([, v]) => v) as [string, string][],
    )
    if (p > 1) next.set('page', String(p))
    return `/admin/audit${next.toString() ? `?${next}` : ''}`
  }

  return (
    <div className="max-w-[1100px] mx-auto px-8 py-8">
      <div className="mb-7">
        <h1 className="font-display text-3xl text-navy mb-1">Audit Log</h1>
        <p className="text-sm text-slate-400">
          {total} {total === 1 ? 'entry' : 'entries'} · append-only, read-only
        </p>
      </div>

      <AuditFilters exportHref={exportHref} />

      <div className="card">
        {rows.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--slate-light)' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
            <div style={{ fontWeight: 600, color: 'var(--navy)', marginBottom: 6 }}>No audit entries</div>
            <div style={{ fontSize: 13 }}>{total === 0 ? 'Nothing has been logged yet.' : 'Try adjusting the filters.'}</div>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>When</th><th>Actor</th><th>Action</th><th>Entity</th><th>Before</th><th>After</th><th>IP</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id}>
                  <td style={{ fontSize: 12.5, whiteSpace: 'nowrap' }}>{fmtDateTime(r.createdAt)}</td>
                  <td style={{ fontSize: 12.5 }}>{r.actorEmail}</td>
                  <td><span className={`badge ${badgeFor(r.action)}`}>{r.action}</span></td>
                  <td style={{ fontSize: 12 }}>
                    <div style={{ fontWeight: 600, color: 'var(--navy)' }}>{r.entityType}</div>
                    <div style={{ fontSize: 11, color: 'var(--slate-light)', fontFamily: 'monospace' }}>{r.entityId}</div>
                  </td>
                  <td style={{ fontSize: 11.5, color: 'var(--slate-light)', maxWidth: 180 }}>{jsonCell(r.before)}</td>
                  <td style={{ fontSize: 11.5, color: 'var(--slate-light)', maxWidth: 180 }}>{jsonCell(r.after)}</td>
                  <td style={{ fontSize: 11.5, color: 'var(--slate-light)', fontFamily: 'monospace' }}>{r.ip ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 20, alignItems: 'center' }}>
          {page > 1 && <a href={pageHref(page - 1)} className="badge badge-navy" style={{ textDecoration: 'none' }}>← Prev</a>}
          <span style={{ fontSize: 13, color: 'var(--slate-light)' }}>Page {page} of {totalPages}</span>
          {page < totalPages && <a href={pageHref(page + 1)} className="badge badge-navy" style={{ textDecoration: 'none' }}>Next →</a>}
        </div>
      )}
    </div>
  )
}
