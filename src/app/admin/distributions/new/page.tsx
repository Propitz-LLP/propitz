import { requireAdmin } from '@/lib/auth'
import { listAllProperties } from '@/lib/db/properties'
import { DistributionForm } from '@/features/distributions/components/DistributionForm'

export default async function NewDistributionPage() {
  await requireAdmin()
  const properties = await listAllProperties()
  const openProperties = properties.filter(p => p.status === 'Open' || p.status === 'Fully Subscribed')
  return (
    <div className="max-w-[800px] mx-auto px-8 py-8">
      <div className="mb-7">
        <h1 className="font-display text-3xl text-navy mb-1">New Distribution</h1>
        <p className="text-sm text-slate-400">Initiate a rental distribution payout to all unit holders</p>
      </div>
      <DistributionForm properties={openProperties} />
    </div>
  )
}
