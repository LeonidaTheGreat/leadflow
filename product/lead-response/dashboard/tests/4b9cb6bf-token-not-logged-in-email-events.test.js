/**
 * E2E test: PR #1311 — Token URLs not stored in email_events metadata
 * Verifies that sendPasswordResetEmail and sendPilotInviteEmail do NOT pass
 * token-bearing URLs into the metadata argument of sendEmail (which logs to DB).
 */

const fs = require('fs')
const path = require('path')
const assert = require('assert')

let passed = 0
let failed = 0

function pass(label) {
  console.log(`  ✅ ${label}`)
  passed++
}

function fail(label, reason) {
  console.error(`  ❌ ${label}: ${reason}`)
  failed++
}

const emailServicePath = path.join(__dirname, '../lib/email-service.ts')
const src = fs.readFileSync(emailServicePath, 'utf8')

// Extract function body from opening `export async function <name>` to `^}` on its own line
function extractFunctionBody(source, funcName) {
  const start = source.indexOf(`export async function ${funcName}`)
  if (start === -1) return null
  // Find the closing `}` of the function at the top indent level
  // Walk character by character counting braces
  let depth = 0
  let inString = false
  let inTemplate = 0
  let end = -1
  for (let i = start; i < source.length; i++) {
    const ch = source[i]
    if (ch === '`' && !inString) { inTemplate = inTemplate ? 0 : 1; continue }
    if (inTemplate) continue
    if ((ch === '"' || ch === "'") && !inString) { inString = true; continue }
    if (inString && ch === '\\') { i++; continue }
    if (inString && (ch === '"' || ch === "'")) { inString = false; continue }
    if (ch === '{') depth++
    if (ch === '}') {
      depth--
      if (depth === 0) { end = i; break }
    }
  }
  return end > -1 ? source.slice(start, end + 1) : null
}

// Extract the final sendEmail(...) call from a function body
function extractSendEmailCall(funcBody) {
  const idx = funcBody.lastIndexOf('return sendEmail(')
  if (idx === -1) return null
  // Take the slice from `return sendEmail(` to matching `)`
  let depth = 0
  let end = -1
  for (let i = idx; i < funcBody.length; i++) {
    if (funcBody[i] === '(') depth++
    if (funcBody[i] === ')') {
      depth--
      if (depth === 0) { end = i; break }
    }
  }
  return end > -1 ? funcBody.slice(idx, end + 1) : null
}

console.log('\n🔒 Token-URL-in-metadata security test\n')

// Test 1: resetUrl absent from sendPasswordResetEmail's sendEmail metadata
{
  const body = extractFunctionBody(src, 'sendPasswordResetEmail')
  assert.ok(body, 'Could not locate sendPasswordResetEmail')
  const call = extractSendEmailCall(body)
  assert.ok(call, 'Could not locate sendEmail call in sendPasswordResetEmail')

  if (/resetUrl\s*:/.test(call)) {
    fail('sendPasswordResetEmail: resetUrl absent from sendEmail metadata', 'resetUrl key found — raw token will be logged to DB')
  } else {
    pass('sendPasswordResetEmail: resetUrl NOT in sendEmail metadata')
  }
}

// Test 2: inviteUrl absent from sendPilotInviteEmail's sendEmail metadata
{
  const body = extractFunctionBody(src, 'sendPilotInviteEmail')
  assert.ok(body, 'Could not locate sendPilotInviteEmail')
  const call = extractSendEmailCall(body)
  assert.ok(call, 'Could not locate sendEmail call in sendPilotInviteEmail')

  if (/inviteUrl\s*:/.test(call)) {
    fail('sendPilotInviteEmail: inviteUrl absent from sendEmail metadata', 'inviteUrl key found — raw token will be logged to DB')
  } else {
    pass('sendPilotInviteEmail: inviteUrl NOT in sendEmail metadata')
  }
}

// Test 3: resetUrl still present in HTML template (email still delivers the link)
{
  const body = extractFunctionBody(src, 'sendPasswordResetEmail')
  assert.ok(body, 'Could not locate sendPasswordResetEmail')
  if (!body.includes('data.resetUrl')) {
    fail('sendPasswordResetEmail HTML template intact', 'data.resetUrl missing from HTML — email link would be broken')
  } else {
    pass('sendPasswordResetEmail: resetUrl still rendered in HTML body (email link intact)')
  }
}

// Test 4: inviteUrl still present in HTML template
{
  const body = extractFunctionBody(src, 'sendPilotInviteEmail')
  assert.ok(body, 'Could not locate sendPilotInviteEmail')
  if (!body.includes('data.inviteUrl')) {
    fail('sendPilotInviteEmail HTML template intact', 'data.inviteUrl missing from HTML — email link would be broken')
  } else {
    pass('sendPilotInviteEmail: inviteUrl still rendered in HTML body (email link intact)')
  }
}

// Test 5: forgot-password route hashes token before DB insert
{
  const forgotPwPath = path.join(__dirname, '../app/api/auth/forgot-password/route.ts')
  const forgotSrc = fs.readFileSync(forgotPwPath, 'utf8')

  if (!forgotSrc.includes("createHash('sha256').update(rawToken)")) {
    fail('forgot-password route hashes token', 'SHA-256 hash not found')
  } else if (!forgotSrc.includes('token_hash: tokenHash')) {
    fail('forgot-password route stores hash not raw', 'token_hash: tokenHash not found')
  } else if (forgotSrc.includes('token_hash: rawToken')) {
    fail('forgot-password route stores hash not raw', 'rawToken stored in token_hash column')
  } else {
    pass('forgot-password route: SHA-256 hash stored in DB, raw token only in URL')
  }
}

// Test 6: pilot invite route hashes token before DB insert
{
  const inviteRoutePath = path.join(__dirname, '../app/api/admin/pilot-targets/[id]/invite/route.ts')
  const inviteSrc = fs.readFileSync(inviteRoutePath, 'utf8')

  if (!inviteSrc.includes("createHash('sha256').update(rawToken)")) {
    fail('invite route hashes token', 'SHA-256 hash not found')
  } else if (!inviteSrc.includes('token: tokenHash')) {
    fail('invite route stores hash not raw', 'token: tokenHash not found')
  } else {
    pass('pilot-targets invite route: SHA-256 hash stored in DB, raw token only in URL')
  }
}

console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`)
if (failed > 0) process.exit(1)
