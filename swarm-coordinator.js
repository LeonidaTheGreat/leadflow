#!/usr/bin/env node
/**
 * Swarm Coordinator - Option D Implementation (Cost-Effective)
 * 
 * Manages multiple parallel agents with:
 * - Resource monitoring (CPU/memory)
 * - Anti-collision (file/directory locking)
 * - Budget-aware throttling
 * - Toggle on/off
 * 
 * Usage:
 *   node swarm-coordinator.js --toggle on
 *   node swarm-coordinator.js --mode conservative
 *   node swarm-coordinator.js --spawn-ready
 *   node swarm-coordinator.js --status
 */

const { TaskStore } = require('./task-store');
const { optimizeSpawn, getCurrentMode } = require('./optimizer');
const { predictSuccess } = require('./predictive-engine');
const fs = require('fs');
const path = require('path');
const os = require('os');

const store = new TaskStore();
const SWARM_CONFIG_PATH = path.join(process.cwd(), 'swarm-config.json');
const SWARM_STATE_FILE = path.join(process.cwd(), '.swarm-state.json');
const LOCK_DIR = path.join(process.cwd(), '.swarm-locks');
const SWARM_LOG = path.join(process.cwd(), '.swarm-log.jsonl');

// Ensure lock directory exists
if (!fs.existsSync(LOCK_DIR)) {
  fs.mkdirSync(LOCK_DIR, { recursive: true });
}

// Load configuration
let swarmConfig = {};
try {
  swarmConfig = JSON.parse(fs.readFileSync(SWARM_CONFIG_PATH, 'utf-8'));
} catch (e) {
  console.error('Failed to load swarm-config.json:', e.message);
  process.exit(1);
}

/**
 * Get current swarm state
 */
function getSwarmState() {
  try {
    if (fs.existsSync(SWARM_STATE_FILE)) {
      return JSON.parse(fs.readFileSync(SWARM_STATE_FILE, 'utf-8'));
    }
  } catch (e) {}
  return {
    enabled: false,
    mode: 'off',
    activeAgents: 0,
    lastCheck: null,
    totalSpentThisHour: 0,
    spawnedThisHour: 0
  };
}

/**
 * Save swarm state
 */
function saveSwarmState(state) {
  fs.writeFileSync(SWARM_STATE_FILE, JSON.stringify(state, null, 2));
}

/**
 * Toggle swarm on/off
 */
function toggleSwarm(enable, mode = null) {
  const state = getSwarmState();
  
  if (enable) {
    const targetMode = mode || 'conservative'; // Default to conservative when enabling
    if (!swarmConfig.modes[targetMode] || !swarmConfig.modes[targetMode].enabled) {
      throw new Error(`Invalid or disabled mode: ${targetMode}`);
    }
    
    state.enabled = true;
    state.mode = targetMode;
    
    logSwarmEvent('enabled', { mode: targetMode });
    
    return {
      enabled: true,
      mode: targetMode,
      config: swarmConfig.modes[targetMode],
      message: `Swarm enabled in ${targetMode} mode - max ${swarmConfig.modes[targetMode].max_parallel_agents} parallel agents`
    };
  } else {
    state.enabled = false;
    state.mode = 'off';
    
    logSwarmEvent('disabled', {});
    
    return {
      enabled: false,
      mode: 'off',
      message: 'Swarm disabled - single agent execution'
    };
  }
}

/**
 * Change swarm mode
 */
function setSwarmMode(mode) {
  if (!swarmConfig.modes[mode]) {
    throw new Error(`Invalid mode: ${mode}. Choose: ${Object.keys(swarmConfig.modes).join(', ')}`);
  }
  
  if (mode === 'off') {
    return toggleSwarm(false);
  }
  
  if (!swarmConfig.modes[mode].enabled) {
    throw new Error(`Mode ${mode} is disabled in configuration`);
  }
  
  const state = getSwarmState();
  state.mode = mode;
  state.enabled = true;
  saveSwarmState(state);
  
  logSwarmEvent('mode_changed', { mode });
  
  return {
    enabled: true,
    mode,
    config: swarmConfig.modes[mode]
  };
}

