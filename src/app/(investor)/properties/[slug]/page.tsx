import { notFound } from 'next/navigation'
import { requireAuth } from '@/lib/auth'
import { getPropertyBySlug, getValuationHistory, getAvailableUnits } from '@/lib/db/properties'
import { getDocumentsByProperty } from '@/lib/db/documents'
import { getInvestorById } from '@/lib/db/investors'
import { PropertyDetail } from '@/features/properties/components/PropertyDetail'
import { PropertyDocuments } from '@/features/properties/components/PropertyDocuments'
import { SubscribeWidget } from '@/features/investment/components/SubscribeWidget'
import { ValuationChart } from '@/features/properties/components/ValuationChart'
import { listEnabledMethods } from '@/lib/payments/methods'
import { config } from '@/lib/config'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function PropertyDetailPage({ params }: Props) {
  const { slug } = await params
  const user = await requireAuth()

  const property = await getPropertyBySlug(slug)
  if (!property) notFound()

  const [valuationHistory, documents, investor, availableUnits] = await Promise.all([
    getValuationHistory(property.id),
    getDocumentsByProperty(property.id),
    getInvestorById(user.id),
    getAvailableUnits(property),
  ])

  return (
    <div className="max-w-[1100px] mx-auto px-8 py-8">
      <PropertyDetail property={property} availableUnits={availableUnits} />
      <div className="grid grid-cols-[2fr_1fr] gap-5 mt-6">
        <div className="flex flex-col gap-5">
          <ValuationChart history={valuationHistory} />
          <PropertyDocuments documents={documents} />
        </div>
        <div className="sticky top-5">
          <SubscribeWidget
            property={property}
            kycApproved={investor?.kycStatus === 'Approved'}
            availableUnits={availableUnits}
            enabledMethods={listEnabledMethods()}
            feeRatePct={config.platform.feeRatePct}
            gstRatePct={config.platform.gstOnFeeRatePct}
          />
        </div>
      </div>
    </div>
  )
}
