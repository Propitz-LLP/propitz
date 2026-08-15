import Link from 'next/link'
import { Suspense } from 'react'
import { requireAdmin } from '@/lib/auth'
import { listAllInvestors } from '@/lib/db/investors'
import { SuccessBanner } from '@/components/ui/SuccessBanner'
import type { KycStatus } from '@/types'

const KYC_BADGE: Record<KycStatus, string> = {
  'Not Started':  'badge-amber',
  'Submitted':    'badge-amber',
  'Under Review': 'badge-amber',
  'Approved':     'badge-green',
  'Rejected':     'badge-red',
}

export default async function AdminInvestorsPage() {
  await requireAdmin()
  const investors = await listAllInvestors()

  return (
    <div className="max-w-[1100px] mx-auto px-8 py-8">
      <Suspense>
        <SuccessBanner />
      </Suspense>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 30, color: 'var(--navy)', marginBottom: 4 }}>
            Investors
          </h1>
          <p style={{ fontSize: 13, color: 'var(--slate-light)' }}>{investors.length} total</p>
        </div>
        <Link
          href="/admin/investors/new"
          style={{
            padding: '10px 20px', borderRadius: 8, fontSize: 13.5, fontWeight: 600,
            background: 'var(--gold)', color: 'var(--navy)', textDecoration: 'none',
          }}
        >
          + Invite Investor
        </Link>
      </div>

      {investors.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
          <p style={{ fontSize: 14, color: 'var(--slate-light)', marginBottom: 16 }}>No investors yet.</p>
          <Link
            href="/admin/investors/new"
            style={{
              display: 'inline-block', padding: '10px 20px', borderRadius: 8, fontSize: 13.5, fontWeight: 600,
              background: 'var(--gold)', color: 'var(--navy)', textDecoration: 'none',
            }}
          >
            + Invite Investor
          </Link>
        </div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Investor</th>
              <th>Email</th>
              <th>Type</th>
              <th>KYC</th>
            </tr>
          </thead>
          <tbody>
            {investors.map(inv => (
              <tr key={inv.id}>
                <td style={{ fontWeight: 600, color: 'var(--navy)' }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: 28, height: 28, borderRadius: '50%', background: 'var(--navy)', color: '#fff',
                    fontSize: 11, fontWeight: 700, marginRight: 10,
                  }}>
                    {inv.initials}
                  </span>
                  {inv.name}
                </td>
                <td style={{ fontSize: 13, color: 'var(--slate-light)' }}>{inv.email}</td>
                <td style={{ fontSize: 13, color: 'var(--slate-light)' }}>{inv.type}</td>
                <td>
                  <span className={`badge ${KYC_BADGE[inv.kycStatus]}`}>{inv.kycStatus}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
