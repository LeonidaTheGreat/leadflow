'use strict'

/**
 * E2E test for uc-genome-adversarial-review-001 — Adversarial Review Phases 0–1
 *
 * Tests:
 * 1. Migration columns exist in DB (criterion 1)
 * 2. VerdictPersistenceService verdict parsing (criterion 3)
 * 3. VerdictPersistenceService file persistence (criterion 4 — service logic only)
 * 4. ReviewIntegrityService shadow audit logging (criteria 8/9/10 — service logic)
 * 5. Wiring check — services are NOT imported by genome QC pipeline (documents the gap)
 */

const assert = require('assert')
const fs = require('fs')
const path = require('path')
const os = require('os')

// PR branch files are not checked out in QC branch worktree;
// use main leadflow repo which has the PR files available via git-show extraction
const PROJECT_DIR = '/Users/clawdbot/projects/leadflow'
const PR_SERVICES_DIR = '/tmp/adversarial-test/lib/services'

let passed = 0
let failed = 0

function ok(label, condition, detail = '') {
  if (condition) {
    console.log(`✅ ${label}`)
    passed++
  } else {
    console.error(`❌ ${label}${detail ? ': ' + detail : ''}`)
    failed++
  }
}

// ── 1. DB Migration Check ─────────────────────────────────────────────────────
async function checkMigration() {
  console.log('\n── Criterion 1: Migration columns in code_reviews ──')
  const { Client } = require('/Users/clawdbot/projects/leadflow/node_modules/pg')
  const pgUrl = process.env.LOCAL_PG_URL || 'postgresql://clawdbot@localhost/openclaw'
  const client = new Client({ connectionString: pgUrl })
  try {
    await client.connect()
    const { rows } = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'code_reviews'
        AND column_name = ANY(ARRAY['verdict','rubric','patch_id','reviewer_model','review_duration_ms','dissent_agreed'])
    `)
    const cols = new Set(rows.map(r => r.column_name))
    for (const col of ['verdict', 'rubric', 'patch_id', 'reviewer_model', 'review_duration_ms', 'dissent_agreed']) {
      ok(`code_reviews.${col} exists`, cols.has(col))
    }
    await client.end()
  } catch (err) {
    ok('DB migration check', false, err.message)
  }
}

// ── 2. Verdict Parsing (criterion 3) ─────────────────────────────────────────
function checkVerdictParsing() {
  console.log('\n── Criterion 3: Verdict extractor unit tests ──')
  const { VerdictPersistenceService, VERDICT_ENUM } = require(
    path.join(PR_SERVICES_DIR, 'VerdictPersistenceService')
  )

  const svc = new VerdictPersistenceService({ stateDir: os.tmpdir() })

  // Three valid verdict labels
  for (const v of ['pass', 'pass_with_nits', 'concerns']) {
    const result = svc.parseStructuredVerdict(`## VERDICT: ${v}\ngap_closure: ok`)
    ok(`parseStructuredVerdict("${v}") recognized`, result?.verdict === v)
  }

  // Malformed input → null (criterion says "no_verdict"; implementation returns null)
  const nullResult = svc.parseStructuredVerdict('LGTM, ship it')
  ok('Malformed input returns null (no_verdict)', nullResult === null)
  ok('VERDICT_ENUM has exactly 3 values', VERDICT_ENUM.length === 3)
}

// ── 3. Verdict File Persistence (criterion 4 service logic) ──────────────────
function checkVerdictPersistence() {
  console.log('\n── Criterion 4: Verdict body file persistence ──')
  const { VerdictPersistenceService } = require(
    path.join(PR_SERVICES_DIR, 'VerdictPersistenceService')
  )
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qc-e2e-'))
  try {
    const svc = new VerdictPersistenceService({ stateDir: tmpDir })
    const fp = svc.persistVerdictBody({
      reviewId: 'test-rev-001',
      verdict: 'pass',
      reviewerModel: 'sonnet',
      durationMs: 90000
    })
    ok('persistVerdictBody creates file', fs.existsSync(fp))
    const rec = JSON.parse(fs.readFileSync(fp, 'utf-8'))
    ok('Persisted record has verdict', rec.verdict === 'pass')
    ok('Persisted record has reviewerModel', rec.reviewerModel === 'sonnet')
    ok('Persisted record has persistedAt', !!rec.persistedAt)

    const verdictDir = path.join(tmpDir, 'qc-verdicts')
    ok('qc-verdicts dir created under stateDir', fs.existsSync(verdictDir))
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  }
}

