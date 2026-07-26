import { requireAuth } from '@/lib/auth'
import { getInvestorById } from '@/lib/db/investors'
import { listNotifications, countUnread } from '@/lib/db/notifications'
import { TopNav } from '@/components/layout/TopNav'
import { InvestorNav } from '@/components/layout/InvestorNav'
import { KycBanner } from '@/components/layout/KycBanner'

export default async function InvestorLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAuth()
  const [investor, notifications, unreadCount] = await Promise.all([
    getInvestorById(user.id),
    listNotifications(user.id),
    countUnread(user.id),
  ])
  return (
    <div className="flex flex-col min-h-screen">
      <TopNav user={user} variant="investor" notifications={notifications} unreadCount={unreadCount} />
      <InvestorNav />
      <KycBanner status={investor?.kycStatus ?? 'Not Started'} />
      <main className="flex-1 bg-[#FAFAF8]">{children}</main>
    </div>
  )
}
