import Link from 'next/link'
import { Suspense } from 'react'
import { requireAdmin } from '@/lib/auth'
import { getDistributions } from '@/lib/db/transactions'
import { listAllProperties } from '@/lib/db/properties'
import { fmtRupees } from '@/lib/format'
import { SuccessBanner } from '@/components/ui/SuccessBanner'

export default async function AdminDistributionsPage() {
  await requireAdmin()
  const [distributions, properties] = await Promise.all([
    getDistributions(),
    listAllProperties(),
  ])
  const propertyName = new Map(properties.map(p => [p.id, p.name]))

  return (
    <div className="max-w-[1100px] mx-auto px-8 py-8">
      <Suspense>
        <SuccessBanner />
      </Suspense>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 30, color: 'var(--navy)', marginBottom: 4 }}>
            Distributions
          </h1>
          <p style={{ fontSize: 13, color: 'var(--slate-light)' }}>{distributions.length} total</p>
        </div>
        <Link
          href="/admin/distributions/new"
          style={{
            padding: '10px 20px', borderRadius: 8, fontSize: 13.5, fontWeight: 600,
            background: 'var(--gold)', color: 'var(--navy)', textDecoration: 'none',
          }}
        >
          + New Distribution
        </Link>
      </div>

      {distributions.length === 0 ? (
        <div className="card">
          <div className="card-body" style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--slate-light)' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>💰</div>
            <p style={{ fontSize: 14 }}>No distributions yet.</p>
            <p style={{ fontSize: 12.5, marginTop: 4 }}>
              Run a payout to all unit holders of a property from{' '}
              <Link href="/admin/distributions/new" style={{ color: 'var(--navy-mid)' }}>New Distribution</Link>.
            </p>
          </div>
        </div>
      ) : (
        <table className="data-table" style={{ width: '100%' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>Property</th>
              <th style={{ textAlign: 'left' }}>Period</th>
              <th style={{ textAlign: 'right' }}>Per Unit</th>
              <th style={{ textAlign: 'right' }}>Investors</th>
              <th style={{ textAlign: 'right' }}>Gross</th>
              <th style={{ textAlign: 'right' }}>Fee</th>
              <th style={{ textAlign: 'right' }}>Net Paid</th>
              <th style={{ textAlign: 'left' }}>Date</th>
              <th style={{ textAlign: 'left' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {distributions.map((d) => (
              <tr key={d.id as string}>
                <td>{propertyName.get(d.propertyId as string) ?? 'Unknown property'}</td>
                <td>{d.period as string}</td>
                <td style={{ textAlign: 'right' }}>₹{Number(d.perUnit).toLocaleString('en-IN')}</td>
                <td style={{ textAlign: 'right' }}>{d.investorCount as number}</td>
                <td style={{ textAlign: 'right' }}>{fmtRupees(Number(d.grossTotal))}</td>
                <td style={{ textAlign: 'right', color: 'var(--red)' }}>−{fmtRupees(Number(d.feeTotal))}</td>
                <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--green)' }}>{fmtRupees(Number(d.netTotal))}</td>
                <td>{d.date as string}</td>
                <td>
                  <span className={`badge ${d.status === 'Completed' ? 'badge-green' : 'badge-amber'}`}>
                    {d.status as string}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
