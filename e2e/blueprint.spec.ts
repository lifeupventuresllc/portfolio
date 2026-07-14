import { test, expect } from '@playwright/test'

// Full user-facing blueprint funnel — fills the form, submits, verifies the
// success state + download. Run against prod: PW_BASE_URL=https://www.asaluke.io
test('blueprint: fill form → submit → success + download', async ({ page }) => {
  await page.goto('/blueprint')

  // New tabloid hero present
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/exactly what to eat/i)

  // Fill the form (labels are placeholders here; use them)
  await page.getByRole('button', { name: 'Lose Fat' }).click()
  await page.getByPlaceholder('28').fill('28')          // age
  await page.getByPlaceholder('5', { exact: true }).fill('5')   // feet
  await page.getByPlaceholder('6', { exact: true }).fill('6')   // inches
  await page.getByPlaceholder('150').fill('150')        // weight
  await page.getByPlaceholder('140').fill('140')        // goal wt
  await page.getByPlaceholder('Your first name').fill('QA UITest')
  await page.getByPlaceholder(/Your email/).fill('bookingasaredic@gmail.com')
  await page.getByPlaceholder(/Phone/).fill('3125550123')

  // Submit + capture the auto-download
  const downloadPromise = page.waitForEvent('download', { timeout: 30_000 })
  await page.getByRole('button', { name: /Get My Free Blueprint/i }).click()

  // Success state renders with the numbers + the challenge upsell
  await expect(page.getByText(/Your blueprint downloaded/i)).toBeVisible({ timeout: 30_000 })
  await expect(page.getByText('Workout day', { exact: true })).toBeVisible()
  await expect(page.getByText('Rest day', { exact: true })).toBeVisible()
  await expect(page.getByText(/emailed a copy to/i)).toBeVisible()
  await expect(page.getByRole('link', { name: /Snatched Without Starving/i })).toBeVisible()

  const download = await downloadPromise
  expect(download.suggestedFilename()).toContain('Calorie_Blueprint.pdf')
})
