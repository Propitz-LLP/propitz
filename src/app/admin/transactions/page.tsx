import { requireAdmin } from '@/lib/auth'
import { getTransactions, getPendingTransactions, getDistributions, getPendingFees } from '@/lib/db/transactions'
import { AdminTxnTabs } from '@/features/transactions/admin/AdminTxnTabs'

export default async function AdminTransactionsPage() {
  await requireAdmin()
  const [pending, all, distributions, fees] = await Promise.all([
    getPendingTransactions(),
    getTransactions(),
    getDistributions(),
    getPendingFees(),
  ])
  return (
    <div className="max-w-[1100px] mx-auto px-8 py-8">
      <div className="mb-7">
        <h1 className="font-display text-3xl text-navy mb-1">Transaction Queue</h1>
        <p className="text-sm text-slate-400">{pending.length} pending approval</p>
      </div>
      <AdminTxnTabs
        pending={pending}
        all={all}
        distributions={distributions}
        fees={fees}
      />
    </div>
  )
}
