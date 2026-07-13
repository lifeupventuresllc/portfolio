import { test, expect } from '@playwright/test'

// The public, no-login journey a brand-new visitor takes.
test.describe('Public customer journey', () => {
  test('homepage loads with the three services', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/ASA/i)
    // Hero tiles live in <main> (the nav also has these links, so scope to main)
    const hero = page.getByRole('main')
    await expect(hero.getByRole('link', { name: 'Content', exact: true })).toBeVisible()
    await expect(hero.getByRole('link', { name: 'Music', exact: true })).toBeVisible()
    await expect(hero.getByRole('link', { name: 'Fitness', exact: true })).toBeVisible()
  })

  test('global footer has permanent legal links', async ({ page }) => {
    await page.goto('/')
    const footer = page.locator('footer')
    await expect(footer.getByRole('link', { name: 'Terms of Service' })).toBeVisible()
    await expect(footer.getByRole('link', { name: 'EULA' })).toBeVisible()
    await expect(footer.getByRole('link', { name: 'Privacy' })).toBeVisible()
  })

  test('legal pages render', async ({ page }) => {
    for (const [path, heading] of [
      ['/terms', 'Terms of Service'],
      ['/eula', 'End User License Agreement'],
      ['/privacy', 'Privacy Policy'],
    ] as const) {
      await page.goto(path)
      await expect(page.getByRole('heading', { name: heading })).toBeVisible()
    }
  })

  test('fitness page features the challenge FIRST and prices the cookbook at $25.99', async ({ page }) => {
    await page.goto('/services/fitness')
    // Challenge is the h1 and appears before the Protein Budget System heading
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Snatched Without Starving')
    await expect(page.getByRole('link', { name: /See the Challenge/i }).first()).toBeVisible()
    // Cookbook price updated everywhere; old price gone
    await expect(page.getByText('$25.99').first()).toBeVisible()
    await expect(page.getByText('$12.99')).toHaveCount(0)
  })

  test('12-Week Program is gone from the bundles page', async ({ page }) => {
    await page.goto('/services/bundles')
    await expect(page.getByText(/12-Week/i)).toHaveCount(0)
  })

  test('signup gates account creation on Terms acceptance + offers Google', async ({ page }) => {
    await page.goto('/signup')
    const createBtn = page.getByRole('button', { name: 'Create Account' })
    await expect(createBtn).toBeDisabled() // disabled until the box is checked
    await expect(page.getByRole('button', { name: /Continue with Google/i })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Terms of Service' }).first()).toBeVisible()
    await page.getByRole('checkbox').check()
    await expect(createBtn).toBeEnabled()
  })

  test('login offers Google sign-in', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('button', { name: 'Log In' })).toBeVisible()
    await expect(page.getByRole('button', { name: /Continue with Google/i })).toBeVisible()
  })

  test('challenge sales page loads', async ({ page }) => {
    await page.goto('/challenge')
    await expect(page.locator('body')).toContainText(/Snatched Without Starving/i)
  })
})
