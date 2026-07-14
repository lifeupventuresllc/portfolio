import { test, expect } from '@playwright/test'

const EMAIL = process.env.PW_TEST_EMAIL || 'bookingasaredic@gmail.com'
const PASSWORD = process.env.PW_TEST_PASSWORD || 'Snatched2026'

// One-tap auto-generate: log in, open the meal builder, tap "Auto-build my
// week", confirm a full plan renders. Run against prod with PW_BASE_URL.
test('meals: auto-build generates a full week in one tap', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Email').fill(EMAIL)
  await page.getByLabel('Password').fill(PASSWORD)
  await page.getByRole('button', { name: 'Log In' }).click()
  await page.waitForURL('**/plan', { timeout: 20_000 })

  await page.goto('/plan/meals')
  // If gated on intake, skip gracefully
  if (await page.getByRole('button', { name: /Auto-build my week/i }).isVisible().catch(() => false)) {
    await page.getByRole('button', { name: /Auto-build my week/i }).click()
    await expect(page.getByRole('heading', { name: /What to Eat This Week/i })).toBeVisible({ timeout: 15_000 })
    // clarity: the prominent cook-day guidance callout is present
    await expect(page.getByText(/What to pick for \d+ cook day/i)).toBeVisible()
  } else {
    await expect(page.locator('body')).toContainText(/get your numbers first|intake/i)
  }
})
