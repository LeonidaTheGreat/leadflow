/**
 * QC E2E Test: feat-transactional-email-resend
 * Validates welcome email integration in trial-signup route and email-service module.
 */

const assert = require('assert')
const fs = require('fs')
const path = require('path')

const DASHBOARD_DIR = path.resolve(__dirname, '../product/lead-response/dashboard')

let passed = 0
let failed = 0

function check(name, fn) {
  try {
    fn()
    console.log(`  ✅ ${name}`)
    passed++
  } catch (e) {
    console.log(`  ❌ ${name}: ${e.message}`)
    failed++
  }
}

async function checkAsync(name, fn) {
  try {
    await fn()
    console.log(`  ✅ ${name}`)
    passed++
  } catch (e) {
    console.log(`  ❌ ${name}: ${e.message}`)
    failed++
  }
}

console.log('\n=== QC E2E: feat-transactional-email-resend ===\n')

// 1. sendWelcomeEmail is exported from email-service.ts
check('email-service.ts exports sendWelcomeEmail', () => {
  const content = fs.readFileSync(path.join(DASHBOARD_DIR, 'lib/email-service.ts'), 'utf8')
  assert(content.includes('export async function sendWelcomeEmail'), 'sendWelcomeEmail not exported')
})

// 2. trial-signup route imports and calls sendWelcomeEmail
check('trial-signup/route.ts imports sendWelcomeEmail', () => {
  const content = fs.readFileSync(
    path.join(DASHBOARD_DIR, 'app/api/auth/trial-signup/route.ts'),
    'utf8'
  )
  assert(content.includes("import { sendWelcomeEmail } from '@/lib/email-service'"), 'import missing')
  assert(content.includes('sendWelcomeEmail('), 'sendWelcomeEmail call missing')
})

// 3. Welcome email call is non-blocking (void + .catch)
check('trial-signup: welcome email is non-blocking (void + .catch)', () => {
  const content = fs.readFileSync(
    path.join(DASHBOARD_DIR, 'app/api/auth/trial-signup/route.ts'),
    'utf8'
  )
  assert(content.includes('void sendWelcomeEmail('), 'void keyword missing — call must be non-blocking')
  assert(content.includes('.catch('), '.catch error handler missing')
})

// 4. sendWelcomeEmail generates HTML with LeadFlow branding
check('sendWelcomeEmail HTML contains LeadFlow AI branding', () => {
  const content = fs.readFileSync(path.join(DASHBOARD_DIR, 'lib/email-service.ts'), 'utf8')
  assert(content.includes('LeadFlow AI'), 'LeadFlow AI branding missing from email template')
  assert(content.includes('dashboardUrl'), 'dashboardUrl not threaded through')
  assert(content.includes('Start Onboarding'), 'CTA button text missing')
})

// 5. sendWelcomeEmail passes planTier — pilot gets 60-day copy
check('sendWelcomeEmail handles pilot planTier (60 days)', () => {
  const content = fs.readFileSync(path.join(DASHBOARD_DIR, 'lib/email-service.ts'), 'utf8')
  assert(content.includes('isPilot'), 'isPilot logic missing')
  assert(content.includes('60'), '60-day trial copy missing')
})

// 6. sendWelcomeEmail calls sendEmail (uses existing Resend infrastructure)
check('sendWelcomeEmail delegates to sendEmail', () => {
  const content = fs.readFileSync(path.join(DASHBOARD_DIR, 'lib/email-service.ts'), 'utf8')
  // Find sendWelcomeEmail function and verify it calls sendEmail anywhere after its declaration
  const fnStart = content.indexOf('export async function sendWelcomeEmail')
  const fnBody = content.slice(fnStart)
  assert(fnBody.includes('sendEmail('), 'sendWelcomeEmail must delegate to sendEmail')
})

// 7. email-config-validation module exists and exports validateEmailConfig
check('email-config-validation.ts exists and exports validateEmailConfig', () => {
  const content = fs.readFileSync(
    path.join(DASHBOARD_DIR, 'lib/email-config-validation.ts'),
    'utf8'
  )
  assert(content.includes('validateEmailConfig'), 'validateEmailConfig not found in email-config-validation.ts')
})

// 8. No hardcoded secrets in changed files
check('No hardcoded secrets in changed files', () => {
  const filesToCheck = [
    path.join(DASHBOARD_DIR, 'lib/email-service.ts'),
    path.join(DASHBOARD_DIR, 'app/api/auth/trial-signup/route.ts'),
  ]
  const secretPatterns = [/sk_live_[a-zA-Z0-9]+/, /re_[a-zA-Z0-9]{20,}/, /SUPABASE_SERVICE_ROLE_KEY\s*=\s*["'][^"']+/]
  for (const f of filesToCheck) {
    const content = fs.readFileSync(f, 'utf8')
    for (const pat of secretPatterns) {
      assert(!pat.test(content), `Potential hardcoded secret in ${path.basename(f)}: ${pat}`)
    }
  }
})

// 9. Build artifact exists (built as part of CI)
check('dist/.next directory exists after build', () => {
  const nextDir = path.join(DASHBOARD_DIR, '.next')
  assert(fs.existsSync(nextDir), '.next directory missing — run npm run build first')
})

// 10. sendEmail function exists and handles RESEND_API_KEY absence gracefully
check('email-service.ts handles missing RESEND_API_KEY gracefully', () => {
  const content = fs.readFileSync(path.join(DASHBOARD_DIR, 'lib/email-service.ts'), 'utf8')
  assert(content.includes('RESEND_API_KEY'), 'RESEND_API_KEY check missing from email-service')
  // Should log or queue rather than throw
  assert(
    content.includes('queued') || content.includes('not configured') || content.includes('console.log'),
    'No graceful fallback when RESEND_API_KEY is absent'
  )
})

// Summary
console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`)
if (failed > 0) {
  process.exit(1)
}
console.log('✅ All QC acceptance criteria met:')
console.log('   1. sendWelcomeEmail exported from email-service')
console.log('   2. trial-signup calls sendWelcomeEmail non-blocking with .catch')
console.log('   3. Email HTML has LeadFlow AI branding + onboarding CTA')
console.log('   4. Pilot 60-day trial copy handled')
console.log('   5. Delegates to existing sendEmail infrastructure')
console.log('   6. No hardcoded secrets')
console.log('   7. Graceful fallback when RESEND_API_KEY absent')
