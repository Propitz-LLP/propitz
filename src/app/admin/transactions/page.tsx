import { requireAdmin } from '@/lib/auth'
import { getTransactionsAdmin, getPendingTransactions, getDistributions, getPendingFees } from '@/lib/db/transactions'
import { AdminTxnTabs } from '@/features/transactions/admin/AdminTxnTabs'

export default async function AdminTransactionsPage() {
  await requireAdmin()
  const [awaitingPayment, pending, all, distributions, fees] = await Promise.all([
    getTransactionsAdmin({ status: 'Initiated', type: 'Investment' }),
    getPendingTransactions(),
    getTransactionsAdmin(),
    getDistributions(),
    getPendingFees(),
  ])
  return (
    <div className="max-w-[1100px] mx-auto px-8 py-8">
      <div className="mb-7">
        <h1 className="font-display text-3xl text-navy mb-1">Transaction Queue</h1>
        <p className="text-sm text-slate-400">
          {awaitingPayment.length} awaiting payment · {pending.length} pending approval
        </p>
      </div>
      <AdminTxnTabs
        awaitingPayment={awaitingPayment}
        pending={pending}
        all={all}
        distributions={distributions}
        fees={fees}
      />
    </div>
  )
}
