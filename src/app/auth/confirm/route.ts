import { redirect } from 'next/navigation'
import type { NextRequest } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import { verifyEmailOtp } from '@/lib/auth'

// Consumes an email OTP link (set-password / reset) and establishes the session,
// then forwards to `next`. The token_hash comes from generatePasswordSetupLink,
// so no Supabase redirect-URL configuration is required.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') ?? '/dashboard'

  if (tokenHash && type) {
    const { error } = await verifyEmailOtp(tokenHash, type)
    if (!error) redirect(next)
  }

  redirect('/login?error=link_expired')
}
