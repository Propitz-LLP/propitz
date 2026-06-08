import { requireAdmin } from '@/lib/auth'
import { TopNav } from '@/components/layout/TopNav'
import { AdminSidebar } from '@/components/layout/AdminSidebar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin()
  return (
    <div className="flex flex-col min-h-screen">
      <TopNav user={user} variant="admin" />
      <div className="flex flex-1 overflow-hidden">
        <AdminSidebar />
        <main className="flex-1 overflow-y-auto bg-[#FAFAF8]">{children}</main>
      </div>
    </div>
  )
}
