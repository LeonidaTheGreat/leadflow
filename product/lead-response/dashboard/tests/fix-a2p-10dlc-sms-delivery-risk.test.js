/**
 * A2P 10DLC SMS Delivery Risk — Safeguards
 *
 * Tests that:
 * 1. A2P carrier-filtering error codes are classified as non-retryable in twilio-sms.js
 * 2. isA2pBlockedError() correctly identifies A2P errors
 * 3. Non-A2P errors remain retryable
 * 4. Delivery monitor file and A2P status API route exist
 * 5. isA2pBlockedError is exported from twilio.ts constants
 */

const assert = require('assert')
const path = require('path')
const fs = require('fs')

// Resolve twilio-sms.js from project root (tests/ is 4 levels deep from repo root)
const twilioSmsPath = path.join(__dirname, '..', '..', '..', '..', 'lib', 'twilio-sms.js')
const {
  classifyTwilioError,
  isA2pBlockedError,
  TwilioErrorCodes,
  A2P_ERROR_CODE_SET,
} = require(twilioSmsPath)

function test(name, fn) {
  try {
    fn()
    console.log(`PASS ${name}`)
  } catch (error) {
    console.error(`FAIL ${name}`)
    console.error(error.stack || error.message)
    process.exitCode = 1
  }
}

// ============================================================
// Error classification
// ============================================================

const a2pCodes = [30034, 30007, 30008, 30003, 30006]

for (const code of a2pCodes) {
  test(`error code ${code} is classified as A2P_BLOCKED and non-retryable`, () => {
    const error = { code, message: `carrier filtered: ${code}` }
    assert.strictEqual(isA2pBlockedError(error), true, `isA2pBlockedError should return true for ${code}`)

    const result = classifyTwilioError(error)
    assert.strictEqual(result.category, 'A2P_BLOCKED', `category for ${code}`)
    assert.strictEqual(result.retryable, false, `retryable for ${code}`)
    assert.ok(result.message.includes('A2P'), `message should mention A2P for ${code}`)
  })
}

test('A2P_ERROR_CODE_SET contains all A2P codes', () => {
  for (const code of a2pCodes) {
    assert.ok(A2P_ERROR_CODE_SET.has(code), `A2P_ERROR_CODE_SET missing ${code}`)
  }
})

test('TwilioErrorCodes exposes A2P-specific constants', () => {
  assert.ok(TwilioErrorCodes.A2P_CARRIER_FILTERED !== undefined, 'missing A2P_CARRIER_FILTERED')
  assert.ok(TwilioErrorCodes.CARRIER_FILTERED !== undefined, 'missing CARRIER_FILTERED')
  assert.ok(TwilioErrorCodes.CARRIER_FILTERED_UNKNOWN !== undefined, 'missing CARRIER_FILTERED_UNKNOWN')
})

test('rate limit error (20429) is retryable', () => {
  const error = { code: 20429, message: 'rate limit exceeded' }
  assert.strictEqual(isA2pBlockedError(error), false)
  const result = classifyTwilioError(error)
  assert.strictEqual(result.category, 'RATE_LIMIT')
  assert.strictEqual(result.retryable, true)
})

test('invalid number error (21211) is non-retryable but not A2P', () => {
  const error = { code: 21211, message: 'invalid number' }
  assert.strictEqual(isA2pBlockedError(error), false)
  const result = classifyTwilioError(error)
  assert.strictEqual(result.category, 'INVALID_NUMBER')
  assert.strictEqual(result.retryable, false)
})

test('unknown error codes remain retryable', () => {
  const error = { code: 99999, message: 'unknown error' }
  assert.strictEqual(isA2pBlockedError(error), false)
  const result = classifyTwilioError(error)
  assert.strictEqual(result.retryable, true)
})

// ============================================================
// New files exist
// ============================================================

