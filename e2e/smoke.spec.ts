import { test, expect } from '@playwright/test'
import {
  INVESTOR_EMAIL,
  INVESTOR_PASSWORD,
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  requireCreds,
  login,
  loginAndProve,
  trackPageErrors,
  proof,
} from './helpers'

test.describe('Smoke: public pages & auth guards', () => {
  test('login page renders with branding and both role tabs', async ({ page }) => {
    const errors = trackPageErrors(page)
    await page.goto('/login')

    await expect(page.getByText('Propitz').first()).toBeVisible()
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.getByRole('button', { name: /investor/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /admin/i })).toBeVisible()
    await proof(page, 'public-login')

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
    // Approved-KYC investor should land on the dashboard, not the login or KYC gate.
    await loginAndProve(page, INVESTOR_EMAIL, INVESTOR_PASSWORD, /\/dashboard/, 'investor-dashboard')
    await expect(page).not.toHaveURL(/\/onboarding/)
    expect(errors, `Page errors: ${errors.join('; ')}`).toHaveLength(0)
  })

  test('investor can open properties and transactions', async ({ page }) => {
    const errors = trackPageErrors(page)
    await login(page, INVESTOR_EMAIL, INVESTOR_PASSWORD)
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })

    await page.goto('/properties')
    await expect(page).toHaveURL(/\/properties/)
    await proof(page, 'investor-properties')

    await page.goto('/transactions')
    await expect(page).toHaveURL(/\/transactions/)
    await proof(page, 'investor-transactions')

    expect(errors, `Page errors: ${errors.join('; ')}`).toHaveLength(0)
  })
})

test.describe('Smoke: admin', () => {
  test.beforeAll(() => requireCreds(ADMIN_EMAIL, ADMIN_PASSWORD, 'admin'))

  test('admin can log in and reach the admin console', async ({ page }) => {
    const errors = trackPageErrors(page)
    await loginAndProve(page, ADMIN_EMAIL, ADMIN_PASSWORD, /\/admin/, 'admin-console')
    expect(errors, `Page errors: ${errors.join('; ')}`).toHaveLength(0)
  })
})
