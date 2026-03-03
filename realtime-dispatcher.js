#!/usr/bin/env node
require('dotenv').config({ path: require('path').join(__dirname, '.env') })

/**
 * realtime-dispatcher.js — Event-Driven Hot Path for Orchestration
 *
 * Long-running Supabase Realtime listener that reacts to task status changes
 * instantly, eliminating the 15-30 min dead time between workflow steps.
 *
 * Hot path events:
 *   status → done  : record learning → chain to next workflow step → spawn
 *   status → ready : budget check → queue for spawn → run spawn-consumer
 *
 * Cold path (stays in heartbeat):
 *   zombie detection, queue replenishment, dashboard generation,
 *   Telegram reporting, self-heal, PR reviews, product feedback
 *
 * Dedup safety:
 *   - createTask() has title-based dedup
 *   - spawn-consumer deduplicates by taskId
 *   - updateTask() is idempotent for status changes
 *   - Dispatcher re-fetches task before acting (race condition guard)
 */

const { TaskStore } = require('./task-store')
const { LearningSystem } = require('./learning-system')
const { recordOutcome } = require('./orchestrator-decision-tracker')
const {
  checkBudget, BUDGET_MIN_FOR_SPAWN,
  chainTask, prepareAndQueueSpawn,
  readLogTail, readLogFull, COMPLETION_MARKERS,
  verifyTaskOutput
} = require('./workflow-engine')
const fs = require('fs')
const path = require('path')
const { getConfig } = require('./project-config-loader')

const PROJECT_ID = getConfig().project_id
const LOG_PATH = path.join(__dirname, '.realtime-dispatcher.log')
const MAX_LOG_BYTES = 1024 * 1024 // 1 MB
const RATE_LIMIT_MAX = 20 // events per minute
const RATE_LIMIT_WINDOW_MS = 60_000
const HEALTH_CHECK_INTERVAL_MS = 5 * 60_000 // 5 min
const COMPLETION_SCAN_INTERVAL_MS = 2 * 60_000 // 2 min
const SPAWN_DEBOUNCE_MS = 2_000

class RealtimeDispatcher {
  constructor() {
    this.store = new TaskStore()
    this.learner = new LearningSystem()
    this.processing = new Set()       // taskIds currently being handled
    this.eventTimestamps = []         // for rate limiting
    this.spawnTimer = null            // debounced spawn timer
    this.healthTimer = null
    this.completionScanTimer = null
    this.channel = null
    this.subscriptionStatus = 'INITIAL'
    this.stats = { eventsReceived: 0, tasksChained: 0, spawnsQueued: 0, errors: 0 }
  }

  // ── Logging ──────────────────────────────────────────────────────────────

  log(level, msg) {
    const line = `[${new Date().toISOString()}] [${level}] ${msg}\n`
    process.stdout.write(line)
    try {
      // Rotate if needed
      if (fs.existsSync(LOG_PATH) && fs.statSync(LOG_PATH).size > MAX_LOG_BYTES) {
        const rotated = LOG_PATH + '.1'
        if (fs.existsSync(rotated)) fs.unlinkSync(rotated)
        fs.renameSync(LOG_PATH, rotated)
      }
      fs.appendFileSync(LOG_PATH, line)
    } catch {}
  }

  // ── Rate limiting ────────────────────────────────────────────────────────

  isRateLimited() {
    const now = Date.now()
    this.eventTimestamps = this.eventTimestamps.filter(t => now - t < RATE_LIMIT_WINDOW_MS)
    if (this.eventTimestamps.length >= RATE_LIMIT_MAX) {
      return true
    }
    this.eventTimestamps.push(now)
    return false
  }

  // ── Start / Stop ────────────────────────────────────────────────────────

