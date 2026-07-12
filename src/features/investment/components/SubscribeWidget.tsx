'use client'

import Link from 'next/link'
import type { Property } from '@/types'

// Full subscription flow (unit selection, fee breakdown, Razorpay) lands in
// Sprint 4. The KYC gate CTA is live now per FR-01.5.
export function SubscribeWidget({ property, kycApproved }: {
  property: Property
  kycApproved: boolean
}) {
  return (
    <div className="card">
      <div className="card-header"><span className="card-title">Invest in {property.name}</span></div>
      <div className="card-body">
        <div style={{ fontSize: 13, color: 'var(--slate-light)', marginBottom: 14 }}>
          Unit price ₹{property.unitPrice.toLocaleString('en-IN')} · min.{' '}
          {property.minInvestmentUnits} units
        </div>
        {kycApproved ? (
          <button
            disabled
            title="Subscription opens in an upcoming release"
            style={{
              width: '100%', padding: '12px', borderRadius: 8, fontSize: 14, fontWeight: 600,
              background: 'var(--gold)', color: 'var(--navy)', border: 'none', cursor: 'not-allowed', opacity: 0.85,
            }}
          >
            Proceed →
          </button>
        ) : (
          <Link
            href="/onboarding/kyc?reason=kyc"
            style={{
              display: 'block', textAlign: 'center', padding: '12px', borderRadius: 8,
              fontSize: 14, fontWeight: 600, background: 'var(--navy)', color: '#fff',
              textDecoration: 'none',
            }}
          >
            Complete KYC to invest →
          </Link>
        )}
      </div>
    </div>
  )
}
