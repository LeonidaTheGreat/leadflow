# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: health.spec.js >> API Health >> health endpoint returns ok
- Location: tests/browser/health.spec.js:13:3

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 200
Received: 503
```

# Page snapshot

```yaml
- generic [ref=e2]: "{\"status\":\"degraded\",\"checks\":{\"NEXT_PUBLIC_API_URL\":{\"ok\":true,\"detail\":\"set\"},\"NEXT_PUBLIC_API_KEY\":{\"ok\":true,\"detail\":\"set\"},\"API_SECRET_KEY\":{\"ok\":true,\"detail\":\"set\"},\"RESEND_API_KEY\":{\"ok\":true,\"detail\":\"set\"},\"NEXT_PUBLIC_SUPABASE_URL\":{\"ok\":true,\"detail\":\"set\"},\"NEXT_PUBLIC_SUPABASE_ANON_KEY\":{\"ok\":true,\"detail\":\"set\"},\"SUPABASE_SERVICE_ROLE_KEY\":{\"ok\":true,\"detail\":\"set\"},\"supabase_connectivity\":{\"ok\":true,\"detail\":\"connected\"},\"api_connectivity\":{\"ok\":false,\"detail\":\"HTTP 403\"}},\"errors\":[\"api_connectivity: HTTP 403\"]}"
```

# Test source

```ts
  1  | // @ts-check
  2  | const { test, expect } = require('@playwright/test')
  3  | 
  4  | /**
  5  |  * Health & API Browser Tests
  6  |  *
  7  |  * Verifies the API health endpoint and critical API responses
  8  |  * via the browser. Complements the HTTP-only smoke tests by
  9  |  * testing through the full browser stack.
  10 |  */
  11 | 
  12 | test.describe('API Health', () => {
  13 |   test('health endpoint returns ok', async ({ page }) => {
  14 |     const response = await page.goto('/api/health')
> 15 |     expect(response?.status()).toBe(200)
     |                                ^ Error: expect(received).toBe(expected) // Object.is equality
  16 | 
  17 |     const text = await page.textContent('body')
  18 |     const body = JSON.parse(text || '{}')
  19 |     expect(body?.status).toBe('ok')
  20 |   })
  21 | 
  22 |   test('health endpoint reports checks', async ({ page }) => {
  23 |     const response = await page.goto('/api/health')
  24 |     const text = await page.textContent('body')
  25 |     const body = JSON.parse(text || '{}')
  26 | 
  27 |     // Should have checks object with connectivity info
  28 |     expect(body?.checks).toBeDefined()
  29 |   })
  30 | })
  31 | 
  32 | test.describe('Auth API', () => {
  33 |   test('login rejects invalid credentials with proper error', async ({ page }) => {
  34 |     const response = await page.request.post('/api/auth/login', {
  35 |       data: { email: 'nonexistent@test.com', password: 'badpassword' }
  36 |     })
  37 | 
  38 |     // Should return 401 or 400, not 500
  39 |     expect([400, 401]).toContain(response.status())
  40 | 
  41 |     const body = await response.json()
  42 |     expect(body.error || body.message).toBeTruthy()
  43 |   })
  44 | 
  45 |   test('forgot-password accepts any email (anti-enumeration)', async ({ page }) => {
  46 |     const response = await page.request.post('/api/auth/forgot-password', {
  47 |       data: { email: 'random-nonexistent@test.com' }
  48 |     })
  49 | 
  50 |     // Should return 200 regardless of email existence
  51 |     expect(response.status()).toBe(200)
  52 |   })
  53 | 
  54 |   test('trial-status returns proper response when unauthenticated', async ({ page }) => {
  55 |     const response = await page.request.get('/api/auth/trial-status')
  56 | 
  57 |     // Should return 401/403 or 200 with empty data — never 500
  58 |     expect([200, 401, 403]).toContain(response.status())
  59 |   })
  60 | })
  61 | 
```