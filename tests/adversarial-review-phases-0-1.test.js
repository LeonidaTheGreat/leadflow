'use strict'

const path = require('path')
const fs = require('fs')
const os = require('os')

// ═══════════════════════════════════════════════════════════════════════════════
// Phase 0: VerdictPersistenceService
// ═══════════════════════════════════════════════════════════════════════════════

describe('VerdictPersistenceService', () => {
  const { VerdictPersistenceService, VERDICT_ENUM, RUBRIC_KEYS } = require('../lib/services/VerdictPersistenceService')

  let service
  let tmpDir

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'verdict-test-'))
    service = new VerdictPersistenceService({ stateDir: tmpDir })
  })

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  describe('VERDICT_ENUM', () => {
    test('contains exactly three valid verdicts', () => {
      expect(VERDICT_ENUM).toEqual(['pass', 'pass_with_nits', 'concerns'])
    })
  })

  describe('RUBRIC_KEYS', () => {
    test('contains the four rubric dimensions', () => {
      expect(RUBRIC_KEYS).toEqual(['gap_closure', 'correctness', 'dead_code', 'drift'])
    })
  })

  describe('parseStructuredVerdict', () => {
    test('parses "pass" verdict with rubric scores', () => {
      const text = [
        '## VERDICT: pass',
        '',
        'gap_closure: ok — genuinely closes the gap',
        'correctness: ok — logic is sound',
        'dead_code: ok — no leftover code',
        'drift: fail — introduces new pattern not in ARCHITECTURE.md',
      ].join('\n')

      const result = service.parseStructuredVerdict(text)
      expect(result).not.toBeNull()
      expect(result.verdict).toBe('pass')
      expect(result.rubric.gap_closure).toEqual({ ok: true, note: 'genuinely closes the gap' })
      expect(result.rubric.drift).toEqual({ ok: false, note: 'introduces new pattern not in ARCHITECTURE.md' })
    })

    test('parses "concerns" verdict', () => {
      const text = '# VERDICT: concerns\ncorrectness: fail — off-by-one in loop'
      const result = service.parseStructuredVerdict(text)
      expect(result.verdict).toBe('concerns')
      expect(result.rubric.correctness.ok).toBe(false)
    })

    test('parses "pass_with_nits" verdict', () => {
      const text = '## VERDICT: pass_with_nits\ngap_closure: ok'
      const result = service.parseStructuredVerdict(text)
      expect(result.verdict).toBe('pass_with_nits')
    })

    test('returns null for unrecognized format', () => {
      expect(service.parseStructuredVerdict('LGTM, ship it')).toBeNull()
      expect(service.parseStructuredVerdict('')).toBeNull()
      expect(service.parseStructuredVerdict(null)).toBeNull()
    })

    test('returns null when verdict enum value is invalid', () => {
      const text = '## VERDICT: approved'
      expect(service.parseStructuredVerdict(text)).toBeNull()
    })
  })

  describe('persistVerdictBody', () => {
    test('writes verdict JSON to state directory', () => {
      const filepath = service.persistVerdictBody({
        reviewId: 'rev-123',
        taskId: 'task-456',
        prNumber: 42,
        branchName: 'dev/feature-x',
        verdict: 'pass',
        rubric: { correctness: { ok: true, note: null } },
        reviewerModel: 'sonnet',
        durationMs: 120000,
        dissentAgreed: true,
        fullText: 'Full review output here'
      })

      expect(fs.existsSync(filepath)).toBe(true)
      const content = JSON.parse(fs.readFileSync(filepath, 'utf-8'))
      expect(content.reviewId).toBe('rev-123')
      expect(content.verdict).toBe('pass')
      expect(content.reviewerModel).toBe('sonnet')
      expect(content.fullText).toBe('Full review output here')
      expect(content.persistedAt).toBeDefined()
    })

    test('creates qc-verdicts subdirectory if not exists', () => {
      const verdictDir = path.join(tmpDir, 'qc-verdicts')
      expect(fs.existsSync(verdictDir)).toBe(false)

      service.persistVerdictBody({ reviewId: 'r1', verdict: 'pass' })

      expect(fs.existsSync(verdictDir)).toBe(true)
    })
  })

  describe('buildCodeReviewUpdate', () => {
    test('builds update object with all valid fields', () => {
      const update = service.buildCodeReviewUpdate({
        verdict: 'pass_with_nits',
        rubric: { gap_closure: { ok: true, note: null } },
        patchId: 'abc123def456',
        reviewerModel: 'codex',
        durationMs: 90000,
        dissentAgreed: false
      })

      expect(update).toEqual({
        verdict: 'pass_with_nits',
        rubric: { gap_closure: { ok: true, note: null } },
        patch_id: 'abc123def456',
        reviewer_model: 'codex',
        review_duration_ms: 90000,
        dissent_agreed: false
      })
    })

    test('omits invalid verdict enum values', () => {
      const update = service.buildCodeReviewUpdate({ verdict: 'invalid' })
      expect(update.verdict).toBeUndefined()
    })

    test('omits undefined/null fields', () => {
      const update = service.buildCodeReviewUpdate({})
      expect(Object.keys(update)).toHaveLength(0)
    })

    test('accepts zero durationMs', () => {
      const update = service.buildCodeReviewUpdate({ durationMs: 0 })
      expect(update.review_duration_ms).toBe(0)
    })
  })

  describe('recordToAuditLedger', () => {
    test('returns null when no db provided', async () => {
      const result = await service.recordToAuditLedger({
        reviewId: 'r1', verdict: 'pass'
      })
      expect(result).toBeNull()
    })

    test('writes to genome_traces when db available', async () => {
      const inserted = []
      const mockDb = {
        from: () => ({ insert: (row) => { inserted.push(row); return Promise.resolve() } })
      }
      const s = new VerdictPersistenceService({ stateDir: tmpDir, db: mockDb })

      const result = await s.recordToAuditLedger({
        reviewId: 'rev-1', taskId: 'task-1', prNumber: 10,
        verdict: 'concerns', rubric: {}, reviewerModel: 'sonnet', projectId: 'leadflow'
      })

      expect(result).not.toBeNull()
      expect(result.component).toBe('qc-verdict')
      expect(result.entity_type).toBe('code_review')
      expect(inserted.length).toBe(1)
    })

    test('swallows DB errors gracefully', async () => {
      const mockDb = {
        from: () => ({ insert: () => { throw new Error('connection refused') } })
      }
      const s = new VerdictPersistenceService({ stateDir: tmpDir, db: mockDb })

      const result = await s.recordToAuditLedger({ reviewId: 'r1', verdict: 'pass' })
      expect(result).toBeNull()
    })
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// Phase 1: ReviewIntegrityService (Shadow Rules R2, R3, R4)
// ═══════════════════════════════════════════════════════════════════════════════

describe('ReviewIntegrityService', () => {
  const { ReviewIntegrityService, TIMING_FLOOR_MS } = require('../lib/services/ReviewIntegrityService')

  let tmpDir

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'integrity-test-'))
  })

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  describe('Rule 2 — Patch-ID binding', () => {
    test('returns not blocked when patch_ids match', () => {
      const service = new ReviewIntegrityService({ stateDir: tmpDir, shadowMode: true })
      const result = service.checkPatchIdBinding(
        { id: 'review-1', patch_id: 'abc123' },
        'abc123'
      )
      expect(result.blocked).toBe(false)
      expect(result.reason).toBe('match')
    })

    test('returns shadow_would_block when mismatch in shadow mode', () => {
      const service = new ReviewIntegrityService({ stateDir: tmpDir, shadowMode: true })
      const result = service.checkPatchIdBinding(
        { id: 'review-1', patch_id: 'abc123' },
        'def456'
      )
      expect(result.blocked).toBe(false)
      expect(result.reason).toBe('shadow_would_block')
      expect(result.audit.would_block).toBe(true)
      expect(result.audit.rule).toBe('R2_patch_id_binding')
    })

    test('returns blocked when mismatch in live mode', () => {
      const service = new ReviewIntegrityService({ stateDir: tmpDir, shadowMode: false })
      const result = service.checkPatchIdBinding(
        { id: 'review-1', patch_id: 'abc123' },
        'def456'
      )
      expect(result.blocked).toBe(true)
      expect(result.reason).toBe('patch_id_mismatch')
    })

    test('returns not blocked when no patch_ids available', () => {
      const service = new ReviewIntegrityService({ stateDir: tmpDir, shadowMode: true })
      expect(service.checkPatchIdBinding({}, 'abc').blocked).toBe(false)
      expect(service.checkPatchIdBinding({ patch_id: 'abc' }, null).blocked).toBe(false)
    })
  })

  describe('Rule 3 — Anti-treadmill', () => {
    test('returns not blocked when no prior rejection exists', async () => {
      const mockDb = {
        from: () => ({
          select: () => ({
            eq: function() { return this },
            order: function() { return this },
            limit: () => Promise.resolve({ data: [] })
          })
        })
      }
      const service = new ReviewIntegrityService({ stateDir: tmpDir, shadowMode: true, db: mockDb })
      const result = await service.checkAntiTreadmill('some-patch-id')
      expect(result.blocked).toBe(false)
      expect(result.reason).toBe('no_prior_rejection')
    })

    test('returns shadow_would_block when prior rejection found in shadow mode', async () => {
      const priorReview = { id: 'old-rev', verdict: 'concerns', review_notes: {}, created_at: '2026-07-10' }
      const mockDb = {
        from: () => ({
          select: () => ({
            eq: function() { return this },
            order: function() { return this },
            limit: () => Promise.resolve({ data: [priorReview] })
          })
        })
      }
      const service = new ReviewIntegrityService({ stateDir: tmpDir, shadowMode: true, db: mockDb })
      const result = await service.checkAntiTreadmill('same-patch-id')
      expect(result.blocked).toBe(false)
      expect(result.reason).toBe('shadow_would_block')
      expect(result.priorReview.id).toBe('old-rev')
    })

    test('returns blocked in live mode', async () => {
      const priorReview = { id: 'old-rev', verdict: 'concerns', review_notes: {}, created_at: '2026-07-10' }
      const mockDb = {
        from: () => ({
          select: () => ({
            eq: function() { return this },
            order: function() { return this },
            limit: () => Promise.resolve({ data: [priorReview] })
          })
        })
      }
      const service = new ReviewIntegrityService({ stateDir: tmpDir, shadowMode: false, db: mockDb })
      const result = await service.checkAntiTreadmill('same-patch-id')
      expect(result.blocked).toBe(true)
      expect(result.reason).toBe('unchanged_resubmit')
    })

    test('returns not blocked when no db', async () => {
      const service = new ReviewIntegrityService({ stateDir: tmpDir, shadowMode: true })
      const result = await service.checkAntiTreadmill('patch-id')
      expect(result.blocked).toBe(false)
      expect(result.reason).toBe('no_data')
    })
  })

  describe('Rule 4 — Timing floor', () => {
    test('returns not blocked when duration above 45s', () => {
      const service = new ReviewIntegrityService({ stateDir: tmpDir, shadowMode: true })
      const result = service.checkTimingFloor(60000)
      expect(result.blocked).toBe(false)
      expect(result.reason).toBe('above_floor')
    })

    test('returns shadow_would_block when below 45s in shadow mode', () => {
      const service = new ReviewIntegrityService({ stateDir: tmpDir, shadowMode: true })
      const result = service.checkTimingFloor(30000)
      expect(result.blocked).toBe(false)
      expect(result.reason).toBe('shadow_would_block')
      expect(result.audit.duration_ms).toBe(30000)
      expect(result.audit.floor_ms).toBe(TIMING_FLOOR_MS)
    })

    test('returns blocked when below 45s in live mode', () => {
      const service = new ReviewIntegrityService({ stateDir: tmpDir, shadowMode: false })
      const result = service.checkTimingFloor(10000)
      expect(result.blocked).toBe(true)
      expect(result.reason).toBe('below_timing_floor')
    })

    test('exactly 45s is not blocked', () => {
      const service = new ReviewIntegrityService({ stateDir: tmpDir, shadowMode: false })
      const result = service.checkTimingFloor(45000)
      expect(result.blocked).toBe(false)
    })

    test('handles missing/invalid duration', () => {
      const service = new ReviewIntegrityService({ stateDir: tmpDir, shadowMode: true })
      expect(service.checkTimingFloor(undefined).blocked).toBe(false)
      expect(service.checkTimingFloor(null).blocked).toBe(false)
      expect(service.checkTimingFloor(-1).blocked).toBe(false)
    })
  })

  describe('Shadow audit logging', () => {
    test('writes to shadow-audit/adversarial-review-shadow.jsonl', () => {
      const service = new ReviewIntegrityService({ stateDir: tmpDir, shadowMode: true })
      service.checkPatchIdBinding({ id: 'r1', patch_id: 'a' }, 'b')

      const logFile = path.join(tmpDir, 'shadow-audit', 'adversarial-review-shadow.jsonl')
      expect(fs.existsSync(logFile)).toBe(true)

      const lines = fs.readFileSync(logFile, 'utf-8').trim().split('\n')
      const entry = JSON.parse(lines[0])
      expect(entry.rule).toBe('R2_patch_id_binding')
      expect(entry.would_block).toBe(true)
      expect(entry.shadow).toBe(true)
    })
  })

  describe('auditReview (aggregate)', () => {
    test('returns aggregate results for all rules', async () => {
      const service = new ReviewIntegrityService({
        stateDir: tmpDir,
        shadowMode: true,
        projectDir: '/tmp/nonexistent'
      })

      const result = await service.auditReview({
        review: { id: 'r1', patch_id: null },
        branchName: null,
        durationMs: 60000
      })

      expect(result.r2.blocked).toBe(false)
      expect(result.r3.blocked).toBe(false)
      expect(result.r4.blocked).toBe(false)
      expect(result.anyWouldBlock).toBe(false)
    })
  })
})
