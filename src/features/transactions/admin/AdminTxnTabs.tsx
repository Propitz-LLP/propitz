'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  recordPaymentReceivedAction,
  approveTransactionAction,
  rejectTransactionAction,
} from '../actions'
import type { Transaction, Distribution, PendingFee, TransactionStatus } from '@/types'

const STATUS_BADGE: Record<TransactionStatus, string> = {
  Initiated:           'badge-amber',
  'Payment Confirmed': 'badge-navy',
  'Admin Pending':     'badge-amber',
  Processing:          'badge-navy',
  Completed:           'badge-green',
  Rejected:            'badge-red',
}

const TABS = ['Awaiting Payment', 'Pending Approval', 'All Transactions'] as const

export function AdminTxnTabs({ awaitingPayment, pending, all }: {
  awaitingPayment: Transaction[]
  pending: Transaction[]
  all: Transaction[]
  distributions: Distribution[]
  fees: PendingFee[]
}) {
  const [tab, setTab] = useState<(typeof TABS)[number]>('Awaiting Payment')
  const [working, setWorking] = useState<string | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [, startTransition] = useTransition()
  const router = useRouter()

  const rows = tab === 'Awaiting Payment' ? awaitingPayment : tab === 'Pending Approval' ? pending : all

  function run(id: string, fn: () => Promise<{ error?: string } | { success: boolean }>) {
    setWorking(id)
    setError(null)
    startTransition(async () => {
      const result = await fn()
      setWorking(null)
      if (result && 'error' in result && result.error) { setError(result.error); return }
      setRejectingId(null)
      setRejectReason('')
      router.refresh()
    })
  }

  return (
    <>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {TABS.map(t => {
          const count = t === 'Awaiting Payment' ? awaitingPayment.length : t === 'Pending Approval' ? pending.length : all.length
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                border: tab === t ? 'none' : '1px solid var(--border-strong)',
                background: tab === t ? 'var(--navy)' : '#fff',
                color: tab === t ? '#fff' : 'var(--navy)', cursor: 'pointer',
              }}
            >
              {t} ({count})
            </button>
          )
        })}
      </div>

      {error && (
        <div style={{
          padding: '10px 16px', marginBottom: 14, borderRadius: 8, fontSize: 13,
          background: 'var(--red-bg, #FDECEC)', color: 'var(--red)', fontWeight: 500,
        }}>
          {error}
        </div>
      )}

      <div className="card">
        {rows.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--slate-light)' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>💳</div>
            <div style={{ fontWeight: 600, color: 'var(--navy)', marginBottom: 6 }}>Nothing here</div>
            <div style={{ fontSize: 13 }}>No transactions in this view.</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID / Reference</th><th>Method</th><th>Units</th><th>Amount</th><th>Date</th><th>Status</th>
                  {tab !== 'All Transactions' && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {rows.map(t => (
                  <tr key={t.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--navy)', fontSize: 12.5 }}>{t.id}</div>
                      {t.paymentRef && <div style={{ fontSize: 11, color: 'var(--slate-light)' }}>{t.paymentRef}</div>}
                    </td>
                    <td style={{ textTransform: 'capitalize', fontSize: 12.5 }}>{t.paymentMethod ?? '—'}</td>
                    <td className="num">{t.units ?? '—'}</td>
                    <td className="num">₹{t.net.toLocaleString('en-IN')}</td>
                    <td style={{ fontSize: 12.5 }}>{t.date}</td>
                    <td><span className={`badge ${STATUS_BADGE[t.status]}`}>{t.status}</span></td>
                    {tab !== 'All Transactions' && (
                      <td>
                        {rejectingId === t.id ? (
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <input
                              className="form-input"
                              value={rejectReason}
                              onChange={e => setRejectReason(e.target.value)}
                              placeholder="Reason (sent to investor)"
                              style={{ fontSize: 12, padding: '5px 10px', width: 180 }}
                            />
                            <button
                              onClick={() => run(t.id, () => rejectTransactionAction(t.id, rejectReason))}
                              disabled={working === t.id || rejectReason.trim().length < 5}
                              style={{
                                fontSize: 12, padding: '5px 10px', borderRadius: 6, background: 'var(--red)',
                                color: '#fff', border: 'none', cursor: 'pointer',
                                opacity: rejectReason.trim().length < 5 ? 0.5 : 1,
                              }}
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setRejectingId(null)}
                              style={{
                                fontSize: 12, padding: '5px 10px', borderRadius: 6, background: '#fff',
                                color: 'var(--navy)', border: '1px solid var(--border-strong)', cursor: 'pointer',
                              }}
                            >
                              ×
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: 6 }}>
                            {tab === 'Awaiting Payment' ? (
                              <button
                                onClick={() => run(t.id, () => recordPaymentReceivedAction(t.id))}
                                disabled={working === t.id}
                                style={{
                                  fontSize: 12, padding: '5px 12px', borderRadius: 6, background: 'var(--green)',
                                  color: '#fff', border: 'none', cursor: 'pointer',
                                }}
                              >
                                {working === t.id ? 'Recording…' : '₹ Payment received'}
                              </button>
                            ) : (
                              <button
                                onClick={() => run(t.id, () => approveTransactionAction(t.id))}
                                disabled={working === t.id}
                                style={{
                                  fontSize: 12, padding: '5px 12px', borderRadius: 6, background: 'var(--green)',
                                  color: '#fff', border: 'none', cursor: 'pointer',
                                }}
                              >
                                {working === t.id ? 'Approving…' : '✓ Approve'}
                              </button>
                            )}
                            <button
                              onClick={() => { setRejectingId(t.id); setRejectReason('') }}
                              disabled={working === t.id}
                              style={{
                                fontSize: 12, padding: '5px 12px', borderRadius: 6, background: '#fff',
                                color: 'var(--red)', border: '1px solid rgba(178,69,60,0.35)', cursor: 'pointer',
                              }}
                            >
                              ✗ Reject
                            </button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
