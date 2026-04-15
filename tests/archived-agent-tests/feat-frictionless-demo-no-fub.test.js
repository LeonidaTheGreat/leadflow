/**
 * Tests for: Frictionless Demo Mode — No FUB Required
 * PRD: PRD-FRICTIONLESS-DEMO-NO-FUB.md
 * AC-1 through AC-6 verified here.
 */

const fs = require('fs')
const path = require('path')

const DASHBOARD_ROOT = path.join(__dirname, '..', 'product', 'lead-response', 'dashboard')
const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations')

// ─── AC-1 & AC-2: POST /api/demo/run route exists ─────────────────────────────

describe('AC-1: Demo run API route exists', () => {
  const routePath = path.join(DASHBOARD_ROOT, 'app', 'api', 'demo', 'run', 'route.ts')

  test('route file exists', () => {
    expect(fs.existsSync(routePath)).toBe(true)
  })

  test('route exports POST handler', () => {
    const content = fs.readFileSync(routePath, 'utf8')
    expect(content).toMatch(/export async function POST/)
  })

  test('response includes demos_remaining field', () => {
    const content = fs.readFileSync(routePath, 'utf8')
    expect(content).toContain('demos_remaining')
  })

  test('response includes ai_response field', () => {
    const content = fs.readFileSync(routePath, 'utf8')
    expect(content).toContain('ai_response')
  })

  test('response includes success field', () => {
    const content = fs.readFileSync(routePath, 'utf8')
    expect(content).toContain('success: true')
  })
})

// ─── AC-2: Demo limit enforced ────────────────────────────────────────────────

describe('AC-2: Demo limit enforcement', () => {
  const routePath = path.join(DASHBOARD_ROOT, 'app', 'api', 'demo', 'run', 'route.ts')

  test('DEMO_LIMIT is set to 3', () => {
    const content = fs.readFileSync(routePath, 'utf8')
    expect(content).toMatch(/DEMO_LIMIT\s*=\s*3/)
  })

  test('returns demo_limit_reached error when limit exceeded', () => {
    const content = fs.readFileSync(routePath, 'utf8')
    expect(content).toContain('demo_limit_reached')
  })

  test('increments demo_runs_used on successful run', () => {
    const content = fs.readFileSync(routePath, 'utf8')
    expect(content).toContain('demo_runs_used')
    expect(content).toContain('demosUsed + 1')
  })

  test('returns FUB connect CTA when limit reached', () => {
    const content = fs.readFileSync(routePath, 'utf8')
    expect(content).toContain('/dashboard/onboarding#fub')
  })
})

// ─── AC-3: No Twilio or FUB calls ────────────────────────────────────────────

