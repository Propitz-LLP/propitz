import Link from 'next/link'
import type { PortfolioHolding } from '@/types'

function fmt(n: number) {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)}Cr`
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)}L`
  return `₹${n.toLocaleString('en-IN')}`
}

export function PortfolioTable({ holdings }: { holdings: PortfolioHolding[] }) {
  if (holdings.length === 0) {
    return (
      <div className="card">
        <div className="card-header">
          <span className="card-title">My Portfolio</span>
          <Link href="/properties" className="card-link">Browse properties →</Link>
        </div>
        <div className="card-body" style={{ textAlign: 'center', padding: '40px 22px', color: 'var(--slate-light)' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🏢</div>
          <div style={{ fontWeight: 600, marginBottom: 6, color: 'var(--navy)' }}>No investments yet</div>
          <div style={{ fontSize: 13 }}>Browse properties to make your first fractional investment.</div>
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">My Portfolio</span>
        <Link href="/properties" className="card-link">Browse more →</Link>
      </div>
      <table className="data-table">
        <thead>
          <tr>
            <th>Property</th>
            <th>Units</th>
            <th>Acq. Price</th>
            <th>Curr. Value</th>
            <th>P&amp;L</th>
          </tr>
        </thead>
        <tbody>
          {holdings.map(h => {
            const pnlSign = h.unrealisedPnl >= 0 ? '+' : '−'
            const pnlAbs = Math.abs(h.unrealisedPnl)
            return (
              <tr key={h.ownership.id}>
                <td>
                  <Link href={`/properties/${h.propertySlug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div style={{ fontWeight: 500 }}>{h.propertyName}</div>
                  </Link>
                </td>
                <td className="num">{h.ownership.units.toLocaleString('en-IN')}</td>
                <td className="muted">₹{h.ownership.acquiredPrice.toLocaleString('en-IN')}</td>
                <td className="num">{fmt(h.currentValue)}</td>
                <td className={h.unrealisedPnl >= 0 ? 'num-pos' : 'num-neg'}>
                  {pnlSign}{fmt(pnlAbs)}{' '}
                  <span style={{ fontSize: 11 }}>
                    ({pnlSign}{Math.abs(h.unrealisedPnlPct).toFixed(1)}%)
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
