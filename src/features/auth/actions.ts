'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

// ⚠️ SECURITY NOTE — INTENTIONALLY UNVERIFIED (closed internal tool).
// Sets the password for whatever email is submitted and signs the user in, with
// NO proof that the requester owns the address. This is an account-takeover
// vector if the app is ever exposed publicly; it exists only because email-based
// verification isn't available here. Replace with an email link / OTP before any
// public deployment.
export async function setPasswordAndLoginAction(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')
  if (!email) return { error: 'Enter your email address' }
  if (password.length < 8) return { error: 'Password must be at least 8 characters' }

  const admin = await createAdminClient()

  // Resolve the auth user id by email (admin list is paginated).
  let userId: string | undefined
  for (let page = 1; page <= 10 && !userId; page++) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage: 200 })
    userId = data?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase())?.id
    if ((data?.users?.length ?? 0) < 200) break
  }
  if (!userId) return { error: 'No account found for that email' }

  const { error: updateError } = await admin.auth.admin.updateUserById(userId, { password })
  if (updateError) return { error: 'Could not set the password. Please try again.' }

  // Sign in so the investor lands straight in the app.
  const supabase = await createClient()
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
  if (signInError) return { error: 'Password set, but automatic sign-in failed — please sign in.' }

  return { success: true }
}

export async function loginAction(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) return { error: 'Email and password are required' }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    // Friendly messages instead of raw Supabase errors
    if (error.message.includes('Invalid login credentials')) {
      return { error: 'Invalid email or password. Please try again.' }
    }
    if (error.message.includes('Email not confirmed')) {
      return { error: 'Please verify your email address before signing in.' }
    }
    return { error: error.message }
  }

  if (!data.user) return { error: 'Something went wrong. Please try again.' }

  // Route based on role in JWT metadata
  const role = data.user.app_metadata?.role
  if (role === 'admin') {
    redirect('/admin/dashboard')
  } else {
    redirect('/dashboard')
  }
}

export async function signUpAction(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) return { error: 'Email and password are required' }
  if (password.length < 8) return { error: 'Password must be at least 8 characters' }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({ email, password })

  if (error) {
    if (error.message.includes('already registered')) {
      return { error: 'An account with this email already exists. Please sign in.' }
    }
    return { error: error.message }
  }

  if (!data.user) return { error: 'Something went wrong. Please try again.' }

  // Create investor record linked to auth user. Admin client required —
  // there is no RLS insert policy for investors on their own row, and the
  // session cookie isn't reliably set yet in this same request either way.
  const admin = await createAdminClient()
  const { error: insertError } = await admin.from('investors').insert({
    id: data.user.id,
    name: email.split('@')[0], // placeholder — updated during KYC
    email,
    phone: '',
    type: 'Individual - Resident Indian',
    kycStatus: 'Not Started',
    initials: email.slice(0, 2).toUpperCase(),
  })

  if (insertError) {
    return { error: 'Could not create your investor profile. Please contact support.' }
  }

  redirect('/onboarding/kyc')
}

export async function logoutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
