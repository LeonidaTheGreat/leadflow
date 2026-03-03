/**
 * workflow-engine.js — Shared orchestration primitives
 *
 * Stateless functions extracted from heartbeat-executor.js so both the
 * heartbeat (cold path) and realtime-dispatcher (hot path) can call them
 * without class coupling.
 *
 * Every function accepts its dependencies (store, learner, …) as arguments.
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')
const { getConfig } = require('./project-config-loader')

// ── Constants (loaded from project config) ──────────────────────────────────

const _cfg = getConfig()
const BUDGET_DAILY_LIMIT = _cfg.budget.daily_limit
const BUDGET_MIN_FOR_SPAWN = _cfg.budget.min_for_spawn
const BUDGET_TRACKER_PATH = path.join(__dirname, 'budget-tracker.json')

const AGENT_LABELS = _cfg.agents.labels

// Cost per hour by model (USD). Qwen runs locally on MLX = free.
const MODEL_COSTS = _cfg.budget.model_costs

/**
 * Estimate task cost based on model and hours.
 * @param {string} model - e.g. 'qwen3.5', 'sonnet'
 * @param {number} [hours=1] - estimated hours
 * @returns {number} estimated cost in USD
 */
function estimateCost(model, hours = 1) {
  const key = Object.keys(MODEL_COSTS).find(k => (model || '').toLowerCase().includes(k))
  return (MODEL_COSTS[key] ?? 1.00) * hours
}

const COMPLETION_MARKERS = [
  'Task Complete', 'IMPLEMENTATION COMPLETE', 'PRODUCTION READY',
  'MIGRATION READY', 'Status: COMPLETE', 'TASK COMPLETE',
  'TASK COMPLETED', 'READY FOR INTEGRATION TESTING',
  'phase complete', 'ready for implementation',
  '\u2705 COMPLETE'  // ✅ COMPLETE — common agent output with emoji
]

// ── Log helpers ──────────────────────────────────────────────────────────────

/**
 * Read the last N lines (up to maxBytes) from a log file safely.
 */
function readLogTail(filePath, maxLines = 30, maxBytes = 4096) {
  try {
    if (!fs.existsSync(filePath)) return ''
    const stat = fs.statSync(filePath)
    const size = stat.size
    if (size === 0) return ''
    const readSize = Math.min(size, maxBytes)
    const fd = fs.openSync(filePath, 'r')
    const buf = Buffer.alloc(readSize)
    fs.readSync(fd, buf, 0, readSize, Math.max(0, size - readSize))
    fs.closeSync(fd)
    const text = buf.toString('utf-8')
    const lines = text.split('\n')
    return lines.slice(-maxLines).join('\n').trim()
  } catch {
    return ''
  }
}

// ── Budget helpers ───────────────────────────────────────────────────────────

/**
 * Read today's budget tracker.  Resets automatically on a new calendar day.
 * @returns {{ spent: number, remaining: number, spawns: Array }}
 */
function checkBudget() {
  const today = new Date().toISOString().split('T')[0]
  let tracker = { date: today, spent: 0, spawns: [] }
  if (fs.existsSync(BUDGET_TRACKER_PATH)) {
    tracker = JSON.parse(fs.readFileSync(BUDGET_TRACKER_PATH, 'utf-8'))
    if (tracker.date !== today) {
      tracker = { date: today, spent: 0, spawns: [] }
      fs.writeFileSync(BUDGET_TRACKER_PATH, JSON.stringify(tracker, null, 2))
    }
  }
  return {
    spent: tracker.spent,
    remaining: BUDGET_DAILY_LIMIT - tracker.spent,
    spawns: tracker.spawns || []
  }
}

/**
 * Append a spawn record to the daily budget tracker.
 */
function recordSpawn(task) {
  const today = new Date().toISOString().split('T')[0]
  let tracker = { date: today, spent: 0, spawns: [] }
  if (fs.existsSync(BUDGET_TRACKER_PATH)) {
    tracker = JSON.parse(fs.readFileSync(BUDGET_TRACKER_PATH, 'utf-8'))
    if (tracker.date !== today) {
      tracker = { date: today, spent: 0, spawns: [] }
    }
  }
  tracker.spent += task.estimated_cost_usd ?? estimateCost(task.model, task.estimated_hours)
  tracker.spawns.push({
    taskId: task.id,
    task: task.title,
    agentId: task.agent_id,
    model: task.model,
    estimatedCost: task.estimated_cost_usd,
    time: new Date().toISOString()
  })
  fs.writeFileSync(BUDGET_TRACKER_PATH, JSON.stringify(tracker, null, 2))
}

// ── Spawn queue ──────────────────────────────────────────────────────────────

/**
 * Append a task to spawn-queue.json for spawn-consumer to pick up.
 */
function queueForSpawn(task) {
  const queuePath = path.join(__dirname, 'spawn-queue.json')
  let queue = []
  if (fs.existsSync(queuePath)) {
    queue = JSON.parse(fs.readFileSync(queuePath, 'utf-8'))
  }
  queue.push({
    taskId: task.id,
    title: task.title,
    agentId: task.agent_id,
    model: task.model || 'kimi',
    queuedAt: new Date().toISOString()
  })
  fs.writeFileSync(queuePath, JSON.stringify(queue, null, 2))
}

