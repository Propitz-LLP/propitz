// Auth abstraction — the ONLY place that knows about Supabase Auth.
// To migrate to AWS Cognito: rewrite this file only.
// All features call these functions, never the auth SDK directly.

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { AuthUser, UserRole } from '@/types'

export async function getCurrentUser(): Promise<AuthUser | null> {
  const supabase = await createClient()
  // getClaims() validates the JWT signature on every call — more secure than getSession()
  // which can return stale data from the cookie without re-validation.
  // Never use getSession() in server code.
  const { data, error } = await supabase.auth.getClaims()
  if (error || !data?.claims) return null
  const claims = data.claims
  return {
    id: claims.sub,
    email: claims.email as string,
    role: ((claims.app_metadata as Record<string, unknown>)?.role ?? 'investor') as UserRole,
  }
}

// Throws redirect if not authenticated
export async function requireAuth(): Promise<AuthUser> {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  return user
}

// Throws redirect if not admin
export async function requireAdmin(): Promise<AuthUser> {
  const user = await requireAuth()
  if (user.role !== 'admin') redirect('/dashboard')
  return user
}

// Throws redirect if KYC not approved — used in investor investment flows
export async function requireKyc(): Promise<AuthUser> {
  const user = await requireAuth()
  const { getInvestorById } = await import('@/lib/db/investors')
  const investor = await getInvestorById(user.id)
  if (!investor || investor.kycStatus !== 'Approved') redirect('/onboarding/kyc')
  return user
}

export async function signIn(email: string, password: string) {
  const supabase = await createClient()
  return supabase.auth.signInWithPassword({ email, password })
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function signUp(email: string, password: string) {
  const supabase = await createClient()
  return supabase.auth.signUp({ email, password })
}
