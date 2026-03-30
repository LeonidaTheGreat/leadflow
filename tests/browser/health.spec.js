// @ts-check
const { test, expect } = require('@playwright/test')

/**
 * Health & API Browser Tests
 *
 * Verifies the API health endpoint and critical API responses
 * via the browser. Complements the HTTP-only smoke tests by
 * testing through the full browser stack.
 */

test.describe('API Health', () => {
  test('health endpoint returns ok', async ({ page }) => {
    const response = await page.goto('/api/health')
    expect(response?.status()).toBe(200)

    const text = await page.textContent('body')
    const body = JSON.parse(text || '{}')
    expect(body?.status).toBe('ok')
  })

  test('health endpoint reports checks', async ({ page }) => {
    const response = await page.goto('/api/health')
    const text = await page.textContent('body')
    const body = JSON.parse(text || '{}')

    // Should have checks object with connectivity info
    expect(body?.checks).toBeDefined()
  })
})

test.describe('Auth API', () => {
  test('login rejects invalid credentials with proper error', async ({ page }) => {
    const response = await page.request.post('/api/auth/login', {
      data: { email: 'nonexistent@test.com', password: 'badpassword' }
    })

    // Should return 401 or 400, not 500
    expect([400, 401]).toContain(response.status())

    const body = await response.json()
    expect(body.error || body.message).toBeTruthy()
  })

  test('forgot-password accepts any email (anti-enumeration)', async ({ page }) => {
    const response = await page.request.post('/api/auth/forgot-password', {
      data: { email: 'random-nonexistent@test.com' }
    })

    // Should return 200 regardless of email existence
    expect(response.status()).toBe(200)
  })

  test('trial-status returns proper response when unauthenticated', async ({ page }) => {
    const response = await page.request.get('/api/auth/trial-status')

    // Should return 401/403 or 200 with empty data — never 500
    expect([200, 401, 403]).toContain(response.status())
  })
})
