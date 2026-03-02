#!/usr/bin/env node
/**
 * Optimizer - Multi-Objective Optimization Engine (Phase 3, Option B)
 * 
 * Balances speed, cost, and quality based on selected mode.
 * 
 * Usage:
 *   const optimizer = require('./optimizer');
 *   optimizer.setMode('speed');
 *   const decision = optimizer.optimizeSpawn(task, budgetRemaining);
 */

const fs = require('fs');
const path = require('path');
const { getConfig: _getProjectConfig } = require('./project-config-loader');

const CONFIG_PATH = path.join(process.cwd(), 'strategy-config.json');
const CURRENT_MODE_FILE = path.join(process.cwd(), '.current-optimization-mode.json');

// Load configuration
let config = {};
try {
  config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
} catch (e) {
  console.error('Failed to load strategy-config.json:', e.message);
  process.exit(1);
}

// Current mode
let currentMode = 'balanced';
try {
  if (fs.existsSync(CURRENT_MODE_FILE)) {
    const saved = JSON.parse(fs.readFileSync(CURRENT_MODE_FILE, 'utf-8'));
    currentMode = saved.mode || 'balanced';
  }
} catch (e) {
  currentMode = 'balanced';
}

/**
 * Set optimization mode (writes to local file + Supabase metrics)
 */
function setMode(mode) {
  if (!config.modes[mode]) {
    throw new Error(`Invalid mode: ${mode}. Choose from: ${Object.keys(config.modes).join(', ')}`);
  }
  currentMode = mode;
  const modeData = { mode, updated_at: new Date().toISOString() };
  fs.writeFileSync(CURRENT_MODE_FILE, JSON.stringify(modeData, null, 2));
  // Also persist to Supabase so dashboard reads from DB
  try {
    const { createClient } = require('@supabase/supabase-js');
    require('dotenv').config({ path: path.join(process.cwd(), '.env') });
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (url && key) {
      const sb = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
      sb.from('metrics').insert({
        project_id: _getProjectConfig().project_id, domain: 'orchestrator',
        metric_type: 'optimization_mode', data: modeData
      }).then(() => {}).catch(() => {});
    }
  } catch (_) { /* best-effort */ }
  return getCurrentMode();
}

/**
 * Get current mode configuration
 */
function getCurrentMode() {
  return {
    mode: currentMode,
    ...config.modes[currentMode]
  };
}

/**
 * Get all available modes
 */
function getAvailableModes() {
  return Object.entries(config.modes).map(([key, mode]) => ({
    key,
    name: mode.name,
    description: mode.description,
    emoji: mode.emoji
  }));
}

/**
 * Calculate Pareto frontier for a decision
 * Returns optimal choice given constraints
 */
function calculateParetoFrontier(options, constraints = {}) {
  const mode = config.modes[currentMode];
  const { speed_weight, cost_weight, quality_weight } = mode.tradeoffs;
  
  const scored = options.map(opt => {
    // Normalize scores (0-1)
    const speedScore = opt.speed_score || 0.5;
    const costScore = opt.cost_score || 0.5;
    const qualityScore = opt.quality_score || 0.5;
    
    // Weighted score
    const totalScore = 
      (speedScore * speed_weight) +
      (costScore * cost_weight) +
      (qualityScore * quality_weight);
    
    return {
      ...opt,
      weighted_score: totalScore,
      breakdown: {
        speed: speedScore * speed_weight,
        cost: costScore * cost_weight,
        quality: qualityScore * quality_weight
      }
    };
  });
  
  // Sort by weighted score descending
  scored.sort((a, b) => b.weighted_score - a.weighted_score);
  
  // Filter by constraints
  const valid = scored.filter(opt => {
    if (constraints.max_cost && opt.cost > constraints.max_cost) return false;
    if (constraints.min_quality && opt.quality < constraints.min_quality) return false;
    if (constraints.max_time && opt.time > constraints.max_time) return false;
    return true;
  });
  
  return valid.length > 0 ? valid[0] : scored[0];
}

/**
 * Optimize spawn decision
 */
function optimizeSpawn(task, budgetRemaining, parallelAgents = 0) {
  const mode = config.modes[currentMode];
  const rules = mode.rules;
  
  // Check parallel agent limit
  const canSpawnParallel = parallelAgents < rules.max_parallel_agents && mode.behavior.parallel_spawning;
  
  // Get base model recommendation
  const baseModel = task.model || 'qwen3.5';
  const modelCost = config.model_costs[baseModel] || 0.30;
  const estimatedCost = modelCost * (task.estimated_hours || 2);
  
  // Check budget constraint
  const withinBudget = estimatedCost <= (budgetRemaining * rules.budget_ceiling_multiplier);
  
  // Generate model options
  const modelOptions = ['qwen', 'qwen3.5', 'opus'].map(model => {
    const cost = config.model_costs[model] * (task.estimated_hours || 2);
    const speed = config.model_speed[model] === 'fast' ? 1.0 : config.model_speed[model] === 'medium' ? 0.6 : 0.3;
    const quality = (config.model_quality[model] || 75) / 100;
    
    return {
      model,
      cost,
      speed_score: speed,
      cost_score: 1 - (cost / 20), // Normalize cost (max $20)
      quality_score: quality,
      preferred: rules.preferred_models.includes(model),
      avoided: rules.avoid_models.includes(model)
    };
  });
  
  // Filter by preferences
  let validOptions = modelOptions;
  if (rules.avoid_models.length > 0) {
    validOptions = validOptions.filter(o => !o.avoided);
  }
  if (mode.tradeoffs.quality_weight > 0.8) {
    // Quality mode: prefer high-quality models
    validOptions = validOptions.filter(o => o.quality_score >= 0.85);
  }
  if (mode.tradeoffs.cost_weight > 0.8) {
    // Cost mode: prefer cheap models
    validOptions = validOptions.filter(o => o.cost <= budgetRemaining * 0.5);
  }
  
  if (validOptions.length === 0) validOptions = modelOptions;
  
  // Calculate optimal
  const optimal = calculateParetoFrontier(validOptions, {
    max_cost: budgetRemaining * rules.budget_ceiling_multiplier,
    min_quality: rules.quality_threshold / 100
  });
  
  // Determine if should decompose
  const shouldDecompose = mode.behavior.aggressive_decomposition && 
    (task.estimated_hours > 4 || task.complexity > rules.decompose_threshold * 10);
  
  // Determine retry strategy
  const retryStrategy = rules.retry_strategy;
  
  return {
    mode: currentMode,
    recommended_model: optimal.model,
    estimated_cost: optimal.cost,
    can_spawn_parallel: canSpawnParallel,
    should_decompose: shouldDecompose,
    retry_strategy: retryStrategy,
    quality_threshold: rules.quality_threshold,
    within_budget: withinBudget,
    optimization_score: optimal.weighted_score,
    reasoning: generateReasoning(optimal, mode, withinBudget)
  };
}