/**
 * Get current system resources
 */
function getSystemResources() {
  return {
    cpuUsage: os.loadavg()[0] * 100 / os.cpus().length, // Approximate
    freeMemory: os.freemem() / (1024 * 1024), // MB
    totalMemory: os.totalmem() / (1024 * 1024), // MB
    memoryUsage: ((os.totalmem() - os.freemem()) / os.totalmem()) * 100
  };
}

/**
 * Check if system can handle more agents
 */
async function canSpawnMoreAgents() {
  const state = getSwarmState();
  
  if (!state.enabled) {
    return { canSpawn: state.activeAgents < 1, reason: 'swarm_off' };
  }
  
  const config = swarmConfig.modes[state.mode];
  
  // Check agent limit
  if (state.activeAgents >= config.max_parallel_agents) {
    return { canSpawn: false, reason: 'max_agents_reached' };
  }
  
  // Check resource limits
  const resources = getSystemResources();
  if (resources.memoryUsage > 85) {
    return { canSpawn: false, reason: 'memory_pressure', resources };
  }
  
  // Check budget constraints
  const budgetCheck = await checkBudgetConstraints(config);
  if (!budgetCheck.canSpawn) {
    return { canSpawn: false, reason: budgetCheck.reason, budget: budgetCheck };
  }
  
  return { canSpawn: true, resources, budget: budgetCheck };
}

/**
 * Check budget constraints
 */
async function checkBudgetConstraints(config) {
  // Get current spend
  let spentThisHour = 0;
  const state = getSwarmState();
  
  try {
    const budgetConfig = require('./.budget-config.json');
    const spawnLog = '.spawn-log.jsonl';
    
    if (fs.existsSync(spawnLog)) {
      const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const lines = fs.readFileSync(spawnLog, 'utf-8')
        .trim()
        .split('\n')
        .filter(line => line.trim());
      
      spentThisHour = lines
        .map(line => JSON.parse(line))
        .filter(s => s.timestamp && s.timestamp > hourAgo)
        .reduce((sum, s) => sum + (s.estimatedCost || 0), 0);
    }
    
    const remainingBudget = budgetConfig.daily_budget - spentThisHour;
    const maxConcurrentSpend = config.cost_controls.max_concurrent_spend;
    
    if (spentThisHour >= maxConcurrentSpend) {
      return {
        canSpawn: false,
        reason: 'hourly_spend_limit',
        spentThisHour,
        maxConcurrentSpend,
        remainingBudget
      };
    }
    
    if (remainingBudget < swarmConfig.safety_defaults.min_budget_buffer) {
      return {
        canSpawn: false,
        reason: 'low_budget_buffer',
        remainingBudget,
        minBuffer: swarmConfig.safety_defaults.min_budget_buffer
      };
    }
    
    return {
      canSpawn: true,
      spentThisHour,
      maxConcurrentSpend,
      remainingBudget,
      canSpendMore: maxConcurrentSpend - spentThisHour
    };
    
  } catch (e) {
    return { canSpawn: true, error: e.message };
  }
}

/**
 * Acquire file lock for anti-collision
 */
function acquireLock(resourceId, agentId) {
  const lockFile = path.join(LOCK_DIR, `${resourceId}.lock`);
  
  try {
    // Check if already locked
    if (fs.existsSync(lockFile)) {
      const lock = JSON.parse(fs.readFileSync(lockFile, 'utf-8'));
      const lockAge = Date.now() - new Date(lock.timestamp).getTime();
      
      // Stale lock (older than 30 min)
      if (lockAge > 30 * 60 * 1000) {
        fs.unlinkSync(lockFile);
      } else {
        return { acquired: false, lockedBy: lock.agentId, since: lock.timestamp };
      }
    }
    
    // Acquire lock
    fs.writeFileSync(lockFile, JSON.stringify({
      agentId,
      timestamp: new Date().toISOString(),
      resourceId
    }));
    
    return { acquired: true };
  } catch (e) {
    return { acquired: false, error: e.message };
  }
}

