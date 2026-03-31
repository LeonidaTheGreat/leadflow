#!/usr/bin/env node
/**
 * scripts/check-revenue-alert-no-dup.js
 * 
 * Acceptance check: Verify no duplicate revenue alert tasks are created.
 * 
 * Exit code:
 *   pass = PASS (idempotency verified)
 *   fail = FAIL (duplicates found or check error)
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.LOCAL_POSTGREST_URL || 'http://localhost:8787'
const supabaseKey = process.env.LEADFLOW_API_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseKey) {
  console.error('Missing LEADFLOW_API_KEY')
  console.log('fail')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function checkNoDuplicate() {
  try {
    // Get all revenue alert tasks created in the last 2 hours
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('id,title,created_at,agent_id,status')
      .like('title', '%Revenue alert%')
      .gte('created_at', twoHoursAgo)
      .order('title', { ascending: true })
    
    if (error) {
      console.error('[ERROR] Database query failed:', error.message)
      console.log('fail')
      return
    }
    
    if (!tasks || tasks.length === 0) {
      console.log('[OK] No revenue alert tasks found')
      console.log('pass')
      return
    }
    
    // Group by title and check for duplicates
    const tasksByTitle = {}
    for (const task of tasks) {
      if (!tasksByTitle[task.title]) {
        tasksByTitle[task.title] = []
      }
      tasksByTitle[task.title].push(task)
    }
    
    // Check for violation: multiple ACTIVE tasks with same title
    let violations = 0
    for (const [title, titleTasks] of Object.entries(tasksByTitle)) {
      const activeTasks = titleTasks.filter(t => ['ready', 'in_progress', 'spawned'].includes(t.status))
      
      if (activeTasks.length > 1) {
        console.error(`[FAIL] Duplicate found: "${title}" has ${activeTasks.length} active tasks`)
        violations++
      }
    }
    
    // Check for rapid-fire pattern (multiple creates within 15min = loop symptom)
    let patternViolations = 0
    for (const [title, titleTasks] of Object.entries(tasksByTitle)) {
      const sorted = titleTasks.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      
      for (let i = 0; i < sorted.length - 1; i++) {
        const timeDiff = new Date(sorted[i + 1].created_at) - new Date(sorted[i].created_at)
        const minutesDiff = timeDiff / (60 * 1000)
        
        if (minutesDiff < 15 && ['ready', 'in_progress', 'spawned'].includes(sorted[i + 1].status)) {
          console.error(`[FAIL] Loop pattern: "${title}" created ${minutesDiff.toFixed(1)}min apart`)
          patternViolations++
        }
      }
    }
    
    if (violations === 0 && patternViolations === 0) {
      console.log('[OK] No duplicate revenue alert tasks')
      console.log('pass')
    } else {
      console.log(`[FAIL] ${violations + patternViolations} issue(s) found`)
      console.log('fail')
    }
    
  } catch (err) {
    console.error('[ERROR]', err.message)
    console.log('fail')
  }
}

checkNoDuplicate()
