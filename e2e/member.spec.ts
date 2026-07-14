import { test, expect } from '@playwright/test'

// The logged-in member journey, driven with the QA test account.
// Override creds with PW_TEST_EMAIL / PW_TEST_PASSWORD if needed.
const EMAIL = process.env.PW_TEST_EMAIL || 'bookingasaredic@gmail.com'
const PASSWORD = process.env.PW_TEST_PASSWORD || 'Snatched2026'

async function login(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(EMAIL)
  await page.getByLabel('Password').fill(PASSWORD)
  await page.getByRole('button', { name: 'Log In' }).click()
  await page.waitForURL('**/plan', { timeout: 20_000 })
}

test.describe('Member journey (authenticated)', () => {
  test('can log in and land on the dashboard', async ({ page }) => {
    await login(page)
    await expect(page).toHaveURL(/\/plan$/)
    await expect(page.locator('body')).toContainText(/Did you show up today\?|Your daily targets|not enrolled/i)
  })

  test('badges / achievements page loads', async ({ page }) => {
    await login(page)
    await page.goto('/plan/achievements')
    await expect(page.locator('body')).toContainText(/badge/i)
    await expect(page.locator('body')).toContainText(/Day \d+ of \d+/)
  })

  test('meals page shows grocery pricing (or intake gate)', async ({ page }) => {
    await login(page)
    await page.goto('/plan/meals')
    // Either the builder + grocery pricing, or the intake gate — both are valid, both are authed
    await expect(page).not.toHaveURL(/\/login/)
    await expect(page.locator('body')).toContainText(/Grocery prices near you|get your numbers first|Build your week/i)
  })

  test('community feed loads', async ({ page }) => {
    await login(page)
    await page.goto('/plan/community')
    await expect(page).not.toHaveURL(/\/login/)
    await expect(page.locator('body')).toContainText(/Curve Collective/i)
  })

  test('workout player opens straight into today’s session + day switcher works', async ({ page }) => {
    await login(page)
    await page.goto('/plan/workout')
    await expect(page).not.toHaveURL(/\/login/)
    const body = page.locator('body')
    // Either a generated session (opens directly — no picker) or the no-plan gate
    if (await page.getByText("Today's session").isVisible().catch(() => false)) {
      // P1c: opens straight into today's session (no picker screen), with a
      // clean way back to the week and a day switcher — all without interaction.
      await expect(page.getByRole('button', { name: /My week/i })).toBeVisible()
      await expect(page.getByRole('button', { name: /Today's session/i })).toBeVisible()
      await expect(body).toContainText(/\d+\/\d+/) // step counter — already in a session
    } else {
      await expect(body).toContainText(/No workout yet|Build my plan/i)
    }
  })
})
