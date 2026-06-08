import { requireAuth } from '@/lib/auth'
import { getTransactions } from '@/lib/db/transactions'
import { TransactionTable } from '@/features/transactions/components/TransactionTable'
import { TransactionFilters } from '@/features/transactions/components/TransactionFilters'

export default async function TransactionsPage() {
  const user = await requireAuth()
  const transactions = await getTransactions({ investorId: user.id })
  return (
    <div className="max-w-[1100px] mx-auto px-8 py-8">
      <div className="flex items-start justify-between mb-7">
        <div>
          <h1 className="font-display text-3xl text-navy mb-1">Transactions</h1>
          <p className="text-sm text-slate-400">Full history of investments, distributions & fees</p>
        </div>
      </div>
      <TransactionFilters />
      <TransactionTable transactions={transactions} showActions />
    </div>
  )
}
