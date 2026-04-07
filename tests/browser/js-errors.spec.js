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
 */

const AUTH_EMAIL =
  process.env.PLAYWRIGHT_TEST_EMAIL ||
  process.env.TEST_USER_EMAIL ||
  process.env.E2E_TEST_EMAIL
const AUTH_PASSWORD =
  process.env.PLAYWRIGHT_TEST_PASSWORD ||
  process.env.TEST_USER_PASSWORD ||
  process.env.E2E_TEST_PASSWORD

const PUBLIC_PAGES = [
  { path: '/', name: 'Landing Page' },
  { path: '/login', name: 'Login' },
  { path: '/signup', name: 'Signup' },
  { path: '/signup/pilot', name: 'Pilot Signup' },
  { path: '/signup/trial', name: 'Trial Signup' },
  { path: '/pricing', name: 'Pricing' },
  { path: '/forgot-password', name: 'Forgot Password' },
]

async function loginAsTestUser(page) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('#email', { timeout: 15000 })

  await page.fill('#email', AUTH_EMAIL)
  await page.fill('#password', AUTH_PASSWORD)

  await Promise.all([
    page.waitForURL('**/dashboard**', { timeout: 30000 }),
    page.getByRole('button', { name: /sign in/i }).click(),
  ])
}

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
        // Filter out known noise (network failures, third-party scripts, Vercel internals)
        if (
          text.includes('favicon') ||
          text.includes('gtag') ||
          text.includes('analytics') ||
          text.includes('Failed to load resource') ||
          text.includes('net::ERR_') ||
          text.includes('ERR_NAME_NOT_RESOLVED')
        ) return
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

test.describe('Authenticated dashboard pages have no JS/runtime errors', () => {
  test.skip(!AUTH_EMAIL || !AUTH_PASSWORD, 'Missing test auth credentials in env')

  const AUTH_PAGES = [
    '/dashboard',
    '/dashboard/leads',
    '/dashboard/settings',
    '/dashboard/pricing',
    '/dashboard/simulator',
  ]

  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page)
  })

  for (const path of AUTH_PAGES) {
    test(`${path} has no console errors, JS crashes, or 500/403 responses`, async ({ page, baseURL }) => {
      const jsErrors = []
      const consoleErrors = []
      const badResponses = []
      const appOrigin = baseURL ? new URL(baseURL).origin : null

      page.on('pageerror', (error) => {
        jsErrors.push(error.message)
      })

      page.on('console', (msg) => {
        if (msg.type() !== 'error') return
        const text = msg.text()
        if (
          text.includes('favicon') ||
          text.includes('gtag') ||
          text.includes('analytics') ||
          text.includes('Failed to load resource') ||
          text.includes('net::ERR_') ||
          text.includes('ERR_NAME_NOT_RESOLVED')
        ) return
        consoleErrors.push(text)
      })

      page.on('response', (response) => {
        const status = response.status()
        const responseUrl = response.url()
        const sameOrigin = appOrigin ? responseUrl.startsWith(appOrigin) : true

        if (sameOrigin && (status === 403 || status >= 500)) {
          badResponses.push(`${status} ${responseUrl}`)
        }
      })

      const response = await page.goto(path, { waitUntil: 'domcontentloaded', timeout: 30000 })
      expect(response?.status()).toBeLessThan(500)

      await page.waitForTimeout(3000)

      const bodyText = await page.textContent('body')
      expect(bodyText).not.toContain('Application error')
      expect(bodyText).not.toContain('a client-side exception has occurred')
      expect(bodyText).not.toContain('Something went wrong')

      await expect(page.locator('main')).toBeVisible({ timeout: 15000 })

      expect(jsErrors).toEqual([])
      expect(badResponses).toEqual([])

      const criticalErrors = consoleErrors.filter(e =>
        e.includes('is not a function') ||
        e.includes('is not defined') ||
        e.includes('Cannot read properties') ||
        e.includes('Uncaught') ||
        e.includes('Unhandled')
      )
      expect(criticalErrors).toEqual([])
    })
  }
})
