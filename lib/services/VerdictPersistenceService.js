'use strict'

const fs = require('fs')
const path = require('path')

const VERDICT_ENUM = ['pass', 'pass_with_nits', 'concerns']
const RUBRIC_KEYS = ['gap_closure', 'correctness', 'dead_code', 'drift']

class VerdictPersistenceService {
  constructor({ stateDir, db } = {}) {
    this.stateDir = stateDir || process.env.GENOME_STATE_DIR || path.join(__dirname, '../../state/leadflow')
    this.verdictDir = path.join(this.stateDir, 'qc-verdicts')
    this.db = db || null
  }

  _ensureVerdictDir() {
    if (!fs.existsSync(this.verdictDir)) {
      fs.mkdirSync(this.verdictDir, { recursive: true })
    }
  }

  /**
   * Parse a structured verdict from raw QC output text.
   * Returns null if the output doesn't match the structured format.
   */
  parseStructuredVerdict(text) {
    if (!text) return null

    const verdictMatch = text.match(/^##?\s*VERDICT:\s*(pass|pass_with_nits|concerns)\s*$/im)
    if (!verdictMatch) return null

    const verdict = verdictMatch[1]
    const rubric = {}

    for (const key of RUBRIC_KEYS) {
      const pattern = new RegExp(`${key}[:\\s]*(ok|fail|yes|no|true|false)(?:\\s*[—–-]\\s*(.+))?`, 'i')
      const match = text.match(pattern)
      if (match) {
        const ok = /^(ok|yes|true)$/i.test(match[1])
        rubric[key] = { ok, note: match[2]?.trim() || null }
      }
    }

    return {
      verdict,
      rubric: Object.keys(rubric).length > 0 ? rubric : null
    }
  }

  /**
   * Persist verdict body to state file for audit/searchability.
   * File: state/{project}/qc-verdicts/{reviewId}-{timestamp}.json
   */
  persistVerdictBody({ reviewId, taskId, prNumber, branchName, verdict, rubric, reviewerModel, durationMs, dissentAgreed, fullText }) {
    this._ensureVerdictDir()

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `${reviewId || taskId || 'unknown'}-${timestamp}.json`
    const filepath = path.join(this.verdictDir, filename)

    const record = {
      reviewId,
      taskId,
      prNumber,
      branchName,
      verdict,
      rubric,
      reviewerModel,
      durationMs,
      dissentAgreed,
      fullText: fullText || null,
      persistedAt: new Date().toISOString()
    }

    fs.writeFileSync(filepath, JSON.stringify(record, null, 2))
    return filepath
  }

  /**
   * Write structured verdict fields to code_reviews row.
   * Returns the update payload (for testability — caller applies to DB).
   */
  buildCodeReviewUpdate({ verdict, rubric, patchId, reviewerModel, durationMs, dissentAgreed }) {
    const update = {}

    if (verdict && VERDICT_ENUM.includes(verdict)) {
      update.verdict = verdict
    }
    if (rubric && typeof rubric === 'object') {
      update.rubric = rubric
    }
    if (patchId) {
      update.patch_id = patchId
    }
    if (reviewerModel) {
      update.reviewer_model = reviewerModel
    }
    if (typeof durationMs === 'number' && durationMs >= 0) {
      update.review_duration_ms = durationMs
    }
    if (typeof dissentAgreed === 'boolean') {
      update.dissent_agreed = dissentAgreed
    }

    return update
  }

  /**
   * Record verdict to the audit ledger (genome_traces table).
   * Best-effort — never throws.
   */
  async recordToAuditLedger({ reviewId, taskId, prNumber, verdict, rubric, reviewerModel, projectId }) {
    if (!this.db) return null
    try {
      const row = {
        cycle_id: `qc-verdict-${Date.now()}`,
        timestamp: new Date().toISOString(),
        phase: 'actuate',
        component: 'qc-verdict',
        component_type: 'actuator',
        input_summary: JSON.stringify({ reviewId, taskId, prNumber }),
        output_summary: JSON.stringify({ verdict, rubric, reviewerModel }),
        success: true,
        actor: reviewerModel || 'qc',
        entity_type: 'code_review',
        entity_id: reviewId || taskId || null,
        project_id: projectId || 'leadflow'
      }
      await this.db.from('genome_traces').insert(row)
      return row
    } catch {
      return null
    }
  }
}

module.exports = { VerdictPersistenceService, VERDICT_ENUM, RUBRIC_KEYS }
