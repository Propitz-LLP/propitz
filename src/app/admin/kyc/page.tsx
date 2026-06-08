import { requireAdmin } from '@/lib/auth'
import { getKycQueue } from '@/lib/db/investors'
import { KycQueueTable } from '@/features/kyc/admin/KycQueueTable'

export default async function AdminKycPage() {
  await requireAdmin()
  const queue = await getKycQueue()
  return (
    <div className="max-w-[1100px] mx-auto px-8 py-8">
      <div className="flex items-start justify-between mb-7">
        <div>
          <h1 className="font-display text-3xl text-navy mb-1">KYC Review Queue</h1>
          <p className="text-sm text-slate-400">{queue.length} submissions pending · Manual review required</p>
        </div>
      </div>
      <KycQueueTable submissions={queue} />
    </div>
  )
}