// ── Workflow chaining ────────────────────────────────────────────────────────

/**
 * After a task completes, create the follow-up task for the next workflow step.
 * Handles shippable milestones and UC completion.
 *
 * @param {object} store   - TaskStore instance
 * @param {object} task    - The completed task row
 * @param {string} projectId - e.g. 'bo2026'
 */
async function chainTask(store, task, projectId) {
  if (!task.use_case_id || !store.supabase) return

  const { data: uc } = await store.supabase
    .from('use_cases').select('workflow, name, shippable_after_step')
    .eq('id', task.use_case_id).single()
  if (!uc?.workflow) return

  const currentIdx = uc.workflow.indexOf(task.agent_id)
  if (currentIdx === -1) return

  // Check shippability milestone
  if (uc.shippable_after_step != null && currentIdx >= uc.shippable_after_step) {
    await store.supabase.from('metrics').insert({
      project_id: projectId, domain: 'product', metric_type: 'shippable_milestone',
      data: { use_case_id: task.use_case_id, name: uc.name, step: currentIdx }
    })
  }

  if (currentIdx === uc.workflow.length - 1) {
    // Last step — mark UC complete
    await store.supabase.from('use_cases')
      .update({ implementation_status: 'complete', updated_at: new Date().toISOString() })
      .eq('id', task.use_case_id)
    return 'uc_complete'
  }

  const nextAgent = uc.workflow[currentIdx + 1]
  const label = AGENT_LABELS[nextAgent] || nextAgent

  // Query completed work to inject advisory context
  let relatedWork = []
  try {
    relatedWork = await store.getRelatedCompletedWork(task.use_case_id, task.tags || [])
  } catch (err) {
    console.warn(`   ⚠️ Completed work query failed (non-fatal): ${err.message}`)
  }

  let description = `Continue ${task.use_case_id}. Prior step by ${task.agent_id} (task ${task.id}).`
  if (relatedWork.length > 0) {
    description += `\n\n## Already Completed Work for ${task.use_case_id}\n`
    description += `Do NOT re-implement these:\n`
    for (const cw of relatedWork.slice(0, 10)) {
      description += `- ${cw.name} [${cw.category || cw.agent || cw.source}]\n`
    }
  }

  const taskMetadata = {
    created_by: 'orchestrator', chain_from: task.id,
    workflow_step: currentIdx + 1, workflow_total: uc.workflow.length
  }
  if (relatedWork.length > 0) {
    taskMetadata.completed_work_count = relatedWork.length
    taskMetadata.completed_work_names = relatedWork.map(c => c.name).slice(0, 10)
  }

  const model = task.model || 'qwen3.5'
  await store.createTask({
    title: `${label}: ${task.use_case_id} - ${uc.name}`,
    agent_id: nextAgent, status: 'ready', model,
    priority: task.priority, parent_task_id: task.id,
    use_case_id: task.use_case_id, prd_id: task.prd_id,
    branch_name: nextAgent === 'qc' ? task.branch_name : null,
    pr_number: nextAgent === 'qc' ? task.pr_number : null,
    estimated_cost_usd: estimateCost(model, task.estimated_hours || 1),
    tags: [nextAgent === 'qc' ? 'test' : 'feature'],
    description,
    metadata: taskMetadata
  })

  return `chained:${task.agent_id}->${nextAgent}`
}

// ── Spawn preparation ────────────────────────────────────────────────────────

/**
 * Validate a ready task, apply learning recommendations, mark in_progress,
 * record in budget tracker, and queue for spawn.
 *
 * Returns null if the task should be skipped.
 *
 * @param {object} store   - TaskStore instance
 * @param {object} learner - LearningSystem instance
 * @param {object} task    - The ready task row
 * @param {object} budget  - Current budget object (mutated: remaining decremented)
 * @param {Set}    alreadySpawnedIds - Set of taskIds already spawned today
 * @returns {object|null}  spawn record {taskId, title, agent, model} or null
 */
