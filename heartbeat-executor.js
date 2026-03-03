#!/usr/bin/env node
require('dotenv').config({ path: require('path').join(__dirname, '.env') })
/**
 * LeadFlow Orchestrator - Full Heartbeat Executor (4-Loop Architecture)
 *
 * Architecture docs: docs/4-LOOP-ARCHITECTURE.md
 * Heartbeat spec:    HEARTBEAT.md
 * Skills reference:  SKILLS.md
 *
 * Runs the complete orchestration loop every 5 minutes:
 *   1. queryState()              -- Read queue from Supabase
 *   2. detectZombieTasks()       -- PID-check in_progress tasks
 *   3. checkCompletions()        -- Process completion reports
 *   4. spawnAgents()             -- Cross-loop learning + budget check + spawn
 *   5. checkBlockers()           -- Check blocked tasks
 *  5b. runSelfHealChecks()       -- Self-heal (Loop 4)
 *  5c. runSmokeTests()           -- Verify live product health
 *  5d. checkBuildHealth()         -- Verify dashboard builds cleanly
 *   6. replenishQueue()          -- UC roadmap -> tasks (Loop 1)
 *  6b. processProductFeedback()  -- Feedback -> PM tasks (Loop 3)
 *  6c. checkPRReviews()          -- Merge/rework PRs (Loop 2)
 *   7. updateDashboard()         -- Regenerate dashboard
 *   8. reportToTelegram()        -- Telegram report (topic 10788)
 *   9. logHeartbeat()            -- Write to metrics table + log file
 *
 * Schema: supabase/migrations/004_project_hierarchy.sql
 * Tables used: tasks, use_cases, metrics, code_reviews, product_feedback
 */
const { TaskStore } = require('./task-store')
const generateDashboard = require('./generate-dashboard-complete')
const { generateProjectDocs } = require('./scripts/generate-project-docs')
const { autoDecompose } = require('./auto-decompose')
const { recordDecision, recordOutcome, DECISION_TYPES } = require('./orchestrator-decision-tracker')
const { LearningSystem } = require('./learning-system')
const { runHealthChecks, healIssue } = require('./self-heal')
const smokeTests = require('./smoke-tests')
const buildHealth = require('./build-health')
const {
  BUDGET_DAILY_LIMIT, BUDGET_MIN_FOR_SPAWN, BUDGET_TRACKER_PATH,
  checkBudget: wfCheckBudget, recordSpawn: wfRecordSpawn,
  queueForSpawn: wfQueueForSpawn, chainTask, prepareAndQueueSpawn,
  verifyTaskOutput, buildRoleContext, readLogFull
} = require('./workflow-engine')
const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')
const { getConfig, getDayNumber, getDashboardDir } = require('./project-config-loader')
// Constants
const HEARTBEAT_LOG_PATH = path.join(__dirname, 'ORCHESTRATOR-HEARTBEAT-LOG.md')
const MAX_SPAWNS_PER_HEARTBEAT = 2

