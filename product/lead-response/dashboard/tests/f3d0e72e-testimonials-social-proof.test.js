/**
 * E2E Test: Testimonials / Social Proof Section
 * Use Case: fix-no-real-testimonials-social-proof-is-placeholder-m
 * Task: 5cd241a0-e045-40a1-890d-bf7c218c724d
 */

const assert = require('assert')
const fs = require('fs')
const path = require('path')

const PAGE_FILE = path.join(__dirname, '../app/page.tsx')
const content = fs.readFileSync(PAGE_FILE, 'utf8')

let passed = 0
let failed = 0

function test(name, fn) {
  try {
    fn()
    console.log(`✅ ${name}`)
    passed++
  } catch (e) {
    console.log(`❌ ${name}: ${e.message}`)
    failed++
  }
}

// AC1: TestimonialCard component exists
test('TestimonialCard component defined', () => {
  assert.ok(content.includes('function TestimonialCard('), 'TestimonialCard function not found')
})

// AC2: 3 testimonial instances rendered
test('3 TestimonialCard instances in section', () => {
  const matches = (content.match(/TestimonialCard/g) || []).length
  // definition (1) + 3 usages = 4 minimum
  assert.ok(matches >= 4, `Expected ≥4 TestimonialCard references, got ${matches}`)
})

// AC3: Correct placeholder names per spec
test('Sarah M. testimonial present', () => {
  assert.ok(content.includes('Sarah M.'), 'Missing Sarah M. testimonial')
})
test('Mike R. testimonial present', () => {
  assert.ok(content.includes('Mike R.'), 'Missing Mike R. testimonial')
})
test('Jennifer K. testimonial present', () => {
  assert.ok(content.includes('Jennifer K.'), 'Missing Jennifer K. testimonial')
})

// AC4: "Results may vary" disclaimer
test('"Results may vary" disclaimer present', () => {
  assert.ok(content.includes('Results may vary'), 'Missing "Results may vary" disclaimer')
})

// AC5: Section has correct testid
test('Section has data-testid="testimonials"', () => {
  assert.ok(content.includes('data-testid="testimonials"'), 'Missing data-testid="testimonials" on section')
})

// AC6: /signup route used (not /signup/trial) in testimonials CTA
test('Testimonials CTA points to /signup', () => {
  assert.ok(content.includes('href="/signup'), 'Testimonials CTA missing /signup href')
})

// AC7: Old OutcomeCard instances in testimonials section replaced (3 were replaced)
test('No OutcomeCard in testimonials section context', () => {
  // The 3 OutcomeCards that were in the social proof section are replaced.
  // OutcomeCard component still exists for other sections — just verify it's not used
  // inside the testimonials section by checking the replaced block is gone.
  const hasOldWhatEarlyAgents = content.includes('What Early Agents Experience')
  assert.ok(!hasOldWhatEarlyAgents, 'Old "What Early Agents Experience" heading still present')
})

// AC8: New section heading
test('New section heading "What Agents Are Saying"', () => {
  assert.ok(content.includes('What Agents Are Saying'), 'Missing new section heading')
})

// AC9: overflow-x-hidden added to root div
test('overflow-x-hidden on root div', () => {
  assert.ok(content.includes('overflow-x-hidden'), 'Missing overflow-x-hidden on root container')
})

// Summary
console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
