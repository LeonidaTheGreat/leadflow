/*
taskSpec:
- What:
  - Update product/lead-response/dashboard/tests/feat-landing-page-conversion-cleanup.test.js:
    - Fix stale pricing CTA assertion to match `/signup/trial?plan=...` links emitted by `PricingCard`.
    - Fix stale social-proof assertion to validate actual `OutcomeCard` usage.
    - Keep pricing consistency assertion aligned with current Starter pricing (`$49` landing / `49` signup).
- Verify:
  - `cd product/lead-response/dashboard && node tests/feat-landing-page-conversion-cleanup.test.js` exits 0.
  - `cd product/lead-response/dashboard && npm run build` exits 0.
- Boundaries:
  - Do not modify landing/signup page runtime behavior.
  - Do not touch backend services/routes/db schema.
*/

const assert = require('assert')
const fs = require('fs')
const path = require('path')

const landingPath = path.resolve(__dirname, '../app/page.tsx')
const signupPath = path.resolve(__dirname, '../app/signup/page.tsx')

const landing = fs.readFileSync(landingPath, 'utf8')
const signup = fs.readFileSync(signupPath, 'utf8')

function test(name, fn) {
  try {
    fn()
    console.log(`PASS: ${name}`)
  } catch (err) {
    console.error(`FAIL: ${name}`)
    console.error(`  ${err.message}`)
    process.exitCode = 1
  }
}

console.log('Running E2E checks for feat-landing-page-conversion-cleanup')

test('API Endpoints section removed from landing page', () => {
  assert(!/API\s+Endpoints/i.test(landing), 'Found "API Endpoints" in landing page')
})

test('How It Works has exactly 3 steps', () => {
  const steps = landing.match(/<HowItWorksStep/g) || []
  assert.strictEqual(steps.length, 3, `Expected 3 steps, got ${steps.length}`)
})

test('Pricing CTAs deep-link to /signup?plan=starter|pro|team', () => {
  assert(/`\/signup\/trial\?plan=\$\{planSlug\}`/.test(landing), 'Missing plan deep-link template')
  assert(landing.includes('name="Starter"'), 'Missing Starter plan')
  assert(landing.includes('name="Pro"'), 'Missing Pro plan')
  assert(landing.includes('name="Team"'), 'Missing Team plan')
})

test('Social proof section includes pilot outcome cards', () => {
  const cards = landing.match(/<OutcomeCard/g) || []
  assert(cards.length >= 3, `Expected at least 3 outcome cards, got ${cards.length}`)
  assert(landing.includes('What Early Agents Experience'), 'Social proof section heading missing')
})

test('Pricing + trial messaging is consistent between landing and signup', () => {
  assert(landing.includes("price={pricingPeriod === 'monthly' ? '$49' : '$490'}"), 'Landing page Starter pricing config mismatch')
  assert(signup.includes('price: 49'), 'Signup Starter price is not 49')

  const landingTrial = landing.match(/(\d+)-day free trial/i)
  const signupTrial = signup.match(/(\d+)-day free trial/i)
  assert(landingTrial, 'Landing trial messaging missing day count')
  assert(signupTrial, 'Signup trial messaging missing day count')
  assert.strictEqual(
    landingTrial[1],
    signupTrial[1],
    `Trial day mismatch: landing=${landingTrial[1]} signup=${signupTrial[1]}`
  )
})

test('No Free pilot wording on landing pricing cards', () => {
  assert(!/free pilot/i.test(landing), 'Landing contains conflicting "Free pilot" language')
})

test('Urgency banner includes scarcity and deadline trigger', () => {
  assert(landing.includes('Limited Pilot Spots:'), 'Urgency banner label missing')
  assert(landing.includes('Only 10 spots remaining for Q1 2026'), 'Urgency deadline/scarcity copy missing')
  assert(landing.includes('20% lifetime pricing'), 'Urgency pricing incentive missing')
})

if (process.exitCode) {
  console.error('E2E RESULT: FAILED')
  process.exit(process.exitCode)
}

console.log('E2E RESULT: PASSED')
