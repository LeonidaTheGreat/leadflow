// @ts-check
const { test, expect } = require('@playwright/test')

/**
 * Page Load & Navigation Browser Tests
 *
 * Verifies critical pages load without errors, render key content,
 * and navigation works. Tests public pages only (no auth required).
 */

test.describe('Public Pages', () => {
  test('landing page loads', async ({ page }) => {
    const response = await page.goto('/')
    expect(response?.status()).toBe(200)

    // Should have some content (not a blank page or error)
    const body = await page.textContent('body')
    expect(body?.length).toBeGreaterThan(100)

    // Should NOT contain error strings
    expect(body).not.toContain('APPLICATION_ERROR')
    expect(body).not.toContain('Internal Server Error')
    expect(body).not.toContain('Module not found')
  })

  test('login page loads and renders form', async ({ page }) => {
    const response = await page.goto('/login')
    expect(response?.status()).toBe(200)

    // Wait for React hydration
    await page.waitForSelector('#email', { timeout: 15000 })

    // Form elements should be present
    await expect(page.locator('#email')).toBeVisible()
    await expect(page.locator('#password')).toBeVisible()
  })

  test('signup page loads and shows plans', async ({ page }) => {
    const response = await page.goto('/signup')
    expect(response?.status()).toBe(200)

    await page.waitForLoadState('networkidle')
    await expect(page.getByText('$149')).toBeVisible({ timeout: 10000 })
  })

  test('forgot-password page loads', async ({ page }) => {
    const response = await page.goto('/forgot-password')
    expect(response?.status()).toBe(200)

    await page.waitForSelector('#email', { timeout: 15000 })
    await expect(page.locator('#email')).toBeVisible()
  })
})

test.describe('Page Performance', () => {
  test('login page loads within 5 seconds', async ({ page }) => {
    const start = Date.now()
    await page.goto('/login', { waitUntil: 'domcontentloaded' })
    const elapsed = Date.now() - start
    expect(elapsed).toBeLessThan(5000)
  })

  test('signup page loads within 5 seconds', async ({ page }) => {
    const start = Date.now()
    await page.goto('/signup', { waitUntil: 'domcontentloaded' })
    const elapsed = Date.now() - start
    expect(elapsed).toBeLessThan(5000)
  })

  test('landing page loads within 5 seconds', async ({ page }) => {
    const start = Date.now()
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const elapsed = Date.now() - start
    expect(elapsed).toBeLessThan(5000)
  })
})

test.describe('Error Handling', () => {
  test('404 page renders gracefully', async ({ page }) => {
    const response = await page.goto('/this-page-does-not-exist-12345')
    // Should return 404 (not 500)
    expect(response?.status()).toBe(404)

    // Should have some content (custom 404 page, not blank)
    const body = await page.textContent('body')
    expect(body?.length).toBeGreaterThan(10)
  })
})

test.describe('Signup Form Interaction', () => {
  test('signup form elements are interactive', async ({ page }) => {
    await page.goto('/signup')
    await page.waitForLoadState('networkidle')

    // Click on a plan to proceed to form
    const proButton = page.getByRole('button', { name: /Get Started/i }).first()
    await expect(proButton).toBeVisible({ timeout: 10000 })

    await proButton.click()

    // Form fields should become visible
    await expect(page.locator('[data-testid="signup-email-input"]')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('[data-testid="signup-password-input"]')).toBeVisible()
  })

  test('signup form validation works', async ({ page }) => {
    await page.goto('/signup')
    await page.waitForLoadState('networkidle')

    // Click on first plan
    const getStartedBtn = page.getByRole('button', { name: /Get Started/i }).first()
    await getStartedBtn.click()

    // Wait for form to appear
    await page.waitForSelector('[data-testid="signup-form"]', { timeout: 5000 })

    // Try submitting empty form (should show validation error)
    const submitBtn = page.getByRole('button', { name: /Continue to Payment/i })
    await submitBtn.click()

    // Validation error should appear
    await expect(page.getByText(/required/i)).toBeVisible({ timeout: 3000 })
  })
})

test.describe('Responsive Layout', () => {
  test('login page works on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/login')
    await page.waitForSelector('#email', { timeout: 15000 })

    await expect(page.locator('#email')).toBeVisible()
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
  })

  test('signup page works on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/signup')
    await page.waitForLoadState('networkidle')

    // Plan cards should still be visible (stacked vertically)
    await expect(page.getByText('$149')).toBeVisible({ timeout: 10000 })
  })
})
