import { requireAuth } from '@/lib/auth'
import { getInvestorById } from '@/lib/db/investors'
import { TopNav } from '@/components/layout/TopNav'
import { InvestorNav } from '@/components/layout/InvestorNav'
import { KycBanner } from '@/components/layout/KycBanner'

export default async function InvestorLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAuth()
  const investor = await getInvestorById(user.id)
  return (
    <div className="flex flex-col min-h-screen">
      <TopNav user={user} variant="investor" />
      <InvestorNav />
      <KycBanner status={investor?.kycStatus ?? 'Not Started'} />
      <main className="flex-1 bg-[#FAFAF8]">{children}</main>
    </div>
  )
}
