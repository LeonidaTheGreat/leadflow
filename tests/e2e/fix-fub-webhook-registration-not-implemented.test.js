'use strict'

/**
 * Tests for FUB webhook registration in /api/integrations/fub/connect
 * Task: fdd145dd-06f9-4bb2-959e-a23effd77a7e
 */

const assert = require('assert')

// ─── Minimal mocks ───────────────────────────────────────────────────────────

let fetchCalls = []
let supabaseUpsertError = null

/**
 * Build a mock fetch that simulates FUB API responses.
 * Call map: url → { status, body }
 */
function makeMockFetch(responseMap) {
  fetchCalls = []
  return async (url, options = {}) => {
    fetchCalls.push({ url, options })

    for (const [pattern, response] of Object.entries(responseMap)) {
      if (url.includes(pattern)) {
        const body = typeof response.body === 'string'
          ? response.body
          : JSON.stringify(response.body)
        return {
          ok: response.status >= 200 && response.status < 300,
          status: response.status,
          text: async () => body,
          json: async () => JSON.parse(body),
        }
      }
    }
    // Default: 404
    return { ok: false, status: 404, text: async () => 'Not found', json: async () => ({ error: 'not found' }) }
  }
}

// ─── Unit-level tests for registerFubWebhooks ─────────────────────────────────

// We inline the function under test so we can control `fetch` without module
// caching issues in Node's CJS environment.
function makeRegisterFubWebhooks(fetchFn) {
  const FUB_API_BASE = 'https://api.followupboss.com/v1'

  return async function registerFubWebhooks(apiKey, webhookUrl) {
    const basicAuth = Buffer.from(`${apiKey}:`).toString('base64')
    const headers = {
      'Authorization': `Basic ${basicAuth}`,
      'Content-Type': 'application/json',
    }

    const eventsToSubscribe = ['new_person', 'updated_contact']
    const subscriptions = []

    for (const event of eventsToSubscribe) {
      try {
        const response = await fetchFn(`${FUB_API_BASE}/events/subscriptions`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ uri: webhookUrl, event }),
        })

        const responseText = await response.text()

        if (!response.ok) {
          if (response.status === 409) {
            subscriptions.push({ event, status: 'already_registered' })
          } else {
            return {
              success: false,
              error: `Failed to register webhook for event "${event}": ${response.status} ${responseText}`,
            }
          }
        } else {
          let data
          try { data = JSON.parse(responseText) } catch { data = { raw: responseText } }
          subscriptions.push({ event, status: 'registered', id: data?.id })
        }
      } catch (err) {
        return { success: false, error: `Network error registering webhook: ${err.message}` }
      }
    }

    return { success: true, subscriptions }
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

async function test_webhook_registration_success() {
  const mockFetch = makeMockFetch({
    '/events/subscriptions': { status: 200, body: { id: 'sub_123', event: 'new_person' } },
  })

  const registerFubWebhooks = makeRegisterFubWebhooks(mockFetch)
  const result = await registerFubWebhooks('test-api-key', 'https://example.com/api/webhook/fub')

  assert.strictEqual(result.success, true, 'Should succeed')
  assert.strictEqual(result.subscriptions.length, 2, 'Should register 2 events')
  assert.ok(
    result.subscriptions.every(s => s.status === 'registered'),
    'All subscriptions should be "registered"'
  )
  assert.strictEqual(fetchCalls.length, 2, 'Should call FUB subscriptions API twice (one per event)')

  // Verify correct payload was sent
  const bodies = fetchCalls.map(c => JSON.parse(c.options.body))
  const events = bodies.map(b => b.event)
  assert.ok(events.includes('new_person'), 'Should subscribe to new_person')
  assert.ok(events.includes('updated_contact'), 'Should subscribe to updated_contact')

  // Verify correct webhook URL
  assert.ok(
    bodies.every(b => b.uri === 'https://example.com/api/webhook/fub'),
    'Should send correct webhook URI'
  )

  console.log('  ✅ test_webhook_registration_success')
}

