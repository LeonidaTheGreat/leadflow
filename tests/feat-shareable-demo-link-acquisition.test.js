/**
 * Tests for: Shareable Demo Link — Zero-Friction Agent Acquisition Tool
 * UC: feat-shareable-demo-link-acquisition
 *
 * AC-1: GET /demo/[token] returns page with AI conversation simulation (no login required)
 * AC-2: POST /api/admin/demo-links creates valid token and URL
 * AC-3: CTA links to /signup/trial with utm_source=demo_link and utm_content=[token]
 * AC-4: demo_tokens table tracks view count
 * AC-5: Invalid token shows 404-like page with link to /signup
 */

const fs = require('fs')
const path = require('path')

const DASHBOARD_ROOT = path.join(__dirname, '..', 'product', 'lead-response', 'dashboard')

// ─── AC-1: /demo/[token] page exists and is public ─────────────────────────

describe('AC-1: GET /demo/[token] page exists', () => {
  const pagePath = path.join(DASHBOARD_ROOT, 'app', 'demo', '[token]', 'page.tsx')

  test('page file exists', () => {
    expect(fs.existsSync(pagePath)).toBe(true)
  })

  test('page is a client component (no login required)', () => {
    const content = fs.readFileSync(pagePath, 'utf8')
    expect(content).toMatch(/'use client'/)
  })

  test('page renders AI conversation simulation', () => {
    const content = fs.readFileSync(pagePath, 'utf8')
    // Should have scripted conversation messages
    expect(content).toContain('DEMO_CONVERSATION')
    // Should have chat bubbles
    expect(content).toContain('ChatBubble')
    // Should have both lead and AI roles
    expect(content).toMatch(/role:\s*'lead'/)
    expect(content).toMatch(/role:\s*'ai'/)
  })

  test('page uses token param from URL', () => {
    const content = fs.readFileSync(pagePath, 'utf8')
    expect(content).toContain('useParams')
    expect(content).toContain('params.token')
  })

  test('/demo/[token] is NOT a protected route in middleware', () => {
    const middlewarePath = path.join(DASHBOARD_ROOT, 'middleware.ts')
    const content = fs.readFileSync(middlewarePath, 'utf8')
    // /demo should not appear in PROTECTED_ROUTES
    expect(content).not.toMatch(/['"]\/demo['"]/)
  })
})

// ─── AC-2: POST /api/admin/demo-links endpoint ─────────────────────────────

describe('AC-2: POST /api/admin/demo-links creates token and URL', () => {
  const routePath = path.join(DASHBOARD_ROOT, 'app', 'api', 'admin', 'demo-links', 'route.ts')

  test('route file exists', () => {
    expect(fs.existsSync(routePath)).toBe(true)
  })

  test('route exports POST handler', () => {
    const content = fs.readFileSync(routePath, 'utf8')
    expect(content).toMatch(/export async function POST/)
  })

  test('generates a short token using crypto', () => {
    const content = fs.readFileSync(routePath, 'utf8')
    expect(content).toContain('crypto.getRandomValues')
    expect(content).toContain('generateShortToken')
  })

  test('inserts into demo_tokens table', () => {
    const content = fs.readFileSync(routePath, 'utf8')
    expect(content).toContain("from('demo_tokens')")
    expect(content).toContain('.insert(')
  })

  test('returns token and url in response', () => {
    const content = fs.readFileSync(routePath, 'utf8')
    expect(content).toContain('token: data.token')
    expect(content).toContain('/demo/')
  })

  test('sets token expiry to 7 days', () => {
    const content = fs.readFileSync(routePath, 'utf8')
    expect(content).toMatch(/7\s*\*\s*24\s*\*\s*60\s*\*\s*60\s*\*\s*1000/)
  })
})

// ─── AC-3: CTA links to /signup/trial with UTM params ──────────────────────

describe('AC-3: CTA preserves utm_source=demo_link and utm_content=[token]', () => {
  const pagePath = path.join(DASHBOARD_ROOT, 'app', 'demo', '[token]', 'page.tsx')

  test('signup URL includes utm_source=demo_link', () => {
    const content = fs.readFileSync(pagePath, 'utf8')
    expect(content).toContain('utm_source=demo_link')
  })

  test('signup URL includes utm_content with token', () => {
    const content = fs.readFileSync(pagePath, 'utf8')
    expect(content).toContain('utm_content=')
    expect(content).toContain('token')
  })

  test('CTA links to /signup/trial', () => {
    const content = fs.readFileSync(pagePath, 'utf8')
    expect(content).toContain('/signup/trial')
  })

  test('page has Start Free Trial CTA', () => {
    const content = fs.readFileSync(pagePath, 'utf8')
    expect(content).toContain('Start Free Trial')
  })
})

// ─── AC-4: demo_tokens tracks view count ────────────────────────────────────

describe('AC-4: demo_tokens view count tracking', () => {
  const routePath = path.join(DASHBOARD_ROOT, 'app', 'api', 'admin', 'demo-links', 'route.ts')

  test('PATCH handler exists for view count increment', () => {
    const content = fs.readFileSync(routePath, 'utf8')
    expect(content).toMatch(/export async function PATCH/)
  })

  test('PATCH increments view_count field', () => {
    const content = fs.readFileSync(routePath, 'utf8')
    expect(content).toContain('view_count')
    expect(content).toContain('.update(')
  })

  test('demo page calls PATCH to increment views', () => {
    const pagePath = path.join(DASHBOARD_ROOT, 'app', 'demo', '[token]', 'page.tsx')
    const content = fs.readFileSync(pagePath, 'utf8')
    expect(content).toContain('/api/admin/demo-links')
    expect(content).toContain('PATCH')
  })

  test('migration script exists for view_count column', () => {
    const migrationPath = path.join(__dirname, '..', 'scripts', 'db', 'add-demo-token-columns.sql')
    expect(fs.existsSync(migrationPath)).toBe(true)
    const content = fs.readFileSync(migrationPath, 'utf8')
    expect(content).toContain('view_count')
    expect(content).toContain('agent_context')
  })
})

// ─── AC-5: Invalid token returns 404-like page with link to /signup ─────────

describe('AC-5: Invalid token shows error with signup link', () => {
  const pagePath = path.join(DASHBOARD_ROOT, 'app', 'demo', '[token]', 'page.tsx')

  test('page handles invalid state', () => {
    const content = fs.readFileSync(pagePath, 'utf8')
    expect(content).toContain("'invalid'")
    expect(content).toContain('Link Not Found')
  })

  test('invalid token page links to /signup/trial', () => {
    const content = fs.readFileSync(pagePath, 'utf8')
    // In the invalid state, there should be a link to signup
    expect(content).toContain('/signup/trial')
  })

  test('page validates token via existing demo-link API', () => {
    const content = fs.readFileSync(pagePath, 'utf8')
    expect(content).toContain('/api/admin/demo-link')
    expect(content).toContain('validateToken')
  })
})

// ─── ROI Card content ───────────────────────────────────────────────────────

describe('ROI Card displays key metrics', () => {
  const pagePath = path.join(DASHBOARD_ROOT, 'app', 'demo', '[token]', 'page.tsx')

  test('shows response time comparison', () => {
    const content = fs.readFileSync(pagePath, 'utf8')
    expect(content).toContain('28 seconds')
    expect(content).toContain('4 hours')
  })

  test('shows appointment conversion stat', () => {
    const content = fs.readFileSync(pagePath, 'utf8')
    expect(content).toContain('3 leads like this')
    expect(content).toContain('1 appointment per week')
  })
})
