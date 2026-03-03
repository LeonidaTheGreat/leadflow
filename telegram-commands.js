#!/usr/bin/env node
/**
 * Telegram Command Handlers for Orchestrator
 * 
 * Handles !budget and !accuracy commands
 * Usage: node telegram-commands.js --handle '<command>'
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BUDGET_CONFIG = path.join(process.cwd(), '.budget-config.json');
const ACCURACY_CONFIG = path.join(process.cwd(), '.orchestrator-accuracy.json');
const DISPATCHER_PID_FILE = path.join(process.cwd(), '.dispatcher.pid');

/**
 * Load budget configuration
 */
function loadBudgetConfig() {
  try {
    if (fs.existsSync(BUDGET_CONFIG)) {
      return JSON.parse(fs.readFileSync(BUDGET_CONFIG, 'utf-8'));
    }
  } catch (e) {}
  return {
    daily_budget: 5.00,
    updated_at: new Date().toISOString()
  };
}

/**
 * Save budget configuration
 */
function saveBudgetConfig(config) {
  fs.writeFileSync(BUDGET_CONFIG, JSON.stringify(config, null, 2));
}

/**
 * Load accuracy configuration
 */
function loadAccuracyConfig() {
  try {
    if (fs.existsSync(ACCURACY_CONFIG)) {
      return JSON.parse(fs.readFileSync(ACCURACY_CONFIG, 'utf-8'));
    }
  } catch (e) {}
  return {
    threshold: 70,
    updated_at: new Date().toISOString()
  };
}

/**
 * Save accuracy configuration
 */
function saveAccuracyConfig(config) {
  fs.writeFileSync(ACCURACY_CONFIG, JSON.stringify(config, null, 2));
}

/**
 * Handle !budget command
 * Format: !budget <amount>  or  !budget
 */
function handleBudgetCommand(args) {
  const config = loadBudgetConfig();
  
  if (!args || args.length === 0) {
    // Show current budget
    return `💰 Current Daily Budget: $${config.daily_budget.toFixed(2)}

To change: !budget <amount>
Examples:
  !budget 10    (Standard tier)
  !budget 25    (Aggressive tier)
  !budget 5     (Conservative tier)`;
  }
  
  const amount = parseFloat(args[0]);
  if (isNaN(amount) || amount <= 0) {
    return '❌ Invalid amount. Usage: !budget <number>';
  }
  
  const oldBudget = config.daily_budget;
  config.daily_budget = amount;
  config.updated_at = new Date().toISOString();
  config.updated_by = 'telegram_command';
  saveBudgetConfig(config);
  
  // Also update .env for dispatcher restart
  try {
    let envContent = '';
    if (fs.existsSync('.env')) {
      envContent = fs.readFileSync('.env', 'utf-8');
    }
    
    if (envContent.includes('DAILY_BUDGET=')) {
      envContent = envContent.replace(/DAILY_BUDGET=.*/g, `DAILY_BUDGET=${amount}`);
    } else {
      envContent += `\nDAILY_BUDGET=${amount}\n`;
    }
    fs.writeFileSync('.env', envContent);
  } catch (e) {
    console.error('Failed to update .env:', e.message);
  }
  
  return `✅ Budget updated: $${oldBudget.toFixed(2)} → $${amount.toFixed(2)}

⚠️ Note: New budget takes effect on next dispatcher restart.

To restart now:
  ./start-dispatcher.sh --restart`;
}

/**
 * Handle !accuracy command
 * Format: !accuracy <percent>  or  !accuracy
 */
function handleAccuracyCommand(args) {
  const config = loadAccuracyConfig();
  
  if (!args || args.length === 0) {
    // Show current accuracy
    const { calculateAccuracy } = require('./orchestrator-decision-tracker.js');
    const stats = calculateAccuracy();
    
    const status = stats.accuracy >= config.threshold ? '✅' : '⚠️';
    
    return `${status} Orchestrator Decision Quality

Threshold: ${config.threshold}%
Current: ${stats.accuracy}% (${stats.correct}/${stats.total} decisions)

To change threshold: !accuracy <percent>
Examples:
  !accuracy 70   (Default)
  !accuracy 80   (Stricter)
  !accuracy 60   (More lenient)`;
  }
  
  const percent = parseInt(args[0], 10);
  if (isNaN(percent) || percent < 0 || percent > 100) {
    return '❌ Invalid percentage. Usage: !accuracy <0-100>';
  }
  
  const oldThreshold = config.threshold;
  config.threshold = percent;
  config.updated_at = new Date().toISOString();
  config.updated_by = 'telegram_command';
  saveAccuracyConfig(config);
  
  return `✅ Accuracy threshold updated: ${oldThreshold}% → ${percent}%

I will now alert you if my decision accuracy drops below ${percent}%.`;
}

