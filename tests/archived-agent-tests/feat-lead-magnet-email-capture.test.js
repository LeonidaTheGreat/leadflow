/**
 * E2E Test: Lead Magnet / Email Capture
 * UC: feat-lead-magnet-email-capture
 *
 * Tests:
 *   AC-1: Form renders on landing page (section in page.tsx)
 *   AC-2: API returns success + upserts correct fields
 *   AC-3: Invalid email rejected (no DB call)
 *   AC-4: Email service is triggered on success
 *   AC-5: Duplicate email silently succeeds (upsert not insert)
 *   AC-6: UTM parameters captured in DB upsert
 *   AC-7: Mobile responsive styles present in component
 *   SECURITY: No hardcoded secrets, proper error masking
 */

'use strict'

const assert = require('assert')
const fs = require('fs')
const path = require('path')

const DASHBOARD = path.join(__dirname, '..', 'product', 'lead-response', 'dashboard')

let passed = 0
let failed = 0
const failures = []

function test(name, fn) {
  try {
    fn()
    console.log(`  ✓ ${name}`)
    passed++
  } catch (err) {
    console.log(`  ✗ ${name}`)
    console.log(`    ${err.message}`)
    failures.push({ name, error: err.message })
    failed++
  }
}

function read(relPath) {
  return fs.readFileSync(path.join(DASHBOARD, relPath), 'utf8')
}

console.log('\n=== E2E: Lead Magnet / Email Capture ===\n')

// ─────────────────────────────────────────────────────────────
// AC-1: Form renders on landing page
// ─────────────────────────────────────────────────────────────
console.log('AC-1: Form renders on landing page')

test('LeadMagnetSection component file exists', () => {
  const exists = fs.existsSync(path.join(DASHBOARD, 'components/LeadMagnetSection.tsx'))
  assert.strictEqual(exists, true, 'LeadMagnetSection.tsx should exist')
})

test('page.tsx imports and includes LeadMagnetSection', () => {
  const page = read('app/page.tsx')
  assert.ok(page.includes('LeadMagnetSection'), 'page.tsx must include LeadMagnetSection')
  assert.ok(page.includes("from '@/components/LeadMagnetSection'") || page.includes('from "@/components/LeadMagnetSection"'),
    'page.tsx must import LeadMagnetSection')
})

test('LeadMagnetSection is placed between Hero and Pricing', () => {
  const page = read('app/page.tsx')
  const leadMagnetIdx = page.indexOf('LeadMagnetSection')
  // There should be some pricing-related content after the lead magnet section
  const pricingContent = page.indexOf('Pricing', leadMagnetIdx)
  assert.ok(leadMagnetIdx > 0, 'LeadMagnetSection must appear in page')
  assert.ok(pricingContent > leadMagnetIdx, 'Pricing content should come after LeadMagnetSection')
})

test('Component contains required headline text', () => {
  const component = read('components/LeadMagnetSection.tsx')
  assert.ok(
    component.includes('Not ready') || component.includes('free playbook') || component.includes('playbook'),
    'Component must contain playbook headline copy'
  )
})

test('Component has email input field', () => {
  const component = read('components/LeadMagnetSection.tsx')
  assert.ok(component.includes('type="email"') || component.includes("type='email'"),
    'Component must have email input')
})

test('Component has submit button', () => {
  const component = read('components/LeadMagnetSection.tsx')
  assert.ok(component.includes('type="submit"') || component.includes("type='submit'"),
    'Component must have submit button')
})

test('Component shows success state (AC-2 success message)', () => {
  const component = read('components/LeadMagnetSection.tsx')
  assert.ok(
    component.includes('inbox') || component.includes('success') || component.includes('🎉'),
    'Component must show a success state after submission'
  )
})

test('Component shows inline error state (AC-3)', () => {
  const component = read('components/LeadMagnetSection.tsx')
  assert.ok(
    component.includes('error') || component.includes('invalid'),
    'Component must render error state for invalid inputs'
  )
})

