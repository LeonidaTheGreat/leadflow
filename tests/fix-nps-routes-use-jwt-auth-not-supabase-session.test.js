/**
 * Test: NPS API Routes Use JWT Auth (not Supabase getSession)
 * Task ID: 8af3565c-1594-4141-ad22-85911d2558a8
 *
 * Verifies that the NPS routes (/api/nps/prompt-status, /api/nps/dismiss, /api/nps/submit)
 * use the project's JWT auth-token cookie pattern and NOT the Supabase getSession()
 * method (which always returns null in the custom PostgREST client and causes
 * TypeScript build errors).
 *
 * Root cause: getSession() in lib/db.ts always returns { session: null },
 * causing TypeScript to infer `session` as null, and session?.user causes
 * "Property 'user' does not exist on type 'never'" type error in strict mode.
 */

const assert = require('assert')
const fs = require('fs')
const path = require('path')

const DASHBOARD_ROOT = path.join(__dirname, '../product/lead-response/dashboard')
const NPS_DISMISS = path.join(DASHBOARD_ROOT, 'app/api/nps/dismiss/route.ts')
const NPS_PROMPT_STATUS = path.join(DASHBOARD_ROOT, 'app/api/nps/prompt-status/route.ts')
const NPS_SUBMIT = path.join(DASHBOARD_ROOT, 'app/api/nps/submit/route.ts')

let passed = 0
let failed = 0

function test(name, fn) {
  try {
    fn()
    console.log(`  ✅ ${name}`)
    passed++
  } catch (err) {
    console.log(`  ❌ ${name}: ${err.message}`)
    failed++
  }
}

console.log('\n============================================================')
console.log('🧪 NPS Routes JWT Auth Fix — Unit Tests')
console.log('============================================================\n')

// --- dismiss/route.ts ---
console.log('NPS Dismiss Route:')
const dismissContent = fs.readFileSync(NPS_DISMISS, 'utf-8')

test('does not use getSession()', () => {
  assert(!dismissContent.includes('getSession'), 'Should not use getSession() — always returns null')
})

test('imports jwt', () => {
  assert(dismissContent.includes("import jwt from 'jsonwebtoken'"), 'Should import jsonwebtoken')
})

test('reads auth-token cookie', () => {
  assert(dismissContent.includes('auth-token'), 'Should read auth-token cookie')
})

test('verifies JWT with JWT_SECRET', () => {
  assert(dismissContent.includes('jwt.verify'), 'Should verify JWT token')
  assert(dismissContent.includes('JWT_SECRET'), 'Should use JWT_SECRET constant')
})

test('extracts agentId from payload', () => {
  assert(
    dismissContent.includes('payload.userId || payload.id'),
    'Should extract agentId from userId or id field'
  )
})

// --- prompt-status/route.ts ---
console.log('\nNPS Prompt Status Route:')
const promptStatusContent = fs.readFileSync(NPS_PROMPT_STATUS, 'utf-8')

test('does not use getSession()', () => {
  assert(!promptStatusContent.includes('getSession'), 'Should not use getSession() — always returns null')
})

test('imports jwt', () => {
  assert(promptStatusContent.includes("import jwt from 'jsonwebtoken'"), 'Should import jsonwebtoken')
})

test('reads auth-token cookie', () => {
  assert(promptStatusContent.includes('auth-token'), 'Should read auth-token cookie')
})

test('verifies JWT with JWT_SECRET', () => {
  assert(promptStatusContent.includes('jwt.verify'), 'Should verify JWT token')
})

// --- submit/route.ts ---
console.log('\nNPS Submit Route:')
const submitContent = fs.readFileSync(NPS_SUBMIT, 'utf-8')

test('does not use getSession()', () => {
  assert(!submitContent.includes('getSession'), 'Should not use getSession() — always returns null')
})

test('imports jwt', () => {
  assert(submitContent.includes("import jwt from 'jsonwebtoken'"), 'Should import jsonwebtoken')
})

test('reads auth-token cookie for in-app submission', () => {
  assert(submitContent.includes('auth-token'), 'Should read auth-token cookie')
})

test('verifies JWT token for in-app path', () => {
  assert(submitContent.includes('jwt.verify'), 'Should verify JWT token')
})

// --- Build verification ---
console.log('\nBuild Verification:')
test('dismiss route file exists', () => {
  assert(fs.existsSync(NPS_DISMISS), 'dismiss/route.ts must exist')
})

test('prompt-status route file exists', () => {
  assert(fs.existsSync(NPS_PROMPT_STATUS), 'prompt-status/route.ts must exist')
})

test('submit route file exists', () => {
  assert(fs.existsSync(NPS_SUBMIT), 'submit/route.ts must exist')
})

// --- UC-7 Dashboard Manual SMS verification ---
console.log('\nUC-7 Dashboard Manual SMS:')
const SEND_MANUAL_ROUTE = path.join(DASHBOARD_ROOT, 'app/api/sms/send-manual/route.ts')
const CONVERSATION_VIEW = path.join(DASHBOARD_ROOT, 'components/dashboard/ConversationView.tsx')

test('send-manual API route exists', () => {
  assert(fs.existsSync(SEND_MANUAL_ROUTE), '/api/sms/send-manual/route.ts must exist')
})

test('send-manual accepts lead_id and message_body', () => {
  const content = fs.readFileSync(SEND_MANUAL_ROUTE, 'utf-8')
  assert(content.includes('lead_id'), 'Should accept lead_id')
  assert(content.includes('message_body'), 'Should accept message_body')
})

test('send-manual has ai_assist feature', () => {
  const content = fs.readFileSync(SEND_MANUAL_ROUTE, 'utf-8')
  assert(content.includes('ai_assist'), 'Should have ai_assist parameter')
})

test('send-manual enforces consent and DNC check', () => {
  const content = fs.readFileSync(SEND_MANUAL_ROUTE, 'utf-8')
  assert(content.includes('consent_sms'), 'Should check consent_sms')
  assert(content.includes('dnc'), 'Should check DNC status')
})

test('ConversationView component exists for message thread UI', () => {
  assert(fs.existsSync(CONVERSATION_VIEW), 'ConversationView.tsx must exist')
})

test('ConversationView has message send functionality', () => {
  const content = fs.readFileSync(CONVERSATION_VIEW, 'utf-8')
  assert(content.includes('handleSend'), 'Should have send handler')
  assert(content.includes('/api/sms/send'), 'Should call SMS send API')
})

test('ConversationView has AI assist feature', () => {
  const content = fs.readFileSync(CONVERSATION_VIEW, 'utf-8')
  assert(content.includes('handleAiSuggest') || content.includes('ai-suggest'), 'Should have AI suggest')
})

// --- Summary ---
console.log('\n============================================================')
console.log('📊 RESULTS')
console.log('============================================================')
console.log(`✅ Passed: ${passed}`)
console.log(`❌ Failed: ${failed}`)
console.log(`📈 Pass Rate: ${Math.round((passed / (passed + failed)) * 100)}%`)

if (failed > 0) {
  process.exit(1)
}
