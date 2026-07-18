'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import {
  reserveUnitsAction,
  initiatePaymentAction,
  releaseReservationAction,
} from '../actions'
import type { Property, PaymentMethod } from '@/types'

const MAX_UNITS_PER_ORDER = 50

// Mirrors calcOrderTotal (lib/payments/fees.ts) for live display only — the
// server always recomputes; these values are never trusted for the order.
function previewBreakdown(units: number, unitPrice: number, feeRatePct: number, gstRatePct: number) {
  const subtotal = units * unitPrice
  const fee = Math.round(subtotal * feeRatePct / 100)
  const gst = Math.round(fee * gstRatePct / 100)
  return { subtotal, fee, gst, total: subtotal + fee + gst }
}

type Step =
  | { name: 'pick_units' }
  | { name: 'pick_method'; reservationId: string; expiresAt: string }
  | { name: 'instructions'; reference: string; instructions: string }

interface MethodOption { method: PaymentMethod; label: string; description: string }

export function SubscribeWidget({ property, kycApproved, availableUnits, enabledMethods, feeRatePct, gstRatePct }: {
  property: Property
  kycApproved: boolean
  availableUnits: number
  enabledMethods: MethodOption[]
  feeRatePct: number
  gstRatePct: number
}) {
  const [units, setUnits] = useState(property.minInvestmentUnits)
  const [step, setStep] = useState<Step>({ name: 'pick_units' })
  const [method, setMethod] = useState<PaymentMethod | null>(enabledMethods[0]?.method ?? null)
  const [error, setError] = useState<string | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [isPending, startTransition] = useTransition()
  const reservationRef = useRef<string | null>(null)

  const maxUnits = Math.min(MAX_UNITS_PER_ORDER, availableUnits)
  const breakdown = previewBreakdown(units, property.unitPrice, feeRatePct, gstRatePct)

  // Countdown while a hold is active; on expiry, release and reset
  useEffect(() => {
    if (step.name !== 'pick_method') return
    const tick = () => {
      const left = Math.max(0, Math.floor((new Date(step.expiresAt).getTime() - Date.now()) / 1000))
      setSecondsLeft(left)
      if (left === 0) {
        setStep({ name: 'pick_units' })
        setError('Your hold expired, please try again.')
        if (reservationRef.current) releaseReservationAction(reservationRef.current)
      }
    }
    tick()
    const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
  }, [step])

  function clampUnits(v: number) {
    setUnits(Math.max(property.minInvestmentUnits, Math.min(maxUnits, v)))
  }

  function reserve() {
    setError(null)
    startTransition(async () => {
      const result = await reserveUnitsAction(property.id, units)
      if (result.error) { setError(result.error); return }
      reservationRef.current = result.reservationId!
      setStep({ name: 'pick_method', reservationId: result.reservationId!, expiresAt: result.expiresAt! })
    })
  }

  function confirmPayment(reservationId: string) {
    if (!method) return
    setError(null)
    startTransition(async () => {
      const result = await initiatePaymentAction(reservationId, method)
      if (result.error) { setError(typeof result.error === 'string' ? result.error : 'Something went wrong'); return }
      const init = result.initiation!
      if (init.kind === 'offline_instructions') {
        setStep({ name: 'instructions', reference: init.reference, instructions: init.instructions })
      }
      // 'client_checkout' (Razorpay) is handled here in Sprint 5
    })
  }

  function cancelHold(reservationId: string) {
    startTransition(async () => {
      await releaseReservationAction(reservationId)
      setStep({ name: 'pick_units' })
      setError(null)
    })
  }

  const row = (label: string, value: string, opts?: { bold?: boolean; color?: string }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: opts?.bold ? 14.5 : 13 }}>
      <span style={{ color: opts?.bold ? 'var(--navy)' : 'var(--slate-light)', fontWeight: opts?.bold ? 700 : 400 }}>{label}</span>
      <span style={{ fontWeight: opts?.bold ? 700 : 500, color: opts?.color ?? 'var(--navy)', fontVariantNumeric: 'tabular-nums' }}>{value}</span>
    </div>
  )

  return (
    <div className="card">
      <div className="card-header"><span className="card-title">Invest in {property.name}</span></div>
      <div className="card-body">

        {/* ── Gates ─────────────────────────────────────── */}
        {!kycApproved ? (
          <>
            <div style={{ fontSize: 13, color: 'var(--slate-light)', marginBottom: 14 }}>
              Unit price ₹{property.unitPrice.toLocaleString('en-IN')} · min. {property.minInvestmentUnits} units
            </div>
            <Link
              href="/onboarding/kyc?reason=kyc"
              style={{
                display: 'block', textAlign: 'center', padding: '12px', borderRadius: 8,
                fontSize: 14, fontWeight: 600, background: 'var(--navy)', color: '#fff', textDecoration: 'none',
              }}
            >
              Complete KYC to invest →
            </Link>
          </>
        ) : property.status !== 'Open' || availableUnits <= 0 ? (
          <div style={{ fontSize: 13.5, color: 'var(--slate-light)', textAlign: 'center', padding: '12px 0' }}>
            {property.status !== 'Open'
              ? 'This property is not accepting new investments.'
              : 'All units are currently subscribed or held.'}
          </div>
        ) : step.name === 'pick_units' ? (
          <>
            {/* ── Step 1: unit picker + live breakdown ──── */}
            <div className="form-label" style={{ marginBottom: 6 }}>Number of Units</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <button
                onClick={() => clampUnits(units - 1)}
                disabled={units <= property.minInvestmentUnits}
                aria-label="Decrease units"
                style={{
                  width: 38, height: 38, borderRadius: 8, fontSize: 18, fontWeight: 700,
                  border: '1px solid var(--border-strong)', background: '#fff', color: 'var(--navy)',
                  cursor: units <= property.minInvestmentUnits ? 'not-allowed' : 'pointer',
                  opacity: units <= property.minInvestmentUnits ? 0.4 : 1,
                }}
              >
                −
              </button>
              <input
                className="form-input"
                type="number"
                value={units}
                onChange={e => clampUnits(parseInt(e.target.value) || property.minInvestmentUnits)}
                min={property.minInvestmentUnits}
                max={maxUnits}
                style={{ textAlign: 'center', fontWeight: 700, fontSize: 16 }}
              />
              <button
                onClick={() => clampUnits(units + 1)}
                disabled={units >= maxUnits}
                aria-label="Increase units"
                style={{
                  width: 38, height: 38, borderRadius: 8, fontSize: 18, fontWeight: 700,
                  border: '1px solid var(--border-strong)', background: '#fff', color: 'var(--navy)',
                  cursor: units >= maxUnits ? 'not-allowed' : 'pointer',
                  opacity: units >= maxUnits ? 0.4 : 1,
                }}
              >
                +
              </button>
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--slate-light)', marginBottom: 14 }}>
              Min {property.minInvestmentUnits} · max {maxUnits} per order · {availableUnits.toLocaleString('en-IN')} available
            </div>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10, marginBottom: 14 }}>
              {row(`${units} units × ₹${property.unitPrice.toLocaleString('en-IN')}`, `₹${breakdown.subtotal.toLocaleString('en-IN')}`)}
              {row('Platform fee', `₹${breakdown.fee.toLocaleString('en-IN')}`)}
              {row('GST on fee (18%)', `₹${breakdown.gst.toLocaleString('en-IN')}`)}
              <div style={{ borderTop: '1px solid var(--border)', marginTop: 4, paddingTop: 4 }}>
                {row('Total payable', `₹${breakdown.total.toLocaleString('en-IN')}`, { bold: true })}
              </div>
            </div>

            {error && <div style={{ color: 'var(--red)', fontSize: 12.5, marginBottom: 10 }}>{error}</div>}

            <button
              onClick={reserve}
              disabled={isPending}
              style={{
                width: '100%', padding: '12px', borderRadius: 8, fontSize: 14, fontWeight: 700,
                background: isPending ? 'var(--navy-mid)' : 'var(--gold)', color: 'var(--navy)',
                border: 'none', cursor: isPending ? 'not-allowed' : 'pointer',
              }}
            >
              {isPending ? 'Reserving…' : 'Proceed →'}
            </button>
          </>
        ) : step.name === 'pick_method' ? (
          <>
            {/* ── Step 2: payment method selection ──────── */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '8px 12px', borderRadius: 8, marginBottom: 14,
              background: 'var(--green-bg, rgba(45,125,90,0.08))', border: '1px solid rgba(45,125,90,0.2)',
            }}>
              <span style={{ fontSize: 12.5, color: 'var(--green)', fontWeight: 600 }}>
                ✓ {units} units held for you
              </span>
              <span style={{ fontSize: 13, fontWeight: 700, color: secondsLeft < 120 ? 'var(--red)' : 'var(--navy)', fontVariantNumeric: 'tabular-nums' }}>
                {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, '0')}
              </span>
            </div>

            <div className="form-label" style={{ marginBottom: 8 }}>Payment Method</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
              {enabledMethods.map(m => (
                <label
                  key={m.method}
                  style={{
                    display: 'flex', gap: 10, alignItems: 'flex-start', padding: '12px 14px',
                    borderRadius: 10, cursor: 'pointer',
                    border: `1.5px solid ${method === m.method ? 'var(--gold)' : 'var(--border-strong)'}`,
                    background: method === m.method ? 'var(--gold-bg, rgba(201,162,39,0.06))' : '#fff',
                  }}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={method === m.method}
                    onChange={() => setMethod(m.method)}
                    style={{ marginTop: 3 }}
                  />
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--navy)' }}>{m.label}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--slate-light)', marginTop: 2 }}>{m.description}</div>
                  </div>
                </label>
              ))}
            </div>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8, marginBottom: 14 }}>
              {row('Total payable', `₹${breakdown.total.toLocaleString('en-IN')}`, { bold: true })}
            </div>

            {error && <div style={{ color: 'var(--red)', fontSize: 12.5, marginBottom: 10 }}>{error}</div>}

            <button
              onClick={() => confirmPayment(step.reservationId)}
              disabled={isPending || !method}
              style={{
                width: '100%', padding: '12px', borderRadius: 8, fontSize: 14, fontWeight: 700,
                background: isPending ? 'var(--navy-mid)' : 'var(--gold)', color: 'var(--navy)',
                border: 'none', cursor: isPending ? 'not-allowed' : 'pointer', marginBottom: 8,
              }}
            >
              {isPending ? 'Confirming…' : 'Confirm →'}
            </button>
            <button
              onClick={() => cancelHold(step.reservationId)}
              disabled={isPending}
              style={{
                width: '100%', padding: '9px', borderRadius: 8, fontSize: 12.5,
                border: '1px solid var(--border-strong)', background: '#fff', color: 'var(--slate)',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            {/* ── Step 3: offline payment instructions ──── */}
            <div style={{ textAlign: 'center', marginBottom: 14 }}>
              <div style={{ fontSize: 34, marginBottom: 6 }}>🧾</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--navy)', marginBottom: 2 }}>
                Reservation confirmed
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--slate-light)' }}>Reference</div>
              <div style={{
                fontSize: 15, fontWeight: 700, color: 'var(--navy)', letterSpacing: '0.04em',
                fontVariantNumeric: 'tabular-nums', marginTop: 2,
              }}>
                {step.reference}
              </div>
            </div>
            <div style={{
              padding: '12px 14px', borderRadius: 10, fontSize: 12.5, lineHeight: 1.6,
              background: 'var(--surface-2, #F4F5F7)', color: 'var(--slate)', marginBottom: 14,
            }}>
              {step.instructions}
            </div>
            <Link
              href="/transactions"
              style={{
                display: 'block', textAlign: 'center', padding: '11px', borderRadius: 8,
                fontSize: 13.5, fontWeight: 600, background: 'var(--navy)', color: '#fff', textDecoration: 'none',
              }}
            >
              View in Transactions →
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
