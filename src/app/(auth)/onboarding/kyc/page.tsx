import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth'
import { getInvestorById, getKycSubmissionByInvestor } from '@/lib/db/investors'
import { KycStepper } from '@/features/kyc/components/KycStepper'
import { KycStatusTracker } from '@/features/kyc/components/KycStatusTracker'

export default async function KycPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>
}) {
  const user = await requireAuth()
  const { reason } = await searchParams
  const investor = await getInvestorById(user.id)
  if (!investor) redirect('/login')

  if (investor.kycStatus === 'Approved') redirect('/dashboard')

  const submission = await getKycSubmissionByInvestor(user.id)

  if (investor.kycStatus === 'Submitted' || investor.kycStatus === 'Under Review') {
    return <KycStatusTracker initialStatus={investor.kycStatus} />
  }

  // Not Started or Rejected → wizard (rejected pre-fills previous data)
  return (
    <KycStepper
      investor={investor}
      submission={submission}
      showGateBanner={reason === 'kyc'}
    />
  )
}
