import Link from 'next/link'
import type { Transaction } from '@/types'

const TYPE_BADGE: Record<string, { cls: string; icon: string }> = {
  Investment:  { cls: 'badge-navy',  icon: '📦' },
  Distribution:{ cls: 'badge-green', icon: '💰' },
  Fee:         { cls: 'badge-amber', icon: '🔖' },
  Resale:      { cls: 'badge-gold',  icon: '🔄' },
  Refund:      { cls: 'badge-red',   icon: '↩️' },
}

const STATUS_BADGE: Record<string, string> = {
  Completed:         'badge-green',
  Rejected:          'badge-red',
  'Admin Pending':   'badge-amber',
  'Payment Confirmed':'badge-amber',
  Processing:        'badge-amber',
  Initiated:         'badge-navy',
}

function fmt(n: number) {
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)}L`
  return `₹${n.toLocaleString('en-IN')}`
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function TransactionTable({
  transactions,
  showActions = false,
}: {
  transactions: Transaction[]
  showActions?: boolean
}) {
  if (transactions.length === 0) {
    return (
      <div className="card">
        <div className="card-header">
          <span className="card-title">Recent Transactions</span>
          <Link href="/transactions" className="card-link">View all →</Link>
        </div>
        <div className="card-body" style={{ textAlign: 'center', padding: '32px 22px', color: 'var(--slate-light)', fontSize: 13 }}>
          No transactions yet
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Recent Transactions</span>
        <Link href="/transactions" className="card-link">View all →</Link>
      </div>
      <table className="data-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Type</th>
            <th>Units</th>
            <th>Amount</th>
            <th>Status</th>
            {showActions && <th></th>}
          </tr>
        </thead>
        <tbody>
          {transactions.map(txn => {
            const typeMeta = TYPE_BADGE[txn.type] ?? { cls: 'badge-navy', icon: '•' }
            const statusCls = STATUS_BADGE[txn.status] ?? 'badge-navy'
            const isPositive = txn.type === 'Distribution' || txn.type === 'Refund'

            return (
              <tr key={txn.id}>
                <td className="muted">{fmtDate(txn.date)}</td>
                <td>
                  <span className={`badge ${typeMeta.cls}`}>
                    {typeMeta.icon} {txn.type}
                  </span>
                </td>
                <td className="muted">{txn.units != null ? txn.units.toLocaleString('en-IN') : '—'}</td>
                <td className={isPositive ? 'num-pos' : 'num'}>
                  {isPositive ? '+' : ''}{fmt(txn.net)}
                </td>
                <td>
                  <span className={`badge ${statusCls}`}>{txn.status}</span>
                </td>
                {showActions && (
                  <td>
                    <Link href={`/admin/transactions/${txn.id}`} className="card-link">
                      Review →
                    </Link>
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
