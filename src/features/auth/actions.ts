'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

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

  // Create investor record linked to auth user
  await supabase.from('investors').insert({
    id: data.user.id,
    name: email.split('@')[0], // placeholder — updated during KYC
    email,
    phone: '',
    type: 'Individual - Resident Indian',
    kycStatus: 'Not Started',
    initials: email.slice(0, 2).toUpperCase(),
  })

  redirect('/onboarding/kyc')
}

export async function logoutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
