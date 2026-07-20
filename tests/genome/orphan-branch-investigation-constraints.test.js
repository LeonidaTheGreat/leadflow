'use strict'

/**
 * Tests: orphan-branch investigation task constraints
 *
 * Verifies that OrphanBranchInvestigationTaskBuilder produces tasks that
 * enforce the three hard constraints required to prevent pipeline clogging:
 *
 *   1. Diff cap: description references only git log --oneline and git diff --stat
 *   2. Verdict set: exactly 4 allowed verdicts listed in description
 *   3. No PR: description explicitly forbids commits, pushes, and PRs
 *
 * The genome fix (spawn-consumer: no worktree for orphan-branch tasks) ensures
 * no branch_name is set, so the PR backfill cannot pick these tasks up.
 * The description constraints are a second enforcement layer via agent instructions.
 */

const BUILDER_PATH = '/Users/clawdbot/projects/genome/lib/services/orphan-branch-investigation-task-builder'
const { OrphanBranchInvestigationTaskBuilder, ORPHAN_INVESTIGATION_DIFF_LINE_LIMIT } = require(BUILDER_PATH)

describe('OrphanBranchInvestigationTaskBuilder', () => {
  let builder

  beforeEach(() => {
    builder = new OrphanBranchInvestigationTaskBuilder()
  })

  describe('buildTask()', () => {
    test('includes orphan-branch tag to gate worktree and PR creation', () => {
      const task = builder.buildTask({ projectId: 'leadflow', branch: 'dev/abc123-some-fix', commitCount: 2 })
      expect(task.tags).toContain('orphan-branch')
    })

    test('agent_id is dev (runs with full capabilities but no PR)', () => {
      const task = builder.buildTask({ projectId: 'leadflow', branch: 'dev/abc123-some-fix', commitCount: 2 })
      expect(task.agent_id).toBe('dev')
    })

    test('sets project_id correctly', () => {
      const task = builder.buildTask({ projectId: 'leadflow', branch: 'dev/abc123', commitCount: 1 })
      expect(task.project_id).toBe('leadflow')
    })

    test('status is ready (queued for spawn)', () => {
      const task = builder.buildTask({ projectId: 'leadflow', branch: 'dev/abc123', commitCount: 3 })
      expect(task.status).toBe('ready')
    })
  })

  describe('buildDescription() — hard constraints', () => {
    let description

    beforeEach(() => {
      description = builder.buildDescription({ branch: 'dev/abc123-some-fix', commitCount: 2 })
    })

    test('constraint 1: diff cap — allows git log --oneline and git diff --stat', () => {
      expect(description).toContain('git log --oneline')
      expect(description).toContain('git diff --stat')
    })

    test('constraint 1: diff cap — hard rule forbids full file contents beyond limit', () => {
      expect(description).toContain(`${ORPHAN_INVESTIGATION_DIFF_LINE_LIMIT} lines`)
    })

    test('constraint 2: verdict options — shippable-needs-task-pr listed', () => {
      expect(description).toContain('shippable-needs-task-pr')
    })

    test('constraint 2: verdict options — already-shipped-safe-delete listed', () => {
      expect(description).toContain('already-shipped-safe-delete')
    })

    test('constraint 2: verdict options — duplicate/superseded listed', () => {
      expect(description).toContain('duplicate/superseded')
    })

    test('constraint 2: verdict options — needs-human-review listed', () => {
      expect(description).toContain('needs-human-review')
    })

    test('constraint 3: no PR — forbids commits', () => {
      expect(description.toLowerCase()).toMatch(/do not commit/i)
    })

    test('constraint 3: no PR — forbids pushes', () => {
      expect(description.toLowerCase()).toMatch(/do not push/i)
    })

    test('constraint 3: no PR — forbids creating a PR', () => {
      expect(description.toLowerCase()).toMatch(/do not create a pr/i)
    })

    test('constraint 3: output is a JSON file only', () => {
      expect(description).toContain('.json')
    })
  })

  describe('buildTitle()', () => {
    test('includes branch name in title', () => {
      const title = builder.buildTitle('dev/abc123-some-fix')
      expect(title).toContain('dev/abc123-some-fix')
    })

    test('truncates long branch names to 80 chars', () => {
      const longBranch = 'dev/' + 'x'.repeat(200)
      const title = builder.buildTitle(longBranch)
      expect(title.length).toBeLessThanOrEqual(80 + 'Investigate orphan branch: '.length)
    })
  })
})