test('sms-delivery-monitor.ts exists and exports expected functions', () => {
  const monitorPath = path.join(__dirname, '..', 'lib', 'sms-delivery-monitor.ts')
  assert.ok(fs.existsSync(monitorPath), 'sms-delivery-monitor.ts should exist')
  const content = fs.readFileSync(monitorPath, 'utf8')
  assert.ok(content.includes('checkSmsDeliveryHealth'), 'missing checkSmsDeliveryHealth export')
  assert.ok(content.includes('getA2pRegistrationStatus'), 'missing getA2pRegistrationStatus export')
  assert.ok(content.includes('DEGRADED_THRESHOLD'), 'missing DEGRADED_THRESHOLD constant')
  assert.ok(content.includes('CRITICAL_THRESHOLD'), 'missing CRITICAL_THRESHOLD constant')
})

test('A2P status API route exists', () => {
  const routePath = path.join(__dirname, '..', 'app', 'api', 'admin', 'a2p-status', 'route.ts')
  assert.ok(fs.existsSync(routePath), 'a2p-status/route.ts should exist')
  const content = fs.readFileSync(routePath, 'utf8')
  assert.ok(content.includes('checkSmsDeliveryHealth'), 'route should call checkSmsDeliveryHealth')
  assert.ok(content.includes('getA2pRegistrationStatus'), 'route should call getA2pRegistrationStatus')
  assert.ok(content.includes('isAdminUser'), 'route should enforce admin auth')
  assert.ok(content.includes('riskLevel'), 'route should return riskLevel')
})

test('twilio.ts exports isA2pBlockedError and A2P_ERROR_CODES', () => {
  const twilioTsPath = path.join(__dirname, '..', 'lib', 'twilio.ts')
  assert.ok(fs.existsSync(twilioTsPath), 'twilio.ts should exist')
  const content = fs.readFileSync(twilioTsPath, 'utf8')
  assert.ok(content.includes('isA2pBlockedError'), 'missing isA2pBlockedError in twilio.ts')
  assert.ok(content.includes('A2P_ERROR_CODES'), 'missing A2P_ERROR_CODES in twilio.ts')
  assert.ok(content.includes('30034'), 'missing error code 30034 in twilio.ts')
  assert.ok(content.includes('30007'), 'missing error code 30007 in twilio.ts')
})

test('twilio.ts marks A2P codes as non-retryable in isRetryableError', () => {
  const twilioTsPath = path.join(__dirname, '..', 'lib', 'twilio.ts')
  const content = fs.readFileSync(twilioTsPath, 'utf8')
  // isRetryableError must call isA2pBlockedError (or equivalent) and return false
  assert.ok(content.includes('isA2pBlockedError'), 'isRetryableError must use isA2pBlockedError')
  assert.ok(content.includes('return false'), 'isRetryableError must have a false return for A2P')
})

// ============================================================
// Delivery health threshold logic
// ============================================================

test('delivery health threshold constants are sound (critical < degraded < 1)', () => {
  const monitorPath = path.join(__dirname, '..', 'lib', 'sms-delivery-monitor.ts')
  const content = fs.readFileSync(monitorPath, 'utf8')
  // Extract threshold values
  const degradedMatch = content.match(/DEGRADED_THRESHOLD\s*=\s*([\d.]+)/)
  const criticalMatch = content.match(/CRITICAL_THRESHOLD\s*=\s*([\d.]+)/)
  assert.ok(degradedMatch, 'DEGRADED_THRESHOLD not found')
  assert.ok(criticalMatch, 'CRITICAL_THRESHOLD not found')
  const degraded = parseFloat(degradedMatch[1])
  const critical = parseFloat(criticalMatch[1])
  assert.ok(critical < degraded, `critical (${critical}) must be less than degraded (${degraded})`)
  assert.ok(degraded < 1.0, `degraded threshold (${degraded}) must be less than 1.0`)
  assert.ok(critical > 0, `critical threshold (${critical}) must be positive`)
})

if (process.exitCode) {
  process.exit(process.exitCode)
}
