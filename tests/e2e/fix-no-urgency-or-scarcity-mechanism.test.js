/**
 * E2E Test: No urgency or scarcity mechanism
 * Task: fix-no-urgency-or-scarcity-mechanism
 */

const fs = require('fs')
const path = require('path')
const assert = require('assert')

const PAGE_PATH = path.resolve(__dirname, '../../product/lead-response/dashboard/app/page.tsx')

let passed = 0
let failed = 0

function test(name, fn) {
  try {
    fn()
    console.log(`PASS: ${name}`)
    passed++
  } catch (err) {
    console.log(`FAIL: ${name}`)
    console.log(`  ${err.message}`)
    failed++
  }
}

console.log('=== E2E: Urgency and Scarcity Mechanism ===\n')

if (!fs.existsSync(PAGE_PATH)) {
  console.error(`FATAL: Missing landing page source at ${PAGE_PATH}`)
  process.exit(1)
}

const content = fs.readFileSync(PAGE_PATH, 'utf8')

test('Landing page includes urgency banner container', () => {
  assert.ok(content.includes('data-testid="urgency-banner"'), 'Expected data-testid="urgency-banner"')
})

test('Landing page includes explicit scarcity count and pilot wording', () => {
  assert.ok(content.includes('Only 10 pilot spots remaining'), 'Expected scarcity count text with pilot spots')
})

test('Landing page includes CTA urgency trigger (Apply Now)', () => {
  assert.ok(content.includes('Apply Now'), 'Expected Apply Now CTA urgency trigger')
})

test('Landing page includes pricing lock-in FOMO trigger', () => {
  assert.ok(content.includes('20% lifetime pricing'), 'Expected lifetime pricing lock-in message')
})

console.log('\n=== REPORT ===')
console.log(`Passed: ${passed}`)
console.log(`Failed: ${failed}`)

if (failed > 0) {
  process.exit(1)
}
