// @ts-check
const { test, expect } = require('@playwright/test')

/**
 * Client-Side JavaScript Error Detection
 *
 * Catches the class of bugs where the server returns 200 but React crashes
 * during hydration or rendering. This is the test that would have caught
 * the channel().unsubscribe() bug.
 *
 * Listens for:
 *   - console.error messages
 *   - Uncaught exceptions (pageerror events)
 *   - React error boundary triggers
 *   - "Application error" text in the DOM
 *
 * Pages tested:
 *   - Public pages (no auth): landing, login, signup, pricing, forgot-password
 *   - Protected pages require auth so are tested separately in auth.spec.js
 */

const PUBLIC_PAGES = [
  { path: '/', name: 'Landing Page' },
  { path: '/login', name: 'Login' },
  { path: '/signup', name: 'Signup' },
  { path: '/signup/pilot', name: 'Pilot Signup' },
  { path: '/signup/trial', name: 'Trial Signup' },
  { path: '/pricing', name: 'Pricing' },
  { path: '/forgot-password', name: 'Forgot Password' },
]

for (const { path, name } of PUBLIC_PAGES) {
  test(`${name} (${path}) loads without JS errors`, async ({ page }) => {
    const jsErrors = []
    const consoleErrors = []

    // Capture uncaught exceptions
    page.on('pageerror', (error) => {
      jsErrors.push(error.message)
    })

    // Capture console.error calls (but filter out noisy ones)
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text()
        // Filter out known noise
        if (text.includes('favicon') || text.includes('gtag') || text.includes('analytics')) return
        consoleErrors.push(text)
      }
    })

    // Navigate and wait for DOM to load (networkidle can timeout on Vercel cold starts)
    const response = await page.goto(path, { waitUntil: 'domcontentloaded', timeout: 30000 })
    expect(response?.status()).toBeLessThan(500)

    // Wait for React to hydrate
    await page.waitForTimeout(3000)

    // Check for React error boundary / Next.js "Application error" message
    const bodyText = await page.textContent('body')
    expect(bodyText).not.toContain('Application error')
    expect(bodyText).not.toContain('a client-side exception has occurred')
    expect(bodyText).not.toContain('Something went wrong')

    // Check for unhandled JS exceptions
    if (jsErrors.length > 0) {
      // Fail with details about what crashed
      expect(jsErrors).toEqual([])
    }

    // Check for critical console errors (not warnings)
    const criticalErrors = consoleErrors.filter(e =>
      e.includes('is not a function') ||
      e.includes('is not defined') ||
      e.includes('Cannot read properties') ||
      e.includes('Uncaught') ||
      e.includes('Unhandled')
    )
    if (criticalErrors.length > 0) {
      expect(criticalErrors).toEqual([])
    }
  })
}

test.describe('Protected pages redirect to login (not crash)', () => {
  const PROTECTED_PAGES = [
    '/dashboard',
    '/settings',
    '/settings/billing',
    '/profile',
    '/integrations',
  ]

  for (const path of PROTECTED_PAGES) {
    test(`${path} redirects to login without JS errors`, async ({ page }) => {
      const jsErrors = []

      page.on('pageerror', (error) => {
        jsErrors.push(error.message)
      })

      await page.goto(path, { waitUntil: 'domcontentloaded', timeout: 30000 })

      // Should redirect to login (middleware 307)
      expect(page.url()).toContain('/login')

      // Wait for React hydration on login page
      await page.waitForTimeout(3000)

      // Should not crash
      const bodyText = await page.textContent('body')
      expect(bodyText).not.toContain('Application error')
      expect(jsErrors).toEqual([])
    })
  }
})
