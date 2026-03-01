#!/usr/bin/env node
/**
 * Self-Healing Orchestrator - Option C Implementation
 * 
 * Detects and recovers from orchestrator failures automatically
 * 
 * Usage:
 *   node self-heal.js --check-all
 *   node self-heal.js --watch
 *   node self-heal.js --heal <task-id>
 */

const { TaskStore } = require('./task-store');
const { predictSuccess } = require('./predictive-engine');
const { autoDecompose } = require('./auto-decompose');
const { optimizeSpawn, getCurrentMode } = require('./optimizer');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const store = new TaskStore();
const HEAL_LOG = path.join(process.cwd(), '.self-heal-log.jsonl');
const HEALTH_STATE_FILE = path.join(process.cwd(), '.health-state.json');

// Health check thresholds
const THRESHOLDS = {
  maxAgentIdleMinutes: 45,        // Agent idle too long
  maxTaskStuckMinutes: 60,        // Task no progress
  maxRetries: 3,                   // Max retries before escalation
  maxFailuresPerHour: 5,          // System issue threshold
  heartbeatTimeoutMinutes: 10     // Orchestrator down
};

/**
 * Health check types
 */
const HEALTH_CHECKS = {
  AGENT_IDLE: 'agent_idle',
  TASK_STUCK: 'task_stuck',
  MULTIPLE_FAILURES: 'multiple_failures',
  HEARTBEAT_MISSING: 'heartbeat_missing',
  QUEUE_STALLED: 'queue_stalled',
  BUDGET_ANOMALY: 'budget_anomaly'
};

/**
 * Run all health checks
 */
async function runHealthChecks() {
  const issues = [];
  
  // Check 1: Idle agents
  const idleAgents = await checkIdleAgents();
  issues.push(...idleAgents);
  
  // Check 2: Stuck tasks
  const stuckTasks = await checkStuckTasks();
  issues.push(...stuckTasks);
  
  // Check 3: Multiple recent failures
  const failurePattern = await checkFailurePattern();
  if (failurePattern) issues.push(failurePattern);
  
  // Check 4: Queue stalled
  const stalled = await checkQueueStalled();
  if (stalled) issues.push(stalled);
  
  // Check 5: Budget anomaly
  const budgetAnomaly = await checkBudgetAnomaly();
  if (budgetAnomaly) issues.push(budgetAnomaly);
  
  // Save health state
  saveHealthState({
    lastCheck: new Date().toISOString(),
    issues: issues.length,
    healthy: issues.length === 0
  });
  
  return issues;
}

/**
 * Check for idle agents (spawned but no progress)
 */
async function checkIdleAgents() {
  const issues = [];
  
  // Get in-progress tasks that haven't updated recently
  const { data: tasks } = await store.supabase
    .from('tasks')
    .select('*')
    .eq('status', 'in_progress');
  
  for (const task of tasks || []) {
    const lastUpdate = task.updated_at || task.started_at;
    if (!lastUpdate) continue;
    
    const idleMinutes = (Date.now() - new Date(lastUpdate).getTime()) / (1000 * 60);
    
    if (idleMinutes > THRESHOLDS.maxAgentIdleMinutes) {
      issues.push({
        type: HEALTH_CHECKS.AGENT_IDLE,
        severity: idleMinutes > 90 ? 'critical' : 'warning',
        taskId: task.id,
        taskTitle: task.title,
        agentId: task.agent_id,
        model: task.model,
        idleMinutes: Math.round(idleMinutes),
        recommendation: generateIdleRecommendation(task, idleMinutes)
      });
    }
  }
  
  return issues;
}

/**
 * Check for stuck tasks (no progress updates)
 */
async function checkStuckTasks() {
  const issues = [];
  
  // Similar to idle but more specific to task progress
  const { data: tasks } = await store.supabase
    .from('tasks')
    .select('*')
    .eq('status', 'in_progress');
  
  for (const task of tasks || []) {
    const started = task.started_at ? new Date(task.started_at) : null;
    if (!started) continue;
    
    const runningMinutes = (Date.now() - started.getTime()) / (1000 * 60);
    const expectedMinutes = (task.estimated_hours || 2) * 60 * 1.5; // 1.5x buffer
    
    if (runningMinutes > expectedMinutes && runningMinutes > THRESHOLDS.maxTaskStuckMinutes) {
      issues.push({
        type: HEALTH_CHECKS.TASK_STUCK,
        severity: 'critical',
        taskId: task.id,
        taskTitle: task.title,
        runningMinutes: Math.round(runningMinutes),
        expectedMinutes: Math.round(expectedMinutes),
        recommendation: generateStuckRecommendation(task)
      });
    }
  }
  
  return issues;
}

