'use strict';

/**
 * PipelineFixDetector — Detects 3 recurring pipeline_fix failure patterns
 * in the genome orchestration pipeline that the generic rescue system skips.
 *
 * Patterns detected:
 *   1. parked_stuck_chain       — tasks PARKED after 3 retries exhausted in a stuck chain
 *   2. exhausted_spawn_time     — tasks failed at spawn time with exhausted retries
 *   3. parked_verification_no_commits — tasks PARKED after 3x verification found no commits
 *
 * This detector reads the `tasks` table and classifies failed tasks by their
 * `last_error` string. It does NOT modify any task state — detection only.
 * Recovery is a separate concern handled by the genome actuators.
 *
 * Architecture: SENSOR (read-only, returns structured observations).
 */

// Pattern constants — must match exact strings set by the genome actuators.
// Sources:
//   parked_stuck_chain:       core/reflexes/task-rescue.js → parkTask() with "Stuck chain: N retries exhausted"
//   exhausted_spawn_time:     core/food/spawn-preparer.js and core/reflexes/spawn-gate.js
//   parked_verification_no_commits: completion-verifier / verification flow → parkTask() with "Verification failed 3x: no commits on branch"
const PIPELINE_FIX_PATTERNS = Object.freeze({
  parked_stuck_chain: {
    id: 'parked_stuck_chain',
    description: 'Task parked after retries exhausted in stuck chain',
    // last_error = "PARKED: Stuck chain: 3 retries exhausted"
    test: (lastError) => typeof lastError === 'string' && lastError.startsWith('PARKED: Stuck chain:'),
    severity: 'high',
    recovery: 'reset_retry_count_and_unpark'
  },
  exhausted_spawn_time: {
    id: 'exhausted_spawn_time',
    description: 'Task failed at spawn time with retries exhausted (never successfully started)',
    // last_error = "Max retries exhausted at spawn time"
    test: (lastError) => typeof lastError === 'string' && lastError.startsWith('Max retries exhausted at spawn time'),
    severity: 'medium',
    recovery: 'reset_retry_count_for_fresh_spawn'
  },
  parked_verification_no_commits: {
    id: 'parked_verification_no_commits',
    description: 'Task parked after verification found no commits on branch (3x)',
    // last_error = "PARKED: Verification failed 3x: no commits on branch ..."
    test: (lastError) => typeof lastError === 'string' && lastError.startsWith('PARKED: Verification failed 3x: no commits on branch'),
    severity: 'high',
    recovery: 'reset_and_add_commit_context'
  }
});

/**
 * Classify a single task's last_error against all known patterns.
 *
 * @param {object} task - task record with at minimum { id, last_error, metadata }
 * @returns {{ patternId: string, pattern: object } | null} matched pattern or null
 */
function classifyTask(task) {
  const lastError = task?.last_error;
  if (!lastError) return null;

  for (const [patternId, pattern] of Object.entries(PIPELINE_FIX_PATTERNS)) {
    if (pattern.test(lastError)) {
      return { patternId, pattern };
    }
  }
  return null;
}

class PipelineFixDetector {
  /**
   * @param {object} db - database pool with a query(text, values) method
   * @param {object} opts - optional overrides { projectId, logger }
   */
  constructor(db, opts = {}) {
    this.db = db;
    this.projectId = opts.projectId || process.env.PROJECT_ID || 'leadflow';
    this.logger = opts.logger || console;
  }

  /**
   * Detect all tasks matching the 3 pipeline_fix patterns.
   *
   * Queries failed tasks and classifies them by last_error pattern.
   * Returns structured observations grouped by pattern.
   *
   * @returns {Promise<{
   *   parked_stuck_chain: Array<object>,
   *   exhausted_spawn_time: Array<object>,
   *   parked_verification_no_commits: Array<object>,
   *   total: number,
   *   detectedAt: string
   * }>}
   */
  async detect() {
    const observations = {
      parked_stuck_chain: [],
      exhausted_spawn_time: [],
      parked_verification_no_commits: [],
      total: 0,
      detectedAt: new Date().toISOString()
    };

    try {
      const result = await this.db.query(
        `SELECT id, title, agent_id, status, last_error, retry_count, max_retries,
                use_case_id, metadata, branch_name, created_at, updated_at
         FROM tasks
         WHERE status = 'failed'
           AND last_error IS NOT NULL
           AND last_error != ''
         ORDER BY updated_at DESC
         LIMIT 200`,
        []
      );

      const tasks = result?.rows || [];

      for (const task of tasks) {
        const match = classifyTask(task);
        if (!match) continue;

        const classified = {
          id: task.id,
          title: task.title,
          agentId: task.agent_id,
          lastError: task.last_error,
          retryCount: task.retry_count || 0,
          maxRetries: task.max_retries || 3,
          useCaseId: task.use_case_id || null,
          branchName: task.branch_name || null,
          isParked: !!(task.metadata?.parked),
          createdAt: task.created_at,
          updatedAt: task.updated_at,
          patternId: match.patternId,
          severity: match.pattern.severity,
          recovery: match.pattern.recovery
        };

        observations[match.patternId].push(classified);
        observations.total++;
      }
    } catch (err) {
      this.logger.error('[PipelineFixDetector] detect() failed:', err.message);
      // Return empty observations — non-fatal, detection is best-effort
    }

    return observations;
  }

  /**
   * Detect and return a summary suitable for reporting.
   *
   * @returns {Promise<object>} detection summary with counts per pattern
   */
  async summary() {
    const obs = await this.detect();
    return {
      parked_stuck_chain: obs.parked_stuck_chain.length,
      exhausted_spawn_time: obs.exhausted_spawn_time.length,
      parked_verification_no_commits: obs.parked_verification_no_commits.length,
      total: obs.total,
      detectedAt: obs.detectedAt
    };
  }
}

module.exports = {
  PipelineFixDetector,
  classifyTask,
  PIPELINE_FIX_PATTERNS
};
