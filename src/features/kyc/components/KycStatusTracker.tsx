'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getKycStatusAction } from '../actions'
import type { KycStatus } from '@/types'

const NODES = ['Account Created', 'Submitted', 'Under Review', 'Approved'] as const

function nodeIndex(status: KycStatus): number {
  switch (status) {
    case 'Submitted':    return 1
    case 'Under Review': return 2
    case 'Approved':     return 3
    default:             return 0
  }
}

export function KycStatusTracker({ initialStatus }: { initialStatus: KycStatus }) {
  const [status, setStatus] = useState<KycStatus>(initialStatus)
  const [reason, setReason] = useState<string | null>(null)
  const router = useRouter()

  // Spec S2-09: reflect admin decisions without a manual refresh
  useEffect(() => {
    const timer = setInterval(async () => {
      const result = await getKycStatusAction()
      setStatus(result.kycStatus)
      setReason(result.rejectionReason)
      if (result.kycStatus === 'Rejected') router.refresh() // swaps back to the wizard
    }, 30_000)
    return () => clearInterval(timer)
  }, [router])

  const reached = nodeIndex(status)

  return (
    <div className="max-w-[640px] mx-auto px-6 py-14">
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--navy)', marginBottom: 6 }}>
        KYC Verification
      </h1>
      <p style={{ fontSize: 13.5, color: 'var(--slate-light)', marginBottom: 36 }}>
        Your submission is with our verification team. Most reviews complete within 24–48 hours.
      </p>

      <div className="card" style={{ padding: '28px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start' }}>
          {NODES.map((label, i) => {
            const done = i <= reached
            const isLast = i === NODES.length - 1
            return (
              <div key={label} style={{ flex: isLast ? '0 0 auto' : 1, display: 'flex', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 84 }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 15, fontWeight: 700,
                    background: done ? 'var(--green)' : 'var(--surface-2)',
                    color: done ? '#fff' : 'var(--slate-light)',
                    border: done ? 'none' : '2px solid var(--border-strong)',
                  }}>
                    {done ? '✓' : i + 1}
                  </div>
                  <div style={{
                    fontSize: 11.5, marginTop: 8, textAlign: 'center',
                    color: done ? 'var(--navy)' : 'var(--slate-light)',
                    fontWeight: done ? 600 : 400,
                  }}>
                    {label}
                  </div>
                </div>
                {!isLast && (
                  <div style={{
                    flex: 1, height: 3, marginTop: 16, borderRadius: 2,
                    background: i < reached ? 'var(--green)' : 'var(--border)',
                  }} />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {status === 'Approved' && (
        <div style={{
          marginTop: 20, padding: '16px 20px', borderRadius: 10,
          background: 'var(--green-bg)', border: '1px solid rgba(45,125,90,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ color: 'var(--green)', fontSize: 14, fontWeight: 600 }}>
            ✓ Verification complete — you can now invest.
          </span>
          <Link
            href="/properties"
            style={{
              padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600,
              background: 'var(--gold)', color: 'var(--navy)', textDecoration: 'none',
            }}
          >
            Browse properties →
          </Link>
        </div>
      )}

      {reason && (
        <div style={{
          marginTop: 20, padding: '14px 20px', borderRadius: 10,
          background: 'var(--red-bg, #FDECEC)', border: '1px solid rgba(178,69,60,0.25)',
          color: 'var(--red)', fontSize: 13.5,
        }}>
          <strong>Submission needs attention:</strong> {reason}
        </div>
      )}
    </div>
  )
}
