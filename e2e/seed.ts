// Seed known E2E test accounts. Idempotent — safe to re-run.
//
// Creates:
//   • an investor with kycStatus 'Approved' (so requireKyc doesn't redirect to onboarding)
//   • an admin with app_metadata.role = 'admin'
//
// Uses the Supabase admin (service-role/secret) client directly — same bypass-RLS
// pattern as lib/supabase/server.ts createAdminClient(), but standalone (no next/headers).
//
// Run: npm run test:seed

import { config as loadEnv } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

loadEnv({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SUPABASE_SECRET = process.env.SUPABASE_SECRET_KEY ?? ''

const INVESTOR_EMAIL = process.env.TEST_INVESTOR_EMAIL ?? ''
const INVESTOR_PASSWORD = process.env.TEST_INVESTOR_PASSWORD ?? ''
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL ?? ''
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? ''

function fail(msg: string): never {
  console.error(`\n  ✗ ${msg}\n`)
  process.exit(1)
}

if (!SUPABASE_URL || !SUPABASE_SECRET) {
  fail('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY must be set in .env.local')
}
if (!INVESTOR_EMAIL || !INVESTOR_PASSWORD || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
  fail('TEST_INVESTOR_EMAIL/PASSWORD and TEST_ADMIN_EMAIL/PASSWORD must be set in .env.local')
}

const admin = createClient(SUPABASE_URL, SUPABASE_SECRET, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// Find an existing auth user by email (listUsers is paginated; scan a few pages).
async function findUserByEmail(email: string) {
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw new Error(error.message)
    const match = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())
    if (match) return match
    if (data.users.length < 200) break
  }
  return null
}

// Create the auth user if absent; otherwise update its password + metadata.
// email_confirm:true so signInWithPassword works without an email round-trip.
async function upsertAuthUser(email: string, password: string, role: 'investor' | 'admin') {
  const existing = await findUserByEmail(email)
  const app_metadata = role === 'admin' ? { role: 'admin' } : {}

  if (existing) {
    const { error } = await admin.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
      app_metadata,
    })
    if (error) throw new Error(`update ${email}: ${error.message}`)
    console.log(`  • ${role} auth user updated: ${email}`)
    return existing.id
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata,
  })
  if (error) throw new Error(`create ${email}: ${error.message}`)
  console.log(`  • ${role} auth user created: ${email}`)
  return data.user.id
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
