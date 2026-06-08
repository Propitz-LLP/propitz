import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/auth'
import { getPropertyById } from '@/lib/db/properties'
import { PropertyForm } from '@/features/properties/admin/PropertyForm'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function EditPropertyPage({ params }: Props) {
  const { slug } = await params
  await requireAdmin()
  const property = await getPropertyById(slug)
  if (!property) notFound()
  return (
    <div className="max-w-[1100px] mx-auto px-8 py-8">
      <div className="mb-7">
        <h1 className="font-display text-3xl text-navy mb-1">Edit Property</h1>
        <p className="text-sm text-slate-400">{property.name}</p>
      </div>
      <PropertyForm property={property} />
    </div>
  )
}
