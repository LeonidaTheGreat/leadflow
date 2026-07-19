/*
TASK SPEC (6887e37b-492e-4e27-8bbd-7079a51cecb1)
What:
- lib/services/StageEventsService.js — records and queries per-stage pipeline timing
  for use cases, enabling breakdown of the Feedback-to-Deploy-Time mission metric.
- scripts/db/019-uc-stage-events.sql — DDL for uc_stage_events table.
- tests/unit/StageEventsService.test.js — Jest unit tests (mocked pool).

Verify:
- node -e "const {StageEventsService}=require('./lib/services/StageEventsService');
  console.log(StageEventsService.VALID_STAGES)"
  → prints the 6-stage array.
- npm run lint — exit 0.
- npm run build — exit 0.
- npm test — exit 0.

Boundaries:
- Do not modify genome files, existing services, routes, or auto-generated docs.
- Do not call getPool() at module load — lazy-init only in methods.
*/

'use strict';

// Named stages in pipeline order
const VALID_STAGES = Object.freeze([
  'feedback_ingested',
  'dev_spawned',
  'dev_completed',
  'qc_spawned',
  'qc_completed',
  'merged'
]);

// Human-readable segments between consecutive stages
const PIPELINE_SEGMENTS = Object.freeze([
  { from: 'feedback_ingested', to: 'dev_spawned',   label: 'Feedback → Dev Queue' },
  { from: 'dev_spawned',       to: 'dev_completed', label: 'Dev Implementation' },
  { from: 'dev_completed',     to: 'qc_spawned',    label: 'Dev → QC Queue' },
  { from: 'qc_spawned',        to: 'qc_completed',  label: 'QC Review' },
  { from: 'qc_completed',      to: 'merged',        label: 'QC → Merge' }
]);

const MAX_VALID_HOURS = 72; // outlier cap — pipelines > 72h treated as stuck

class StageEventsService {
  /**
   * @param {import('pg').Pool} pool — shared pg Pool from lib/db.getPool()
   */
  constructor(pool) {
    this.pool = pool;
  }

  /**
   * Record a pipeline stage event for a use case.
   * Idempotent via ON CONFLICT DO UPDATE — calling twice with different
   * timestamps overwrites the previous timestamp for that stage.
   *
   * @param {string} ucId
   * @param {string} projectId
   * @param {string} stage — must be one of VALID_STAGES
   * @param {Date|string|number} [timestamp] — defaults to now()
   */
  async recordEvent(ucId, projectId, stage, timestamp) {
    if (!VALID_STAGES.includes(stage)) {
      throw new Error(`Invalid stage: "${stage}". Valid stages: ${VALID_STAGES.join(', ')}`);
    }
    const occurredAt = timestamp ? new Date(timestamp) : new Date();
    await this.pool.query(
      `INSERT INTO uc_stage_events (uc_id, project_id, stage, occurred_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (uc_id, stage) DO UPDATE SET occurred_at = EXCLUDED.occurred_at`,
      [ucId, projectId, stage, occurredAt]
    );
  }

  /**
   * Return all recorded stage events for a UC, ordered chronologically.
   * @param {string} ucId
   * @returns {Promise<Array<{stage: string, occurred_at: Date}>>}
   */
  async getUCStageTimeline(ucId) {
    const { rows } = await this.pool.query(
      `SELECT stage, occurred_at
       FROM uc_stage_events
       WHERE uc_id = $1
       ORDER BY occurred_at ASC`,
      [ucId]
    );
    return rows;
  }

