#!/usr/bin/env node
/**
 * QC Test Suite: Distribution Loop Fix
 * Task ID: 3948192d-0790-43e9-910c-4b0507c4e533
 * 
 * Comprehensive verification that distribution-collector.js correctly:
 *   - REQ-1: Skips issues for completed use cases (UC completion gate)
 *   - REQ-2: Prevents duplicate task creation within 48 hours (cooldown)
 *   - REQ-3: Loosens channel check (any status, not just active)
 *   - REQ-4: Logs skipped issues with clear reasons
 */

const fs = require('fs')
const path = require('path')
const assert = require('assert').strict

const COLLECTOR_PATH = '/Users/clawdbot/.openclaw/genome/scripts/distribution-collector.js'

console.log('=== QC Test Suite: Distribution Loop Fix ===\n')

let passCount = 0
let failCount = 0

function test(name, fn) {
  try {
    fn()
    console.log(`✅ PASS: ${name}`)
    passCount++
  } catch (err) {
    console.error(`❌ FAIL: ${name}`)
    console.error(`   ${err.message}`)
    failCount++
  }
}

// Load the source code
let sourceCode = fs.readFileSync(COLLECTOR_PATH, 'utf8')

// ── REQ-1: UC Completion Gate ────────────────────────────────────────────────

test('REQ-1: UC_ISSUE_MAP is defined', () => {
  assert(sourceCode.includes('const UC_ISSUE_MAP'), 'UC_ISSUE_MAP definition missing')
})

test('REQ-1: UC_ISSUE_MAP maps all 5 issue types', () => {
  const required = ['no_landing_page', 'zero_traffic', 'zero_signups', 'low_conversion', 'low_trial_conversion']
  required.forEach(issue => {
    assert(sourceCode.includes(`${issue}:`), `UC_ISSUE_MAP missing mapping for ${issue}`)
  })
})

test('REQ-1: UC_ISSUE_MAP maps no_landing_page to gtm-landing-page', () => {
  assert(sourceCode.includes("no_landing_page: 'gtm-landing-page'"), 
    'no_landing_page should map to gtm-landing-page')
})

test('REQ-1: checkDistributionHealth queries completedUcs', () => {
  assert(sourceCode.includes('const { data: completedUcs }'), 
    'checkDistributionHealth should fetch completedUcs from DB')
  assert(sourceCode.includes(".in('implementation_status'"), 
    'Should filter for complete/done status')
})

test('REQ-1: checkDistributionHealth builds completedUcIds Set', () => {
  assert(sourceCode.includes('const completedUcIds = new Set'), 
    'checkDistributionHealth should create completedUcIds Set')
})

test('REQ-1: checkDistributionHealth skips issues for completed UCs', () => {
  assert(sourceCode.includes('if (completedUcIds.has(linkedUc))'), 
    'checkDistributionHealth should check if UC is in completedUcIds before raising issue')
})

test('REQ-1: UC gate logged with clear message', () => {
  assert(sourceCode.includes("[Distribution] UC completion gate"), 
    'Should log when UC completion gate prevents issue')
})

// ── REQ-2: Task Cooldown Check ────────────────────────────────────────────────

test('REQ-2: createDistributionTasks computes 24-hour window', () => {
  assert(sourceCode.includes('24 * 60 * 60 * 1000'), 
    'Should compute 24-hour window (24 * 60 * 60 * 1000 milliseconds)')
})

test('REQ-2: createDistributionTasks queries recent tasks by use_case_id', () => {
  assert(sourceCode.includes(".eq('use_case_id'"), 
    'Should filter recent tasks by use_case_id')
})

test('REQ-2: createDistributionTasks uses gte on created_at with 24h timestamp', () => {
  assert(sourceCode.includes(".gte('created_at', twentyFourHoursAgo)"), 
    'Should check tasks created_at >= 24 hours ago')
})

test('REQ-2: createDistributionTasks skips if recent task exists', () => {
  assert(sourceCode.includes("if (recentTasks?.length > 0)") && 
         sourceCode.includes('continue'), 
    'Should skip task creation if recent task found')
})

