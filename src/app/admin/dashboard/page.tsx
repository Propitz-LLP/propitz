import { requireAdmin } from '@/lib/auth'
import { listAllInvestors } from '@/lib/db/investors'
import { listAllProperties } from '@/lib/db/properties'
import { getPendingTransactions } from '@/lib/db/transactions'

export default async function AdminDashboardPage() {
  await requireAdmin()
  const [investors, properties, pendingTxns] = await Promise.all([
    listAllInvestors(),
    listAllProperties(),
    getPendingTransactions(),
  ])

  const pendingKyc = investors.filter(i =>
    i.kycStatus === 'Submitted' || i.kycStatus === 'Under Review'
  )
  const aum = properties.reduce((s, p) => s + p.subscribedUnits * p.unitPrice, 0)

  return (
    <div className="max-w-[1100px] mx-auto px-8 py-8">
      <div className="mb-7">
        <h1 className="font-display text-3xl text-navy mb-1">Admin Dashboard</h1>
        <p className="text-sm text-slate-400">Platform overview</p>
      </div>
      <div className="grid grid-cols-4 gap-4 mb-7">
        {[
          { label: 'Total AUM', value: `₹${(aum / 1e7).toFixed(1)}Cr` },
          { label: 'Total Investors', value: investors.length },
          { label: 'Pending KYC', value: pendingKyc.length },
          { label: 'Pending Txns', value: pendingTxns.length },
        ].map(k => (
          <div key={k.label} className="bg-white border border-black/10 rounded-xl p-5 shadow-sm">
            <div className="text-xs uppercase tracking-widest text-slate-400 mb-2">{k.label}</div>
            <div className="text-3xl font-semibold text-navy">{k.value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