/**
 * Check for failure patterns
 */
async function checkFailurePattern() {
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString(); // Last hour
  
  // Check decision log for failures
  if (!fs.existsSync('.orchestrator-decisions.jsonl')) return null;
  
  const decisions = fs.readFileSync('.orchestrator-decisions.jsonl', 'utf-8')
    .trim()
    .split('\n')
    .filter(line => line.trim())
    .map(line => JSON.parse(line))
    .filter(d => d.outcome_recorded && d.outcome === 'incorrect')
    .filter(d => new Date(d.timestamp) > new Date(since));
  
  if (decisions.length >= THRESHOLDS.maxFailuresPerHour) {
    return {
      type: HEALTH_CHECKS.MULTIPLE_FAILURES,
      severity: 'critical',
      failuresInLastHour: decisions.length,
      recentFailures: decisions.slice(-3).map(d => ({
        taskId: d.task_id,
        model: d.chosen_model,
        time: d.timestamp
      })),
      recommendation: {
        action: 'escalate',
        message: `${decisions.length} failures in last hour - potential system issue`,
        suggestedFix: 'Switch to !optimize quality mode and manual review'
      }
    };
  }
  
  return null;
}

/**
 * Check if queue is stalled (no movement)
 */
async function checkQueueStalled() {
  const state = loadHealthState();
  if (!state.lastCheck) return null;
  
  const { data: currentReady } = await store.supabase
    .from('tasks')
    .select('id')
    .eq('status', 'ready');
  
  const readyIds = (currentReady || []).map(t => t.id).sort().join(',');
  
  // If same tasks have been ready for multiple checks, queue is stalled
  if (state.lastReadyIds === readyIds && state.unchangedChecks > 3) {
    return {
      type: HEALTH_CHECKS.QUEUE_STALLED,
      severity: 'warning',
      stalledTasks: currentReady?.length || 0,
      unchangedChecks: state.unchangedChecks,
      recommendation: {
        action: 'spawn_agents',
        message: `Queue stalled with ${currentReady?.length || 0} ready tasks`,
        suggestedFix: 'Spawn agents for ready tasks or check for blockers'
      }
    };
  }
  
  // Update state
  saveHealthState({
    ...state,
    lastReadyIds: readyIds,
    unchangedChecks: state.lastReadyIds === readyIds ? (state.unchangedChecks || 0) + 1 : 0
  });
  
  return null;
}

/**
 * Check for budget anomalies
 */
async function checkBudgetAnomaly() {
  // Check if spend rate is unexpectedly high
  try {
    const budget = require('./.budget-config.json');
    const spawnLog = '.spawn-log.jsonl';
    
    if (!fs.existsSync(spawnLog)) return null;
    
    const today = new Date().toISOString().split('T')[0];
    const spawns = fs.readFileSync(spawnLog, 'utf-8')
      .trim()
      .split('\n')
      .filter(line => line.trim())
      .map(line => JSON.parse(line))
      .filter(s => s.timestamp && s.timestamp.startsWith(today));
    
    const spent = spawns.reduce((sum, s) => sum + (s.estimatedCost || 0), 0);
    const hour = new Date().getHours();
    const projectedDaily = hour > 0 ? (spent / hour) * 24 : 0;
    
    if (projectedDaily > budget.daily_budget * 2) {
      return {
        type: HEALTH_CHECKS.BUDGET_ANOMALY,
        severity: 'warning',
        spentToday: spent,
        projectedDaily: projectedDaily.toFixed(2),
        dailyBudget: budget.daily_budget,
        recommendation: {
          action: 'switch_mode',
          message: `Spend rate projects to $${projectedDaily.toFixed(2)} (2x budget)`,
          suggestedFix: 'Switch to !optimize cost mode immediately'
        }
      };
    }
  } catch (e) {}
  
  return null;
}

/**
 * Generate recommendation for idle agent
 */