/**
 * Read the last N lines (up to maxBytes) from a log file safely.
 * Returns empty string if file doesn't exist or can't be read.
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

class HeartbeatExecutor {
  constructor() {
    this.store = new TaskStore()
    this.learner = new LearningSystem()
    this.config = getConfig()
    this.projectId = this.config.project_id
    this.actions = []
    this.spawned = []
    this.completed = []
    this.errors = []
  }
  async run() {
    console.log('🫀 LeadFlow Orchestrator Heartbeat')
    console.log('====================================')
    try {
      // 0. CHECK GOAL STATE — set urgency mode based on goal trajectory
      await this.checkGoalState()
      // 1. QUERY Supabase for current state
      await this.queryState()
      // 2. DETECT zombie tasks (in_progress but no activity)
      await this.detectZombieTasks()
      // 3. CHECK for newly completed tasks
      await this.checkCompletions()
      // 4. SPAWN agents for ready tasks (budget check)
      await this.spawnAgents()
      // 5. CHECK blocked tasks
      await this.checkBlockers()
      // 5b. SELF-HEAL checks
      await this.runSelfHealChecks()
      // 5c. SMOKE TESTS — verify live product health
      await this.runSmokeTests()
      // 5c2. SYNC PRODUCT COMPONENTS — persist smoke results + product status to Supabase
      await this.syncProductComponents()
      // 5d. BUILD HEALTH — verify dashboard builds cleanly
      await this.checkBuildHealth()
      // 5e. REVENUE INTELLIGENCE — collect metrics, check goals (Loop 5)
      await this.collectRevenueIntelligence()
      // 5f. DISTRIBUTION HEALTH — detect traffic/conversion issues (Loop 6)
      await this.checkDistributionHealth()
      // 6. CHECK queue depth - create tasks if low (revenue-aware)
      await this.replenishQueue()
      // 6b. PROCESS product feedback
      await this.processProductFeedback()
      // 6c. CHECK PR reviews
      await this.checkPRReviews()
      // 6d. CLEANUP stale branches
      await this.cleanupStaleBranches()
      // 7. UPDATE dashboard
      await this.updateDashboard()
      // 8. REPORT to Telegram
      await this.reportToTelegram()
      // 9. LOG heartbeat
      await this.logHeartbeat()
      // Update heartbeat timestamp
      this.updateHeartbeatTimestamp()
      console.log('✅ Heartbeat complete')
    } catch (err) {
      console.error('❌ Heartbeat failed:', err.message)
      this.errors.push(err.message)
      await this.reportError(err)
    }
  }
  // ── Step 0: Goal-Driven Mode ──────────────────────────────────────────

  async checkGoalState() {
    console.log('0️⃣ Checking goal state...')
    try {
      if (!this.store.supabase) return

      const { data: goals } = await this.store.supabase
        .from('project_goals')
        .select('*')
        .eq('project_id', this.projectId)
        .eq('status', 'active')

      if (!goals || goals.length === 0) {
        this.urgencyMode = 'normal'
        return
      }

      // Determine urgency from worst-performing goal
      const trajectories = goals.map(g => g.trajectory).filter(Boolean)
      if (trajectories.includes('critical')) {
        this.urgencyMode = 'critical'
        console.log('   🔴 CRITICAL — goal critically behind, speed mode active')
      } else if (trajectories.includes('behind')) {
        this.urgencyMode = 'behind'
        console.log('   🟡 BEHIND — goal behind schedule, boosting revenue UCs')
      } else {
        this.urgencyMode = 'normal'
        console.log('   🟢 ON TRACK')
      }

      // In critical mode, try to switch optimizer to speed
      if (this.urgencyMode === 'critical') {
        try {
          const optimizer = require('./optimizer')
          optimizer.setMode('speed')
          this.actions.push('Optimizer: switched to speed mode (goal critical)')
        } catch {}
      }
    } catch (err) {
      console.warn('   ⚠️ Goal state check failed (non-fatal):', err.message)
      this.urgencyMode = 'normal'
    }
  }

  async queryState() {
    console.log('\n1️⃣ Querying task state...')
    try {
      const allTasks = await this.store.getTasks()
      this.status = {
        ready: allTasks.filter(t => t.status === 'ready').length,
        inProgress: allTasks.filter(t => t.status === 'in_progress').length,
        blocked: allTasks.filter(t => t.status === 'blocked').length,
        done: allTasks.filter(t => t.status === 'done').length,
        total: allTasks.length
      }
      this.readyTasks = allTasks.filter(t => t.status === 'ready').sort((a, b) => a.priority - b.priority)
      this.blockedTasks = allTasks.filter(t => t.status === 'blocked')
      this.inProgressTasks = allTasks.filter(t => t.status === 'in_progress')
      console.log(`   Ready: ${this.status.ready} | In Progress: ${this.status.inProgress} | Blocked: ${this.status.blocked} | Done: ${this.status.done}`)
      this.actions.push(`Queried state: ${JSON.stringify(this.status)}`)
    } catch (err) {
      console.error('   ⚠️ Failed to query state:', err.message)
      this.errors.push(`Query failed: ${err.message}`)
    }
  }
  async detectZombieTasks() {
    console.log('\n2️⃣ Checking for zombie tasks (PID-based)...')
    const inProgressTasks = await this.store.getTasks({ status: 'in_progress' })
    let zombieCount = 0

    for (const task of inProgressTasks) {
      const startedAt = new Date(task.started_at || task.created_at)
      const runtimeMinutes = (Date.now() - startedAt) / 60000
      const spawnConfig = task.spawn_config || null
      const pid = spawnConfig?.pid || null
      const retryCount = task.retry_count || 0
      const maxRetries = task.max_retries || 3

      // Hard cap: any task running > 120 min is dead regardless
      if (runtimeMinutes > 120) {
        console.log(`      ⏰ ${task.title} — hard cap (${Math.round(runtimeMinutes)}m)`)
        await this._handleZombie(task, retryCount, maxRetries, 'hard_cap')
        zombieCount++
        continue
      }

      // Check if PID is still alive
      let pidAlive = false
      if (pid) {
        try {
          process.kill(pid, 0) // Signal 0 = check existence only
          pidAlive = true
        } catch {
          pidAlive = false
        }
      }

      if (pidAlive) {
        // Process is running — update spawn_status to 'running' with last_seen_alive
        console.log(`      ✓ ${task.title} — PID ${pid} alive (${Math.round(runtimeMinutes)}m)`)
        const updatedConfig = { ...spawnConfig, spawn_status: 'running', last_seen_alive: new Date().toISOString() }
        await this.store.updateTask(task.id, { spawn_config: updatedConfig })
        continue
      }

      // PID is dead — check if agent actually completed by reading full stdout
      if (spawnConfig?.log_prefix) {
        const stdoutPath = `${spawnConfig.log_prefix}.stdout.log`
        const stdoutFull = readLogFull(stdoutPath)
        const { COMPLETION_MARKERS: completionMarkers } = require('./workflow-engine')
        const didComplete = completionMarkers.some(m => stdoutFull.includes(m))
        if (didComplete) {
          // Check if this was a skip (agent determined role not needed)
          const wasSkipped = /step skipped/i.test(stdoutFull)

          // Verify the agent actually produced commits (not just printed "COMPLETE")
          // Skip verification for skipped steps — they intentionally produce no output
          if (!wasSkipped) {
            const { verified, reason } = verifyTaskOutput(task)
            if (!verified) {
              console.log(`      ⚠️ ${task.title} — stdout says COMPLETE but ${reason}`)
              await this._handleZombie(task, retryCount, maxRetries, `false_completion: ${reason}`)
              try {
                this.learner.recordFailure(task, `false_completion: ${reason}`, retryCount)
                recordOutcome(task.id, 'incorrect')
              } catch {}
              zombieCount++
              continue
            }
          }

          const completionType = wasSkipped ? 'skipped' : 'completed'
          console.log(`      ✅ ${task.title} — PID ${pid} exited, stdout shows ${completionType.toUpperCase()}`)
          // Write the completion JSON that the agent failed to write
          try {
            const { writeCompletionReport } = require('./subagent-completion-report')
            writeCompletionReport({
              taskId: task.id,
              status: completionType,
              testResults: { passed: 1, total: 1, passRate: 1 },
              filesCreated: [], filesModified: [],
              completionReportPath: null,
              metadata: { detectedBy: 'heartbeat-zombie-scan', skipped: wasSkipped, detectedAt: new Date().toISOString() }
            })
          } catch {}
          await this.store.updateTask(task.id, {
            status: 'done',
            completed_at: new Date().toISOString(),
            spawn_config: { ...spawnConfig, spawn_status: completionType },
            last_error: null
          })
          this.completed.push({ id: task.id, title: task.title, agent: task.agent_id || '-' })
          this.actions.push(`${wasSkipped ? 'Skipped' : 'Completed'} (via stdout): ${task.title}`)
          await this.createFollowUpTasks(task)
          continue
        }
      }

      // PID is dead (or no PID stored)
      // Instant-crash detection: if PID died in <2 min, check stderr for fatal errors
      if (pid && runtimeMinutes < 2) {
        const stderrExcerpt = spawnConfig?.log_prefix
          ? readLogTail(`${spawnConfig.log_prefix}.stderr.log`, 30, 4096)
          : ''
        const FATAL_PATTERNS = ['Unknown agent id', 'ENOENT', 'spawn EACCES', 'Module not found', 'Cannot find module']
        if (FATAL_PATTERNS.some(p => stderrExcerpt.includes(p))) {
          console.log(`      💀 ${task.title} — instant crash: fatal error`)
          await this._handleZombie(task, retryCount, maxRetries, `instant crash after ${Math.round(runtimeMinutes)}m`)
          zombieCount++
          continue
        }
      }

      if (pid && runtimeMinutes < 15) {
        // Died very recently — too early to call zombie, may still be starting
        console.log(`      ⏳ ${task.title} — PID ${pid} gone but only ${Math.round(runtimeMinutes)}m, waiting`)
        continue
      }

      if (!pid && runtimeMinutes < 60) {
        // Legacy task (no PID stored), give it the old 60-min threshold
        continue
      }

      // It's a zombie
      const reason = pid ? `PID ${pid} dead after ${Math.round(runtimeMinutes)}m` : `legacy, no PID, ${Math.round(runtimeMinutes)}m`
      console.log(`      🧟 ${task.title} — ${reason}`)
      await this._handleZombie(task, retryCount, maxRetries, reason)
      zombieCount++
    }

    if (zombieCount === 0) {
      console.log('   No zombie tasks detected')
    } else {
      console.log(`   🧟 Handled ${zombieCount} zombie task(s)`)
    }
  }

  async _handleZombie(task, retryCount, maxRetries, reason) {
    // Try to read stderr log for diagnostic info
    const spawnConfig = task.spawn_config || {}
    let stderrExcerpt = ''
    if (spawnConfig.log_prefix) {
      const stderrPath = `${spawnConfig.log_prefix}.stderr.log`
      stderrExcerpt = readLogTail(stderrPath, 30, 4096)
    }

    const errorDetail = stderrExcerpt
      ? `Zombie detected: ${reason}\n--- stderr tail ---\n${stderrExcerpt}`
      : `Zombie detected: ${reason}`
    // Truncate to 2000 chars for DB storage
    const truncatedError = errorDetail.length > 2000 ? errorDetail.slice(-2000) : errorDetail

    // Instant-fail detection: if stderr contains a known fatal error pattern,
    // skip retries and mark as failed immediately. Also feed into learning system.
    const FATAL_PATTERNS = ['Unknown agent id', 'ENOENT', 'spawn EACCES', 'Module not found', 'Cannot find module']
    const matchedPattern = FATAL_PATTERNS.find(p => stderrExcerpt.includes(p))
    const runtimeMinutes = (Date.now() - new Date(task.started_at || task.created_at)) / 60000
    if (matchedPattern && runtimeMinutes < 2) {
      await this.store.updateTask(task.id, {
        status: 'failed',
        completed_at: new Date().toISOString(),
        spawn_config: { ...spawnConfig, spawn_status: 'fatal_error', died_at: new Date().toISOString() },
        last_error: `Fatal (non-retryable): ${truncatedError}`
      })
      this.actions.push(`Fatal error: ${task.title} — ${matchedPattern}`)
      try { this.learner.recordFailure(task, stderrExcerpt, retryCount) } catch {}
      return
    }

    if (retryCount < maxRetries) {
      // Preserve log_prefix in spawn_config for future reference, update status
      const zombieConfig = { ...spawnConfig, spawn_status: 'zombie', died_at: new Date().toISOString() }
      await this.store.updateTask(task.id, {
        status: 'ready',
        retry_count: retryCount + 1,
        spawn_config: zombieConfig,
        session_key: null,
        last_error: `${truncatedError} (retry ${retryCount + 1}/${maxRetries})`
      })
      this.actions.push(`Reset zombie: ${task.title} (retry ${retryCount + 1}/${maxRetries})`)
    } else {
      // Max retries exhausted — mark as failed to stop the loop
      const failedConfig = { ...spawnConfig, spawn_status: 'failed', died_at: new Date().toISOString() }
      await this.store.updateTask(task.id, {
        status: 'failed',
        spawn_config: failedConfig,
        last_error: `Max retries (${maxRetries}) exhausted: ${truncatedError}`,
        completed_at: new Date().toISOString()
      })
      this.actions.push(`Failed zombie: ${task.title} (${maxRetries} retries exhausted)`)
    }
  }
  async checkCompletions() {
    console.log('\n3️⃣ Checking for newly completed tasks (completion-reports)...')
    const { getUnprocessedReports, markReportProcessed } = require('./subagent-completion-report')

    try {
      const reports = getUnprocessedReports()

      if (reports.length === 0) {
        console.log('   No new completions')
        return
      }

      for (const report of reports) {
        const { taskId, status, testResults, _filepath } = report
        console.log(`   📄 Report: ${taskId} — ${status}`)

        // Look up task for title/agent
        let taskInfo = null
        try { taskInfo = await this.store.getTask(taskId) } catch {}

        if (status === 'completed') {
          const allPassed = testResults && testResults.passRate >= 1
          if (allPassed) {
            console.log(`   ✓ All tests passed`)
            await this.handleTaskSuccess(taskId)
          } else if (testResults && testResults.total > 0) {
            console.log(`   ⚠️ Tests: ${testResults.passed}/${testResults.total} passed`)
            await this.handleTaskSuccess(taskId) // Still mark done, tests are partial
          } else {
            await this.handleTaskSuccess(taskId)
          }
          this.completed.push({ id: taskId, title: taskInfo?.title || taskId, agent: taskInfo?.agent_id || '-' })
        } else if (status === 'failed') {
          console.log(`   ❌ Task failed: ${report.error || 'unknown'}`)
          await this.handleTestFailure(taskId, {
            allPassed: false,
            error: report.error,
            retryRecommendation: report.retryRecommendation,
            diagnosis: report.diagnosis || null
          })
          this.completed.push({ id: taskId, title: taskInfo?.title || taskId, agent: taskInfo?.agent_id || '-' })
        }

        // Mark report as processed
        markReportProcessed(_filepath, 'orchestrator-heartbeat')
      }
    } catch (err) {
      console.warn('   ⚠️ Could not process completion reports:', err.message)
    }
  }
  async handleTaskSuccess(taskId) {
    // Mark task as done and unblock dependents
    try {
      const task = await this.store.getTask(taskId)
      await this.store.updateTask(taskId, { status: 'done', completed_at: new Date().toISOString() })
      this.actions.push(`Marked ${taskId} as done`)

      // Record learning and decision outcome
      if (task) {
        this.learner.recordSuccess(task)
        recordOutcome(taskId, 'correct')
      }

      // Create PR for dev/design tasks with a branch (bridges dev completion → QC review)
      if (task && ['dev', 'design'].includes(task.agent_id) && task.branch_name) {
        const prNumber = await this.createPRForTask(task)
        if (prNumber) {
          task.pr_number = prNumber
          this.actions.push(`Created PR #${prNumber} for ${task.branch_name}`)
        }
      }

      // Chain to next workflow step
      if (task) await this.createFollowUpTasks(task)

      // Check for unblocked tasks
      const unblocked = await this.store.checkUnblockedTasks(taskId)
      if (unblocked && unblocked.length > 0) {
        console.log(`   🔄 Unblocked ${unblocked.length} dependent tasks`)
        this.actions.push(`Unblocked ${unblocked.length} tasks`)
      }
    } catch (err) {
      console.error(`   ⚠️ Failed to handle success for ${taskId}:`, err.message)
    }
  }
  async handleTestFailure(taskId, testResults) {
    // Decision framework from HEARTBEAT.md
    const task = await this.store.getTask(taskId)
    if (!task) return
    const failureCount = (task.failure_count || 0) + 1

    // Record learning
    this.learner.recordFailure(task, testResults?.error || 'unknown', failureCount)
    recordOutcome(taskId, 'incorrect')

    // Build enriched description from QC diagnosis if available
    const diagnosis = testResults?.diagnosis
    let enrichedDescription = task.description || ''
    if (diagnosis) {
      console.log(`   🔍 QC diagnosis available: ${diagnosis.symptom || 'no symptom'}`)
      enrichedDescription = [
        `## Previous Attempt Failed — QC Diagnosis`,
        `**Symptom:** ${diagnosis.symptom || 'unknown'}`,
        `**Root Cause:** ${diagnosis.rootCause || 'unknown'}`,
        `**Suggested Fix:** ${diagnosis.suggestedFix || 'unknown'}`,
        diagnosis.verifySteps?.length > 0
          ? `**Verify:** ${diagnosis.verifySteps.map((s, i) => `${i + 1}. ${s}`).join('; ')}`
          : '',
        ``,
        `## Original Task`,
        task.description || task.title
      ].filter(Boolean).join('\n')
    }

    // QC recommendation overrides the default failure-count ladder when diagnosis is present.
    // The recommendation is grounded in root-cause analysis, so it's more informed than
    // a mechanical retry counter.
    const qcRecommendation = testResults?.retryRecommendation
    const action = qcRecommendation && diagnosis
      ? qcRecommendation  // trust diagnosis-grounded recommendation
      : failureCount === 1 ? 'retry'
      : (failureCount === 2 && task.estimated_hours > 3) ? 'decompose'
      : (failureCount >= 3 || task.model === 'opus') ? 'escalate'
      : 'retry'

    if (qcRecommendation && diagnosis) {
      console.log(`   🎯 QC recommends '${qcRecommendation}' based on: ${diagnosis.rootCause}`)
    }

    if (action === 'retry') {
      console.log(`   🔄 Retrying with escalated model (failure #${failureCount})`)
      recordDecision({
        decision_type: DECISION_TYPES.MODEL_SELECTION,
        task_id: taskId,
        chosen_model: this.escalateModel(task.model),
        context: { failure_count: failureCount, previous_model: task.model, has_diagnosis: !!diagnosis, qc_recommendation: qcRecommendation || null }
      })
      const updateFields = {
        status: 'ready',
        failure_count: failureCount,
        retry_with_model: this.escalateModel(task.model)
      }
      if (diagnosis) {
        updateFields.description = enrichedDescription
        updateFields.last_error = `QC: ${diagnosis.symptom} — Fix: ${diagnosis.suggestedFix}`
      }
      await this.store.updateTask(taskId, updateFields)
      this.actions.push(`Retry ${taskId} with ${this.escalateModel(task.model)}${diagnosis ? ' + QC diagnosis' : ''}`)
    } else if (action === 'decompose') {
      console.log(`   ✂️ Decomposing task${qcRecommendation ? ' (QC recommended)' : ''}...`)
      recordDecision({
        decision_type: DECISION_TYPES.DECOMPOSITION_TIMING,
        task_id: taskId,
        context: { failure_count: failureCount, estimated_hours: task.estimated_hours, qc_recommendation: qcRecommendation || null }
      })
      await this.decomposeTask(taskId)
    } else if (action === 'escalate') {
      console.log(`   📤 Escalating to PM${qcRecommendation ? ' (QC recommended)' : ''}`)
      recordDecision({
        decision_type: DECISION_TYPES.ESCALATION_DECISION,
        task_id: taskId,
        context: { failure_count: failureCount, model: task.model, qc_recommendation: qcRecommendation || null }
      })
      const pmDescription = diagnosis
        ? `Failed ${failureCount}x.\n\n## QC Diagnosis\n**Symptom:** ${diagnosis.symptom}\n**Root Cause:** ${diagnosis.rootCause}\n**Suggested Fix:** ${diagnosis.suggestedFix}\n\nReview if spec is clear and requirements are achievable.`
        : `Failed ${failureCount}x. Last error: ${task.last_error || testResults?.error || 'unknown'}\nReview if spec is clear and requirements are achievable.`
      await this.store.createTask({
        title: `PM Review: "${task.title}" failed ${failureCount}x`,
        agent_id: 'product', status: 'ready', priority: 1,
        use_case_id: task.use_case_id, tags: ['review', 'spec-clarity'],
        description: pmDescription,
        metadata: { created_by: 'orchestrator', escalation_from: task.id }
      })
      await this.store.updateTask(taskId, { status: 'failed', failure_count: failureCount })
      this.actions.push(`Escalated ${taskId} to PM after ${failureCount} failures${qcRecommendation ? ' (QC recommended)' : ''}`)
    }
  }
  async createFollowUpTasks(task) {
    try {
      const result = await chainTask(this.store, task, this.projectId)
      if (result === 'uc_complete') {
        this.actions.push(`UC complete: ${task.use_case_id}`)
      } else if (result?.startsWith('chained:')) {
        this.actions.push(`Chained: ${result.replace('chained:', '')} for ${task.use_case_id}`)
      }
    } catch (err) {
      console.warn(`   ⚠️ Follow-up task creation failed for ${task.use_case_id}:`, err.message)
    }
  }

  /**
   * Create a GitHub PR for a completed dev/design task.
   * This is the missing link: dev completion → PR → QC review.
   */
  async createPRForTask(task) {
    const projectDir = path.join(__dirname)
    const branch = task.branch_name
    if (!branch) return null

    try {
      // Check if branch has commits ahead of main
      let commitCount = 0
      try {
        const out = execSync(`git rev-list main..${branch} --count`, {
          cwd: projectDir, encoding: 'utf-8', timeout: 5000
        }).trim()
        commitCount = parseInt(out, 10) || 0
      } catch {
        // Branch may not exist locally
        return null
      }

      // If 0 commits, check for uncommitted work and auto-commit
      if (commitCount === 0) {
        try {
          execSync(`git checkout ${branch}`, { cwd: projectDir, stdio: 'pipe', timeout: 5000 })
          const status = execSync('git status --porcelain', {
            cwd: projectDir, encoding: 'utf-8', timeout: 5000
          }).trim()
          if (status) {
            execSync('git add -A', { cwd: projectDir, stdio: 'pipe', timeout: 5000 })
            execSync(`git commit -m "feat: ${task.title.replace(/"/g, '\\"')}"`, {
              cwd: projectDir, stdio: 'pipe', timeout: 10000
            })
            commitCount = 1
            console.log(`   Auto-committed uncommitted work on ${branch}`)
          }
        } catch (err) {
          console.warn(`   ⚠️ Auto-commit failed: ${err.message}`)
        } finally {
          try { execSync('git checkout main', { cwd: projectDir, stdio: 'pipe', timeout: 5000 }) } catch {}
        }
      }

      if (commitCount === 0) {
        console.log(`   No commits on ${branch} — skipping PR`)
        return null
      }

      // Push branch to origin
      execSync(`git push -u origin ${branch}`, { cwd: projectDir, stdio: 'pipe', timeout: 30000 })

      // Create PR via gh
      const safeTitle = task.title.replace(/"/g, '\\"').slice(0, 200)
      const prBody = `Auto-generated PR for task ${task.id}\\n\\nUse case: ${task.use_case_id || 'N/A'}`
      const prOutput = execSync(
        `gh pr create --base main --head ${branch} --title "${safeTitle}" --body "${prBody}"`,
        { cwd: projectDir, encoding: 'utf-8', timeout: 30000 }
      ).trim()

      // Extract PR number from URL (e.g. https://github.com/org/repo/pull/123)
      const prMatch = prOutput.match(/\/pull\/(\d+)/)
      if (!prMatch) {
        console.warn(`   ⚠️ Could not extract PR number from: ${prOutput}`)
        return null
      }
      const prNumber = parseInt(prMatch[1], 10)

      // Update task's pr_number in Supabase
      await this.store.updateTask(task.id, { pr_number: prNumber })

      // Insert code_reviews row for QC loop to pick up
      if (this.store.supabase) {
        await this.store.supabase.from('code_reviews').insert({
          project_id: this.projectId,
          task_id: task.id,
          pr_number: prNumber,
          branch_name: branch,
          status: 'pending',
          created_at: new Date().toISOString()
        })
      }

      console.log(`   📝 Created PR #${prNumber} for ${branch}`)
      return prNumber
    } catch (err) {
      console.warn(`   ⚠️ PR creation failed for ${branch}: ${err.message}`)
      // Always return to main on failure
      try { execSync('git checkout main', { cwd: projectDir, stdio: 'pipe' }) } catch {}
      return null
    }
  }

  escalateModel(currentModel) {
    const hierarchy = ['qwen3.5', 'opus']
    const currentIndex = hierarchy.indexOf(currentModel)
    if (currentIndex < hierarchy.length - 1) {
      return hierarchy[currentIndex + 1]
    }
    // Legacy model names → escalate to opus
    if (['haiku', 'kimi', 'sonnet'].includes(currentModel)) {
      return 'opus'
    }
    return currentModel
  }
  async decomposeTask(taskId) {
    // Use auto-decompose to create properly numbered subtasks
    console.log(`   Creating subtasks for ${taskId}...`)
    try {
      const result = await autoDecompose(taskId, false)
      if (result.action === 'decomposed') {
        console.log(`   ✂️ Decomposed into ${result.subtasksCreated.length} subtasks:`)
        result.subtasksCreated.forEach((title, i) => {
          console.log(`      ${i + 1}. ${title}`)
        })
        this.actions.push(`Decomposed ${taskId} into ${result.subtasksCreated.length} numbered subtasks`)
      } else if (result.action === 'none') {
        console.log(`   Task does not require decomposition`)
        this.actions.push(`${taskId} decomposition not needed`)
      } else {
        console.log(`   Decomposition result: ${result.message}`)
        this.actions.push(`Decomposition: ${result.message}`)
      }
    } catch (err) {
      console.error(`   ⚠️ Failed to decompose ${taskId}:`, err.message)
      this.actions.push(`Failed to decompose ${taskId}: ${err.message}`)
    }
  }
  async escalateTask(taskId, testResults) {
    // Create escalation record
    const escalationPath = path.join(__dirname, 'escalation-pending.json')
    const escalation = {
      taskId,
      reason: 'Multiple test failures',
      testResults,
      escalated_at: new Date().toISOString()
    }
    let escalations = []
    if (fs.existsSync(escalationPath)) {
      escalations = JSON.parse(fs.readFileSync(escalationPath, 'utf-8'))
    }
    escalations.push(escalation)
    fs.writeFileSync(escalationPath, JSON.stringify(escalations, null, 2))
    this.actions.push(`Escalated ${taskId} to human`)
  }
  async runSelfHealChecks() {
    console.log('\n5b. Running self-heal checks...')
    try {
      const issues = await runHealthChecks()
      const critical = issues.filter(i => i.severity === 'critical')
      if (critical.length > 0) {
        console.log(`   ⚠️ ${critical.length} critical issue(s) detected`)
        for (const issue of critical) {
          console.log(`      Auto-healing: ${issue.message}`)
          await healIssue(issue)
        }
        this.actions.push(`Self-healed ${critical.length} critical issue(s)`)
      } else {
        console.log('   ✅ No critical issues')
      }
    } catch (err) {
      console.warn('   ⚠️ Self-heal check failed:', err.message)
    }
  }

  async runSmokeTests() {
    console.log('\n5c. Running smoke tests...')
    try {
      const results = await smokeTests.runAll()
      this.smokeResults = results // store for syncProductComponents
      const total = results.passed.length + results.failed.length

      if (results.failed.length === 0) {
        console.log(`   🔬 Smoke: ${total}/${total} passed`)
      } else {
        const failedNames = results.failed.map(f => f.id).join(', ')
        console.log(`   🔬 Smoke: ${results.passed.length}/${total} — ${failedNames} FAILED`)
      }

      // Build smoke_test_id → product lookup for UC linkage
      const products = this.config.products || []
      const smokeToProduct = {}
      for (const p of products) {
        if (p.smoke_test_id) smokeToProduct[p.smoke_test_id] = p
      }

      const state = smokeTests.loadState()

      // Handle failures: escalation ladder with circuit breaker
      // 1st failure → QC diagnosis
      // QC done but still failing → dev fix (with QC + dev prior attempt context)
      // After MAX_RETRIES dev attempts → circuit breaker, block + alert human
      //
      // Model ladder: qwen3.5 (free) → kimi2.5 ($0.30) → sonnet ($2.00)
      // Cost cap: max $3 total per smoke test before circuit breaker
      const MAX_SMOKE_RETRIES = 3
      const SMOKE_COST_CAP = 3.00
      const MODEL_LADDER = ['qwen3.5', 'kimi2.5', 'sonnet']

      for (const failure of results.failed) {
        const smokeTitle = `Smoke: ${failure.name} failing`
        const devTitle = `Fix: ${failure.name} (smoke)`
        const testState = state.results[failure.id] || {}

        // Dedup: skip if an open task (QC or dev) already exists
        const existingSmoke = await this.store.findTaskByTitle(smokeTitle)
        const existingDev = await this.store.findTaskByTitle(devTitle)
        if (existingSmoke && !['done', 'failed'].includes(existingSmoke.status)) {
          console.log(`   ⏭️ QC task already open: ${smokeTitle}`)
          continue
        }
        if (existingDev && !['done', 'failed'].includes(existingDev.status)) {
          console.log(`   ⏭️ Dev task already open: ${devTitle}`)
          continue
        }

        // Track retry count in state file
        const retryCount = testState.devRetries || 0

        // Circuit breaker: stop creating tasks after MAX_RETRIES or cost cap
        const totalCost = testState.totalCost || 0
        if (retryCount >= MAX_SMOKE_RETRIES || totalCost >= SMOKE_COST_CAP) {
          // Only alert once per day
          const lastAlert = testState.lastCircuitBreakerAlert
          const today = new Date().toISOString().split('T')[0]
          if (!lastAlert || !lastAlert.startsWith(today)) {
            const reason = retryCount >= MAX_SMOKE_RETRIES
              ? `${retryCount} failed fix attempts`
              : `cost cap reached ($${totalCost.toFixed(2)}/$${SMOKE_COST_CAP})`
            console.log(`   🛑 Circuit breaker: ${failure.name} — ${reason} — needs human`)
            this.actions.push(`🛑 HUMAN NEEDED: ${failure.name} — ${reason}`)
            state.results[failure.id] = { ...testState, lastCircuitBreakerAlert: new Date().toISOString() }
            smokeTests.saveState(state)
          } else {
            console.log(`   🛑 Circuit breaker active: ${failure.name} (${retryCount} retries, $${totalCost.toFixed(2)} spent)`)
          }
          continue
        }

        // Escalation: if dev already completed but smoke still fails → extract what dev tried, retry with context
        if (existingDev && existingDev.status === 'done') {
          // Extract what the dev agent tried from spawn logs
          let devAttemptContext = ''
          if (existingDev.spawn_config?.log_prefix) {
            const logTail = readLogTail(`${existingDev.spawn_config.log_prefix}.stdout.log`, 80, 8192)
            if (logTail.length > 50) {
              // Extract meaningful lines (skip noise)
              const meaningful = logTail.split('\n')
                .filter(l => l.includes('fix') || l.includes('error') || l.includes('commit') ||
                             l.includes('changed') || l.includes('modified') || l.includes('symptom') ||
                             l.includes('root') || l.includes('cause') || l.includes('tried'))
                .slice(0, 10)
                .join('\n')
              if (meaningful) {
                devAttemptContext = `## Previous Dev Attempt #${retryCount} (FAILED — smoke still failing)\n${meaningful}`
              }
            }
          }
          if (!devAttemptContext) {
            devAttemptContext = `## Previous Dev Attempt #${retryCount}\nAgent reported completion but smoke test still fails. The previous fix was insufficient or incorrect.`
          }

          // Increment retry counter + pick model from ladder
          const model = MODEL_LADDER[Math.min(retryCount, MODEL_LADDER.length - 1)]
          const modelCost = { 'qwen3.5': 0, 'kimi2.5': 0.30, 'sonnet': 2.00 }[model] || 0
          state.results[failure.id] = {
            ...testState,
            devRetries: retryCount + 1,
            totalCost: (testState.totalCost || 0) + modelCost
          }
          smokeTests.saveState(state)

          const linkedProduct = smokeToProduct[failure.id]
          const devDescription = [
            `## Smoke Test Still Failing (Attempt ${retryCount + 1}/${MAX_SMOKE_RETRIES})`,
            `**Test:** ${failure.name} (${failure.id})`,
            `**Severity:** ${failure.severity}`,
            `**Detail:** ${failure.detail}`,
            `**URL:** ${smokeTests.tests.find(t => t.id === failure.id)?.url || 'dynamic'}`,
            linkedProduct ? `**Product:** ${linkedProduct.name} (${linkedProduct.url || linkedProduct.local_path || 'no URL'})` : '',
            `**Previous attempts:** ${retryCount} (all failed to resolve the smoke test)`,
            ``,
            devAttemptContext,
            ``,
            `## Your Job`,
            `The previous fix did NOT work — the smoke test still fails.`,
            `1. Read the previous attempt context above to understand what was already tried`,
            `2. Try a DIFFERENT approach than what was attempted before`,
            `3. Make actual code changes, commit, and push`,
            `4. If the fix requires a Vercel deploy, run: cd product/lead-response/dashboard && vercel --prod`,
            `5. Report via subagent-completion-report.js — include exactly what files you changed and why`,
            ``,
            `DO NOT report success unless you made actual code changes. The orchestrator's smoke test loop`,
            `will automatically verify whether your fix worked on the next heartbeat cycle.`
          ].filter(Boolean).join('\n')

          await this.store.createTask({
            title: devTitle,
            agent_id: 'dev',
            status: 'ready',
            model,
            priority: 1,
            tags: ['smoke-test', 'automated', 'fix', `retry-${retryCount + 1}`],
            description: devDescription,
            use_case_id: linkedProduct?.uc_id || null,
            metadata: { created_by: 'orchestrator', smoke_test_id: failure.id, product_id: linkedProduct?.id || null, retry: retryCount + 1, model_cost: modelCost }
          })

          console.log(`   🔬 Dev retry ${retryCount + 1}/${MAX_SMOKE_RETRIES}: ${devTitle}`)
          this.actions.push(`Smoke dev retry ${retryCount + 1}: ${failure.name}`)
          continue
        }

        // Escalation: if QC already completed but smoke still fails → create first dev task
        if (existingSmoke && existingSmoke.status === 'done') {
          // Extract diagnosis from completed QC task
          let qcDiagnosis = ''
          if (existingSmoke.spawn_config?.log_prefix) {
            const logTail = readLogTail(`${existingSmoke.spawn_config.log_prefix}.stdout.log`, 60, 8192)
            const symptomMatch = logTail.match(/symptom['":\s]+['"]([^'"]+)/i)
            const rootCauseMatch = logTail.match(/rootCause['":\s]+['"]([^'"]+)/i)
            const suggestedFixMatch = logTail.match(/suggestedFix['":\s]+['"]([^'"]+)/i)
            if (rootCauseMatch) {
              qcDiagnosis = [
                `## QC Diagnosis (from previous investigation)`,
                symptomMatch ? `**Symptom:** ${symptomMatch[1]}` : '',
                `**Root Cause:** ${rootCauseMatch[1]}`,
                suggestedFixMatch ? `**Suggested Fix:** ${suggestedFixMatch[1]}` : '',
              ].filter(Boolean).join('\n')
            }
          }

          // Initialize retry counter for dev attempts
          state.results[failure.id] = { ...testState, devRetries: 1, totalCost: 0 }
          smokeTests.saveState(state)

          const linkedProduct2 = smokeToProduct[failure.id]
          const devDescription = [
            `## Smoke Test Still Failing After QC Investigation (Attempt 1/${MAX_SMOKE_RETRIES})`,
            `**Test:** ${failure.name} (${failure.id})`,
            `**Severity:** ${failure.severity}`,
            `**Detail:** ${failure.detail}`,
            `**URL:** ${smokeTests.tests.find(t => t.id === failure.id)?.url || 'dynamic'}`,
            linkedProduct2 ? `**Product:** ${linkedProduct2.name} (${linkedProduct2.url || linkedProduct2.local_path || 'no URL'})` : '',
            ``,
            qcDiagnosis || `QC investigated but did not fix the issue. Previous task: ${existingSmoke.id}`,
            ``,
            `## Your Job`,
            `1. Apply the fix described in the QC diagnosis above`,
            `2. Make actual code changes, commit, and push`,
            `3. If the fix requires a Vercel deploy, run: cd product/lead-response/dashboard && vercel --prod`,
            `4. Report via subagent-completion-report.js — include exactly what files you changed and why`,
            ``,
            `DO NOT report success unless you made actual code changes. The orchestrator's smoke test loop`,
            `will automatically verify whether your fix worked on the next heartbeat cycle.`
          ].filter(Boolean).join('\n')

          await this.store.createTask({
            title: devTitle,
            agent_id: 'dev',
            status: 'ready',
            model: 'qwen3.5',
            priority: failure.severity === 'critical' ? 1 : 2,
            tags: ['smoke-test', 'automated', 'fix', 'retry-1'],
            description: devDescription,
            use_case_id: linkedProduct2?.uc_id || null,
            metadata: { created_by: 'orchestrator', smoke_test_id: failure.id, product_id: linkedProduct2?.id || null, escalated_from: existingSmoke.id, retry: 1 }
          })

          console.log(`   🔬 Escalated to dev: ${devTitle}`)
          this.actions.push(`Smoke escalated → Dev: ${failure.name}`)
          continue
        }

        // First failure: create QC investigation task
        // Model selection: critical + no cloud spawn in 24h → haiku; else qwen3.5
        let model = 'qwen3.5'
        const lastCloud = testState.lastCloudSpawn ? new Date(testState.lastCloudSpawn) : null
        const cloudCooldownExpired = !lastCloud || (Date.now() - lastCloud > 24 * 60 * 60 * 1000)

        const today = new Date().toISOString().split('T')[0]
        const cloudCountToday = Object.values(state.results)
          .filter(r => r.lastCloudSpawn && r.lastCloudSpawn.startsWith(today))
          .length

        if (failure.severity === 'critical' && cloudCooldownExpired && cloudCountToday < 1) {
          model = 'haiku'
          state.results[failure.id] = { ...testState, lastCloudSpawn: new Date().toISOString() }
          smokeTests.saveState(state)
        }

        const linkedProduct3 = smokeToProduct[failure.id]
        const description = [
          `## Smoke Test Failure`,
          `**Test:** ${failure.name} (${failure.id})`,
          `**Severity:** ${failure.severity}`,
          `**Detail:** ${failure.detail}`,
          `**URL:** ${smokeTests.tests.find(t => t.id === failure.id)?.url || 'dynamic'}`,
          linkedProduct3 ? `**Product:** ${linkedProduct3.name} (${linkedProduct3.url || linkedProduct3.local_path || 'no URL'})` : '',
          `**Time:** ${new Date().toISOString()}`,
          ``,
          `Investigate the root cause and report findings using the structured completion report.`
        ].filter(Boolean).join('\n')

        await this.store.createTask({
          title: smokeTitle,
          agent_id: 'qc',
          status: 'ready',
          model,
          priority: failure.severity === 'critical' ? 1 : 3,
          tags: ['smoke-test', 'automated'],
          description,
          use_case_id: linkedProduct3?.uc_id || null,
          metadata: { created_by: 'orchestrator', smoke_test_id: failure.id, product_id: linkedProduct3?.id || null }
        })

        console.log(`   🔬 Created QC task: ${smokeTitle} (model: ${model})`)
        this.actions.push(`Smoke fail → QC: ${failure.name} (${model})`)
      }

      // Auto-resolve: passing tests with open tasks (QC or dev) → mark done + reset retries
      for (const pass of results.passed) {
        const titles = [`Smoke: ${pass.name} failing`, `Fix: ${pass.name} (smoke)`]
        for (const taskTitle of titles) {
          const existing = await this.store.findTaskByTitle(taskTitle)
          if (existing && !['done', 'failed'].includes(existing.status)) {
            await this.store.updateTask(existing.id, {
              status: 'done',
              completed_at: new Date().toISOString(),
              last_error: 'Auto-resolved: smoke test passing again'
            })
            console.log(`   ✅ Auto-resolved: ${taskTitle}`)
            this.actions.push(`Smoke auto-resolved: ${pass.name}`)
          }
        }
        // Reset retry counter, cost, and circuit breaker when test passes
        const passState = state.results[pass.id]
        if (passState && (passState.devRetries || passState.lastCircuitBreakerAlert || passState.totalCost)) {
          state.results[pass.id] = { ...passState, devRetries: 0, totalCost: 0, lastCircuitBreakerAlert: null }
          smokeTests.saveState(state)
          console.log(`   🔄 Reset retry counter for ${pass.id}`)
        }
      }

      // Add summary to actions for Telegram
      this.actions.push(`Smoke tests: ${results.passed.length}/${total} passed`)
    } catch (err) {
      console.warn('   ⚠️ Smoke tests failed:', err.message)
      this.errors.push(`Smoke tests: ${err.message}`)
    }
  }

  async syncProductComponents() {
    console.log('\n5c2. Syncing product components to Supabase...')
    try {
      const products = this.config.products || []
      if (products.length === 0) {
        console.log('   📦 No products defined in config')
        return
      }

      const results = this.smokeResults || { passed: [], failed: [] }
      const passedIds = new Set(results.passed.map(p => p.id))
      const failedIds = new Set(results.failed.map(f => f.id))

      // A. Persist smoke test results to metrics table
      const sb = this.store.supabase
      if (results.passed.length + results.failed.length > 0) {
        await sb
          .from('metrics')
          .insert({
            project_id: this.projectId,
            domain: 'smoke_tests',
            metric_type: 'smoke_results',
            data: {
              passed: results.passed.map(p => ({ id: p.id, name: p.name })),
              failed: results.failed.map(f => ({ id: f.id, name: f.name, severity: f.severity }))
            },
            timestamp: new Date().toISOString()
          })
        console.log(`   📊 Smoke results persisted to metrics table`)
      }

      // B. Fetch UC statuses for products that reference a use case
      const ucStatusMap = new Map()
      const productsWithUCForStatus = products.filter(p => p.uc_id)
      if (productsWithUCForStatus.length > 0) {
        const { data: ucs } = await sb
          .from('use_cases')
          .select('id, implementation_status')
          .in('id', productsWithUCForStatus.map(p => p.uc_id))
        for (const uc of (ucs || [])) {
          ucStatusMap.set(uc.id, uc.implementation_status)
        }
      }

      // C. Sync products to system_components table
      for (const product of products) {
        let status, emoji

        // Priority: smoke test result > UC status > fallback PLANNED
        if (product.smoke_test_id && failedIds.has(product.smoke_test_id)) {
          status = 'DOWN'
          emoji = '🔴'
        } else if (product.smoke_test_id && passedIds.has(product.smoke_test_id)) {
          status = 'LIVE'
          emoji = '🟢'
        } else if (product.uc_id && ucStatusMap.has(product.uc_id)) {
          // No smoke test or not yet deployed — derive from UC status
          const ucStatus = ucStatusMap.get(product.uc_id)
          if (ucStatus === 'complete') {
            status = 'BUILT'
            emoji = '✅'
          } else if (ucStatus === 'in_progress') {
            status = 'IN PROGRESS'
            emoji = '🔨'
          } else {
            status = 'PLANNED'
            emoji = '📋'
          }
        } else {
          status = 'PLANNED'
          emoji = '📋'
        }

        const row = {
          project_id: this.projectId,
          component_name: product.name,
          category: 'product',
          status,
          status_emoji: emoji,
          details: product.description,
          verified_date: new Date().toISOString(),
          metadata: {
            product_id: product.id,
            type: product.type,
            url: product.url || null,
            test_url: product.test_url || null,
            local_path: product.local_path || null,
            smoke_test_id: product.smoke_test_id || null,
            uc_id: product.uc_id || null
          }
        }

        // Upsert: match on project_id + component_name + category
        const { data: existing } = await sb
          .from('system_components')
          .select('id')
          .eq('project_id', this.projectId)
          .eq('component_name', product.name)
          .eq('category', 'product')
          .maybeSingle()

        if (existing) {
          await sb
            .from('system_components')
            .update(row)
            .eq('id', existing.id)
        } else {
          await sb
            .from('system_components')
            .insert(row)
        }
      }

      console.log(`   📦 Synced ${products.length} products to system_components`)

      // Validate UC references: warn if a product's uc_id doesn't exist in Supabase
      const productsWithUC = products.filter(p => p.uc_id)
      if (productsWithUC.length > 0) {
        const ucIds = productsWithUC.map(p => p.uc_id)
        const { data: existingUCs } = await sb
          .from('use_cases')
          .select('id')
          .in('id', ucIds)
        const existingSet = new Set((existingUCs || []).map(u => u.id))
        for (const p of productsWithUC) {
          if (!existingSet.has(p.uc_id)) {
            console.warn(`   ⚠️ Product "${p.name}" references UC ${p.uc_id} which does not exist`)
          }
        }
      }

      this.actions.push(`Product sync: ${products.length} components updated`)
    } catch (err) {
      console.warn('   ⚠️ Product component sync failed:', err.message)
      this.errors.push(`Product sync: ${err.message}`)
    }
  }

  async checkBuildHealth() {
    console.log('\n5d. Checking dashboard build health...')
    try {
      const result = await buildHealth.checkBuildHealth()

      if (result.skipped) {
        console.log(`   🏗️ Build: skipped (${result.reason})`)
        if (result.errors && result.errors.length > 0) {
          console.log(`   ⚠️ Last known errors: ${result.errors.length}`)
        }
        return
      }

      if (result.pass) {
        console.log('   🏗️ Build: ✅ passes')

        // Auto-resolve any open build-fix tasks
        const taskTitle = 'Fix: Dashboard build errors'
        const existing = await this.store.findTaskByTitle(taskTitle)
        if (existing && !['done', 'failed'].includes(existing.status)) {
          await this.store.updateTask(existing.id, {
            status: 'done',
            completed_at: new Date().toISOString(),
            last_error: 'Auto-resolved: dashboard build passing again'
          })
          console.log('   ✅ Auto-resolved build-fix task')
          this.actions.push('Build auto-resolved: dashboard builds cleanly')
        }

        // Auto-deploy: if dashboard source is newer than last deploy, deploy it
        await this.checkAndDeploy()
        return
      }

      // Build failed — create a dev task with error details
      const taskTitle = 'Fix: Dashboard build errors'
      const existing = await this.store.findTaskByTitle(taskTitle)
      if (existing && !['done', 'failed'].includes(existing.status)) {
        console.log('   ⏭️ Build-fix task already open')
        return
      }

      const errorSummary = result.errors.map(e =>
        `- **${e.file}${e.line ? `:${e.line}` : ''}**: ${e.message}`
      ).join('\n')

      const description = [
        `## Dashboard Build Failing`,
        `The Next.js dashboard (\`product/lead-response/dashboard/\`) fails to build.`,
        `This blocks deployment of any code changes including health endpoints and bug fixes.`,
        ``,
        `## Errors`,
        errorSummary,
        ``,
        `## How to Fix`,
        `1. \`cd product/lead-response/dashboard\``,
        `2. \`npx next build\` to reproduce`,
        `3. Fix each error above`,
        `4. Verify build passes`,
        `5. Deploy: \`vercel --prod\``,
        `6. Report via subagent-completion-report.js`,
      ].join('\n')

      await this.store.createTask({
        title: taskTitle,
        agent_id: 'dev',
        status: 'ready',
        model: 'qwen3.5',
        priority: 1,
        tags: ['build-health', 'automated', 'critical'],
        description,
        metadata: { created_by: 'orchestrator', error_count: result.errors.length }
      })

      console.log(`   🏗️ Build: ❌ ${result.errors.length} error(s) — created dev task`)
      this.actions.push(`Build health: ${result.errors.length} error(s) → dev task created`)
    } catch (err) {
      console.warn('   ⚠️ Build health check failed:', err.message)
      this.errors.push(`Build health: ${err.message}`)
    }
  }

  /**
   * Auto-deploy: if dashboard files have been committed since the last deploy,
   * and the build passes, deploy to Vercel automatically.
   * This closes the loop: code change → build passes → deploy → smoke test verifies.
   */
  async checkAndDeploy() {
    try {
      const { execSync } = require('child_process')
      const dashboardDir = getDashboardDir(this.config)

      // Get last commit timestamp touching dashboard source
      const lastCommit = execSync(
        `git log -1 --format="%aI" -- app/ components/ lib/ 2>/dev/null`,
        { cwd: dashboardDir, encoding: 'utf-8', timeout: 5000 }
      ).trim()
      if (!lastCommit) return

      // Check deploy state
      const deployStatePath = require('path').join(__dirname, '.last-deploy.json')
      let lastDeployTime = null
      try {
        const ds = JSON.parse(require('fs').readFileSync(deployStatePath, 'utf-8'))
        lastDeployTime = ds.deployedAt
      } catch {}

      if (lastDeployTime && new Date(lastCommit) <= new Date(lastDeployTime)) {
        return // Already deployed
      }

      // Dedup: don't deploy if a deploy task is already open
      const deployTitle = 'Deploy: Dashboard to Vercel'
      const existingDeploy = await this.store.findTaskByTitle(deployTitle)
      if (existingDeploy && !['done', 'failed'].includes(existingDeploy.status)) {
        return
      }

      // Deploy with safety net (rollback on smoke test failure)
      console.log('   🚀 Auto-deploying dashboard to Vercel (with safety net)...')
      try {
        const { safeDeploy } = require('./orchestrator/deploy-safety')
        const result = await safeDeploy({ postDeployWaitMs: 15000 })

        if (result.success) {
          require('fs').writeFileSync(deployStatePath, JSON.stringify({
            deployedAt: new Date().toISOString(),
            trigger: 'auto-deploy-safe',
            lastCommit,
            commit: result.deployedCommit
          }, null, 2))
          console.log('   🚀 Deploy: ✅ success (verified by smoke tests)')
          this.actions.push('Auto-deployed dashboard to Vercel (verified)')
        } else if (result.revertedTo) {
          console.warn(`   🚀 Deploy: ⚠️ rolled back to ${result.revertedTo.slice(0, 8)}`)
          this.actions.push(`Deploy rolled back: smoke tests failed after deploy`)
          this.errors.push(`Deploy rolled back to ${result.revertedTo.slice(0, 8)}`)
        } else {
          console.warn(`   🚀 Deploy: ❌ ${result.error || 'failed'}`)
        }
      } catch (safeErr) {
        // Fallback: direct deploy without safety net
        console.warn('   Safety net failed, attempting direct deploy...')
        const output = execSync(
          `${this.config.deployment.deploy_command} 2>&1`,
          { cwd: dashboardDir, encoding: 'utf-8', timeout: 120000 }
        )
        if (output.includes('Production:') || output.includes('Aliased:')) {
          require('fs').writeFileSync(deployStatePath, JSON.stringify({
            deployedAt: new Date().toISOString(),
            trigger: 'auto-deploy-fallback',
            lastCommit
          }, null, 2))
          console.log('   🚀 Deploy: ✅ success (fallback, no safety net)')
          this.actions.push('Auto-deployed dashboard (fallback)')
        }
      }
    } catch (err) {
      // Deploy failed — don't create a task, just log.
      // Build-health already gates this, so deploy failures are likely transient.
      console.warn(`   🚀 Deploy: ❌ ${err.message?.split('\n')[0] || 'failed'}`)
    }
  }

  async processProductFeedback() {
    if (!this.store.supabase) return
    console.log('\n6b. Processing product feedback...')

    try {
      const { data: unprocessed } = await this.store.supabase
        .from('product_feedback').select('*')
        .eq('project_id', this.projectId).eq('processed', false)
        .limit(3)

      if (!unprocessed || unprocessed.length === 0) {
        console.log('   No unprocessed feedback')
        return
      }

      for (const feedback of unprocessed) {
        const task = await this.store.createTask({
          title: `PM: Analyze ${feedback.feedback_type} feedback`,
          agent_id: 'product', status: 'ready', model: 'qwen3.5', priority: 2,
          tags: ['feedback', feedback.feedback_type],
          description: `Feedback received (${feedback.source}):\n${JSON.stringify(feedback.data, null, 2)}\n\nDecide: fix bug, improve UX, add feature, or deprioritize. Update use_cases table if needed.`,
          metadata: { created_by: 'orchestrator', feedback_id: feedback.id }
        })

        await this.store.supabase.from('product_feedback')
          .update({ processed: true, processed_at: new Date().toISOString(), resulting_task_id: task.id })
          .eq('id', feedback.id)

        console.log(`   ✅ Feedback→PM: ${feedback.feedback_type} from ${feedback.source}`)
        this.actions.push(`Feedback→PM: ${feedback.feedback_type} from ${feedback.source}`)
      }
    } catch (err) {
      console.warn('   ⚠️ Feedback processing failed:', err.message)
    }
  }

  async checkPRReviews() {
    if (!this.store.supabase) return
    console.log('\n6c. Checking PR reviews...')

    try {
      // Auto-merge approved PRs
      const { data: approved } = await this.store.supabase
        .from('code_reviews').select('*')
        .eq('project_id', this.projectId).eq('status', 'approved')

      const projectDir = path.join(__dirname)
      for (const review of approved || []) {
        try {
          execSync(`gh pr merge ${review.pr_number} --squash --delete-branch`, { cwd: projectDir, stdio: 'pipe' })
          await this.store.supabase.from('code_reviews')
            .update({ status: 'merged', updated_at: new Date().toISOString() })
            .eq('id', review.id)
          if (review.task_id) {
            await this.store.updateTask(review.task_id, { status: 'done', completed_at: new Date().toISOString() })
          }
          // Delete local branch (gh --delete-branch only deletes remote)
          if (review.branch_name) {
            try { execSync(`git branch -d ${review.branch_name}`, { cwd: projectDir, stdio: 'pipe' }) } catch {}
          }
          console.log(`   ✅ Merged PR #${review.pr_number}`)
          this.actions.push(`Merged PR #${review.pr_number}`)
        } catch (mergeErr) {
          console.warn(`   ⚠️ Failed to merge PR #${review.pr_number}: ${mergeErr.message}`)
        }
      }

      // Handle rejected PRs: create fix tasks
      const { data: rejected } = await this.store.supabase
        .from('code_reviews').select('*')
        .eq('project_id', this.projectId).eq('status', 'changes_requested')

      for (const review of rejected || []) {
        const issues = review.review_notes?.issues || []
        const summary = issues[0]?.summary || 'QC issues'
        // Check if a fix task already exists
        const existing = await this.store.findTaskByTitle(`Dev Fix: ${summary}`)
        if (existing) continue

        let origTask = null
        if (review.task_id) {
          try { origTask = await this.store.getTask(review.task_id) } catch {}
        }
        // Record QC rejection as a learning failure for the original dev task
        if (origTask) {
          const reason = issues.map(i => i.summary).join('; ') || 'QC rejected'
          this.learner.recordFailure(origTask, reason, origTask.retry_count || 0)
          recordOutcome(origTask.id, 'incorrect')
          console.log(`   📊 Learning: recorded QC rejection for ${origTask.title}`)
        }
        await this.store.createTask({
          title: `Dev Fix: ${summary}`,
          agent_id: 'dev', status: 'ready', model: 'qwen3.5',
          branch_name: review.branch_name,
          use_case_id: origTask?.use_case_id,
          description: `Fix QC issues on PR #${review.pr_number}:\n${JSON.stringify(issues, null, 2)}`,
          parent_task_id: review.task_id,
          metadata: { created_by: 'orchestrator', fix_for_pr: review.pr_number }
        })
        console.log(`   🔧 Created fix task for PR #${review.pr_number}`)
        this.actions.push(`Fix task for PR #${review.pr_number}`)
      }
    } catch (err) {
      console.warn('   ⚠️ PR review check failed:', err.message)
    }
  }

  async cleanupStaleBranches() {
    console.log('\n6d. Cleaning up stale branches...')
    const projectDir = path.join(__dirname)
    try {
      // Ensure we're on main first — spawn-consumer may have left us on a feature branch
      try {
        const currentBranch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: projectDir, encoding: 'utf-8', timeout: 5000 }).trim()
        if (currentBranch !== 'main') {
          console.log(`   ⚠️ On branch ${currentBranch}, switching to main first`)
          execSync('git checkout main', { cwd: projectDir, stdio: 'pipe', timeout: 5000 })
        }
      } catch (checkoutErr) {
        console.warn(`   ⚠️ Could not switch to main: ${checkoutErr.message}`)
        return // Can't clean branches if we can't get to main
      }

      const branchOutput = execSync(
        `git branch --list 'dev/*' 'design/*'`,
        { cwd: projectDir, encoding: 'utf-8', timeout: 5000 }
      ).trim()

      if (!branchOutput) {
        console.log('   No feature branches to clean up')
        return
      }

      const branches = branchOutput.split('\n').map(b => b.trim().replace(/^\* /, ''))
      let cleaned = 0

      for (const branch of branches) {
        if (!this.store.supabase) continue

        // Find task with this branch_name
        const { data: tasks } = await this.store.supabase
          .from('tasks').select('id, status')
          .eq('project_id', this.projectId)
          .eq('branch_name', branch)
          .limit(1)

        const task = tasks?.[0]
        // Only clean up if task is done/failed (or orphan — no task found)
        if (task && !['done', 'failed'].includes(task.status)) continue

        // Safe delete: -d only works if fully merged, -D for orphans with no task
        try {
          const count = execSync(
            `git rev-list main..${branch} --count 2>/dev/null`,
            { cwd: projectDir, encoding: 'utf-8', timeout: 5000 }
          ).trim()

          if (parseInt(count, 10) === 0) {
            // No unique commits — safe to delete
            execSync(`git branch -d ${branch}`, { cwd: projectDir, stdio: 'pipe', timeout: 5000 })
            console.log(`   🗑️ Deleted stale branch: ${branch} (no unique commits)`)
            cleaned++
          } else if (!task) {
            // Orphan branch with commits but no task — force delete
            execSync(`git branch -D ${branch}`, { cwd: projectDir, stdio: 'pipe', timeout: 5000 })
            console.log(`   🗑️ Deleted orphan branch: ${branch} (${count} commits, no task)`)
            cleaned++
          }
        } catch {}
      }

      if (cleaned > 0) {
        this.actions.push(`Cleaned up ${cleaned} stale branch(es)`)
      } else {
        console.log('   No stale branches to clean up')
      }
    } catch (err) {
      console.warn('   ⚠️ Branch cleanup failed:', err.message)
    }
  }

  async spawnAgents() {
    console.log('\n4️⃣ Spawning agents...')
    if (this.status.ready === 0) {
      console.log('   No ready tasks to spawn')
      return
    }
    // Check budget
    const budget = wfCheckBudget()
    console.log(`   Budget: $${budget.spent.toFixed(2)} / $${BUDGET_DAILY_LIMIT} (${(budget.remaining).toFixed(2)} remaining)`)
    if (budget.remaining < BUDGET_MIN_FOR_SPAWN) {
      console.log('   ⚠️ Budget too low to spawn new agents')
      this.actions.push('Budget check: insufficient funds')
      return
    }

    // Build set of already-spawned taskIds for dedup
    const alreadySpawnedIds = new Set(
      budget.spawns.filter(s => s.taskId).map(s => s.taskId)
    )

    // Spawn up to MAX_SPAWNS_PER_HEARTBEAT ready tasks
    let spawnCount = 0
    for (const task of this.readyTasks) {
      if (spawnCount >= MAX_SPAWNS_PER_HEARTBEAT) break

      const spawnRecord = await prepareAndQueueSpawn(this.store, this.learner, task, budget, alreadySpawnedIds)
      if (spawnRecord) {
        this.spawned.push(spawnRecord)
        this.actions.push(`Spawned ${spawnRecord.agent} for ${spawnRecord.title}`)
        spawnCount++
      }
    }
  }
  async checkBudget() { return wfCheckBudget() }
  async queueForSpawn(task) { return wfQueueForSpawn(task) }
  async recordSpawn(task) { return wfRecordSpawn(task) }
  async checkBlockers() {
    console.log('\n4️⃣ Checking blocked tasks...')
    if (this.blockedTasks.length === 0) {
      console.log('   No blocked tasks')
      return
    }
    console.log(`   ${this.blockedTasks.length} blocked tasks found`)
    for (const task of this.blockedTasks) {
      // Check if blocker is resolved
      // This would check dependencies in a real implementation
      console.log(`   ⏸️ Blocked: ${task.title}`)
      if (task.blocked_at) {
        const blockedDuration = Date.now() - new Date(task.blocked_at).getTime()
        const blockedHours = blockedDuration / (1000 * 60 * 60)
        if (blockedHours > 0.5) { // 30 minutes
          console.log(`   ⚠️ Blocked for ${blockedHours.toFixed(1)}h - investigating`)
          // Could create a resolution task here
        }
      }
    }
    this.actions.push(`Checked ${this.blockedTasks.length} blocked tasks`)
  }

  // ── Loop 5: Revenue Intelligence ────────────────────────────────────────

  async collectRevenueIntelligence() {
    console.log('\n5e. Revenue intelligence (Loop 5)...')
    try {
      const { collectRevenue } = require('./scripts/revenue-collector')
      const result = await collectRevenue()
      this.revenueGoals = result.goals || []

      const offTrack = this.revenueGoals.filter(g => !g.onTrack)
      if (offTrack.length > 0) {
        console.log(`   ⚠️ ${offTrack.length} goal(s) off-track — revenue-aware prioritization active`)
        this.actions.push(`Revenue: ${offTrack.length} goal(s) off-track`)
      } else if (this.revenueGoals.length > 0) {
        console.log('   Revenue goals on track')
      } else {
        console.log('   No active revenue goals')
      }
    } catch (err) {
      // Non-fatal — revenue collection failure shouldn't block the heartbeat
      console.warn('   ⚠️ Revenue collection failed (non-fatal):', err.message)
    }
  }

  // ── Loop 6: Distribution Health ──────────────────────────────────────────

  async checkDistributionHealth() {
    console.log('\n5f. Distribution health (Loop 6)...')
    try {
      const { collectDistribution, checkDistributionHealth: checkHealth, createDistributionTasks } = require('./scripts/distribution-collector')

      // Collect metrics (best-effort from available sources)
      await collectDistribution()

      // Check for distribution issues
      const issues = await checkHealth()
      if (issues.length > 0) {
        console.log(`   ⚠️ ${issues.length} distribution issue(s) detected`)
        for (const issue of issues) {
          console.log(`      [${issue.severity}] ${issue.message}`)
        }
        await createDistributionTasks(issues)
        this.actions.push(`Distribution: ${issues.length} issue(s) → tasks created`)
      } else {
        console.log('   Distribution health OK')
      }
    } catch (err) {
      // Non-fatal — distribution check failure shouldn't block the heartbeat
      console.warn('   ⚠️ Distribution check failed (non-fatal):', err.message)
    }
  }

  async replenishQueue() {
    console.log('\n6️⃣ Checking queue depth...')
    if (this.status.ready >= 2) {
      console.log(`   Queue healthy (${this.status.ready} ready)`)
      return
    }
    console.log(`   Queue low (${this.status.ready} ready) - replenishing from roadmap...`)

    if (!this.store.supabase) {
      this.actions.push('Queue low - no Supabase connection for replenishment')
      return
    }

    try {
      const { data: incompleteUCs } = await this.store.supabase
        .from('use_cases').select('*')
        .eq('project_id', this.projectId)
        .in('implementation_status', ['not_started', 'partial'])
        .order('priority', { ascending: true })

      if (!incompleteUCs || incompleteUCs.length === 0) {
        console.log('   No incomplete use cases to work on')
        return
      }

      // Revenue-aware priority boost: when goals are off-track,
      // high-impact UCs get their priority multiplied (lower = higher priority)
      const revenueOffTrack = (this.revenueGoals || []).some(g => !g.onTrack)
      if (revenueOffTrack) {
        const IMPACT_MULTIPLIER = { high: 0.3, medium: 0.6, low: 1.0, none: 1.0 }
        for (const uc of incompleteUCs) {
          const multiplier = IMPACT_MULTIPLIER[uc.revenue_impact] || 1.0
          uc._effective_priority = Math.max(1, Math.round((uc.priority || 5) * multiplier))
        }
        incompleteUCs.sort((a, b) => (a._effective_priority || a.priority) - (b._effective_priority || b.priority))
        console.log('   Revenue off-track — boosting revenue-impacting UCs')
      }

      // Check which UCs already have active tasks
      const allTasks = await this.store.getTasks()
      const activeUCs = new Set(allTasks
        .filter(t => ['ready', 'in_progress', 'blocked'].includes(t.status))
        .map(t => t.use_case_id).filter(Boolean))

      // Check for UCs that failed recently (within 24h) — don't re-create tasks
      // for these to avoid infinite fail-recreate loops
      const { data: recentFails } = await this.store.supabase
        .from('tasks').select('use_case_id')
        .eq('project_id', this.projectId).eq('status', 'failed')
        .gte('completed_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .not('use_case_id', 'is', null)
      const recentlyFailedUCs = new Set((recentFails || []).map(t => t.use_case_id))

      // Check completed UCs for dependency resolution
      const { data: completedUCData } = await this.store.supabase
        .from('use_cases').select('id')
        .eq('project_id', this.projectId)
        .eq('implementation_status', 'complete')
      const completedUCs = new Set((completedUCData || []).map(u => u.id))

      const AGENT_LABELS = this.config.agents.labels
      let created = 0

      for (const uc of incompleteUCs) {
        if (created >= 2) break
        if (activeUCs.has(uc.id)) continue
        if (recentlyFailedUCs.has(uc.id)) {
          console.log(`   ⏭️ Skipping ${uc.id} — failed recently, needs investigation`)
          continue
        }
        if (uc.depends_on?.some(d => !completedUCs.has(d))) continue

        const firstAgent = uc.workflow?.[0] || 'product'
        const label = AGENT_LABELS[firstAgent] || firstAgent
        const workflowLen = (uc.workflow || []).length
        const ucDesc = uc.description || uc.name
        const remainingAgents = (uc.workflow || []).slice(1).map(a => AGENT_LABELS[a] || a).join(' → ')

        // Role-aware description from shared buildRoleContext
        const roleCtx = buildRoleContext(firstAgent, uc.name, ucDesc, {
          workflowStep: 0, workflowTotal: workflowLen, remainingAgents
        })

        await this.store.createTask({
          title: `${label}: ${uc.id} - ${uc.name}`,
          agent_id: firstAgent, status: 'ready', model: 'qwen3.5',
          priority: uc.priority, use_case_id: uc.id, prd_id: uc.prd_id,
          tags: [firstAgent === 'product' ? 'spec' : 'feature'],
          description: roleCtx.description,
          metadata: { created_by: 'orchestrator', workflow_step: 0, workflow_total: workflowLen }
        })
        console.log(`   ✅ Replenished: ${label} task for ${uc.id} - ${uc.name}`)
        this.actions.push(`Replenished: ${label} task for ${uc.id}`)
        created++
      }
    } catch (err) {
      console.warn('   ⚠️ Replenishment failed:', err.message)
      this.actions.push('Queue replenishment failed: ' + err.message)
    }
  }
  async updateDashboard() {
    console.log('\n6️⃣ Updating dashboard...')
    try {
      await generateDashboard()
      await generateProjectDocs()
      console.log('   ✅ Dashboard updated')
      this.actions.push('Dashboard updated')
    } catch (err) {
      console.warn('   ⚠️ Dashboard update failed:', err.message)
      this.errors.push(`Dashboard: ${err.message}`)
    }
  }
  async reportToTelegram() {
    console.log('\n7️⃣ Preparing Telegram report...')
    // Only report every 3rd heartbeat (15 min) or if there are actions/errors
    // Also report if queue state changed significantly from last snapshot
    const lastSnap = this.activityState?.queueSnapshot || {}
    const snapChanged = (lastSnap.inProgress || 0) !== this.status.inProgress ||
                        (lastSnap.done || 0) !== this.status.done ||
                        (lastSnap.ready || 0) !== this.status.ready
    const shouldReport = this.spawned.length > 0 || this.completed.length > 0 || this.errors.length > 0 || snapChanged
    if (!shouldReport) {
      console.log('   Nothing significant to report')
      return
    }
    // Build report
    const dayNum = getDayNumber(this.config)
    let report = `🤖 ${this.config.reporting.report_prefix} — Day ${dayNum}/${this.config.reporting.day_target}\n\n`
    report += `Queue: ${this.status.ready} ready | ${this.status.inProgress} active | ${this.status.blocked} blocked\n`
    if (this.spawned.length > 0) {
      report += `\n🚀 Spawned:\n`
      this.spawned.forEach(s => report += `  • ${s.title} (${s.agent})\n`)
    }
    if (this.completed.length > 0) {
      report += `\n✅ Completed:\n`
      this.completed.forEach(c => report += `  • ${c.title} (${c.agent})\n`)
    }
    if (this.errors.length > 0) {
      report += `\n⚠️ Errors:\n`
      this.errors.forEach(e => report += `  • ${e}\n`)
    }
    // Write to a file that can be read by the message tool
    const reportPath = path.join(__dirname, '.orchestrator-report.json')
    fs.writeFileSync(reportPath, JSON.stringify({
      report,
      timestamp: new Date().toISOString(),
      target: `telegram:${this.config.telegram.chat_id}`,
      threadId: this.config.telegram.thread_id
    }, null, 2))
    console.log(`   Report ready for Telegram (topic ${this.config.telegram.thread_id})`)
    this.actions.push(`Report prepared for topic ${this.config.telegram.thread_id}`)
  }
  async logHeartbeat() {
    console.log('\n8️⃣ Logging heartbeat...')
    const logEntry = {
      timestamp: new Date().toISOString(),
      status: this.status,
      actions: this.actions,
      spawned: this.spawned.length,
      completed: this.completed.length,
      errors: this.errors
    }

    // Write to metrics table for dashboard
    try {
      if (this.store.supabase) {
        await this.store.supabase.from('metrics').insert({
          project_id: this.projectId,
          domain: 'orchestrator',
          metric_type: 'heartbeat',
          data: {
            queue: this.status,
            actions_count: this.actions.length,
            spawned_count: this.spawned.length,
            completed_count: this.completed.length,
            error_count: this.errors.length
          }
        })
      }
    } catch (err) {
      console.warn('   ⚠️ Failed to write heartbeat metric:', err.message)
    }
    // Append to log file
    let logs = []
    if (fs.existsSync(HEARTBEAT_LOG_PATH)) {
      const content = fs.readFileSync(HEARTBEAT_LOG_PATH, 'utf-8')
      // Extract existing logs from markdown
      const match = content.match(/```json\n([\s\S]*?)\n```/)
      if (match) {
        try {
          logs = JSON.parse(match[1])
        } catch (e) {
          logs = []
        }
      }
    }
    logs.push(logEntry)
    // Keep only last 100 entries
    if (logs.length > 100) {
      logs = logs.slice(-100)
    }
    const logContent = `# Orchestrator Heartbeat Log
Last updated: ${new Date().toISOString()}
## Recent Heartbeats
\`\`\`json
${JSON.stringify(logs, null, 2)}
\`\`\`
## Summary
- Total heartbeats: ${logs.length}
- Last status: ${JSON.stringify(this.status)}
`
    fs.writeFileSync(HEARTBEAT_LOG_PATH, logContent)
    console.log('   ✅ Heartbeat logged')
  }
  updateHeartbeatTimestamp() {
    const now = new Date().toISOString()
    const activityPath = path.join(__dirname, '.activity-state.json')
    // Update activity-state.json (single source of truth)
    if (fs.existsSync(activityPath)) {
      try {
        const data = JSON.parse(fs.readFileSync(activityPath, 'utf-8'))
        data.lastHeartbeat = now
        data.lastMeaningfulChange = now
        fs.writeFileSync(activityPath, JSON.stringify(data, null, 2))
      } catch (err) {
        // If parse fails, create minimal state
        fs.writeFileSync(activityPath, JSON.stringify({
          lastHeartbeat: now,
          lastMeaningfulChange: now,
          queueSnapshot: {},
          budgetSnapshot: {}
        }, null, 2))
      }
    } else {
      // Create new state file
      fs.writeFileSync(activityPath, JSON.stringify({
        lastHeartbeat: now,
        lastMeaningfulChange: now,
        queueSnapshot: {},
        budgetSnapshot: {}
      }, null, 2))
    }
  }
  async reportError(err) {
    // Write error to report file for Telegram
    const reportPath = path.join(__dirname, '.orchestrator-report.json')
    fs.writeFileSync(reportPath, JSON.stringify({
      report: `🚨 Orchestrator Error\n\n${err.message}`,
      timestamp: new Date().toISOString(),
      target: `${this.config.telegram.chat_id}:topic:${this.config.telegram.thread_id}`,
      isError: true
    }, null, 2))
  }
}
// Run if called directly
if (require.main === module) {
  const executor = new HeartbeatExecutor()
  executor.run().catch(err => {
    console.error('Fatal error:', err)
    process.exit(1)
  })
}
module.exports = { HeartbeatExecutor }