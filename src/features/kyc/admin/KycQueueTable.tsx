'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  approveKycAction,
  rejectKycAction,
  markKycUnderReviewAction,
  getKycDocumentUrlAction,
} from '../actions'
import { KYC_DOC_LABELS } from '../schemas'
import type { KycSubmission, KycStatus } from '@/types'

const STATUS_BADGE: Partial<Record<KycStatus, string>> = {
  Submitted:      'badge-amber',
  'Under Review': 'badge-navy',
  Rejected:       'badge-red',
}

export function KycQueueTable({ submissions }: { submissions: KycSubmission[] }) {
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<KycSubmission | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [rejecting, setRejecting] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const filtered = submissions.filter(s => {
    const inv = s.investors
    const matchesStatus = !statusFilter || inv?.kycStatus === statusFilter
    const q = search.toLowerCase()
    const matchesSearch = !q
      || inv?.name?.toLowerCase().includes(q)
      || inv?.email?.toLowerCase().includes(q)
      || s.pan?.toLowerCase().includes(q)
    return matchesStatus && matchesSearch
  })

  function open(s: KycSubmission) {
    setSelected(s)
    setRejecting(false)
    setRejectReason('')
    setActionError(null)
    // Opening a Submitted row moves it to Under Review (spec S3 flow)
    if (s.investors?.kycStatus === 'Submitted') {
      startTransition(async () => {
        await markKycUnderReviewAction(s.investorId)
        router.refresh()
      })
    }
  }

  function viewDocument(storagePath: string) {
    startTransition(async () => {
      const { url } = await getKycDocumentUrlAction(storagePath)
      window.open(url, '_blank', 'noopener')
    })
  }

  function approve() {
    if (!selected) return
    setActionError(null)
    startTransition(async () => {
      await approveKycAction(selected.investorId, selected.id)
      setSelected(null)
      router.refresh()
    })
  }

  function reject() {
    if (!selected) return
    setActionError(null)
    startTransition(async () => {
      const result = await rejectKycAction(selected.investorId, selected.id, rejectReason)
      if (result?.error) { setActionError(result.error); return }
      setSelected(null)
      router.refresh()
    })
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 380px' : '1fr', gap: 20, alignItems: 'start' }}>
      <div>
        {/* Filter bar */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <input
            className="form-input"
            placeholder="Search name, email or PAN…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ maxWidth: 280, padding: '8px 14px', fontSize: 13 }}
          />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            style={{
              padding: '8px 14px', fontSize: 13, borderRadius: 8,
              border: '1px solid var(--border-strong)', background: '#fff',
              color: 'var(--navy)', cursor: 'pointer',
            }}
          >
            <option value="">All statuses</option>
            <option value="Submitted">Submitted</option>
            <option value="Under Review">Under Review</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>

        <div className="card">
          {filtered.length === 0 ? (
            <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--slate-light)' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🗂️</div>
              <div style={{ fontWeight: 600, color: 'var(--navy)', marginBottom: 6 }}>No submissions</div>
              <div style={{ fontSize: 13 }}>
                {submissions.length === 0 ? 'The review queue is empty.' : 'Try adjusting the filters.'}
              </div>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr><th>Investor</th><th>PAN</th><th>Submitted</th><th>Status</th></tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <tr
                    key={s.id}
                    onClick={() => open(s)}
                    style={{ cursor: 'pointer', background: selected?.id === s.id ? 'var(--surface-2)' : undefined }}
                  >
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--navy)' }}>{s.investors?.name ?? '—'}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--slate-light)' }}>{s.investors?.email}</div>
                    </td>
                    <td className="num">{s.pan || '—'}</td>
                    <td style={{ fontSize: 12.5 }}>
                      {s.submittedAt ? new Date(s.submittedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    <td>
                      <span className={`badge ${STATUS_BADGE[s.investors?.kycStatus ?? 'Submitted'] ?? 'badge-amber'}`}>
                        {s.investors?.kycStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Detail pane */}
      {selected && (
        <div className="card" style={{ position: 'sticky', top: 20 }}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="card-title">{selected.investors?.name}</span>
            <button
              onClick={() => setSelected(null)}
              aria-label="Close"
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--slate-light)' }}
            >
              ×
            </button>
          </div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 14px', fontSize: 12.5, marginBottom: 16 }}>
              {[
                ['Legal Name', selected.fullLegalName],
                ['PAN', selected.pan],
                ['DOB', selected.dob],
                ['Aadhaar', selected.aadhaarMasked],
                ['Gender', selected.gender],
                ['Account', selected.bankAccount],
                ['IFSC', selected.ifsc],
                ['Bank', selected.bankName],
                ['Acct. Type', selected.accountType],
                ['Holder', selected.accountHolderName],
              ].map(([label, value]) => (
                <div key={label} style={{ padding: '5px 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--slate-light)' }}>{label}</div>
                  <div style={{ color: 'var(--navy)', fontWeight: 500 }}>{value || '—'}</div>
                </div>
              ))}
              <div style={{ gridColumn: 'span 2', padding: '5px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--slate-light)' }}>Address</div>
                <div style={{ color: 'var(--navy)', fontWeight: 500 }}>{selected.address || '—'}</div>
              </div>
            </div>

            <div className="form-label" style={{ marginBottom: 6 }}>Documents</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
              {(selected.documents ?? []).map(d => (
                <button
                  key={d.id}
                  onClick={() => viewDocument(d.storagePath)}
                  disabled={isPending}
                  title="Opens via a 15-minute signed link"
                  style={{
                    fontSize: 12, padding: '6px 12px', borderRadius: 999,
                    border: '1px solid var(--border-strong)', background: '#fff',
                    color: 'var(--navy)', cursor: 'pointer',
                  }}
                >
                  📄 {KYC_DOC_LABELS[d.type] ?? d.type} ↗
                </button>
              ))}
              {(selected.documents ?? []).length === 0 && (
                <span style={{ fontSize: 12.5, color: 'var(--slate-light)' }}>No documents uploaded</span>
              )}
            </div>

            {actionError && (
              <div style={{ color: 'var(--red)', fontSize: 12.5, marginBottom: 12 }}>{actionError}</div>
            )}

            {rejecting ? (
              <>
                <textarea
                  className="form-input"
                  rows={3}
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  placeholder="Reason for rejection (min 10 characters) — shown to the investor"
                  style={{ resize: 'vertical', marginBottom: 10 }}
                />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={reject}
                    disabled={isPending || rejectReason.trim().length < 10}
                    style={{
                      flex: 1, padding: '10px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                      background: 'var(--red)', color: '#fff', border: 'none',
                      cursor: isPending || rejectReason.trim().length < 10 ? 'not-allowed' : 'pointer',
                      opacity: rejectReason.trim().length < 10 ? 0.6 : 1,
                    }}
                  >
                    {isPending ? 'Rejecting…' : 'Confirm Rejection'}
                  </button>
                  <button
                    onClick={() => setRejecting(false)}
                    disabled={isPending}
                    style={{
                      padding: '10px 16px', borderRadius: 8, fontSize: 13,
                      border: '1px solid var(--border-strong)', background: '#fff',
                      color: 'var(--navy)', cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={approve}
                  disabled={isPending}
                  style={{
                    flex: 1, padding: '10px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                    background: 'var(--green)', color: '#fff', border: 'none',
                    cursor: isPending ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isPending ? 'Working…' : '✓ Approve'}
                </button>
                <button
                  onClick={() => setRejecting(true)}
                  disabled={isPending}
                  style={{
                    flex: 1, padding: '10px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                    background: '#fff', color: 'var(--red)', border: '1px solid rgba(178,69,60,0.35)',
                    cursor: 'pointer',
                  }}
                >
                  ✗ Reject
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
