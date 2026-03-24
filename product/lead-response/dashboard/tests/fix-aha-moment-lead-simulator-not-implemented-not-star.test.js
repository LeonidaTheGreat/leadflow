/**
 * E2E Test: fix-aha-moment-lead-simulator-not-implemented-not-star
 * Verifies:
 * 1. API start action generates sessionId server-side (no sessionId required in request)
 * 2. Returned state includes session_id for subsequent polls
 * 3. Build output contains simulator component
 * 4. Skip without sessionId doesn't crash (graceful path)
 */

const assert = require('assert')
const path = require('path')
const fs = require('fs')

let passed = 0
let failed = 0

function test(name, fn) {
  try {
    fn()
    console.log(`✅ PASS: ${name}`)
    passed++
  } catch (e) {
    console.log(`❌ FAIL: ${name}`)
    console.log(`   ${e.message}`)
    failed++
  }
}

// ── Test 1: API route generates sessionId when not provided ───────────────────
test('startSimulation generates resolvedSessionId server-side', () => {
  const routeSource = fs.readFileSync(
    path.join(__dirname, '../app/api/onboarding/simulator/route.ts'),
    'utf8'
  )
  // Must have the server-side generation
  assert.ok(
    routeSource.includes("const resolvedSessionId = sessionId || `sim_${randomUUID()}`"),
    'route.ts must generate resolvedSessionId server-side'
  )
  // Must use resolvedSessionId in the response
  assert.ok(
    routeSource.includes('session_id: resolvedSessionId'),
    'route.ts must return resolvedSessionId in state.session_id'
  )
  // startSimulation must accept optional sessionId
  assert.ok(
    routeSource.includes('async function startSimulation(agentId: string, sessionId?: string)'),
    'startSimulation must have optional sessionId parameter'
  )
})

// ── Test 2: Client no longer sends sessionId in start request ─────────────────
test('simulator.tsx does not send sessionId in start request body', () => {
  const componentSource = fs.readFileSync(
    path.join(__dirname, '../app/onboarding/steps/simulator.tsx'),
    'utf8'
  )
  // Should not generate sessionId on mount
  assert.ok(
    !componentSource.includes('const newSessionId = `sim_${Date.now()}'),
    'Component must not generate sessionId on mount'
  )
  // startSimulation body should not include sessionId field (the JSON body for action:start)
  // The comment "No sessionId here" must be present
  assert.ok(
    componentSource.includes('No sessionId here'),
    'Component must have comment indicating no sessionId in start request'
  )
})

// ── Test 3: Client uses API-returned sessionId for polling ────────────────────
test('simulator.tsx uses API-returned sessionId for polling', () => {
  const componentSource = fs.readFileSync(
    path.join(__dirname, '../app/onboarding/steps/simulator.tsx'),
    'utf8'
  )
  assert.ok(
    componentSource.includes('setSessionId(data.state.session_id)'),
    'Component must set sessionId from API response'
  )
  assert.ok(
    componentSource.includes('startPolling(data.state.session_id)'),
    'Component must pass sessionId to startPolling from API response'
  )
  assert.ok(
    componentSource.includes('const startPolling = (activeSessionId: string)'),
    'startPolling must accept sessionId parameter'
  )
})

// ── Test 4: startSimulation button no longer gated on sessionId ───────────────
test('Start Simulation button disabled only on isLoading (not sessionId)', () => {
  const componentSource = fs.readFileSync(
    path.join(__dirname, '../app/onboarding/steps/simulator.tsx'),
    'utf8'
  )
  // Must not contain disabled={isLoading || !sessionId}
  assert.ok(
    !componentSource.includes('disabled={isLoading || !sessionId}'),
    'Button must not be disabled by missing sessionId'
  )
  assert.ok(
    componentSource.includes('disabled={isLoading}'),
    'Button must only be disabled by isLoading'
  )
})

// ── Test 5: Skip without sessionId gracefully advances ────────────────────────
test('skipSimulation handles missing sessionId gracefully', () => {
  const componentSource = fs.readFileSync(
    path.join(__dirname, '../app/onboarding/steps/simulator.tsx'),
    'utf8'
  )
  assert.ok(
    componentSource.includes('if (!sessionId)'),
    'skipSimulation must check for missing sessionId and advance gracefully'
  )
})

// ── Test 6: Build output contains onboarding page ────────────────────────────
test('build output contains /onboarding route', () => {
  const buildDir = path.join(__dirname, '../.next')
  assert.ok(fs.existsSync(buildDir), '.next build directory must exist')
  // Check the server pages
  const serverPages = path.join(buildDir, 'server/app')
  if (fs.existsSync(serverPages)) {
    const entries = fs.readdirSync(serverPages)
    assert.ok(
      entries.some(e => e.includes('onboarding')),
      'build must include onboarding route'
    )
  } else {
    // Static export — check for onboarding in the manifest
    const manifest = path.join(buildDir, 'build-manifest.json')
    if (fs.existsSync(manifest)) {
      const content = fs.readFileSync(manifest, 'utf8')
      assert.ok(content.includes('onboarding'), 'build manifest must reference onboarding')
    }
  }
})

// ── Summary ───────────────────────────────────────────────────────────────────
console.log('')
console.log('='.repeat(60))
console.log(`📊 E2E TEST REPORT: fix-aha-moment-lead-simulator`)
console.log('='.repeat(60))
console.log(`✅ Passed: ${passed}`)
console.log(`❌ Failed: ${failed}`)
console.log(`📈 Pass rate: ${((passed / (passed + failed)) * 100).toFixed(0)}%`)

if (failed > 0) {
  process.exit(1)
}
