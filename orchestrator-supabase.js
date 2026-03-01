#!/usr/bin/env node
/**
 * Leonida Orchestrator - Supabase Integration
 * 
 * This is what Leonida uses to:
 * - Check for ready tasks to spawn
 * - Update task status after agent completes
 * - Auto-unblock dependent tasks
 * - Maintain DASHBOARD.md
 * - Report status to Telegram
 * 
 * Usage (in Leonida's heartbeat/orchestration loop):
 *   const orchestrator = new OrchestratorSupabase()
 *   
 *   // Check queue
 *   const queue = await orchestrator.getReadyTasks()
 *   
 *   // Update after spawn
 *   await orchestrator.taskSpawned(taskId, agentId, model)
 *   
 *   // Update after completion
 *   await orchestrator.taskCompleted(taskId, result)
 */

const SupabaseTaskClient = require('./supabase-client')
const generateDashboard = require('./generate-dashboard')

class OrchestratorSupabase {
  constructor() {
    this.client = new SupabaseTaskClient()
  }

  // ============== QUEUE INSPECTION ==============

  /**
   * Get all ready tasks, sorted by priority
   */
  async getReadyTasks() {
    return await this.client.getTasksByStatus('ready')
  }

  /**
   * Get current queue summary
   */
  async getQueueStatus() {
    const queue = await this.client.getQueue()
    return {
      ready: queue.ready.length,
      in_progress: queue.in_progress.length,
      blocked: queue.blocked.length,
      done: queue.done.length,
      total: queue.all.length
    }
  }

  /**
   * Check if queue has critical work available
   */
  async hasP0Ready() {
    const ready = await this.getReadyTasks()
    return ready.some(t => t.priority === 1) // 1 = P0
  }

  // ============== LIFECYCLE UPDATES ==============

  /**
   * Mark task as spawned (in_progress)
   * 
   * @param {string} taskId - Task UUID
   * @param {string} agentId - Which agent spawned it (e.g., 'qc', 'dev', 'marketing')
   * @param {string} model - Model used (haiku, kimi, sonnet, etc.)
   */
  async taskSpawned(taskId, agentId, model) {
    console.log(`🚀 Spawning: ${taskId}`)

    await this.client.updateTaskStatus(taskId, 'in_progress', {
      agent_id: agentId,
      model: model,
      spawned_at: new Date().toISOString(),
      spawn_event: 'orchestrator_spawn'
    })

    // Regenerate dashboard
    await this.updateDashboard()
  }

  /**
   * Mark task as completed (done)
   * 
   * @param {string} taskId - Task UUID
   * @param {object} result - { success, output, duration_ms, cost_usd, error?, ... }
   */
  async taskCompleted(taskId, result) {
    console.log(`✅ Completed: ${taskId}`)

    await this.client.updateTaskStatus(taskId, 'done', {
      completed_at: new Date().toISOString(),
      result_success: result.success !== false,
      result_output: result.output || '',
      duration_ms: result.duration_ms || null,
      actual_cost_usd: result.cost_usd || 0,
      result_error: result.error || null,
      completion_event: 'orchestrator_complete'
    })

    // Regenerate dashboard
    await this.updateDashboard()
  }

  /**
   * Mark task as blocked by another task
   */
  async taskBlocked(taskId, blockerTaskId, reason = '') {
    await this.client.updateTaskStatus(taskId, 'blocked', {
      blocked_at: new Date().toISOString(),
      blocked_by: blockerTaskId,
      block_reason: reason
    })

    await this.updateDashboard()
  }

  /**
   * Mark task as unblocked and ready
   */
  async taskUnblocked(taskId, reason = '') {
    await this.client.updateTaskStatus(taskId, 'ready', {
      unblocked_at: new Date().toISOString(),
      unblock_reason: reason
    })

    await this.updateDashboard()
  }

  // ============== DASHBOARD MANAGEMENT ==============

  /**
   * Regenerate DASHBOARD.md from current queue
   * Uses the complete generator (system status + queue)
   */
  async updateDashboard() {
    try {
      // Use complete dashboard generator that includes system status
      const generateDashboardComplete = require('./generate-dashboard-complete')
      await generateDashboardComplete()
    } catch (err) {
      console.warn('⚠️  Failed to update dashboard:', err.message)
    }
  }

