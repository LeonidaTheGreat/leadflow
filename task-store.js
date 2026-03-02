const fs = require('fs')
const path = require('path')
const dotenv = require('dotenv')
const { getConfig, buildProjectContext } = require('./project-config-loader')

/**
 * TaskStore - Database-backed task management for 8/10 autonomy
 *
 * Features:
 * - CRUD operations for tasks
 * - Dependency management
 * - Real-time subscriptions
 * - Auto-unblocking
 * - Cost tracking
 * - Learning/analytics
 */

class TaskStore {
  constructor() {
    // Self-healing credential resolution: try multiple .env locations
    this._resolveCredentials()

    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      console.warn('⚠️  Supabase credentials not found after trying all .env locations, using local fallback')
      this.useLocalFallback = true
      this.localTasks = []
      this.loadLocalTasks()
    } else {
      // Dynamic import to avoid error when module not installed
      const { createClient } = require('@supabase/supabase-js')
      this.supabase = createClient(supabaseUrl, supabaseKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      })
      this.useLocalFallback = false
    }

    this.projectId = getConfig().project_id
    this.subscribers = []
  }

  /**
   * Try loading Supabase credentials from multiple known locations.
   * Fallback chain:
   *   1. process.env (already loaded by caller's dotenv)
   *   2. __dirname/.env (leadflow project dir)
   *   3. __dirname/.env.local (leadflow project dir)
   *   4. ~/.env (system-level, most durable — agents never touch this)
   */
  _resolveCredentials() {
    if (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return // Already have creds from caller's dotenv
    }

    const envPaths = [
      path.join(__dirname, '.env'),
      path.join(__dirname, '.env.local'),
      path.join(require('os').homedir(), '.env'),
    ]

    for (const envPath of envPaths) {
      if (fs.existsSync(envPath)) {
        const result = dotenv.config({ path: envPath })
        if (!result.error && (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)) {
          console.log(`[TaskStore] Loaded credentials from ${envPath}`)
          return
        }
      }
    }
  }
  
  // Local fallback for development/testing
  loadLocalTasks() {
    const localPath = path.join(process.cwd(), '.local-tasks.json')
    if (fs.existsSync(localPath)) {
      try {
        this.localTasks = JSON.parse(fs.readFileSync(localPath, 'utf-8'))
      } catch (e) {
        this.localTasks = []
      }
    }
  }
  
  saveLocalTasks() {
    const localPath = path.join(process.cwd(), '.local-tasks.json')
    fs.writeFileSync(localPath, JSON.stringify(this.localTasks, null, 2))
  }

  _estimateCost(model, hours = 1) {
    const { estimateCost } = require('./workflow-engine')
    return estimateCost(model, hours)
  }

  // ============== CRUD Operations ==============
  
  async createTask(task) {
    // DUPLICATE PREVENTION: Only block against active tasks (ready/in_progress/blocked).
    // Completed or failed tasks should not prevent new work with the same title.
    const existing = await this.findTaskByTitle(task.title)
    if (existing && !['done', 'failed', 'completed', 'decomposed'].includes(existing.status)) {
      console.warn(`[TaskStore] Duplicate prevented: Task '${task.title}' already active (${existing.id}, status: ${existing.status})`)
      return existing
    }
    
    const taskData = {
      title: task.title,
      description: task.description || '',
      project_id: this.projectId,
      agent_id: task.agent_id || task.agentId || null,
      model: task.model || 'qwen3.5',
      status: task.status || 'backlog',
      priority: task.priority || 3,
      estimated_cost_usd: task.estimated_cost_usd ?? task.estimatedCost ?? this._estimateCost(task.model || 'qwen3.5', task.estimated_hours || task.estimatedHours || 1),
      estimated_hours: task.estimated_hours || task.estimatedHours || 1.00,
      parent_task_id: task.parent_task_id || task.parentTaskId || null,
      acceptance_criteria: task.acceptance_criteria || task.acceptanceCriteria || [],
      tags: task.tags || [],
      metadata: { ...(task.metadata || {}), _project: buildProjectContext() },
      use_case_id: task.use_case_id || null,
      prd_id: task.prd_id || null,
      branch_name: task.branch_name || null,
      pr_number: task.pr_number || null,
      created_at: new Date().toISOString()
    }
    
    if (this.useLocalFallback) {
      const id = `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      const newTask = { id, ...taskData }
      this.localTasks.push(newTask)
      this.saveLocalTasks()
      return newTask
    }
    
    const { data, error } = await this.supabase
      .from('tasks')
      .insert(taskData)
      .select()
      .single()
    
    if (error) throw error
    return data
  }
  
  async getTask(taskId) {
    if (this.useLocalFallback) {
      return this.localTasks.find(t => t.id === taskId) || null
    }
    
    const { data, error } = await this.supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .single()
    
    if (error) throw error
    return data
  }

  async findTaskByTitle(title) {
    if (this.useLocalFallback) {
      return this.localTasks.find(t => t.title === title) || null
    }

    const { data, error } = await this.supabase
      .from('tasks')
      .select('*')
      .eq('title', title)
      .eq('project_id', this.projectId)
      .order('created_at', { ascending: false })

    if (error) throw error
    if (!data || data.length === 0) return null
    // Prefer active tasks over completed/failed ones
    const active = data.find(t => !['done', 'failed', 'completed', 'decomposed'].includes(t.status))
    return active || data[0]
  }
  
  async getTasks(filters = {}) {
    let query = this.useLocalFallback 
      ? null 
      : this.supabase.from('tasks').select('*')
    
    if (filters.status) {
      if (this.useLocalFallback) {
        return this.localTasks.filter(t => t.status === filters.status)
      }
      query = query.eq('status', filters.status)
    }
    
    if (filters.agentId) {
      if (this.useLocalFallback) {
        return this.localTasks.filter(t => t.agent_id === filters.agentId)
      }
      query = query.eq('agent_id', filters.agentId)
    }
    
    if (filters.projectId) {
      if (this.useLocalFallback) {
        return this.localTasks.filter(t => t.project_id === filters.projectId)
      }
      query = query.eq('project_id', filters.projectId)
    }
    
    if (this.useLocalFallback) {
      return this.localTasks
    }
    
    const { data, error } = await query.order('priority', { ascending: true }).order('created_at')
    if (error) throw error
    return data
  }
  
  async updateTask(taskId, updates) {
    const updateData = {
      ...updates,
      updated_at: new Date().toISOString()
    }
    
    if (this.useLocalFallback) {
      const idx = this.localTasks.findIndex(t => t.id === taskId)
      if (idx === -1) throw new Error('Task not found')
      this.localTasks[idx] = { ...this.localTasks[idx], ...updateData }
      this.saveLocalTasks()
      return this.localTasks[idx]
    }
    
    const { data, error } = await this.supabase
      .from('tasks')
      .update(updateData)
      .eq('id', taskId)
      .select()
      .single()
    
    if (error) throw error
    
    // Check if this unblocks other tasks
    if (updates.status === 'done') {
      await this.checkUnblockedTasks(taskId)
    }
    
    return data
  }
  
  async deleteTask(taskId) {
    if (this.useLocalFallback) {
      this.localTasks = this.localTasks.filter(t => t.id !== taskId)
      this.saveLocalTasks()
      return true
    }
    
    const { error } = await this.supabase
      .from('tasks')
      .delete()
      .eq('id', taskId)
    
    if (error) throw error
    return true
  }
  
  // ============== Dependencies ==============
  
  async addDependency(taskId, dependsOnTaskId, type = 'hard') {
    if (this.useLocalFallback) {
      const task = this.localTasks.find(t => t.id === taskId)
      if (!task) throw new Error('Task not found')
      if (!task.dependencies) task.dependencies = []
      task.dependencies.push({ taskId: dependsOnTaskId, type })
      
      // Check if should be blocked
      const depTask = this.localTasks.find(t => t.id === dependsOnTaskId)
      if (depTask && depTask.status !== 'done') {
        task.status = 'blocked'
      }
      
      this.saveLocalTasks()
      return true
    }
    
    const { error } = await this.supabase
      .from('task_dependencies')
      .insert({
        task_id: taskId,
        depends_on_task_id: dependsOnTaskId,
        dependency_type: type
      })
    
    if (error) throw error
    
    // Update task status to blocked
    await this.updateTask(taskId, { status: 'blocked' })
    
    return true
  }
  
  async getDependencies(taskId) {
    if (this.useLocalFallback) {
      const task = this.localTasks.find(t => t.id === taskId)
      return task?.dependencies || []
    }
    
    const { data, error } = await this.supabase
      .from('task_dependencies')
      .select('depends_on_task_id, dependency_type')
      .eq('task_id', taskId)
    
    if (error) throw error
    return data
  }
  
  async getDependents(taskId) {
    if (this.useLocalFallback) {
      return this.localTasks.filter(t => 
        t.dependencies?.some(d => d.taskId === taskId)
      )
    }
    
    const { data, error } = await this.supabase
      .from('task_dependencies')
      .select('task_id')
      .eq('depends_on_task_id', taskId)
    
    if (error) throw error
    return data.map(d => d.task_id)
  }
  
  // ============== Ready Tasks (Dependencies Met) ==============
  
  async getReadyTasks() {
    if (this.useLocalFallback) {
      return this.localTasks.filter(t => {
        if (t.status !== 'ready' && t.status !== 'backlog') return false
        
        // Check all dependencies done
        const deps = t.dependencies || []
        const allDone = deps.every(d => {
          const depTask = this.localTasks.find(dt => dt.id === d.taskId)
          return depTask && depTask.status === 'done'
        })
        
        if (allDone && t.status === 'backlog') {
          t.status = 'ready'
          this.saveLocalTasks()
        }
        
        return allDone || deps.length === 0
      }).sort((a, b) => a.priority - b.priority)
    }
    
    const { data, error } = await this.supabase
      .rpc('get_ready_tasks', { p_project_id: this.projectId })
    
    if (error) throw error
    return data
  }
  
  async checkUnblockedTasks(completedTaskId) {
    console.log(`[TaskStore] Checking tasks unblocked by: ${completedTaskId}`)
    
    if (this.useLocalFallback) {
      const unblocked = this.localTasks.filter(t => {
        const deps = t.dependencies || []
        const wasBlocked = t.status === 'blocked'
        const dependsOnCompleted = deps.some(d => d.taskId === completedTaskId)
        
        if (wasBlocked && dependsOnCompleted) {
          // Check if all deps now done
          const allDone = deps.every(d => {
            const depTask = this.localTasks.find(dt => dt.id === d.taskId)
            return depTask && depTask.status === 'done'
          })
          
          if (allDone) {
            t.status = 'ready'
            console.log(`[TaskStore] Task unblocked: ${t.title}`)
          }
        }
        
        return wasBlocked && dependsOnCompleted
      })
      
      this.saveLocalTasks()
      return unblocked
    }
    
    const { data, error } = await this.supabase
      .rpc('check_unblocked_tasks', { p_completed_task_id: completedTaskId })
    
    if (error) throw error
    
    // Update unblocked tasks to ready
    for (const row of data || []) {
      await this.updateTask(row.unblocked_task_id, { status: 'ready' })
      console.log(`[TaskStore] Task unblocked: ${row.task_title}`)
    }
    
    return data
  }
  
  // ============== Real-time Subscriptions ==============
  
  subscribeToChanges(callback) {
    if (this.useLocalFallback) {
      console.log('[TaskStore] Local mode - subscriptions not available')
      return { unsubscribe: () => {} }
    }
    
    const subscription = this.supabase
      .channel('tasks')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'tasks',
        filter: `project_id=eq.${this.projectId}`
      }, (payload) => {
        console.log('[Realtime] Task change:', payload.new?.id, payload.new?.status)
        callback(payload)
        
        // If task completed, check for unblocked
        if (payload.new?.status === 'done' && payload.old?.status !== 'done') {
          this.checkUnblockedTasks(payload.new.id)
        }
      })
      .subscribe()
    
    this.subscribers.push(subscription)
    return subscription
  }
  
  // ============== Cost Tracking ==============
  
  async recordCost(taskId, costUsd) {
    return this.updateTask(taskId, { 
      actual_cost_usd: costUsd,
      updated_at: new Date().toISOString()
    })
  }
  
  async getDailySpend(date = new Date().toISOString().split('T')[0]) {
    if (this.useLocalFallback) {
      return this.localTasks
        .filter(t => t.completed_at?.startsWith(date))
        .reduce((sum, t) => sum + (t.actual_cost_usd || 0), 0)
    }
    
    const { data, error } = await this.supabase
      .from('tasks')
      .select('actual_cost_usd')
      .gte('completed_at', date)
      .lt('completed_at', date + 'T23:59:59')
    
    if (error) throw error
    return data.reduce((sum, t) => sum + (t.actual_cost_usd || 0), 0)
  }
  
  // ============== Outcomes & Learning ==============
  
  async recordOutcome(taskId, outcome) {
    if (this.useLocalFallback) {
      // Store in metadata
      const task = this.localTasks.find(t => t.id === taskId)
      if (task) {
        task.outcome = outcome
        this.saveLocalTasks()
      }
      return true
    }
    
    const { error } = await this.supabase.rpc('record_task_outcome', {
      p_task_id: taskId,
      p_success: outcome.success,
      p_duration_minutes: outcome.durationMinutes,
      p_cost_usd: outcome.costUsd,
      p_error_type: outcome.errorType
    })
    
    if (error) throw error
    return true
  }
  
  async getModelPerformance() {
    if (this.useLocalFallback) {
      // Simple aggregation
      const stats = {}
      this.localTasks.forEach(t => {
        if (!t.outcome) return
        const key = `${t.agent_id}-${t.model}`
        if (!stats[key]) {
          stats[key] = { agent: t.agent_id, model: t.model, total: 0, success: 0 }
        }
        stats[key].total++
        if (t.outcome.success) stats[key].success++
      })
      return Object.values(stats)
    }
    
    const { data, error } = await this.supabase
      .rpc('analyze_model_performance')
    
    if (error) throw error
    return data
  }
  
  // ============== Decomposition ==============
  
  async decomposeTask(parentTaskId, subtasks) {
    const parent = await this.getTask(parentTaskId)
    if (!parent) throw new Error('Parent task not found')
    
    const created = []
    const subtaskIds = []
    
    for (const subtask of subtasks) {
      const createdTask = await this.createTask({
        ...subtask,
        parentTaskId,
        decompositionLevel: (parent.decomposition_level || 0) + 1,
        status: 'backlog' // Will be set to ready if no deps
      })
      
      created.push(createdTask)
      subtaskIds.push(createdTask.id)
    }
    
    // Set up dependencies: subtask N depends on subtask N-1
    for (let i = 1; i < created.length; i++) {
      await this.addDependency(created[i].id, created[i-1].id, 'hard')
    }
    
    // Update parent to decomposed
    await this.updateTask(parentTaskId, { 
      status: 'decomposed',
      metadata: { ...parent.metadata, subtaskIds }
    })
    
    return created
  }
  
  // ============== Completed Work Context ==============

  /**
   * Query related completed work for a use case.
   * Used to inject "already done" context into chained tasks and spawn messages,
   * preventing dev agents from re-implementing existing work.
   *
   * Queries 3 sources:
   *   1. completed_work table by use_case
   *   2. tasks table (status=done) by use_case_id
   *   3. tasks table (status=done) by tag overlap
   *
   * All queries are non-fatal — failures return empty results with a warning.
   * @returns {Array<{source: string, name: string, description: string, category: string, agent: string}>}
   */
  async getRelatedCompletedWork(useCaseId, tags = []) {
    if (this.useLocalFallback) {
      // Local fallback: return done tasks matching use_case_id
      return this.localTasks
        .filter(t => t.status === 'done' && t.use_case_id === useCaseId)
        .slice(0, 20)
        .map(t => ({ source: 'tasks', name: t.title, description: t.description, category: null, agent: t.agent_id }))
    }

    const results = []
    const seen = new Set()

    function addUnique(item) {
      const key = `${item.source}:${item.name}`
      if (seen.has(key)) return
      seen.add(key)
      results.push(item)
    }

    // 1. completed_work table by use_case
    try {
      const { data, error } = await this.supabase
        .from('completed_work')
        .select('work_name, description, category')
        .eq('project_id', this.projectId)
        .eq('use_case', useCaseId)
        .eq('status', 'COMPLETE')
        .limit(20)

      if (!error && data) {
        for (const row of data) {
          addUnique({ source: 'completed_work', name: row.work_name, description: row.description || '', category: row.category || '', agent: '' })
        }
      }
    } catch (err) {
      console.warn(`[TaskStore] completed_work query failed (non-fatal): ${err.message}`)
    }

    // 2. Done tasks by use_case_id
    try {
      const { data, error } = await this.supabase
        .from('tasks')
        .select('title, description, agent_id')
        .eq('project_id', this.projectId)
        .eq('use_case_id', useCaseId)
        .eq('status', 'done')
        .limit(20)

      if (!error && data) {
        for (const row of data) {
          addUnique({ source: 'tasks', name: row.title, description: row.description || '', category: '', agent: row.agent_id || '' })
        }
      }
    } catch (err) {
      console.warn(`[TaskStore] done-tasks-by-uc query failed (non-fatal): ${err.message}`)
    }

    // 3. Done tasks by tag overlap (only if tags provided)
    if (tags.length > 0) {
      try {
        const { data, error } = await this.supabase
          .from('tasks')
          .select('title, description, agent_id')
          .eq('project_id', this.projectId)
          .eq('status', 'done')
          .overlaps('tags', tags)
          .limit(20)

        if (!error && data) {
          for (const row of data) {
            addUnique({ source: 'tasks-tags', name: row.title, description: row.description || '', category: '', agent: row.agent_id || '' })
          }
        }
      } catch (err) {
        console.warn(`[TaskStore] done-tasks-by-tags query failed (non-fatal): ${err.message}`)
      }
    }

    return results
  }

  // ============== Utility ==============
  
  async exportTasks() {
    const tasks = await this.getTasks({ projectId: this.projectId })
    const exportPath = path.join(process.cwd(), `tasks-export-${Date.now()}.json`)
    fs.writeFileSync(exportPath, JSON.stringify(tasks, null, 2))
    return exportPath
  }
  
  async importTasks(tasksData) {
    const created = []
    for (const task of tasksData) {
      delete task.id // Let DB generate new IDs
      const newTask = await this.createTask(task)
      created.push(newTask)
    }
    return created
  }
}

module.exports = { TaskStore }
