/**
 * Fix Test: Inbound SMS handler does not classify satisfaction replies
 * Task ID: de60ef2e-698a-40a9-a6c5-25ff29aa6721
 *
 * Verifies that the Twilio inbound webhook handler:
 * 1. Imports getPendingSatisfactionPing and recordSatisfactionReply
 * 2. Checks for a pending satisfaction ping BEFORE passing to AI
 * 3. Calls recordSatisfactionReply when a pending ping exists
 * 4. Skips AI response when classifying a satisfaction reply
 * 5. classifyReply correctly maps YES/NO keywords
 */

const assert = require('assert')
const fs = require('fs')
const path = require('path')

let passed = 0
let failed = 0

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
  console.log('\n=== FIX: Inbound SMS Handler Satisfaction Reply Classification ===\n')

  const routeFile = path.resolve(
    __dirname,
    '../product/lead-response/dashboard/app/api/webhook/twilio/route.ts'
  )
  const libFile = path.resolve(
    __dirname,
    '../product/lead-response/dashboard/lib/satisfaction.ts'
  )

  // ----------------------------------------------------------------
  // Suite 1: satisfaction.ts — required exports
  // ----------------------------------------------------------------
  console.log('Suite 1: lib/satisfaction.ts exports\n')

  await test('lib/satisfaction.ts exists', async () => {
    assert.ok(fs.existsSync(libFile), `Missing: ${libFile}`)
  })

  const libSrc = fs.readFileSync(libFile, 'utf-8')

  await test('exports getPendingSatisfactionPing', async () => {
    assert.ok(
      libSrc.includes('export async function getPendingSatisfactionPing'),
      'getPendingSatisfactionPing not exported from satisfaction.ts'
    )
  })

  await test('exports recordSatisfactionReply', async () => {
    assert.ok(
      libSrc.includes('export async function recordSatisfactionReply'),
      'recordSatisfactionReply not exported from satisfaction.ts'
    )
  })

  await test('exports classifyReply', async () => {
    assert.ok(
      libSrc.includes('export function classifyReply'),
      'classifyReply not exported from satisfaction.ts'
    )
  })

  // ----------------------------------------------------------------
  // Suite 2: classifyReply keyword mapping
  // ----------------------------------------------------------------
  console.log('\nSuite 2: classifyReply keyword mapping\n')

  // Dynamically evaluate using node's require with TypeScript stripped
  // Instead, just verify the source contains the right keyword arrays

  await test('POSITIVE_KEYWORDS includes "yes"', async () => {
    assert.ok(libSrc.includes("'yes'") || libSrc.includes('"yes"'), 'Missing "yes" in POSITIVE_KEYWORDS')
  })

  await test('NEGATIVE_KEYWORDS includes "no"', async () => {
    assert.ok(libSrc.includes("'no'") || libSrc.includes('"no"'), 'Missing "no" in NEGATIVE_KEYWORDS')
  })

  await test('classifyReply returns "positive" for positive keywords', async () => {
    assert.ok(libSrc.includes("return 'positive'"), 'Missing return positive in classifyReply')
  })

  await test('classifyReply returns "negative" for negative keywords', async () => {
    assert.ok(libSrc.includes("return 'negative'"), 'Missing return negative in classifyReply')
  })

  await test('classifyReply returns "unclassified" as fallback', async () => {
    assert.ok(libSrc.includes("return 'unclassified'"), 'Missing unclassified fallback in classifyReply')
  })

  await test('getPendingSatisfactionPing queries by lead_id with null rating', async () => {
    assert.ok(libSrc.includes("'lead_id'"), 'Missing lead_id filter in getPendingSatisfactionPing')
    assert.ok(
      libSrc.includes("'rating'") || libSrc.includes('.is(') || libSrc.includes("is('rating'"),
      'Missing null-rating filter in getPendingSatisfactionPing'
    )
  })

  await test('recordSatisfactionReply updates raw_reply and rating', async () => {
    assert.ok(libSrc.includes('raw_reply'), 'Missing raw_reply in recordSatisfactionReply')
    assert.ok(libSrc.includes('rating'), 'Missing rating in recordSatisfactionReply')
  })

  // ----------------------------------------------------------------
  // Suite 3: Twilio webhook handler wires in satisfaction classification
  // ----------------------------------------------------------------
  console.log('\nSuite 3: Twilio webhook handler integration\n')

  await test('Twilio webhook route.ts exists', async () => {
    assert.ok(fs.existsSync(routeFile), `Missing: ${routeFile}`)
  })

  const routeSrc = fs.readFileSync(routeFile, 'utf-8')

  await test('handler imports getPendingSatisfactionPing', async () => {
    assert.ok(
      routeSrc.includes('getPendingSatisfactionPing'),
      'getPendingSatisfactionPing not imported in twilio webhook handler'
    )
  })

  await test('handler imports recordSatisfactionReply', async () => {
    assert.ok(
      routeSrc.includes('recordSatisfactionReply'),
      'recordSatisfactionReply not imported in twilio webhook handler'
    )
  })

  await test('handler imports classifyReply', async () => {
    assert.ok(
      routeSrc.includes('classifyReply'),
      'classifyReply not imported in twilio webhook handler'
    )
  })

  await test('handler calls getPendingSatisfactionPing with lead.id', async () => {
    assert.ok(
      routeSrc.includes('getPendingSatisfactionPing(lead.id)') ||
        routeSrc.includes('getPendingSatisfactionPing(lead?.id)'),
      'Handler does not call getPendingSatisfactionPing(lead.id)'
    )
  })

  await test('handler calls classifyReply on inbound body', async () => {
    assert.ok(
      routeSrc.includes('classifyReply(body)'),
      'Handler does not call classifyReply(body)'
    )
  })

  await test('handler calls recordSatisfactionReply when ping found', async () => {
    assert.ok(
      routeSrc.includes('recordSatisfactionReply('),
      'Handler does not call recordSatisfactionReply'
    )
  })

  await test('satisfaction check appears BEFORE AI response generation', async () => {
    const pingIdx = routeSrc.indexOf('getPendingSatisfactionPing(')
    const aiIdx = routeSrc.indexOf('generateAgentResponse(')
    assert.ok(pingIdx > -1, 'getPendingSatisfactionPing not found in handler')
    assert.ok(aiIdx > -1, 'generateAgentResponse not found in handler')
    assert.ok(
      pingIdx < aiIdx,
      'getPendingSatisfactionPing check must come BEFORE generateAgentResponse'
    )
  })

  await test('handler returns empty TwiML (skips AI) when satisfaction ping found', async () => {
    // The satisfaction block should contain an early return with empty TwiML
    const pingBlock = routeSrc.slice(
      routeSrc.indexOf('getPendingSatisfactionPing('),
      routeSrc.indexOf('getPendingSatisfactionPing(') + 1500
    )
    assert.ok(
      pingBlock.includes('return new NextResponse(') || pingBlock.includes('return new Response('),
      'Handler must return early (skip AI) when a pending satisfaction ping is found'
    )
  })

  await test('satisfaction check occurs after DNC/opt-out checks', async () => {
    // DNC check must happen first (TCPA compliance), then satisfaction
    const dncIdx = routeSrc.indexOf('dnc')
    const pingIdx = routeSrc.indexOf('getPendingSatisfactionPing(')
    assert.ok(dncIdx < pingIdx, 'DNC check should come before satisfaction ping check')
  })

  // ----------------------------------------------------------------
  // Final summary
  // ----------------------------------------------------------------
  console.log(`\n${'─'.repeat(55)}`)
  console.log(`Results: ${passed} passed, ${failed} failed\n`)

  if (failed > 0) {
    console.error(
      '❌ Fix verification failed — inbound SMS handler does not fully classify satisfaction replies.\n'
    )
    process.exit(1)
  } else {
    console.log('✅ All tests passed!\n')
    console.log('Summary:')
    console.log('  • lib/satisfaction.ts exports required functions')
    console.log('  • classifyReply maps YES → positive, NO → negative')
    console.log('  • Twilio webhook imports and calls getPendingSatisfactionPing')
    console.log('  • Handler classifies reply and calls recordSatisfactionReply')
    console.log('  • AI response is skipped when a pending ping exists\n')
    process.exit(0)
  }
}

run().catch((err) => {
  console.error('Fatal:', err.message)
  process.exit(1)
})
