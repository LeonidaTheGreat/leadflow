'use strict'

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const SHADOW_MODE_DURATION_DAYS = 14
const TIMING_FLOOR_MS = 45000
const SHADOW_START_DATE = new Date('2026-07-16T00:00:00Z')

class ReviewIntegrityService {
  constructor({ projectDir, stateDir, db, shadowMode } = {}) {
    this.projectDir = projectDir || process.env.PROJECT_DIR || path.join(__dirname, '../..')
    this.stateDir = stateDir || process.env.GENOME_STATE_DIR || path.join(__dirname, '../../state/leadflow')
    this.db = db || null
    this.shadowMode = shadowMode !== undefined ? shadowMode : this._isShadowPeriod()
  }

  _isShadowPeriod() {
    const elapsed = Date.now() - SHADOW_START_DATE.getTime()
    return elapsed < SHADOW_MODE_DURATION_DAYS * 24 * 60 * 60 * 1000
  }

  /**
   * Rule 2: Patch-ID Binding
   * Compute git patch-id --stable for the full diff of branch vs merge-base with main.
   * Returns null if computation fails.
   */
  computePatchId(branchName) {
    if (!branchName) return null
    try {
      const mergeBase = execSync(
        `git merge-base origin/main origin/${branchName}`,
        { cwd: this.projectDir, encoding: 'utf-8', timeout: 10000, stdio: 'pipe' }
      ).trim()

      const patchId = execSync(
        `git diff ${mergeBase}..origin/${branchName} | git patch-id --stable`,
        { cwd: this.projectDir, encoding: 'utf-8', timeout: 15000, stdio: 'pipe' }
      ).trim().split(/\s+/)[0]

      return patchId || null
    } catch {
      return null
    }
  }

  /**
   * Rule 2: Check if a verdict's patch_id matches the branch's current patch_id.
   * In shadow mode: logs would_block but returns { blocked: false }.
   * In live mode: returns { blocked: true } when mismatch detected.
   */
  checkPatchIdBinding(review, currentPatchId) {
    if (!review?.patch_id || !currentPatchId) {
      return { blocked: false, reason: 'no_patch_ids' }
    }

    if (review.patch_id === currentPatchId) {
      return { blocked: false, reason: 'match' }
    }

    const entry = {
      rule: 'R2_patch_id_binding',
      review_id: review.id,
      stored_patch_id: review.patch_id,
      current_patch_id: currentPatchId,
      would_block: true,
      shadow: this.shadowMode,
      timestamp: new Date().toISOString()
    }

    this._logShadowAudit(entry)

    if (this.shadowMode) {
      return { blocked: false, reason: 'shadow_would_block', audit: entry }
    }
    return { blocked: true, reason: 'patch_id_mismatch', audit: entry }
  }

  /**
   * Rule 3: Anti-Treadmill
   * If a rejected patch_id is resubmitted unchanged, auto-reject with the prior verdict.
   * In shadow mode: logs would_block but doesn't actually reject.
   */
  async checkAntiTreadmill(patchId) {
    if (!patchId || !this.db) {
      return { blocked: false, reason: 'no_data' }
    }

    try {
      const { data: priorReviews } = await this.db
        .from('code_reviews')
        .select('id, verdict, review_notes, created_at')
        .eq('patch_id', patchId)
        .eq('status', 'changes_requested')
        .order('created_at', { ascending: false })
        .limit(1)

      if (!priorReviews?.length) {
        return { blocked: false, reason: 'no_prior_rejection' }
      }

      const prior = priorReviews[0]
      const entry = {
        rule: 'R3_anti_treadmill',
        patch_id: patchId,
        prior_review_id: prior.id,
        prior_verdict: prior.verdict,
        would_block: true,
        shadow: this.shadowMode,
        timestamp: new Date().toISOString()
      }

      this._logShadowAudit(entry)

      if (this.shadowMode) {
        return { blocked: false, reason: 'shadow_would_block', priorReview: prior, audit: entry }
      }
      return { blocked: true, reason: 'unchanged_resubmit', priorReview: prior, audit: entry }
    } catch {
      return { blocked: false, reason: 'query_error' }
    }
  }

  /**
   * Rule 4: Timing Floor
   * Review duration < 45s → recorded as no_verdict, triggers re-run.
   * In shadow mode: logs would_block but doesn't invalidate.
   */
  checkTimingFloor(durationMs) {
    if (typeof durationMs !== 'number' || durationMs < 0) {
      return { blocked: false, reason: 'no_duration' }
    }

    if (durationMs >= TIMING_FLOOR_MS) {
      return { blocked: false, reason: 'above_floor' }
    }

    const entry = {
      rule: 'R4_timing_floor',
      duration_ms: durationMs,
      floor_ms: TIMING_FLOOR_MS,
      would_block: true,
      shadow: this.shadowMode,
      timestamp: new Date().toISOString()
    }

    this._logShadowAudit(entry)

    if (this.shadowMode) {
      return { blocked: false, reason: 'shadow_would_block', audit: entry }
    }
    return { blocked: true, reason: 'below_timing_floor', audit: entry }
  }

  /**
   * Run all shadow rules against a completed review.
   * Returns aggregate result with individual rule outcomes.
   */
  async auditReview({ review, branchName, durationMs }) {
    const patchId = this.computePatchId(branchName)
    const results = {
      patchId,
      r2: this.checkPatchIdBinding(review, patchId),
      r3: await this.checkAntiTreadmill(patchId),
      r4: this.checkTimingFloor(durationMs),
      anyWouldBlock: false
    }
    results.anyWouldBlock = results.r2.blocked || results.r3.blocked || results.r4.blocked ||
      (results.r2.audit?.would_block || results.r3.audit?.would_block || results.r4.audit?.would_block) || false
    return results
  }

  _logShadowAudit(entry) {
    try {
      const auditDir = path.join(this.stateDir, 'shadow-audit')
      if (!fs.existsSync(auditDir)) {
        fs.mkdirSync(auditDir, { recursive: true })
      }
      const logFile = path.join(auditDir, 'adversarial-review-shadow.jsonl')
      fs.appendFileSync(logFile, JSON.stringify(entry) + '\n')
    } catch {
      // non-fatal: shadow audit is observability, never blocks
    }
  }
}

module.exports = { ReviewIntegrityService, SHADOW_MODE_DURATION_DAYS, TIMING_FLOOR_MS, SHADOW_START_DATE }
