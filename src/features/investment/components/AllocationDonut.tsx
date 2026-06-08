import type { PortfolioHolding } from '@/types'

const PALETTE = ['#C9A84C', '#2D7D5A', '#1B3057', '#8B5CF6', '#EC4899', '#F59E0B']

function buildArcs(slices: { pct: number }[]) {
  const circumference = 2 * Math.PI * 35 // r=35
  let offset = 0
  return slices.map((s, i) => {
    const dash = (s.pct / 100) * circumference
    const arc = { dash, gap: circumference - dash, offset, color: PALETTE[i % PALETTE.length] }
    offset += dash
    return arc
  })
}

export function AllocationDonut({ holdings }: { holdings: PortfolioHolding[] }) {
  const total = holdings.reduce((s, h) => s + h.currentValue, 0)

  if (holdings.length === 0) {
    return (
      <div className="card">
        <div className="card-header"><span className="card-title">Allocation</span></div>
        <div className="card-body" style={{ textAlign: 'center', color: 'var(--slate-light)', fontSize: 13 }}>
          No holdings yet
        </div>
      </div>
    )
  }

  const slices = holdings.map(h => ({
    label: h.propertyName,
    pct: total > 0 ? Math.round((h.currentValue / total) * 100) : 0,
  }))

  const arcs = buildArcs(slices)
  const circumference = 2 * Math.PI * 35

  return (
    <div className="card">
      <div className="card-header"><span className="card-title">Allocation</span></div>
      <div className="card-body">
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          {/* SVG donut */}
          <svg width="90" height="90" viewBox="0 0 90 90" style={{ flexShrink: 0 }}>
            {/* Track */}
            <circle cx="45" cy="45" r="35" fill="none" stroke="var(--surface-2)" strokeWidth="14" />
            {/* Segments */}
            {arcs.map((arc, i) => (
              <circle
                key={i}
                cx="45" cy="45" r="35"
                fill="none"
                stroke={arc.color}
                strokeWidth="14"
                strokeDasharray={`${arc.dash} ${arc.gap}`}
                strokeDashoffset={circumference / 4 - arc.offset}
                transform="rotate(-90 45 45)"
              />
            ))}
            {/* Centre label */}
            <text x="45" y="43" textAnchor="middle" fontSize="11" fontWeight="600" fill="var(--navy)">
              {holdings.length}
            </text>
            <text x="45" y="54" textAnchor="middle" fontSize="8" fill="var(--slate-light)">
              props
            </text>
          </svg>

          {/* Legend */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {slices.map((s, i) => (
              <div key={i} className="legend-row">
                <div className="legend-dot" style={{ background: PALETTE[i % PALETTE.length] }} />
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {s.label}
                </span>
                <strong style={{ flexShrink: 0 }}>{s.pct}%</strong>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
