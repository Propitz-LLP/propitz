import { requireAdmin } from '@/lib/auth'
import { config } from '@/lib/config'
import { listAllInvestors } from '@/lib/db/investors'
import { AddInvestorButton } from '@/features/investors/components/AddInvestorButton'
import { InvestorActions } from '@/features/investors/components/InvestorActions'
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
  const canDelete = config.features.allowInvestorDelete

  return (
    <div className="max-w-[1100px] mx-auto px-8 py-8">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 30, color: 'var(--navy)', marginBottom: 4 }}>
            Investors
          </h1>
          <p style={{ fontSize: 13, color: 'var(--slate-light)' }}>{investors.length} total</p>
        </div>
        <AddInvestorButton />
      </div>

      {investors.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
          <p style={{ fontSize: 14, color: 'var(--slate-light)', marginBottom: 16 }}>No investors yet.</p>
          <AddInvestorButton />
        </div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Investor</th>
              <th>Email</th>
              <th>Type</th>
              <th>KYC</th>
              <th className="num">Actions</th>
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
                <td className="num">
                  <InvestorActions id={inv.id} kycStatus={inv.kycStatus} canDelete={canDelete} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