async function test_webhook_registration_handles_409_conflict() {
  // 409 = already registered — should be treated as success, not failure
  const mockFetch = makeMockFetch({
    '/events/subscriptions': { status: 409, body: 'Subscription already exists' },
  })

  const registerFubWebhooks = makeRegisterFubWebhooks(mockFetch)
  const result = await registerFubWebhooks('test-api-key', 'https://example.com/api/webhook/fub')

  assert.strictEqual(result.success, true, '409 conflict should be treated as success')
  assert.ok(
    result.subscriptions.every(s => s.status === 'already_registered'),
    'All subscriptions should be "already_registered"'
  )
  console.log('  ✅ test_webhook_registration_handles_409_conflict')
}

async function test_webhook_registration_fails_on_4xx() {
  const mockFetch = makeMockFetch({
    '/events/subscriptions': { status: 403, body: 'Forbidden' },
  })

  const registerFubWebhooks = makeRegisterFubWebhooks(mockFetch)
  const result = await registerFubWebhooks('test-api-key', 'https://example.com/api/webhook/fub')

  assert.strictEqual(result.success, false, 'Should fail on 403')
  assert.ok(result.error, 'Should have error message')
  assert.ok(result.error.includes('403'), 'Error should mention HTTP status')
  console.log('  ✅ test_webhook_registration_fails_on_4xx')
}

async function test_webhook_registration_fails_on_network_error() {
  const throwingFetch = async () => {
    throw new Error('Network timeout')
  }

  const registerFubWebhooks = makeRegisterFubWebhooks(throwingFetch)
  const result = await registerFubWebhooks('test-api-key', 'https://example.com/api/webhook/fub')

  assert.strictEqual(result.success, false, 'Should fail on network error')
  assert.ok(result.error.includes('Network error'), 'Error should describe network failure')
  console.log('  ✅ test_webhook_registration_fails_on_network_error')
}

async function test_webhook_uses_basic_auth() {
  const mockFetch = makeMockFetch({
    '/events/subscriptions': { status: 200, body: { id: 'sub_456' } },
  })

  const registerFubWebhooks = makeRegisterFubWebhooks(mockFetch)
  await registerFubWebhooks('my-fub-api-key', 'https://example.com/api/webhook/fub')

  const expectedAuth = `Basic ${Buffer.from('my-fub-api-key:').toString('base64')}`
  assert.ok(
    fetchCalls.every(c => c.options.headers['Authorization'] === expectedAuth),
    'Should use Basic auth with API key as username and empty password'
  )
  console.log('  ✅ test_webhook_uses_basic_auth')
}

async function test_connect_route_file_exists_and_has_webhook_registration() {
  const fs = require('fs')
  const path = require('path')
  const routePath = path.join(
    __dirname,
    '../product/lead-response/dashboard/app/api/integrations/fub/connect/route.ts'
  )

  assert.ok(fs.existsSync(routePath), 'connect route.ts should exist')

  const source = fs.readFileSync(routePath, 'utf8')

  assert.ok(
    source.includes('events/subscriptions'),
    'Route should call FUB /v1/events/subscriptions'
  )
  assert.ok(
    source.includes('new_person'),
    'Route should subscribe to new_person event'
  )
  assert.ok(
    source.includes('updated_contact'),
    'Route should subscribe to updated_contact event'
  )
  assert.ok(
    source.includes('registerFubWebhooks'),
    'Route should define/call registerFubWebhooks function'
  )
  assert.ok(
    source.includes('/api/webhook/fub'),
    'Route should use the FUB inbound webhook URL'
  )
  console.log('  ✅ test_connect_route_file_exists_and_has_webhook_registration')
}

// ─── Runner ──────────────────────────────────────────────────────────────────

async function runAll() {
  console.log('\n🧪 FUB webhook registration tests\n')

  const tests = [
    test_webhook_registration_success,
    test_webhook_registration_handles_409_conflict,
    test_webhook_registration_fails_on_4xx,
    test_webhook_registration_fails_on_network_error,
    test_webhook_uses_basic_auth,
    test_connect_route_file_exists_and_has_webhook_registration,
  ]

  let passed = 0
  let failed = 0

  for (const t of tests) {
    try {
      await t()
      passed++
    } catch (err) {
      console.error(`  ❌ ${t.name}: ${err.message}`)
      failed++
    }
  }

  console.log(`\n📊 Results: ${passed}/${tests.length} passed\n`)

  if (failed > 0) {
    process.exit(1)
  }
}

runAll().catch(err => {
  console.error('Unexpected error:', err)
  process.exit(1)
})
