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

// Per-token pricing by model (USD per 1M tokens).
// Qwen runs locally on MLX = free. Kimi/Haiku/Sonnet/Opus via API.
const MODEL_TOKEN_COSTS = _cfg.budget.model_token_costs || {}
// Estimated tokens per agent role (input + output per session).
const TOKEN_ESTIMATES = _cfg.budget.token_estimates || {}
// Legacy flat-rate fallback (kept for backward compat if config not updated)
const MODEL_COSTS = _cfg.budget.model_costs || {}

// ── Model ladder ────────────────────────────────────────────────────────────
// Canonical escalation order: cheapest → most capable.
// Used by selectInitialModel(), escalateModel(), and the learning system.
const MODEL_LADDER = ['qwen3.5', 'kimi', 'haiku', 'sonnet', 'opus']

/**
 * Resolve a model name to its index in MODEL_LADDER.
 * Handles variants like 'kimi2.5', 'qwen3.5-32b', 'claude-3-sonnet', etc.
 * Returns -1 if unrecognized.
 */
function modelLadderIndex(model) {
  if (!model) return -1
  const idx = MODEL_LADDER.indexOf(model)
  if (idx >= 0) return idx
  const lower = model.toLowerCase()
  if (lower.includes('qwen')) return 0
  if (lower.includes('kimi')) return 1
  if (lower.includes('haiku')) return 2
  if (lower.includes('sonnet')) return 3
  if (lower.includes('opus')) return 4
  return -1
}

/**
 * Escalate to the next model on the ladder.
 * @param {string} currentModel - current model name
 * @returns {string} next model (or same if already at top)
 */
function escalateModel(currentModel) {
  const idx = modelLadderIndex(currentModel)
  if (idx >= 0 && idx < MODEL_LADDER.length - 1) return MODEL_LADDER[idx + 1]
  if (idx === MODEL_LADDER.length - 1) return currentModel // already at opus
  return 'sonnet' // unknown model → sonnet (safe middle ground)
}

// ── Complexity-aware initial model selection ─────────────────────────────────

// Keywords in UC name/description that signal higher complexity
const COMPLEXITY_HIGH = ['journey', 'full user', 'end-to-end', 'e2e', 'architecture',
  'migration', 'compliance', 'security', 'multi-product', 'cross-product']
const COMPLEXITY_MEDIUM = ['auth', 'authentication', 'login', 'signup', 'billing',
  'subscription', 'payment', 'stripe', 'integration', 'webhook', 'api',
  'onboarding', 'conversion', 'funnel', 'cal.com', 'twilio', 'sms']

/**
 * Select the initial model for a task based on agent role and UC complexity.
 *
 * Scores complexity from UC name keywords, priority, revenue_impact,
 * workflow length, and dependency count. Returns the cheapest model
 * that can handle the task's complexity.
 *
 * Score → PM model:  0-2 qwen3.5 | 3-4 kimi | 5+ sonnet
 * Score → dev model:  0-3 qwen3.5 | 4-5 kimi | 6+ haiku
 * Other agents:       qwen3.5 (inherit from chained PM model in practice)
 *
 * @param {string} agentId - e.g. 'product', 'dev', 'qc'
 * @param {object} [uc]    - UC metadata { name, description, priority, revenue_impact, workflow, depends_on }
 * @returns {string} model name from MODEL_LADDER
 */
