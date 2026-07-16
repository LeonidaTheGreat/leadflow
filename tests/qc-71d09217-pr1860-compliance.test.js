'use strict'

const assert = require('assert')
const fs = require('fs')
const path = require('path')

let passed = 0, failed = 0

function test(name, fn) {
  try {
    fn()
    console.log(`  PASS: ${name}`)
    passed++
  } catch (e) {
    console.log(`  FAIL: ${name}: ${e.message}`)
    failed++
  }
}

const dashboardDir = path.join(__dirname, '../product/lead-response/dashboard')
const routeFile = path.join(dashboardDir, 'app/api/admin/activation/route.ts')
const pageFile = path.join(dashboardDir, 'app/admin/activation/page.tsx')
const adminPage = path.join(dashboardDir, 'app/admin/page.tsx')
const migrationFile = path.join(__dirname, '../scripts/db/add-activation-sms-timestamp.sql')

console.log('\nQC PR #1860 — SMS Activation Nudge structural + compliance tests\n')

// --- File existence ---
test('Route file exists', () => {
  assert.ok(fs.existsSync(routeFile), 'route.ts should exist')
})

test('Page file exists', () => {
  assert.ok(fs.existsSync(pageFile), 'page.tsx should exist')
})

test('Migration file exists', () => {
  assert.ok(fs.existsSync(migrationFile), 'SQL migration should exist')
})

// --- Route structure ---
const routeSrc = fs.readFileSync(routeFile, 'utf8')

test('Route imports requireAdmin', () => {
  assert.ok(routeSrc.includes('requireAdmin'), 'must use admin auth gate')
})

test('Route imports postgrestAdmin', () => {
  assert.ok(routeSrc.includes('postgrestAdmin'), 'must use postgrestAdmin for DB')
})

test('Route imports sendSms from twilio', () => {
  assert.ok(routeSrc.includes("sendSms"), 'must use sendSms')
  assert.ok(routeSrc.includes("from '@/lib/twilio'"), 'must import from twilio lib')
})

test('GET handler exists', () => {
  assert.ok(routeSrc.includes('export async function GET'), 'GET handler required')
})

test('POST handler exists', () => {
  assert.ok(routeSrc.includes('export async function POST'), 'POST handler required')
})

test('GET enforces admin auth', () => {
  const getIdx = routeSrc.indexOf('export async function GET')
  const nextExport = routeSrc.indexOf('export async function POST')
  const getBody = routeSrc.slice(getIdx, nextExport)
  assert.ok(getBody.includes('requireAdmin'), 'GET must check admin auth')
  assert.ok(getBody.includes('401'), 'GET must return 401 on auth failure')
})

test('POST enforces admin auth', () => {
  const postIdx = routeSrc.indexOf('export async function POST')
  const postBody = routeSrc.slice(postIdx)
  assert.ok(postBody.includes('requireAdmin'), 'POST must check admin auth')
  assert.ok(postBody.includes('401'), 'POST must return 401 on auth failure')
})

test('POST validates request body', () => {
  const postIdx = routeSrc.indexOf('export async function POST')
  const postBody = routeSrc.slice(postIdx)
  assert.ok(postBody.includes('400'), 'POST must return 400 on invalid body')
})

test('POST handles single agent (agentId)', () => {
  assert.ok(routeSrc.includes('agentId'), 'must support single-agent nudge')
})

test('POST handles bulk (bulkAll)', () => {
  assert.ok(routeSrc.includes('bulkAll'), 'must support bulk nudge')
})

// --- Compliance checks (CRITICAL) ---
test('SMS message includes opt-out / STOP language', () => {
  const msgMatch = routeSrc.match(/function buildNudgeMessage[\s\S]*?return\s+[`'"]([\s\S]*?)[`'"]/m)
  assert.ok(msgMatch, 'buildNudgeMessage must exist with a return string')
  const msgTemplate = msgMatch[1].toLowerCase()
  const hasStop = msgTemplate.includes('stop') || msgTemplate.includes('opt out') || msgTemplate.includes('opt-out') || msgTemplate.includes('unsubscribe')
  assert.ok(hasStop, 'SMS nudge MUST include STOP/opt-out language for A2P/TCPA compliance. Current message: ' + msgMatch[1])
})

test('Onboarding URL is not hardcoded (should use env var)', () => {
  const hasHardcoded = routeSrc.includes("'https://leadflow-ai-five.vercel.app")
  const usesEnvVar = routeSrc.includes('process.env.NEXT_PUBLIC_APP_URL') || routeSrc.includes('process.env.ONBOARDING_URL')
  assert.ok(!hasHardcoded || usesEnvVar, 'Onboarding URL should come from env var, not hardcoded. Other routes use NEXT_PUBLIC_APP_URL.')
})

// --- Migration checks ---
const migSrc = fs.readFileSync(migrationFile, 'utf8')

test('Migration adds last_activation_sms_at column', () => {
  assert.ok(migSrc.includes('last_activation_sms_at'), 'column name must match')
  assert.ok(migSrc.includes('TIMESTAMPTZ'), 'must be timestamptz')
})

test('Migration uses IF NOT EXISTS', () => {
  assert.ok(migSrc.includes('IF NOT EXISTS'), 'must be idempotent')
})

// --- Frontend page checks ---
const pageSrc = fs.readFileSync(pageFile, 'utf8')

test('Page calls GET /api/admin/activation', () => {
  assert.ok(pageSrc.includes("/api/admin/activation"), 'must call the activation API')
})

test('Page handles 401 redirect to login', () => {
  assert.ok(pageSrc.includes('401'), 'must handle 401')
  assert.ok(pageSrc.includes('/admin/login'), 'must redirect to login on 401')
})

test('Page has nudge-all button', () => {
  assert.ok(pageSrc.includes('nudge-all-btn') || pageSrc.includes('nudgeAll'), 'must have bulk nudge UI')
})

// --- Admin page link ---
const adminSrc = fs.readFileSync(adminPage, 'utf8')

test('Admin page links to /admin/activation', () => {
  assert.ok(adminSrc.includes('/admin/activation'), 'admin page must link to activation page')
})

// --- Phone validation ---
test('Route validates phone numbers before sending', () => {
  assert.ok(routeSrc.includes('isValidPhoneNumber'), 'must validate phone format')
  assert.ok(routeSrc.includes('normalizePhone'), 'must normalize phone')
})

// --- Summary ---
console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
