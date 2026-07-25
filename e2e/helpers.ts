// Shared helpers for the E2E specs: login, credential guards, and screenshot
// proof capture. Kept dependency-free so specs stay declarative.

import { expect, type Page } from '@playwright/test'

// ── Test credentials (seeded via `npm run test:seed`) ──────────
export const INVESTOR_EMAIL = process.env.TEST_INVESTOR_EMAIL ?? ''
export const INVESTOR_PASSWORD = process.env.TEST_INVESTOR_PASSWORD ?? ''
export const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL ?? ''
export const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? ''

// Directory the report step scans for inline email proof. Kept in sync with
// SCREENSHOTS_DIR in e2e/report-email.ts.
export const SCREENSHOTS_DIR = 'screenshots'

// Fail loudly at collection time if creds are missing — a green run with no
// login coverage would be worse than an obvious failure.
export function requireCreds(email: string, password: string, who: string) {
  if (!email || !password) {
    throw new Error(
      `Missing ${who} test credentials. Set TEST_${who.toUpperCase()}_EMAIL / _PASSWORD in .env.test and run "npm run test:seed".`,
    )
  }
}

// The login form uses <label> without htmlFor, so target inputs by type.
export async function login(page: Page, email: string, password: string) {
  await page.goto('/login')
  await page.locator('input[type="email"]').fill(email)
  await page.locator('input[type="password"]').fill(password)
  await page.getByRole('button', { name: /sign in/i }).click()
}

// Collect uncaught page errors so any test can assert the page stayed clean.
export function trackPageErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  return errors
}

// Capture a full-page screenshot as proof of a checkpoint — on pass OR fail,
// unlike Playwright's failure-only auto-capture. The report step embeds these
// inline in the owner email. `name` becomes the file stem and the email caption,
// so keep it stable and descriptive (e.g. 'investor-dashboard'). Best-effort:
// a screenshot failure must never fail the test it is documenting.
export async function proof(page: Page, name: string): Promise<void> {
  try {
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/${name}.png`, fullPage: true })
  } catch (e) {
    console.warn(`  ⚠ proof("${name}") screenshot failed:`, e instanceof Error ? e.message : e)
  }
}

// Login + wait for the post-auth landing URL, then screenshot. Convenience for
// the journey specs that all start the same way.
export async function loginAndProve(
  page: Page,
  email: string,
  password: string,
  landingUrl: RegExp,
  proofName: string,
) {
  await login(page, email, password)
  await expect(page).toHaveURL(landingUrl, { timeout: 15_000 })
  await proof(page, proofName)
}
