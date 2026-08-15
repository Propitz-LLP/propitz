import Link from 'next/link'
import { requireAdmin } from '@/lib/auth'
import { InviteInvestorPanel } from '@/features/investors/components/InviteInvestorPanel'

export default async function InviteInvestorPage() {
  await requireAdmin()
  return (
    <div className="max-w-[1100px] mx-auto px-8 py-8">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 30, color: 'var(--navy)', marginBottom: 4 }}>
            Invite Investor
          </h1>
          <p style={{ fontSize: 13, color: 'var(--slate-light)' }}>
            Send a signup link — the investor creates their own account and completes KYC
          </p>
        </div>
        <Link
          href="/admin/investors"
          style={{
            padding: '8px 16px', borderRadius: 8, fontSize: 13, border: '1px solid var(--border-strong)',
            color: 'var(--navy)', textDecoration: 'none', background: '#fff',
          }}
        >
          ← Back to Investors
        </Link>
      </div>
      <div className="card">
        <div className="card-header"><span className="card-title">Invite by email</span></div>
        <div className="card-body">
          <InviteInvestorPanel />
        </div>
      </div>
    </div>
  )
}
