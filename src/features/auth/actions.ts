'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { generatePasswordSetupLink, updatePassword } from '@/lib/auth'
import { sendPasswordReset } from '@/lib/notifications/email'
import { redirect } from 'next/navigation'

// "Forgot password" — email a reset link. Always reports success so we never
// reveal whether an account exists for the address.
export async function requestPasswordResetAction(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim()
  if (!email) return { error: 'Enter your email address' }

  const link = await generatePasswordSetupLink(email).catch(() => null)
  if (link) await sendPasswordReset(email, link).catch(() => {})
  return { success: true }
}

// Set a new password for the current recovery/authenticated session.
export async function updatePasswordAction(formData: FormData) {
  const password = String(formData.get('password') ?? '')
  if (password.length < 8) return { error: 'Password must be at least 8 characters' }

  const { error } = await updatePassword(password)
  if (error) return { error: 'Could not update your password — the link may have expired. Request a new one from the login page.' }
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
