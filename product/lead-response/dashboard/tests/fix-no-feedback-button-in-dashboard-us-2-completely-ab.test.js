/**
 * E2E Test: fix-no-feedback-button-in-dashboard-us-2-completely-ab
 * US-2: Persistent Give Feedback button in dashboard
 *
 * Verifies:
 * 1. FeedbackButton component file exists and exports correctly
 * 2. API route exists and is a valid module
 * 3. Dashboard layout imports and uses FeedbackButton
 * 4. Build output confirms /api/feedback route is present
 * 5. Content validations (type selector, text field, modal)
 */

const assert = require('assert')
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')

let passed = 0
let failed = 0

function test(name, fn) {
  try {
    fn()
    console.log(`  ✅ PASS: ${name}`)
    passed++
  } catch (err) {
    console.log(`  ❌ FAIL: ${name}`)
    console.log(`         ${err.message}`)
    failed++
  }
}

console.log('\n🧪 E2E Test: US-2 Feedback Button\n')

// 1. FeedbackButton component exists
test('FeedbackButton component file exists', () => {
  const p = path.join(ROOT, 'components/dashboard/FeedbackButton.tsx')
  assert.ok(fs.existsSync(p), `Missing: ${p}`)
})

// 2. FeedbackButton exports the component
test('FeedbackButton.tsx exports FeedbackButton function', () => {
  const src = fs.readFileSync(path.join(ROOT, 'components/dashboard/FeedbackButton.tsx'), 'utf8')
  assert.ok(src.includes('export function FeedbackButton'), 'Missing export function FeedbackButton')
})

// 3. FeedbackButton has floating button UI
test('FeedbackButton has fixed-position floating button', () => {
  const src = fs.readFileSync(path.join(ROOT, 'components/dashboard/FeedbackButton.tsx'), 'utf8')
  assert.ok(src.includes('fixed bottom'), 'Missing fixed positioning for floating button')
  assert.ok(src.includes('Give Feedback'), 'Missing "Give Feedback" label text')
})

// 4. FeedbackButton includes all required feedback types
test('FeedbackButton includes all 4 feedback types (praise/bug/idea/frustration)', () => {
  const src = fs.readFileSync(path.join(ROOT, 'components/dashboard/FeedbackButton.tsx'), 'utf8')
  assert.ok(src.includes("'praise'"), 'Missing feedback type: praise')
  assert.ok(src.includes("'bug'"), 'Missing feedback type: bug')
  assert.ok(src.includes("'idea'"), 'Missing feedback type: idea')
  assert.ok(src.includes("'frustration'"), 'Missing feedback type: frustration')
})

// 5. FeedbackButton has textarea for content
test('FeedbackButton has textarea for feedback content', () => {
  const src = fs.readFileSync(path.join(ROOT, 'components/dashboard/FeedbackButton.tsx'), 'utf8')
  assert.ok(src.includes('<textarea'), 'Missing textarea element')
  assert.ok(src.includes('maxLength={500}'), 'Missing maxLength={500} on textarea')
})

// 6. FeedbackButton posts to /api/feedback
test('FeedbackButton submits to /api/feedback endpoint', () => {
  const src = fs.readFileSync(path.join(ROOT, 'components/dashboard/FeedbackButton.tsx'), 'utf8')
  assert.ok(src.includes("'/api/feedback'"), 'Missing fetch to /api/feedback')
  assert.ok(src.includes("method: 'POST'"), 'Missing POST method in fetch call')
})

// 7. API route file exists
test('/api/feedback route.ts exists', () => {
  const p = path.join(ROOT, 'app/api/feedback/route.ts')
  assert.ok(fs.existsSync(p), `Missing: ${p}`)
})

// 8. API route exports POST handler
test('/api/feedback route exports POST handler', () => {
  const src = fs.readFileSync(path.join(ROOT, 'app/api/feedback/route.ts'), 'utf8')
  assert.ok(src.includes('export async function POST'), 'Missing POST handler export')
})

// 9. API route validates auth
test('/api/feedback route validates authentication', () => {
  const src = fs.readFileSync(path.join(ROOT, 'app/api/feedback/route.ts'), 'utf8')
  assert.ok(src.includes('Not authenticated'), 'Missing auth check with "Not authenticated" error')
  assert.ok(src.includes('401'), 'Missing 401 status for unauthenticated requests')
})

// 10. API route validates input
test('/api/feedback route validates feedbackType and content', () => {
  const src = fs.readFileSync(path.join(ROOT, 'app/api/feedback/route.ts'), 'utf8')
  assert.ok(src.includes('Feedback type and content are required'), 'Missing field validation message')
  assert.ok(src.includes("validTypes"), 'Missing valid feedback type list')
  assert.ok(src.includes('500'), 'Missing content length validation')
})

// 11. API route calls submitProductFeedback
test('/api/feedback route calls submitProductFeedback from nps-service', () => {
  const src = fs.readFileSync(path.join(ROOT, 'app/api/feedback/route.ts'), 'utf8')
  assert.ok(src.includes('submitProductFeedback'), 'Missing submitProductFeedback call')
  assert.ok(src.includes("'@/lib/nps-service'"), 'Missing nps-service import')
})

// 12. Dashboard layout includes FeedbackButton
test('Dashboard layout.tsx imports and renders FeedbackButton', () => {
  const src = fs.readFileSync(path.join(ROOT, 'app/dashboard/layout.tsx'), 'utf8')
  assert.ok(src.includes("import { FeedbackButton }"), 'Missing FeedbackButton import in layout')
  assert.ok(src.includes('<FeedbackButton />'), 'Missing <FeedbackButton /> in layout JSX')
})

// 13. Build output: check .next for feedback API route
test('Build output contains /api/feedback route', () => {
  const buildManifest = path.join(ROOT, '.next/server/app/api/feedback/route.js')
  assert.ok(fs.existsSync(buildManifest), `Built route not found at ${buildManifest}`)
})

// 14. Unit test file exists
test('Unit test file for feedback API exists', () => {
  const p = path.join(ROOT, '__tests__/feedback.test.ts')
  assert.ok(fs.existsSync(p), `Missing: ${p}`)
})

console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`)

if (failed > 0) {
  console.log('❌ E2E test FAILED — PR should be rejected')
  process.exit(1)
} else {
  console.log('✅ All E2E checks PASSED — implementation meets US-2 acceptance criteria')
  process.exit(0)
}
