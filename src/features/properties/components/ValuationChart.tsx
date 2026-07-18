import type { ValuationHistory } from '@/types'

// Valuation history as a table (FR-09.2): date, unit price, % change vs previous
export function ValuationChart({ history }: { history: ValuationHistory[] }) {
  return (
    <div className="card">
      <div className="card-header"><span className="card-title">Valuation History</span></div>
      {history.length === 0 ? (
        <div style={{ padding: '32px 24px', textAlign: 'center', fontSize: 13, color: 'var(--slate-light)' }}>
          No valuation updates yet. The first quarterly valuation will appear here.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr><th>Quarter</th><th>Recorded</th><th>Unit Price</th><th>Change</th></tr>
            </thead>
            <tbody>
              {[...history].reverse().map((entry, i, arr) => {
                const previous = arr[i + 1] // next in the reversed (newest-first) list
                const changePct = previous
                  ? ((entry.unitPrice - previous.unitPrice) / previous.unitPrice) * 100
                  : null
                return (
                  <tr key={entry.id}>
                    <td style={{ fontWeight: 600, color: 'var(--navy)' }}>{entry.quarter}</td>
                    <td style={{ fontSize: 12.5 }}>
                      {new Date(entry.recordedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="num">₹{entry.unitPrice.toLocaleString('en-IN')}</td>
                    <td>
                      {changePct === null ? (
                        <span className="muted">—</span>
                      ) : (
                        <span style={{ fontWeight: 600, color: changePct >= 0 ? 'var(--green)' : 'var(--red)' }}>
                          {changePct >= 0 ? '▲' : '▼'} {Math.abs(changePct).toFixed(1)}%
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