/**
 * Handle !optimize command
 * Format: !optimize <mode>  or  !optimize
 */
function handleOptimizeCommand(args) {
  const { setMode, getCurrentMode, getAvailableModes, formatModeStatus } = require('./optimizer.js');
  
  if (!args || args.length === 0) {
    // Show current mode
    return formatModeStatus();
  }
  
  const mode = args[0].toLowerCase();
  const validModes = ['speed', 'balanced', 'cost', 'quality'];
  
  if (!validModes.includes(mode)) {
    return `❌ Invalid mode: ${mode}

Available modes:
  ⚡ speed     - Maximum throughput, cost secondary
  ⚖️ balanced  - Default sweet spot
  💰 cost      - Minimize spend, time flexible
  ✓ quality    - Max success rate, time/cost secondary

Usage: !optimize <mode>`;
  }
  
  try {
    setMode(mode);
    return `✅ Optimization mode changed to: ${mode.toUpperCase()}

${formatModeStatus()}`;
  } catch (error) {
    return `❌ Error: ${error.message}`;
  }
}

/**
 * Handle !status command
 */
function handleStatusCommand() {
  const budget = loadBudgetConfig();
  const accuracy = loadAccuracyConfig();
  const { getCurrentMode } = require('./optimizer.js');
  const optMode = getCurrentMode();
  
  // Get current spend
  let spentToday = 0;
  try {
    const spawnLog = path.join(process.cwd(), 'spawn-log.jsonl');
    if (fs.existsSync(spawnLog)) {
      const today = new Date().toISOString().split('T')[0];
      const lines = fs.readFileSync(spawnLog, 'utf-8')
        .trim()
        .split('\n')
        .filter(line => line.trim());
      
      spentToday = lines
        .map(line => JSON.parse(line))
        .filter(entry => entry.timestamp && entry.timestamp.startsWith(today))
        .reduce((sum, entry) => sum + (entry.estimatedCost || 0), 0);
    }
  } catch (e) {}
  
  const remaining = budget.daily_budget - spentToday;
  const percentUsed = (spentToday / budget.daily_budget) * 100;
  
  let budgetEmoji = '✅';
  if (percentUsed >= 80) budgetEmoji = '⚠️';
  if (percentUsed >= 100) budgetEmoji = '🔴';
  
  return `📊 LeadFlow Orchestrator Status

${budgetEmoji} Budget: $${spentToday.toFixed(2)} / $${budget.daily_budget.toFixed(2)} (${percentUsed.toFixed(0)}%)
Remaining: $${remaining.toFixed(2)}

🎯 Accuracy Threshold: ${accuracy.threshold}%

⚡ Optimization: ${optMode.emoji} ${optMode.name}
   Speed: ${(optMode.tradeoffs.speed_weight * 100).toFixed(0)}% | Cost: ${(optMode.tradeoffs.cost_weight * 100).toFixed(0)}% | Quality: ${(optMode.tradeoffs.quality_weight * 100).toFixed(0)}%

🐝 Swarm: ${(() => { try { const s = JSON.parse(fs.readFileSync('.swarm-state.json')); return s.enabled ? (s.mode === 'conservative' ? '🟢' : s.mode === 'balanced' ? '🔵' : '🔴') + ' ' + s.mode.toUpperCase() + ' (' + s.activeAgents + ' agents)' : '⏸️ OFF'; } catch(e) { return '⏸️ OFF'; } })()}

Commands:
  !budget [amount]     - View or change daily budget
  !accuracy [percent]  - View or change accuracy threshold
  !optimize [mode]     - Set optimization (speed/balanced/cost/quality)
  !status              - Show this status`;
}

/**
 * Handle !goal command
 * Format: !goal <action> [args]
 */