// ── 4. Shadow Rules R2/R3/R4 service logic (criteria 8/9/10) ─────────────────
function checkShadowRules() {
  console.log('\n── Criteria 8/9/10: Shadow rules R2/R3/R4 ──')
  const { ReviewIntegrityService } = require(
    path.join(PR_SERVICES_DIR, 'ReviewIntegrityService')
  )
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shadow-e2e-'))
  try {
    // R2 shadow — mismatch → would_block logged, not blocked
    const svcShadow = new ReviewIntegrityService({ stateDir: tmpDir, shadowMode: true })
    const r2 = svcShadow.checkPatchIdBinding({ id: 'r1', patch_id: 'aaa' }, 'bbb')
    ok('R2 shadow: mismatch logs would_block, does not block', !r2.blocked && r2.reason === 'shadow_would_block')
    const logFile = path.join(tmpDir, 'shadow-audit', 'adversarial-review-shadow.jsonl')
    ok('R2 shadow: audit written to shadow-audit jsonl', fs.existsSync(logFile))
    const entry = JSON.parse(fs.readFileSync(logFile, 'utf-8').trim().split('\n')[0])
    ok('R2 shadow: audit entry has would_block=true', entry.would_block === true)

    // R4 shadow — sub-45s → logged but not blocked
    const r4 = svcShadow.checkTimingFloor(10000)
    ok('R4 shadow: sub-45s logs would_block, does not block', !r4.blocked && r4.reason === 'shadow_would_block')

    // R2 live — mismatch blocks
    const svcLive = new ReviewIntegrityService({ stateDir: tmpDir, shadowMode: false })
    const r2live = svcLive.checkPatchIdBinding({ id: 'r2', patch_id: 'aaa' }, 'bbb')
    ok('R2 live: mismatch blocks', r2live.blocked && r2live.reason === 'patch_id_mismatch')
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  }
}

// ── 5. Wiring Gap Documentation ───────────────────────────────────────────────
function checkWiringGap() {
  console.log('\n── Wiring gap: genome completion-handler-qc.js ──')
  const genomeHandlerPath = path.join(os.homedir(), 'projects/genome/intelligence/completion-handler-qc.js')
  if (!fs.existsSync(genomeHandlerPath)) {
    ok('completion-handler-qc.js found', false, 'file not found')
    return
  }
  const content = fs.readFileSync(genomeHandlerPath, 'utf-8')
  const hasVerdictPersist = content.includes('VerdictPersistenceService')
  const hasIntegrity = content.includes('ReviewIntegrityService')
  // These SHOULD be wired but currently are NOT — documented here for tracking
  ok('VerdictPersistenceService wired in completion-handler-qc', hasVerdictPersist,
    hasVerdictPersist ? '' : 'SERVICE NOT WIRED — criteria 2 and 4 unmet at runtime')
  ok('ReviewIntegrityService wired in completion-handler-qc', hasIntegrity,
    hasIntegrity ? '' : 'SERVICE NOT WIRED — shadow rules R2/R3/R4 will not run')
}

// ── Run all ───────────────────────────────────────────────────────────────────
;(async () => {
  console.log('E2E: uc-genome-adversarial-review-001 — Adversarial Review Phases 0–1\n')

  await checkMigration()
  checkVerdictParsing()
  checkVerdictPersistence()
  checkShadowRules()
  checkWiringGap()

  console.log(`\n──────────────────────────────────────────`)
  console.log(`Results: ${passed} passed, ${failed} failed`)
  process.exit(failed > 0 ? 1 : 0)
})()
