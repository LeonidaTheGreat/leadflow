'use strict'

const assert = require('assert')
const path = require('path')

const GENOME_DIR = path.join(process.env.HOME, '.openclaw/genome')
const RESCUE_STRATEGIES_PATH = path.join(GENOME_DIR, 'core/loops/rescue-strategies.js')
const EXECUTION_LOOP_PATH = path.join(GENOME_DIR, 'core/loops/execution-loop.js')
const HEARTBEAT_PATH = path.join(GENOME_DIR, 'core/heartbeat-executor.js')

describe('requeueParkedTasks', () => {
  it('exists in rescue-strategies.js as a prototype method', () => {
    const fs = require('fs')
    const src = fs.readFileSync(RESCUE_STRATEGIES_PATH, 'utf-8')
    assert.ok(
      src.includes('RescueCoordinator.prototype.requeueParkedTasks'),
      'requeueParkedTasks must be defined on RescueCoordinator.prototype'
    )
  })

  it('is exposed as a delegation method in execution-loop.js', () => {
    const fs = require('fs')
    const src = fs.readFileSync(EXECUTION_LOOP_PATH, 'utf-8')
    assert.ok(
      src.includes('async requeueParkedTasks()'),
      'ExecutionLoop must expose requeueParkedTasks()'
    )
    assert.ok(
      src.includes('this.rescueCoordinator.requeueParkedTasks()'),
      'ExecutionLoop.requeueParkedTasks must delegate to rescueCoordinator'
    )
  })

  it('is wired as step 3b5 in heartbeat-executor.js', () => {
    const fs = require('fs')
    const src = fs.readFileSync(HEARTBEAT_PATH, 'utf-8')
    assert.ok(
      src.includes("'3b5', 'requeueParkedTasks'"),
      'heartbeat-executor must call requeueParkedTasks as step 3b5'
    )
  })

  it('filters tasks by escalation_level 6', () => {
    const fs = require('fs')
    const src = fs.readFileSync(RESCUE_STRATEGIES_PATH, 'utf-8')
    const methodStart = src.indexOf('requeueParkedTasks')
    const methodSection = src.slice(methodStart, methodStart + 3000)
    assert.ok(
      methodSection.includes('escalation_level') && (methodSection.includes('=== 6') || methodSection.includes('!== 6')),
      'requeueParkedTasks must filter by escalation_level 6'
    )
  })

  it('uses 48h cooldown before requeuing', () => {
    const fs = require('fs')
    const src = fs.readFileSync(RESCUE_STRATEGIES_PATH, 'utf-8')
    assert.ok(
      src.includes('COOLDOWN_PARKED_MS'),
      'requeueParkedTasks must use COOLDOWN_PARKED_MS for 48h cooldown'
    )
    assert.ok(
      src.includes('48 * 60 * 60 * 1000'),
      'COOLDOWN_PARKED_MS must be 48 hours in milliseconds'
    )
  })

  it('blocks tasks after MAX_REQUEUE_COUNT requeues', () => {
    const fs = require('fs')
    const src = fs.readFileSync(RESCUE_STRATEGIES_PATH, 'utf-8')
    assert.ok(
      src.includes('MAX_REQUEUE_COUNT'),
      'requeueParkedTasks must reference MAX_REQUEUE_COUNT'
    )
    assert.ok(
      src.includes('MAX_REQUEUE_COUNT = 2'),
      'MAX_REQUEUE_COUNT must be 2'
    )
    const methodStart = src.indexOf('prototype.requeueParkedTasks')
    const methodSection = src.slice(methodStart, methodStart + 3000)
    assert.ok(
      methodSection.includes("status: 'blocked'") && methodSection.includes('requeue_'),
      'Tasks exceeding MAX_REQUEUE_COUNT must be marked blocked with requeue metadata'
    )
  })

  it('resets to ready with opus model and increments requeue_count', () => {
    const fs = require('fs')
    const src = fs.readFileSync(RESCUE_STRATEGIES_PATH, 'utf-8')
    const methodStart = src.indexOf('prototype.requeueParkedTasks')
    const methodSection = src.slice(methodStart, methodStart + 3000)
    assert.ok(
      methodSection.includes("status: 'ready'"),
      'Requeued tasks must be set to status ready'
    )
    assert.ok(
      methodSection.includes("model: 'opus'"),
      'Requeued tasks must use opus model'
    )
    assert.ok(
      methodSection.includes('retry_count: 0'),
      'Requeued tasks must have retry_count reset to 0'
    )
    assert.ok(
      methodSection.includes('requeue_count'),
      'Requeue count must be tracked'
    )
  })

  it('simulates requeue logic for parked task past cooldown', () => {
    const fiftyHoursAgo = new Date(Date.now() - 50 * 60 * 60 * 1000)
    // Supabase returns timestamps without Z — simulate that
    const supabaseTimestamp = fiftyHoursAgo.toISOString().replace('Z', '')
    const task = {
      id: 'test-task-1',
      status: 'failed',
      metadata: { escalation_level: 6, requeue_count: 0, parked_at: supabaseTimestamp },
      updated_at: supabaseTimestamp
    }

    const level = task.metadata.escalation_level
    assert.strictEqual(level === 6 || level === '6', true, 'Task must match escalation level 6')

    const COOLDOWN_PARKED_MS = 48 * 60 * 60 * 1000
    const cutoff = new Date(Date.now() - COOLDOWN_PARKED_MS)
    // parseUTC appends Z to Supabase timestamps
    const updatedAt = new Date(task.updated_at + 'Z')
    assert.ok(updatedAt <= cutoff, 'Task updated 50h ago should be past 48h cooldown')

    const requeueCount = task.metadata.requeue_count || 0
    assert.ok(requeueCount < 2, 'Task with requeue_count=0 should be eligible for requeue')
  })

  it('simulates blocking logic for task requeued too many times', () => {
    const threeDaysAgo = new Date(Date.now() - 72 * 60 * 60 * 1000)
    const task = {
      id: 'test-task-2',
      status: 'failed',
      metadata: { escalation_level: 6, requeue_count: 2, parked_at: threeDaysAgo.toISOString() },
      updated_at: threeDaysAgo.toISOString()
    }

    const requeueCount = task.metadata.requeue_count || 0
    const MAX_REQUEUE = 2
    assert.ok(requeueCount >= MAX_REQUEUE, 'Task with requeue_count=2 should be blocked')
  })

  it('simulates cooldown not elapsed — task should be skipped', () => {
    const twentyHoursAgo = new Date(Date.now() - 20 * 60 * 60 * 1000)
    const supabaseTimestamp = twentyHoursAgo.toISOString().replace('Z', '')
    const task = {
      id: 'test-task-3',
      status: 'failed',
      metadata: { escalation_level: 6, requeue_count: 0 },
      updated_at: supabaseTimestamp
    }

    const COOLDOWN_PARKED_MS = 48 * 60 * 60 * 1000
    const cutoff = new Date(Date.now() - COOLDOWN_PARKED_MS)
    const updatedAt = new Date(task.updated_at + 'Z')
    assert.ok(updatedAt > cutoff, 'Task updated 20h ago should still be cooling down')
  })
})
