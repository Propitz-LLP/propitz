'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createPropertyAction, updatePropertyAction } from '../actions'
import { AREA_UNITS } from '../schemas'
import type { Property } from '@/types'
import type { AreaUnit } from '../schemas'

/* ── helpers ─────────────────────────────────────────── */
function toSlug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}
function fmt(n: number) {
  if (!n || isNaN(n)) return '—'
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)}Cr`
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)}L`
  return `₹${n.toLocaleString('en-IN')}`
}

const STATUS_OPTS = [
  { value: 'Draft', label: 'Draft — not visible to investors' },
  { value: 'Open',  label: 'Open — live on marketplace' },
  { value: 'Closed',label: 'Closed — no new investments' },
]

/* ── shared field styles ─────────────────────────────── */
const fieldStyle: React.CSSProperties = { marginBottom: 18 }
const rowStyle: React.CSSProperties   = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 18 }

/* ── sub-components ──────────────────────────────────── */
function Section({ title, badge, children }: { title: string; badge?: string; children: React.ReactNode }) {
  return (
    <div className="card" style={{ marginBottom: 18 }}>
      <div className="card-header">
        <span className="card-title">{title}</span>
        {badge && <span className="badge badge-amber" style={{ fontSize: 11 }}>{badge}</span>}
      </div>
      <div className="card-body">{children}</div>
    </div>
  )
}

function Field({ label, required, hint, children }: {
  label: string; required?: boolean; hint?: string; children: React.ReactNode
}) {
  return (
    <div style={fieldStyle}>
      <label className="form-label">
        {label} {required && <span style={{ color: 'var(--red)' }}>*</span>}
      </label>
      {children}
      {hint && <div className="form-hint">{hint}</div>}
    </div>
  )
}

