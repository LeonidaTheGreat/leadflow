/**
 * test-triage-stuck-use-cases.js
 *
 * Tests for the triage-stuck-use-cases.js script
 */

const assert = require('assert')
const path = require('path')

const PROJECT_ROOT = path.join(__dirname, '..')

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

console.log('\n=== triage-stuck-use-cases tests ===\n')

// ── Test 1: Script file exists ──────────────────────────────────────────────

console.log('1. Script file structure')
const scriptPath = path.join(PROJECT_ROOT, 'scripts/utilities/triage-stuck-use-cases.js')
const fs = require('fs')

test('triage-stuck-use-cases.js exists', () => {
  assert.ok(fs.existsSync(scriptPath), `Expected ${scriptPath} to exist`)
})

test('script is executable', () => {
  const stats = fs.statSync(scriptPath)
  const isExecutable = !!(stats.mode & parseInt('111', 8))
  assert.ok(isExecutable, 'Script should be executable')
})

// ── Test 2: Script exports required functions ───────────────────────────────

console.log('\n2. Script exports')
const triageModule = require(scriptPath)

test('exports run function', () => {
  assert.strictEqual(typeof triageModule.run, 'function', 'run must be a function')
})

test('exports fetchUseCases function', () => {
  assert.strictEqual(typeof triageModule.fetchUseCases, 'function', 'fetchUseCases must be a function')
})

test('exports categorizeUseCases function', () => {
  assert.strictEqual(typeof triageModule.categorizeUseCases, 'function', 'categorizeUseCases must be a function')
})

test('exports analyzeUseCase function', () => {
  assert.strictEqual(typeof triageModule.analyzeUseCase, 'function', 'analyzeUseCase must be a function')
})

// ── Test 3: categorizeUseCases logic ────────────────────────────────────────

console.log('\n3. categorizeUseCases logic')

test('categorizes needs_merge correctly', () => {
  const useCases = [
    { id: 1, implementation_status: 'needs_merge' },
    { id: 2, implementation_status: 'complete' },
  ]
  const result = triageModule.categorizeUseCases(useCases)
  assert.strictEqual(result.needs_merge.length, 1)
  assert.strictEqual(result.needs_merge[0].id, 1)
})

test('categorizes not_started correctly', () => {
  const useCases = [
    { id: 1, implementation_status: 'not_started' },
    { id: 2, implementation_status: 'in_progress' },
  ]
  const result = triageModule.categorizeUseCases(useCases)
  assert.strictEqual(result.not_started.length, 1)
  assert.strictEqual(result.in_progress.length, 1)
})

test('handles unknown statuses in other category', () => {
  const useCases = [
    { id: 1, implementation_status: 'unknown_status' },
  ]
  const result = triageModule.categorizeUseCases(useCases)
  assert.strictEqual(result.other.length, 1)
})

// ── Test 4: analyzeUseCase logic ────────────────────────────────────────────

console.log('\n4. analyzeUseCase logic')

test('recommends MERGE for needs_merge status', () => {
  const uc = {
    id: 'test-1',
    name: 'Test UC',
    implementation_status: 'needs_merge',
    priority: 'high',
    description: 'Some description with acceptance criteria',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  const result = triageModule.analyzeUseCase(uc)
  assert.strictEqual(result.recommendation, 'MERGE')
})

test('recommends START for critical not_started', () => {
  const uc = {
    id: 'test-2',
    name: 'Critical Test',
    implementation_status: 'not_started',
    priority: 'critical',
    description: 'Some description',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  const result = triageModule.analyzeUseCase(uc)
  assert.strictEqual(result.recommendation, 'START')
})

test('recommends ESCALATE for stuck status', () => {
  const uc = {
    id: 'test-3',
    name: 'Stuck Test',
    implementation_status: 'stuck',
    priority: 'medium',
    description: 'Some description',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  const result = triageModule.analyzeUseCase(uc)
  assert.strictEqual(result.recommendation, 'ESCALATE')
})

test('flags stale use cases', () => {
  const oldDate = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString() // 40 days ago
  const uc = {
    id: 'test-4',
    name: 'Old Test',
    implementation_status: 'in_progress',
    priority: 'medium',
    description: 'Some description',
    created_at: oldDate,
    updated_at: oldDate,
  }
  const result = triageModule.analyzeUseCase(uc)
  assert.ok(result.reasoning.some(r => r.includes('Stale')), 'Should flag stale use case')
})

test('flags missing acceptance criteria', () => {
  const uc = {
    id: 'test-5',
    name: 'No AC Test',
    implementation_status: 'not_started',
    priority: 'low',
    description: 'Brief desc',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  const result = triageModule.analyzeUseCase(uc)
  assert.ok(result.reasoning.some(r => r.includes('acceptance criteria')), 'Should flag missing AC')
})

// ── Test 5: Script content validation ───────────────────────────────────────

console.log('\n5. Script content validation')

test('script requires dotenv', () => {
  const content = fs.readFileSync(scriptPath, 'utf-8')
  assert.ok(content.includes("require('dotenv')"), 'Should require dotenv')
})

test('script requires supabase', () => {
  const content = fs.readFileSync(scriptPath, 'utf-8')
  assert.ok(content.includes('@supabase/supabase-js'), 'Should require supabase')
})

test('script has STUCK_STATUSES defined', () => {
  const content = fs.readFileSync(scriptPath, 'utf-8')
  assert.ok(content.includes('STUCK_STATUSES'), 'Should define STUCK_STATUSES')
})

test('script generates markdown report', () => {
  const content = fs.readFileSync(scriptPath, 'utf-8')
  assert.ok(content.includes('generateMarkdownReport'), 'Should have generateMarkdownReport function')
})

// ── Summary ──────────────────────────────────────────────────────────────────

console.log(`\n─────────────────────────────────`)
console.log(`Tests: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`)
console.log(`─────────────────────────────────`)

if (failed > 0) {
  process.exit(1)
}