/**
 * Release file lock
 */
function releaseLock(resourceId) {
  const lockFile = path.join(LOCK_DIR, `${resourceId}.lock`);
  
  try {
    if (fs.existsSync(lockFile)) {
      fs.unlinkSync(lockFile);
    }
    return { released: true };
  } catch (e) {
    return { released: false, error: e.message };
  }
}

/**
 * Get locked resources
 */
function getLockedResources() {
  try {
    return fs.readdirSync(LOCK_DIR)
      .filter(f => f.endsWith('.lock'))
      .map(f => {
        const lock = JSON.parse(fs.readFileSync(path.join(LOCK_DIR, f), 'utf-8'));
        return {
          resource: f.replace('.lock', ''),
          ...lock
        };
      });
  } catch (e) {
    return [];
  }
}

/**
 * Find non-conflicting tasks for parallel execution
 */
async function findParallelizableTasks(tasks) {
  const lockedResources = getLockedResources();
  const lockedSet = new Set(lockedResources.map(r => r.resource));
  
  return tasks.filter(task => {
    // Check if task would conflict with locked resources
    const taskResources = extractTaskResources(task);
    return !taskResources.some(r => lockedSet.has(r));
  });
}

/**
 * Extract resources a task would touch
 */
function extractTaskResources(task) {
  const resources = [];
  const text = (task.title + ' ' + (task.description || '')).toLowerCase();
  
  // Extract file/module references
  if (text.includes('stripe')) resources.push('stripe', 'billing');
  if (text.includes('dashboard')) resources.push('dashboard', 'ui');
  if (text.includes('api')) resources.push('api', 'routes');
  if (text.includes('auth')) resources.push('auth', 'security');
  if (text.includes('database') || text.includes('db')) resources.push('database', 'schema');
  if (text.includes('test')) resources.push('tests');
  if (text.includes('deploy')) resources.push('deployment', 'infrastructure');
  
  // Agent-specific resources
  resources.push(`agent-${task.agent_id || 'dev'}`);
  
  return resources;
}

/**
 * Spawn agents for ready tasks (swarm-aware)
 */
async function spawnSwarmAgents(dryRun = false) {
  const state = getSwarmState();
  
  if (!state.enabled) {
    // In OFF mode, spawn only 1 agent at a time
    return spawnSingleAgent(dryRun);
  }
  
  const config = swarmConfig.modes[state.mode];
  const results = {
    spawned: 0,
    skipped: 0,
    blocked: 0,
    reasons: []
  };
  
  // Get ready tasks
  const { data: readyTasks } = await store.supabase
    .from('tasks')
    .select('*')
    .eq('status', 'ready')
    .order('priority');
  
  if (!readyTasks || readyTasks.length === 0) {
    return { ...results, message: 'No ready tasks' };
  }
  
  // Find parallelizable tasks
  const parallelizable = await findParallelizableTasks(readyTasks);
  
  for (const task of parallelizable) {
    // Check if we can spawn more
    const canSpawn = await canSpawnMoreAgents();
    if (!canSpawn.canSpawn) {
      results.skipped++;
      results.reasons.push(`Cannot spawn ${task.title}: ${canSpawn.reason}`);
      break;
    }
    
    // Acquire locks for this task
    const resources = extractTaskResources(task);
    const locks = [];
    
    for (const resource of resources) {
      const lock = acquireLock(resource, task.id);
      if (!lock.acquired) {
        // Release already acquired locks
        locks.forEach(l => releaseLock(l));
        results.blocked++;
        results.reasons.push(`Cannot spawn ${task.title}: ${resource} locked by ${lock.lockedBy}`);
        break;
      }
      locks.push(resource);
    }
    
    if (locks.length < resources.length) {
      continue; // Couldn't acquire all locks
    }
    
    // Optimize spawn based on swarm mode
    const optMode = getCurrentMode();
    let taskModel = task.model;
    
    // In swarm mode with cost optimization, prefer cheaper models
    if (swarmConfig.cost_optimization.prefer_cheap_models_when_parallel) {
      const opt = optimizeSpawn(task, canSpawn.budget.canSpendMore);
      taskModel = opt.recommended_model;
    }
    
    if (!dryRun) {
      // Update task
      await store.updateTask(task.id, {
        model: taskModel,
        status: 'in_progress',
        started_at: new Date().toISOString(),
        swarm_mode: state.mode,
        locked_resources: locks
      });
      
      // Update state
      state.activeAgents++;
      state.spawnedThisHour++;
      saveSwarmState(state);
      
      logSwarmEvent('agent_spawned', {
        taskId: task.id,
        model: taskModel,
        locks,
        mode: state.mode
      });
      
      // Apply cooldown if configured
      if (config.cost_controls.spawn_cooldown_seconds > 0) {
        await sleep(config.cost_controls.spawn_cooldown_seconds * 1000);
      }
    }
    
    results.spawned++;
    
    // Check if we've hit the limit
    if (results.spawned >= config.max_parallel_agents) {
      break;
    }
  }
  
  return results;
}