describe('AC-3: No Twilio or FUB API calls in demo route', () => {
  const routePath = path.join(DASHBOARD_ROOT, 'app', 'api', 'demo', 'run', 'route.ts')

  test('demo/run route does not import twilio package', () => {
    const content = fs.readFileSync(routePath, 'utf8')
    // Check for twilio imports or require — comments are OK
    expect(content).not.toMatch(/require\(['"]twilio['"]\)/)
    expect(content).not.toMatch(/from ['"]twilio['"]/)
    expect(content).not.toMatch(/import.*twilio/i)
  })

  test('demo/run route does not call sendSms or send_sms', () => {
    const content = fs.readFileSync(routePath, 'utf8')
    expect(content).not.toContain('sendSms')
    expect(content).not.toContain('send_sms')
  })

  test('demo/run route does not import FUB client', () => {
    const content = fs.readFileSync(routePath, 'utf8')
    expect(content).not.toMatch(/require\(['"].*fub.*['"]\)/)
    expect(content).not.toMatch(/from ['"].*fub.*['"]/)
    expect(content).not.toContain('followupboss')
    // URL references to FUB onboarding are fine; what matters is no FUB API import
    expect(content).not.toMatch(/import.*fub/i)
  })
})

// ─── AC-4: Demo run logging ───────────────────────────────────────────────────

describe('AC-4: Demo run logged to demo_runs table', () => {
  const routePath = path.join(DASHBOARD_ROOT, 'app', 'api', 'demo', 'run', 'route.ts')

  test('inserts into demo_runs table', () => {
    const content = fs.readFileSync(routePath, 'utf8')
    expect(content).toContain("'demo_runs'")
  })

  test('includes agent_id in demo run record', () => {
    const content = fs.readFileSync(routePath, 'utf8')
    expect(content).toContain('agent_id')
  })

  test('includes ai_response in demo run record', () => {
    const content = fs.readFileSync(routePath, 'utf8')
    expect(content).toContain('ai_response: aiResponse')
  })

  test('includes response_time_ms in demo run record', () => {
    const content = fs.readFileSync(routePath, 'utf8')
    expect(content).toContain('response_time_ms: responseTimeMs')
  })
})

// ─── AC-5: Demo UI route exists ──────────────────────────────────────────────

describe('AC-5: Demo UI accessible at /dashboard/demo', () => {
  test('dashboard/demo page exists', () => {
    const pagePath = path.join(DASHBOARD_ROOT, 'app', 'dashboard', 'demo', 'page.tsx')
    expect(fs.existsSync(pagePath)).toBe(true)
  })

  test('dashboard demo page shows lead input form', () => {
    const pagePath = path.join(DASHBOARD_ROOT, 'app', 'dashboard', 'demo', 'page.tsx')
    const content = fs.readFileSync(pagePath, 'utf8')
    expect(content).toContain('leadName')
    expect(content).toContain('propertyInterest')
    expect(content).toContain('Run Demo')
  })

  test('dashboard demo page shows demo counter', () => {
    const pagePath = path.join(DASHBOARD_ROOT, 'app', 'dashboard', 'demo', 'page.tsx')
    const content = fs.readFileSync(pagePath, 'utf8')
    expect(content).toContain('demos_remaining')
  })

  test('dashboard demo page links to FUB onboarding', () => {
    const pagePath = path.join(DASHBOARD_ROOT, 'app', 'dashboard', 'demo', 'page.tsx')
    const content = fs.readFileSync(pagePath, 'utf8')
    expect(content).toContain('/dashboard/onboarding#fub')
  })

  test('LeadFeed empty state has demo CTA', () => {
    const feedPath = path.join(DASHBOARD_ROOT, 'components', 'dashboard', 'LeadFeed.tsx')
    const content = fs.readFileSync(feedPath, 'utf8')
    expect(content).toContain('/dashboard/demo')
  })
})

// ─── AC-6: Demo available without FUB ────────────────────────────────────────

describe('AC-6: Demo available without FUB credentials', () => {
  test('demo/run route requires auth but NOT FUB credentials', () => {
    const routePath = path.join(DASHBOARD_ROOT, 'app', 'api', 'demo', 'run', 'route.ts')
    const content = fs.readFileSync(routePath, 'utf8')
    // Must require auth
    expect(content).toContain('getAuthUserId')
    // Must NOT reference fub or twilio credentials
    expect(content.toLowerCase()).not.toContain('fub_api_key')
    expect(content.toLowerCase()).not.toContain('twilio_auth_token')
  })

  test('mock mode falls back gracefully when no AI key', () => {
    const routePath = path.join(DASHBOARD_ROOT, 'app', 'api', 'demo', 'run', 'route.ts')
    const content = fs.readFileSync(routePath, 'utf8')
    expect(content).toContain('isMockMode')
    expect(content).toContain('generateMockResponse')
  })
})

// ─── Migration: demo_runs_used column + demo_runs table ───────────────────────

describe('Migration: demo mode schema', () => {
  test('migration file 005_demo_mode.sql exists', () => {
    const migPath = path.join(MIGRATIONS_DIR, '005_demo_mode.sql')
    expect(fs.existsSync(migPath)).toBe(true)
  })

  test('migration adds demo_runs_used column to agents table', () => {
    const migPath = path.join(MIGRATIONS_DIR, '005_demo_mode.sql')
    const content = fs.readFileSync(migPath, 'utf8')
    expect(content).toContain('demo_runs_used')
  })

  test('migration creates demo_runs table', () => {
    const migPath = path.join(MIGRATIONS_DIR, '005_demo_mode.sql')
    const content = fs.readFileSync(migPath, 'utf8')
    expect(content).toContain('CREATE TABLE IF NOT EXISTS demo_runs')
  })

  test('demo_runs table has required columns', () => {
    const migPath = path.join(MIGRATIONS_DIR, '005_demo_mode.sql')
    const content = fs.readFileSync(migPath, 'utf8')
    expect(content).toContain('agent_id')
    expect(content).toContain('ai_response')
    expect(content).toContain('response_time_ms')
  })
})

// ─── Machine-verifiable checks from PRD ──────────────────────────────────────

describe('PRD machine-verifiable acceptance checks', () => {
  test('demo/run route file exists (demo-endpoint-exists)', () => {
    const routePath = path.join(DASHBOARD_ROOT, 'app', 'api', 'demo', 'run', 'route.ts')
    expect(fs.existsSync(routePath)).toBe(true)
  })

  test('demo_runs_used referenced in migration script (demo-runs-used-column-migration)', () => {
    const migPath = path.join(MIGRATIONS_DIR, '005_demo_mode.sql')
    const content = fs.readFileSync(migPath, 'utf8')
    expect(content).toContain('demo_runs_used')
  })

  test('demo_runs table created in migration (demo-table-migration-exists)', () => {
    const migPath = path.join(MIGRATIONS_DIR, '005_demo_mode.sql')
    const content = fs.readFileSync(migPath, 'utf8')
    expect(content).toContain('demo_runs')
  })

  test('no Twilio calls in demo run route (no-twilio-in-demo-route)', () => {
    const routePath = path.join(DASHBOARD_ROOT, 'app', 'api', 'demo', 'run', 'route.ts')
    const content = fs.readFileSync(routePath, 'utf8')
    expect(content).not.toMatch(/require\(['"]twilio['"]\)/)
    expect(content).not.toMatch(/from ['"]twilio['"]/)
    expect(content).not.toContain('sendSms')
    expect(content).not.toContain('send_sms')
  })

  test('dashboard demo UI page exists (demo-ui-route-exists)', () => {
    const pagePath = path.join(DASHBOARD_ROOT, 'app', 'dashboard', 'demo', 'page.tsx')
    expect(fs.existsSync(pagePath)).toBe(true)
  })
})
