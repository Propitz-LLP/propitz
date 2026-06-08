import { requireAuth } from '@/lib/auth'
import { getPortfolio } from '@/lib/db/ownerships'
import { getTransactions } from '@/lib/db/transactions'
import { PortfolioKpis } from '@/features/investment/components/PortfolioKpis'
import { PortfolioTable } from '@/features/investment/components/PortfolioTable'
import { AllocationDonut } from '@/features/investment/components/AllocationDonut'
import { TransactionTable } from '@/features/transactions/components/TransactionTable'

export default async function DashboardPage() {
  const user = await requireAuth()
  const [portfolio, recentTxns] = await Promise.all([
    getPortfolio(user.id),
    getTransactions({ investorId: user.id }),
  ])

  return (
    <div className="max-w-[1100px] mx-auto px-8 py-8">
      <div className="mb-7">
        <h1 className="font-display text-3xl text-navy mb-1">Good morning ✦</h1>
        <p className="text-sm text-slate-400">Portfolio as of today</p>
      </div>
      <PortfolioKpis portfolio={portfolio} />
      <div className="grid grid-cols-[2fr_1fr] gap-5 mb-5">
        <PortfolioTable holdings={portfolio.holdings} />
        <AllocationDonut holdings={portfolio.holdings} />
      </div>
      <TransactionTable transactions={recentTxns.slice(0, 5)} />
    </div>
  )
}
