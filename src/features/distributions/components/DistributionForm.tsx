'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { previewDistributionAction, confirmDistributionAction } from '../actions'
import { fmtRupees } from '@/lib/format'
import { Section, Field, rowStyle } from '@/components/ui/FormFields'
import type { Property } from '@/types'

const selectStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', border: '1px solid var(--border-strong)',
  borderRadius: 8, fontSize: 14, color: 'var(--navy)', background: '#fff',
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null
  return <div style={{ color: 'var(--red)', fontSize: 12, marginTop: 3 }}>{msg}</div>
}

type PreviewHolder = {
  investorId: string
  investorName: string
  units: number
  gross: number
  fee: number
  net: number
}

type Preview = {
  propertyName: string
  holders: PreviewHolder[]
  totalUnits: number
  grossTotal: number
  feeTotal: number
  netTotal: number
}

export function DistributionForm({
  properties,
  defaultFeePct,
}: {
  properties: Property[]
  defaultFeePct: number
}) {
  const [propertyId, setPropertyId] = useState('')
  const [perUnit,    setPerUnit]    = useState('')
  const [feePct,     setFeePct]     = useState(defaultFeePct.toString())
  const [period,     setPeriod]     = useState('')
  const [date,       setDate]       = useState(new Date().toISOString().slice(0, 10))
  const [notes,      setNotes]      = useState('')

  const [preview,    setPreview]    = useState<Preview | null>(null)
  const [errors,     setErrors]     = useState<Record<string, string[]>>({})
  const [formError,  setFormError]  = useState<string | null>(null)
  const [isPreviewing, startPreview] = useTransition()
  const [isConfirming, startConfirm] = useTransition()
  const router = useRouter()

  const err = (field: string) => errors[field]?.[0]

  // Any field change invalidates a stale preview — the admin must re-preview
  // before confirming, so the numbers they approve always match what's saved.
  function invalidatePreview() {
    if (preview) setPreview(null)
  }

  function handlePreview() {
    setErrors({}); setFormError(null)
    const localErrors: Record<string, string[]> = {}
    if (!propertyId) localErrors.propertyId = ['Select a property']
    if (!(parseFloat(perUnit) > 0)) localErrors.perUnit = ['Per-unit amount must be greater than 0']
    if (Object.keys(localErrors).length) { setErrors(localErrors); return }

    startPreview(async () => {
      const result = await previewDistributionAction(propertyId, parseFloat(perUnit), parseFloat(feePct) || 0)
      if ('error' in result) { setFormError(result.error as string); return }
      setPreview(result.preview)
    })
  }

  function handleConfirm() {
    setErrors({}); setFormError(null)
    startConfirm(async () => {
      const result = await confirmDistributionAction({ propertyId, perUnit, feePct, period, date, notes: notes || undefined })
      if ('error' in result) {
        if (typeof result.error === 'string') setFormError(result.error)
        else setErrors(result.error as Record<string, string[]>)
        window.scrollTo({ top: 0, behavior: 'smooth' })
        return
      }
      router.push(`/admin/distributions?created=${encodeURIComponent(preview?.propertyName ?? 'Distribution')}`)
    })
  }

  return (
    <div>
      {formError && (
        <div style={{
          padding: '11px 14px', background: 'var(--red-bg, #FDECEC)',
          border: '1px solid rgba(200,50,50,0.25)', borderRadius: 8,
          fontSize: 13, color: 'var(--red)', marginBottom: 18,
        }}>
          {formError}
        </div>
      )}

      <Section title="Distribution Details">
        <Field label="Property" required hint="Only Open or Fully Subscribed properties can distribute.">
          <select
            value={propertyId}
            onChange={e => { setPropertyId(e.target.value); invalidatePreview() }}
            style={selectStyle}
          >
            <option value="">Select property…</option>
            {properties.map(p => (
              <option key={p.id} value={p.id}>{p.name} — {p.status}</option>
            ))}
          </select>
          <FieldError msg={err('propertyId')} />
        </Field>

        <div style={rowStyle}>
          <Field label="Amount per Unit (₹)" required hint="Rental income paid per unit held.">
            <input
              className="form-input" type="number" min="0" step="any" value={perUnit}
              onChange={e => { setPerUnit(e.target.value); invalidatePreview() }}
              placeholder="e.g. 250"
            />
            <FieldError msg={err('perUnit')} />
          </Field>
          <Field label="Distribution Fee (%)" required hint="Platform fee deducted from each payout.">
            <input
              className="form-input" type="number" min="0" max="20" step="0.1" value={feePct}
              onChange={e => { setFeePct(e.target.value); invalidatePreview() }}
              placeholder="e.g. 1.0"
            />
            <FieldError msg={err('feePct')} />
          </Field>
        </div>

        <div style={rowStyle}>
          <Field label="Period" required hint="Label for this payout, e.g. Q2 FY25-26.">
            <input
              className="form-input" value={period}
              onChange={e => setPeriod(e.target.value)}
              placeholder="e.g. Q2 FY25-26" maxLength={40}
            />
            <FieldError msg={err('period')} />
          </Field>
          <Field label="Payout Date" required>
            <input
              className="form-input" type="date" value={date}
              onChange={e => setDate(e.target.value)}
            />
            <FieldError msg={err('date')} />
          </Field>
        </div>

        <Field label="Notes" hint="Optional. Appears on each investor's transaction record.">
          <textarea
            className="form-input" value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2} style={{ resize: 'vertical' }}
            placeholder="e.g. April–June rental income, net of maintenance."
          />
          <FieldError msg={err('notes')} />
        </Field>

        <button
          type="button"
          onClick={handlePreview}
          disabled={isPreviewing}
          style={{
            padding: '10px 18px', borderRadius: 8, fontSize: 13.5, fontWeight: 600,
            background: '#fff', color: 'var(--navy)', border: '1px solid var(--border-strong)',
            cursor: isPreviewing ? 'not-allowed' : 'pointer',
          }}
        >
          {isPreviewing ? 'Calculating…' : 'Preview payout →'}
        </button>
      </Section>

      {preview && (
        <Section title={`Payout Preview — ${preview.propertyName}`} badge={`${preview.holders.length} investors`}>
          {preview.holders.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--slate-light)' }}>
              No investors hold units in this property — nothing to distribute.
            </p>
          ) : (
            <>
              <table className="data-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>Investor</th>
                    <th style={{ textAlign: 'right' }}>Units</th>
                    <th style={{ textAlign: 'right' }}>Gross</th>
                    <th style={{ textAlign: 'right' }}>Fee</th>
                    <th style={{ textAlign: 'right' }}>Net Payout</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.holders.map(h => (
                    <tr key={h.investorId}>
                      <td>{h.investorName}</td>
                      <td style={{ textAlign: 'right' }}>{h.units.toLocaleString('en-IN')}</td>
                      <td style={{ textAlign: 'right' }}>{fmtRupees(h.gross)}</td>
                      <td style={{ textAlign: 'right', color: 'var(--red)' }}>−{fmtRupees(h.fee)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--green)' }}>{fmtRupees(h.net)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: '2px solid var(--border-strong)', fontWeight: 700 }}>
                    <td>Total</td>
                    <td style={{ textAlign: 'right' }}>{preview.totalUnits.toLocaleString('en-IN')}</td>
                    <td style={{ textAlign: 'right' }}>{fmtRupees(preview.grossTotal)}</td>
                    <td style={{ textAlign: 'right', color: 'var(--red)' }}>−{fmtRupees(preview.feeTotal)}</td>
                    <td style={{ textAlign: 'right', color: 'var(--green)' }}>{fmtRupees(preview.netTotal)}</td>
                  </tr>
                </tfoot>
              </table>

              <div style={{
                marginTop: 16, padding: '10px 12px', background: 'var(--amber-bg)',
                border: '1px solid rgba(183,121,31,0.2)', borderRadius: 8,
                fontSize: 11.5, color: 'var(--slate)', lineHeight: 1.6,
              }}>
                ⚠️ Confirming records a completed Distribution transaction for each investor and emails them.
                This cannot be undone, and a property can only be distributed once per period.
              </div>

              <button
                type="button"
                onClick={handleConfirm}
                disabled={isConfirming}
                style={{
                  marginTop: 14, width: '100%', padding: '13px', borderRadius: 8, fontSize: 14.5,
                  fontWeight: 600, background: isConfirming ? 'var(--navy-mid)' : 'var(--gold)',
                  color: 'var(--navy)', border: 'none', cursor: isConfirming ? 'not-allowed' : 'pointer',
                  opacity: isConfirming ? 0.8 : 1,
                }}
              >
                {isConfirming ? 'Processing…' : `Confirm distribution — pay ${fmtRupees(preview.netTotal)} →`}
              </button>
            </>
          )}
        </Section>
      )}
    </div>
  )
}