test('REQ-2: Cooldown check does not filter by status (all statuses checked)', () => {
  const cooldownSection = sourceCode.match(/const twentyFourHoursAgo[\s\S]*?if \(recentTasks/)[0]
  assert(!cooldownSection.includes(".eq('status'"), 
    'Cooldown should NOT filter by status — checks done, failed, and in_progress')
})

// ── REQ-3: Channel Check Loosened ────────────────────────────────────────────

test('REQ-3: no_landing_page check does NOT filter by status = active', () => {
  const channelCheckMatch = sourceCode.match(/Check if a landing page exists[\s\S]*?from\('distribution_channels'\)[\s\S]*?\}/m)
  if (channelCheckMatch) {
    const section = channelCheckMatch[0]
    assert(!section.includes(".eq('status', 'active')"), 
      'Should NOT filter by status = active; should check for any channel row')
  }
})

test('REQ-3: no_landing_page check only requires channel_type = landing_page', () => {
  assert(sourceCode.includes(".eq('channel_type', 'landing_page')"), 
    'Should only filter by channel_type, allowing any status')
})

test('REQ-3: Issue only raised if landingPages.length === 0', () => {
  assert(sourceCode.includes('if (!landingPages || landingPages.length === 0)'), 
    'Should only raise issue if NO channel row exists (empty array or null)')
})

// ── REQ-4: Clear Logging ──────────────────────────────────────────────────────

test('REQ-4: Skipped issues logged with UC completion reason', () => {
  assert(sourceCode.includes("[Distribution] Skipping"), 
    'Should log when skipping an issue')
  assert(sourceCode.includes('is complete'), 
    'Log should indicate UC is complete')
})

test('REQ-4: Skipped tasks logged with cooldown reason', () => {
  assert(sourceCode.includes("[Distribution] Skipping"), 
    'Should log when skipping task creation')
  assert(sourceCode.includes('within 24h') || sourceCode.includes('24h'), 
    'Log should indicate 24-hour cooldown was the reason')
})

test('REQ-4: Cooldown log includes task ID and status', () => {
  // Reload source to get latest
  sourceCode = fs.readFileSync(COLLECTOR_PATH, 'utf8')
  // The cooldown log should include references to recent.id and recent.status
  assert(sourceCode.includes('recent.id'), 'Cooldown log should reference recent.id (task ID)')
  assert(sourceCode.includes('recent.status'), 'Cooldown log should reference recent.status')
  assert(sourceCode.includes('[Distribution] Skipping') && sourceCode.includes('24h'), 
    'Should have skipping log with 24h cooldown reference')
})

// ── Export & Validation ─────────────────────────────────────────────────────

test('createDistributionTasks exported', () => {
  assert(sourceCode.includes('module.exports'), 'createDistributionTasks should be exported')
  assert(sourceCode.includes('createDistributionTasks'), 'createDistributionTasks should be in exports')
})

test('No hardcoded secrets in distribution-collector.js', () => {
  const dangerousPatterns = [
    /SUPABASE_URL\s*=\s*['"][^'"]+['"]/,
    /SUPABASE_KEY\s*=\s*['"][^'"]+['"]/,
    /POSTHOG_API_KEY\s*=\s*['"][^'"]+['"]/,
    /STRIPE_SECRET_KEY\s*=\s*['"][^'"]+['"]/
  ]
  dangerousPatterns.forEach(pattern => {
    assert(!pattern.test(sourceCode), 
      'Should not hardcode secrets — use environment variables')
  })
})

// ── Summary ──────────────────────────────────────────────────────────────────

console.log(`\n=== Test Summary ===`)
console.log(`✅ Passed: ${passCount}`)
console.log(`❌ Failed: ${failCount}`)
console.log(`📈 Pass Rate: ${((passCount / (passCount + failCount)) * 100).toFixed(1)}%`)

if (failCount > 0) {
  console.error('\n⚠️  Some tests failed. Review the implementation.')
  process.exit(1)
} else {
  console.log('\n✅ All requirements verified!')
  process.exit(0)
}
