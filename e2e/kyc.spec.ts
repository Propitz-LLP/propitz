import { test, expect } from '@playwright/test'
import {
  INVESTOR_EMAIL,
  INVESTOR_PASSWORD,
  requireCreds,
  login,
  trackPageErrors,
  proof,
} from './helpers'

// The seeded investor has kycStatus 'Approved', so the KYC route redirects them
// to the dashboard (see app/(auth)/onboarding/kyc/page.tsx). We prove that gate
// behaves correctly. Exercising the KYC wizard's steps themselves needs a
// separate not-yet-approved fixture user and is intentionally out of scope here
// — Aadhaar/compliance data must never flow through a shared seed account.
test.describe('Coverage: KYC gate', () => {
  test.beforeAll(() => requireCreds(INVESTOR_EMAIL, INVESTOR_PASSWORD, 'investor'))

  test('approved investor is redirected away from the KYC wizard', async ({ page }) => {
    const errors = trackPageErrors(page)
    await login(page, INVESTOR_EMAIL, INVESTOR_PASSWORD)
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })

    await page.goto('/onboarding/kyc')
    // Approved → bounced back to the dashboard, never left on the wizard.
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })
    await expect(page).not.toHaveURL(/\/onboarding/)
    await proof(page, 'kyc-gate-approved-redirect')

    expect(errors, `Page errors: ${errors.join('; ')}`).toHaveLength(0)
  })
})
