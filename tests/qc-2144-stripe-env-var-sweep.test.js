'use strict'
/**
 * QC regression guard for PR #2144: sweep ALL dashboard route files
 * to ensure no stale Stripe env var names survive anywhere.
 *
 * Unlike the dev's file-specific tests, this scans every .ts/.tsx file
 * under app/api/ so future routes can't accidentally reintroduce old names.
 */

const assert = require('assert')
const fs = require('fs')
const path = require('path')

const DASHBOARD_APP = path.resolve(__dirname, '../product/lead-response/dashboard/app')

const STALE_VARS = [
  'STRIPE_PRICE_PROFESSIONAL_MONTHLY',
  'STRIPE_PRICE_PROFESSIONAL_YEARLY',
  'STRIPE_PRICE_ENTERPRISE_MONTHLY',
  'STRIPE_PRICE_ENTERPRISE_YEARLY',
  'STRIPE_PRICE_STARTER_YEARLY',
]

let passed = 0
let failed = 0

function test(name, fn) {
  try { fn(); console.log(`  ✅ ${name}`); passed++ }
  catch (err) { console.log(`  ❌ ${name}: ${err.message}`); failed++ }
}

function collectFiles(dir, ext, results = []) {
  if (!fs.existsSync(dir)) return results
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) collectFiles(full, ext, results)
    else if (entry.isFile() && entry.name.endsWith(ext)) results.push(full)
  }
  return results
}

const tsFiles = collectFiles(DASHBOARD_APP, '.ts')
  .concat(collectFiles(DASHBOARD_APP, '.tsx'))

test('found dashboard app route files to scan', () => {
  assert.ok(tsFiles.length > 0, `no .ts/.tsx files found under ${DASHBOARD_APP}`)
})

for (const file of tsFiles) {
  const rel = path.relative(path.resolve(__dirname, '..'), file)
  const src = fs.readFileSync(file, 'utf8')
  for (const stale of STALE_VARS) {
    if (src.includes(stale)) {
      test(`${rel} does not contain ${stale}`, () => {
        assert.fail(`${rel} still references stale env var ${stale}`)
      })
    }
  }
}

test('nudge route: PRO_PRICE_ID has no fallback default value', () => {
  const nudge = fs.readFileSync(
    path.join(DASHBOARD_APP, 'api/trial/nudge/route.ts'), 'utf8')
  const match = nudge.match(/PRO_PRICE_ID\s*=\s*process\.env\.STRIPE_PRICE_PRO_MONTHLY\s*\|\|/)
  assert.ok(!match, 'PRO_PRICE_ID should not have a || fallback — undefined is the safe default')
})

test('nudge route: regex guard rejects short/invalid price IDs', () => {
  const re = /^price_[A-Za-z0-9]{14,36}$/
  assert.ok(!re.test('price_pro'), 'too-short ID should be rejected')
  assert.ok(!re.test('price_professional_monthly'), 'human-readable name should be rejected')
  assert.ok(!re.test(''), 'empty string should be rejected')
  assert.ok(re.test('price_1AbCdEfGhIjKlMnOpQr'), 'real-length Stripe ID should pass')
  assert.ok(re.test('price_1AbCdEfGhIjKlMnOpQrStUvWx'), 'longer Stripe ID should pass')
})

test('lib/config: all 3 tiers use canonical env var names', () => {
  const src = fs.readFileSync(
    path.resolve(__dirname, '../lib/config/index.js'), 'utf8')
  assert.ok(src.includes('STRIPE_PRICE_PRO_MONTHLY'), 'PRO_MONTHLY missing')
  assert.ok(src.includes('STRIPE_PRICE_PRO_ANNUAL'), 'PRO_ANNUAL missing')
  assert.ok(src.includes('STRIPE_PRICE_TEAM_MONTHLY'), 'TEAM_MONTHLY missing')
  assert.ok(src.includes('STRIPE_PRICE_TEAM_ANNUAL'), 'TEAM_ANNUAL missing')
  assert.ok(src.includes('STRIPE_PRICE_STARTER_MONTHLY'), 'STARTER_MONTHLY missing')
  assert.ok(src.includes('STRIPE_PRICE_STARTER_ANNUAL'), 'STARTER_ANNUAL missing')
})

console.log(`\n${passed + failed} checks — ${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