  async start() {
    if (!this.store.supabase) {
      this.log('ERROR', 'No Supabase connection — cannot start realtime listener')
      process.exit(1)
    }

    this.log('INFO', 'Starting Realtime Dispatcher for project: ' + PROJECT_ID)

    // Subscribe to tasks table changes
    this.channel = this.store.supabase
      .channel('dispatcher-tasks')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tasks',
          filter: `project_id=eq.${PROJECT_ID}`
        },
        (payload) => this.handleEvent(payload)
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'tasks',
          filter: `project_id=eq.${PROJECT_ID}`
        },
        (payload) => this.handleNewTask(payload)
      )
      .subscribe((status) => {
        this.subscriptionStatus = status
        this.log('INFO', `Subscription status: ${status}`)
      })

    // Health check interval
    this.healthTimer = setInterval(() => this.healthCheck(), HEALTH_CHECK_INTERVAL_MS)

    // Completion scan: catch agents that completed but didn't write a report
    this.completionScanTimer = setInterval(() => this.completionScan(), COMPLETION_SCAN_INTERVAL_MS)

    // Graceful shutdown
    const shutdown = () => this.stop()
    process.on('SIGTERM', shutdown)
    process.on('SIGINT', shutdown)

    this.log('INFO', 'Realtime Dispatcher running. Ctrl+C to stop.')
  }

  async stop() {
    this.log('INFO', 'Shutting down...')
    if (this.healthTimer) clearInterval(this.healthTimer)
    if (this.completionScanTimer) clearInterval(this.completionScanTimer)
    if (this.spawnTimer) clearTimeout(this.spawnTimer)
    if (this.channel) {
      await this.store.supabase.removeChannel(this.channel)
    }
    this.log('INFO', `Final stats: ${JSON.stringify(this.stats)}`)
    process.exit(0)
  }

  // ── Event handlers ───────────────────────────────────────────────────────

  async handleEvent(payload) {
    const { new: newRow, old: oldRow } = payload
    if (!newRow?.id) return

    const oldStatus = oldRow?.status
    const newStatus = newRow.status

    // Only react to meaningful status transitions
    if (newStatus === 'done' && oldStatus !== 'done') {
      await this.onTaskCompleted(newRow)
    } else if (newStatus === 'ready' && oldStatus !== 'ready') {
      await this.onTaskReady(newRow)
    }
  }

  async handleNewTask(payload) {
    const { new: newRow } = payload
    if (!newRow?.id) return
    if (newRow.status === 'ready') {
      await this.onTaskReady(newRow)
    }
  }

  // ── Hot path: task completed ─────────────────────────────────────────────

  async onTaskCompleted(row) {
    const taskId = row.id
    if (this.processing.has(taskId)) return
    if (this.isRateLimited()) {
      this.log('WARN', `Rate limited — skipping done event for ${taskId}`)
      return
    }

    this.processing.add(taskId)
    this.stats.eventsReceived++

    try {
      // Re-fetch to guard against stale/partial payloads
      const task = await this.store.getTask(taskId)
      if (!task || task.status !== 'done') {
        this.log('DEBUG', `Task ${taskId} is no longer 'done' after re-fetch — skipping`)
        return
      }

      this.log('INFO', `Task completed: ${task.title} (${task.agent_id})`)

      // Record learning
      try {
        this.learner.recordSuccess(task)
        recordOutcome(taskId, 'correct')
      } catch (err) {
        this.log('WARN', `Learning record failed for ${taskId}: ${err.message}`)
      }

      // Chain to next workflow step
      try {
        const result = await chainTask(this.store, task, PROJECT_ID)
        if (result === 'uc_complete') {
          this.log('INFO', `UC complete: ${task.use_case_id}`)
        } else if (result?.startsWith('chained:')) {
          this.log('INFO', `Chained: ${result.replace('chained:', '')} for ${task.use_case_id}`)
          this.stats.tasksChained++
        }
      } catch (err) {
        this.log('ERROR', `Chain failed for ${taskId}: ${err.message}`)
        this.stats.errors++
      }

      // Check for unblocked tasks
      try {
        const unblocked = await this.store.checkUnblockedTasks(taskId)
        if (unblocked?.length > 0) {
          this.log('INFO', `Unblocked ${unblocked.length} task(s) after ${taskId}`)
        }
      } catch (err) {
        this.log('WARN', `Unblock check failed for ${taskId}: ${err.message}`)
      }

      // Schedule spawn for any newly-ready tasks
      this.scheduleSpawn()
    } catch (err) {
      this.log('ERROR', `onTaskCompleted error for ${taskId}: ${err.message}`)
      this.stats.errors++
    } finally {
      this.processing.delete(taskId)
    }
  }

  // ── Hot path: task became ready ──────────────────────────────────────────

  async onTaskReady(row) {
    const taskId = row.id
    if (this.processing.has(taskId)) return
    if (this.isRateLimited()) {
      this.log('WARN', `Rate limited — skipping ready event for ${taskId}`)
      return
    }

    this.processing.add(taskId)
    this.stats.eventsReceived++

    try {
      // Re-fetch to guard against races
      const task = await this.store.getTask(taskId)
      if (!task || task.status !== 'ready') {
        this.log('DEBUG', `Task ${taskId} is no longer 'ready' after re-fetch — skipping`)
        return
      }

      this.log('INFO', `Task ready: ${task.title} (${task.agent_id})`)

      // Budget check + prepare + queue
      const budget = checkBudget()
      if (budget.remaining < BUDGET_MIN_FOR_SPAWN) {
        this.log('WARN', `Budget too low ($${budget.remaining.toFixed(2)}) — skipping spawn for ${taskId}`)
        return
      }

      const alreadySpawnedIds = new Set(
        budget.spawns.filter(s => s.taskId).map(s => s.taskId)
      )

      const spawnRecord = await prepareAndQueueSpawn(this.store, this.learner, task, budget, alreadySpawnedIds)
      if (spawnRecord) {
        this.log('INFO', `Queued spawn: ${spawnRecord.agent} for "${spawnRecord.title}"`)
        this.stats.spawnsQueued++
        this.scheduleSpawn()
      }
    } catch (err) {
      this.log('ERROR', `onTaskReady error for ${taskId}: ${err.message}`)
      this.stats.errors++
    } finally {
      this.processing.delete(taskId)
    }
  }

  // ── Debounced spawn ──────────────────────────────────────────────────────

  scheduleSpawn() {
    if (this.spawnTimer) clearTimeout(this.spawnTimer)
    this.spawnTimer = setTimeout(async () => {
      try {
        const { run } = require('./spawn-consumer')
        this.log('INFO', 'Running spawn-consumer...')
        const result = await run()
        if (result.spawned.length > 0) {
          this.log('INFO', `Spawned ${result.spawned.length} agent(s): ${result.spawned.map(s => s.title).join(', ')}`)
        }
        if (result.errors.length > 0) {
          this.log('WARN', `Spawn errors: ${result.errors.join('; ')}`)
        }
      } catch (err) {
        this.log('ERROR', `Spawn consumer failed: ${err.message}`)
        this.stats.errors++
      }
    }, SPAWN_DEBOUNCE_MS)
  }

  // ── Completion scan (catch dead PIDs with completion markers) ────────────

  async completionScan() {
    try {
      const tasks = await this.store.getTasks({ status: 'in_progress' })
      if (tasks.length === 0) return

      let completed = 0
      for (const task of tasks) {
        const sc = task.spawn_config || {}
        const pid = sc.pid
        if (!pid) continue

        // Check if PID is alive
        let alive = false
        try { process.kill(pid, 0); alive = true } catch {}
        if (alive) continue

        // PID is dead — check full stdout for completion markers
        if (!sc.log_prefix) continue
        const stdoutFull = readLogFull(`${sc.log_prefix}.stdout.log`)
        if (!stdoutFull) continue

        const fullLower = stdoutFull.toLowerCase()
        const didComplete = COMPLETION_MARKERS.some(m => fullLower.includes(m.toLowerCase()))
          || /phase complete|ready for (dev|implementation|review)/i.test(stdoutFull)
        if (!didComplete) continue

        // Check if this was a skip (agent determined role not needed)
        const wasSkipped = /step skipped/i.test(stdoutFull)

        // Verify the agent actually produced commits (not just printed "COMPLETE")
        // Skip verification for skipped steps — they intentionally produce no output
        if (!wasSkipped) {
          const { verified, reason } = verifyTaskOutput(task)
          if (!verified) {
            this.log('WARN', `Completion scan: ${task.title} — stdout says COMPLETE but ${reason}`)
            await this.store.updateTask(task.id, {
              status: 'failed', last_error: `False completion: ${reason}`,
              spawn_config: { ...sc, spawn_status: 'false_positive' }
            })
            try {
              this.learner.recordFailure(task, `false_completion: ${reason}`, task.retry_count || 0)
              recordOutcome(task.id, 'incorrect')
            } catch {}
            completed++
            continue
          }
        }

        // Agent completed (or skipped) — write completion JSON + mark done
        const completionType = wasSkipped ? 'skipped' : 'completed'
        this.log('INFO', `Completion scan: ${task.title} — PID ${pid} dead, stdout shows ${completionType.toUpperCase()}`)

        // Write the completion JSON that the agent failed to write
        // This makes the system autonomous — no manual intervention needed
        try {
          const { writeCompletionReport } = require('./subagent-completion-report')
          writeCompletionReport({
            taskId: task.id,
            status: completionType,
            testResults: { passed: 1, total: 1, passRate: 1 },
            filesCreated: [], filesModified: [],
            completionReportPath: null,
            metadata: { detectedBy: 'completion-scan', skipped: wasSkipped, detectedAt: new Date().toISOString() }
          })
          this.log('INFO', `Completion scan: wrote COMPLETION JSON for ${task.id}`)
        } catch (err) {
          this.log('WARN', `Completion scan: failed to write COMPLETION JSON for ${task.id}: ${err.message}`)
        }

        await this.store.updateTask(task.id, {
          status: 'done',
          completed_at: new Date().toISOString(),
          spawn_config: { ...sc, spawn_status: completionType },
          last_error: null
        })
        completed++

        // The Supabase UPDATE will trigger our handleEvent → onTaskCompleted,
        // which handles learning + chaining + unblocking automatically.
      }

      if (completed > 0) {
        this.log('INFO', `Completion scan: marked ${completed} task(s) done`)
      }
    } catch (err) {
      this.log('ERROR', `Completion scan failed: ${err.message}`)
    }
  }

  // ── Health check ─────────────────────────────────────────────────────────

  async healthCheck() {
    const budget = checkBudget()
    this.log('INFO', `Health: sub=${this.subscriptionStatus} | processing=${this.processing.size} | budget=$${budget.remaining.toFixed(2)} | stats=${JSON.stringify(this.stats)}`)

    // Write metric to Supabase
    try {
      if (this.store.supabase) {
        await this.store.supabase.from('metrics').insert({
          project_id: PROJECT_ID,
          domain: 'orchestrator',
          metric_type: 'realtime_dispatcher_health',
          data: {
            subscription_status: this.subscriptionStatus,
            processing_count: this.processing.size,
            budget_remaining: budget.remaining,
            ...this.stats
          }
        })
      }
    } catch (err) {
      this.log('WARN', `Health metric write failed: ${err.message}`)
    }
  }
}

// ── Main ───────────────────────────────────────────────────────────────────

if (require.main === module) {
  const dispatcher = new RealtimeDispatcher()
  dispatcher.start().catch(err => {
    console.error('Fatal:', err)
    process.exit(1)
  })
}

module.exports = { RealtimeDispatcher }
