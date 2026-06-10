'use strict'
/*
 * One-time repair: resolve 6 needs_merge UCs that have been stuck since March 2026.
 *
 * Root cause: state-reconciliation uses `gh pr list --limit 200` to detect merged PRs.
 * PRs #132, #149, #195, #314, #329 were merged in March 2026 and are now beyond
 * the 200-PR window (repo has 1700+ PRs). So code_reviews.status stayed 'closed'
 * instead of being corrected to 'merged', and retryNeedsMergeUCs never found a
 * merged PR for these UCs, leaving them stuck at implementation_status='needs_merge'.
 *
 * Fix:
 *   1. For 5 UCs with confirmed-MERGED PRs: update code_reviews.status='merged',
 *      then mark UC implementation_status='complete'.
 *   2. For feat-revenue-funnel-visibility (PR #1262 genuinely CLOSED, not merged):
 *      create a fresh dev task and move UC back to 'in_progress' for the next
 *      heartbeat to pick up.
 *
 * Run from repo root: node scripts/db/fix-stuck-needs-merge-ucs.js
 */

const path = require('path')
const { TaskStore } = require(path.join(__dirname, '../../task-store'))
const { getConfig } = require(path.join(__dirname, '../../project-config-loader'))

// 5 UCs whose original PRs were MERGED on GitHub but recorded as 'closed' in DB.
// Verified 2026-06-09 via: gh pr view <n> --json state,mergedAt
// PR #132 merged 2026-03-10, #149 merged 2026-03-10, #195 merged 2026-03-11,
// #314 merged 2026-03-15, #329 merged 2026-03-15.
const MERGED_PR_FIXES = [
  {
    crId: '564b356a-a24b-47e3-95cf-2503fb67de71',
    prNumber: 132,
    ucId: 'fix-api-health-endpoint-wrong-table',
    ucName: 'Fix /api/health endpoint — queries wrong table (agents vs real_estate_agents)'
  },
  {
    crId: '639ab3d5-d904-478a-9c2c-fa145305932f',
    prNumber: 149,
    ucId: 'fix-page-view-logging-not-implemented-agent-page-views',
    ucName: 'Page view logging not implemented — agent_page_views table empty'
  },
  {
    crId: 'c40b8a5e-67de-4518-902e-f93b69b15546',
    prNumber: 195,
    ucId: 'fix-duplicate-email-error-shows-plain-text-missing-sig',
    ucName: 'Duplicate email error shows plain text — missing sign-in link'
  },
  {
    crId: '36ec6cb6-75c3-44d9-85d1-80d7e10359a1',
    prNumber: 329,
    ucId: 'fix-subscription-attempts-table-does-not-exist-in-supa',
    ucName: 'subscription_attempts table does not exist in Supabase'
  },
  {
    crId: '15c839b7-eb05-408c-a53b-e5fc3fdc5bf9',
    prNumber: 314,
    ucId: 'fix-utm-fix-branch-not-merged-to-main-fix-undeployed',
    ucName: 'UTM fix branch not merged to main — fix undeployed'
  }
]

// 1 UC whose PR was genuinely CLOSED (not merged) — needs a fresh dev task.
// All 5 previous re-merge attempts were cancelled. Direct re-queue bypasses
// the exhausted retry-count check in retryNeedsMergeUCs.
const REQUEUE_UC_ID = 'feat-revenue-funnel-visibility'

async function fixMergedPRUCs(store) {
  const results = []
  for (const fix of MERGED_PR_FIXES) {
    try {
      await store.updateCodeReview(fix.crId, { status: 'merged' })
      await store.updateUseCase(fix.ucId, { implementation_status: 'complete' })
      console.log(`  ✅ PR #${fix.prNumber} → merged, UC → complete: ${fix.ucId}`)
      results.push({ ucId: fix.ucId, action: 'complete', prNumber: fix.prNumber })
    } catch (err) {
      console.error(`  ❌ Failed for PR #${fix.prNumber} (${fix.ucId}): ${err.message}`)
      results.push({ ucId: fix.ucId, action: 'failed', error: err.message })
    }
  }
  return results
}

