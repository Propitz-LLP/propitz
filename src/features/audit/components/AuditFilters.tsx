'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import type { AuditAction, AuditEntityType } from '@/types'

const ACTIONS: AuditAction[] = [
  'kyc.under_review', 'kyc.approve', 'kyc.reject',
  'transaction.payment_received', 'transaction.approve', 'transaction.reject',
  'property.create', 'property.update', 'property.delete', 'property.publish',
  'distribution.run',
]
const ENTITY_TYPES: AuditEntityType[] = ['investor', 'transaction', 'property', 'distribution']

const selectStyle: React.CSSProperties = {
  padding: '8px 14px', fontSize: 13, borderRadius: 8,
  border: '1px solid var(--border-strong)', background: '#fff',
  color: 'var(--navy)', cursor: 'pointer',
}

export function AuditFilters({ exportHref }: { exportHref: string }) {
  const router = useRouter()
  const params = useSearchParams()

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString())
    if (value) next.set(key, value)
    else next.delete(key)
    next.delete('page') // any filter change resets to page 1
    router.push(`/admin/audit?${next.toString()}`)
  }

  return (
    <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
      <input
        className="form-input"
        placeholder="Filter by actor email…"
        defaultValue={params.get('actor') ?? ''}
        onBlur={e => setParam('actor', e.target.value.trim())}
        onKeyDown={e => { if (e.key === 'Enter') setParam('actor', (e.target as HTMLInputElement).value.trim()) }}
        style={{ maxWidth: 240, padding: '8px 14px', fontSize: 13 }}
      />
      <select value={params.get('action') ?? ''} onChange={e => setParam('action', e.target.value)} style={selectStyle}>
        <option value="">All actions</option>
        {ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
      </select>
      <select value={params.get('entity') ?? ''} onChange={e => setParam('entity', e.target.value)} style={selectStyle}>
        <option value="">All entities</option>
        {ENTITY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
      </select>
      <label style={{ fontSize: 12, color: 'var(--slate-light)', display: 'flex', gap: 6, alignItems: 'center' }}>
        From
        <input type="date" defaultValue={params.get('from') ?? ''} onChange={e => setParam('from', e.target.value)} style={selectStyle} />
      </label>
      <label style={{ fontSize: 12, color: 'var(--slate-light)', display: 'flex', gap: 6, alignItems: 'center' }}>
        To
        <input type="date" defaultValue={params.get('to') ?? ''} onChange={e => setParam('to', e.target.value)} style={selectStyle} />
      </label>
      <a
        href={exportHref}
        className="badge badge-navy"
        style={{ marginLeft: 'auto', textDecoration: 'none', padding: '8px 14px', fontSize: 13 }}
      >
        Export CSV
      </a>
    </div>
  )
}