/* ── main component ──────────────────────────────────── */
export function PropertyForm({ property }: { property?: Property }) {
  const isEdit = !!property

  // Form state
  const [name,         setName]         = useState(property?.name ?? '')
  const [slug,         setSlug]         = useState(property?.slug ?? '')
  const [slugEdited,   setSlugEdited]   = useState(isEdit)
  const [city,         setCity]         = useState(property?.city ?? '')
  const [district,     setDistrict]     = useState(property?.district ?? '')
  const [state,        setState]        = useState(property?.state ?? '')
  const [pinCode,      setPinCode]      = useState(property?.pinCode ?? '')
  const [assetType,    setAssetType]    = useState<string>(property?.assetType ?? '')
  const [description,  setDescription]  = useState(property?.description ?? '')
  const [totalVal,     setTotalVal]     = useState(property?.totalValuation?.toString() ?? '')
  const [totalUnits,   setTotalUnits]   = useState(property?.totalUnits?.toString() ?? '')
  const [unitPrice,    setUnitPrice]    = useState(property?.unitPrice?.toString() ?? '')
  const [minUnits,     setMinUnits]     = useState(property?.minInvestmentUnits?.toString() ?? '')
  const [yieldPct,     setYieldPct]     = useState(property?.rentalYieldPct?.toString() ?? '')
  const [growthPct,    setGrowthPct]    = useState(property?.capitalGrowthPct?.toString() ?? '')
  const [holdingPeriod,setHoldingPeriod]= useState(property?.holdingPeriod ?? '')
  const [lockInPeriod, setLockInPeriod] = useState(property?.lockInPeriod ?? '')
  const [emoji,        setEmoji]        = useState(property?.coverEmoji ?? '🏢')
  const [totalArea,    setTotalArea]    = useState(property?.totalArea?.toString() ?? '')
  const [areaUnit,     setAreaUnit]     = useState<AreaUnit>(property?.areaUnit ?? 'sqft')
  const [status,       setStatus]       = useState(property?.status ?? 'Draft')
  const [errors,       setErrors]       = useState<Record<string, string[]>>({})
  const [isPending,    startTransition] = useTransition()
  const router = useRouter()

  // Auto-calculate unit price from valuation ÷ units
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

  // Live preview values
  const previewUnitPrice = parseFloat(unitPrice) || 0
  const previewMinUnits  = parseFloat(minUnits) || 0
  const previewValuation = parseFloat(totalVal) || 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrors({})

    const fd = new FormData()
    fd.set('name', name); fd.set('slug', slug); fd.set('city', city)
    fd.set('district', district); fd.set('state', state); fd.set('pinCode', pinCode)
    fd.set('assetType', assetType); fd.set('description', description)
    fd.set('totalValuation', totalVal); fd.set('totalUnits', totalUnits)
    fd.set('unitPrice', unitPrice); fd.set('minInvestmentUnits', minUnits)
    fd.set('rentalYieldPct', yieldPct); fd.set('capitalGrowthPct', growthPct)
    fd.set('holdingPeriod', holdingPeriod); fd.set('lockInPeriod', lockInPeriod)
    if (totalArea) fd.set('totalArea', totalArea)
    if (totalArea) fd.set('areaUnit', areaUnit)
    fd.set('coverEmoji', emoji); fd.set('status', status)
    fd.set('coverGradient', 'linear-gradient(135deg,#1B3057,#2A4A7A)')

    startTransition(async () => {
      const result = isEdit
        ? await updatePropertyAction(property!.id, fd)
        : await createPropertyAction(fd)
      if (result?.error) {
        setErrors(result.error as Record<string, string[]>)
        window.scrollTo({ top: 0, behavior: 'smooth' })
      } else if (result?.success) {
        const param = isEdit ? 'updated' : 'created'
        router.push(`/admin/properties?${param}=${encodeURIComponent(name)}`)
      }
    })
  }

  function err(field: string) {
    return errors[field]?.[0]
  }

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, alignItems: 'start' }}>

        {/* ── LEFT: form fields ─────────────────────────── */}
        <div>
          {/* Basic Info */}
          <Section title="Basic Information">
            <Field label="Property Name" required>
              <input className="form-input" value={name} onChange={e => handleNameChange(e.target.value)} placeholder="e.g. Brigade Metropolis Phase 2" />
              {err('name') && <div style={{ color: 'var(--red)', fontSize: 12, marginTop: 3 }}>{err('name')}</div>}
            </Field>

            <Field label="URL Slug" required hint="Auto-generated from name. Lowercase letters, numbers and hyphens only.">
              <input
                className="form-input"
                value={slug}
                onChange={e => { setSlug(e.target.value); setSlugEdited(true) }}
                placeholder="e.g. brigade-metropolis-phase-2"
              />
              {err('slug') && <div style={{ color: 'var(--red)', fontSize: 12, marginTop: 3 }}>{err('slug')}</div>}
            </Field>

            <Field label="Town / City / Village" required>
              <input className="form-input" value={city} onChange={e => setCity(e.target.value)} placeholder="e.g. Koramangala, Bengaluru" />
            </Field>

            <div style={rowStyle}>
              <Field label="District" required>
                <input className="form-input" value={district} onChange={e => setDistrict(e.target.value)} placeholder="e.g. Bengaluru Urban" />
              </Field>
              <Field label="State" required>
                <input className="form-input" value={state} onChange={e => setState(e.target.value)} placeholder="e.g. Karnataka" />
              </Field>
            </div>

            <div style={rowStyle}>
              <Field label="Pin Code">
                <input className="form-input" value={pinCode} onChange={e => setPinCode(e.target.value)} placeholder="560001" maxLength={6} />
              </Field>
              <Field label="Asset Type" required>
                <select
                  value={assetType}
                  onChange={e => setAssetType(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 14px', border: '1px solid var(--border-strong)',
                    borderRadius: 8, fontSize: 14, color: 'var(--navy)', background: '#fff',
                  }}
                >
                  <option value="">Select type…</option>
                  <option value="Commercial">Commercial</option>
                  <option value="Residential">Residential</option>
                  <option value="Land">Land</option>
                </select>
                {err('assetType') && <div style={{ color: 'var(--red)', fontSize: 12, marginTop: 3 }}>{err('assetType')}</div>}
              </Field>
            </div>

            <Field label="Total Area">
              <div style={{ display: 'flex', gap: 10 }}>
                <input
                  className="form-input"
                  type="number"
                  value={totalArea}
                  onChange={e => setTotalArea(e.target.value)}
                  placeholder="e.g. 2400"
                  min="0"
                  step="any"
                  style={{ flex: 1 }}
                />
                <select
                  value={areaUnit}
                  onChange={e => setAreaUnit(e.target.value as AreaUnit)}
                  style={{
                    padding: '10px 14px', border: '1px solid var(--border-strong)',
                    borderRadius: 8, fontSize: 14, color: 'var(--navy)', background: '#fff',
                    minWidth: 110,
                  }}
                >
                  {AREA_UNITS.map(u => (
                    <option key={u} value={u}>{u === 'sqft' ? 'sq ft' : u === 'sqm' ? 'sq m' : u === 'sqyd' ? 'sq yd' : u.charAt(0).toUpperCase() + u.slice(1)}</option>
                  ))}
                </select>
              </div>
            </Field>

            <Field label="Display Emoji" hint="Single emoji shown on property cards.">
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <span style={{
                  fontSize: 28, width: 48, height: 48, background: 'var(--surface-2)',
                  borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '1px solid var(--border)', flexShrink: 0,
                }}>
                  {emoji || '🏢'}
                </span>
                <input
                  className="form-input"
                  value={emoji}
                  onChange={e => setEmoji(e.target.value)}
                  maxLength={4}
                  style={{ flex: 1 }}
                />
              </div>
            </Field>
          </Section>

          {/* Financial Structure */}
          <Section title="Financial Structure">
            <div style={rowStyle}>
              <Field label="Total Valuation (₹)" required hint="Full amount in rupees (e.g. 12Cr = 120000000)">
                <input
                  className="form-input" type="number" value={totalVal}
                  onChange={e => handleValuationChange(e.target.value)}
                  placeholder="e.g. 120000000"
                />
                {err('totalValuation') && <div style={{ color: 'var(--red)', fontSize: 12, marginTop: 3 }}>{err('totalValuation')}</div>}
              </Field>
              <Field label="Total Units" required>
                <input
                  className="form-input" type="number" value={totalUnits}
                  onChange={e => handleTotalUnitsChange(e.target.value)}
                  placeholder="e.g. 1000" min="1"
                />
              </Field>
            </div>

            <div style={rowStyle}>
              <Field label="Unit Price (₹)" required hint="Auto-calculated from valuation ÷ units">
                <input
                  className="form-input" type="number" value={unitPrice}
                  onChange={e => setUnitPrice(e.target.value)}
                  placeholder="Auto-calculated"
                />
              </Field>
              <Field
                label="Min. Investment Units" required
                hint={previewUnitPrice > 0 && previewMinUnits > 0
                  ? `Min. investment: ₹${(previewUnitPrice * previewMinUnits).toLocaleString('en-IN')}`
                  : 'Number of units an investor must buy minimum'}
              >
                <input
                  className="form-input" type="number" value={minUnits}
                  onChange={e => setMinUnits(e.target.value)}
                  placeholder="e.g. 10" min="1"
                />
              </Field>
            </div>
          </Section>

          {/* Projected Returns */}
          <Section title="Projected Returns" badge="Displayed with disclaimer">
            <div style={rowStyle}>
              <Field label="Rental Yield (% p.a.)" hint="Annual income from rentals as % of investment">
                <input className="form-input" type="number" step="0.1" value={yieldPct} onChange={e => setYieldPct(e.target.value)} placeholder="e.g. 9.5" />
              </Field>
              <Field label="Capital Growth (% p.a.)" hint="Expected annual property value appreciation">
                <input className="form-input" type="number" step="0.1" value={growthPct} onChange={e => setGrowthPct(e.target.value)} placeholder="e.g. 8.0" />
              </Field>
            </div>

            <div style={rowStyle}>
              <Field label="Holding Period" hint="Expected investment duration before exit">
                <input className="form-input" value={holdingPeriod} onChange={e => setHoldingPeriod(e.target.value)} placeholder="e.g. 5–7 years" />
              </Field>
              <Field label="Lock-in Period" hint="Minimum hold before resale is permitted">
                <input className="form-input" value={lockInPeriod} onChange={e => setLockInPeriod(e.target.value)} placeholder="e.g. 3 years" />
              </Field>
            </div>
          </Section>

          {/* Description */}
          <Section title="Description">
            <Field label="Property Description" required>
              <textarea
                className="form-input"
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={5}
                placeholder="Describe the property, tenant profile, WALE, location highlights…"
                style={{ resize: 'vertical' }}
              />
              {err('description') && <div style={{ color: 'var(--red)', fontSize: 12, marginTop: 3 }}>{err('description')}</div>}
            </Field>
          </Section>
        </div>

        {/* ── RIGHT: live preview + publish ─────────────── */}
        <div style={{ position: 'sticky', top: 80, display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Live preview card */}
          <div className="card" style={{ overflow: 'hidden' }}>
            {/* Cover */}
            <div style={{
              height: 110,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 40,
              background: 'linear-gradient(135deg,#1B3057,#2A4A7A)',
              position: 'relative',
            }}>
              <span>{emoji || '🏢'}</span>
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                padding: '6px 12px',
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
                  { label: 'Unit Price',    value: previewUnitPrice > 0 ? `₹${previewUnitPrice.toLocaleString('en-IN')}` : '—' },
                  { label: 'Min. Invest.',  value: previewUnitPrice > 0 && previewMinUnits > 0 ? fmt(previewUnitPrice * previewMinUnits) : '—' },
                  { label: 'Rental Yield',  value: yieldPct ? `${yieldPct}% p.a.` : '—', color: 'var(--green)' },
                  { label: 'Cap. Growth',   value: growthPct ? `${growthPct}% p.a.` : '—', color: 'var(--navy-mid)' },
                  { label: 'Total Value',   value: previewValuation > 0 ? fmt(previewValuation) : '—', span: 2 },
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

          {/* Publication status */}
          <div className="card">
            <div className="card-header"><span className="card-title">Publication Status</span></div>
            <div className="card-body">
              <div className="form-label">Status</div>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as 'Draft' | 'Open' | 'Fully Subscribed' | 'Closed')}
                style={{
                  width: '100%', padding: '10px 14px', border: '1px solid var(--border-strong)',
                  borderRadius: 8, fontSize: 14, color: 'var(--navy)', background: '#fff',
                }}
              >
                {STATUS_OPTS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <div className="form-hint" style={{ marginTop: 8 }}>
                Properties start as Draft and require legal team sign-off before going Open.
              </div>
            </div>
          </div>

          {/* Save button */}
          <button
            type="submit"
            disabled={isPending}
            style={{
              width: '100%', padding: '13px', borderRadius: 8, fontSize: 14.5, fontWeight: 600,
              background: isPending ? 'var(--navy-mid)' : 'var(--gold)',
              color: 'var(--navy)', border: 'none', cursor: isPending ? 'not-allowed' : 'pointer',
              opacity: isPending ? 0.8 : 1,
            }}
          >
            {isPending ? 'Saving…' : isEdit ? 'Save Changes →' : 'Save Property →'}
          </button>

          {/* Disclaimer */}
          <div style={{
            padding: '10px 12px',
            background: 'var(--amber-bg)',
            border: '1px solid rgba(183,121,31,0.2)',
            borderRadius: 8, fontSize: 11.5, color: 'var(--slate)', lineHeight: 1.6,
          }}>
            ⚠️ Projected yields and financial details must be reviewed by the legal team before setting status to Open.
          </div>
        </div>
      </div>
    </form>
  )
}
