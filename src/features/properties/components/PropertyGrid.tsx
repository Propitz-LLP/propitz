import Link from 'next/link'
import { fmtRupees } from '@/lib/format'
import type { Property } from '@/types'

export function PropertyGrid({ properties }: { properties: Property[] }) {
  if (properties.length === 0) {
    return (
      <div className="card" style={{ padding: '56px 24px', textAlign: 'center', color: 'var(--slate-light)' }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>🏢</div>
        <div style={{ fontWeight: 600, color: 'var(--navy)', marginBottom: 6 }}>No open properties right now</div>
        <div style={{ fontSize: 13 }}>New investment opportunities are added regularly — check back soon.</div>
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
      {properties.map(p => {
        const subscribedPct = p.totalUnits > 0 ? Math.round((p.subscribedUnits / p.totalUnits) * 100) : 0
        return (
          <Link
            key={p.id}
            href={`/properties/${p.slug}`}
            className="card"
            style={{ overflow: 'hidden', textDecoration: 'none', display: 'block' }}
          >
            {/* Cover */}
            <div style={{
              height: 150, position: 'relative',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: p.coverGradient || 'linear-gradient(135deg,#1B3057,#2A4A7A)',
              fontSize: 48,
            }}>
              {p.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.imageUrl} alt={p.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span>{p.coverEmoji}</span>
              )}
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0, padding: '6px 14px',
                background: 'linear-gradient(transparent, rgba(15,30,56,0.85))',
                fontSize: 11.5, color: 'rgba(255,255,255,0.9)', fontWeight: 500,
              }}>
                {p.assetType} · {p.city}
              </div>
            </div>

            <div style={{ padding: '16px 18px' }}>
              <div style={{ fontSize: 15.5, fontWeight: 700, color: 'var(--navy)', marginBottom: 2 }}>{p.name}</div>
              <div style={{ fontSize: 12, color: 'var(--slate-light)', marginBottom: 12 }}>
                📍 {p.city}, {p.state}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                {[
                  { label: 'Unit Price', value: `₹${p.unitPrice.toLocaleString('en-IN')}` },
                  { label: 'Min. Invest', value: fmtRupees(p.unitPrice * p.minInvestmentUnits) },
                  { label: 'Rental Yield', value: `${p.rentalYieldPct}% p.a.`, color: 'var(--green)' },
                  { label: 'Cap. Growth', value: `${p.capitalGrowthPct}% p.a.`, color: 'var(--navy-mid)' },
                ].map(s => (
                  <div key={s.label}>
                    <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--slate-light)', marginBottom: 1 }}>
                      {s.label}
                    </div>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: s.color ?? 'var(--navy)' }}>{s.value}</div>
                  </div>
                ))}
              </div>

              {/* Availability bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, marginBottom: 4 }}>
                <span style={{ color: 'var(--slate-light)' }}>{subscribedPct}% subscribed</span>
                <span style={{ color: 'var(--navy)', fontWeight: 600 }}>
                  {(p.totalUnits - p.subscribedUnits).toLocaleString('en-IN')} units left
                </span>
              </div>
              <div style={{ height: 5, background: 'var(--surface-2)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${subscribedPct}%`, borderRadius: 3,
                  background: subscribedPct >= 100 ? 'var(--green)' : 'var(--gold)',
                }} />
              </div>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
