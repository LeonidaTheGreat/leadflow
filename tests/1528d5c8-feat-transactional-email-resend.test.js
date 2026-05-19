'use strict'

/**
 * Test: feat-transactional-email-resend
 *
 * Validates the transactional email delivery layer:
 * - pilot-signup uses shared sendWelcomeEmail from email-service (no duplicate inline impl)
 * - trial-signup uses shared sendWelcomeEmail non-blocking
 * - email-service exports all required functions with correct signatures
 * - Email templates include LeadFlow AI branding and pilot 60-day copy
 * - No hardcoded secrets
 * - Graceful fallback when RESEND_API_KEY is absent
 */

const assert = require('assert')
const fs = require('fs')
const path = require('path')

const DASHBOARD = path.resolve(__dirname, '..', 'product', 'lead-response', 'dashboard')
const LIB = path.join(DASHBOARD, 'lib')
const AUTH = path.join(DASHBOARD, 'app', 'api', 'auth')

let passed = 0
let failed = 0

function test(name, fn) {
  try {
    fn()
    console.log(`  PASS: ${name}`)
    passed++
  } catch (err) {
    console.log(`  FAIL: ${name}`)
    console.log(`    ${err.message}`)
    failed++
  }
}

console.log('\n=== feat-transactional-email-resend ===\n')

// ── email-service.ts ──────────────────────────────────────────────────────────

const emailService = fs.readFileSync(path.join(LIB, 'email-service.ts'), 'utf8')

test('email-service exports sendWelcomeEmail', () => {
  assert.ok(emailService.includes('export async function sendWelcomeEmail'), 'sendWelcomeEmail not exported')
})

test('email-service sendWelcomeEmail accepts agentId parameter', () => {
  const fnSig = emailService.slice(emailService.indexOf('export async function sendWelcomeEmail'))
  assert.ok(fnSig.includes('agentId'), 'agentId parameter missing from sendWelcomeEmail signature')
})

test('email-service sendWelcomeEmail handles pilot planTier (60 days)', () => {
  assert.ok(emailService.includes('isPilot'), 'isPilot logic missing')
  assert.ok(emailService.includes('60'), '60-day copy missing')
})

test('email-service sendWelcomeEmail has LeadFlow AI branding', () => {
  assert.ok(emailService.includes('LeadFlow AI'), 'LeadFlow AI branding missing')
})

test('email-service handles missing RESEND_API_KEY gracefully', () => {
  assert.ok(emailService.includes('RESEND_API_KEY'), 'RESEND_API_KEY check missing')
  const hasGraceful = emailService.includes('not configured') ||
    emailService.includes('queued') ||
    emailService.includes('console.log') ||
    emailService.includes('logger.')
  assert.ok(hasGraceful, 'No graceful fallback when RESEND_API_KEY absent')
})

test('email-service.ts uses onboarding@landyourleads.com FROM fallback', () => {
  assert.ok(emailService.includes('onboarding@landyourleads.com'), 'FROM fallback incorrect')
})

// ── pilot-signup/route.ts ─────────────────────────────────────────────────────

const pilotRoute = fs.readFileSync(path.join(AUTH, 'pilot-signup', 'route.ts'), 'utf8')

test('pilot-signup imports sendWelcomeEmail from email-service (not inline)', () => {
  assert.ok(
    pilotRoute.includes("import { sendWelcomeEmail } from '@/lib/email-service'") ||
    pilotRoute.includes('import { sendWelcomeEmail } from "@/lib/email-service"'),
    'sendWelcomeEmail must be imported from @/lib/email-service'
  )
})

test('pilot-signup does NOT define its own sendWelcomeEmail function', () => {
  assert.ok(
    !pilotRoute.includes('async function sendWelcomeEmail'),
    'Inline sendWelcomeEmail still present — should be removed'
  )
})

test('pilot-signup calls sendWelcomeEmail with planTier: pilot', () => {
  assert.ok(pilotRoute.includes("planTier: 'pilot'"), "planTier: 'pilot' missing from sendWelcomeEmail call")
})

test('pilot-signup sends welcome email non-blocking (void)', () => {
  assert.ok(pilotRoute.includes('void sendWelcomeEmail('), 'void keyword missing — must be non-blocking')
})

test('pilot-signup passes agentId to sendWelcomeEmail', () => {
  const callIdx = pilotRoute.indexOf('void sendWelcomeEmail(')
  const callSlice = pilotRoute.slice(callIdx, callIdx + 200)
  assert.ok(callSlice.includes('agent.id'), 'agent.id not passed to sendWelcomeEmail')
})

// ── trial-signup/route.ts ─────────────────────────────────────────────────────

const trialRoute = fs.readFileSync(path.join(AUTH, 'trial-signup', 'route.ts'), 'utf8')

test('trial-signup imports sendWelcomeEmail from email-service', () => {
  assert.ok(
    trialRoute.includes("from '@/lib/email-service'") || trialRoute.includes('from "@/lib/email-service"'),
    'trial-signup does not import from email-service'
  )
  assert.ok(trialRoute.includes('sendWelcomeEmail'), 'sendWelcomeEmail not used in trial-signup')
})

test('trial-signup sends welcome email non-blocking', () => {
  // Accepts both: void sendWelcomeEmail(...) and void (async () => { await sendWelcomeEmail(...) })()
  const isNonBlocking = trialRoute.includes('void sendWelcomeEmail(') || trialRoute.includes('void (async')
  assert.ok(isNonBlocking, 'sendWelcomeEmail in trial-signup must be non-blocking (void prefix or void IIFE)')
})

// ── no hardcoded secrets ──────────────────────────────────────────────────────

test('no hardcoded API keys in email-service.ts', () => {
  assert.ok(!/re_[a-zA-Z0-9]{20,}/.test(emailService), 'Hardcoded Resend API key in email-service.ts')
  assert.ok(!/sk_live_[a-zA-Z0-9]+/.test(emailService), 'Hardcoded Stripe live key in email-service.ts')
})

test('no hardcoded API keys in pilot-signup/route.ts', () => {
  assert.ok(!/re_[a-zA-Z0-9]{20,}/.test(pilotRoute), 'Hardcoded Resend API key in pilot-signup')
})

// ── summary ───────────────────────────────────────────────────────────────────

console.log(`\nResults: ${passed}/${passed + failed} passed`)
if (failed > 0) process.exit(1)
