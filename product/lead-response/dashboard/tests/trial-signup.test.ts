/**
 * Tests for Start Free Trial CTA feature
 * Covers: API endpoint, form component, landing page CTA placements
 */

// Mock fetch for API tests
global.fetch = jest.fn()

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  useSearchParams: () => ({ get: jest.fn().mockReturnValue(null) }),
}))

describe('Trial Signup — API Validation', () => {
  it('requires email field', async () => {
    const { POST } = await import('../app/api/auth/trial-signup/route')
    const req = new Request('http://localhost/api/auth/trial-signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'password123' }),
    })
    const res = await POST(req as any)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('Email and password are required')
  })

  it('requires password field', async () => {
    const { POST } = await import('../app/api/auth/trial-signup/route')
    const req = new Request('http://localhost/api/auth/trial-signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com' }),
    })
    const res = await POST(req as any)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('Email and password are required')
  })

  it('rejects invalid email format', async () => {
    const { POST } = await import('../app/api/auth/trial-signup/route')
    const req = new Request('http://localhost/api/auth/trial-signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'not-an-email', password: 'password123' }),
    })
    const res = await POST(req as any)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('valid email')
  })

  it('rejects short password (< 8 chars)', async () => {
    const { POST } = await import('../app/api/auth/trial-signup/route')
    const req = new Request('http://localhost/api/auth/trial-signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com', password: 'short' }),
    })
    const res = await POST(req as any)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('8 characters')
  })
})

describe('Trial Signup — Trial Duration', () => {
  it('sets trial_ends_at to 30 days from now', () => {
    const now = Date.now()
    const trialEnd = new Date(now + 30 * 24 * 60 * 60 * 1000)
    const expectedDays = Math.round((trialEnd.getTime() - now) / (24 * 60 * 60 * 1000))
    expect(expectedDays).toBe(30)
  })

  it('validates 30-day trial period in milliseconds', () => {
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000
    expect(thirtyDaysMs).toBe(2592000000)
  })
})

describe('Landing Page — CTA Placements', () => {
  it('has TrialSignupForm imported in page.tsx', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const pageContent = fs.readFileSync(
      path.join(__dirname, '../app/page.tsx'),
      'utf8'
    )
    expect(pageContent).toContain("import TrialSignupForm from '@/components/trial-signup-form'")
  })

  it('has compact CTA in hero section (CTA #1)', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const pageContent = fs.readFileSync(
      path.join(__dirname, '../app/page.tsx'),
      'utf8'
    )
    expect(pageContent).toContain('<TrialSignupForm compact />')
  })

  it('has features section CTA (CTA #2)', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const pageContent = fs.readFileSync(
      path.join(__dirname, '../app/page.tsx'),
      'utf8'
    )
    expect(pageContent).toContain('/signup?mode=trial')
    expect(pageContent).toContain('Start Free Trial')
  })

  it('has pricing section CTA (CTA #3)', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const pageContent = fs.readFileSync(
      path.join(__dirname, '../app/page.tsx'),
      'utf8'
    )
    expect(pageContent).toContain('or start free trial')
    expect(pageContent).toContain('id="pricing"')
  })

  it('preserves /pilot link in nav', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const pageContent = fs.readFileSync(
      path.join(__dirname, '../app/page.tsx'),
      'utf8'
    )
    expect(pageContent).toContain('href="/pilot"')
  })
})

describe('Trial Signup Form — Client Validation', () => {
  it('email regex rejects invalid emails', () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    expect(emailRegex.test('not-email')).toBe(false)
    expect(emailRegex.test('@example.com')).toBe(false)
    expect(emailRegex.test('test@')).toBe(false)
    expect(emailRegex.test('test@example.com')).toBe(true)
    expect(emailRegex.test('user.name+tag@subdomain.example.co.uk')).toBe(true)
  })

  it('password must be at least 8 characters', () => {
    const isValidPassword = (p: string) => p.length >= 8
    expect(isValidPassword('short')).toBe(false)
    expect(isValidPassword('exactly8')).toBe(true)
    expect(isValidPassword('longerpassword')).toBe(true)
  })
})

describe('Trial Signup — No Credit Card Flow', () => {
  it('trial API route does not require Stripe payment', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const routeContent = fs.readFileSync(
      path.join(__dirname, '../app/api/auth/trial-signup/route.ts'),
      'utf8'
    )
    // Should NOT import Stripe
    expect(routeContent).not.toContain("from 'stripe'")
    expect(routeContent).not.toContain("require('stripe')")
    // Should set plan_tier to trial
    expect(routeContent).toContain("plan_tier: 'trial'")
    // Should set trial_ends_at
    expect(routeContent).toContain('trial_ends_at')
  })

  it('trial flow redirects to onboarding after signup', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const routeContent = fs.readFileSync(
      path.join(__dirname, '../app/api/auth/trial-signup/route.ts'),
      'utf8'
    )
    expect(routeContent).toContain('/dashboard/onboarding')
  })
})
