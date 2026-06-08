import { requireAuth } from '@/lib/auth'
import { listPublishedProperties } from '@/lib/db/properties'
import { PropertyGrid } from '@/features/properties/components/PropertyGrid'
import { PropertyFilters } from '@/features/properties/components/PropertyFilters'

export default async function PropertiesPage() {
  await requireAuth()
  const properties = await listPublishedProperties()
  return (
    <div className="max-w-[1100px] mx-auto px-8 py-8">
      <div className="flex items-start justify-between mb-7">
        <div>
          <h1 className="font-display text-3xl text-navy mb-1">Browse Properties</h1>
          <p className="text-sm text-slate-400">{properties.length} opportunities · KYC-verified access</p>
        </div>
        <PropertyFilters />
      </div>
      <PropertyGrid properties={properties} />
    </div>
  )
}
