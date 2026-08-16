'use client'

import { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { updatePropertyAction, createPropertyAction, uploadPropertyDocumentAction } from '../actions'
import {
  PROPERTY_SECTION_ORDER,
  sectionStatus,
  isPropertyComplete,
  type PropertyCompletenessValues,
  type PropertySectionKey,
} from '../schemas'
import { fmtRupees, toSlug, toWords } from '@/lib/format'
import { AccordionSection } from './AccordionSection'
import { PropertyFormProvider, type PropertyFormApi, type SeqKey } from './sections/PropertyFormContext'
import { FieldError, selectStyle } from './sections/shared'
import { BasicsSection } from './sections/BasicsSection'
import { FinancialsSection } from './sections/FinancialsSection'
import { ReturnsSection } from './sections/ReturnsSection'
import { DescriptionSection } from './sections/DescriptionSection'
import { DocumentsSection } from './sections/DocumentsSection'
import { InvestorsSection } from './sections/InvestorsSection'
import type { OwnershipRow } from './sections/PropertyFormContext'
import type { PendingDoc } from './PendingDocuments'
import type { Property, InvestorDocument, Investor } from '@/types'
import type { AreaUnit } from '../schemas'

const SECTION_LABEL: Record<PropertySectionKey, string> = {
  basics: 'Basics',
  financials: 'Financial Structure',
  returns: 'Projected Returns',
  description: 'Description',
}

// Documents and Investors are optional sections tracked alongside the four mandatory ones.
const TRACKED_TOTAL = PROPERTY_SECTION_ORDER.length + 2

const STATUS_OPTS = [
  { value: 'Draft',  label: 'Draft — not visible to investors' },
  { value: 'Open',   label: 'Open — live on marketplace' },
  { value: 'Closed', label: 'Closed — no new investments' },
]

export function PropertyForm({
  property,
  documents,
  investors = [],
  ownerships = [],
  feeRatePct = 0,
  gstRatePct = 0,
}: {
  property?: Property
  documents?: InvestorDocument[]
  investors?: Investor[]
  ownerships?: OwnershipRow[]
  feeRatePct?: number
  gstRatePct?: number
}) {
  const isEdit = !!property
  const router = useRouter()
  const searchParams = useSearchParams()

  const [name,          setName]          = useState(property?.name ?? '')
  const [slug,          setSlug]          = useState(property?.slug ?? '')
  const [slugEdited,    setSlugEdited]    = useState(isEdit)
  const [city,          setCity]          = useState(property?.city ?? '')
  const [district,      setDistrict]      = useState(property?.district ?? '')
  const [state,         setState]         = useState(property?.state ?? '')
  const [pinCode,       setPinCode]       = useState(property?.pinCode ?? '')
  const [assetType,     setAssetType]     = useState<string>(property?.assetType ?? '')
  const [description,   setDescription]   = useState(property?.description ?? '')
  const [totalVal,      setTotalVal]      = useState(property?.totalValuation?.toString() ?? '')
  const [totalUnits,    setTotalUnits]    = useState(property?.totalUnits?.toString() ?? '')
  const [unitPrice,     setUnitPrice]     = useState(property?.unitPrice?.toString() ?? '')
  const [minUnits,      setMinUnits]      = useState(property?.minInvestmentUnits?.toString() ?? '')
  const [yieldPct,      setYieldPct]      = useState(property?.rentalYieldPct?.toString() ?? '')
  const [growthPct,     setGrowthPct]     = useState(property?.capitalGrowthPct?.toString() ?? '')
  const [holdingPeriod, setHoldingPeriod] = useState(property?.holdingPeriod ?? '')
  const [lockInPeriod,  setLockInPeriod]  = useState(property?.lockInPeriod ?? '')
  const [emoji,         setEmoji]         = useState(property?.coverEmoji ?? '🏢')
  const [imageFile,     setImageFile]     = useState<File | null>(null)
  const [imagePreview,  setImagePreview]  = useState<string | null>(property?.imageUrl ?? null)
  const [totalArea,     setTotalArea]     = useState(property?.totalArea?.toString() ?? '')
  const [areaUnit,      setAreaUnit]      = useState<AreaUnit>(property?.areaUnit ?? 'sqft')
  const [status,        setStatus]        = useState<Property['status']>(property?.status ?? 'Draft')
  const [pendingDocs,   setPendingDocs]   = useState<PendingDoc[]>([])
  const [errors,        setErrors]        = useState<Record<string, string[]>>({})
  const [savedNote,     setSavedNote]     = useState<string | null>(searchParams.get('created') ? 'Draft saved — continue below.' : null)
  const [isPending,     startTransition]  = useTransition()

  // ── live completeness (four mandatory sections) ──────────────────────
  const values: PropertyCompletenessValues = {
    name, slug, city, district, state, assetType, description,
    totalValuation: parseFloat(totalVal) || 0,
    totalUnits: parseFloat(totalUnits) || 0,
    unitPrice: parseFloat(unitPrice) || 0,
    minInvestmentUnits: parseFloat(minUnits) || 0,
    holdingPeriod, lockInPeriod,
  }
  const secStatus = {
    basics: sectionStatus('basics', values),
    financials: sectionStatus('financials', values),
    returns: sectionStatus('returns', values),
    description: sectionStatus('description', values),
  }
  const complete = isPropertyComplete(values)
  const mandatoryDone = PROPERTY_SECTION_ORDER.filter(k => secStatus[k] === 'complete').length
  const incompleteLabels = PROPERTY_SECTION_ORDER.filter(k => secStatus[k] !== 'complete').map(k => SECTION_LABEL[k])

  // Documents and Investors are optional but count toward the visible progress
  // once a file is uploaded / an investor is allocated.
  const docCount = isEdit ? (documents?.length ?? 0) : pendingDocs.length
  const docsComplete = docCount > 0
  const investorsComplete = ownerships.length > 0
  const trackedDone = mandatoryDone + (docsComplete ? 1 : 0) + (investorsComplete ? 1 : 0)
  const pct = Math.round((trackedDone / TRACKED_TOTAL) * 100)

  // ── accordion open state (multi-open; first incomplete open by default) ─
  const [openSet, setOpenSet] = useState<Record<string, boolean>>(() => {
    const fromParam = searchParams.get('open')
    if (fromParam) return { [fromParam]: true }
    const init: PropertyCompletenessValues = {
      name: property?.name, slug: property?.slug, city: property?.city, district: property?.district,
      state: property?.state, assetType: property?.assetType, description: property?.description,
      totalValuation: property?.totalValuation, totalUnits: property?.totalUnits,
      unitPrice: property?.unitPrice, minInvestmentUnits: property?.minInvestmentUnits,
      holdingPeriod: property?.holdingPeriod, lockInPeriod: property?.lockInPeriod,
    }
    const first = PROPERTY_SECTION_ORDER.find(k => sectionStatus(k, init) !== 'complete') ?? 'basics'
    return { [first]: true }
  })
  const SECTIONS: SeqKey[] = ['basics', 'financials', 'returns', 'description', 'documents', 'investors']
  const toggle = (key: string) => setOpenSet(s => ({ ...s, [key]: !s[key] }))
  const allOpen = SECTIONS.every(k => openSet[k])
  const toggleAll = () =>
    setOpenSet(allOpen ? {} : Object.fromEntries(SECTIONS.map(k => [k, true])))

  function handleValuationChange(v: string) {
    setTotalVal(v)
    const val = parseFloat(v), units = parseFloat(totalUnits)
    if (val > 0 && units > 0) setUnitPrice(Math.round(val / units).toString())
  }

  function handleTotalUnitsChange(v: string) {
    setTotalUnits(v)
    const val = parseFloat(totalVal), units = parseFloat(v)
    if (val > 0 && units > 0) setUnitPrice(Math.round(val / units).toString())
  }

  function handleNameChange(v: string) {
    setName(v)
    if (!slugEdited) setSlug(toSlug(v))
  }

  function handleImageChange(file: File | null) {
    setImageFile(file)
    setImagePreview(file ? URL.createObjectURL(file) : property?.imageUrl ?? null)
  }

  function buildFormData(targetStatus: Property['status']): FormData {
    const fd = new FormData()
    fd.set('name', name); fd.set('slug', slug); fd.set('city', city)
    fd.set('district', district); fd.set('state', state); fd.set('pinCode', pinCode)
    fd.set('assetType', assetType); fd.set('description', description)
    fd.set('totalValuation', totalVal); fd.set('totalUnits', totalUnits)
    fd.set('unitPrice', unitPrice); fd.set('minInvestmentUnits', minUnits)
    fd.set('rentalYieldPct', yieldPct); fd.set('capitalGrowthPct', growthPct)
    fd.set('holdingPeriod', holdingPeriod); fd.set('lockInPeriod', lockInPeriod)
    if (totalArea) { fd.set('totalArea', totalArea); fd.set('areaUnit', areaUnit) }
    else if (isEdit) fd.set('totalArea', '') // empty on edit = clear the stored area
    if (imageFile) fd.set('image', imageFile)
    fd.set('coverEmoji', emoji); fd.set('status', targetStatus)
    fd.set('coverGradient', 'linear-gradient(135deg,#1B3057,#2A4A7A)')
    return fd
  }

  // Persist the current form as a Draft. `advanceTo` opens the next section after
  // an in-place save; `finish` leaves the flow for the properties list. On create
  // the property is minted first and we redirect to the resumable edit screen.
  function persist(advanceTo: SeqKey | null, finish = false) {
    setErrors({})
    setSavedNote(null)
    // Persist whatever status the admin selected in the Publication Status card.
    // On create this is ignored (createProperty always mints a Draft); publishing
    // to Open is server-gated on completeness.
    const fd = buildFormData(status)

    startTransition(async () => {
      const result = isEdit
        ? await updatePropertyAction(property!.id, fd)
        : await createPropertyAction(fd)
      if (result?.error) {
        setErrors(result.error as Record<string, string[]>)
        window.scrollTo({ top: 0, behavior: 'smooth' })
        return
      }
      if (!result?.success) return

      const newId = (result as { id?: string }).id
      if (!isEdit && newId) {
        for (const doc of pendingDocs) {
          const dfd = new FormData()
          dfd.set('label', doc.label)
          dfd.set('file', doc.file)
          await uploadPropertyDocumentAction(newId, dfd)
        }
        if (finish) {
          router.push(`/admin/properties?created=${encodeURIComponent(name)}`)
          return
        }
        const q = new URLSearchParams({ created: '1' })
        if (advanceTo) q.set('open', advanceTo)
        router.push(`/admin/properties/${newId}/edit?${q.toString()}`)
        return
      }

      if (finish) {
        router.push(`/admin/properties?updated=${encodeURIComponent(name)}`)
        return
      }
      if (advanceTo) {
        setOpenSet({ [advanceTo]: true })
        setTimeout(() => document.getElementById(`section-${advanceTo}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0)
      }
      setSavedNote('Changes saved.')
    })
  }

  const err = (field: string) => errors[field]?.[0]

  const previewUnitPrice = parseFloat(unitPrice) || 0
  const previewMinUnits  = parseFloat(minUnits) || 0
  const previewValuation = parseFloat(totalVal) || 0
  const areaWords        = totalArea && parseFloat(totalArea) > 0 ? toWords(parseFloat(totalArea)) : null
  const valuationWords   = previewValuation > 0 ? toWords(previewValuation) : null
  const unitPriceWords   = previewUnitPrice > 0 ? toWords(previewUnitPrice) : null

  // ── section summaries (shown on collapsed headers) ────────────────────
  const basicsSummary = name
    ? [name, assetType || null, city || null].filter(Boolean).join(' · ')
    : 'Not started'
  const financialsSummary = previewValuation > 0 && parseFloat(totalUnits) > 0
    ? `${fmtRupees(previewValuation)} · ${parseFloat(totalUnits).toLocaleString('en-IN')} units`
    : 'Not started'
  const returnsSummary = holdingPeriod || lockInPeriod
    ? [holdingPeriod && `Hold ${holdingPeriod}`, lockInPeriod && `Lock-in ${lockInPeriod}`].filter(Boolean).join(' · ')
    : 'Not started'
  const trimmedDesc = description.trim()
  const descriptionSummary = trimmedDesc
    ? trimmedDesc.slice(0, 64) + (trimmedDesc.length > 64 ? '…' : '')
    : 'Not started'
  const documentsSummary = docCount > 0
    ? `${docCount} document${docCount > 1 ? 's' : ''}`
    : '0 uploaded — optional'
  const investorCount = ownerships.length
  const investorsSummary = !isEdit
    ? 'Available after the property is saved'
    : investorCount > 0
      ? `${investorCount} investor${investorCount > 1 ? 's' : ''} allocated`
      : 'No investors assigned — optional'

  const statusPill = status === 'Open'
    ? { label: 'Open', cls: 'badge-green' }
    : complete
      ? { label: 'Ready to publish', cls: 'badge-green' }
      : { label: 'Draft', cls: 'badge-amber' }

  const api: PropertyFormApi = {
    isEdit, property, documents,
    investors, ownerships, feeRatePct, gstRatePct,
    name, slug, city, district, state, pinCode, assetType, description,
    totalVal, totalUnits, unitPrice, minUnits, yieldPct, growthPct, holdingPeriod, lockInPeriod,
    emoji, totalArea, areaUnit, imageFile, imagePreview, pendingDocs,
    setSlug, setSlugEdited, setCity, setDistrict, setState, setPinCode, setAssetType, setDescription,
    setUnitPrice, setMinUnits, setYieldPct, setGrowthPct, setHoldingPeriod, setLockInPeriod,
    setEmoji, setTotalArea, setAreaUnit, setPendingDocs,
    handleNameChange, handleValuationChange, handleTotalUnitsChange, handleImageChange,
    areaWords, valuationWords, unitPriceWords, previewUnitPrice, previewMinUnits,
    err, saving: isPending, persist,
  }

  return (
    <PropertyFormProvider value={api}>
      <form onSubmit={e => { e.preventDefault(); persist(null) }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, alignItems: 'start' }}>

          {/* ── LEFT: progress header + accordion ─────────────── */}
          <div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', color: 'var(--slate-light)' }}>
                    Sections
                  </span>
                  <span className={`badge ${statusPill.cls}`} style={{ fontSize: 11 }}>{statusPill.label}</span>
                </div>
                <button
                  type="button"
                  onClick={toggleAll}
                  style={{
                    fontSize: 12.5, fontWeight: 600, color: 'var(--navy)', background: '#fff',
                    border: '1px solid var(--border-strong)', borderRadius: 8, padding: '6px 12px', cursor: 'pointer',
                  }}
                >
                  {allOpen ? 'Collapse all' : 'Expand all'}
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1, height: 6, background: 'var(--surface-2)', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', width: `${pct}%`,
                    background: complete ? 'var(--green)' : 'var(--gold)', transition: 'width 0.25s',
                  }} />
                </div>
                <span style={{ fontSize: 12.5, color: 'var(--slate-light)', minWidth: 142, textAlign: 'right' }}>
                  {trackedDone} of {TRACKED_TOTAL} sections complete
                </span>
              </div>

              <div style={{ fontSize: 12, marginTop: 8, color: complete ? 'var(--green)' : 'var(--slate)' }}>
                {complete
                  ? '✓ All required sections complete. Documents are optional.'
                  : `🔒 Complete ${incompleteLabels.join(', ')} before this can be published.`}
              </div>

              {err('status') && <FieldError msg={err('status')} />}
              {savedNote && (
                <div style={{ fontSize: 12, color: 'var(--green)', marginTop: 6, fontWeight: 600 }}>{savedNote}</div>
              )}
            </div>

            <AccordionSection index={1} anchorId="section-basics" title={SECTION_LABEL.basics}
              status={secStatus.basics} summary={basicsSummary} open={!!openSet.basics} onToggle={() => toggle('basics')}>
              <BasicsSection />
            </AccordionSection>

            <AccordionSection index={2} anchorId="section-financials" title={SECTION_LABEL.financials}
              status={secStatus.financials} summary={financialsSummary} open={!!openSet.financials} onToggle={() => toggle('financials')}>
              <FinancialsSection />
            </AccordionSection>

            <AccordionSection index={3} anchorId="section-returns" title={SECTION_LABEL.returns} badge="Displayed with disclaimer"
              status={secStatus.returns} summary={returnsSummary} open={!!openSet.returns} onToggle={() => toggle('returns')}>
              <ReturnsSection />
            </AccordionSection>

            <AccordionSection index={4} anchorId="section-description" title={SECTION_LABEL.description}
              status={secStatus.description} summary={descriptionSummary} open={!!openSet.description} onToggle={() => toggle('description')}>
              <DescriptionSection />
            </AccordionSection>

            <AccordionSection index={5} anchorId="section-documents" title="Property Documents" badge="🔒 Private"
              status={docsComplete ? 'complete' : 'optional'} summary={documentsSummary} open={!!openSet.documents} onToggle={() => toggle('documents')}>
              <DocumentsSection />
            </AccordionSection>

            <AccordionSection index={6} anchorId="section-investors" title="Investors"
              status={investorCount > 0 ? 'complete' : 'optional'} summary={investorsSummary}
              open={!!openSet.investors} onToggle={() => toggle('investors')}
              locked={!isEdit} lockedNote="Save the property first, then assign investors here.">
              <InvestorsSection />
            </AccordionSection>
          </div>

          {/* ── RIGHT: live preview + publish ─────────────────── */}
          <div style={{ position: 'sticky', top: 80, display: 'flex', flexDirection: 'column', gap: 14 }}>

            <div className="card" style={{ overflow: 'hidden' }}>
              <div style={{
                height: 110, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 40, background: 'linear-gradient(135deg,#1B3057,#2A4A7A)', position: 'relative',
              }}>
                {imagePreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={imagePreview} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span>{emoji || '🏢'}</span>
                )}
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0, padding: '6px 12px',
                  background: 'linear-gradient(transparent,rgba(15,30,56,0.85))',
                  fontSize: 11, color: 'rgba(255,255,255,0.85)', fontWeight: 500,
                }}>
                  {assetType || 'Type'} · {city || 'City'}
                </div>
              </div>

              <div style={{ padding: '14px 16px' }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--navy)', marginBottom: 2 }}>
                  {name || 'Property Name'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--slate-light)', marginBottom: 10 }}>
                  📍 {city || 'Location'}{district ? `, ${district}` : ''}{state ? `, ${state}` : ''}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 10 }}>
                  {[
                    { label: 'Unit Price',   value: previewUnitPrice > 0 ? `₹${previewUnitPrice.toLocaleString('en-IN')}` : '—' },
                    { label: 'Min. Invest.', value: previewUnitPrice > 0 && previewMinUnits > 0 ? fmtRupees(previewUnitPrice * previewMinUnits) : '—' },
                    { label: 'Rental Yield', value: yieldPct ? `${yieldPct}% p.a.` : '—', color: 'var(--green)' },
                    { label: 'Cap. Growth',  value: growthPct ? `${growthPct}% p.a.` : '—', color: 'var(--navy-mid)' },
                    { label: 'Total Value',  value: previewValuation > 0 ? fmtRupees(previewValuation) : '—', span: 2 },
                  ].map(s => (
                    <div key={s.label} style={{ gridColumn: s.span ? `span ${s.span}` : undefined }}>
                      <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--slate-light)', marginBottom: 2 }}>
                        {s.label}
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: s.color ?? 'var(--navy)' }}>
                        {s.value}
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span className={`badge ${status === 'Open' ? 'badge-green' : status === 'Draft' ? 'badge-amber' : 'badge-red'}`}>
                    {status}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--slate-light)' }}>Live preview</span>
                </div>
              </div>
            </div>

            {/* publication status */}
            <div className="card">
              <div className="card-header"><span className="card-title">Publication Status</span></div>
              <div className="card-body">
                <div className="form-label">Status</div>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value as Property['status'])}
                  style={selectStyle}
                >
                  {STATUS_OPTS.map(o => (
                    <option key={o.value} value={o.value} disabled={o.value === 'Open' && !complete}>
                      {o.label}{o.value === 'Open' && !complete ? ' (complete all sections first)' : ''}
                    </option>
                  ))}
                </select>
                <div className="form-hint" style={{ marginTop: 8 }}>
                  Properties start as Draft and require legal team sign-off before going Open.
                </div>
                {err('status') && <FieldError msg={err('status')} />}
              </div>
            </div>

            <div style={{
              padding: '10px 12px', background: 'var(--amber-bg)',
              border: '1px solid rgba(183,121,31,0.2)',
              borderRadius: 8, fontSize: 11.5, color: 'var(--slate)', lineHeight: 1.6,
            }}>
              ⚠️ Projected yields and financial details must be reviewed by the legal team before setting status to Open.
            </div>
          </div>
        </div>
      </form>
    </PropertyFormProvider>
  )
}
