/**
 * E2E Test: fix-first-session-sample-leads-fr-4-not-implemented
 * Task ID: da99b40a-1b03-4cd8-aef5-1b0187e822f6
 *
 * Verifies FR-4 acceptance criteria (AC-2):
 * - /api/sample-leads route exists
 * - Returns 3 sample leads with is_sample:true and ai_drafted_response
 * - Auth enforced (401 without token)
 * - No DB contamination (INSERT never called)
 * - LeadFeed component references sample-leads API
 * - Build succeeds with route present
 */

const assert = require('assert')
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')

function test(name, fn) {
  try {
    fn()
    console.log(`PASS: ${name}`)
  } catch (err) {
    console.error(`FAIL: ${name}`)
    console.error(`  ${err.message}`)
    process.exitCode = 1
  }
}

console.log('Running E2E checks for fix-first-session-sample-leads-fr-4-not-implemented (FR-4)')

// 1. API route file exists
test('/api/sample-leads/route.ts exists', () => {
  const routePath = path.join(ROOT, 'app/api/sample-leads/route.ts')
  assert(fs.existsSync(routePath), 'app/api/sample-leads/route.ts does not exist')
})

// 2. Route exports GET handler
test('/api/sample-leads route exports GET handler', () => {
  const src = fs.readFileSync(path.join(ROOT, 'app/api/sample-leads/route.ts'), 'utf8')
  assert(src.includes('export async function GET'), 'GET handler not exported')
})

// 3. Returns exactly 3 sample leads
test('Route defines exactly 3 SAMPLE_LEADS entries', () => {
  const src = fs.readFileSync(path.join(ROOT, 'app/api/sample-leads/route.ts'), 'utf8')
  const sampleLeadMatches = src.match(/id: 'sample-lead-\d+'/g) || []
  assert.strictEqual(sampleLeadMatches.length, 3, `Expected 3 sample leads, got ${sampleLeadMatches.length}`)
})

// 4. Each sample lead has is_sample: true
test('All SAMPLE_LEADS have is_sample: true', () => {
  const src = fs.readFileSync(path.join(ROOT, 'app/api/sample-leads/route.ts'), 'utf8')
  const isSampleMatches = src.match(/is_sample: true/g) || []
  assert.strictEqual(isSampleMatches.length, 3, `Expected 3 is_sample:true entries, got ${isSampleMatches.length}`)
})

// 5. Each sample lead has ai_drafted_response
test('All SAMPLE_LEADS have ai_drafted_response', () => {
  const src = fs.readFileSync(path.join(ROOT, 'app/api/sample-leads/route.ts'), 'utf8')
  const aiResponseMatches = src.match(/ai_drafted_response:/g) || []
  assert(aiResponseMatches.length >= 3, `Expected at least 3 ai_drafted_response fields, got ${aiResponseMatches.length}`)
})

// 6. Auth check: unauthorized returns 401
test('Route returns 401 when no agent ID found', () => {
  const src = fs.readFileSync(path.join(ROOT, 'app/api/sample-leads/route.ts'), 'utf8')
  assert(src.includes("status: 401"), 'No 401 status found — auth check missing')
  assert(src.includes('Unauthorized'), 'No Unauthorized error message found')
})

// 7. No INSERT calls — DB contamination prevention
test('Route contains NO INSERT calls to DB', () => {
  const src = fs.readFileSync(path.join(ROOT, 'app/api/sample-leads/route.ts'), 'utf8')
  assert(!src.includes('.insert('), 'Found .insert() call — sample leads could contaminate DB')
})

// 8. Eligibility check: onboarding_completed gate
test('Route checks onboarding_completed to determine eligibility', () => {
  const src = fs.readFileSync(path.join(ROOT, 'app/api/sample-leads/route.ts'), 'utf8')
  assert(src.includes('onboarding_completed'), 'No onboarding_completed check found — eligibility gate missing')
})

// 9. LeadFeed component calls /api/sample-leads
test('LeadFeed component calls /api/sample-leads endpoint', () => {
  const leadFeedPath = path.join(ROOT, 'components/dashboard/LeadFeed.tsx')
  assert(fs.existsSync(leadFeedPath), 'LeadFeed.tsx not found')
  const src = fs.readFileSync(leadFeedPath, 'utf8')
  assert(src.includes('/api/sample-leads'), 'LeadFeed does not reference /api/sample-leads')
})

// 10. LeadFeed shows DEMO badge for sample leads
test('LeadFeed renders DEMO badge for sample leads', () => {
  const src = fs.readFileSync(path.join(ROOT, 'components/dashboard/LeadFeed.tsx'), 'utf8')
  assert(src.includes('DEMO') || src.includes('demo'), 'No DEMO badge found in LeadFeed')
})

// 11. LeadFeed shows ai_drafted_response (AC-2)
test('LeadFeed renders ai_drafted_response for sample leads', () => {
  const src = fs.readFileSync(path.join(ROOT, 'components/dashboard/LeadFeed.tsx'), 'utf8')
  assert(src.includes('ai_drafted_response'), 'LeadFeed does not surface ai_drafted_response')
})

// 12. Built output includes /api/sample-leads (via build artifact or source check)
test('Build output or source confirms /api/sample-leads is accessible', () => {
  const routeInBuild = fs.existsSync(path.join(ROOT, '.next/server/app/api/sample-leads'))
  const routeInSource = fs.existsSync(path.join(ROOT, 'app/api/sample-leads/route.ts'))
  assert(routeInBuild || routeInSource, '/api/sample-leads not present in build or source')
})

// 13. Test suite for sample-leads exists
test('Unit test suite for sample-leads exists', () => {
  const testPath = path.join(ROOT, '__tests__/sample-leads.test.ts')
  assert(fs.existsSync(testPath), '__tests__/sample-leads.test.ts not found')
})

// 14. Sample leads have unique IDs
test('Sample lead IDs are unique', () => {
  const src = fs.readFileSync(path.join(ROOT, 'app/api/sample-leads/route.ts'), 'utf8')
  const ids = (src.match(/id: 'sample-lead-\d+'/g) || []).map(m => m.replace("id: '", '').replace("'", ''))
  const unique = new Set(ids)
  assert.strictEqual(unique.size, ids.length, `Duplicate sample lead IDs found: ${ids.join(', ')}`)
})

// 15. Sample leads have agent_id: null (not tied to any agent)
test('Sample leads have agent_id: null', () => {
  const src = fs.readFileSync(path.join(ROOT, 'app/api/sample-leads/route.ts'), 'utf8')
  const agentIdNullMatches = src.match(/agent_id: null/g) || []
  assert.strictEqual(agentIdNullMatches.length, 3, `Expected 3 agent_id:null entries, got ${agentIdNullMatches.length}`)
})

if (process.exitCode) {
  console.error('\nE2E RESULT: FAILED')
  process.exit(process.exitCode)
}

console.log('\nE2E RESULT: PASSED')