function selectInitialModel(agentId, uc = {}) {
  const text = ((uc.name || '') + ' ' + (uc.description || '')).toLowerCase()

  let score = 0

  // Keyword signals (take best match from each tier, not cumulative within tier)
  if (COMPLEXITY_HIGH.some(kw => text.includes(kw))) score += 3
  if (COMPLEXITY_MEDIUM.some(kw => text.includes(kw))) score += 2

  // UC metadata signals
  if (uc.priority === 1) score += 2
  else if (uc.priority === 2) score += 1

  if (uc.revenue_impact === 'high') score += 2
  else if (uc.revenue_impact === 'medium') score += 1

  if ((uc.workflow || []).length >= 4) score += 1
  if ((uc.depends_on || []).length >= 2) score += 1

  // PM needs strong reasoning for complex specs
  if (agentId === 'product') {
    if (score >= 5) return 'sonnet'
    if (score >= 3) return 'kimi'
    return 'qwen3.5'
  }

  // Dev/design: slightly higher threshold (they execute, PM already reasoned)
  if (agentId === 'dev' || agentId === 'design') {
    if (score >= 6) return 'haiku'
    if (score >= 4) return 'kimi'
    return 'qwen3.5'
  }

  // QC, analytics, marketing: default to cheap, inherit via chaining
  return 'qwen3.5'
}

/**
 * Estimate task cost based on model and agent role using per-token pricing.
 * Applies learned cost adjustment from historical task durations if available.
 * Falls back to legacy flat hourly rate if token config is unavailable.
 *
 * @param {string} model   - e.g. 'qwen3.5', 'sonnet', 'kimi'
 * @param {number|string} [hoursOrAgentId=1] - estimated hours (legacy) or agent_id for token estimation
 * @returns {number} estimated cost in USD
 */
function estimateCost(model, hoursOrAgentId) {
  const modelKey = Object.keys(MODEL_TOKEN_COSTS).find(k => (model || '').toLowerCase().includes(k))
  const tokenCost = MODEL_TOKEN_COSTS[modelKey]

  // Token-based estimation (preferred)
  if (tokenCost && (tokenCost.input_per_1m != null)) {
    const agentId = typeof hoursOrAgentId === 'string' ? hoursOrAgentId : null
    const tokens = TOKEN_ESTIMATES[agentId] || TOKEN_ESTIMATES.default || { input: 100000, output: 20000 }
    const inputCost = (tokens.input / 1_000_000) * tokenCost.input_per_1m
    const outputCost = (tokens.output / 1_000_000) * tokenCost.output_per_1m
    let baseCost = inputCost + outputCost

    // Apply learned cost adjustment from historical duration data
    if (agentId) {
      try {
        const { LearningSystem } = require('./learning-system')
        const learner = new LearningSystem()
        const adjustment = learner.getCostAdjustment(model, agentId)
        baseCost *= adjustment
      } catch {} // Learning system may not be available
    }

    return Math.round(baseCost * 100) / 100
  }

  // Legacy flat-rate fallback
  const legacyKey = Object.keys(MODEL_COSTS).find(k => (model || '').toLowerCase().includes(k))
  const hours = typeof hoursOrAgentId === 'number' ? hoursOrAgentId : 1
  return (MODEL_COSTS[legacyKey] ?? 1.00) * hours
}

