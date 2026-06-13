import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
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
//
// Must NOT use the cookie-based SSR client: createServerClient reads the user's
// auth cookie and sends that session JWT as the Authorization bearer, which
// overrides the secret key — so requests run as the logged-in user and stay
// subject to RLS. A plain supabase-js client with no session sends the secret
// key as the bearer, which is what actually bypasses RLS.
export async function createAdminClient() {
  return createSupabaseClient(
    config.supabase.url,
    config.supabase.secretKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
