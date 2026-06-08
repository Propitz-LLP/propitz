'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { publishPropertyAction } from '../actions'
import type { Property, PropertyStatus } from '@/types'

const STATUS_BADGE: Record<PropertyStatus, string> = {
  Draft:             'badge-amber',
  Open:              'badge-green',
  'Fully Subscribed':'badge-navy',
  Closed:            'badge-red',
}

function fmt(n: number) {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(1)}Cr`
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)}L`
  return `₹${n.toLocaleString('en-IN')}`
}

export function PropertyTable({ properties }: { properties: Property[] }) {
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter]     = useState('')
  const [publishing, setPublishing]     = useState<string | null>(null)
  const [, startTransition]             = useTransition()

  const filtered = properties.filter(p =>
    (!statusFilter || p.status === statusFilter) &&
    (!typeFilter   || p.assetType === typeFilter)
  )

  function handlePublish(id: string) {
    setPublishing(id)
    startTransition(async () => {
      await publishPropertyAction(id)
      setPublishing(null)
    })
  }

  return (
    <>
      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          style={{
            padding: '8px 14px', fontSize: 13, borderRadius: 8,
            border: '1px solid var(--border-strong)', background: '#fff',
            color: 'var(--navy)', cursor: 'pointer',
          }}
        >
          <option value="">All statuses</option>
          <option value="Draft">Draft</option>
          <option value="Open">Open</option>
          <option value="Fully Subscribed">Fully Subscribed</option>
          <option value="Closed">Closed</option>
        </select>
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          style={{
            padding: '8px 14px', fontSize: 13, borderRadius: 8,
            border: '1px solid var(--border-strong)', background: '#fff',
            color: 'var(--navy)', cursor: 'pointer',
          }}
        >
          <option value="">All types</option>
          <option value="Commercial">Commercial</option>
          <option value="Residential">Residential</option>
          <option value="Land">Land</option>
        </select>
        <div style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--slate-light)', alignSelf: 'center' }}>
          {filtered.length} of {properties.length} properties
        </div>
      </div>

      {/* Table */}
      <div className="card">
        {filtered.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--slate-light)' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🏢</div>
            <div style={{ fontWeight: 600, color: 'var(--navy)', marginBottom: 6 }}>No properties found</div>
            <div style={{ fontSize: 13 }}>
              {properties.length === 0
                ? 'Add your first property to get started.'
                : 'Try adjusting the filters.'}
            </div>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Property</th>
                <th>Type</th>
                <th>Unit Price</th>
                <th>Total Units</th>
                <th>Subscribed</th>
                <th>Yield / Growth</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const subscribedPct = p.totalUnits > 0
                  ? Math.round((p.subscribedUnits / p.totalUnits) * 100)
                  : 0

                return (
                  <tr key={p.id}>
                    {/* Property name + location */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 22 }}>{p.coverEmoji}</span>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--navy)' }}>{p.name}</div>
                          <div style={{ fontSize: 11.5, color: 'var(--slate-light)' }}>
                            {p.city}, {p.state}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span className="badge badge-navy">{p.assetType}</span>
                    </td>

                    <td className="num">₹{p.unitPrice.toLocaleString('en-IN')}</td>

                    <td className="num">{p.totalUnits.toLocaleString('en-IN')}</td>

                    {/* Subscribed with progress bar */}
                    <td>
                      <div style={{ minWidth: 90 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                          <span className="num">{p.subscribedUnits.toLocaleString('en-IN')}</span>
                          <span className="muted">{subscribedPct}%</span>
                        </div>
                        <div style={{ height: 4, background: 'var(--surface-2)', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{
                            height: '100%',
                            width: `${subscribedPct}%`,
                            background: subscribedPct >= 100 ? 'var(--green)' : 'var(--gold)',
                            borderRadius: 2,
                            transition: 'width 0.3s',
                          }} />
                        </div>
                      </div>
                    </td>

                    <td>
                      <div style={{ fontSize: 12.5 }}>
                        <span style={{ color: 'var(--green)', fontWeight: 500 }}>{p.rentalYieldPct}% yield</span>
                        <span className="muted"> · </span>
                        <span style={{ color: 'var(--navy-mid)', fontWeight: 500 }}>{p.capitalGrowthPct}% growth</span>
                      </div>
                    </td>

                    <td>
                      <span className={`badge ${STATUS_BADGE[p.status]}`}>{p.status}</span>
                    </td>

                    {/* Actions */}
                    <td>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <Link
                          href={`/admin/properties/${p.id}/edit`}
                          style={{
                            fontSize: 12, padding: '4px 10px', borderRadius: 6,
                            border: '1px solid var(--border-strong)', color: 'var(--navy)',
                            textDecoration: 'none', background: '#fff',
                          }}
                        >
                          Edit
                        </Link>
                        {p.status === 'Draft' && (
                          <button
                            onClick={() => handlePublish(p.id)}
                            disabled={publishing === p.id}
                            style={{
                              fontSize: 12, padding: '4px 10px', borderRadius: 6,
                              background: publishing === p.id ? 'var(--navy-mid)' : 'var(--navy)',
                              color: '#fff', border: 'none', cursor: publishing === p.id ? 'not-allowed' : 'pointer',
                            }}
                          >
                            {publishing === p.id ? 'Publishing…' : 'Publish →'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}
