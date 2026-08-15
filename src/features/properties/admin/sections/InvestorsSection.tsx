'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { usePropertyForm } from './PropertyFormContext'
import { allocateUnitsToInvestorAction } from '@/features/investors/actions'
import { fmtRupees } from '@/lib/format'

const selectStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', border: '1px solid var(--border-strong)',
  borderRadius: 8, fontSize: 14, color: 'var(--navy)', background: '#fff',
}
const stepBtn = (disabled: boolean): React.CSSProperties => ({
  width: 38, height: 38, borderRadius: 8, fontSize: 18, fontWeight: 700,
  border: '1px solid var(--border-strong)', background: '#fff', color: 'var(--navy)',
  cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.4 : 1,
})

function AddInvestorLink({ label = '+ Invite investor' }: { label?: string }) {
  return (
    <Link href="/admin/investors/new" style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy-mid)', textDecoration: 'underline' }}>
      {label}
    </Link>
  )
}

export function InvestorsSection() {
  const f = usePropertyForm()
  const router = useRouter()
  const property = f.property

  const [investorId, setInvestorId] = useState('')
  const [units, setUnits] = useState(1)
  const [error, setError] = useState<string | null>(null)
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

        {f.approvedInvestors.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--slate-light)' }}>
            <p style={{ marginTop: 0, marginBottom: 12 }}>No KYC-approved investors are available to allocate.</p>
            <Link
              href="/admin/investors/new"
              style={{
                display: 'inline-block', padding: '10px 18px', borderRadius: 8, fontSize: 13.5, fontWeight: 600,
                background: 'var(--gold)', color: 'var(--navy)', textDecoration: 'none',
              }}
            >
              + Invite Investor
            </Link>
          </div>
        ) : available <= 0 ? (
          <p style={{ fontSize: 13, color: 'var(--slate-light)', margin: 0 }}>All units are allocated — nothing left to assign.</p>
        ) : (
          <>
            <div style={{ marginBottom: 14 }}>
              <div className="form-label" style={{ marginBottom: 6 }}>Investor</div>
              <select value={investorId} onChange={e => setInvestorId(e.target.value)} style={selectStyle}>
                <option value="">Select an investor…</option>
                {f.approvedInvestors.map(inv => (
                  <option key={inv.id} value={inv.id}>{inv.name} · {inv.email}</option>
                ))}
              </select>
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
              <AddInvestorLink />
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
    </div>
  )
}
