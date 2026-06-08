import { notFound } from 'next/navigation'
import { requireAuth } from '@/lib/auth'
import { getPropertyBySlug, getValuationHistory } from '@/lib/db/properties'
import { PropertyDetail } from '@/features/properties/components/PropertyDetail'
import { SubscribeWidget } from '@/features/investment/components/SubscribeWidget'
import { ValuationChart } from '@/features/properties/components/ValuationChart'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function PropertyDetailPage({ params }: Props) {
  const { slug } = await params
  await requireAuth()

  const [property, valuationHistory] = await Promise.all([
    getPropertyBySlug(slug),
    getPropertyBySlug(slug).then(p => p ? getValuationHistory(p.id) : []),
  ])

  if (!property) notFound()

  return (
    <div className="max-w-[1100px] mx-auto px-8 py-8">
      <PropertyDetail property={property} />
      <div className="grid grid-cols-[2fr_1fr] gap-5 mt-6">
        <div className="flex flex-col gap-5">
          <ValuationChart history={valuationHistory} />
        </div>
        <div className="sticky top-5">
          <SubscribeWidget property={property} />
        </div>
      </div>
    </div>
  )
}
