'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { usePropertyForm } from './PropertyFormContext'
import { allocateUnitsToInvestorAction, removeAllocationAction } from '@/features/investors/actions'
import { AddInvestorDialog } from '@/features/investors/components/AddInvestorDialog'
import { fmtRupees } from '@/lib/format'
import { selectStyle } from './shared'

const stepBtn = (disabled: boolean): React.CSSProperties => ({
  width: 38, height: 38, borderRadius: 8, fontSize: 18, fontWeight: 700,
  border: '1px solid var(--border-strong)', background: '#fff', color: 'var(--navy)',
  cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.4 : 1,
})

export function InvestorsSection() {
  const f = usePropertyForm()
  const router = useRouter()
  const property = f.property

  const [investorId, setInvestorId] = useState('')
  const [units, setUnits] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null)
  const [removing, setRemoving] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Only exists once the property is saved — allocations need a property id.
  if (!f.isEdit || !property) {
    return (
      <p style={{ fontSize: 13, color: 'var(--slate-light)', margin: 0 }}>
        Save the property first, then assign investors here.
      </p>
    )
  }

  const available = property.totalUnits - property.subscribedUnits
  const clamp = (v: number) => setUnits(Math.max(1, Math.min(available, v || 1)))

  const subtotal = units * property.unitPrice
  const fee = Math.round(subtotal * f.feeRatePct / 100)
  const gst = Math.round(fee * f.gstRatePct / 100)
  const total = subtotal + fee + gst

  function assign() {
    setError(null)
    if (!investorId) { setError('Select an investor'); return }
    const fd = new FormData()
    fd.set('investorId', investorId)
    fd.set('units', String(units))
    startTransition(async () => {
      const res = await allocateUnitsToInvestorAction(property!.id, fd)
      if (res?.error) {
        const e = res.error as Record<string, string[]>
        setError(e.investorId?.[0] ?? e.units?.[0] ?? e._form?.[0] ?? 'Could not allocate units')
        return
      }
      setInvestorId('')
      setUnits(1)
      router.refresh()
    })
  }

  function remove(ownerId: string) {
    setError(null)
    setRemoving(ownerId)
    startTransition(async () => {
      const res = await removeAllocationAction(property!.id, ownerId)
      setRemoving(null)
      setConfirmRemove(null)
      if (res?.error) {
        setError(typeof res.error === 'string' ? res.error : 'Could not remove allocation')
        return
      }
      router.refresh()
    })
  }

  const row = (label: string, value: string, bold?: boolean) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: bold ? 14.5 : 13 }}>
      <span style={{ color: bold ? 'var(--navy)' : 'var(--slate-light)', fontWeight: bold ? 700 : 400 }}>{label}</span>
      <span style={{ fontWeight: bold ? 700 : 500, color: 'var(--navy)', fontVariantNumeric: 'tabular-nums' }}>{value}</span>
    </div>
  )

  return (
    <div>
      {/* ── current allocations ─────────────────────────── */}
      {f.ownerships.length > 0 && (
        <table className="data-table" style={{ marginBottom: 18 }}>
          <thead>
            <tr>
              <th>Investor</th>
              <th className="num">Units</th>
              <th className="num">Acquired price</th>
              <th className="num">Value</th>
              <th className="num"></th>
            </tr>
          </thead>
          <tbody>
            {f.ownerships.map(o => (
              <tr key={o.id}>
                <td style={{ fontWeight: 600, color: 'var(--navy)' }}>
                  {o.investors?.name ?? 'Investor'}
                  {o.investors?.email && (
                    <span style={{ display: 'block', fontSize: 11.5, color: 'var(--slate-light)', fontWeight: 400 }}>{o.investors.email}</span>
                  )}
                </td>
                <td className="num">{o.units.toLocaleString('en-IN')}</td>
                <td className="num">₹{o.acquiredPrice.toLocaleString('en-IN')}</td>
                <td className="num">{fmtRupees(o.units * property.unitPrice)}</td>
                <td className="num">
                  {confirmRemove === o.investorId ? (
                    <span style={{ display: 'inline-flex', gap: 6, justifyContent: 'flex-end' }}>
                      <button
                        type="button" onClick={() => remove(o.investorId)} disabled={removing === o.investorId}
                        style={{ fontSize: 12, padding: '4px 10px', borderRadius: 6, background: 'var(--red)', color: '#fff', border: 'none', cursor: 'pointer', opacity: removing === o.investorId ? 0.7 : 1 }}
                      >
                        {removing === o.investorId ? 'Removing…' : 'Confirm'}
                      </button>
                      <button
                        type="button" onClick={() => setConfirmRemove(null)} disabled={removing === o.investorId}
                        style={{ fontSize: 12, padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border-strong)', color: 'var(--navy)', background: '#fff', cursor: 'pointer' }}
                      >
                        Cancel
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button" onClick={() => { setConfirmRemove(o.investorId); setError(null) }}
                      style={{ fontSize: 12, padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(190,60,60,0.35)', color: 'var(--red)', background: '#fff', cursor: 'pointer' }}
                    >
                      Remove
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* ── allocate form ───────────────────────────────── */}
      <div style={{ borderTop: f.ownerships.length > 0 ? '1px solid var(--border)' : 'none', paddingTop: f.ownerships.length > 0 ? 18 : 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>
          Assign investor
        </div>

        {f.investors.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--slate-light)' }}>
            <p style={{ marginTop: 0, marginBottom: 12 }}>No investors yet.</p>
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              style={{
                display: 'inline-block', padding: '10px 18px', borderRadius: 8, fontSize: 13.5, fontWeight: 600,
                background: 'var(--gold)', color: 'var(--navy)', border: 'none', cursor: 'pointer',
              }}
            >
              + Add Investor
            </button>
          </div>
        ) : available <= 0 ? (
          <p style={{ fontSize: 13, color: 'var(--slate-light)', margin: 0 }}>All units are allocated — nothing left to assign.</p>
        ) : (
          <>
            <div style={{ marginBottom: 14 }}>
              <div className="form-label" style={{ marginBottom: 6 }}>Investor</div>
              <select value={investorId} onChange={e => setInvestorId(e.target.value)} style={selectStyle}>
                <option value="">Select an investor…</option>
                {f.investors.map(inv => {
                  const approved = inv.kycStatus === 'Approved'
                  return (
                    <option key={inv.id} value={inv.id} disabled={!approved}>
                      {inv.name} · {inv.email}{approved ? '' : ` · KYC ${inv.kycStatus}`}
                    </option>
                  )
                })}
              </select>
              <div style={{ fontSize: 11.5, color: 'var(--slate-light)', marginTop: 4 }}>
                Only KYC-approved investors can be allocated units.
              </div>
            </div>

            <div className="form-label" style={{ marginBottom: 6 }}>Number of Units</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <button type="button" onClick={() => clamp(units - 1)} disabled={units <= 1} aria-label="Decrease units" style={stepBtn(units <= 1)}>−</button>
              <input
                className="form-input" type="number" value={units}
                onChange={e => clamp(parseInt(e.target.value) || 1)}
                min={1} max={available}
                style={{ textAlign: 'center', fontWeight: 700, fontSize: 16 }}
              />
              <button type="button" onClick={() => clamp(units + 1)} disabled={units >= available} aria-label="Increase units" style={stepBtn(units >= available)}>+</button>
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--slate-light)', marginBottom: 14 }}>
              {available.toLocaleString('en-IN')} units available · ₹{property.unitPrice.toLocaleString('en-IN')} per unit
            </div>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10, marginBottom: 14 }}>
              {row(`${units} units × ₹${property.unitPrice.toLocaleString('en-IN')}`, `₹${subtotal.toLocaleString('en-IN')}`)}
              {row('Platform fee', `₹${fee.toLocaleString('en-IN')}`)}
              {row(`GST on fee (${f.gstRatePct}%)`, `₹${gst.toLocaleString('en-IN')}`)}
              <div style={{ borderTop: '1px solid var(--border)', marginTop: 4, paddingTop: 4 }}>
                {row('Total consideration', `₹${total.toLocaleString('en-IN')}`, true)}
              </div>
            </div>

            {error && <div style={{ color: 'var(--red)', fontSize: 12.5, marginBottom: 10 }}>{error}</div>}

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <button
                type="button"
                onClick={() => setAddOpen(true)}
                style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy-mid)', background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}
              >
                + Add investor
              </button>
              <button
                type="button"
                onClick={assign}
                disabled={isPending}
                style={{
                  padding: '11px 22px', borderRadius: 8, fontSize: 14, fontWeight: 700,
                  background: isPending ? 'var(--navy-mid)' : 'var(--gold)', color: 'var(--navy)',
                  border: 'none', cursor: isPending ? 'not-allowed' : 'pointer',
                }}
              >
                {isPending ? 'Assigning…' : 'Assign units →'}
              </button>
            </div>
          </>
        )}
      </div>

      <AddInvestorDialog open={addOpen} onClose={() => setAddOpen(false)} onCreated={() => router.refresh()} />
    </div>
  )
}
