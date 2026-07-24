// Seed known E2E test accounts. Idempotent — safe to re-run.
//
// Creates:
//   • an investor with kycStatus 'Approved' (so requireKyc doesn't redirect to onboarding)
//   • an admin with app_metadata.role = 'admin'
//
// Auth operations hit the GoTrue admin REST API (/auth/v1/admin) directly via
// fetch (not the supabase-js admin client) AND authenticate with the LEGACY
// service_role JWT (SUPABASE_SERVICE_ROLE_KEY, an "eyJ…" token), not the new
// sb_secret_ API key. GoTrue currently rejects the new sb_secret_ key on the
// admin endpoints ~25% of the time with "unrecognized JWT kid <nil> for
// algorithm ES256" — it falls through to verifying the key as an ES256 JWT on a
// subset of Auth workers. Measured on both the test and production projects; the
// legacy JWT succeeds 30/30 where the sb_secret_ key fails ~7/30. Prod only
// "works" because the app there still authenticates with the legacy key.
// The investors table write still uses supabase-js against PostgREST, which
// accepts the sb_secret_ key reliably and is unaffected.
// Refs: github.com/orgs/supabase/discussions/37885, supabase.com/docs/guides/auth/signing-keys
//
// Run: npm run test:seed

import { config as loadEnv } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

// Local runs read .env.test; on CI these come from the environment (GitHub
// secrets) and the file is absent — dotenv silently no-ops, which is fine.
loadEnv({ path: '.env.test' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SUPABASE_SECRET = process.env.SUPABASE_SECRET_KEY ?? ''
// Admin REST auth uses the legacy service_role JWT; the sb_secret_ key is
// intermittently rejected on GoTrue's admin endpoints (see header note).
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

const INVESTOR_EMAIL = process.env.TEST_INVESTOR_EMAIL ?? ''
const INVESTOR_PASSWORD = process.env.TEST_INVESTOR_PASSWORD ?? ''
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL ?? ''
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? ''

function fail(msg: string): never {
  console.error(`\n  ✗ ${msg}\n`)
  process.exit(1)
}

if (!SUPABASE_URL || !SUPABASE_SECRET) {
  fail('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY must be set in .env.test')
}
if (!SUPABASE_SERVICE_ROLE) {
  fail('SUPABASE_SERVICE_ROLE_KEY (legacy service_role JWT, "eyJ…") must be set in .env.test — GoTrue admin rejects the sb_secret_ key intermittently')
}
if (!INVESTOR_EMAIL || !INVESTOR_PASSWORD || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
  fail('TEST_INVESTOR_EMAIL/PASSWORD and TEST_ADMIN_EMAIL/PASSWORD must be set in .env.test')
}

// supabase-js is used ONLY for the investors table write (PostgREST works fine).
const admin = createClient(SUPABASE_URL, SUPABASE_SECRET, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ── GoTrue admin REST helpers (bypass the auth-js ES256 verification bug) ──

const AUTH_BASE = `${SUPABASE_URL}/auth/v1/admin`
const authHeaders = {
  apikey: SUPABASE_SERVICE_ROLE,
  Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}`,
  'Content-Type': 'application/json',
}

interface GoTrueUser {
  id: string
  email?: string
}

async function authFetch(path: string, init?: RequestInit): Promise<unknown> {
  const res = await fetch(`${AUTH_BASE}${path}`, { ...init, headers: authHeaders })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = (body as { msg?: string; error?: string }).msg
      ?? (body as { error?: string }).error
      ?? JSON.stringify(body)
    throw new Error(`${res.status} ${msg}`)
  }
  return body
}

// Find an existing auth user by email (admin list is paginated; scan a few pages).
async function findUserByEmail(email: string): Promise<GoTrueUser | null> {
  for (let page = 1; page <= 10; page++) {
    const body = (await authFetch(`/users?page=${page}&per_page=200`)) as { users: GoTrueUser[] }
    const users = body.users ?? []
    const match = users.find((u) => u.email?.toLowerCase() === email.toLowerCase())
    if (match) return match
    if (users.length < 200) break
  }
  return null
}

// Create the auth user if absent; otherwise update its password + metadata.
// email_confirm:true so signInWithPassword works without an email round-trip.
async function upsertAuthUser(email: string, password: string, role: 'investor' | 'admin') {
  const existing = await findUserByEmail(email)
  const app_metadata = role === 'admin' ? { role: 'admin' } : {}
  const payload = JSON.stringify({ email, password, email_confirm: true, app_metadata })

  if (existing) {
    await authFetch(`/users/${existing.id}`, { method: 'PUT', body: payload })
    console.log(`  • ${role} auth user updated: ${email}`)
    return existing.id
  }

  const created = (await authFetch('/users', { method: 'POST', body: payload })) as GoTrueUser
  console.log(`  • ${role} auth user created: ${email}`)
  return created.id
}

// Mirror the investor row the signup flow creates, but pre-approved for KYC.
async function upsertInvestorRow(id: string, email: string) {
  const { error } = await admin.from('investors').upsert(
    {
      id,
      name: 'E2E Test Investor',
      email,
      phone: '',
      type: 'Individual - Resident Indian',
      kycStatus: 'Approved',
      initials: email.slice(0, 2).toUpperCase(),
    },
    { onConflict: 'id' },
  )
  if (error) throw new Error(`investor row ${email}: ${error.message}`)
  console.log(`  • investor row upserted (kycStatus=Approved): ${email}`)
}

async function main() {
  console.log('\nSeeding E2E test accounts…\n')

  const investorId = await upsertAuthUser(INVESTOR_EMAIL, INVESTOR_PASSWORD, 'investor')
  await upsertInvestorRow(investorId, INVESTOR_EMAIL)

  await upsertAuthUser(ADMIN_EMAIL, ADMIN_PASSWORD, 'admin')

  console.log('\n  ✓ Seed complete.\n')
}

main().catch((e) => fail(e instanceof Error ? e.message : String(e)))
