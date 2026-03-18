/**
 * E2E Test: fix-landing-page-has-no-pricing-section
 *
 * Verifies that the landing page (app/page.tsx) now includes a proper
 * PricingSection component with 4 tiers, correct prices, and CTA links.
 */

const fs = require('fs')
const path = require('path')
const assert = require('assert')

const ROOT = path.resolve(__dirname, '..')

let passed = 0
let failed = 0
const results = []

function test(name, fn) {
  try {
    fn()
    console.log(`  ✓ ${name}`)
    passed++
    results.push({ name, status: 'pass' })
  } catch (err) {
    console.error(`  ✗ ${name}`)
    console.error(`    ${err.message}`)
    failed++
    results.push({ name, status: 'fail', error: err.message })
  }
}

console.log('\n=== Landing Page Pricing Section E2E Tests ===\n')

// --- PricingSection.tsx exists ---
const pricingComponentPath = path.join(ROOT, 'components', 'PricingSection.tsx')
const pricingComponentSrc = fs.existsSync(pricingComponentPath)
  ? fs.readFileSync(pricingComponentPath, 'utf8')
  : null

test('PricingSection.tsx component file exists', () => {
  assert.ok(pricingComponentSrc, 'components/PricingSection.tsx not found')
})

test('PricingSection has section#pricing with id="pricing"', () => {
  assert.ok(pricingComponentSrc, 'component not found')
  assert.ok(
    pricingComponentSrc.includes('id="pricing"'),
    'PricingSection must have id="pricing" for anchor nav'
  )
})

test('PricingSection has data-testid="pricing-section"', () => {
  assert.ok(pricingComponentSrc, 'component not found')
  assert.ok(
    pricingComponentSrc.includes('data-testid="pricing-section"'),
    'Missing data-testid="pricing-section"'
  )
})

test('PricingSection exports PRICING_PLANS array', () => {
  assert.ok(pricingComponentSrc, 'component not found')
  assert.ok(
    pricingComponentSrc.includes('export const PRICING_PLANS'),
    'PRICING_PLANS must be exported'
  )
})

// --- 4 tiers present ---
// The component uses template literals: data-testid={`pricing-card-${plan.tier}`}
// So we check that each tier string appears in PRICING_PLANS and the template pattern exists
const tiers = ['starter', 'pro', 'team', 'brokerage']
test('PricingSection renders cards via PRICING_PLANS map (template testids)', () => {
  assert.ok(pricingComponentSrc, 'component not found')
  // Template literal pattern: data-testid={`pricing-card-${plan.tier}`}
  assert.ok(
    pricingComponentSrc.includes('data-testid={`pricing-card-${plan.tier}`}'),
    'PricingSection must use data-testid template for plan tier cards'
  )
})

tiers.forEach((tier) => {
  test(`PRICING_PLANS includes tier: "${tier}"`, () => {
    assert.ok(pricingComponentSrc, 'component not found')
    assert.ok(
      pricingComponentSrc.includes(`tier: '${tier}'`),
      `PRICING_PLANS must include tier: '${tier}'`
    )
  })
})

// --- Prices match PMF.md (49/149/399/999) ---
const expectedPrices = { starter: 49, pro: 149, team: 399, brokerage: 999 }
Object.entries(expectedPrices).forEach(([tier, price]) => {
  test(`${tier} plan monthlyPrice = $${price}`, () => {
    assert.ok(pricingComponentSrc, 'component not found')
    assert.ok(
      pricingComponentSrc.includes(`monthlyPrice: ${price}`),
      `Expected monthlyPrice: ${price} for ${tier} tier`
    )
  })
})

test('"Most Popular" badge present for Pro tier (highlighted)', () => {
  assert.ok(pricingComponentSrc, 'component not found')
  assert.ok(
    pricingComponentSrc.includes('Most Popular'),
    'Missing "Most Popular" badge on highlighted Pro plan'
  )
})

test('Brokerage CTA links to mailto:hello@leadflowai.com', () => {
  assert.ok(pricingComponentSrc, 'component not found')
  assert.ok(
    pricingComponentSrc.includes('mailto:hello@leadflowai.com'),
    'Brokerage CTA must be a mailto link'
  )
})

// --- Landing page (app/page.tsx) wires PricingSection ---
const landingPagePath = path.join(ROOT, 'app', 'page.tsx')
const landingPageSrc = fs.existsSync(landingPagePath)
  ? fs.readFileSync(landingPagePath, 'utf8')
  : null

test('app/page.tsx imports PricingSection', () => {
  assert.ok(landingPageSrc, 'app/page.tsx not found')
  assert.ok(
    landingPageSrc.includes("import PricingSection from '@/components/PricingSection'"),
    'app/page.tsx must import PricingSection'
  )
})

test('app/page.tsx renders <PricingSection />', () => {
  assert.ok(landingPageSrc, 'app/page.tsx not found')
  assert.ok(
    landingPageSrc.includes('<PricingSection />'),
    'app/page.tsx must render <PricingSection />'
  )
})

test('app/page.tsx nav has #pricing anchor link', () => {
  assert.ok(landingPageSrc, 'app/page.tsx not found')
  assert.ok(
    landingPageSrc.includes('href="#pricing"'),
    'Nav must include <a href="#pricing"> link'
  )
})

test('Old placeholder "Pricing CTA section" removed from page.tsx', () => {
  assert.ok(landingPageSrc, 'app/page.tsx not found')
  assert.ok(
    !landingPageSrc.includes('Pricing CTA section'),
    'Old placeholder "Pricing CTA section" comment must be replaced by PricingSection'
  )
})

// --- Existing tests for pricing still pass (smoke-check the test files) ---
const pricingTestPaths = [
  path.join(ROOT, '__tests__', 'pricing-section.test.ts'),
  path.join(ROOT, '__tests__', 'pricing-page.test.ts'),
]

pricingTestPaths.forEach((p) => {
  test(`Pricing test file exists: ${path.basename(p)}`, () => {
    assert.ok(fs.existsSync(p), `Missing test file: ${p}`)
  })
})

// --- Summary ---
console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`)

if (failed > 0) {
  process.exit(1)
}
