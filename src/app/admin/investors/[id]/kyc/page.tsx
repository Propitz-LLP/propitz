import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/auth'
import { getInvestorByIdAdmin, getKycSubmissionByInvestor } from '@/lib/db/investors'
import { KycStepper } from '@/features/kyc/components/KycStepper'

interface Props {
  params: Promise<{ id: string }>
}

const backLink: React.CSSProperties = {
  padding: '8px 16px', borderRadius: 8, fontSize: 13, border: '1px solid var(--border-strong)',
  color: 'var(--navy)', textDecoration: 'none', background: '#fff',
}

export default async function AdminInvestorKycPage({ params }: Props) {
  const { id } = await params
  await requireAdmin()

  const investor = await getInvestorByIdAdmin(id)
  if (!investor) notFound()

  const editable = investor.kycStatus === 'Not Started' || investor.kycStatus === 'Rejected'
  const submission = await getKycSubmissionByInvestor(id)

  return (
    <div className="max-w-[1100px] mx-auto px-8 py-8">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 30, color: 'var(--navy)', marginBottom: 4 }}>
            {investor.name}
          </h1>
          <p style={{ fontSize: 13, color: 'var(--slate-light)' }}>
            {investor.email} · KYC {investor.kycStatus}
          </p>
        </div>
        <Link href="/admin/investors" style={backLink}>← Back to Investors</Link>
      </div>

      {editable ? (
        <KycStepper
          investor={investor}
          submission={submission}
          investorId={id}
          returnPath={`/admin/investors?updated=${encodeURIComponent(investor.name)}`}
        />
      ) : (
        <div className="card" style={{ padding: 24 }}>
          <p style={{ fontSize: 14, color: 'var(--slate)', marginBottom: 14 }}>
            This investor’s KYC is <strong>{investor.kycStatus}</strong> and can’t be edited here.
            {(investor.kycStatus === 'Submitted' || investor.kycStatus === 'Under Review') && ' Review it in the KYC queue.'}
          </p>
          <Link
            href="/admin/kyc"
            style={{
              display: 'inline-block', padding: '10px 18px', borderRadius: 8, fontSize: 13.5, fontWeight: 600,
              background: 'var(--navy)', color: '#fff', textDecoration: 'none',
            }}
          >
            Go to KYC Review →
          </Link>
        </div>
      )}
    </div>
  )
}
