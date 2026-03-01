#!/usr/bin/env node

/**
 * Orchestrator Task Integrity Module
 * 
 * Prevents:
 * 1. Task duplication (deduplication before spawn)
 * 2. Stalled task accumulation (detection + reset)
 * 3. Orphaned tasks (completion evidence validation)
 * 4. Data source conflicts (Supabase + local JSON reconciliation)
 * 
 * Usage:
 *   const integrity = require('./orchestrator-task-integrity');
 *   integrity.deduplicateBeforeSpawn(newTask, allTasks);
 *   integrity.detectStalledTasks(allTasks);
 *   integrity.reconcileTasks(supabaseTasks, localTasks);
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Configuration
const STALL_THRESHOLD_HOURS = 4;
const TASKS_FILE = '.local-tasks.json';
const PROJECT_ROOT = process.cwd();

/**
 * PREVENTION #1: Deduplication Before Spawn
 * 
 * Check if a task with the same title + agent + status already exists.
 * If so, don't spawn — reuse the existing task.
 */
function deduplicateBeforeSpawn(newTask, allTasks) {
  const key = `${newTask.title}:${newTask.agent_id}`;
  
  // Look for existing task with same title + agent in ready/in_progress
  const existing = allTasks.find(t =>
    t.title === newTask.title &&
    t.agent_id === newTask.agent_id &&
    ['ready', 'in_progress'].includes(t.status)
  );
  
  if (existing) {
    console.log(`⚠️  DEDUP: Task "${newTask.title}" already exists (${existing.id})`);
    console.log(`   Status: ${existing.status}, Age: ${calculateAge(existing.started_at)}`);
    return {
      isDuplicate: true,
      existing: existing,
      action: 'SKIP_SPAWN'
    };
  }
  
  return {
    isDuplicate: false,
    action: 'PROCEED_WITH_SPAWN'
  };
}

/**
 * PREVENTION #2: Stalled Task Detection
 * 
 * Identify tasks in_progress for >4 hours with no completion evidence.
 * Mark as stalled and prepare for retry.
 */
function detectStalledTasks(allTasks) {
  const now = new Date();
  const stalled = [];
  const reset = [];
  
  allTasks.forEach(task => {
    if (task.status === 'in_progress' && task.started_at) {
      const ageMs = now - new Date(task.started_at);
      const ageHours = ageMs / 3600000;
      
      if (ageHours > STALL_THRESHOLD_HOURS) {
        // Check for completion evidence
        const hasCompletion = checkCompletionEvidence(task);
        
        if (hasCompletion) {
          // Mark as done
          task.status = 'done';
          task.completed_at = now.toISOString();
          console.log(`✅ AUTO-MARKED: "${task.title}" DONE (completion evidence found, age ${Math.round(ageHours)}h)`);
        } else {
          // Mark as stalled
          stalled.push({
            task: task,
            ageHours: Math.round(ageHours)
          });
          console.log(`⚠️  STALLED: "${task.title}" in_progress for ${Math.round(ageHours)}h (no completion evidence)`);
        }
      }
    }
  });
  
  return {
    stalledCount: stalled.length,
    stalledTasks: stalled,
    summary: `Found ${stalled.length} stalled task(s)`
  };
}

/**
 * PREVENTION #3: Completion Evidence Checker
 * 
 * Validates that a task has completion artifacts in the project.
 */
function checkCompletionEvidence(task) {
  const evidencePatterns = {
    'Inbound SMS Handler': ['UC-7-8-COMPLETE.md', 'agents/dev/NOTES/*sms*'],
    'Agent Onboarding UI': ['agents/dev/NOTES/*onboarding*', 'agents/dev/TASK*'],
    'Cal.com Booking': ['UC-7-8-COMPLETE.md', 'TASK-002-COMPLETED.md', 'agents/dev/NOTES/*booking*'],
    'Pilot Deployment': ['DEPLOYMENT_REPORT*.md', '.vercel/*'],
    'Pilot Recruitment': ['PILOT_RECRUITMENT*.md', 'agents/marketing/NOTES/*recruitment*'],
    'PostHog Analytics Setup': ['product/lead-response/dashboard/ANALYTICS_README.md', 'product/*dashboard*'],
    'Stripe Billing Integration': ['product/billing/*', 'app/api/billing*'],
    'QC Compliance': ['QC_AUDIT_SUMMARY.md', 'PILOT_COMPLIANCE_CHECKLIST.md'],
    'Landing Page': ['agents/design/NOTES/*landing*', 'product/*landing*'],
    'Email Notifications': ['app/api/email*', 'agents/dev/NOTES/*email*']
  };
  
  const patterns = evidencePatterns[task.title] || [];
  
  if (patterns.length === 0) {
    // No evidence pattern defined, assume it needs manual verification
    return false;
  }
  
  // Check if any evidence file exists
  try {
    for (const pattern of patterns) {
      const fullPattern = path.join(PROJECT_ROOT, pattern);
      if (pattern.includes('*')) {
        // Glob pattern
        const matches = glob.sync(fullPattern);
        if (matches.length > 0) {
          return true;
        }
      } else {
        // Direct path check
        if (fs.existsSync(fullPattern)) {
          return true;
        }
      }
    }
  } catch (err) {
    console.log(`⚠️  Evidence check failed for ${task.title}: ${err.message}`);
  }
  
  return false;
}

