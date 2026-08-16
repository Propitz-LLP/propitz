import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/auth'
import { getPropertyByIdAdmin, getValuationHistory } from '@/lib/db/properties'
import { getDocumentsByProperty } from '@/lib/db/documents'
import { listAllInvestors } from '@/lib/db/investors'
import { getOwnershipsWithInvestorByProperty } from '@/lib/db/ownerships'
import { config } from '@/lib/config'
import { PropertyForm } from '@/features/properties/admin/PropertyForm'
import { ValuationPanel } from '@/features/properties/admin/ValuationPanel'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function EditPropertyPage({ params }: Props) {
  const { slug } = await params
  await requireAdmin()
  const property = await getPropertyByIdAdmin(slug)
  if (!property) notFound()
  const [valuationHistory, documents, investors, ownerships] = await Promise.all([
    getValuationHistory(property.id),
    getDocumentsByProperty(property.id),
    listAllInvestors(),
    getOwnershipsWithInvestorByProperty(property.id),
  ])
  return (
    <div className="max-w-[1100px] mx-auto px-8 py-8">
      <div className="mb-7">
        <h1 className="font-display text-3xl text-navy mb-1">Edit Property</h1>
        <p className="text-sm text-slate-400">{property.name}</p>
      </div>
      <PropertyForm
        property={property}
        documents={documents}
        investors={investors}
        ownerships={ownerships}
        feeRatePct={config.platform.feeRatePct}
        gstRatePct={config.platform.gstOnFeeRatePct}
      />
      <div style={{ marginTop: 24 }}>
        <ValuationPanel property={property} history={valuationHistory} />
      </div>
    </div>
  )
}