/**
 * Optimize task queue order
 */
function optimizeQueueOrder(tasks) {
  const mode = config.modes[currentMode];
  
  // Sort by priority, then by optimization criteria
  return tasks.sort((a, b) => {
    // Priority first
    if (a.priority !== b.priority) return a.priority - b.priority;
    
    // Then by mode preference
    if (mode.tradeoffs.speed_weight > 0.7) {
      // Speed: shorter tasks first
      return (a.estimated_hours || 2) - (b.estimated_hours || 2);
    } else if (mode.tradeoffs.cost_weight > 0.7) {
      // Cost: cheaper tasks first
      const costA = (config.model_costs[a.model] || 0.30) * (a.estimated_hours || 2);
      const costB = (config.model_costs[b.model] || 0.30) * (b.estimated_hours || 2);
      return costA - costB;
    } else {
      // Quality: complex tasks first (more attention)
      return (b.complexity || 5) - (a.complexity || 5);
    }
  });
}

/**
 * Generate human-readable reasoning
 */
function generateReasoning(optimal, mode, withinBudget) {
  const reasons = [];
  
  reasons.push(`Mode: ${mode.name} (${mode.emoji})`);
  reasons.push(`Selected model: ${optimal.model} (score: ${(optimal.weighted_score * 100).toFixed(1)}%)`);
  
  if (!withinBudget) {
    reasons.push(`⚠️ Over budget ceiling, but allowed in ${currentMode} mode`);
  }
  
  if (optimal.preferred) {
    reasons.push(`✓ Preferred model for ${currentMode} mode`);
  }
  
  return reasons;
}

/**
 * Format mode status for display
 */
function formatModeStatus() {
  const mode = config.modes[currentMode];
  const { speed_weight, cost_weight, quality_weight } = mode.tradeoffs;
  
  const bar = (weight) => '█'.repeat(Math.round(weight * 10)) + '░'.repeat(10 - Math.round(weight * 10));
  
  return `
╔══════════════════════════════════════════════════════════╗
║     OPTIMIZATION MODE: ${mode.emoji} ${mode.name.toUpperCase().padEnd(26)} ║
╠══════════════════════════════════════════════════════════╣
║                                                          ║
║   SPEED:   ${bar(speed_weight)} ${(speed_weight * 100).toFixed(0)}%          ║
║   COST:    ${bar(cost_weight)} ${(cost_weight * 100).toFixed(0)}%          ║
║   QUALITY: ${bar(quality_weight)} ${(quality_weight * 100).toFixed(0)}%          ║
║                                                          ║
╠══════════════════════════════════════════════════════════╣
║   Max Parallel Agents: ${mode.rules.max_parallel_agents}                                ║
║   Quality Threshold:  ${mode.rules.quality_threshold}%                             ║
║   Decompose:          ${mode.behavior.aggressive_decomposition ? 'Aggressive' : 'Standard'}                    ║
║   Spawning:           ${mode.behavior.parallel_spawning ? 'Parallel' : 'Serial'}                     ║
╚══════════════════════════════════════════════════════════╝

${mode.description}
`;
}

// CLI
if (require.main === module) {
  const command = process.argv[2];
  const arg = process.argv[3];
  
  switch (command) {
    case '--set':
    case '--mode':
      const result = setMode(arg);
      console.log(formatModeStatus());
      break;
      
    case '--get':
      console.log(formatModeStatus());
      break;
      
    case '--list':
      console.log('Available modes:');
      getAvailableModes().forEach(m => {
        console.log(`  ${m.emoji} ${m.key.padEnd(10)} - ${m.name}`);
      });
      break;
      
    default:
      console.log(`
Optimizer - Multi-Objective Optimization

Commands:
  --set <mode>    Set optimization mode (speed/balanced/cost/quality)
  --get           Show current mode
  --list          List available modes

Examples:
  node optimizer.js --set speed
  node optimizer.js --set cost
  node optimizer.js --get
`);
  }
}

module.exports = {
  setMode,
  getCurrentMode,
  getAvailableModes,
  optimizeSpawn,
  optimizeQueueOrder,
  calculateParetoFrontier,
  formatModeStatus
};