function generateIdleRecommendation(task, idleMinutes) {
  if (idleMinutes > 90) {
    return {
      action: 'kill_and_retry',
      message: `Agent idle for ${Math.round(idleMinutes)} minutes - likely stuck`,
      suggestedFix: 'Kill agent, retry with different model or decompose'
    };
  } else {
    return {
      action: 'monitor',
      message: `Agent idle for ${Math.round(idleMinutes)} minutes`,
      suggestedFix: 'Wait 15 more minutes before intervention'
    };
  }
}

/**
 * Generate recommendation for stuck task
 */
function generateStuckRecommendation(task) {
  const prediction = predictSuccess(task, task.model);
  
  if (prediction.predictedSuccessRate < 40) {
    return {
      action: 'decompose_and_retry',
      message: `Task stuck and predicted success only ${prediction.predictedSuccessRate}%`,
      suggestedFix: 'Decompose into smaller tasks and retry'
    };
  } else if (task.retry_count && task.retry_count >= 2) {
    return {
      action: 'escalate_model',
      message: `Task failed ${task.retry_count} times already`,
      suggestedFix: `Escalate from ${task.model} to sonnet/opus`
    };
  } else {
    return {
      action: 'retry_same',
      message: 'Task running long but predicted success reasonable',
      suggestedFix: 'Kill and retry with same model'
    };
  }
}

/**
 * Execute healing action
 */
async function healIssue(issue) {
  console.log(`🔧 Healing: ${issue.type}`);
  console.log(`   Task: ${issue.taskTitle || 'N/A'}`);
  console.log(`   Action: ${issue.recommendation.action}`);
  
  const result = {
    timestamp: new Date().toISOString(),
    issue,
    actionTaken: issue.recommendation.action,
    success: false
  };
  
  try {
    switch (issue.recommendation.action) {
      case 'kill_and_retry':
        await killAndRetry(issue.taskId);
        result.success = true;
        break;
        
      case 'decompose_and_retry':
        await decomposeAndRetry(issue.taskId);
        result.success = true;
        break;
        
      case 'escalate_model':
        await escalateModel(issue.taskId);
        result.success = true;
        break;
        
      case 'retry_same':
        await retrySame(issue.taskId);
        result.success = true;
        break;
        
      case 'spawn_agents':
        // Would trigger spawn for ready tasks
        result.success = true;
        result.note = 'Would spawn agents for ready tasks';
        break;
        
      case 'switch_mode':
        const { setMode } = require('./optimizer');
        setMode('cost');
        result.success = true;
        result.note = 'Switched to cost optimization mode';
        break;
        
      case 'escalate':
        result.success = true;
        result.note = 'Requires human intervention - too many failures';
        break;
        
      default:
        result.note = 'No automatic healing available';
    }
  } catch (error) {
    result.error = error.message;
  }
  
  // Log healing attempt
  fs.appendFileSync(HEAL_LOG, JSON.stringify(result) + '\n');
  
  return result;
}

/**
 * Kill stuck agent and retry
 */
async function killAndRetry(taskId) {
  const task = await store.getTask(taskId);
  if (!task) throw new Error('Task not found');
  
  // Reset task status
  await store.updateTask(taskId, {
    status: 'ready',
    started_at: null,
    retry_count: (task.retry_count || 0) + 1
  });
  
  // Switch model if retries > 1
  if ((task.retry_count || 0) >= 1) {
    const opt = optimizeSpawn(task, 15);
    if (opt.recommended_model !== task.model) {
      await store.updateTask(taskId, { model: opt.recommended_model });
    }
  }
  
  console.log(`   ✅ Reset task ${taskId} for retry`);
}

/**
 * Decompose and retry
 */
async function decomposeAndRetry(taskId) {
  const { autoDecompose } = require('./auto-decompose');
  await autoDecompose(taskId, false);
  console.log(`   ✅ Decomposed task ${taskId}`);
}

/**
 * Escalate to better model
 */
async function escalateModel(taskId) {
  const task = await store.getTask(taskId);
  if (!task) throw new Error('Task not found');
  
  const escalation = {
    'qwen': 'qwen3.5',
    'qwen3.5': 'opus',
    'kimi': 'opus',
    'haiku': 'opus',
    'sonnet': 'opus'
  };

  const newModel = escalation[task.model] || 'opus';
  await store.updateTask(taskId, { 
    model: newModel,
    status: 'ready'
  });
  
  console.log(`   ✅ Escalated ${taskId} from ${task.model} to ${newModel}`);
}

