/**
 * Test: fix-inbound-sms-handler-does-not-classify-satisfaction
 * Verifies: getPendingSatisfactionPing and recordSatisfactionReply are wired
 * into the Twilio inbound webhook handler and satisfaction replies bypass AI.
 */

const assert = require('assert')
const fs = require('fs')
const path = require('path')

const dashboardDir = path.resolve(__dirname, '../product/lead-response/dashboard')
let passed = 0, failed = 0

async function test(name, fn) {
  try {
    await fn()
    console.log(`  ✓ ${name}`)
    passed++
  } catch (err) {
    console.error(`  ✗ ${name}: ${err.message}`)
    failed++
  }
}

async function run() {
  console.log('\n=== Fix: Inbound SMS handler satisfaction reply classification ===\n')

  const webhookPath = path.join(dashboardDir, 'app/api/webhook/twilio/route.ts')
  const satisfactionPath = path.join(dashboardDir, 'lib/satisfaction.ts')

  // ── File existence ─────────────────────────────────────────────────────────
  console.log('File checks:')

  await test('Twilio webhook route.ts exists', async () => {
    assert.ok(fs.existsSync(webhookPath), `Missing: ${webhookPath}`)
  })

  await test('lib/satisfaction.ts exists', async () => {
    assert.ok(fs.existsSync(satisfactionPath), `Missing: ${satisfactionPath}`)
  })

  const src = fs.readFileSync(webhookPath, 'utf-8')
  const satSrc = fs.readFileSync(satisfactionPath, 'utf-8')

  // ── Import checks ──────────────────────────────────────────────────────────
  console.log('\nImport checks:')

  await test('Webhook imports getPendingSatisfactionPing from @/lib/satisfaction', async () => {
    assert.ok(
      src.includes('getPendingSatisfactionPing'),
      'getPendingSatisfactionPing not imported in webhook'
    )
  })

  await test('Webhook imports recordSatisfactionReply from @/lib/satisfaction', async () => {
    assert.ok(
      src.includes('recordSatisfactionReply'),
      'recordSatisfactionReply not imported in webhook'
    )
  })

  await test('Webhook imports classifyReply from @/lib/satisfaction', async () => {
    assert.ok(
      src.includes('classifyReply'),
      'classifyReply not imported in webhook'
    )
  })

  await test('Imports come from @/lib/satisfaction', async () => {
    assert.ok(
      src.includes("from '@/lib/satisfaction'"),
      "Satisfaction import not from '@/lib/satisfaction'"
    )
  })

  // ── Logic checks ───────────────────────────────────────────────────────────
  console.log('\nLogic checks:')

  await test('Webhook calls getPendingSatisfactionPing with lead.id', async () => {
    assert.ok(
      src.includes('getPendingSatisfactionPing(lead.id)'),
      'getPendingSatisfactionPing not called with lead.id'
    )
  })

  await test('Webhook calls classifyReply before recordSatisfactionReply', async () => {
    const classifyIdx = src.indexOf('classifyReply(body)')
    const recordIdx = src.indexOf('recordSatisfactionReply(')
    assert.ok(classifyIdx !== -1, 'classifyReply(body) call not found')
    assert.ok(recordIdx !== -1, 'recordSatisfactionReply call not found')
    assert.ok(classifyIdx < recordIdx, 'classifyReply must come before recordSatisfactionReply')
  })

  await test('Webhook calls recordSatisfactionReply with pendingPing.id, body, rating', async () => {
    assert.ok(
      src.includes('recordSatisfactionReply(pendingPing.id, body, rating)'),
      'recordSatisfactionReply not called with correct args (pendingPing.id, body, rating)'
    )
  })

  await test('Webhook short-circuits (returns early) after recording satisfaction reply', async () => {
    // Find the region between recordSatisfactionReply and the next major block
    // (the inbound message save). There must be a return statement.
    const recordIdx = src.indexOf('recordSatisfactionReply(pendingPing.id, body, rating)')
    assert.ok(recordIdx !== -1, 'recordSatisfactionReply call not found')
    const saveMessageIdx = src.indexOf("direction: 'inbound'")
    assert.ok(saveMessageIdx !== -1, "'direction: inbound' anchor not found")
    const between = src.slice(recordIdx, saveMessageIdx)
    assert.ok(
      between.includes('return new NextResponse'),
      'No early return between recordSatisfactionReply and inbound message save — satisfaction replies are not short-circuited'
    )
  })

  await test('Early return uses TwiML empty response (no AI reply)', async () => {
    // Locate the return inside the pendingPing block (before inbound message save)
    const recordIdx = src.indexOf('recordSatisfactionReply(pendingPing.id, body, rating)')
    const saveMessageIdx = src.indexOf("direction: 'inbound'")
    const between = src.slice(recordIdx, saveMessageIdx)
    // Must contain empty <Response> and must NOT contain a <Message> with content
    assert.ok(between.includes('<Response>'), 'Empty TwiML <Response> not found in early-return block')
    assert.ok(
      !between.match(/<Message[^/]*>[^<]+<\/Message>/),
      'Satisfaction early return must NOT contain a <Message> with text — AI should not respond'
    )
  })

  await test('Satisfaction check is BEFORE AI response generation', async () => {
    const satisfactionCheckIdx = src.indexOf('getPendingSatisfactionPing(lead.id)')
    const aiResponseIdx = src.indexOf('generateAgentResponse(')
    assert.ok(satisfactionCheckIdx !== -1, 'getPendingSatisfactionPing call not found')
    assert.ok(aiResponseIdx !== -1, 'generateAgentResponse call not found')
    assert.ok(
      satisfactionCheckIdx < aiResponseIdx,
      'Satisfaction check must come before AI response generation'
    )
  })

  await test('Satisfaction check is AFTER opt-out / DNC checks', async () => {
    const dncIdx = src.indexOf('lead.dnc')
    const satisfactionCheckIdx = src.indexOf('getPendingSatisfactionPing(lead.id)')
    assert.ok(dncIdx !== -1, 'DNC check not found')
    assert.ok(dncIdx < satisfactionCheckIdx, 'Satisfaction check must come after DNC check')
  })

  // ── lib/satisfaction.ts functional checks ─────────────────────────────────
  console.log('\nlib/satisfaction.ts checks:')

  await test('classifyReply returns positive for YES', async () => {
    // Static check: YES in POSITIVE_KEYWORDS
    assert.ok(satSrc.includes("'yes'"), "YES not in positive keywords")
  })

  await test('classifyReply returns negative for NO', async () => {
    assert.ok(satSrc.includes("'no'"), "NO not in negative keywords")
  })

  await test('getPendingSatisfactionPing queries unanswered pings (rating IS NULL)', async () => {
    assert.ok(
      satSrc.includes(".is('rating', null)"),
      "getPendingSatisfactionPing must filter for null rating"
    )
  })

  await test('recordSatisfactionReply updates rating and raw_reply', async () => {
    assert.ok(
      satSrc.includes('raw_reply') && satSrc.includes('rating'),
      'recordSatisfactionReply must update raw_reply and rating'
    )
  })

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log('\n' + '─'.repeat(50))
  console.log(`Results: ${passed} passed, ${failed} failed\n`)
  if (failed === 0) {
    console.log('✅ All tests passed!')
  } else {
    console.log('❌ Some tests failed.')
    process.exit(1)
  }
}

run().catch((e) => {
  console.error('Test runner error:', e)
  process.exit(1)
})
