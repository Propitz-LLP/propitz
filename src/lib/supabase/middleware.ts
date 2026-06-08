import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { config } from '@/lib/config'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    config.supabase.url,
    config.supabase.publishableKey,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // getClaims() validates the JWT on every request — required in middleware
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims ?? null

  const path = request.nextUrl.pathname
  const isAuthRoute = path.startsWith('/login') || path.startsWith('/onboarding')
  const isInvestorRoute = path.startsWith('/dashboard') || path.startsWith('/properties') ||
    path.startsWith('/transactions') || path.startsWith('/documents')
  const isAdminRoute = path.startsWith('/admin')
  const isApiWebhook = path.startsWith('/api/webhooks')

  // Webhooks bypass auth entirely
  if (isApiWebhook) return supabaseResponse

  // Unauthenticated — redirect to login
  if (!claims && (isInvestorRoute || isAdminRoute)) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Authenticated on auth route — redirect to dashboard
  if (claims && isAuthRoute) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Admin route — check role claim in validated JWT
  if (claims && isAdminRoute) {
    const role = (claims.app_metadata as Record<string, unknown>)?.role
    if (role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return supabaseResponse
}
