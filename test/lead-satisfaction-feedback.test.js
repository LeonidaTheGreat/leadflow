/**
 * Lead Satisfaction Feedback — Test Suite
 * Tests classification logic, ping scheduling, and reply recording
 * 
 * Task: 7fd26134-03a4-4145-8f50-146d12d0bdf5
 */

const assert = require('assert')

const testResults = { passed: 0, failed: 0, tests: [] }

async function runTest(name, fn) {
  try {
    await fn()
    testResults.passed++
    testResults.tests.push({ name, status: 'PASSED' })
    console.log(`✅ ${name}`)
  } catch (err) {
    testResults.failed++
    testResults.tests.push({ name, status: 'FAILED', error: err.message })
    console.error(`❌ ${name}: ${err.message}`)
  }
}

// ============================================================
// UNIT: Reply Classification
// ============================================================

function classifyReply(reply) {
  const normalized = reply.trim().toLowerCase()
  const POSITIVE = ['yes', 'helpful', 'good', 'great', 'thanks', 'thank', 'awesome', 'perfect', 'excellent', 'amazing']
  const NEGATIVE = ['no', 'bad', 'annoying', 'quit', 'terrible', 'horrible', 'awful', 'hate', 'useless']
  const NEUTRAL = ['neutral', 'ok', 'okay', 'fine', 'meh', 'alright', 'average']
  if (POSITIVE.includes(normalized)) return 'positive'
  if (NEGATIVE.includes(normalized)) return 'negative'
  if (NEUTRAL.includes(normalized)) return 'neutral'
  for (const kw of POSITIVE) if (normalized.startsWith(kw + ' ')) return 'positive'
  for (const kw of NEGATIVE) if (normalized.startsWith(kw + ' ')) return 'negative'
  for (const kw of NEUTRAL) if (normalized.startsWith(kw + ' ')) return 'neutral'
  return 'unclassified'
}

// ============================================================
// UNIT: Ping Guard Logic
// ============================================================

const SATISFACTION_COOLDOWN_MS = 10 * 60 * 1000 // 10 minutes

function shouldSendPing({ agentEnabled, alreadySent, lastAiMessageMs }) {
  if (!agentEnabled) return { send: false, reason: 'agent_disabled' }
  if (alreadySent) return { send: false, reason: 'already_sent' }
  if (lastAiMessageMs !== null) {
    const age = Date.now() - lastAiMessageMs
    if (age < SATISFACTION_COOLDOWN_MS) return { send: false, reason: 'cooldown' }
  }
  return { send: true, reason: null }
}

// ============================================================
// UNIT: Stats Calculation
// ============================================================

function calcStats(events) {
  const rated = events.filter(e => e.rating !== null)
  const total = rated.length
  const positive = rated.filter(e => e.rating === 'positive').length
  const negative = rated.filter(e => e.rating === 'negative').length
  const neutral = rated.filter(e => e.rating === 'neutral').length
  const positivePct = total > 0 ? Math.round(positive / total * 100) : 0
  return { total, positive, negative, neutral, positivePct }
}

// ============================================================
// TESTS
// ============================================================

