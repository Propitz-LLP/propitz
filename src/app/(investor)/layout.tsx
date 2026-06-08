import { requireAuth } from '@/lib/auth'
import { TopNav } from '@/components/layout/TopNav'
import { InvestorNav } from '@/components/layout/InvestorNav'

export default async function InvestorLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAuth()
  return (
    <div className="flex flex-col min-h-screen">
      <TopNav user={user} variant="investor" />
      <InvestorNav />
      <main className="flex-1 bg-[#FAFAF8]">{children}</main>
    </div>
  )
}
