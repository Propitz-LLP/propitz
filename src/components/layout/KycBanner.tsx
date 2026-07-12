import Link from 'next/link'
import type { KycStatus } from '@/types'

// Shown on every investor page until KYC is approved
export function KycBanner({ status }: { status: KycStatus }) {
  if (status === 'Approved') return null

  const pending = status === 'Submitted' || status === 'Under Review'

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14,
      padding: '9px 20px', fontSize: 13, fontWeight: 500,
      background: pending ? 'var(--navy, #1B3057)' : 'var(--amber-bg, #FBF3E4)',
      color: pending ? '#fff' : 'var(--amber, #B7791F)',
      borderBottom: pending ? 'none' : '1px solid rgba(183,121,31,0.2)',
    }}>
      {pending ? (
        <>
          <span>⏳ Your KYC is under review — we&apos;ll notify you once it&apos;s verified.</span>
          <Link href="/onboarding/kyc" style={{ color: '#fff', textDecoration: 'underline', fontWeight: 600 }}>
            Track status
          </Link>
        </>
      ) : (
        <>
          <span>
            {status === 'Rejected'
              ? '⚠️ Your KYC submission needs attention.'
              : '⚠️ Complete KYC verification to start investing.'}
          </span>
          <Link
            href="/onboarding/kyc"
            style={{
              padding: '4px 14px', borderRadius: 6, fontWeight: 600, textDecoration: 'none',
              background: 'var(--amber, #B7791F)', color: '#fff', fontSize: 12.5,
            }}
          >
            {status === 'Rejected' ? 'Fix & resubmit →' : 'Complete KYC →'}
          </Link>
        </>
      )}
    </div>
  )
}
