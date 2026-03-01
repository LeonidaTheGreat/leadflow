#!/usr/bin/env node
/**
 * Supabase Task Client - Orchestrator Integration
 * 
 * Maintains Supabase `tasks` table as single source of truth.
 * Used by Leonida (orchestrator) to:
 * - Fetch current queue
 * - Update task status
 * - Log agent results
 * - Track costs
 * - Auto-unblock dependencies
 * 
 * Usage:
 *   const client = new SupabaseTaskClient()
 *   const queue = await client.getQueue()
 *   await client.updateTaskStatus(taskId, 'done', { agent_id: 'qc', result: '...' })
 */

const { createClient } = require('@supabase/supabase-js')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '.env') })

class SupabaseTaskClient {
  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env')
    }

    this.supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    this.projectId = 'bo2026'
  }

  // ============== QUEUE OPERATIONS ==============

  /**
   * Get all tasks for project, organized by status
   */
  async getQueue() {
    const { data: tasks, error } = await this.supabase
      .from('tasks')
      .select('*')
      .eq('project_id', this.projectId)
      .order('priority', { ascending: true })
      .order('created_at', { ascending: true })

    if (error) throw new Error(`Failed to fetch queue: ${error.message}`)

    return {
      all: tasks || [],
      ready: (tasks || []).filter(t => t.status === 'ready'),
      in_progress: (tasks || []).filter(t => t.status === 'in_progress'),
      blocked: (tasks || []).filter(t => t.status === 'blocked'),
      done: (tasks || []).filter(t => t.status === 'done'),
      backlog: (tasks || []).filter(t => t.status === 'backlog')
    }
  }

  /**
   * Get tasks by status
   */
  async getTasksByStatus(status) {
    const { data, error } = await this.supabase
      .from('tasks')
      .select('*')
      .eq('project_id', this.projectId)
      .eq('status', status)
      .order('priority', { ascending: true })

    if (error) throw new Error(`Failed to fetch tasks: ${error.message}`)
    return data || []
  }

  /**
   * Get single task
   */
  async getTask(taskId) {
    const { data, error } = await this.supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .single()

    if (error) throw new Error(`Failed to fetch task: ${error.message}`)
    return data
  }

  // ============== STATUS UPDATES ==============

  /**
   * Update task status and log metadata
   * 
   * @param {string} taskId - Task UUID
   * @param {string} newStatus - ready|in_progress|blocked|done|backlog
   * @param {object} metadata - { agent_id, result, cost_usd, duration_ms, error, ... }
   */
  async updateTaskStatus(taskId, newStatus, metadata = {}) {
    const validStatuses = ['backlog', 'ready', 'blocked', 'in_progress', 'done']
    
    if (!validStatuses.includes(newStatus)) {
      throw new Error(`Invalid status: ${newStatus}. Must be one of: ${validStatuses.join(', ')}`)
    }

    // Get current task
    const task = await this.getTask(taskId)
    if (!task) throw new Error(`Task not found: ${taskId}`)

    // Build update
    const update = {
      status: newStatus,
      metadata: {
        ...task.metadata,
        last_status_update: new Date().toISOString(),
        ...metadata
      }
    }

    // Update in database
    const { error } = await this.supabase
      .from('tasks')
      .update(update)
      .eq('id', taskId)

    if (error) throw new Error(`Failed to update task: ${error.message}`)

    console.log(`✅ Task [${taskId}] status → ${newStatus}`)

    // If task completed, check for unblocked dependencies
    if (newStatus === 'done') {
      await this.checkAndUnblockDependents(taskId)
    }

    return true
  }

  // ============== DEPENDENCY MANAGEMENT ==============

  /**
   * Check if any blocked tasks depend on this task
   * If all their dependencies are done, unblock them
   */
  async checkAndUnblockDependents(taskId) {
    // Find all blocked tasks
    const blocked = await this.getTasksByStatus('blocked')

    for (const task of blocked) {
      // Check if this task is a parent dependency
      if (task.parent_task_id === taskId) {
        // For now, simple parent dependency - unblock immediately
        await this.updateTaskStatus(task.id, 'ready', {
          unblocked_by: taskId,
          unblock_reason: 'parent task completed'
        })
        console.log(`🔓 Unblocked: ${task.title}`)
      }
    }
  }

  /**
   * Create a new task
   */
  async createTask(taskData) {
    const newTask = {
      project_id: this.projectId,
      title: taskData.title,
      description: taskData.description || '',
      agent_id: taskData.agent_id || null,
      model: taskData.model || 'qwen3.5',
      status: taskData.status || 'backlog',
      priority: taskData.priority || 3,
      estimated_cost_usd: taskData.estimated_cost_usd || 0.0,
      estimated_hours: taskData.estimated_hours || 1.0,
      parent_task_id: taskData.parent_task_id || null,
      acceptance_criteria: taskData.acceptance_criteria || [],
      tags: taskData.tags || [],
      metadata: taskData.metadata || {},
      use_case_id: taskData.use_case_id || null,
      prd_id: taskData.prd_id || null,
      branch_name: taskData.branch_name || null,
      pr_number: taskData.pr_number || null,
      created_at: new Date().toISOString()
    }

    const { data, error } = await this.supabase
      .from('tasks')
      .insert(newTask)
      .select()
      .single()

    if (error) throw new Error(`Failed to create task: ${error.message}`)
    return data
  }

  /**
   * Update task fields
   */
  async updateTask(taskId, updates) {
    const { error } = await this.supabase
      .from('tasks')
      .update(updates)
      .eq('id', taskId)

    if (error) throw new Error(`Failed to update task: ${error.message}`)
    return true
  }

  // ============== REPORTING ==============

  /**
   * Generate queue summary for dashboard
   */
  async getSummary() {
    const queue = await this.getQueue()
    const costSum = queue.all.reduce((sum, t) => sum + (t.estimated_cost_usd || 0), 0)

    return {
      timestamp: new Date().toISOString(),
      project_id: this.projectId,
      total: queue.all.length,
      ready: queue.ready.length,
      in_progress: queue.in_progress.length,
      blocked: queue.blocked.length,
      done: queue.done.length,
      backlog: queue.backlog.length,
      total_estimated_cost: costSum.toFixed(2),
      queue_health: {
        has_ready: queue.ready.length > 0,
        has_blockers: queue.blocked.length > 0,
        active: queue.in_progress.length
      }
    }
  }

  /**
   * Print queue to console
   */
  async printQueue(verbose = false) {
    const queue = await this.getQueue()

    console.log('\n📋 QUEUE STATUS')
    console.log('================')
    console.log(`Ready: ${queue.ready.length} | In Progress: ${queue.in_progress.length} | Blocked: ${queue.blocked.length} | Done: ${queue.done.length}\n`)

    if (queue.ready.length > 0) {
      console.log('▶️  READY TO SPAWN:')
      queue.ready.forEach(t => {
        console.log(`   • ${t.title} [${t.model}] $${t.estimated_cost_usd?.toFixed(2) || '0.00'}`)
      })
      console.log('')
    }

    if (queue.in_progress.length > 0) {
      console.log('⚡ IN PROGRESS:')
      queue.in_progress.forEach(t => {
        const agent = t.agent_id ? `[${t.agent_id}]` : ''
        console.log(`   • ${t.title} ${agent}`)
      })
      console.log('')
    }

    if (queue.blocked.length > 0) {
      console.log('⏸️  BLOCKED:')
      queue.blocked.forEach(t => {
        const parent = t.parent_task_id ? `[waiting for parent]` : ''
        console.log(`   • ${t.title} ${parent}`)
      })
      console.log('')
    }
  }
}

// CLI mode
if (require.main === module) {
  const command = process.argv[2] || 'queue'

  const client = new SupabaseTaskClient()

  ;(async () => {
    try {
      switch (command) {
        case 'queue':
          await client.printQueue()
          break

        case 'summary':
          const summary = await client.getSummary()
          console.log(JSON.stringify(summary, null, 2))
          break

        case 'watch':
          console.log('🔄 Watching queue (refresh every 5s)...\n')
          setInterval(async () => {
            console.clear()
            console.log(`[${new Date().toLocaleTimeString()}] Queue status:\n`)
            await client.printQueue()
          }, 5000)
          break

        default:
          console.log(`Usage: node supabase-client.js [queue|summary|watch]`)
      }
    } catch (err) {
      console.error('Error:', err.message)
      process.exit(1)
    }
  })()
}

module.exports = SupabaseTaskClient
