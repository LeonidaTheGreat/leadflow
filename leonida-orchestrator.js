/**
 * Leonida Orchestrator - Ready-to-use interface for BO2026
 * 
 * This is what Leonida loads in her main session to manage tasks.
 * 
 * Example:
 *   const leonida = require('./leonida-orchestrator.js')
 *   
 *   // In heartbeat
 *   const status = await leonida.status()
 *   
 *   // When spawning
 *   await leonida.spawn(taskId, agentType, model)
 *   
 *   // When agent completes
 *   await leonida.done(taskId, result)
 */

const OrchestratorSupabase = require('./orchestrator-supabase')

class LeonidaOrchestrator {
  constructor() {
    this.orch = new OrchestratorSupabase()
  }

  /**
   * Get current queue status (for heartbeat reports)
   */
  async status() {
    const queue = await this.orch.getQueueStatus()
    const alerts = await this.orch.checkAlerts()
    
    return {
      queue,
      alerts,
      hasWork: queue.ready > 0,
      hasBlockers: queue.blocked > 0,
      activeTasks: queue.in_progress
    }
  }

  /**
   * Get ready tasks (what can I spawn?)
   */
  async ready() {
    return await this.orch.getReadyTasks()
  }

  /**
   * I'm about to spawn a task
   * @param {string} taskId - Task UUID from Supabase
   * @param {string} agentType - 'qc', 'dev', 'marketing', 'product', 'analytics'
   * @param {string} model - 'haiku', 'kimi', 'sonnet', etc.
   */
  async spawn(taskId, agentType, model) {
    console.log(`🚀 Leonida spawning: ${agentType} [${model}]`)
    await this.orch.taskSpawned(taskId, agentType, model)
  }

  /**
   * An agent just finished
   * @param {string} taskId - Task UUID
   * @param {object} result - { success, output?, duration_ms?, cost_usd?, error? }
   */
  async done(taskId, result) {
    console.log(`✅ Leonida completing: ${taskId}`)
    await this.orch.taskCompleted(taskId, result)
  }

  /**
   * Get a Telegram-ready status report
   */
  async report() {
    return await this.orch.getStatusReport()
  }

  /**
   * Pretty print queue
   */
  async queue() {
    await this.orch.printQueue()
  }

  /**
   * Find a task by partial name match
   */
  async find(taskName) {
    return await this.orch.findTask(taskName)
  }

  /**
   * Get all critical (P0) work
   */
  async critical() {
    return await this.orch.getCriticalWork()
  }

  /**
   * Update dashboard
   */
  async updateDashboard() {
    await this.orch.updateDashboard()
  }
}

module.exports = new LeonidaOrchestrator()
