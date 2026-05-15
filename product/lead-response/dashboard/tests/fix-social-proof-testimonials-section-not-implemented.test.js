'use strict'

const assert = require('assert')
const fs = require('fs')
const path = require('path')

const pagePath = path.resolve(__dirname, '../app/page.tsx')
const pageSource = fs.readFileSync(pagePath, 'utf8')

function test(name, fn) {
  try {
    fn()
    console.log(`PASS: ${name}`)
  } catch (error) {
    console.error(`FAIL: ${name}`)
    console.error(`  ${error.message}`)
    process.exitCode = 1
  }
}

console.log('Running testimonial section checks')

test('testimonials section is between How It Works and Pricing', () => {
  const howItWorksIndex = pageSource.indexOf('id="how-it-works"')
  const testimonialsIndex = pageSource.indexOf('id="testimonials"')
  const pricingIndex = pageSource.indexOf('id="pricing"')

  assert(howItWorksIndex > -1, 'How It Works section not found')
  assert(testimonialsIndex > -1, 'Testimonials section not found')
  assert(pricingIndex > -1, 'Pricing section not found')
  assert(howItWorksIndex < testimonialsIndex, 'Testimonials should come after How It Works')
  assert(testimonialsIndex < pricingIndex, 'Testimonials should come before Pricing')
})

test('contains exactly 3 testimonial cards and required names', () => {
  const testimonialCards = pageSource.match(/<TestimonialCard/g) || []
  assert.strictEqual(testimonialCards.length, 3, `Expected 3 testimonial cards, got ${testimonialCards.length}`)
  assert(pageSource.includes('name="Sarah M."'), 'Sarah M. testimonial missing')
  assert(pageSource.includes('name="Mike R."'), 'Mike R. testimonial missing')
  assert(pageSource.includes('name="Jennifer K."'), 'Jennifer K. testimonial missing')
})

test('contains required testimonial quotes', () => {
  assert(
    pageSource.includes("I used to lose leads because I couldn't respond fast enough. LeadFlow changed that overnight."),
    'Sarah quote missing'
  )
  assert(
    pageSource.includes("My response time went from 2 hours to 30 seconds. I've booked 3 extra appointments this month."),
    'Mike quote missing'
  )
  assert(
    pageSource.includes('Setup took 5 minutes. The AI sounds like me, not a robot.'),
    'Jennifer quote missing'
  )
})

test('includes results disclaimer', () => {
  assert(pageSource.includes('Results may vary'), '"Results may vary" disclaimer missing')
})

if (process.exitCode) {
  console.error('RESULT: FAILED')
  process.exit(process.exitCode)
}

console.log('RESULT: PASSED')
