'use server'

import { requireAdmin } from '@/lib/auth'
import { config } from '@/lib/config'
import { sendInvestorInvite } from '@/lib/notifications/email'
import { recordAudit } from '@/lib/audit'
import { getInvestorByIdAdmin } from '@/lib/db/investors'
import { getPropertyByIdAdmin, reserveUnits } from '@/lib/db/properties'
import { allocateUnits } from '@/lib/db/ownerships'
import { revalidatePath } from 'next/cache'
import { inviteSchema, allocationSchema } from './schemas'

// Build the self-service signup link (Create account screen, pre-filled email).
function signupUrlFor(email: string): string {
  return `${config.app.url}/login?mode=signup&email=${encodeURIComponent(email)}`
}

// "Add Investor" doesn't create an account — onboarding is self-service. The
// admin invites a prospect by email; the investor then signs up, confirms their
// email, and completes KYC themselves. Returns the signup link so the UI can
// also offer a copy-to-share fallback. Email send is best-effort.
export async function inviteInvestorAction(formData: FormData) {
  await requireAdmin()

  const parsed = inviteSchema.safeParse(Object.fromEntries(formData.entries()))
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }
  const { email } = parsed.data

  const signupUrl = signupUrlFor(email)
  await sendInvestorInvite(email, signupUrl).catch(() => {})

  return { success: true, signupUrl }
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