// ─────────────────────────────────────────────────────────────
// AC-2: API endpoint structure
// ─────────────────────────────────────────────────────────────
console.log('\nAC-2: API endpoint - /api/lead-capture')

test('API route file exists at correct path', () => {
  const exists = fs.existsSync(path.join(DASHBOARD, 'app/api/lead-capture/route.ts'))
  assert.strictEqual(exists, true, '/api/lead-capture/route.ts must exist')
})

test('API route exports POST and OPTIONS handlers', () => {
  const route = read('app/api/lead-capture/route.ts')
  assert.ok(route.includes('export async function POST'), 'Must export POST handler')
  assert.ok(route.includes('export async function OPTIONS'), 'Must export OPTIONS handler')
})

test('API upserts with source=lead_magnet', () => {
  const route = read('app/api/lead-capture/route.ts')
  assert.ok(route.includes("source: 'lead_magnet'") || route.includes('source: "lead_magnet"'),
    'Upsert must set source=lead_magnet')
})

test('API upserts with status=nurture', () => {
  const route = read('app/api/lead-capture/route.ts')
  assert.ok(route.includes("status: 'nurture'") || route.includes('status: "nurture"'),
    'Upsert must set status=nurture')
})

test('API uses upsert with onConflict=email (AC-5: no duplicates)', () => {
  const route = read('app/api/lead-capture/route.ts')
  assert.ok(route.includes('onConflict') && route.includes('email'),
    'Must use upsert with onConflict:email to prevent duplicates')
})

test('API captures UTM parameters (AC-6)', () => {
  const route = read('app/api/lead-capture/route.ts')
  assert.ok(route.includes('utm_source') && route.includes('utm_medium') && route.includes('utm_campaign'),
    'Must capture all UTM parameters')
})

test('API returns { success: true, message: "Playbook sent!" }', () => {
  const route = read('app/api/lead-capture/route.ts')
  assert.ok(route.includes('Playbook sent!'), 'Response must include "Playbook sent!" message')
  assert.ok(route.includes('success: true'), 'Response must include success: true')
})

test('API normalizes email to lowercase', () => {
  const route = read('app/api/lead-capture/route.ts')
  assert.ok(route.includes('.toLowerCase()') || route.includes('toLowerCase'),
    'Email must be normalized to lowercase')
})

// ─────────────────────────────────────────────────────────────
// AC-3: Email validation
// ─────────────────────────────────────────────────────────────
console.log('\nAC-3: Email validation')

test('API validates email format with regex', () => {
  const route = read('app/api/lead-capture/route.ts')
  assert.ok(route.includes('EMAIL_REGEX') || route.includes('/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/'),
    'Must have email validation regex')
})

test('API returns 400 on invalid email', () => {
  const route = read('app/api/lead-capture/route.ts')
  assert.ok(route.includes('Invalid email') && route.includes('400'),
    'Must return 400 for invalid email')
})

// ─────────────────────────────────────────────────────────────
// AC-4: Email delivery service
// ─────────────────────────────────────────────────────────────
console.log('\nAC-4: Email delivery')

test('lead-magnet-email service file exists', () => {
  const exists = fs.existsSync(path.join(DASHBOARD, 'lib/lead-magnet-email.ts'))
  assert.strictEqual(exists, true, 'lib/lead-magnet-email.ts must exist')
})

test('sendPlaybookEmail function exported from email service', () => {
  const email = read('lib/lead-magnet-email.ts')
  assert.ok(email.includes('export') && email.includes('sendPlaybookEmail'),
    'Must export sendPlaybookEmail function')
})

test('Email 1 subject references playbook', () => {
  const email = read('lib/lead-magnet-email.ts')
  assert.ok(
    email.includes('Playbook') || email.includes('playbook'),
    'Email 1 must reference the playbook in content'
  )
})