function handleGoalCommand(args) {
  if (!args || args.length === 0) {
    const { execSync } = require('child_process');
    try {
      const goals = JSON.parse(execSync('node goal-planner.js --list', { encoding: 'utf-8' }));
      return `🎯 Active Goals:\n${goals}`;
    } catch (e) {
      return `🎯 Goal Planner

Commands:
  !goal plan "<milestone> by <date>"  - Plan new goal
  !goal status "<milestone>"          - Check progress
  !goal list                          - Show all goals

Examples:
  !goal plan "First paying customer by March 7"
  !goal status "First Paying Customer"`;
    }
  }
  
  const action = args[0].toLowerCase();
  const rest = args.slice(1).join(' ');
  
  const { execSync } = require('child_process');
  
  try {
    switch (action) {
      case 'plan':
        const plan = execSync(`node goal-planner.js --plan "${rest}"`, { encoding: 'utf-8' });
        return plan.substring(0, 1500) + (plan.length > 1500 ? '\n\n...(truncated)' : '');
        
      case 'status':
        const status = execSync(`node goal-planner.js --check "${rest}"`, { encoding: 'utf-8' });
        return status;
        
      case 'list':
        const list = execSync('node goal-planner.js --list', { encoding: 'utf-8' });
        return list;
        
      default:
        return '❌ Unknown action. Use: plan, status, or list';
    }
  } catch (error) {
    return `❌ Error: ${error.message}`;
  }
}

/**
 * Handle !health command
 */
function handleHealthCommand(args) {
  const { execSync } = require('child_process');
  
  try {
    const health = execSync('node self-heal.js --check-all', { encoding: 'utf-8' });
    return health;
  } catch (error) {
    // If exit code 1, there were critical issues
    return `⚠️ Health check found issues:\n${error.stdout || error.message}`;
  }
}

/**
 * Handle !swarm command
 * Format: !swarm <on|off|status> [mode]
 */
function handleSwarmCommand(args) {
  const { execSync } = require('child_process');
  
  if (!args || args.length === 0) {
    try {
      const status = execSync('node swarm-coordinator.js --status', { encoding: 'utf-8' });
      return status;
    } catch (e) {
      return '🐝 Swarm Intelligence\n\nStarts OFF by default for cost control.\n\nCommands:\n  !swarm on [mode]  - Enable swarm\n  !swarm off        - Disable swarm\n  !swarm status     - Show status\n\nModes:\n  🟢 conservative  - 2-3 agents, strict budget\n  🔵 balanced      - 4-5 agents, moderate\n  🔴 aggressive    - 6-10 agents, max speed';
    }
  }
  
  const action = args[0].toLowerCase();
  const mode = args[1] || 'conservative';
  
  try {
    switch (action) {
      case 'on':
      case 'enable':
        const onResult = execSync(`node swarm-coordinator.js --on ${mode}`, { encoding: 'utf-8' });
        return `✅ ${onResult}\n\n⚠️ Swarm increases parallelism but also cost.\nMonitor with: !swarm status`;
        
      case 'off':
      case 'disable':
        const offResult = execSync('node swarm-coordinator.js --off', { encoding: 'utf-8' });
        return `⏸️ ${offResult}\n\n✅ Cost control restored - single agent execution`;
        
      case 'status':
        return execSync('node swarm-coordinator.js --status', { encoding: 'utf-8' });
        
      default:
        return '❌ Unknown action. Use: on, off, or status';
    }
  } catch (error) {
    return `❌ Error: ${error.message}`;
  }
}

/**
 * Handle !decide command — approve a product decision
 * Format: !decide <decision-id> <option-id> [reason...]
 */