/**
 * Spawn single agent (swarm OFF mode)
 */
async function spawnSingleAgent(dryRun = false) {
  const { data: tasks } = await store.supabase
    .from('tasks')
    .select('*')
    .eq('status', 'ready')
    .order('priority')
    .limit(1);
  
  if (!tasks || tasks.length === 0) {
    return { spawned: 0, message: 'No ready tasks' };
  }
  
  const task = tasks[0];
  
  if (!dryRun) {
    await store.updateTask(task.id, {
      status: 'in_progress',
      started_at: new Date().toISOString()
    });
  }
  
  return { spawned: 1, task: task.title };
}

/**
 * Mark agent as completed
 */
async function completeAgent(taskId) {
  const task = await store.getTask(taskId);
  if (!task) return { error: 'Task not found' };
  
  // Release locks
  if (task.locked_resources) {
    task.locked_resources.forEach(r => releaseLock(r));
  }
  
  // Update state
  const state = getSwarmState();
  state.activeAgents = Math.max(0, state.activeAgents - 1);
  saveSwarmState(state);
  
  logSwarmEvent('agent_completed', { taskId });
  
  return { completed: true };
}

/**
 * Emergency shutdown
 */
async function emergencyShutdown(reason) {
  const state = getSwarmState();
  
  logSwarmEvent('emergency_shutdown', { reason, activeAgents: state.activeAgents });
  
  // Disable swarm
  state.enabled = false;
  state.mode = 'off';
  state.emergencyShutdown = {
    timestamp: new Date().toISOString(),
    reason
  };
  saveSwarmState(state);
  
  // Release all locks
  try {
    const locks = fs.readdirSync(LOCK_DIR);
    locks.forEach(l => fs.unlinkSync(path.join(LOCK_DIR, l)));
  } catch (e) {}
  
  return {
    shutdown: true,
    reason,
    message: 'Swarm emergency shutdown - all locks released, no new spawns'
  };
}

/**
 * Get swarm status
 */
async function getSwarmStatus() {
  const state = getSwarmState();
  const config = swarmConfig.modes[state.mode];
  const resources = getSystemResources();
  const budget = await checkBudgetConstraints(config);
  const locks = getLockedResources();
  
  return {
    enabled: state.enabled,
    mode: state.mode,
    activeAgents: state.activeAgents,
    maxAgents: config.max_parallel_agents,
    resources,
    budget,
    lockedResources: locks.length,
    canSpawn: (await canSpawnMoreAgents()).canSpawn,
    config
  };
}

/**
 * Helper functions
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function logSwarmEvent(event, data) {
  fs.appendFileSync(SWARM_LOG, JSON.stringify({
    timestamp: new Date().toISOString(),
    event,
    ...data
  }) + '\n');
}

/**
 * Format status for display
 */
