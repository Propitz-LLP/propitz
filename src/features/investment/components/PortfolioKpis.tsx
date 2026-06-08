import type { Portfolio } from '@/types'

function fmt(n: number) {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(1)}Cr`
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)}L`
  return `₹${n.toLocaleString('en-IN')}`
}

export function PortfolioKpis({ portfolio }: { portfolio: Portfolio }) {
  const { totalValue, totalInvested, unrealisedPnl, unrealisedPnlPct, distributionsYtd, holdings } = portfolio
  const yieldPct = totalInvested > 0 ? ((distributionsYtd / totalInvested) * 100).toFixed(1) : '0.0'
  const pnlSign = unrealisedPnl >= 0 ? '+' : '−'

  const kpis = [
    {
      label: 'Total Portfolio Value',
      value: fmt(totalValue),
      delta: totalValue > totalInvested
        ? `↑ ${fmt(totalValue - totalInvested)} this quarter`
        : 'No change',
      trend: totalValue >= totalInvested ? 'up' : 'down',
    },
    {
      label: 'Total Invested',
      value: fmt(totalInvested),
      delta: `Across ${holdings.length} ${holdings.length === 1 ? 'property' : 'properties'}`,
      trend: 'neutral',
    },
    {
      label: 'Unrealised P&L',
      value: `${pnlSign}${fmt(Math.abs(unrealisedPnl))}`,
      valueColor: unrealisedPnl >= 0 ? 'var(--green)' : 'var(--red)',
      delta: `${pnlSign}${Math.abs(unrealisedPnlPct).toFixed(1)}% overall return`,
      trend: unrealisedPnl >= 0 ? 'up' : 'down',
    },
    {
      label: 'Distributions YTD',
      value: fmt(distributionsYtd),
      delta: `${yieldPct}% annualised yield`,
      trend: 'up',
    },
  ]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 28 }}>
      {kpis.map(k => (
        <div key={k.label} className="kpi-card">
          <div className="kpi-label">{k.label}</div>
          <div className="kpi-value" style={k.valueColor ? { color: k.valueColor } : undefined}>
            {k.value}
          </div>
          <div className={`kpi-delta${k.trend === 'up' ? ' up' : k.trend === 'down' ? ' down' : ''}`}>
            {k.delta}
          </div>
        </div>
      ))}
    </div>
  )
}
