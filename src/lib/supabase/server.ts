import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { config } from '@/lib/config'

// Server-side Supabase client — used in server components, server actions, route handlers
// Uses publishable key (sb_publishable_xxx) — respects RLS policies
export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    config.supabase.url,
    config.supabase.publishableKey,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Called from a server component — middleware handles session refresh
          }
        },
      },
    }
  )
}

// Admin client — uses secret key (sb_secret_xxx), bypasses RLS
// Only call from server-side lib/db/ functions, never from client components
export async function createAdminClient() {
  const cookieStore = await cookies()
  return createServerClient(
    config.supabase.url,
    config.supabase.secretKey,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}