  // ============== REPORTING ==============

  /**
   * Get full status report for posting to Telegram
   */
  async getStatusReport() {
    const status = await this.getQueueStatus()
    const summary = await this.client.getSummary()
    const ready = await this.getReadyTasks()

    let report = `📊 **LeadFlow Queue Status**\n\n`
    report += `✅ Ready: ${status.ready}\n`
    report += `⚡ In Progress: ${status.in_progress}\n`
    report += `⏸️ Blocked: ${status.blocked}\n`
    report += `✅ Done: ${status.done}\n\n`

    if (status.blocked > 0) {
      report += `⚠️ **${status.blocked} tasks blocked** — waiting for dependencies\n`
    }

    if (ready.length > 0) {
      report += `\n**Ready to spawn:**\n`
      ready.slice(0, 3).forEach(t => {
        const pri = t.priority === 1 ? '🔴' : '🟡'
        report += `${pri} ${t.title} [$${(t.estimated_cost_usd || 0).toFixed(2)}]\n`
      })
      if (ready.length > 3) {
        report += `...and ${ready.length - 3} more\n`
      }
    }

    return report
  }

  /**
   * Check for stalled work or other alerts
   */
  async checkAlerts() {
    const queue = await this.client.getQueue()
    const alerts = []

    // Alert if too many in-progress
    if (queue.in_progress.length > 20) {
      alerts.push(`⚠️ High concurrency: ${queue.in_progress.length} agents active`)
    }

    // Alert if blocked tasks
    if (queue.blocked.length > 2) {
      alerts.push(`⚠️ Queue congestion: ${queue.blocked.length} blocked tasks`)
    }

    // Alert if no ready tasks
    if (queue.ready.length === 0 && queue.in_progress.length < 5) {
      alerts.push(`⚠️ Starved queue: no ready tasks to spawn`)
    }

    return alerts
  }

  // ============== UTILITIES ==============

  /**
   * Pretty-print queue to console
   */
  async printQueue() {
    await this.client.printQueue()
  }

  /**
   * Find task by name (partial match)
   */
  async findTask(name) {
    const queue = await this.client.getQueue()
    return queue.all.find(t => t.title.includes(name))
  }

  /**
   * Get all P0 critical tasks
   */
  async getCriticalWork() {
    const queue = await this.client.getQueue()
    return queue.all.filter(t => t.priority === 1)
  }
}

// CLI mode
if (require.main === module) {
  const command = process.argv[2] || 'status'
  const orch = new OrchestratorSupabase()

  ;(async () => {
    try {
      switch (command) {
        case 'status':
          const status = await orch.getQueueStatus()
          console.log('\n📊 Queue Status:')
          console.log(`  Ready: ${status.ready}`)
          console.log(`  In Progress: ${status.in_progress}`)
          console.log(`  Blocked: ${status.blocked}`)
          console.log(`  Done: ${status.done}`)
          console.log('')
          const alerts = await orch.checkAlerts()
          if (alerts.length > 0) {
            console.log('⚠️  Alerts:')
            alerts.forEach(a => console.log(`  ${a}`))
          } else {
            console.log('✅ No alerts')
          }
          break

        case 'report':
          const report = await orch.getStatusReport()
          console.log('\n' + report)
          break

        case 'queue':
          await orch.printQueue()
          break

        case 'critical':
          const critical = await orch.getCriticalWork()
          console.log(`\n🔴 ${critical.length} Critical Tasks:`)
          critical.forEach(t => {
            const status = `[${t.status}]`.padEnd(15)
            console.log(`  ${status} ${t.title}`)
          })
          break

        case 'dashboard':
          await orch.updateDashboard()
          console.log('✅ Dashboard updated')
          break

        default:
          console.log(`Usage: node orchestrator-supabase.js [status|report|queue|critical|dashboard]`)
      }
    } catch (err) {
      console.error('Error:', err.message)
      process.exit(1)
    }
  })()
}

module.exports = OrchestratorSupabase