async function prepareAndQueueSpawn(store, learner, task, budget, alreadySpawnedIds) {
  const { recordDecision, DECISION_TYPES } = require('./orchestrator-decision-tracker')

  // Skip tasks whose UC is already complete (stale tasks)
  if (task.use_case_id && store.supabase) {
    try {
      const { data: uc } = await store.supabase
        .from('use_cases').select('implementation_status').eq('id', task.use_case_id).single()
      if (uc?.implementation_status === 'complete') {
        console.log(`   ⏭️ Skipping ${task.title} — ${task.use_case_id} already complete`)
        await store.updateTask(task.id, { status: 'done', completed_at: new Date().toISOString(), last_error: 'UC already complete' })
        return null
      }
    } catch {}
  }

  // Dedup: skip if already spawned today (but allow retries)
  if (alreadySpawnedIds && alreadySpawnedIds.has(task.id) && (task.retry_count || 0) === 0) {
    console.log(`   ⏭️ Skipping ${task.title} — already spawned today`)
    return null
  }

  // Retry-exhaustion: skip if retries maxed out
  const retryCount = task.retry_count || 0
  const maxRetries = task.max_retries || 3
  if (retryCount >= maxRetries) {
    console.log(`   ⏭️ Skipping ${task.title} — retries exhausted (${retryCount}/${maxRetries})`)
    await store.updateTask(task.id, {
      status: 'failed',
      last_error: 'Max retries exhausted at spawn time'
    })
    return null
  }

  if (task.estimated_cost_usd > budget.remaining) {
    console.log(`   ⚠️ Skipping ${task.title} — over budget`)
    return null
  }

  // Guard: skip tasks with no agent_id (spawn-consumer will reject them anyway)
  if (!task.agent_id) {
    console.log(`   ⚠️ Skipping ${task.title} — no agent_id assigned`)
    return null
  }

  // Cross-loop learning: check if this task type has recommendations
  try {
    const recs = learner.getRecommendations(task)
    const modelRec = recs?.find(r => r.type === 'model')
    if (modelRec?.recommendedModel && modelRec.recommendedModel !== task.model) {
      console.log(`   📊 Learning applied: ${task.model}→${modelRec.recommendedModel} for ${task.agent_id}`)
      task.model = modelRec.recommendedModel
      await store.updateTask(task.id, { model: task.model })
    }
  } catch {}  // learning system may not have enough data yet

  console.log(`   🚀 Spawning ${task.agent_id} agent for: ${task.title}`)
  recordDecision({
    decision_type: DECISION_TYPES.SPAWN_TIMING,
    task_id: task.id,
    chosen_model: task.model || 'qwen3.5',
    agent_id: task.agent_id,
    context: { budget_remaining: budget.remaining }
  })

  await store.updateTask(task.id, {
    status: 'in_progress',
    started_at: new Date().toISOString()
  })

  recordSpawn(task)
  budget.remaining -= (task.estimated_cost_usd ?? estimateCost(task.model, task.estimated_hours))

  queueForSpawn(task)

  return {
    taskId: task.id,
    title: task.title,
    agent: task.agent_id,
    model: task.model
  }
}

// ── Completion verification ──────────────────────────────────────────────

/**
 * Verify that a dev/design task actually produced commits on its branch.
 * Non-blocking: defaults to verified=true if git fails or task isn't dev/design.
 *
 * @param {object} task - Task row with agent_id and branch_name
 * @returns {{ verified: boolean, reason?: string, commits?: number }}
 */
function verifyTaskOutput(task) {
  if (!['dev', 'design'].includes(task.agent_id)) return { verified: true }

  const branch = task.branch_name
  const isSmokeTask = task.tags?.includes?.('smoke-test')

  // Branch-based tasks: check for commits on the branch
  if (branch) {
    try {
      const commits = execSync(
        `git log --oneline main..${branch} 2>/dev/null | head -5`,
        { cwd: __dirname, encoding: 'utf-8', timeout: 5000 }
      ).trim()
      if (!commits) return { verified: false, reason: 'no commits on branch' }
      return { verified: true, commits: commits.split('\n').length }
    } catch {
      return { verified: true, reason: 'git check failed (non-blocking)' }
    }
  }

  // Smoke-test fix tasks (no branch): check for recent commits on HEAD
  // or uncommitted changes that indicate the agent did something
  if (isSmokeTask) {
    try {
      const spawnedAt = task.spawn_config?.spawnedAt || task.updated_at
      if (!spawnedAt) return { verified: true, reason: 'no spawn timestamp' }

      // Check for commits since the task was spawned
      const commits = execSync(
        `git log --oneline --since="${spawnedAt}" HEAD 2>/dev/null | head -5`,
        { cwd: __dirname, encoding: 'utf-8', timeout: 5000 }
      ).trim()
      if (commits) return { verified: true, commits: commits.split('\n').length }

      // Check for uncommitted changes
      const diff = execSync(
        `git diff --stat HEAD 2>/dev/null`,
        { cwd: __dirname, encoding: 'utf-8', timeout: 5000 }
      ).trim()
      if (diff) return { verified: true, reason: 'uncommitted changes detected' }

      return { verified: false, reason: 'no code changes (no commits or diffs since spawn)' }
    } catch {
      return { verified: true, reason: 'git check failed (non-blocking)' }
    }
  }

  // No branch, not a smoke task — pass through
  return { verified: true, reason: 'no branch assigned' }
}

// ── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  // Constants
  AGENT_LABELS,
  BUDGET_DAILY_LIMIT,
  BUDGET_MIN_FOR_SPAWN,
  BUDGET_TRACKER_PATH,
  COMPLETION_MARKERS,
  MODEL_COSTS,
  // Functions
  readLogTail,
  checkBudget,
  estimateCost,
  recordSpawn,
  queueForSpawn,
  chainTask,
  prepareAndQueueSpawn,
  verifyTaskOutput
}
