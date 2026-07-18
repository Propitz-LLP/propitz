import { SEBI_DISCLAIMER } from '@/lib/constants'
import { fmtRupees } from '@/lib/format'
import type { Property } from '@/types'

const STATUS_BADGE: Record<Property['status'], string> = {
  Draft: 'badge-amber',
  Open: 'badge-green',
  'Fully Subscribed': 'badge-navy',
  Closed: 'badge-red',
}

function areaLabel(property: Property): string | null {
  if (!property.totalArea || !property.areaUnit) return null
  const unit = { sqft: 'sq ft', sqm: 'sq m', sqyd: 'sq yd', acres: 'acres', cents: 'cents', grounds: 'grounds', guntha: 'guntha' }[property.areaUnit]
  return `${property.totalArea.toLocaleString('en-IN')} ${unit}`
}

export function PropertyDetail({ property, availableUnits }: {
  property: Property
  availableUnits: number
}) {
  const subscribedPct = property.totalUnits > 0
    ? Math.round((property.subscribedUnits / property.totalUnits) * 100)
    : 0
  const area = areaLabel(property)

  return (
    <div>
      {/* ── Hero ─────────────────────────────────────────── */}
      <div className="card" style={{ overflow: 'hidden', marginBottom: 20 }}>
        <div style={{
          height: 260, position: 'relative',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: property.coverGradient || 'linear-gradient(135deg,#1B3057,#2A4A7A)',
          fontSize: 72,
        }}>
          {property.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={property.imageUrl} alt={property.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span>{property.coverEmoji}</span>
          )}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            padding: '28px 24px 16px',
            background: 'linear-gradient(transparent, rgba(15,30,56,0.9))',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12,
          }}>
            <div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, color: '#fff', marginBottom: 2 }}>
                {property.name}
              </h1>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>
                📍 {property.city}, {property.district}, {property.state}
                {property.pinCode ? ` — ${property.pinCode}` : ''}
                {area ? ` · ${area}` : ''}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              <span className="badge badge-navy">{property.assetType}</span>
              <span className={`badge ${STATUS_BADGE[property.status]}`}>{property.status}</span>
            </div>
          </div>
        </div>

        {/* ── Financial stats bar (all server-computed) ──── */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 0,
          borderTop: '1px solid var(--border)',
        }}>
          {[
            { label: 'Total Valuation', value: fmtRupees(property.totalValuation) },
            { label: 'Unit Price', value: `₹${property.unitPrice.toLocaleString('en-IN')}` },
            { label: 'Total Units', value: property.totalUnits.toLocaleString('en-IN') },
            { label: 'Subscribed', value: `${property.subscribedUnits.toLocaleString('en-IN')} (${subscribedPct}%)` },
            { label: 'Units Remaining', value: availableUnits.toLocaleString('en-IN'), highlight: availableUnits > 0 },
            { label: 'Min. Investment', value: fmtRupees(property.unitPrice * property.minInvestmentUnits) },
          ].map((s, i) => (
            <div key={s.label} style={{ padding: '14px 16px', borderLeft: i > 0 ? '1px solid var(--border)' : 'none' }}>
              <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--slate-light)', marginBottom: 3 }}>
                {s.label}
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: s.highlight ? 'var(--green)' : 'var(--navy)' }}>
                {s.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── About ────────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header"><span className="card-title">About this property</span></div>
        <div className="card-body">
          <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--slate)', whiteSpace: 'pre-line', marginBottom: 20 }}>
            {property.description}
          </p>

          <div className="form-label" style={{ marginBottom: 8 }}>Projected Returns</div>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ marginBottom: 14 }}>
              <thead>
                <tr><th>Rental Yield</th><th>Capital Growth</th><th>Holding Period</th><th>Lock-in Period</th></tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ color: 'var(--green)', fontWeight: 600 }}>{property.rentalYieldPct}% p.a.</td>
                  <td style={{ color: 'var(--navy-mid)', fontWeight: 600 }}>{property.capitalGrowthPct}% p.a.</td>
                  <td>{property.holdingPeriod}</td>
                  <td>{property.lockInPeriod}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* SEBI disclaimer — always visible, never collapsed */}
          <div style={{
            padding: '12px 16px', borderRadius: 8,
            background: 'var(--amber-bg, rgba(183,121,31,0.08))',
            border: '1px solid rgba(183,121,31,0.2)',
            fontSize: 11.5, lineHeight: 1.6, color: 'var(--slate)',
          }}>
            ⚠️ <strong>Disclaimer:</strong> {SEBI_DISCLAIMER}
          </div>
        </div>
      </div>
    </div>
  )
}
