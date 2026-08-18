import { getCurrentUser } from '@/lib/auth'
import { ResetPasswordForm } from '@/features/auth/components/ResetPasswordForm'

export default async function ResetPasswordPage() {
  // The recovery link established a session, so we know whose password this is.
  const user = await getCurrentUser()
  return (
    <div className="min-h-screen">
      <ResetPasswordForm email={user?.email ?? null} />
    </div>
  )
}
