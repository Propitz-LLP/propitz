'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateValuationAction } from '../actions'
import { fmtRupees } from '@/lib/format'
import type { Property, ValuationHistory } from '@/types'

function pctChange(current: number, previous: number): number | null {
  if (previous <= 0) return null
  return ((current - previous) / previous) * 100
}

function ChangePill({ pct }: { pct: number }) {
  const up = pct >= 0
  return (
    <span
      className={`badge ${up ? 'badge-green' : 'badge-red'}`}
      style={{ fontVariantNumeric: 'tabular-nums' }}
    >
      {up ? '▲' : '▼'} {Math.abs(pct).toFixed(1)}%
    </span>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', border: '1px solid var(--border-strong)',
  borderRadius: 8, fontSize: 14, color: 'var(--navy)', background: '#fff',
}

export function ValuationPanel({
  property,
  history,
}: {
  property: Property
  history: ValuationHistory[]
}) {
  const [newPrice, setNewPrice] = useState('')
  const [quarter, setQuarter] = useState('')
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [done, setDone] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  // Newest-first for display; the DB returns ascending by recordedAt.
  const rows = [...history].reverse()
  const preview = parseFloat(newPrice)
  const previewPct = preview > 0 ? pctChange(preview, property.unitPrice) : null

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setErrors({})
    setDone(false)
    const fd = new FormData()
    fd.set('unitPrice', newPrice)
    fd.set('quarter', quarter)
    startTransition(async () => {
      const res = await updateValuationAction(property.id, fd)
      if (res?.error) {
        setErrors(res.error as Record<string, string[]>)
        return
      }
      setNewPrice('')
      setQuarter('')
      setDone(true)
      router.refresh()
    })
  }

  return (
    <div className="card" style={{ padding: 24 }}>
      <h2 className="font-display text-xl text-navy" style={{ marginBottom: 4 }}>Valuation</h2>
      <p style={{ fontSize: 13, color: 'var(--slate-light)', marginBottom: 20 }}>
        Recording a new valuation updates the current unit price and every holder&apos;s portfolio value.
        Past valuations are kept for history.
      </p>

      <div style={{ display: 'flex', gap: 24, alignItems: 'baseline', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--slate-light)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Current unit price</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--navy)' }}>{fmtRupees(property.unitPrice)}</div>
        </div>
      </div>

      <form onSubmit={submit} style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 8 }}>
        <div style={{ flex: '1 1 180px' }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--navy)', display: 'block', marginBottom: 4 }}>New unit price (₹)</label>
          <input
            style={inputStyle}
            type="number"
            min="1"
            step="0.01"
            value={newPrice}
            onChange={e => setNewPrice(e.target.value)}
            placeholder={property.unitPrice.toString()}
          />
          {errors.unitPrice && <div style={{ color: 'var(--red)', fontSize: 12, marginTop: 3 }}>{errors.unitPrice[0]}</div>}
        </div>
        <div style={{ flex: '1 1 140px' }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--navy)', display: 'block', marginBottom: 4 }}>Period label</label>
          <input
            style={inputStyle}
            value={quarter}
            onChange={e => setQuarter(e.target.value)}
            placeholder="Q2 FY26"
          />
          {errors.quarter && <div style={{ color: 'var(--red)', fontSize: 12, marginTop: 3 }}>{errors.quarter[0]}</div>}
        </div>
        <button
          type="submit"
          disabled={isPending}
          style={{
            padding: '10px 20px', borderRadius: 8, border: 'none', cursor: isPending ? 'default' : 'pointer',
            background: 'var(--navy)', color: '#fff', fontSize: 14, fontWeight: 600, opacity: isPending ? 0.6 : 1,
          }}
        >
          {isPending ? 'Saving…' : 'Record valuation'}
        </button>
        {previewPct !== null && preview !== property.unitPrice && (
          <div style={{ paddingBottom: 8 }}><ChangePill pct={previewPct} /></div>
        )}
      </form>

      {errors._form && <div style={{ color: 'var(--red)', fontSize: 13, marginTop: 6 }}>{errors._form[0]}</div>}
      {done && <div style={{ color: 'var(--green)', fontSize: 13, marginTop: 6 }}>Valuation recorded. Holders have been notified.</div>}

      {/* History */}
      <div style={{ marginTop: 24 }}>
        {rows.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--slate-light)' }}>No valuation history yet.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr><th>Period</th><th className="num">Unit price</th><th className="num">Change</th><th>Recorded</th></tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const prev = rows[i + 1] // next row in newest-first order = older entry
                const chg = prev ? pctChange(r.unitPrice, prev.unitPrice) : null
                return (
                  <tr key={r.id}>
                    <td>{r.quarter}</td>
                    <td className="num">{fmtRupees(r.unitPrice)}</td>
                    <td className="num">{chg === null ? '—' : <ChangePill pct={chg} />}</td>
                    <td style={{ fontSize: 12.5, color: 'var(--slate-light)' }}>
                      {new Date(r.recordedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