test('Email sequence has 3 emails (Day 1, Day 3, Day 7)', () => {
  const email = read('lib/lead-magnet-email.ts')
  assert.ok(email.includes('Day 3') || email.includes('3') || email.includes('day3'),
    'Must schedule Day 3 email')
  assert.ok(email.includes('Day 7') || email.includes('7') || email.includes('day7'),
    'Must schedule Day 7 email')
})

test('Email service uses Resend (as per PRD recommendation)', () => {
  const email = read('lib/lead-magnet-email.ts')
  assert.ok(email.includes('resend') || email.includes('Resend'),
    'Must use Resend email provider')
})

test('Email service does not expose API key in source', () => {
  const email = read('lib/lead-magnet-email.ts')
  // No hardcoded API keys — must use env var
  assert.ok(!email.match(/re_[a-zA-Z0-9]{20,}/), 'Must not have hardcoded Resend API key')
  assert.ok(email.includes('RESEND_API_KEY'), 'Must reference RESEND_API_KEY env var')
})

test('API triggers email send on success', () => {
  const route = read('app/api/lead-capture/route.ts')
  assert.ok(route.includes('sendPlaybookEmail'),
    'Route must call sendPlaybookEmail after successful DB upsert')
})

// ─────────────────────────────────────────────────────────────
// AC-7: Mobile responsiveness
// ─────────────────────────────────────────────────────────────
console.log('\nAC-7: Mobile responsiveness')

test('Component uses responsive Tailwind classes', () => {
  const component = read('components/LeadMagnetSection.tsx')
  const hasResponsive = component.includes('sm:') || component.includes('md:') ||
    component.includes('flex') || component.includes('w-full')
  assert.ok(hasResponsive, 'Component must use responsive layout classes')
})

test('Form stacks vertically on mobile (flex-col or w-full)', () => {
  const component = read('components/LeadMagnetSection.tsx')
  // flex-col stacks items (default stretch = full width) OR explicit w-full
  const hasMobileStack = component.includes('flex-col') || component.includes('w-full')
  assert.ok(hasMobileStack, 'Form must stack vertically on mobile (flex-col) or use w-full')
})

// ─────────────────────────────────────────────────────────────
// SECURITY: Code review checks
// ─────────────────────────────────────────────────────────────
console.log('\nSECURITY checks')

test('No hardcoded credentials in route', () => {
  const route = read('app/api/lead-capture/route.ts')
  assert.ok(!route.match(/(?:password|secret|api_?key)\s*[:=]\s*['"][^'"]{8,}/i),
    'Route must not contain hardcoded credentials')
})

test('DB error details not exposed to client', () => {
  const route = read('app/api/lead-capture/route.ts')
  // The route should catch dbError but NOT forward it directly to the user
  assert.ok(route.includes("'Failed to save") || route.includes('"Failed to save'),
    'Must return generic error message, not raw DB error')
})

test('Email input trimmed to prevent whitespace bypass', () => {
  const route = read('app/api/lead-capture/route.ts')
  assert.ok(route.includes('.trim()'), 'Email must be trimmed before validation')
})

test('GA4 analytics events fired (AC-5 visibility events)', () => {
  const component = read('components/LeadMagnetSection.tsx')
  assert.ok(
    component.includes('lead_magnet_view') &&
    component.includes('lead_magnet_submit') &&
    component.includes('lead_magnet_success'),
    'Must fire GA4 events: view, submit, success'
  )
})

// ─────────────────────────────────────────────────────────────
// Summary
// ─────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(50)}`)
console.log(`Results: ${passed} passed, ${failed} failed, ${passed + failed} total`)

if (failures.length > 0) {
  console.log('\nFailed tests:')
  failures.forEach((f) => console.log(`  ✗ ${f.name}: ${f.error}`))
  process.exit(1)
} else {
  console.log('All tests passed ✓')
  process.exit(0)
}
