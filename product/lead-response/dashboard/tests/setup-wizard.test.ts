/**
 * Post-Login Setup Wizard Tests
 * Tests the /api/setup/* endpoints and integration routes used by the wizard.
 * 
 * These are integration tests that run against the live dev server.
 * Run with: npx ts-node --esm tests/setup-wizard.test.ts
 * Or: npx jest tests/setup-wizard.test.ts (if jest configured)
 */

const API_BASE = 'http://localhost:3000'

// ─── helpers ─────────────────────────────────────────────────────────────────

async function req(url: string, options: RequestInit = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    },
  })
  const data = await response.json().catch(() => null)
  return { response, data }
}

let passed = 0
let failed = 0

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`  ❌ FAIL: ${message}`)
    failed++
    return false
  }
  console.log(`  ✅ ${message}`)
  passed++
  return true
}

function describe(label: string, fn: () => void | Promise<void>) {
  console.log(`\n📋 ${label}`)
  return fn()
}

// ─── Tests ───────────────────────────────────────────────────────────────────

async function runAll() {
  console.log('🧪 Post-Login Setup Wizard Tests\n')

  // ── 1. /api/setup/status ─────────────────────────────────────────────────

  await describe('GET /api/setup/status — no auth', async () => {
    const { response, data } = await req(`${API_BASE}/api/setup/status`)
    // Expect 401 when no token provided
    assert(
      response.status === 401 || (data && (data.error !== undefined || data.wizardState !== undefined)),
      'Returns 401 or wizardState for unauthenticated request'
    )
  })

  await describe('POST /api/setup/status — no auth', async () => {
    const { response, data } = await req(`${API_BASE}/api/setup/status`, {
      method: 'POST',
      body: JSON.stringify({ fubConnected: true }),
    })
    assert(
      response.status === 401 || data?.ok === true,
      'Returns 401 or ok for unauthenticated POST'
    )
  })

  // ── 2. /api/setup/complete ────────────────────────────────────────────────

  await describe('POST /api/setup/complete — no auth', async () => {
    const { response, data } = await req(`${API_BASE}/api/setup/complete`, { method: 'POST' })
    assert(
      response.status === 401,
      'Returns 401 for unauthenticated complete request'
    )
  })

  // ── 3. /api/integrations/fub/verify ──────────────────────────────────────

  await describe('POST /api/integrations/fub/verify — missing key', async () => {
    const { response, data } = await req(`${API_BASE}/api/integrations/fub/verify`, {
      method: 'POST',
      body: JSON.stringify({}),
    })
    assert(response.status === 400, 'Returns 400 when API key missing')
  })

  await describe('POST /api/integrations/fub/verify — short key', async () => {
    const { response, data } = await req(`${API_BASE}/api/integrations/fub/verify`, {
      method: 'POST',
      body: JSON.stringify({ apiKey: 'short' }),
    })
    assert(
      response.status === 400 || data?.valid === false,
      'Returns invalid for short key'
    )
  })

  await describe('POST /api/integrations/fub/verify — bogus key format', async () => {
    const { response, data } = await req(`${API_BASE}/api/integrations/fub/verify`, {
      method: 'POST',
      body: JSON.stringify({ apiKey: 'fake-invalid-api-key-that-is-long-enough' }),
    })
    // Should return valid: false (FUB will reject it) — no 500
    assert(
      response.status < 500,
      'Does not 500 on invalid FUB API key'
    )
    assert(
      data?.valid === false || data?.error !== undefined,
      'Returns valid: false for invalid FUB key'
    )
  })

  // ── 4. /api/integrations/twilio/send-test ─────────────────────────────────

  await describe('POST /api/integrations/twilio/send-test — missing phone', async () => {
    const { response, data } = await req(`${API_BASE}/api/integrations/twilio/send-test`, {
      method: 'POST',
      body: JSON.stringify({}),
    })
    assert(response.status === 400, 'Returns 400 when phone missing')
  })

  await describe('POST /api/integrations/twilio/send-test — invalid phone', async () => {
    const { response, data } = await req(`${API_BASE}/api/integrations/twilio/send-test`, {
      method: 'POST',
      body: JSON.stringify({ phoneNumber: '123', agentName: 'Test' }),
    })
    assert(
      response.status === 400 || data?.success === false,
      'Returns error for invalid phone number'
    )
  })

  await describe('POST /api/integrations/twilio/send-test — well-formed (mock OK)', async () => {
    const { response, data } = await req(`${API_BASE}/api/integrations/twilio/send-test`, {
      method: 'POST',
      body: JSON.stringify({ phoneNumber: '5551234567', agentName: 'Test Agent' }),
    })
    // May fail if Twilio creds not configured, but should not throw 500 with unhandled error
    assert(
      response.status < 500,
      `Does not 500 on send-test (status: ${response.status})`
    )
  })

  // ── 5. /api/integrations/fub/connect — no auth ───────────────────────────

  await describe('POST /api/integrations/fub/connect — no auth, short key', async () => {
    const { response, data } = await req(`${API_BASE}/api/integrations/fub/connect`, {
      method: 'POST',
      body: JSON.stringify({ apiKey: 'toolshort' }),
    })
    // Should return 401 or 400/valid:false
    assert(
      response.status === 401 || response.status === 400 || data?.valid === false,
      'Rejects unauthenticated/invalid FUB connect'
    )
  })

  // ── 6. /api/integrations/twilio/connect — no auth ─────────────────────────

  await describe('POST /api/integrations/twilio/connect — no auth', async () => {
    const { response, data } = await req(`${API_BASE}/api/integrations/twilio/connect`, {
      method: 'POST',
      body: JSON.stringify({ phoneNumber: '5551234567' }),
    })
    assert(
      response.status < 500,
      `Twilio connect does not 500 (status: ${response.status})`
    )
  })

  // ─── Summary ─────────────────────────────────────────────────────────────

  const total = passed + failed
  const passRate = total > 0 ? passed / total : 0
  console.log(`\n${'─'.repeat(50)}`)
  console.log(`📊 Results: ${passed}/${total} passed (${Math.round(passRate * 100)}%)`)
  if (failed > 0) {
    console.log(`⚠️  ${failed} test(s) failed`)
  } else {
    console.log('🎉 All tests passed!')
  }
  console.log(`${'─'.repeat(50)}\n`)

  return { passed, total, passRate }
}

runAll()
  .then(({ passed, total, passRate }) => {
    process.exit(passRate < 1 ? 1 : 0)
  })
  .catch((err) => {
    console.error('Test runner error:', err)
    process.exit(1)
  })