function formatStatus(status) {
  const emoji = status.enabled ? '🐝' : '⏸️';
  const modeEmoji = status.mode === 'off' ? '⚪' : 
                    status.mode === 'conservative' ? '🟢' :
                    status.mode === 'balanced' ? '🔵' : '🔴';
  
  return `
╔══════════════════════════════════════════════════════════╗
║  ${emoji} SWARM INTELLIGENCE${''.padEnd(43)} ║
╠══════════════════════════════════════════════════════════╣
║  Status: ${status.enabled ? 'ENABLED' : 'DISABLED'}${''.padEnd(47)} ║
║  Mode: ${modeEmoji} ${status.mode.toUpperCase().padEnd(45)} ║
║  Agents: ${status.activeAgents}/${status.maxAgents} active${''.padEnd(37)} ║
╠══════════════════════════════════════════════════════════╣
║  Resources:${''.padEnd(48)} ║
║    CPU: ${Math.round(status.resources.cpuUsage).toString().padStart(3)}%${''.padEnd(45)} ║
║    Memory: ${Math.round(status.resources.memoryUsage).toString().padStart(3)}%${''.padEnd(42)} ║
╠══════════════════════════════════════════════════════════╣
║  Budget:${''.padEnd(50)} ║
║    Hourly Spend: $${(status.budget.spentThisHour || 0).toFixed(2)}/${status.config?.cost_controls?.max_concurrent_spend || 'N/A'}${''.padEnd(28)} ║
║    Can Spawn: ${status.canSpawn ? '✅ YES' : '❌ NO'}${''.padEnd(38)} ║
╠══════════════════════════════════════════════════════════╣
║  Locks: ${status.lockedResources} resources locked${''.padEnd(30)} ║
╚══════════════════════════════════════════════════════════╝

Commands:
  !swarm on [mode]     - Enable swarm (conservative/balanced/aggressive)
  !swarm off           - Disable swarm
  !swarm status        - Show this status
`;
}

// CLI
const command = process.argv[2];
const arg = process.argv[3];

(async () => {
  switch (command) {
    case '--toggle':
    case '--on':
      const result = toggleSwarm(true, arg);
      console.log(result.message);
      break;
      
    case '--off':
      const offResult = toggleSwarm(false);
      console.log(offResult.message);
      break;
      
    case '--mode':
      const modeResult = setSwarmMode(arg);
      console.log(`Swarm mode: ${modeResult.mode}`);
      break;
      
    case '--status':
      const status = await getSwarmStatus();
      console.log(formatStatus(status));
      break;
      
    case '--spawn':
    case '--spawn-ready':
      const spawnResult = await spawnSwarmAgents(arg === '--dry-run');
      console.log(JSON.stringify(spawnResult, null, 2));
      break;
      
    case '--complete':
      const completeResult = await completeAgent(arg);
      console.log(JSON.stringify(completeResult, null, 2));
      break;
      
    case '--emergency':
      const emergency = await emergencyShutdown(arg || 'manual');
      console.log(emergency.message);
      break;
      
    default:
      console.log(`
Swarm Coordinator - Option D (Cost-Effective)

Commands:
  --on [mode]          Enable swarm (conservative/balanced/aggressive)
  --off                Disable swarm
  --mode <mode>        Change mode
  --status             Show swarm status
  --spawn              Spawn agents for ready tasks
  --complete <task-id> Mark agent as completed
  --emergency [reason] Emergency shutdown

Examples:
  node swarm-coordinator.js --on conservative
  node swarm-coordinator.js --off
  node swarm-coordinator.js --status
  node swarm-coordinator.js --spawn

NOTE: Swarm starts DISABLED by default for cost control.
      Use --on to enable when needed.
`);
  }
})();

module.exports = {
  toggleSwarm,
  setSwarmMode,
  canSpawnMoreAgents,
  spawnSwarmAgents,
  completeAgent,
  emergencyShutdown,
  getSwarmStatus,
  acquireLock,
  releaseLock
};