const COMPLETION_MARKERS = [
  'Task Complete', 'IMPLEMENTATION COMPLETE', 'PRODUCTION READY',
  'MIGRATION READY', 'Status: COMPLETE', 'TASK COMPLETE',
  'TASK COMPLETED', 'READY FOR INTEGRATION TESTING',
  'phase complete', 'ready for implementation',
  '\u2705 COMPLETE',  // ✅ COMPLETE — common agent output with emoji
  'STEP SKIPPED'  // Agent determined their role isn't needed for this UC
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

/**
 * Read an entire log file for completion marker detection.
 * Agent outputs are typically <10KB so reading the full file is cheap.
 * This avoids the bug where readLogTail's maxLines cuts off markers
 * that appear early in output (e.g., "Task Complete" on line 3 of 76).
 */
function readLogFull(filePath, maxBytes = 65536) {
  try {
    if (!fs.existsSync(filePath)) return ''
    const stat = fs.statSync(filePath)
    if (stat.size === 0) return ''
    const readSize = Math.min(stat.size, maxBytes)
    const fd = fs.openSync(filePath, 'r')
    const buf = Buffer.alloc(readSize)
    fs.readSync(fd, buf, 0, readSize, 0)
    fs.closeSync(fd)
    return buf.toString('utf-8')
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
 * Always computes cost from current model (not stored estimated_cost_usd)
 * because the learning system may have changed the model after task creation.
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
  // Always compute from current model — estimated_cost_usd may be stale
  // if the learning system changed the model after task creation
  const actualCost = estimateCost(task.model, task.agent_id)
  tracker.spent += actualCost
  tracker.spawns.push({
    taskId: task.id,
    task: task.title,
    agentId: task.agent_id,
    model: task.model,
    estimatedCost: actualCost,
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
    .from('use_cases').select('workflow, name, description, shippable_after_step, priority, revenue_impact, depends_on')
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
    // Bridge QC completion → PR approval
    if (task.pr_number && store.supabase) {
      await store.supabase
        .from('code_reviews')
        .update({
          status: 'approved',
          reviewer_agent: task.agent_id,
          review_notes: { approved_by: 'qc_workflow', task_id: task.id },
          updated_at: new Date().toISOString()
        })
        .eq('pr_number', task.pr_number)
        .eq('project_id', projectId)
        .eq('status', 'pending')
    }

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

  // Role-aware description from shared buildRoleContext
  const roleCtx = buildRoleContext(nextAgent, uc.name, '', {
    workflowStep: currentIdx + 1, workflowTotal: uc.workflow.length
  })
  let description = `${roleCtx.description}\n\nPrior step by ${task.agent_id} (task ${task.id}).`
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

  // Inherit model from parent, but floor at UC complexity level
  // (prevents a stale qwen3.5 PM task from chaining qwen3.5 to dev on a complex UC)
  const inherited = task.model || 'qwen3.5'
  const complexityFloor = selectInitialModel(nextAgent, uc)
  const model = modelLadderIndex(inherited) >= modelLadderIndex(complexityFloor) ? inherited : complexityFloor

  await store.createTask({
    title: `${label}: ${task.use_case_id} - ${uc.name}`,
    agent_id: nextAgent, status: 'ready', model,
    priority: task.priority, parent_task_id: task.id,
    use_case_id: task.use_case_id, prd_id: task.prd_id,
    branch_name: nextAgent === 'qc' ? task.branch_name : null,
    pr_number: nextAgent === 'qc' ? task.pr_number : null,
    estimated_cost_usd: estimateCost(model, nextAgent),
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

  // Dedup: skip if already spawned today
  if (alreadySpawnedIds && alreadySpawnedIds.has(task.id)) {
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

  const spawnCost = estimateCost(task.model, task.agent_id)
  if (spawnCost > budget.remaining) {
    console.log(`   ⚠️ Skipping ${task.title} — over budget ($${spawnCost.toFixed(2)} > $${budget.remaining.toFixed(2)})`)
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
      task.estimated_cost_usd = estimateCost(task.model, task.agent_id)
      await store.updateTask(task.id, { model: task.model, estimated_cost_usd: task.estimated_cost_usd })
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
  budget.remaining -= estimateCost(task.model, task.agent_id)

  // Track in dedup set so same heartbeat batch doesn't double-spawn
  if (alreadySpawnedIds) alreadySpawnedIds.add(task.id)

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

// ── Role directives (single source of truth) ─────────────────────────────────

/**
 * Build a role-aware task description and spawn-message role section for an agent.
 *
 * @param {string} agentId     - e.g. 'product', 'marketing', 'dev'
 * @param {string} ucName      - UC display name, e.g. 'Landing Page'
 * @param {string} ucDesc      - UC description from Supabase
 * @param {object} [opts]      - { workflow, workflowStep, workflowTotal, remainingAgents }
 * @returns {{ description: string, spawnRole: string }}
 */
function buildRoleContext(agentId, ucName, ucDesc, opts = {}) {
  const step = opts.workflowStep != null ? opts.workflowStep + 1 : 1
  const total = opts.workflowTotal || '?'
  const remaining = opts.remainingAgents || ''

  // Product-review variant: PM conducts a structured product review instead of writing a PRD
  const isProductReview = opts.taskType === 'product-review'

  const ROLES = {
    product: isProductReview ? {
      directive: `Conduct a product review for: ${ucName}.`,
      deliverable: `Your deliverable is a PRODUCT REVIEW — walkthrough results, findings, decisions needed, and a verdict.`,
      spawnRole: [
        `## YOUR ROLE: Product Manager (Product Review)`,
        `You are conducting a structured product review. Your job is to evaluate whether the assembled product works as a cohesive whole.`,
        ``,
        `### What to do:`,
        `1. Walk through each URL in the walkthrough_spec (open it, test the user journey)`,
        `2. Test end-to-end flows: signup → onboarding → dashboard → settings → billing`,
        `3. Check cross-product navigation: can users move between components seamlessly?`,
        `4. Verify data flow: does data entered in one component appear correctly in others?`,
        ``,
        `### What to look for:`,
        `- **Auth flow**: Is there login/signup? Does it protect routes? Do sessions persist?`,
        `- **Navigation continuity**: Can users reach all features from the main UI?`,
        `- **Data flow**: Do forms save? Does data persist across page refreshes?`,
        `- **Pricing consistency**: Do displayed prices match Stripe config?`,
        `- **Error states**: What happens on network errors, invalid input, expired sessions?`,
        `- **Mobile responsiveness**: Do pages work on mobile viewports?`,
        ``,
        `### Severity guide:`,
        `- **critical**: Product is unusable (broken auth, data loss, crashes)`,
        `- **high**: Major feature gap (missing navigation, broken integration)`,
        `- **medium**: Degraded experience (layout issues, confusing UX)`,
        `- **low**: Polish (typos, alignment, minor styling)`,
        ``,
        `### Decisions:`,
        `When you find an issue that requires an architectural choice (not just a bug fix), create a decision:`,
        `- **blocking=true** for: auth architecture, pricing strategy, deployment topology, compliance, external service choices`,
        `- **blocking=false** for: CSS framework, test tooling, component library, file structure, naming conventions`,
        ``,
        `### How to submit:`,
        `Update the \`product_reviews\` row in Supabase with:`,
        `- \`walkthrough_spec\`: update each step with actual_behavior and status (pass/fail/partial)`,
        `- \`findings\`: array of {type, severity, summary, details, affected_uc_ids[], suggested_fix}`,
        `- \`decisions_needed\`: array of {summary, category, options[], recommended, reason, blocking}`,
        `- \`verdict\`: pass | pass_with_issues | fail`,
        `- \`readiness_score\`: 0-100 (0=completely broken, 100=production ready)`,
        `- \`summary\`: one-paragraph executive summary`,
        `- \`status\`: 'completed'`,
        `- \`completed_at\`: current timestamp`,
        ``,
        `When done, write a completion report with your verdict and key findings.`
      ].join('\n')
    } : {
      directive: `Write a PRD for: ${ucName}.`,
      deliverable: `Your deliverable is a SPECIFICATION (requirements, user stories, acceptance criteria) — not implementation.${remaining ? `\nThe next agents in the workflow (${remaining}) will implement it.` : ''}`,
      spawnRole: [
        `## YOUR ROLE: Product Manager (Specification Only)`,
        `You are the PM. You write SPECS, not code. Your SOUL.md says "You don't write code" — that applies here.`,
        `Your deliverable for this task is a PRD / SPECIFICATION:`,
        `1. Write or update the PRD (requirements, user stories, acceptance criteria)`,
        `2. Define E2E test specs in Supabase \`e2e_test_specs\` table`,
        `3. Update the \`use_cases\` table with acceptance criteria if needed`,
        `4. DO NOT write code, build UI, create HTML/CSS/JS, or implement features`,
        `5. DO NOT create files in product/ directories — that's for dev/design agents`,
        `When you finish your spec work, write a completion report. The orchestrator will chain to the next agent in the workflow.`
      ].join('\n')
    },
    marketing: {
      directive: `Write marketing copy and content strategy for: ${ucName}.`,
      deliverable: `Your deliverable is COPY and CONTENT BRIEFS — not code or pages. Define what the design/dev teams should build.`,
      spawnRole: [
        `## YOUR ROLE: Marketing (Content Strategy Only)`,
        `Your deliverable is CONTENT STRATEGY and COPY:`,
        `1. Write marketing copy, messaging, positioning, content briefs`,
        `2. Define content requirements for design/dev to implement`,
        `3. DO NOT build pages, write HTML/CSS/JS, or implement features`,
        `When done, write a completion report. The orchestrator chains to the next agent.`
      ].join('\n')
    },
    analytics: {
      directive: `Analyze and recommend for: ${ucName}.`,
      deliverable: `Your deliverable is ANALYSIS and RECOMMENDATIONS — not implementation.`,
      spawnRole: [
        `## YOUR ROLE: Analytics (Analysis Only)`,
        `Your deliverable is ANALYSIS and RECOMMENDATIONS:`,
        `1. Analyze data, identify patterns, produce actionable insights`,
        `2. Write recommendations for other agents to act on`,
        `3. DO NOT implement changes — recommend them`,
        `When done, write a completion report. The orchestrator chains to the next agent.`
      ].join('\n')
    },
    design: {
      directive: `Create design mockups / wireframes for: ${ucName}.`,
      deliverable: `Your deliverable is VISUAL DESIGN — layouts, component specs, and assets for dev to implement. Do not write production code.`,
      spawnRole: [
        `## YOUR ROLE: Design (Visual Design Only)`,
        `Your deliverable is DESIGN SPECS and MOCKUPS:`,
        `1. Create wireframes, mockups, or component specifications`,
        `2. Define visual hierarchy, layout, spacing, colors, typography`,
        `3. Provide design assets or detailed specs for dev to implement`,
        `4. DO NOT write production HTML/CSS/JS — describe what dev should build`,
        `When done, write a completion report. The orchestrator chains to the next agent.`
      ].join('\n')
    },
    dev: {
      directive: `Implement: ${ucName}.`,
      deliverable: `Build the feature based on the PRD, copy, and design specs from prior workflow steps.`,
      spawnRole: [
        `## YOUR ROLE: Developer (Implementation)`,
        `Your deliverable is WORKING CODE:`,
        `1. Implement the feature based on PRD and design specs from prior steps`,
        `2. Write tests for your implementation`,
        `3. Commit and push to your feature branch`,
        `When done, write a completion report. The orchestrator chains to QC.`
      ].join('\n')
    },
    qc: {
      directive: `Test and review: ${ucName}.`,
      deliverable: `Verify the implementation meets acceptance criteria from the PRD.`,
      spawnRole: [
        `## YOUR ROLE: QC (Quality Control)`,
        `Your deliverable is a REVIEW VERDICT:`,
        `1. Run tests — all must pass`,
        `2. Check code quality, security, and acceptance criteria`,
        `3. Approve or reject with a structured diagnosis`,
        `When done, write a completion report with your verdict.`
      ].join('\n')
    }
  }

  const role = ROLES[agentId] || {
    directive: `Continue work on: ${ucName}.`,
    deliverable: '',
    spawnRole: ''
  }

  const skipInstruction = `If this use case does not require your role (e.g., a bug fix doesn't need design, a copy change doesn't need dev), output "STEP SKIPPED: [reason]" and exit immediately. Do not do unnecessary work.`

  const description = [
    role.directive,
    ucDesc,
    '',
    role.deliverable,
    skipInstruction,
    `Workflow step ${step}/${total}.`
  ].filter(Boolean).join('\n')

  return { description, spawnRole: role.spawnRole }
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
  MODEL_TOKEN_COSTS,
  MODEL_LADDER,
  TOKEN_ESTIMATES,
  // Functions
  readLogTail,
  readLogFull,
  checkBudget,
  estimateCost,
  escalateModel,
  modelLadderIndex,
  selectInitialModel,
  recordSpawn,
  queueForSpawn,
  chainTask,
  prepareAndQueueSpawn,
  verifyTaskOutput,
  buildRoleContext
}
