#!/usr/bin/env node
/**
 * Query Project Data from Supabase
 * 
 * Fetches all dashboard data from new tables:
 * - project_metadata
 * - system_components
 * - agents
 * - completed_work
 * - action_items
 * - cost_tracking
 * - tasks (existing queue table)
 * 
 * Returns unified project object for dashboard generation.
 */

const { createClient } = require('@supabase/supabase-js')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '.env') })

class ProjectQuery {
  constructor(projectId = 'bo2026') {
    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    }

    this.supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    this.projectId = projectId
  }

  /**
   * Fetch all project data (single query)
   */
  async getFullProject() {
    const [
      metadata,
      components,
      agents,
      work,
      items,
      costs,
      queue
    ] = await Promise.all([
      this.getProjectMetadata(),
      this.getSystemComponents(),
      this.getAgents(),
      this.getCompletedWork(),
      this.getActionItems(),
      this.getCostTracking(),
      this.getTaskQueue()
    ])

    return {
      metadata,
      components,
      agents,
      completed_work: work,
      action_items: items,
      cost_tracking: costs,
      task_queue: queue,
      timestamp: new Date().toISOString()
    }
  }

  // ============== Individual Queries ==============

  async getProjectMetadata() {
    const { data, error } = await this.supabase
      .from('project_metadata')
      .select('*')
      .eq('project_id', this.projectId)
      .single()

    if (error) console.warn('⚠️  Failed to fetch project metadata:', error.message)
    return data || {}
  }

  async getSystemComponents() {
    const { data, error } = await this.supabase
      .from('system_components')
      .select('*')
      .eq('project_id', this.projectId)
      .order('category', { ascending: true })
      .order('component_name', { ascending: true })

    if (error) console.warn('⚠️  Failed to fetch components:', error.message)
    
    // Group by category
    const grouped = {}
    ;(data || []).forEach(comp => {
      if (!grouped[comp.category]) grouped[comp.category] = []
      grouped[comp.category].push(comp)
    })

    return grouped
  }

  async getAgents() {
    const { data, error } = await this.supabase
      .from('agents')
      .select('*')
      .eq('project_id', this.projectId)
      .order('agent_type', { ascending: true })

    if (error) console.warn('⚠️  Failed to fetch agents:', error.message)
    return data || []
  }

  async getCompletedWork() {
    const { data, error } = await this.supabase
      .from('completed_work')
      .select('*')
      .eq('project_id', this.projectId)
      .eq('status', 'COMPLETE')
      .order('completed_date', { ascending: false })

    if (error) console.warn('⚠️  Failed to fetch completed work:', error.message)
    return data || []
  }

  async getActionItems() {
    const { data, error } = await this.supabase
      .from('action_items')
      .select('*')
      .eq('project_id', this.projectId)
      .neq('status', 'RESOLVED')
      .order('priority', { ascending: true })
      .order('created_at', { ascending: true })

    if (error) console.warn('⚠️  Failed to fetch action items:', error.message)
    
    // Separate blockers and outstanding items
    const blockers = (data || []).filter(i => i.type === 'BLOCKER')
    const outstanding = (data || []).filter(i => i.type !== 'BLOCKER')

    return { blockers, outstanding, all: data || [] }
  }

  async getCostTracking() {
    const { data, error } = await this.supabase
      .from('cost_tracking')
      .select('*')
      .eq('project_id', this.projectId)
      .order('budget_period', { ascending: true })

    if (error) console.warn('⚠️  Failed to fetch cost tracking:', error.message)
    return data || []
  }

  async getTaskQueue() {
    const { data, error } = await this.supabase
      .from('tasks')
      .select('*')
      .eq('project_id', this.projectId)
      .order('priority', { ascending: true })

    if (error) console.warn('⚠️  Failed to fetch tasks:', error.message)

    return {
      all: data || [],
      ready: (data || []).filter(t => t.status === 'ready'),
      in_progress: (data || []).filter(t => t.status === 'in_progress'),
      blocked: (data || []).filter(t => t.status === 'blocked'),
      done: (data || []).filter(t => t.status === 'done')
    }
  }

  // ============== Update Operations ==============

  /**
   * Update project metadata
   */
  async updateProjectMetadata(updates) {
    const { error } = await this.supabase
      .from('project_metadata')
      .update({ ...updates, last_updated: new Date().toISOString() })
      .eq('project_id', this.projectId)

    if (error) throw new Error(`Failed to update metadata: ${error.message}`)
    return true
  }

  /**
   * Update system component status
   */
  async updateComponent(componentName, status, details = null) {
    const { error } = await this.supabase
      .from('system_components')
      .update({
        status,
        status_emoji: this._getEmoji(status),
        details: details || undefined,
        last_checked: new Date().toISOString()
      })
      .eq('project_id', this.projectId)
      .eq('component_name', componentName)

    if (error) throw new Error(`Failed to update component: ${error.message}`)
    return true
  }

  /**
   * Update agent status
   */
  async updateAgent(agentName, updates) {
    const { error } = await this.supabase
      .from('agents')
      .update({ ...updates, last_activity: new Date().toISOString() })
      .eq('project_id', this.projectId)
      .eq('agent_name', agentName)

    if (error) throw new Error(`Failed to update agent: ${error.message}`)
    return true
  }

  /**
   * Resolve action item
   */
  async resolveActionItem(itemId) {
    const { error } = await this.supabase
      .from('action_items')
      .update({
        status: 'RESOLVED',
        updated_at: new Date().toISOString()
      })
      .eq('id', itemId)

    if (error) throw new Error(`Failed to resolve action item: ${error.message}`)
    return true
  }

  /**
   * Add action item
   */
  async addActionItem(title, type, description, awaitingInput, impact = null) {
    const { data, error } = await this.supabase
      .from('action_items')
      .insert({
        project_id: this.projectId,
        title,
        type,
        status: 'OPEN',
        priority: type === 'BLOCKER' ? 1 : 2,
        description,
        awaiting_input: awaitingInput,
        impact: impact || null
      })
      .select()
      .single()

    if (error) throw new Error(`Failed to add action item: ${error.message}`)
    return data
  }

  // ============== Utilities ==============

  _getEmoji(status) {
    const map = {
      LIVE: '✅',
      READY: '✅',
      TESTED: '✅',
      TESTING: '⏳',
      DOWN: '❌',
      PENDING: '🟡',
      WAITING: '🟡'
    }
    return map[status] || '❓'
  }

  /**
   * Print project summary to console
   */
  async printSummary() {
    const project = await this.getFullProject()

    console.log('\n📊 PROJECT SUMMARY')
    console.log('=================')
    console.log(`Project: ${project.metadata.project_name}`)
    console.log(`Goal: ${project.metadata.goal}`)
    console.log(`Status: ${project.metadata.status_color} ${project.metadata.overall_status}`)
    console.log('')

    console.log('🔧 System Components:')
    Object.entries(project.components).forEach(([cat, comps]) => {
      const healthy = comps.filter(c => c.status === 'LIVE' || c.status === 'READY').length
      console.log(`  ${cat}: ${healthy}/${comps.length} healthy`)
    })
    console.log('')

    console.log('🤖 Agents:')
    project.agents.forEach(agent => {
      console.log(`  ${agent.status_emoji} ${agent.agent_name} (${agent.progress_percent}%)`)
    })
    console.log('')

    console.log('📋 Queue Health:')
    console.log(`  Ready: ${project.task_queue.ready.length}`)
    console.log(`  In Progress: ${project.task_queue.in_progress.length}`)
    console.log(`  Blocked: ${project.task_queue.blocked.length}`)
    console.log(`  Done: ${project.task_queue.done.length}`)
    console.log('')

    console.log('⚠️  Action Items:')
    project.action_items.blockers.forEach(item => {
      console.log(`  🔴 ${item.title} — awaiting: ${item.awaiting_input}`)
    })
    console.log('')

    console.log('💰 Budget:')
    const cost = project.cost_tracking[0]
    if (cost) {
      console.log(`  Estimated: $${cost.estimated_cost_usd.toFixed(2)}`)
      console.log(`  Budget: $${cost.budget_limit_usd.toFixed(2)}`)
      console.log(`  Spent: ${cost.spend_percent.toFixed(1)}%`)
    }
  }
}

// CLI mode
if (require.main === module) {
  const command = process.argv[2] || 'summary'
  const query = new ProjectQuery()

  ;(async () => {
    try {
      switch (command) {
        case 'summary':
          await query.printSummary()
          break

        case 'full':
          const project = await query.getFullProject()
          console.log(JSON.stringify(project, null, 2))
          break

        case 'components':
          const components = await query.getSystemComponents()
          console.log(JSON.stringify(components, null, 2))
          break

        case 'agents':
          const agents = await query.getAgents()
          console.log(JSON.stringify(agents, null, 2))
          break

        case 'items':
          const items = await query.getActionItems()
          console.log(JSON.stringify(items, null, 2))
          break

        default:
          console.log(`Usage: node query-project.js [summary|full|components|agents|items]`)
      }
    } catch (err) {
      console.error('Error:', err.message)
      process.exit(1)
    }
  })()
}

module.exports = ProjectQuery