async function handleDecideCommand(args) {
  if (!args || args.length < 2) {
    return `🔴 Usage: !decide <decision-id> <option-id> [reason]

Example: !decide abc123 supabase-auth "Already using Supabase"`;
  }

  const decisionId = args[0];
  const optionId = args[1];
  const reason = args.slice(2).join(' ').replace(/^["']|["']$/g, '') || null;

  try {
    const { TaskStore } = require('./task-store');
    const store = new TaskStore();
    if (!store.supabase) return '❌ No Supabase connection';

    // Find decision by prefix match (allow short IDs)
    const { data: decisions } = await store.supabase
      .from('product_decisions').select('id, title, status, options')
      .eq('status', 'proposed')
      .ilike('id', `${decisionId}%`);

    if (!decisions?.length) return `❌ No pending decision found matching "${decisionId}"`;
    if (decisions.length > 1) return `❌ Ambiguous ID "${decisionId}" — matches ${decisions.length} decisions. Use a longer prefix.`;

    const decision = decisions[0];

    const { error } = await store.supabase
      .from('product_decisions').update({
        status: 'approved',
        decided_by: 'human:stojan',
        decided_option: optionId,
        decision_reason: reason || `Approved via !decide`,
        decided_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }).eq('id', decision.id);

    if (error) return `❌ Update failed: ${error.message}`;

    return `✅ Decision approved: ${decision.title}\nOption: ${optionId}${reason ? `\nReason: ${reason}` : ''}\nNext heartbeat will create implementation tasks.`;
  } catch (err) {
    return `❌ Error: ${err.message}`;
  }
}

/**
 * Handle !reviews command — show recent product reviews and pending decisions
 * Format: !reviews [status]
 */
async function handleReviewsCommand(args) {
  try {
    const { TaskStore } = require('./task-store');
    const store = new TaskStore();
    if (!store.supabase) return '❌ No Supabase connection';

    const { getConfig } = require('./project-config-loader');
    const projectId = getConfig().project_id;

    // Get recent reviews
    const { data: reviews } = await store.supabase
      .from('product_reviews').select('id, review_type, verdict, readiness_score, status, created_at, scope_prd_id')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(5);

    // Get pending decisions
    const { data: pendingDecisions } = await store.supabase
      .from('product_decisions').select('id, title, category, blocking, status, created_at')
      .eq('project_id', projectId)
      .eq('status', 'proposed');

    let output = '📋 Product Reviews\n';

    if (reviews?.length) {
      output += '\nRecent Reviews:\n';
      for (const r of reviews) {
        const icon = r.verdict === 'pass' ? '✅' : r.verdict === 'fail' ? '❌' : r.verdict === 'pass_with_issues' ? '⚠️' : '⏳';
        const score = r.readiness_score != null ? ` (${r.readiness_score}/100)` : '';
        const date = new Date(r.created_at).toLocaleDateString();
        output += `  ${icon} ${r.review_type}${r.scope_prd_id ? ` — ${r.scope_prd_id}` : ''} [${r.status}]${score} (${date})\n`;
      }
    } else {
      output += '\nNo reviews yet.\n';
    }

    if (pendingDecisions?.length) {
      output += `\n🔴 Pending Decisions (${pendingDecisions.length}):\n`;
      for (const d of pendingDecisions) {
        const icon = d.blocking ? '🚫' : '💡';
        output += `  ${icon} ${d.title} [${d.category}] (${d.id.slice(0, 8)})\n`;
      }
      output += '\nUse !decide <id> <option> [reason] to approve';
    } else {
      output += '\n✅ No pending decisions.';
    }

    return output;
  } catch (err) {
    return `❌ Error: ${err.message}`;
  }
}

/**
 * Handle !fix command — create a quick-fix UC and dev task
 * Format: !fix <description>
 */
async function handleFixCommand(args) {
  try {
    const desc = args.join(' ').replace(/^["']|["']$/g, '').trim();
    if (!desc) return '❌ Usage: !fix <description>\nExample: !fix "signup button returns 404"';

    const { TaskStore } = require('./task-store');
    const store = new TaskStore();
    if (!store.supabase) return '❌ No Supabase connection';

    const { getConfig } = require('./project-config-loader');
    const { buildRoleContext, selectInitialModel, estimateCost } = require('./workflow-engine');
    const projectId = getConfig().project_id;

    // Generate UC id from description
    const slug = desc.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
    const ucId = `fix-${slug}`;

    // Check if UC already exists
    const { data: existing } = await store.supabase
      .from('use_cases').select('id').eq('id', ucId).single();
    if (existing) return `❌ UC "${ucId}" already exists`;

    const workflow = ['dev', 'qc'];

    // Create UC
    await store.supabase.from('use_cases').insert({
      id: ucId,
      name: desc,
      description: `Quick fix: ${desc}`,
      workflow,
      priority: 1,
      project_id: projectId,
      implementation_status: 'not_started'
    });

    // Create first dev task
    const model = selectInitialModel('dev', { name: desc, priority: 1, workflow });
    const roleCtx = buildRoleContext('dev', desc, '', { workflowStep: 0, workflowTotal: workflow.length });

    await store.createTask({
      title: `Dev: ${ucId} - ${desc}`,
      agent_id: 'dev',
      status: 'ready',
      model,
      priority: 1,
      use_case_id: ucId,
      estimated_cost_usd: estimateCost(model, 'dev'),
      tags: ['feature', 'quick-fix'],
      description: roleCtx.description,
      metadata: { created_by: 'telegram-fix', workflow_step: 0, workflow_total: workflow.length }
    });

    return `✅ Created UC "${ucId}" + dev task. Will chain to QC on completion.`;
  } catch (err) {
    return `❌ Error: ${err.message}`;
  }
}

/**
 * Handle !feature command — create a feature UC with PM→Dev→QC workflow
 * Format: !feature <description>
 */
async function handleFeatureCommand(args) {
  try {
    const desc = args.join(' ').replace(/^["']|["']$/g, '').trim();
    if (!desc) return '❌ Usage: !feature <description>\nExample: !feature "add dark mode to dashboard"';

    const { TaskStore } = require('./task-store');
    const store = new TaskStore();
    if (!store.supabase) return '❌ No Supabase connection';

    const { getConfig } = require('./project-config-loader');
    const { buildRoleContext, selectInitialModel, estimateCost } = require('./workflow-engine');
    const projectId = getConfig().project_id;

    // Generate UC id from description
    const slug = desc.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
    const ucId = `feat-${slug}`;

    // Check if UC already exists
    const { data: existing } = await store.supabase
      .from('use_cases').select('id').eq('id', ucId).single();
    if (existing) return `❌ UC "${ucId}" already exists`;

    const workflow = ['product', 'dev', 'qc'];

    // Create UC
    await store.supabase.from('use_cases').insert({
      id: ucId,
      name: desc,
      description: `Feature request: ${desc}`,
      workflow,
      priority: 2,
      project_id: projectId,
      implementation_status: 'not_started'
    });

    // Create first PM task
    const model = selectInitialModel('product', { name: desc, priority: 2, workflow });
    const roleCtx = buildRoleContext('product', desc, '', { workflowStep: 0, workflowTotal: workflow.length });

    await store.createTask({
      title: `PM: ${ucId} - ${desc}`,
      agent_id: 'product',
      status: 'ready',
      model,
      priority: 2,
      use_case_id: ucId,
      estimated_cost_usd: estimateCost(model, 'product'),
      tags: ['feature', 'quick-feature'],
      description: roleCtx.description,
      metadata: { created_by: 'telegram-feature', workflow_step: 0, workflow_total: workflow.length }
    });

    return `✅ Created UC "${ucId}" + PM task. Will chain PM→Dev→QC.`;
  } catch (err) {
    return `❌ Error: ${err.message}`;
  }
}

/**
 * Main handler — returns string or Promise<string>
 */
function handleCommand(input) {
  const parts = input.trim().split(/\s+/);
  const command = parts[0].toLowerCase();
  const args = parts.slice(1);

  switch (command) {
    case '!budget':
      return handleBudgetCommand(args);
    case '!accuracy':
      return handleAccuracyCommand(args);
    case '!optimize':
      return handleOptimizeCommand(args);
    case '!goal':
      return handleGoalCommand(args);
    case '!health':
      return handleHealthCommand(args);
    case '!swarm':
      return handleSwarmCommand(args);
    case '!status':
      return handleStatusCommand();
    case '!decide':
      return handleDecideCommand(args);
    case '!reviews':
      return handleReviewsCommand(args);
    case '!fix':
      return handleFixCommand(args);
    case '!feature':
      return handleFeatureCommand(args);
    default:
      return null; // Not a command we handle
  }
}

// CLI mode
if (require.main === module) {
  const flag = process.argv[2];
  const input = process.argv[3];

  if (flag === '--handle' && input) {
    const response = handleCommand(input);
    // Handle both sync and async responses
    Promise.resolve(response).then(result => {
      if (result) {
        console.log(result);
        process.exit(0);
      } else {
        process.exit(1); // Not handled
      }
    }).catch(err => {
      console.error('Error:', err.message);
      process.exit(1);
    });
  } else {
    console.log(`
Telegram Command Handler

Usage:
  node telegram-commands.js --handle '!budget 10'
  node telegram-commands.js --handle '!accuracy 75'
  node telegram-commands.js --handle '!status'

Commands:
  !budget [amount]     - Set or view daily budget
  !accuracy [percent]  - Set or view accuracy threshold
  !optimize [mode]     - Set optimization mode (speed/balanced/cost/quality)
  !goal [action]       - Goal planning (plan/status/list)
  !health              - Run health checks
  !swarm [action]      - Swarm control (on/off/status) - starts OFF
  !status              - Show full status
  !decide <id> <opt>   - Approve a product decision
  !reviews [status]    - Show product reviews & decisions
  !fix <description>   - Quick-fix: create UC + dev task (chains to QC)
  !feature <desc>      - New feature: create UC + PM task (chains PM→Dev→QC)
`);
  }
}

module.exports = { handleCommand, handleBudgetCommand, handleAccuracyCommand, handleOptimizeCommand, handleGoalCommand, handleHealthCommand, handleSwarmCommand, handleDecideCommand, handleReviewsCommand, handleFixCommand, handleFeatureCommand };
