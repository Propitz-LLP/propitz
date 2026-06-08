import { createBrowserClient } from '@supabase/ssr'
import { config } from '@/lib/config'

// Browser-side Supabase client — used in client components only
// Uses publishable key (sb_publishable_xxx) — safe to expose in browser
export function createClient() {
  return createBrowserClient(
    config.supabase.url,
    config.supabase.publishableKey,
  )
}
