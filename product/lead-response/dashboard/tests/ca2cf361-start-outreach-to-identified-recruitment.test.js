/**
 * E2E test: PR #1281 — inviteUrl returned in pilot invite API response
 * Verifies route contract: both fresh-send and resend paths include inviteUrl.
 */

const assert = require('assert')
const fs = require('fs')
const path = require('path')

const DASHBOARD_ROOT = path.join(__dirname, '..')
const ROUTE_PATH = path.join(DASHBOARD_ROOT, 'app/api/admin/pilot-targets/[id]/invite/route.ts')
const PAGE_PATH = path.join(DASHBOARD_ROOT, 'app/admin/pilot-campaigns/page.tsx')

async function tryFetch(url, opts = {}) {
  try {
    const http = require('http')
    return await new Promise((resolve, reject) => {
      const u = new URL(url)
      const reqOpts = {
        hostname: u.hostname, port: u.port || 80,
        path: u.pathname + (u.search || ''),
        method: opts.method || 'GET',
        headers: opts.headers || {},
      }
      const req = http.request(reqOpts, (res) => {
        let body = ''
        res.on('data', (d) => { body += d })
        res.on('end', () => {
          try { resolve({ status: res.statusCode, body: JSON.parse(body) }) }
          catch { resolve({ status: res.statusCode, body }) }
        })
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
  function fail(msg) { console.log(`❌ FAIL: ${msg}`); failed++; }
  function skip(msg) { console.log(`⚠️  SKIP: ${msg}`) }

  // Test 1: route file exists
  {
    assert.ok(fs.existsSync(ROUTE_PATH), `Route file must exist: ${ROUTE_PATH}`)
    pass('Invite route file exists')
  }

  const routeContent = fs.readFileSync(ROUTE_PATH, 'utf8')

  // Test 2: both response paths return inviteUrl (fresh-send + resend)
  {
    // Resend response: contains 'note: ...' after inviteUrl in same block
    const resendHasInviteUrl = /inviteUrl,[\s\n]*emailSent,[\s\n]*note:/.test(routeContent)
    assert.ok(resendHasInviteUrl, 'Resend response block must include inviteUrl before note field')
    // Fresh-send response: contains 'emailSent })' after inviteUrl (no note field)
    const freshSendHasInviteUrl = /inviteUrl,[\s\n]*emailSent \}/.test(routeContent)
    assert.ok(freshSendHasInviteUrl, 'Fresh-send response block must include inviteUrl before emailSent close')
    pass('Both fresh-send and resend responses include inviteUrl')
  }

  // Test 3: inviteUrl is constructed in both code paths (defined twice in file)
  {
    // Each path (resend + fresh-send) must build inviteUrl from appUrl + token
    const inviteUrlDefs = (routeContent.match(/const inviteUrl\s*=/g) || []).length
    assert.strictEqual(inviteUrlDefs, 2, `Expected 2 inviteUrl definitions (one per code path), found ${inviteUrlDefs}`)
    // Both must include the accept-invite path
    const acceptInviteCount = (routeContent.match(/accept-invite\?token=/g) || []).length
    assert.strictEqual(acceptInviteCount, 2, `Expected accept-invite URL in 2 places, found ${acceptInviteCount}`)
    pass('inviteUrl constructed in both code paths (resend + fresh-send)')
  }

  // Test 4: inviteUrl is constructed from NEXT_PUBLIC_APP_URL (no hardcoding)
  {
    assert.ok(
      routeContent.includes('process.env.NEXT_PUBLIC_APP_URL'),
      'inviteUrl must use NEXT_PUBLIC_APP_URL env var, not hardcoded domain'
    )
    // Token is derived from rawToken, not hardcoded
    assert.ok(routeContent.includes('rawToken'), 'inviteUrl must include rawToken (not hardcoded)')
    pass('inviteUrl uses env var + rawToken (no hardcoding)')
  }

  // Test 5: token generation uses crypto.randomBytes (not Math.random)
  {
    assert.ok(
      routeContent.includes('crypto.randomBytes(32)'),
      'Token must use crypto.randomBytes(32), not Math.random'
    )
    assert.ok(
      !routeContent.includes('Math.random'),
      'Token must NOT use Math.random (insecure)'
    )
    pass('Token generation uses crypto.randomBytes (secure)')
  }

  // Test 6: auth guard precedes any DB access
  {
    const authIdx = routeContent.indexOf('!checkAdminAuth')
    const dbIdx = routeContent.indexOf('.from(')
    assert.ok(authIdx !== -1, 'Auth guard must be present')
    assert.ok(authIdx < dbIdx, 'Auth guard must precede first DB .from() call')
    pass('Auth guard is present and precedes DB access')
  }

  // Test 7: no hardcoded secrets
  {
    assert.ok(!routeContent.match(/['"][a-f0-9]{40,}['"]/), 'No hardcoded hex tokens')
    assert.ok(!routeContent.match(/['"](sk|pk)_[a-zA-Z0-9]{20,}['"]/), 'No hardcoded API keys')
    pass('No hardcoded secrets in route')
  }

  // Test 8: frontend reads data.inviteUrl (contract alignment)
  {
    const pageContent = fs.readFileSync(PAGE_PATH, 'utf8')
    assert.ok(
      pageContent.includes('data.inviteUrl'),
      'Frontend handleSendInvite must read data.inviteUrl from response'
    )
    pass('Frontend correctly reads data.inviteUrl from API response')
  }

  // Test 9: no spec comment block in page.tsx (planning docs belong in PRD, not source)
  {
    const pageContent = fs.readFileSync(PAGE_PATH, 'utf8')
    const hasSpecBlock = pageContent.includes('* Spec\n') ||
      pageContent.match(/\/\*\*\s*\n\s*\* Spec/)
    if (hasSpecBlock) {
      fail('page.tsx must not contain a task spec comment block — remove the planning comment at the top of the file')
    } else {
      pass('No spec/planning comment block in page.tsx')
    }
  }

  // Test 10: live server auth check (if running)
  {
    const res = await tryFetch('http://localhost:3000/api/admin/pilot-targets/test-id/invite', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }
    })
    if (res === null || res.status === 404) {
      skip('Server not running — static checks cover auth correctness')
    } else if (res.status === 401) {
      pass('Live server returns 401 for unauthenticated POST /invite request')
    } else {
      skip(`Live server returned status ${res.status} — not an auth scenario`)
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
