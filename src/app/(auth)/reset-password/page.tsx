import { ResetPasswordForm } from '@/features/auth/components/ResetPasswordForm'

interface Props {
  searchParams: Promise<{ email?: string }>
}

export default async function ResetPasswordPage({ searchParams }: Props) {
  const { email } = await searchParams
  return (
    <div className="min-h-screen">
      <ResetPasswordForm email={email ?? null} />
    </div>
  )
}
