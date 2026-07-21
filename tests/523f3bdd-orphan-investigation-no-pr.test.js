'use strict'
/**
 * Regression guard for task 523f3bdd:
 * Orphan-branch investigation tasks must never create PRs or commit code.
 *
 * Root cause: OrphanBranchInvestigationTaskBuilder.buildDescription() was not
 * explicit enough — agents wrote JSON findings to docs/ or the repo root instead
 * of completion-reports/, staged those files, and created PRs. QC then had to
 * review non-code diffs, burning cycles on each orphan branch.
 *
 * Fix 1 (orphan-branch-investigation-task-builder.js): tightened description —
 *   explicit FORBIDDEN list (git add/commit/push, PR creation, test files,
 *   writing outside completion-reports/), clarifies completion-reports/ is
 *   gitignored so files physically cannot be staged.
 * Fix 2 (.gitignore): added patterns for common wrong paths
 *   (orphan-investigation-*.json, docs/orphan-*-investigation.json).
 *
 * These tests verify both fixes hold.
 */

const fs = require('fs')
const path = require('path')

const GENOME_BUILDER_PATH = path.join(
  process.env.HOME,
  'projects/genome/lib/services/orphan-branch-investigation-task-builder.js'
)

describe('orphan-branch investigation task builder constraints (task 523f3bdd)', () => {
  let OrphanBranchInvestigationTaskBuilder
  let builderAvailable = false

  beforeAll(() => {
    if (fs.existsSync(GENOME_BUILDER_PATH)) {
      ;({ OrphanBranchInvestigationTaskBuilder } = require(GENOME_BUILDER_PATH))
      builderAvailable = true
    }
  })

  test('builder file exists at expected genome path', () => {
    expect(fs.existsSync(GENOME_BUILDER_PATH)).toBe(true)
  })

  test('buildTask produces orphan-branch tag (required for spawn-message no-commit path)', () => {
    if (!builderAvailable) return
    const builder = new OrphanBranchInvestigationTaskBuilder()
    const task = builder.buildTask({ projectId: 'leadflow', branch: 'dev/abc123-fix-thing', commitCount: 1 })
    expect(Array.isArray(task.tags)).toBe(true)
    expect(task.tags).toContain('orphan-branch')
  })

  test('description explicitly forbids git add/commit/push', () => {
    if (!builderAvailable) return
    const builder = new OrphanBranchInvestigationTaskBuilder()
    const desc = builder.buildDescription({ branch: 'dev/abc123-fix-thing', commitCount: 2 })
    expect(desc).toMatch(/git add/)
    expect(desc).toMatch(/git commit/)
    expect(desc).toMatch(/git push/)
    // All three must appear in a FORBIDDEN / DO NOT section
    const forbiddenSection = desc.slice(desc.toUpperCase().indexOf('FORBIDDEN'))
    expect(forbiddenSection).toMatch(/git add/)
  })

  test('description explicitly forbids PR creation', () => {
    if (!builderAvailable) return
    const builder = new OrphanBranchInvestigationTaskBuilder()
    const desc = builder.buildDescription({ branch: 'dev/abc123-fix-thing', commitCount: 2 })
    expect(desc).toMatch(/gh pr create|DO NOT create a PR|No PRs/i)
  })

  test('description explicitly forbids writing test files', () => {
    if (!builderAvailable) return
    const builder = new OrphanBranchInvestigationTaskBuilder()
    const desc = builder.buildDescription({ branch: 'dev/abc123-fix-thing', commitCount: 2 })
    expect(desc).toMatch(/\.test\.js|test files/i)
  })

  test('description specifies completion-reports/ as the only valid output path', () => {
    if (!builderAvailable) return
    const builder = new OrphanBranchInvestigationTaskBuilder()
    const desc = builder.buildDescription({ branch: 'dev/abc123-fix-thing', commitCount: 2 })
    expect(desc).toMatch(/completion-reports\/orphan-/)
  })

  test('description explains completion-reports/ is gitignored (physical PR blocker)', () => {
    if (!builderAvailable) return
    const builder = new OrphanBranchInvestigationTaskBuilder()
    const desc = builder.buildDescription({ branch: 'dev/abc123-fix-thing', commitCount: 2 })
    expect(desc).toMatch(/gitignored|cannot be staged|cannot.*commit/i)
  })

  test('verdict must be one of the 4 defined options', () => {
    if (!builderAvailable) return
    const builder = new OrphanBranchInvestigationTaskBuilder()
    const desc = builder.buildDescription({ branch: 'dev/abc123-fix-thing', commitCount: 2 })
    expect(desc).toContain('shippable-needs-task-pr')
    expect(desc).toContain('already-shipped-safe-delete')
    expect(desc).toContain('duplicate/superseded')
    expect(desc).toContain('needs-human-review')
  })

  test('description forbids writing outside completion-reports/ (docs/, tests/, root)', () => {
    if (!builderAvailable) return
    const builder = new OrphanBranchInvestigationTaskBuilder()
    const desc = builder.buildDescription({ branch: 'dev/abc123-fix-thing', commitCount: 2 })
    // Must say docs/ is forbidden
    expect(desc).toMatch(/docs\//)
    // Must say tests/ is forbidden
    expect(desc).toMatch(/tests\//)
    // Must say repo root is forbidden
    expect(desc).toMatch(/repo root|no directory prefix/i)
  })
})

describe('.gitignore orphan-investigation patterns (task 523f3bdd)', () => {
  const GITIGNORE_PATH = path.join(__dirname, '..', '.gitignore')

  test('.gitignore blocks root-level orphan-investigation-*.json files', () => {
    const content = fs.readFileSync(GITIGNORE_PATH, 'utf8')
    expect(content).toMatch(/orphan-investigation-\*\.json/)
  })

  test('.gitignore blocks docs/orphan-*-investigation.json files', () => {
    const content = fs.readFileSync(GITIGNORE_PATH, 'utf8')
    expect(content).toMatch(/docs\/orphan-.*investigation\.json/)
  })

  test('completion-reports/ is already gitignored (the correct output path)', () => {
    const content = fs.readFileSync(GITIGNORE_PATH, 'utf8')
    expect(content).toMatch(/^completion-reports\/$/m)
  })
})
