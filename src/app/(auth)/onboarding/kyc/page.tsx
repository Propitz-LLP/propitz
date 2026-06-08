import { requireAuth } from '@/lib/auth'
import { KycStepper } from '@/features/kyc/components/KycStepper'

export default async function KycPage() {
  const user = await requireAuth()
  return <KycStepper investorId={user.id} />
}