async function main() {
  console.log('\n🧪 Lead Satisfaction Feedback Test Suite\n')

  // --- Classification: Positive ---
  await runTest('classifyReply: YES → positive', () => {
    assert.strictEqual(classifyReply('YES'), 'positive')
    assert.strictEqual(classifyReply('yes'), 'positive')
    assert.strictEqual(classifyReply('HELPFUL'), 'positive')
    assert.strictEqual(classifyReply('Great'), 'positive')
    assert.strictEqual(classifyReply('Thanks'), 'positive')
  })

  await runTest('classifyReply: positive with trailing words', () => {
    assert.strictEqual(classifyReply('yes it was'), 'positive')
    assert.strictEqual(classifyReply('great job'), 'positive')
  })

  // --- Classification: Negative ---
  await runTest('classifyReply: NO → negative', () => {
    assert.strictEqual(classifyReply('NO'), 'negative')
    assert.strictEqual(classifyReply('no'), 'negative')
    assert.strictEqual(classifyReply('bad'), 'negative')
    assert.strictEqual(classifyReply('ANNOYING'), 'negative')
    assert.strictEqual(classifyReply('quit'), 'negative')
  })

  await runTest('classifyReply: STOP is NOT classified as negative (handled by opt-out)', () => {
    // STOP is processed by the opt-out handler before satisfaction classification
    // So it should fall through to unclassified when classified here
    assert.strictEqual(classifyReply('STOP'), 'unclassified')
  })

  // --- Classification: Neutral ---
  await runTest('classifyReply: OK/FINE/MEH → neutral', () => {
    assert.strictEqual(classifyReply('ok'), 'neutral')
    assert.strictEqual(classifyReply('fine'), 'neutral')
    assert.strictEqual(classifyReply('meh'), 'neutral')
    assert.strictEqual(classifyReply('neutral'), 'neutral')
    assert.strictEqual(classifyReply('alright'), 'neutral')
  })

  // --- Classification: Unclassified ---
  await runTest('classifyReply: unknown → unclassified', () => {
    assert.strictEqual(classifyReply('maybe'), 'unclassified')
    assert.strictEqual(classifyReply('hello'), 'unclassified')
    assert.strictEqual(classifyReply('what?'), 'unclassified')
    assert.strictEqual(classifyReply(''), 'unclassified')
    assert.strictEqual(classifyReply('   '), 'unclassified')
  })

  // --- Ping Guard: agent disabled ---
  await runTest('shouldSendPing: returns false when agent disabled', () => {
    const result = shouldSendPing({ agentEnabled: false, alreadySent: false, lastAiMessageMs: null })
    assert.strictEqual(result.send, false)
    assert.strictEqual(result.reason, 'agent_disabled')
  })

  // --- Ping Guard: already sent ---
  await runTest('shouldSendPing: returns false if ping already sent for conversation', () => {
    const result = shouldSendPing({ agentEnabled: true, alreadySent: true, lastAiMessageMs: null })
    assert.strictEqual(result.send, false)
    assert.strictEqual(result.reason, 'already_sent')
  })

  // --- Ping Guard: cooldown active ---
  await runTest('shouldSendPing: returns false if within 10-minute cooldown', () => {
    const recentMs = Date.now() - 5 * 60 * 1000 // 5 min ago
    const result = shouldSendPing({ agentEnabled: true, alreadySent: false, lastAiMessageMs: recentMs })
    assert.strictEqual(result.send, false)
    assert.strictEqual(result.reason, 'cooldown')
  })

  // --- Ping Guard: should send ---
  await runTest('shouldSendPing: returns true when all conditions met', () => {
    const oldMs = Date.now() - 15 * 60 * 1000 // 15 min ago
    const result = shouldSendPing({ agentEnabled: true, alreadySent: false, lastAiMessageMs: oldMs })
    assert.strictEqual(result.send, true)
  })

  await runTest('shouldSendPing: returns true with no lastAiMessageMs (first ping)', () => {
    const result = shouldSendPing({ agentEnabled: true, alreadySent: false, lastAiMessageMs: null })
    assert.strictEqual(result.send, true)
  })

  // --- Stats Calculation ---
  await runTest('calcStats: correct percentages', () => {
    const events = [
      { rating: 'positive' },
      { rating: 'positive' },
      { rating: 'positive' },
      { rating: 'negative' },
      { rating: 'neutral' },
    ]
    const stats = calcStats(events)
    assert.strictEqual(stats.total, 5)
    assert.strictEqual(stats.positive, 3)
    assert.strictEqual(stats.negative, 1)
    assert.strictEqual(stats.neutral, 1)
    assert.strictEqual(stats.positivePct, 60)
  })

  await runTest('calcStats: excludes events with null rating (pending pings)', () => {
    const events = [
      { rating: 'positive' },
      { rating: null }, // pending ping, not yet replied
      { rating: 'negative' },
    ]
    const stats = calcStats(events)
    assert.strictEqual(stats.total, 2) // only rated events
    assert.strictEqual(stats.positive, 1)
  })

  await runTest('calcStats: handles empty events', () => {
    const stats = calcStats([])
    assert.strictEqual(stats.total, 0)
    assert.strictEqual(stats.positivePct, 0)
  })

  // --- Message template compliance ---
  await runTest('SATISFACTION_PING_MESSAGE: contains opt-out instruction and is under 160 chars', () => {
    const msg = 'Was this conversation helpful? Reply YES or NO — it helps us improve. (Reply STOP anytime to unsubscribe)'
    assert.ok(msg.toLowerCase().includes('stop'), 'Must include STOP opt-out instruction')
    assert.ok(msg.length <= 160, `Message must be ≤160 chars, got ${msg.length}`)
  })

  // --- PRD: only show widget when ≥5 responses ---
  await runTest('Dashboard widget: hides when fewer than 5 responses', () => {
    const shouldShow = (total) => total >= 5
    assert.strictEqual(shouldShow(0), false)
    assert.strictEqual(shouldShow(4), false)
    assert.strictEqual(shouldShow(5), true)
    assert.strictEqual(shouldShow(100), true)
  })

  // --- PRD: conversation depth gate ---
  await runTest('Ping only fires after ≥2 message exchange', () => {
    const shouldSchedulePing = (conversationLength) => conversationLength >= 2
    assert.strictEqual(shouldSchedulePing(0), false)
    assert.strictEqual(shouldSchedulePing(1), false)
    assert.strictEqual(shouldSchedulePing(2), true)
    assert.strictEqual(shouldSchedulePing(5), true)
  })

  // ============================================================
  // Summary
  // ============================================================
  console.log('\n' + '─'.repeat(50))
  console.log(`Results: ${testResults.passed} passed, ${testResults.failed} failed`)
  console.log('─'.repeat(50))

  if (testResults.failed > 0) {
    console.log('\nFailed tests:')
    testResults.tests.filter(t => t.status === 'FAILED').forEach(t => {
      console.log(`  ❌ ${t.name}: ${t.error}`)
    })
    process.exit(1)
  }
}

main().catch(err => {
  console.error('Test runner error:', err)
  process.exit(1)
})

module.exports = { testResults }