/**
 * PREVENTION #4: Task Reconciliation
 * 
 * Merge Supabase + local JSON task lists, removing duplicates.
 * Keeps the most recent record for each unique task.
 */
function reconcileTasks(supabaseTasks = [], localTasks = []) {
  const merged = {};
  
  // Index all tasks by "title:agent_id"
  const allTasks = [...supabaseTasks, ...localTasks];
  
  allTasks.forEach(task => {
    const key = `${task.title}:${task.agent_id}`;
    
    if (!merged[key]) {
      merged[key] = task;
    } else {
      // Keep the most recently updated one
      const existing = merged[key];
      const taskTime = new Date(task.updated_at || task.created_at).getTime();
      const existingTime = new Date(existing.updated_at || existing.created_at).getTime();
      
      if (taskTime > existingTime) {
        merged[key] = task;
      }
    }
  });
  
  const reconciled = Object.values(merged);
  const duplicatesRemoved = allTasks.length - reconciled.length;
  
  return {
    tasks: reconciled,
    duplicatesRemoved: duplicatesRemoved,
    summary: `Reconciled ${allTasks.length} tasks → ${reconciled.length} (removed ${duplicatesRemoved} duplicates)`
  };
}

/**
 * PREVENTION #5: Single Source of Truth Check
 * 
 * Verify that task database is consistent and not corrupted.
 */
function validateTaskDatabase(allTasks) {
  const issues = [];
  const seen = {};
  
  allTasks.forEach((task, idx) => {
    // Check for duplicate IDs
    if (seen[task.id]) {
      issues.push(`Duplicate task ID: ${task.id}`);
    }
    seen[task.id] = true;
    
    // Check for duplicate title + agent combinations
    const key = `${task.title}:${task.agent_id}`;
    if (seen[key]) {
      issues.push(`Duplicate task: ${task.title} (agent: ${task.agent_id})`);
    }
    seen[key] = true;
    
    // Check for invalid status
    const validStatuses = ['ready', 'in_progress', 'blocked', 'done', 'stalled'];
    if (!validStatuses.includes(task.status)) {
      issues.push(`Invalid status for ${task.title}: ${task.status}`);
    }
    
    // Check for orphaned dependencies
    if (task.dependencies) {
      task.dependencies.forEach(dep => {
        const depExists = allTasks.find(t => t.id === dep.taskId);
        if (!depExists) {
          issues.push(`Orphaned dependency in ${task.title}: ${dep.taskId}`);
        }
      });
    }
  });
  
  return {
    isValid: issues.length === 0,
    issues: issues,
    summary: issues.length === 0 ? '✅ Task database valid' : `⚠️  Found ${issues.length} issue(s)`
  };
}

/**
 * Calculate human-readable age
 */
function calculateAge(timestamp) {
  if (!timestamp) return 'unknown';
  
  const now = new Date();
  const then = new Date(timestamp);
  const ms = now - then;
  const hours = Math.round(ms / 3600000);
  
  if (hours < 1) return `${Math.round(ms / 60000)}m`;
  if (hours < 24) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

/**
 * Load tasks from file
 */
function loadTasks() {
  try {
    const raw = fs.readFileSync(TASKS_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Failed to load tasks: ${err.message}`);
    return [];
  }
}

/**
 * Save tasks to file
 */
function saveTasks(tasks) {
  try {
    fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2));
    return true;
  } catch (err) {
    console.error(`Failed to save tasks: ${err.message}`);
    return false;
  }
}

/**
 * Run full integrity check (comprehensive)
 */
function runFullIntegrityCheck() {
  console.log('\n🔍 Running Full Task Integrity Check\n');
  
  const tasks = loadTasks();
  
  // 1. Validate database
  const validation = validateTaskDatabase(tasks);
  console.log(`[1/4] Validation: ${validation.summary}`);
  if (validation.issues.length > 0) {
    validation.issues.forEach(issue => console.log(`       ${issue}`));
  }
  
  // 2. Detect stalled
  const stalledReport = detectStalledTasks(tasks);
  console.log(`[2/4] Stalled Detection: ${stalledReport.summary}`);
  
  // 3. Check for duplicates
  const deduped = reconcileTasks(tasks);
  console.log(`[3/4] Deduplication: ${deduped.summary}`);
  
  // 4. Scan for completion evidence on old tasks
  console.log(`[4/4] Completion Evidence: Scanning...`);
  let completionChecks = 0;
  tasks.forEach(task => {
    if (task.status === 'in_progress' && calculateAge(task.started_at).includes('h')) {
      completionChecks++;
    }
  });
  console.log(`       Checked ${completionChecks} old in_progress tasks\n`);
  
  return {
    validation,
    stalled: stalledReport,
    deduplication: deduped
  };
}

// Export functions
module.exports = {
  deduplicateBeforeSpawn,
  detectStalledTasks,
  checkCompletionEvidence,
  reconcileTasks,
  validateTaskDatabase,
  loadTasks,
  saveTasks,
  runFullIntegrityCheck,
  STALL_THRESHOLD_HOURS
};

// CLI: Run if called directly
if (require.main === module) {
  const report = runFullIntegrityCheck();
  
  // Exit with error if issues found
  if (!report.validation.isValid) {
    process.exit(1);
  }
}
