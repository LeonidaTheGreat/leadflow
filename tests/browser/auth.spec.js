// @ts-check
const { test, expect } = require('@playwright/test')

/**
 * Auth Flow Browser Tests
 *
 * Tests login, signup, and forgot-password pages render correctly
 * and handle user interactions. Does NOT create real accounts.
 *
 * Selectors: Uses data-testid when available, falls back to #id and role-based
 * selectors for compatibility with pre-deploy production.
 */

// Helper: locate by data-testid or fallback to #id
function input(page, testId, fallbackId) {
  return page.getByTestId(testId).or(page.locator(`#${fallbackId}`))
}

test.describe('Login Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    // Wait for client-side React hydration
    await page.waitForSelector('#email', { timeout: 15000 })
  })

  test('renders login form with all elements', async ({ page }) => {
    // Core form elements
    await expect(page.locator('#email')).toBeVisible()
    await expect(page.locator('#password')).toBeVisible()
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()

    // Navigation links
    await expect(page.getByText('Forgot password?')).toBeVisible()
    await expect(page.getByText("Don't have an account?")).toBeVisible()
  })

  test('shows error on invalid credentials', async ({ page }) => {
    await input(page, 'login-email-input', 'email').fill('invalid@test.com')
    await input(page, 'login-password-input', 'password').fill('wrongpassword')
    await page.getByRole('button', { name: /sign in/i }).click()

    // Should show error message (not redirect)
    await expect(page.locator('[class*="red"]').first()).toBeVisible({ timeout: 10000 })
    // Should still be on login page
    await expect(page).toHaveURL(/login/)
  })

  test('forgot password link navigates correctly', async ({ page }) => {
    await page.getByText('Forgot password?').click()
    await expect(page).toHaveURL(/forgot-password/)
  })

  test('signup link navigates correctly', async ({ page }) => {
    // The link text varies — could be "Start your free trial" or "Start Free Pilot"
    const signupLink = page.locator('a[href*="onboarding"], a[href*="signup"]').first()
    await signupLink.click()
    await expect(page).toHaveURL(/onboarding|signup/)
  })
})

test.describe('Signup Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/signup')
    await page.waitForLoadState('networkidle')
  })

  test('renders plan selection step', async ({ page }) => {
    // Should show plan options with pricing
    await expect(page.getByText('$49')).toBeVisible()
    await expect(page.getByText('$149')).toBeVisible()
    await expect(page.getByText('$399')).toBeVisible()

    // Should have "Get Started" buttons
    const buttons = page.getByRole('button', { name: /get started/i })
    await expect(buttons.first()).toBeVisible()
  })

  test('plan selection advances to details form', async ({ page }) => {
    // Click the second plan's "Get Started" (Pro)
    await page.getByRole('button', { name: /get started/i }).nth(1).click()

    // Should show the details form with email and password fields
    await expect(page.locator('#email')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('#password')).toBeVisible()
  })
})

test.describe('Forgot Password Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/forgot-password')
    await page.waitForSelector('#email', { timeout: 15000 })
  })

  test('renders forgot password form', async ({ page }) => {
    await expect(page.locator('#email')).toBeVisible()
    await expect(page.getByRole('button', { name: /send reset link/i })).toBeVisible()
    await expect(page.getByText('Back to Sign In')).toBeVisible()
  })

  test('submits and shows success message', async ({ page }) => {
    await page.locator('#email').fill('test@example.com')
    await page.getByRole('button', { name: /send reset link/i }).click()

    // Should show success state (button disabled while sending, or success message appears)
    // Wait for the request to complete
    await page.waitForResponse(resp => resp.url().includes('/api/auth/forgot-password'))
    // After submission, should show success message with "Check your email"
    await expect(page.getByText(/check your email/i)).toBeVisible({ timeout: 10000 })
  })

  test('back link returns to login', async ({ page }) => {
    await page.getByText('Back to Sign In').click()
    await expect(page).toHaveURL(/login/)
  })
})
