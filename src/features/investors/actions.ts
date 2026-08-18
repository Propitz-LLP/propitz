'use server'

import { requireAdmin } from '@/lib/auth'
import { config } from '@/lib/config'
import { createAdminClient } from '@/lib/supabase/server'
import { sendInvestorWelcome } from '@/lib/notifications/email'
import { recordAudit } from '@/lib/audit'
import { createInvestor, getInvestorByIdAdmin } from '@/lib/db/investors'
import { getPropertyByIdAdmin, reserveUnits } from '@/lib/db/properties'
import { allocateUnits, removeOwnership } from '@/lib/db/ownerships'
import { revalidatePath } from 'next/cache'
import { investorSchema, allocationSchema } from './schemas'

function initialsFrom(name: string, email: string): string {
  const fromName = name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2)
  return (fromName || email.slice(0, 2)).toUpperCase()
}

// Admin adds an investor with minimal details (name, email, phone). Creates the
// login identity (auth.users, which investors.id FKs to) plus the profile row.
// KYC starts as "Not Started"; KYC + bank details are added later. The temp
// password is never shown — the investor sets their own via "Forgot password".
export async function createInvestorAction(formData: FormData) {
  const admin = await requireAdmin()

  const parsed = investorSchema.safeParse(Object.fromEntries(formData.entries()))
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }
  const { name, email, phone } = parsed.data

  const supabase = await createAdminClient()
  const tempPassword = `${crypto.randomUUID()}Aa1!`
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
  })
  if (error || !data.user) {
    const msg = (error?.message ?? '').toLowerCase()
    if (msg.includes('already') || msg.includes('registered') || msg.includes('exists')) {
      return { error: { email: ['An account with this email already exists'] } }
    }
    return { error: { _form: [error?.message ?? 'Could not create the investor'] } }
  }

  try {
    await createInvestor({
      id: data.user.id,
      name: name.trim(),
      email,
      phone,
      type: 'Individual - Resident Indian',
      kycStatus: 'Not Started',
      initials: initialsFrom(name, email),
    })
  } catch {
    // Don't orphan a login if the profile insert fails — roll the auth user back.
    await supabase.auth.admin.deleteUser(data.user.id).catch(() => {})
    return { error: { _form: ['Could not create the investor profile'] } }
  }

  // Notify the investor. They set their own password from the login screen
  // ("Change / Reset password"). Best-effort — a random password already exists.
  await sendInvestorWelcome(email, name.trim(), `${config.app.url}/login`)
    .catch(err => console.error('[investor.create] welcome email failed for', email, '—', err instanceof Error ? err.message : err))

  await recordAudit({
    actor: admin,
    action: 'investor.create',
    entityType: 'investor',
    entityId: data.user.id,
    before: null,
    after: { name: name.trim(), email },
  })

  revalidatePath('/admin/investors')
  return { success: true, id: data.user.id, name: name.trim() }
}

// Hard-delete an investor — gated behind ALLOW_INVESTOR_DELETE. Blocked when the
// investor has holdings or transactions (financial records must be preserved).
// Deleting the auth user cascades the investor row (FK on delete cascade).
export async function deleteInvestorAction(id: string) {
  const admin = await requireAdmin()
  if (!config.features.allowInvestorDelete) {
    return { error: 'Investor deletion is disabled.' }
  }

  const investor = await getInvestorByIdAdmin(id)
  if (!investor) return { error: 'Investor not found' }

  const supabase = await createAdminClient()
  const [ownerships, transactions] = await Promise.all([
    supabase.from('ownerships').select('id', { count: 'exact', head: true }).eq('investorId', id),
    supabase.from('transactions').select('id', { count: 'exact', head: true }).eq('investorId', id),
  ])
  if ((ownerships.count ?? 0) > 0 || (transactions.count ?? 0) > 0) {
    return { error: 'This investor has holdings or transactions and cannot be deleted.' }
  }

  const { error: authError } = await supabase.auth.admin.deleteUser(id)
  if (authError) {
    // No auth user (or already gone) — remove the profile row directly.
    const { error: rowError } = await supabase.from('investors').delete().eq('id', id)
    if (rowError) return { error: 'Could not delete this investor.' }
  }

  await recordAudit({
    actor: admin,
    action: 'investor.delete',
    entityType: 'investor',
    entityId: id,
    before: { name: investor.name, email: investor.email },
    after: null,
  })

  revalidatePath('/admin/investors')
  return { success: true }
}

// Allocate property units to a KYC-approved investor. Units are reserved
// atomically (reserve_property_units guards against overselling) and the
// ownership row is created/topped-up. No payment/transaction is recorded — this
// is a manual back-office allocation; the fee breakdown is display-only.
export async function allocateUnitsToInvestorAction(propertyId: string, formData: FormData) {
  const admin = await requireAdmin()

  const parsed = allocationSchema.safeParse(Object.fromEntries(formData.entries()))
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }
  const { investorId, units } = parsed.data

  const property = await getPropertyByIdAdmin(propertyId)
  if (!property) return { error: { _form: ['Property not found'] } }

  const investor = await getInvestorByIdAdmin(investorId)
  if (!investor) return { error: { investorId: ['Investor not found'] } }
  if (investor.kycStatus !== 'Approved') {
    return { error: { investorId: ['Investor must be KYC-approved'] } }
  }

  const available = property.totalUnits - property.subscribedUnits
  if (units > available) {
    return { error: { units: [available > 0 ? `Only ${available} units available` : 'No units available'] } }
  }

  try {
    await reserveUnits(propertyId, units)
  } catch {
    return { error: { units: ['Not enough units available'] } }
  }
  await allocateUnits(investorId, propertyId, units, property.unitPrice)

  await recordAudit({
    actor: admin,
    action: 'ownership.allocate',
    entityType: 'ownership',
    entityId: `${propertyId}:${investorId}`,
    before: null,
    after: { investorId, propertyId, units, unitPrice: property.unitPrice },
  })

  revalidatePath(`/admin/properties/${propertyId}/edit`)
  revalidatePath('/admin/properties')
  return { success: true }
}

// Remove an investor's allocation from a property — deletes the ownership and
// returns the units to the pool. Frees the property/investor from the delete
// guards once no holdings remain.
export async function removeAllocationAction(propertyId: string, investorId: string) {
  const admin = await requireAdmin()

  const units = await removeOwnership(investorId, propertyId)
  if (units === 0) return { error: 'Allocation not found' }

  await recordAudit({
    actor: admin,
    action: 'ownership.remove',
    entityType: 'ownership',
    entityId: `${propertyId}:${investorId}`,
    before: { investorId, propertyId, units },
    after: null,
  })

  revalidatePath(`/admin/properties/${propertyId}/edit`)
  revalidatePath('/admin/properties')
  return { success: true }
}