  /**
   * Compute per-segment and total median timing for a project over the last N days.
   *
   * @param {string} projectId
   * @param {number} [days=7]
   * @returns {Promise<{
   *   segments: Array<{label, from, to, medianHours, avgHours, count}>,
   *   totalMedianHours: number|null,
   *   ucCount: number
   * }>}
   */
  async getPipelineStageBreakdown(projectId, days = 7) {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const { rows } = await this.pool.query(
      `SELECT uc_id, stage, occurred_at
       FROM uc_stage_events
       WHERE project_id = $1 AND occurred_at >= $2
       ORDER BY uc_id, occurred_at`,
      [projectId, cutoff]
    );

    // Build a map: ucId → { stage → epochMs }
    const byUC = {};
    for (const row of rows) {
      if (!byUC[row.uc_id]) byUC[row.uc_id] = {};
      byUC[row.uc_id][row.stage] = new Date(row.occurred_at).getTime();
    }

    // Accumulate per-segment hour arrays
    const buckets = {};
    for (const seg of PIPELINE_SEGMENTS) {
      buckets[seg.label] = [];
    }
    for (const stageMap of Object.values(byUC)) {
      for (const seg of PIPELINE_SEGMENTS) {
        if (stageMap[seg.from] != null && stageMap[seg.to] != null) {
          const hours = (stageMap[seg.to] - stageMap[seg.from]) / 3_600_000;
          if (hours >= 0 && hours <= MAX_VALID_HOURS) {
            buckets[seg.label].push(hours);
          }
        }
      }
    }

    const segments = PIPELINE_SEGMENTS.map(seg => {
      const arr = buckets[seg.label];
      if (!arr.length) {
        return { label: seg.label, from: seg.from, to: seg.to, medianHours: null, avgHours: null, count: 0 };
      }
      arr.sort((a, b) => a - b);
      const mid = Math.floor(arr.length / 2);
      const median = arr.length % 2 === 0 ? (arr[mid - 1] + arr[mid]) / 2 : arr[mid];
      const avg = arr.reduce((s, v) => s + v, 0) / arr.length;
      return {
        label: seg.label,
        from: seg.from,
        to: seg.to,
        medianHours: Math.round(median * 10) / 10,
        avgHours: Math.round(avg * 10) / 10,
        count: arr.length
      };
    });

    // Total: feedback_ingested → merged
    const totalHours = [];
    for (const stageMap of Object.values(byUC)) {
      if (stageMap['feedback_ingested'] != null && stageMap['merged'] != null) {
        const h = (stageMap['merged'] - stageMap['feedback_ingested']) / 3_600_000;
        if (h >= 0 && h <= MAX_VALID_HOURS) totalHours.push(h);
      }
    }
    let totalMedianHours = null;
    if (totalHours.length) {
      totalHours.sort((a, b) => a - b);
      const mid = Math.floor(totalHours.length / 2);
      const raw = totalHours.length % 2 === 0
        ? (totalHours[mid - 1] + totalHours[mid]) / 2
        : totalHours[mid];
      totalMedianHours = Math.round(raw * 10) / 10;
    }

    return { segments, totalMedianHours, ucCount: Object.keys(byUC).length };
  }

  /**
   * Backfill stage events for a project from existing tasks / code_reviews.
   * Derives approximate timestamps from task lifecycle records.
   * Uses ON CONFLICT DO NOTHING — safe to run multiple times.
   *
   * @param {string} projectId
   * @returns {Promise<{ucsProcessed: number, eventsCreated: number}>}
   */
  async backfillFromTasks(projectId) {
    const { rows: ucs } = await this.pool.query(
      `SELECT id, created_at, workflow
       FROM use_cases
       WHERE project_id = $1 AND implementation_status = 'complete'`,
      [projectId]
    );

    let eventsCreated = 0;

    for (const uc of ucs) {
      const workflow = Array.isArray(uc.workflow) ? uc.workflow : [];

      // feedback_ingested ← UC creation time
      if (uc.created_at) {
        eventsCreated += await this._insertIgnore(uc.id, projectId, 'feedback_ingested', uc.created_at);
      }

      if (workflow.includes('dev')) {
        const { rows: dt } = await this.pool.query(
          `SELECT created_at, updated_at FROM tasks
           WHERE use_case_id = $1 AND agent_id = 'dev' AND status = 'done'
           ORDER BY created_at ASC LIMIT 1`,
          [uc.id]
        );
        if (dt.length) {
          eventsCreated += await this._insertIgnore(uc.id, projectId, 'dev_spawned', dt[0].created_at);
          eventsCreated += await this._insertIgnore(uc.id, projectId, 'dev_completed', dt[0].updated_at);
        }
      }

      if (workflow.includes('qc')) {
        const { rows: qt } = await this.pool.query(
          `SELECT created_at, updated_at FROM tasks
           WHERE use_case_id = $1 AND agent_id = 'qc' AND status = 'done'
           ORDER BY created_at ASC LIMIT 1`,
          [uc.id]
        );
        if (qt.length) {
          eventsCreated += await this._insertIgnore(uc.id, projectId, 'qc_spawned', qt[0].created_at);
          eventsCreated += await this._insertIgnore(uc.id, projectId, 'qc_completed', qt[0].updated_at);
        }
      }

      // merged ← code_reviews with status=merged for any task in this UC
      const { rows: mr } = await this.pool.query(
        `SELECT cr.updated_at
         FROM code_reviews cr
         JOIN tasks t ON t.id = cr.task_id
         WHERE t.use_case_id = $1 AND cr.status = 'merged'
         ORDER BY cr.updated_at DESC LIMIT 1`,
        [uc.id]
      );
      if (mr.length) {
        eventsCreated += await this._insertIgnore(uc.id, projectId, 'merged', mr[0].updated_at);
      }
    }

    return { ucsProcessed: ucs.length, eventsCreated };
  }

  async _insertIgnore(ucId, projectId, stage, timestamp) {
    if (!timestamp) return 0;
    const result = await this.pool.query(
      `INSERT INTO uc_stage_events (uc_id, project_id, stage, occurred_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (uc_id, stage) DO NOTHING`,
      [ucId, projectId, stage, new Date(timestamp)]
    );
    return result.rowCount || 0;
  }
}

StageEventsService.VALID_STAGES = VALID_STAGES;
StageEventsService.PIPELINE_SEGMENTS = PIPELINE_SEGMENTS;

module.exports = { StageEventsService };
