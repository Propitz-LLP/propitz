import { test, expect, type Page } from '@playwright/test'

// ── Test credentials (seeded via `npm run test:seed`) ──────────
const INVESTOR_EMAIL = process.env.TEST_INVESTOR_EMAIL ?? ''
const INVESTOR_PASSWORD = process.env.TEST_INVESTOR_PASSWORD ?? ''
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL ?? ''
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? ''

// Fail loudly at collection time if creds are missing — a green run with no
// login coverage would be worse than an obvious failure.
function requireCreds(email: string, password: string, who: string) {
  if (!email || !password) {
    throw new Error(
      `Missing ${who} test credentials. Set TEST_${who.toUpperCase()}_EMAIL / _PASSWORD in .env.local and run "npm run test:seed".`,
    )
  }
}

// The login form uses <label> without htmlFor, so target inputs by type.
async function login(page: Page, email: string, password: string) {
  await page.goto('/login')
  await page.locator('input[type="email"]').fill(email)
  await page.locator('input[type="password"]').fill(password)
  await page.getByRole('button', { name: /sign in/i }).click()
}

// Collect uncaught page errors so any test can assert the page stayed clean.
function trackPageErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  return errors
}

test.describe('Smoke: public pages & auth guards', () => {
  test('login page renders with branding and both role tabs', async ({ page }) => {
    const errors = trackPageErrors(page)
    await page.goto('/login')

    await expect(page.getByText('Propitz').first()).toBeVisible()
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.getByRole('button', { name: /investor/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /admin/i })).toBeVisible()

    expect(errors, `Page errors: ${errors.join('; ')}`).toHaveLength(0)
  })

  test('unauthenticated /dashboard redirects to /login', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/)
  })

  test('unauthenticated /admin redirects to /login', async ({ page }) => {
    await page.goto('/admin')
    await expect(page).toHaveURL(/\/login/)
  })
})

test.describe('Smoke: investor journey', () => {
  test.beforeAll(() => requireCreds(INVESTOR_EMAIL, INVESTOR_PASSWORD, 'investor'))

  test('investor can log in and reach the dashboard', async ({ page }) => {
    const errors = trackPageErrors(page)
    await login(page, INVESTOR_EMAIL, INVESTOR_PASSWORD)

    // Approved-KYC investor should land on the dashboard, not the login or KYC gate.
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })
    await expect(page).not.toHaveURL(/\/onboarding/)
    expect(errors, `Page errors: ${errors.join('; ')}`).toHaveLength(0)
  })

  test('investor can open properties and transactions', async ({ page }) => {
    const errors = trackPageErrors(page)
    await login(page, INVESTOR_EMAIL, INVESTOR_PASSWORD)
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })

    await page.goto('/properties')
    await expect(page).toHaveURL(/\/properties/)

    await page.goto('/transactions')
    await expect(page).toHaveURL(/\/transactions/)

    expect(errors, `Page errors: ${errors.join('; ')}`).toHaveLength(0)
  })
})

test.describe('Smoke: admin', () => {
  test.beforeAll(() => requireCreds(ADMIN_EMAIL, ADMIN_PASSWORD, 'admin'))

  test('admin can log in and reach the admin console', async ({ page }) => {
    const errors = trackPageErrors(page)
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD)

    await expect(page).toHaveURL(/\/admin/, { timeout: 15_000 })
    expect(errors, `Page errors: ${errors.join('; ')}`).toHaveLength(0)
  })
})
