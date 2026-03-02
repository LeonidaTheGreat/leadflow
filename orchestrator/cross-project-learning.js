#!/usr/bin/env node
/**
 * cross-project-learning.js — Cross-Project Knowledge Transfer
 *
 * Extracts generalizable patterns from task outcomes and stores them
 * in a cross-project learnings table. When a new project starts,
 * it queries these learnings to seed initial model selection rules
 * and decomposition strategies.
 *
 * Patterns tracked:
 *   - Task type success rates by model
 *   - Decomposition effectiveness
 *   - Time estimates by task type and complexity
 *   - Common failure modes and their fixes
 *
 * Usage:
 *   const { extractLearnings, applyLearnings } = require('./orchestrator/cross-project-learning')
 *   await extractLearnings('bo2026')  // Extract from current project
 *   const rules = await applyLearnings('new-project')  // Apply to new project
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })
const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')
const { getConfig } = require('../project-config-loader')

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

function getSupabase() {
  if (!supabaseUrl || !supabaseKey) throw new Error('Missing Supabase credentials')
  return createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })
}

/**
 * Extract generalizable learnings from a project's task history.
 * Writes to cross_project_learnings table (or .learnings.json fallback).
 */
async function extractLearnings(projectId) {
  const supabase = getSupabase()
  projectId = projectId || getConfig().project_id

  console.log(`[Cross-Project Learning] Extracting from project: ${projectId}`)

  // Get completed tasks with outcomes
  const { data: tasks, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('project_id', projectId)
    .in('status', ['done', 'failed'])
    .order('completed_at', { ascending: false })
    .limit(500)

  if (error || !tasks || tasks.length === 0) {
    console.log('  No completed tasks to learn from')
    return []
  }

  const learnings = []

  // 1. Model success rates by task type
  const modelStats = {}
  for (const task of tasks) {
    const model = task.model || 'unknown'
    const taskType = extractTaskType(task)
    const key = `${model}:${taskType}`

    if (!modelStats[key]) {
      modelStats[key] = { model, taskType, total: 0, success: 0, totalHours: 0, totalCost: 0 }
    }
    modelStats[key].total++
    if (task.status === 'done') modelStats[key].success++
    modelStats[key].totalHours += task.actual_hours || task.estimated_hours || 1
    modelStats[key].totalCost += task.actual_cost_usd || task.estimated_cost_usd || 0
  }

  for (const [, stats] of Object.entries(modelStats)) {
    if (stats.total < 3) continue // Need minimum sample size
    learnings.push({
      learning_type: 'model_success_rate',
      context: { model: stats.model, task_type: stats.taskType },
      data: {
        success_rate: stats.success / stats.total,
        sample_size: stats.total,
        avg_hours: stats.totalHours / stats.total,
        avg_cost: stats.totalCost / stats.total
      },
      confidence: Math.min(1.0, stats.total / 20) // Confidence grows with sample size
    })
  }

  // 2. Decomposition effectiveness
  const decomposed = tasks.filter(t => t.status === 'done' && t.parent_task_id)
  const notDecomposed = tasks.filter(t => t.status === 'done' && !t.parent_task_id)
  if (decomposed.length >= 3 && notDecomposed.length >= 3) {
    learnings.push({
      learning_type: 'decomposition_effectiveness',
      context: {},
      data: {
        decomposed_success_rate: decomposed.length / (decomposed.length + tasks.filter(t => t.status === 'failed' && t.parent_task_id).length || 1),
        direct_success_rate: notDecomposed.length / (notDecomposed.length + tasks.filter(t => t.status === 'failed' && !t.parent_task_id).length || 1),
        avg_subtask_count: decomposed.length / new Set(decomposed.map(t => t.parent_task_id)).size
      },
      confidence: 0.7
    })
  }

  // 3. Common failure modes
  const failedTasks = tasks.filter(t => t.status === 'failed')
  const failureModes = {}
  for (const task of failedTasks) {
    const reason = task.metadata?.failure_reason || task.metadata?.error_type || 'unknown'
    if (!failureModes[reason]) failureModes[reason] = { count: 0, examples: [] }
    failureModes[reason].count++
    if (failureModes[reason].examples.length < 3) {
      failureModes[reason].examples.push(task.title)
    }
  }

  for (const [reason, data] of Object.entries(failureModes)) {
    if (data.count < 2) continue
    learnings.push({
      learning_type: 'failure_mode',
      context: { reason },
      data: { count: data.count, examples: data.examples },
      confidence: Math.min(1.0, data.count / 10)
    })
  }

  // Write learnings
  await writeLearnings(supabase, projectId, learnings)

  console.log(`  Extracted ${learnings.length} learnings from ${tasks.length} tasks`)
  return learnings
}

/**
 * Apply cross-project learnings to a new project.
 * Returns recommended model selection rules and strategies.
 */
async function applyLearnings(targetProjectId) {
  const supabase = getSupabase()

  console.log(`[Cross-Project Learning] Applying learnings to: ${targetProjectId}`)

  // Try reading from DB first
  const { data: dbLearnings } = await supabase
    .from('cross_project_learnings')
    .select('*')
    .order('confidence', { ascending: false })
    .limit(100)
    .catch(() => ({ data: null }))

  // Fallback to local .learnings.json
  let learnings = dbLearnings
  if (!learnings || learnings.length === 0) {
    const localPath = path.join(__dirname, '..', '.learnings.json')
    if (fs.existsSync(localPath)) {
      try {
        learnings = JSON.parse(fs.readFileSync(localPath, 'utf-8'))
      } catch {
        learnings = []
      }
    }
  }

  if (!learnings || learnings.length === 0) {
    console.log('  No cross-project learnings available')
    return { modelRules: [], strategies: [] }
  }

  // Build recommendations
  const modelRules = []
  const strategies = []

  for (const learning of learnings) {
    switch (learning.learning_type) {
      case 'model_success_rate': {
        const ctx = learning.context || {}
        const data = learning.data || {}
        if (data.success_rate > 0.8 && data.sample_size >= 5) {
          modelRules.push({
            taskType: ctx.task_type,
            recommendedModel: ctx.model,
            successRate: data.success_rate,
            avgCost: data.avg_cost,
            confidence: learning.confidence
          })
        }
        break
      }
      case 'decomposition_effectiveness': {
        const data = learning.data || {}
        if (data.decomposed_success_rate > data.direct_success_rate) {
          strategies.push({
            type: 'prefer_decomposition',
            reason: `Decomposed tasks succeed ${(data.decomposed_success_rate * 100).toFixed(0)}% vs ${(data.direct_success_rate * 100).toFixed(0)}% direct`,
            confidence: learning.confidence
          })
        }
        break
      }
      case 'failure_mode': {
        strategies.push({
          type: 'avoid_failure_mode',
          mode: learning.context?.reason,
          count: learning.data?.count,
          examples: learning.data?.examples
        })
        break
      }
    }
  }

  console.log(`  Applied ${modelRules.length} model rules, ${strategies.length} strategies`)
  return { modelRules, strategies }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function extractTaskType(task) {
  const tags = task.tags || []
  if (tags.includes('spec')) return 'spec'
  if (tags.includes('feature')) return 'feature'
  if (tags.includes('bug-fix')) return 'bug-fix'
  if (tags.includes('build-health')) return 'build-health'
  if (tags.includes('smoke-test')) return 'smoke-test'
  if (tags.includes('revenue')) return 'revenue'
  if (tags.includes('distribution')) return 'distribution'
  const agent = task.agent_id || ''
  if (agent === 'qc') return 'qc-review'
  if (agent === 'design') return 'design'
  if (agent === 'marketing') return 'marketing'
  return 'general'
}

async function writeLearnings(supabase, projectId, learnings) {
  // Try DB first
  try {
    const rows = learnings.map(l => ({
      source_project_id: projectId,
      learning_type: l.learning_type,
      context: l.context,
      data: l.data,
      confidence: l.confidence,
      created_at: new Date().toISOString()
    }))

    const { error } = await supabase
      .from('cross_project_learnings')
      .insert(rows)

    if (!error) return
  } catch {}

  // Fallback: write to local file
  const localPath = path.join(__dirname, '..', '.cross-project-learnings.json')
  const existing = fs.existsSync(localPath)
    ? JSON.parse(fs.readFileSync(localPath, 'utf-8'))
    : []

  const updated = [...existing, ...learnings].slice(-500)
  fs.writeFileSync(localPath, JSON.stringify(updated, null, 2))
}

module.exports = { extractLearnings, applyLearnings }

if (require.main === module) {
  const command = process.argv[2] || 'extract'
  const projectId = process.argv[3]

  if (command === 'extract') {
    extractLearnings(projectId).catch(err => {
      console.error('Fatal:', err)
      process.exit(1)
    })
  } else if (command === 'apply') {
    applyLearnings(projectId || 'test').then(result => {
      console.log('\nRecommendations:')
      console.log(JSON.stringify(result, null, 2))
    }).catch(err => {
      console.error('Fatal:', err)
      process.exit(1)
    })
  }
}
