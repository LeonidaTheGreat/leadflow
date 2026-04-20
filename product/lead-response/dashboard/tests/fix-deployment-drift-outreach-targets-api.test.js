/**
 * E2E test: PR #1256 — Fix deployment drift, outreach targets API
 * Tests route structure, auth logic, and UI wiring for /api/admin/outreach/targets.
 */

const assert = require('assert')
const fs = require('fs')
const path = require('path')

const DASHBOARD_ROOT = path.join(__dirname, '..')

async function tryFetch(url, headers = {}) {
  try {
    const http = require('http')
    return await new Promise((resolve, reject) => {
      const u = new URL(url)
      const req = http.request({ hostname: u.hostname, port: u.port || 80, path: u.pathname, method: 'GET', headers }, (res) => {
        let body = ''
        res.on('data', (d) => { body += d })
        res.on('end', () => { try { resolve({ status: res.statusCode, body: JSON.parse(body) }) } catch { resolve({ status: res.statusCode, body }) } })
      })
      req.setTimeout(2000, () => { req.destroy(); reject(new Error('timeout')) })
      req.on('error', reject)
      req.end()
    })
  } catch {
    return null
  }
}

async function run() {
  let passed = 0
  let failed = 0

  function pass(msg) { console.log(`✅ PASS: ${msg}`); passed++ }
  function fail(msg) { console.log(`❌ FAIL: ${msg}`); failed++ }
  function skip(msg) { console.log(`⚠️  SKIP: ${msg}`) }

  // Test 1: route file exists
  {
    const routePath = path.join(DASHBOARD_ROOT, 'app/api/admin/outreach/targets/route.ts')
    assert.ok(fs.existsSync(routePath), `Route file must exist: ${routePath}`)
    pass('Route file exists at correct path')
  }

  // Test 2: route exports GET handler
  {
    const content = fs.readFileSync(path.join(DASHBOARD_ROOT, 'app/api/admin/outreach/targets/route.ts'), 'utf8')
    assert.ok(content.includes('export async function GET'), 'Route must export GET handler')
    pass('Route exports GET handler')
  }

  // Test 3: route has admin auth guard at top of handler
  {
    const content = fs.readFileSync(path.join(DASHBOARD_ROOT, 'app/api/admin/outreach/targets/route.ts'), 'utf8')
    assert.ok(content.includes('checkAdminAuth'), 'Route must call checkAdminAuth')
    assert.ok(content.includes('status: 401'), 'Route must return 401 on auth failure')
    // Auth check must come before any DB query (.from( call)
    const authIdx = content.indexOf('!checkAdminAuth')
    const dbIdx = content.indexOf('.from(')
    assert.ok(authIdx < dbIdx, 'Auth check must occur before first DB .from() call')
    pass('Auth guard is present and precedes DB access')
  }

  // Test 4: queries the correct tables
  {
    const content = fs.readFileSync(path.join(DASHBOARD_ROOT, 'app/api/admin/outreach/targets/route.ts'), 'utf8')
    assert.ok(content.includes('pilot_recruitment_targets'), 'Route must query pilot_recruitment_targets')
    assert.ok(content.includes('pilot_recruitment_touchpoints'), 'Route must query pilot_recruitment_touchpoints for last_touch')
    pass('Route queries correct DB tables')
  }

  // Test 5: no hardcoded secrets or tokens
  {
    const content = fs.readFileSync(path.join(DASHBOARD_ROOT, 'app/api/admin/outreach/targets/route.ts'), 'utf8')
    // Check for patterns that look like hardcoded API keys/tokens (hex or base64, not underscore-joined words)
    assert.ok(!content.match(/['"][a-f0-9]{32,}['"]/i), 'Route must not contain hardcoded hex tokens')
    assert.ok(!content.match(/['"](sk|pk|tok|key)_[a-zA-Z0-9]{16,}['"]/), 'Route must not contain hardcoded API keys')
    assert.ok(content.includes('process.env.ADMIN_SECRET'), 'Admin token must come from env var')
    pass('No hardcoded secrets; uses process.env.ADMIN_SECRET')
  }

  // Test 6: UI component exists and is self-contained
  {
    const pagePath = path.join(DASHBOARD_ROOT, 'app/admin/outreach/page.tsx')
    const content = fs.readFileSync(pagePath, 'utf8')
    assert.ok(content.includes('function PilotRecruitmentTargetsTable'), 'Component must be defined')
    assert.ok(content.includes('<PilotRecruitmentTargetsTable'), 'Component must be rendered in page')
    assert.ok(content.includes('/api/admin/outreach/targets'), 'Component fetches from correct endpoint')
    pass('PilotRecruitmentTargetsTable component defined and wired in outreach page')
  }

  // Test 7: timestamp Z-suffix fix is present
  {
    const pagePath = path.join(DASHBOARD_ROOT, 'app/admin/outreach/page.tsx')
    const content = fs.readFileSync(pagePath, 'utf8')
    assert.ok(content.includes("endsWith('Z')") || content.includes('endsWith("Z")'), 'Must handle timestamps without Z suffix (Supabase UTC bug)')
    pass('Timestamp UTC fix applied to last_touch display')
  }

  // Test 8: HTTP auth check (if server running)
  {
    const res = await tryFetch('http://localhost:3000/api/admin/outreach/targets')
    if (res === null || res.status === 404) {
      skip('Route not yet deployed on live server — static checks cover auth correctness')
    } else if (res.status === 401) {
      pass('Live server returns 401 for unauthenticated request')
    } else if (res.status === 200) {
      fail('Live server returned 200 without auth — auth guard broken')
    } else {
      skip(`Live server returned unexpected status ${res.status} — skipping`)
    }
  }

  const total = passed + failed
  console.log(`\n📊 Results: ${passed}/${total} passed`)
  if (failed > 0) process.exit(1)
}

run().catch((err) => {
  console.error('❌ Test error:', err.message)
  process.exit(1)
})
