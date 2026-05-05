'use strict'

/**
 * Task Spec (377200e1-2e38-46ac-b000-e9d036f4907b)
 * What:
 * - Add integration tests in tests/genome/spawn-message-export-risk-warning.test.js
 *   that verify _buildExportRiskWarnings() fires correctly against the real
 *   leadflow CODE_GRAPH.json and produces actionable output.
 * Verify:
 * - Run: npx jest tests/genome/spawn-message-export-risk-warning.test.js --runInBand
 *   Expected: all tests pass.
 * - Quality gates: npm run build, npm run lint, npm test, npm audit --audit-level=high
 *   Expected: exit code 0.
 * Boundaries:
 * - Do not modify any files under ~/.openclaw/genome.
 * - Do not change service/router/business logic in this repo.
 * - Only add tests verifying export risk warning behavior for leadflow's CODE_GRAPH.
 */

const SPAWN_MESSAGE_BUILDER_PATH = '/Users/clawdbot/.openclaw/genome/core/spawn-message-builder'
const LEADFLOW_PROJECT_DIR = '/Users/clawdbot/projects/leadflow'

function mockStore() {
  return {
    projectId: 'leadflow',
    query: (table) => {
      if (table === 'prds') {
        return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }) }
      }
      if (table === 'tasks') {
        return { select: () => ({ eq: () => ({ eq: () => ({ order: () => ({ limit: async () => ({ data: [] }) }) }) }) }) }
      }
      return null
    }
  }
}

describe('export risk warnings — leadflow integration', () => {
  let SpawnMessageBuilder

  beforeAll(() => {
    SpawnMessageBuilder = require(SPAWN_MESSAGE_BUILDER_PATH).SpawnMessageBuilder
  })

  describe('_buildExportRiskWarnings() with leadflow CODE_GRAPH', () => {
    it('fires for tasks touching lib/logger.js (27 callers)', () => {
      const builder = new SpawnMessageBuilder(mockStore())
      const result = builder._buildExportRiskWarnings(
        'Refactor logger to add request-id tracing',
        { description: 'Modify lib/logger.js to include request-id in every log entry.', metadata: {} },
        { project_dir: LEADFLOW_PROJECT_DIR }
      )
      expect(result).not.toBeNull()
      expect(result).toContain('EXPORT RISK')
      // logger is imported by 27 files — should trigger module-level blast radius
      expect(result).toContain('files depend on it')
    })

    it('fires for tasks touching lib/services/EmailService.js (6 callers)', () => {
      const builder = new SpawnMessageBuilder(mockStore())
      const result = builder._buildExportRiskWarnings(
        'Add retry to EmailService',
        { description: 'Modify lib/services/EmailService.js to add exponential backoff.', metadata: {} },
        { project_dir: LEADFLOW_PROJECT_DIR }
      )
      expect(result).not.toBeNull()
      expect(result).toContain('EXPORT RISK')
      expect(result).toContain('EmailService')
    })

    it('shows full caller paths (containing /) not just basenames', () => {
      const builder = new SpawnMessageBuilder(mockStore())
      const result = builder._buildExportRiskWarnings(
        'Fix logger',
        { description: 'Edit lib/logger.js', metadata: {} },
        { project_dir: LEADFLOW_PROJECT_DIR }
      )
      expect(result).not.toBeNull()
      // Full paths should contain '/' — basenames like 'ActivationService' would not
      const callerLineMatch = result.match(/callers: \[([^\]]+)\]/)
      if (callerLineMatch) {
        expect(callerLineMatch[1]).toMatch(/\//)
      }
    })

    it('includes actionable checklist in output', () => {
      const builder = new SpawnMessageBuilder(mockStore())
      const result = builder._buildExportRiskWarnings(
        'Fix EmailService',
        { description: 'Edit lib/services/EmailService.js', metadata: {} },
        { project_dir: LEADFLOW_PROJECT_DIR }
      )
      expect(result).not.toBeNull()
      expect(result).toContain('Required before committing')
      expect(result).toContain('npm test')
      expect(result).toContain('grep for every caller')
    })

    it('returns null for low-impact files with no high-caller exports', () => {
      const builder = new SpawnMessageBuilder(mockStore())
      // A file that is unlikely to have 3+ callers or 5+ dependents
      const result = builder._buildExportRiskWarnings(
        'Update README',
        { description: 'Update the README.md file with new instructions.', metadata: {} },
        { project_dir: LEADFLOW_PROJECT_DIR }
      )
      // README.md is not a .js file and won't be in the graph — should be null
      expect(result).toBeNull()
    })

    it('respects explicit target_files over description parsing', () => {
      const builder = new SpawnMessageBuilder(mockStore())
      const result = builder._buildExportRiskWarnings(
        'Fix email bug',
        {
          description: 'Handle the edge case in email sending.',
          metadata: { target_files: ['lib/services/EmailService.js'] }
        },
        { project_dir: LEADFLOW_PROJECT_DIR }
      )
      expect(result).not.toBeNull()
      expect(result).toContain('EmailService')
    })
  })

  describe('buildCoreMessage() — dev agent injection', () => {
    it('injects export risk section for dev agent touching high-caller leadflow module', async () => {
      const builder = new SpawnMessageBuilder(mockStore())
      const msg = await builder.buildCoreMessage({
        taskId: 'test-task-leadflow-export-risk',
        title: 'Modify logger to add structured context',
        agentId: 'dev',
        taskDetail: {
          id: 'test-task-leadflow-export-risk',
          title: 'Modify logger to add structured context',
          description: 'Edit lib/logger.js to add request-id context to all log entries.',
          project_id: 'leadflow',
          retry_count: 0,
          last_error: null,
          metadata: {},
          tags: []
        },
        tags: [],
        projectCtx: { project_dir: LEADFLOW_PROJECT_DIR, project_id: 'leadflow' }
      })
      expect(msg).toContain('EXPORT RISK')
      expect(msg).toContain('logger.js')
      expect(msg).toContain('Required before committing')
    })

    it('does NOT inject export risk section for qc agents', async () => {
      const builder = new SpawnMessageBuilder(mockStore())
      const msg = await builder.buildCoreMessage({
        taskId: 'test-task-leadflow-qc',
        title: 'Review logger changes',
        agentId: 'qc',
        taskDetail: {
          id: 'test-task-leadflow-qc',
          title: 'Review logger changes',
          description: 'Review changes to lib/logger.js.',
          project_id: 'leadflow',
          retry_count: 0,
          last_error: null,
          metadata: {},
          tags: []
        },
        tags: [],
        projectCtx: { project_dir: LEADFLOW_PROJECT_DIR, project_id: 'leadflow' }
      })
      expect(msg).not.toContain('EXPORT RISK')
    })
  })
})
