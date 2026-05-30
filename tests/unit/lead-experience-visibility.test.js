'use strict'

/**
 * Unit tests for Lead Experience Visibility feature
 *
 * Spec:
 *   What:   Tests for event validation logic and sample data normalization
 *           used by /api/admin/lead-visibility and /api/admin/lead-visibility/events
 *   Verify: node tests/unit/lead-experience-visibility.test.js → all pass, exit 0
 *   Boundaries: Pure logic tests, no DB calls, no HTTP calls, no Next.js runtime
 */

const assert = require('assert')

// ─── Replicated logic under test ─────────────────────────────────────────────
// These are the pure functions extracted from the route handlers for testing.
// They must stay in sync with the route implementation.

const VALID_EVENT_TYPES = new Set([
  'lead_visibility_opened',
  'lead_simulator_started',
  'lead_simulator_succeeded',
  'lead_simulator_failed',
  'lead_visibility_fallback_used',
  'sample_viewer_opened',
  'demo_link_generated',
])

function isValidEventType(event_type) {
  return typeof event_type === 'string' && VALID_EVENT_TYPES.has(event_type)
}

const OUTCOME_LABELS = {
  booked: 'booked',
  in_progress: 'in_progress',
  opted_out: 'opted_out',
  unqualified: 'unqualified',
  completed: 'in_progress', // completed maps to in_progress
}

function normalizeOutcome(raw) {
  if (!raw) return 'in_progress'
  return OUTCOME_LABELS[raw] || 'in_progress'
}

const SCENARIO_LABELS = {
  'buyer-inquiry': 'Buyer inquiry',
  'listing-valuation': 'Listing valuation',
  'rental-inquiry': 'Rental request',
  'seller-inquiry': 'Seller downsizing',
  'investment-inquiry': 'Investment property',
}

