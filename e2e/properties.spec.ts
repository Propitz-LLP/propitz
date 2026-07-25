import { test, expect } from '@playwright/test'
import {
  INVESTOR_EMAIL,
  INVESTOR_PASSWORD,
  requireCreds,
  login,
  trackPageErrors,
  proof,
} from './helpers'

// Read-only navigation of the investor property surfaces. Never invests — the
// subscription/Razorpay lifecycle is exercised separately against test keys.
test.describe('Coverage: property listing & detail', () => {
  test.beforeAll(() => requireCreds(INVESTOR_EMAIL, INVESTOR_PASSWORD, 'investor'))

  test('investor can browse the property listing', async ({ page }) => {
    const errors = trackPageErrors(page)
    await login(page, INVESTOR_EMAIL, INVESTOR_PASSWORD)
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })

    await page.goto('/properties')
    await expect(page).toHaveURL(/\/properties/)
    await proof(page, 'properties-listing')

    expect(errors, `Page errors: ${errors.join('; ')}`).toHaveLength(0)
  })

  test('investor can open a property detail page', async ({ page }) => {
    const errors = trackPageErrors(page)
    await login(page, INVESTOR_EMAIL, INVESTOR_PASSWORD)
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })
    await page.goto('/properties')

    // Property cards link to /properties/<slug>. If the test DB has none, this
    // is a no-op skip rather than a failure — an empty listing is still a valid
    // (if uninteresting) state to prove.
    const firstCard = page.locator('a[href^="/properties/"]').first()
    if ((await firstCard.count()) === 0) {
      test.skip(true, 'No properties seeded in the test project — nothing to open.')
    }

    await firstCard.click()
    await expect(page).toHaveURL(/\/properties\/[^/]+$/)
    await proof(page, 'property-detail')

    expect(errors, `Page errors: ${errors.join('; ')}`).toHaveLength(0)
  })

  test('investor can open the documents page', async ({ page }) => {
    const errors = trackPageErrors(page)
    await login(page, INVESTOR_EMAIL, INVESTOR_PASSWORD)
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })

    await page.goto('/documents')
    await expect(page).toHaveURL(/\/documents/)
    await proof(page, 'investor-documents')

    expect(errors, `Page errors: ${errors.join('; ')}`).toHaveLength(0)
  })
})
