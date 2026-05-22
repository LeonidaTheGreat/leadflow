'use strict'

const fs = require('fs')
const path = require('path')
const assert = require('assert')

const PAGE_FILE = path.resolve(__dirname, '../app/page.tsx')
const pageContent = fs.readFileSync(PAGE_FILE, 'utf-8')

const results = { passed: 0, failed: 0 }

function test(name, fn) {
  try {
    fn()
    results.passed++
    console.log(`✓ ${name}`)
  } catch (err) {
    results.failed++
    console.log(`✗ ${name}`)
    console.log(`  Error: ${err.message}`)
  }
}

console.log('=== Test: Social Proof Testimonials Section ===\n')

test('testimonials section exists with correct data-testid', () => {
  assert(pageContent.includes('data-testid="agent-testimonials-section"'),
    'Missing data-testid="agent-testimonials-section"')
})

test('testimonials section has id="agent-testimonials"', () => {
  assert(pageContent.includes('id="agent-testimonials"'),
    'Missing id="agent-testimonials"')
})

test('testimonials section is between How It Works and Pricing', () => {
  const howItWorksIdx = pageContent.indexOf('id="how-it-works"')
  const testimonialsIdx = pageContent.indexOf('id="agent-testimonials"')
  const pricingIdx = pageContent.indexOf('id="pricing"')
  assert(howItWorksIdx > -1, 'Missing how-it-works section')
  assert(testimonialsIdx > -1, 'Missing agent-testimonials section')
  assert(pricingIdx > -1, 'Missing pricing section')
  assert(howItWorksIdx < testimonialsIdx, 'Testimonials must come after How It Works')
  assert(testimonialsIdx < pricingIdx, 'Testimonials must come before Pricing')
})

test('Sarah M. testimonial is present', () => {
  assert(pageContent.includes('Sarah M.'), 'Missing testimonial for Sarah M.')
  assert(pageContent.includes('Solo Agent, Austin TX'), 'Missing role for Sarah M.')
})

test('Mike R. testimonial is present', () => {
  assert(pageContent.includes('Mike R.'), 'Missing testimonial for Mike R.')
  assert(pageContent.includes('Team Lead, Denver CO'), 'Missing role for Mike R.')
})

test('Jennifer K. testimonial is present', () => {
  assert(pageContent.includes('Jennifer K.'), 'Missing testimonial for Jennifer K.')
  assert(pageContent.includes('Realtor, Miami FL'), 'Missing role for Jennifer K.')
})

test('"Results may vary" disclaimer is present', () => {
  assert(pageContent.includes('Results may vary'), 'Missing "Results may vary" disclaimer')
})

test('TestimonialCard component is defined', () => {
  assert(pageContent.includes('function TestimonialCard'), 'TestimonialCard component not defined')
})

console.log(`\n${results.passed} passed, ${results.failed} failed`)
if (results.failed > 0) process.exit(1)
