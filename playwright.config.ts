import { defineConfig, devices } from '@playwright/test'
import { config as loadEnv } from 'dotenv'

// Tests read the same .env.local the app uses (Supabase URL/keys, TEST_* creds).
loadEnv({ path: '.env.local' })

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

export default defineConfig({
  testDir: './e2e',
  // seed.ts / report-email.ts are runnable scripts, not specs.
  testMatch: /.*\.spec\.ts/,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  // Reporters: list for the console, html for humans, junit for the email step to parse.
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    ['junit', { outputFile: 'test-results/results.xml' }],
  ],
  use: {
    baseURL: BASE_URL,
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
    video: 'off',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  // Auto-start the app and wait for it. Attaches to a running one if present.
  // CI runs the production build (npm start); locally we use the dev server.
  webServer: {
    command: process.env.CI ? 'npm start' : 'npm run dev',
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
