/**
 * E2E Test: Service Layer Refactor Verification
 * Task: 6d321d05 — Consolidate supabase.ts domain functions into service classes
 * PR: #1105
 *
 * Verifies:
 * 1. Removed functions are NOT exported from supabase.ts
 * 2. Service classes are importable and have correct method signatures
 * 3. No stale imports of removed functions in routes
 */

import assert from 'assert'
import * as path from 'path'
import * as fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DASHBOARD_DIR = path.resolve(__dirname, '..')
const SUPABASE_PATH = path.join(DASHBOARD_DIR, 'lib/supabase.ts')
const SERVICES_DIR = path.join(DASHBOARD_DIR, 'lib/services')

// ============================================
// TEST 1: supabase.ts no longer exports domain functions
// ============================================
function testSupabaseNoDomainFunctions() {
  const content = fs.readFileSync(SUPABASE_PATH, 'utf-8')

  const removedFunctions = [
    'createLead',
    'getLeadById',
    'getLeadByPhone',
    'getLeadsByAgent',
    'updateLead',
    'createMessage',
    'updateMessageStatus',
    'logEvent',
    'getAgentById',
  ]

  for (const fn of removedFunctions) {
    assert(
      !content.includes(`export async function ${fn}`) && !content.includes(`export function ${fn}`),
      `FAIL: supabase.ts still exports domain function: ${fn}`
    )
  }

  console.log('✅ TEST 1: supabase.ts does not export any removed domain functions')
}

// ============================================
// TEST 2: Service classes exist with correct methods
// ============================================
function testServiceClassesExist() {
  const expectedServices: Record<string, string[]> = {
    'LeadService.js': ['createLead', 'getLeadById', 'getLeadByPhone', 'updateLead'],
    'MessageService.js': ['createMessage', 'updateMessageStatus'],
    'AgentService.js': ['getAgentById'],
    'EventService.js': ['logEvent'],
  }

  for (const [file, methods] of Object.entries(expectedServices)) {
    const filePath = path.join(SERVICES_DIR, file)
    assert(fs.existsSync(filePath), `FAIL: Service file missing: ${file}`)

    const content = fs.readFileSync(filePath, 'utf-8')

    for (const method of methods) {
      assert(
        content.includes(`async ${method}(`) || content.includes(`${method}(`),
        `FAIL: ${file} missing method: ${method}`
      )
    }

    // Each service should export a singleton instance
    assert(
      content.includes('export const ') && content.includes('createDefaultService()'),
      `FAIL: ${file} missing singleton export via createDefaultService()`
    )
  }

  console.log('✅ TEST 2: All service classes exist with required methods and singleton exports')
}

// ============================================
// TEST 3: No routes import removed domain functions from supabase
// ============================================
function testNoStaleSupabaseImports() {
  const routesDir = path.join(DASHBOARD_DIR, 'app')
  const removedFunctions = [
    'createLead',
    'getLeadById',
    'getLeadByPhone',
    'getLeadsByAgent',
    'updateLead',
    'createMessage',
    'updateMessageStatus',
    'logEvent',
    'getAgentById',
  ]

  function scanDir(dir: string): string[] {
    const violations: string[] = []
    if (!fs.existsSync(dir)) return violations

    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        violations.push(...scanDir(fullPath))
      } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
        const content = fs.readFileSync(fullPath, 'utf-8')
        // Check for imports of removed functions specifically from supabase
        for (const fn of removedFunctions) {
          if (
            content.includes(`from '@/lib/supabase'`) &&
            content.match(new RegExp(`import[^']*\\b${fn}\\b[^']*from '@/lib/supabase'`))
          ) {
            violations.push(`${fullPath}: imports ${fn} from @/lib/supabase`)
          }
        }
      }
    }
    return violations
  }

  const violations = scanDir(routesDir)
  assert(
    violations.length === 0,
    `FAIL: Found ${violations.length} stale import(s) of removed domain functions:\n${violations.join('\n')}`
  )

  console.log('✅ TEST 3: No routes import removed domain functions from supabase.ts')
}

// ============================================
// TEST 4: supabase.ts still exports required client accessors
// ============================================
function testSupabaseClientExportsPreserved() {
  const content = fs.readFileSync(SUPABASE_PATH, 'utf-8')

  const requiredExports = ['supabaseAdmin', 'supabase', 'getSupabaseClient', 'getSupabaseAdmin']

  for (const exp of requiredExports) {
    assert(content.includes(exp), `FAIL: supabase.ts missing required export: ${exp}`)
  }

  console.log('✅ TEST 4: supabase.ts still exports required client accessors')
}

// ============================================
// TEST 5: analytics-queries.ts is wired to a consumer
// ============================================
function testAnalyticsQueriesWired() {
  const analyticsPath = path.join(DASHBOARD_DIR, 'lib/analytics-queries.ts')
  assert(fs.existsSync(analyticsPath), 'FAIL: analytics-queries.ts does not exist')

  const routePath = path.join(DASHBOARD_DIR, 'app/api/analytics/dashboard/route.ts')
  assert(fs.existsSync(routePath), 'FAIL: analytics dashboard route does not exist')

  const routeContent = fs.readFileSync(routePath, 'utf-8')
  assert(
    routeContent.includes('analytics-queries'),
    'FAIL: analytics dashboard route does not import analytics-queries.ts'
  )

  console.log('✅ TEST 5: analytics-queries.ts is imported by analytics dashboard route')
}

// ============================================
// RUN ALL TESTS
// ============================================
let passed = 0
let failed = 0

const tests = [
  testSupabaseNoDomainFunctions,
  testServiceClassesExist,
  testNoStaleSupabaseImports,
  testSupabaseClientExportsPreserved,
  testAnalyticsQueriesWired,
]

for (const test of tests) {
  try {
    test()
    passed++
  } catch (err: any) {
    console.error(`❌ ${err.message}`)
    failed++
  }
}

console.log(`\n📊 Results: ${passed}/${tests.length} passed`)

if (failed > 0) {
  process.exit(1)
}