function scenarioLabel(scenario, leadName) {
  if (!scenario) return leadName || 'Sample conversation'
  return SCENARIO_LABELS[scenario] || scenario.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function maskPhone(phone) {
  if (!phone) return '****'
  const digits = phone.replace(/\D/g, '')
  return digits.length >= 4 ? `****${digits.slice(-4)}` : '****'
}

function maskEmail(email) {
  if (!email) return '***@***.***'
  const parts = email.split('@')
  if (parts.length !== 2) return `${parts[0][0]}***`
  return `${parts[0][0]}***@${parts[1]}`
}

// ─── Tests ────────────────────────────────────────────────────────────────────

let passed = 0
let failed = 0
const results = []

function test(name, fn) {
  try {
    fn()
    console.log(`  ✅ ${name}`)
    passed++
    results.push({ name, passed: true })
  } catch (err) {
    console.error(`  ❌ ${name}`)
    console.error(`     ${err.message}`)
    failed++
    results.push({ name, passed: false, error: err.message })
  }
}

console.log('\n🧪 Lead Experience Visibility — Unit Tests\n')

// ─── Event type validation ────────────────────────────────────────────────────

console.log('Event type validation:')

test('accepts all 7 valid FR-6 event types', () => {
  const valid = [
    'lead_visibility_opened',
    'lead_simulator_started',
    'lead_simulator_succeeded',
    'lead_simulator_failed',
    'lead_visibility_fallback_used',
    'sample_viewer_opened',
    'demo_link_generated',
  ]
  for (const t of valid) {
    assert.ok(isValidEventType(t), `Expected ${t} to be valid`)
  }
})

test('rejects unknown event types', () => {
  assert.ok(!isValidEventType('lead_clicked'))
  assert.ok(!isValidEventType(''))
  assert.ok(!isValidEventType('LEAD_VISIBILITY_OPENED')) // case-sensitive
  assert.ok(!isValidEventType(null))
  assert.ok(!isValidEventType(undefined))
  assert.ok(!isValidEventType(42))
})

test('has exactly 7 valid event types (FR-6 requirement)', () => {
  assert.strictEqual(VALID_EVENT_TYPES.size, 7)
})

// ─── Outcome normalization ────────────────────────────────────────────────────

console.log('\nOutcome normalization:')

test('normalizes booked correctly', () => {
  assert.strictEqual(normalizeOutcome('booked'), 'booked')
})

test('normalizes in_progress correctly', () => {
  assert.strictEqual(normalizeOutcome('in_progress'), 'in_progress')
})

test('normalizes opted_out correctly', () => {
  assert.strictEqual(normalizeOutcome('opted_out'), 'opted_out')
})

test('normalizes completed to in_progress (legacy DB value)', () => {
  assert.strictEqual(normalizeOutcome('completed'), 'in_progress')
})

test('normalizes null/undefined to in_progress', () => {
  assert.strictEqual(normalizeOutcome(null), 'in_progress')
  assert.strictEqual(normalizeOutcome(undefined), 'in_progress')
  assert.strictEqual(normalizeOutcome(''), 'in_progress')
})

test('normalizes unknown value to in_progress', () => {
  assert.strictEqual(normalizeOutcome('mystery'), 'in_progress')
})

// ─── Scenario label mapping ───────────────────────────────────────────────────

console.log('\nScenario label mapping:')

test('returns mapped label for known scenario', () => {
  assert.strictEqual(scenarioLabel('buyer-inquiry', 'Test Lead'), 'Buyer inquiry')
  assert.strictEqual(scenarioLabel('listing-valuation', 'Test Lead'), 'Listing valuation')
  assert.strictEqual(scenarioLabel('rental-inquiry', 'Test Lead'), 'Rental request')
})

test('falls back to lead name when no scenario', () => {
  assert.strictEqual(scenarioLabel(null, 'Sarah Johnson'), 'Sarah Johnson')
  assert.strictEqual(scenarioLabel('', 'John Doe'), 'John Doe')
})

test('falls back to "Sample conversation" when both null', () => {
  assert.strictEqual(scenarioLabel(null, null), 'Sample conversation')
  assert.strictEqual(scenarioLabel(null, ''), 'Sample conversation')
})

test('capitalizes unknown scenario from kebab-case', () => {
  const result = scenarioLabel('custom-inquiry-type', 'Test')
  assert.strictEqual(result, 'Custom Inquiry Type')
})

// ─── PII masking ─────────────────────────────────────────────────────────────

console.log('\nPII masking:')

test('masks phone to show only last 4 digits', () => {
  assert.strictEqual(maskPhone('+15550001234'), '****1234')
  assert.strictEqual(maskPhone('5550001234'), '****1234')
  assert.strictEqual(maskPhone('+1 (555) 000-1234'), '****1234')
})

test('masks null phone to ****', () => {
  assert.strictEqual(maskPhone(null), '****')
  assert.strictEqual(maskPhone(''), '****')
})

test('masks email to first char + domain', () => {
  assert.strictEqual(maskEmail('sarah@example.com'), 's***@example.com')
  assert.strictEqual(maskEmail('john.doe@gmail.com'), 'j***@gmail.com')
})

test('masks null email to placeholder', () => {
  assert.strictEqual(maskEmail(null), '***@***.***')
  assert.strictEqual(maskEmail(''), '***@***.***')
})

// ─── Sample record shape ──────────────────────────────────────────────────────

console.log('\nSample record shape:')

test('builds a well-shaped sample record from DB row', () => {
  const row = {
    id: 'abc123',
    lead_name: 'Sarah Johnson',
    scenario: 'buyer-inquiry',
    outcome: 'booked',
    conversation: [
      { role: 'lead', message: 'Hi', timestamp: '2026-05-10T14:00:00Z' },
      { role: 'ai', message: 'Hello!', timestamp: '2026-05-10T14:00:15Z' },
    ],
    created_at: '2026-05-10T14:00:00Z',
    property_interest: '3BR detached',
  }

  const sample = {
    id: row.id,
    scenario: scenarioLabel(row.scenario, row.lead_name),
    scenarioKey: row.scenario || 'buyer-inquiry',
    outcome: normalizeOutcome(row.outcome),
    messageCount: Array.isArray(row.conversation) ? row.conversation.length : 0,
    dateTime: row.created_at,
    conversation: row.conversation,
  }

  assert.strictEqual(sample.id, 'abc123')
  assert.strictEqual(sample.scenario, 'Buyer inquiry')
  assert.strictEqual(sample.outcome, 'booked')
  assert.strictEqual(sample.messageCount, 2)
  assert.ok(Array.isArray(sample.conversation))
})

test('filters out rows with empty conversation arrays', () => {
  const rows = [
    { id: '1', conversation: [{ role: 'lead', message: 'hi', timestamp: '2026-01-01T00:00:00Z' }] },
    { id: '2', conversation: [] },        // should be filtered
    { id: '3', conversation: null },      // should be filtered
    { id: '4', conversation: undefined }, // should be filtered
    { id: '5', conversation: [{ role: 'ai', message: 'hello', timestamp: '2026-01-01T00:00:01Z' }] },
  ]

  const filtered = rows.filter((row) => {
    const conv = row.conversation
    return conv && Array.isArray(conv) && conv.length > 0
  })

  assert.strictEqual(filtered.length, 2)
  assert.deepStrictEqual(filtered.map((r) => r.id), ['1', '5'])
})

// ─── Report ───────────────────────────────────────────────────────────────────

console.log(`\n${'─'.repeat(60)}`)
console.log(`📊 LEAD EXPERIENCE VISIBILITY TEST REPORT`)
console.log(`${'─'.repeat(60)}\n`)
console.log(`✅ Passed: ${passed}`)
console.log(`❌ Failed: ${failed}`)
console.log(`📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%\n`)

if (failed > 0) {
  console.log('Failed tests:')
  results.filter((r) => !r.passed).forEach((r) => {
    console.log(`  - ${r.name}: ${r.error}`)
  })
  process.exit(1)
}

console.log('All tests passed.\n')
process.exit(0)
