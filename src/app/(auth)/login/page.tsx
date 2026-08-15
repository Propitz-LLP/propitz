import { Suspense } from 'react'
import { LoginForm } from '@/features/auth/components/LoginForm'

export default function LoginPage() {
  return (
    <div className="min-h-screen">
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  )
}
