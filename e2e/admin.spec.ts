import { test, expect } from '@playwright/test'
import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  requireCreds,
  login,
  trackPageErrors,
  proof,
} from './helpers'

// Read-only sweep of the admin back-office. Each admin section is visited and
// proven with a screenshot. No mutations: property status changes, KYC
// approve/reject, and distribution payouts move money / compliance state and are
// left to targeted tests against dedicated fixtures, per the compliance rules in
// CLAUDE.md (properties with activity are never hard-deleted; distributions are
// atomic money movements).
test.describe('Coverage: admin back-office', () => {
  test.beforeAll(() => requireCreds(ADMIN_EMAIL, ADMIN_PASSWORD, 'admin'))

  const sections: Array<{ path: string; url: RegExp; proof: string }> = [
    { path: '/admin/dashboard', url: /\/admin\/dashboard/, proof: 'admin-dashboard' },
    { path: '/admin/properties', url: /\/admin\/properties/, proof: 'admin-properties' },
    { path: '/admin/kyc', url: /\/admin\/kyc/, proof: 'admin-kyc-queue' },
    { path: '/admin/transactions', url: /\/admin\/transactions/, proof: 'admin-transactions' },
    { path: '/admin/distributions', url: /\/admin\/distributions/, proof: 'admin-distributions' },
  ]

  for (const s of sections) {
    test(`admin can open ${s.path}`, async ({ page }) => {
      const errors = trackPageErrors(page)
      await login(page, ADMIN_EMAIL, ADMIN_PASSWORD)
      await expect(page).toHaveURL(/\/admin/, { timeout: 15_000 })

      await page.goto(s.path)
      await expect(page).toHaveURL(s.url)
      await proof(page, s.proof)

      expect(errors, `Page errors on ${s.path}: ${errors.join('; ')}`).toHaveLength(0)
    })
  }

  test('admin can open the new-property form', async ({ page }) => {
    const errors = trackPageErrors(page)
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD)
    await expect(page).toHaveURL(/\/admin/, { timeout: 15_000 })

    // Reaching the form proves the CRUD entry point renders; we do not submit it
    // (that would create a real property row in the test project).
    await page.goto('/admin/properties/new')
    await expect(page).toHaveURL(/\/admin\/properties\/new/)
    await proof(page, 'admin-property-new')

    expect(errors, `Page errors: ${errors.join('; ')}`).toHaveLength(0)
  })
})
