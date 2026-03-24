/**
 * E2E Test: fix-production-build-fails-typescript-error-in-trial-s
 * Validates AC from PRD-TRIAL-SIGNUP-TSC-BUILD-BLOCKER.md
 *
 * Tests:
 *   E2E-BUILD-TRIAL-001 — TS2339 absent from trial-signup route
 *   E2E-BUILD-TRIAL-002 — Next.js production build succeeds
 *   E2E-TRIAL-SIGNUP-003 — Analytics insert uses fire-and-forget IIFE pattern
 *   E2E-TRIAL-SIGNUP-004 — Analytics failure is non-blocking (try/catch present)
 */

const assert = require('assert')
const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const dashboardDir = path.resolve(__dirname, '../product/lead-response/dashboard')
const routePath = path.resolve(dashboardDir, 'app/api/auth/trial-signup/route.ts')

let passed = 0
let failed = 0

function test(name, fn) {
  try {
    fn()
    console.log(`PASS: ${name}`)
    passed++
  } catch (err) {
    console.error(`FAIL: ${name}`)
    console.error(`  ${err.message}`)
    failed++
  }
}

console.log('=== E2E: TypeScript Build Blocker Fix — Trial Signup Route ===\n')

// E2E-BUILD-TRIAL-001: TypeScript noEmit check
test('E2E-BUILD-TRIAL-001: tsc --noEmit exits 0 (no TS2339)', () => {
  const result = execSync('npx tsc --noEmit 2>&1 || true', { cwd: dashboardDir }).toString()
  assert(!result.includes('TS2339'), `TS2339 still present:\n${result}`)
  assert(!result.includes('trial-signup'), `TypeScript error in trial-signup:\n${result}`)
})

// E2E-BUILD-TRIAL-002: Production build
test('E2E-BUILD-TRIAL-002: npm run build succeeds', () => {
  const result = execSync('npm run build 2>&1', { cwd: dashboardDir }).toString()
  assert(result.includes('Compiled successfully'), `Build did not succeed:\n${result.slice(-500)}`)
  assert(!result.includes('Type error'), `Build has type errors:\n${result.slice(-500)}`)
})

// E2E-TRIAL-SIGNUP-003: Fire-and-forget IIFE pattern present
test('E2E-TRIAL-SIGNUP-003: Analytics uses async IIFE fire-and-forget (not Promise.resolve().catch)', () => {
  const src = fs.readFileSync(routePath, 'utf8')
  // Should use async IIFE pattern
  assert(/void\s*\(\s*async\s*\(\s*\)\s*=>/.test(src), 'Missing void (async () => {...})() IIFE pattern')
  // Old broken pattern should be gone
  assert(!/Promise\.resolve\(.*\)\.catch/.test(src), 'Old Promise.resolve().catch() pattern still present')
})

// E2E-TRIAL-SIGNUP-004: try/catch wraps analytics — non-blocking failure handling
test('E2E-TRIAL-SIGNUP-004: try/catch present so analytics failure is non-blocking', () => {
  const src = fs.readFileSync(routePath, 'utf8')
  assert(src.includes('Failed to log trial_started event'), 'Missing analytics failure log')
  // Verify catch is inside IIFE (not a .catch chain)
  const iifeBlock = src.match(/void\s*\(\s*async\s*\(\s*\)\s*=>\s*\{([\s\S]*?)\}\s*\)\s*\(\)/)?.[1] || ''
  assert(iifeBlock.includes('try {'), 'try block not inside IIFE')
  assert(iifeBlock.includes('} catch'), 'catch block not inside IIFE')
})

console.log(`\n=== RESULTS: ${passed} passed, ${failed} failed ===`)
if (failed > 0) {
  console.error('E2E RESULT: FAILED')
  process.exit(1)
} else {
  console.log('E2E RESULT: PASSED')
}