async function requeueClosedPRUC(store, projectId) {
  // Fetch UC details
  const { data: rows, error: ucErr } = await store.query('use_cases')
    .select('id, name, description, workflow')
    .eq('id', REQUEUE_UC_ID)
    .eq('project_id', projectId)
    .limit(1)

  if (ucErr) throw ucErr
  const uc = rows && rows[0]
  if (!uc) throw new Error(`UC ${REQUEUE_UC_ID} not found in project ${projectId}`)

  if (uc.implementation_status === 'complete') {
    console.log(`  ⏭️  ${REQUEUE_UC_ID} already complete — skipping`)
    return { ucId: REQUEUE_UC_ID, action: 'skipped', reason: 'already complete' }
  }

  // Check no active tasks already exist
  const { data: activeTasks } = await store.query('tasks')
    .select('id, status, agent_id')
    .eq('use_case_id', REQUEUE_UC_ID)
    .in('status', ['ready', 'in_progress'])
    .limit(1)

  if (activeTasks && activeTasks.length > 0) {
    const t = activeTasks[0]
    console.log(`  ⏳ ${REQUEUE_UC_ID} already has active task (${t.agent_id}/${t.status}) — skipping`)
    return { ucId: REQUEUE_UC_ID, action: 'skipped', reason: 'active task exists' }
  }

  const workflow = uc.workflow || ['dev', 'qc']
  const devIdx = Math.max(workflow.indexOf('dev'), 0)

  const task = await store.createTask({
    title: `Dev (re-impl): ${REQUEUE_UC_ID} - ${uc.name}`.slice(0, 120),
    agent_id: 'dev',
    status: 'ready',
    model: 'kimi',
    priority: 1,
    use_case_id: REQUEUE_UC_ID,
    project_id: projectId,
    tags: ['feature'],
    workflow_step: devIdx,
    workflow_total: workflow.length,
    description: [
      `Re-implement from latest main. Previous PRs (#261, #1262, #1652) were closed without merging.`,
      `Implement: ${uc.description || uc.name}`
    ].join('\n\n'),
    metadata: {
      created_by: 'manual-fix-stuck-needs-merge',
      original_uc: REQUEUE_UC_ID,
      fix_script: 'scripts/db/fix-stuck-needs-merge-ucs.js'
    }
  })

  if (!task) {
    console.error(`  ❌ createTask returned null for ${REQUEUE_UC_ID}`)
    return { ucId: REQUEUE_UC_ID, action: 'failed', reason: 'createTask returned null' }
  }

  await store.updateUseCase(REQUEUE_UC_ID, { implementation_status: 'in_progress' })
  console.log(`  🔄 Created fresh dev task ${task.id} for ${REQUEUE_UC_ID}, UC → in_progress`)
  return { ucId: REQUEUE_UC_ID, action: 'queued', taskId: task.id }
}

async function main() {
  const store = new TaskStore()
  const projectId = getConfig().project_id

  console.log(`\nFix stuck needs_merge UCs — project: ${projectId}`)
  console.log('='.repeat(60))

  console.log('\n[1/2] Marking 5 already-merged UCs as complete...')
  const mergedResults = await fixMergedPRUCs(store)

  console.log('\n[2/2] Re-queuing feat-revenue-funnel-visibility for fresh dev...')
  const requeueResult = await requeueClosedPRUC(store, projectId)

  const allResults = [...mergedResults, requeueResult]
  const completed = allResults.filter(r => r.action === 'complete').length
  const queued = allResults.filter(r => r.action === 'queued').length
  const skipped = allResults.filter(r => r.action === 'skipped').length
  const failed = allResults.filter(r => r.action === 'failed').length

  console.log('\n' + '='.repeat(60))
  console.log(`Summary: ${completed} completed, ${queued} queued, ${skipped} skipped, ${failed} failed`)

  if (failed > 0) {
    process.exitCode = 1
  }
}

main().catch(err => {
  console.error('Fatal error:', err.message)
  process.exit(1)
})

module.exports = { MERGED_PR_FIXES, REQUEUE_UC_ID, fixMergedPRUCs, requeueClosedPRUC }
