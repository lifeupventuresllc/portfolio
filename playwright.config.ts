import { defineConfig, devices } from '@playwright/test'

// E2E harness for the brand-new-customer journey. Runs against a local
// production server by default; override with PW_BASE_URL to hit prod.
const baseURL = process.env.PW_BASE_URL || 'http://localhost:3000'

export default defineConfig({
  testDir: './e2e',
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // Only manage a server when testing locally (not when PW_BASE_URL points at prod).
  ...(process.env.PW_BASE_URL
    ? {}
    : {
        webServer: {
          command: 'npm run start',
          url: 'http://localhost:3000',
          timeout: 120_000,
          reuseExistingServer: true,
        },
      }),
})
