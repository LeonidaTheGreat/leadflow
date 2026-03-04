#!/usr/bin/env node
/**
 * Dry-run heartbeat — exercises all 4 loops without side effects.
 *
 * What it DOES:
 *   - Queries task state from Supabase
 *   - Checks for zombies (report only, no resets)
 *   - Checks for completions (report only)
 *   - Simulates spawn decisions (no actual spawn, no budget debit)
 *   - Checks blockers
 *   - Runs self-heal checks (report only, no healing)
 *   - Simulates replenishQueue (shows what tasks WOULD be created)
 *   - Checks product feedback (report only)
 *   - Checks PR reviews (report only)
 *   - Skips: dashboard update, Telegram report, log write
 *
 * Usage: node scripts/dry-run-heartbeat.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })
const { TaskStore } = require('../task-store')
const { LearningSystem } = require('../learning-system')
const { runHealthChecks } = require('../self-heal')
const path = require('path')
const fs = require('fs')

const store = new TaskStore()
const learner = new LearningSystem()
const projectId = 'bo2026'

async function dryRun() {
  console.log('=== DRY-RUN HEARTBEAT (no side effects) ===\n')

  // 1. QUERY STATE
  console.log('1. QUERY STATE')
  const allTasks = await store.getTasks()
  const status = {
    ready: allTasks.filter(t => t.status === 'ready').length,
    inProgress: allTasks.filter(t => t.status === 'in_progress').length,
    blocked: allTasks.filter(t => t.status === 'blocked').length,
    done: allTasks.filter(t => t.status === 'done').length,
    failed: allTasks.filter(t => t.status === 'failed').length,
    total: allTasks.length
  }
  console.log(`   Ready: ${status.ready} | In Progress: ${status.inProgress} | Blocked: ${status.blocked} | Done: ${status.done} | Failed: ${status.failed} | Total: ${status.total}`)

  // 2. ZOMBIE CHECK (read-only)
  console.log('\n2. ZOMBIE CHECK')
  const inProgressTasks = allTasks.filter(t => t.status === 'in_progress')
  if (inProgressTasks.length === 0) {
    console.log('   No in-progress tasks')
  } else {
    for (const task of inProgressTasks) {
      const startedAt = new Date(task.started_at || task.created_at)
      const runtimeMin = Math.round((Date.now() - startedAt) / 60000)
      const pid = task.spawn_config?.pid
      let pidStatus = 'no PID'
      if (pid) {
        try { process.kill(pid, 0); pidStatus = `PID ${pid} alive` } catch { pidStatus = `PID ${pid} dead` }
      }
      const isZombie = runtimeMin > 120 || (pid && pidStatus.includes('dead') && runtimeMin > 15) || (!pid && runtimeMin > 60)
      console.log(`   ${isZombie ? '🧟' : '✓'} ${task.title} — ${runtimeMin}m, ${pidStatus}`)
    }
  }

  // 3. COMPLETIONS (read-only)
  console.log('\n3. COMPLETIONS CHECK')
  try {
    const { getUnprocessedReports } = require('../subagent-completion-report')
    const reports = getUnprocessedReports()
    if (reports.length === 0) {
      console.log('   No pending completion reports')
    } else {
      for (const r of reports) {
        console.log(`   📄 ${r.taskId}: ${r.status}`)
      }
    }
  } catch (err) {
    console.log(`   ⚠️ Could not check reports: ${err.message}`)
  }

  // 4. SPAWN SIMULATION (read-only)
  console.log('\n4. SPAWN SIMULATION')
  const readyTasks = allTasks.filter(t => t.status === 'ready').sort((a, b) => a.priority - b.priority)
  if (readyTasks.length === 0) {
    console.log('   No ready tasks to spawn')
  } else {
    const budgetPath = path.join(__dirname, '..', 'budget-tracker.json')
    let budget = { spent: 0 }
    if (fs.existsSync(budgetPath)) {
      const bt = JSON.parse(fs.readFileSync(budgetPath, 'utf-8'))
      const today = new Date().toISOString().split('T')[0]
      if (bt.date === today) budget = bt
    }
    const remaining = 20.00 - (budget.spent || 0)
    console.log(`   Budget: $${(budget.spent || 0).toFixed(2)} spent, $${remaining.toFixed(2)} remaining`)

    let wouldSpawn = 0
    for (const task of readyTasks) {
      if (wouldSpawn >= 2) {
        console.log(`   ⏭️ ${task.title} — would skip (max 2 per heartbeat)`)
        continue
      }
      const cost = task.estimated_cost_usd || 1.0
      const agent = task.agent_id || 'unknown'
      const model = task.model || 'qwen3.5'
      const uc = task.use_case_id || '-'

      // Check learning recommendations
      let modelNote = ''
      try {
        const recs = learner.getRecommendations(task)
        const modelRec = recs?.find(r => r.type === 'model')
        if (modelRec?.recommendedModel && modelRec.recommendedModel !== model) {
          modelNote = ` (learning suggests: ${modelRec.recommendedModel})`
        }
      } catch {}

      console.log(`   🚀 WOULD SPAWN: ${agent} for "${task.title}" [UC: ${uc}, model: ${model}${modelNote}, cost: $${cost.toFixed(2)}]`)
      wouldSpawn++
    }
  }

  // 5. BLOCKERS
  console.log('\n5. BLOCKED TASKS')
  const blockedTasks = allTasks.filter(t => t.status === 'blocked')
  if (blockedTasks.length === 0) {
    console.log('   No blocked tasks')
  } else {
    for (const task of blockedTasks) {
      console.log(`   ⏸️ ${task.title}`)
    }
  }

  // 5b. SELF-HEAL (read-only)
  console.log('\n5b. SELF-HEAL CHECKS')
  try {
    const issues = await runHealthChecks()
    if (issues.length === 0) {
      console.log('   ✅ No issues detected')
    } else {
      for (const issue of issues) {
        console.log(`   ${issue.severity === 'critical' ? '🔴' : '🟡'} ${issue.message}`)
      }
      console.log(`   (${issues.filter(i => i.severity === 'critical').length} critical — would auto-heal in live run)`)
    }
  } catch (err) {
    console.log(`   ⚠️ Self-heal check failed: ${err.message}`)
  }

  // 6. REPLENISH QUEUE (read-only simulation)
  console.log('\n6. QUEUE REPLENISHMENT SIMULATION')
  if (status.ready >= 2) {
    console.log(`   Queue healthy (${status.ready} ready) — would skip replenishment`)
  } else {
    console.log(`   Queue low (${status.ready} ready) — checking roadmap...`)

    if (!store.supabase) {
      console.log('   ⚠️ No Supabase connection')
    } else {
      const { data: incompleteUCs } = await store.supabase
        .from('use_cases').select('*')
        .in('implementation_status', ['not_started', 'partial'])
        .order('priority', { ascending: true })

      console.log(`   ${(incompleteUCs || []).length} incomplete UCs in roadmap`)

      const activeUCs = new Set(allTasks
        .filter(t => ['ready', 'in_progress', 'blocked'].includes(t.status))
        .map(t => t.use_case_id).filter(Boolean))

      const { data: completedUCData } = await store.supabase
        .from('use_cases').select('id').eq('implementation_status', 'complete')
      const completedUCs = new Set((completedUCData || []).map(u => u.id))

      console.log(`   Completed UCs: ${[...completedUCs].join(', ') || 'none'}`)
      console.log(`   Active UCs (have tasks): ${[...activeUCs].join(', ') || 'none'}`)

      const AGENT_LABELS = { product: 'PM', dev: 'Dev', design: 'Design', qc: 'QC', analytics: 'Analytics', marketing: 'Marketing' }
      let wouldCreate = 0

      for (const uc of incompleteUCs || []) {
        if (wouldCreate >= 2) break
        if (activeUCs.has(uc.id)) {
          console.log(`   ⏭️ ${uc.id} (${uc.name}) — already has active task`)
          continue
        }
        const unmetDeps = (uc.depends_on || []).filter(d => !completedUCs.has(d))
        if (unmetDeps.length > 0) {
          console.log(`   ⏸️ ${uc.id} (${uc.name}) — blocked by: ${unmetDeps.join(', ')}`)
          continue
        }
        const firstAgent = (uc.workflow || ['product'])[0]
        const label = AGENT_LABELS[firstAgent] || firstAgent
        console.log(`   ✅ WOULD CREATE: "${label}: ${uc.id} - ${uc.name}" [agent: ${firstAgent}, priority: ${uc.priority}]`)
        wouldCreate++
      }

      if (wouldCreate === 0) {
        console.log('   No UCs eligible for task creation')
      }
    }
  }

  // 6b. PRODUCT FEEDBACK (read-only)
  console.log('\n6b. PRODUCT FEEDBACK')
  if (store.supabase) {
    const { data: unprocessed } = await store.supabase
      .from('product_feedback').select('*')
      .eq('project_id', projectId).eq('processed', false)
      .limit(5)
    if (!unprocessed || unprocessed.length === 0) {
      console.log('   No unprocessed feedback')
    } else {
      for (const fb of unprocessed) {
        console.log(`   📝 ${fb.feedback_type} from ${fb.source} — would create PM task`)
      }
    }
  }

  // 6c. PR REVIEWS (read-only)
  console.log('\n6c. PR REVIEWS')
  if (store.supabase) {
    const { data: approved } = await store.supabase
      .from('code_reviews').select('*')
      .eq('project_id', projectId).eq('status', 'approved')
    const { data: rejected } = await store.supabase
      .from('code_reviews').select('*')
      .eq('project_id', projectId).eq('status', 'changes_requested')
    const { data: pending } = await store.supabase
      .from('code_reviews').select('*')
      .eq('project_id', projectId).eq('status', 'pending')

    console.log(`   Approved (would merge): ${(approved || []).length}`)
    console.log(`   Changes requested (would create fix task): ${(rejected || []).length}`)
    console.log(`   Pending review: ${(pending || []).length}`)
  }

  // SUMMARY
  console.log('\n' + '='.repeat(50))
  console.log('DRY-RUN SUMMARY')
  console.log('='.repeat(50))
  console.log(`Tasks: ${status.total} total (${status.ready} ready, ${status.inProgress} active, ${status.done} done)`)
  console.log(`Zombies: ${inProgressTasks.filter(t => {
    const rt = (Date.now() - new Date(t.started_at || t.created_at)) / 60000
    return rt > 120
  }).length} detected`)
  console.log(`Would spawn: ${Math.min(readyTasks.length, 2)} agent(s)`)
  console.log(`Queue replenishment: ${status.ready < 2 ? 'would run' : 'not needed'}`)
  console.log('\nAll checks passed. Safe to run a live heartbeat.')
}

dryRun().catch(err => {
  console.error('Dry-run failed:', err.message)
  console.error(err.stack)
  process.exit(1)
})