/**
 * Retry with same model
 */
async function retrySame(taskId) {
  await store.updateTask(taskId, {
    status: 'ready',
    started_at: null
  });
  console.log(`   ✅ Reset task ${taskId} for retry`);
}

/**
 * Load/save health state
 */
function loadHealthState() {
  try {
    if (fs.existsSync(HEALTH_STATE_FILE)) {
      return JSON.parse(fs.readFileSync(HEALTH_STATE_FILE, 'utf-8'));
    }
  } catch (e) {}
  return {};
}

function saveHealthState(state) {
  fs.writeFileSync(HEALTH_STATE_FILE, JSON.stringify(state, null, 2));
}

/**
 * Watch mode - continuous health checks
 */
async function watchMode() {
  console.log('👁️  Self-Healing Watch Mode Started');
  console.log('Checking every 2 minutes...\n');
  
  while (true) {
    const issues = await runHealthChecks();
    
    if (issues.length > 0) {
      console.log(`\n⚠️  Found ${issues.length} issue(s):`);
      
      for (const issue of issues) {
        console.log(`\n[${issue.severity.toUpperCase()}] ${issue.type}`);
        console.log(`  ${issue.recommendation.message}`);
        
        if (issue.severity === 'critical') {
          const result = await healIssue(issue);
          console.log(`  🔧 Healing result: ${result.success ? '✅ Success' : '❌ Failed'}`);
          if (result.note) console.log(`  Note: ${result.note}`);
        } else {
          console.log(`  (Auto-heal disabled for warnings - use --heal to apply)`);
        }
      }
    } else {
      process.stdout.write('.');
    }
    
    // Wait 2 minutes
    await new Promise(r => setTimeout(r, 2 * 60 * 1000));
  }
}

/**
 * Format health report
 */
function formatHealthReport(issues) {
  if (issues.length === 0) {
    return '✅ All health checks passed - system healthy';
  }
  
  let output = `\n⚠️  Health Check Results: ${issues.length} issue(s) found\n\n`;
  
  issues.forEach((issue, i) => {
    const emoji = issue.severity === 'critical' ? '🔴' : '🟡';
    output += `${emoji} ${issue.type}\n`;
    output += `   Severity: ${issue.severity}\n`;
    if (issue.taskTitle) output += `   Task: ${issue.taskTitle}\n`;
    output += `   Recommendation: ${issue.recommendation.action}\n`;
    output += `   ${issue.recommendation.message}\n\n`;
  });
  
  return output;
}

// CLI
const command = process.argv[2];
const arg = process.argv[3];

(async () => {
  switch (command) {
    case '--check':
    case '--check-all':
      const issues = await runHealthChecks();
      console.log(formatHealthReport(issues));
      process.exit(issues.filter(i => i.severity === 'critical').length > 0 ? 1 : 0);
      break;
      
    case '--watch':
      await watchMode();
      break;
      
    case '--heal':
      if (!arg) {
        console.log('Usage: --heal <task-id>');
        process.exit(1);
      }
      const task = await store.getTask(arg);
      if (!task) {
        console.log('Task not found');
        process.exit(1);
      }
      const mockIssue = {
        type: 'manual_heal',
        severity: 'warning',
        taskId: arg,
        taskTitle: task.title,
        recommendation: generateStuckRecommendation(task)
      };
      const result = await healIssue(mockIssue);
      console.log(JSON.stringify(result, null, 2));
      break;
      
    case '--status':
      const state = loadHealthState();
      console.log(JSON.stringify(state, null, 2));
      break;
      
    default:
      console.log(`
Self-Healing Orchestrator - Option C

Commands:
  --check-all          Run all health checks
  --watch              Continuous monitoring (heals critical issues)
  --heal <task-id>     Manually heal a stuck task
  --status             Show health state

Examples:
  node self-heal.js --check-all
  node self-heal.js --watch
  node self-heal.js --heal abc123
`);
  }
})();

module.exports = {
  runHealthChecks,
  healIssue,
  watchMode,
  HEALTH_CHECKS
};
