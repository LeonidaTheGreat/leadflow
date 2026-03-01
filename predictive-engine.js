#!/usr/bin/env node
/**
 * Predictive Engine - Phase 2 Implementation
 * 
 * Predicts task outcomes before spawning based on:
 * - Task type patterns from LEARNINGS.md
 * - Model performance history
 * - Task complexity/size indicators
 * - Recent success/failure trends
 * 
 * Usage:
 *   node predictive-engine.js --analyze <task-id>
 *   node predictive-engine.js --predict <task-type> <estimated-hours>
 *   node predictive-engine.js --recommend-model <task-id>
 *   node predictive-engine.js --should-decompose <task-id>
 */

const fs = require('fs');
const path = require('path');

const LEARNINGS_FILE = path.join(process.cwd(), 'LEARNINGS.md');
const DECISION_LOG = path.join(process.cwd(), '.orchestrator-decisions.jsonl');
const PREDICTIONS_LOG = path.join(process.cwd(), '.predictions.jsonl');

// Task type taxonomy with historical success rates
const TASK_TYPE_PATTERNS = {
  'dashboard': { 
    baseSuccessRate: 0.45, 
    decomposedSuccessRate: 0.95,
    recommendedModel: 'haiku',
    autoDecompose: true,
    maxHours: 4
  },
  'integration': { 
    baseSuccessRate: 0.35, 
    decomposedSuccessRate: 0.78,
    recommendedModel: 'sonnet',
    autoDecompose: true,
    maxHours: 4
  },
  'api': { 
    baseSuccessRate: 0.60, 
    decomposedSuccessRate: 0.88,
    recommendedModel: 'kimi',
    autoDecompose: true,
    maxHours: 3
  },
  'landing_page': { 
    baseSuccessRate: 0.75, 
    decomposedSuccessRate: 0.92,
    recommendedModel: 'kimi',
    autoDecompose: true,
    maxHours: 3
  },
  'documentation': { 
    baseSuccessRate: 0.90, 
    decomposedSuccessRate: 0.90,
    recommendedModel: 'qwen',
    autoDecompose: false,
    maxHours: 10
  },
  'bug_fix': { 
    baseSuccessRate: 0.70, 
    decomposedSuccessRate: 0.70,
    recommendedModel: 'kimi',
    autoDecompose: false,
    maxHours: 5
  },
  'sms_template': { 
    baseSuccessRate: 0.85, 
    decomposedSuccessRate: 0.85,
    recommendedModel: 'kimi',
    autoDecompose: false,
    maxHours: 5
  },
  'refactoring': { 
    baseSuccessRate: 0.80, 
    decomposedSuccessRate: 0.80,
    recommendedModel: 'haiku',
    autoDecompose: false,
    maxHours: 5
  },
  'feature': { 
    baseSuccessRate: 0.65, 
    decomposedSuccessRate: 0.85,
    recommendedModel: 'kimi',
    autoDecompose: true,
    maxHours: 4
  },
  'testing': { 
    baseSuccessRate: 0.88, 
    decomposedSuccessRate: 0.88,
    recommendedModel: 'haiku',
    autoDecompose: false,
    maxHours: 10
  },
  'setup': { 
    baseSuccessRate: 0.85, 
    decomposedSuccessRate: 0.85,
    recommendedModel: 'kimi',
    autoDecompose: false,
    maxHours: 10
  }
};

// Model performance from recent history
const MODEL_PERFORMANCE = {
  'qwen': { successRate: 0.85, avgCost: 0, speed: 'fast' },
  'kimi': { successRate: 0.75, avgCost: 0.30, speed: 'medium' },
  'haiku': { successRate: 0.88, avgCost: 0.50, speed: 'medium' },
  'sonnet': { successRate: 0.92, avgCost: 2.00, speed: 'slow' },
  'opus': { successRate: 0.95, avgCost: 8.00, speed: 'slow' }
};

/**
 * Detect task type from title/description
 */
function detectTaskType(task) {
  const text = (task.title + ' ' + (task.description || '')).toLowerCase();
  
  const patterns = {
    'dashboard': /dashboard|metrics|stats|kpi|analytics/,
    'integration': /integration|stripe|webhook|api.*connect|third.party/,
    'api': /api|endpoint|route|handler/,
    'landing_page': /landing|homepage|website|page.*design/,
    'documentation': /docs?|readme|guide|tutorial/,
    'bug_fix': /bug|fix|repair|broken|error/,
    'sms_template': /sms|message|template|twilio/,
    'refactoring': /refactor|cleanup|restructure|rewrite/,
    'testing': /test|spec|validation|qa/,
    'setup': /setup|config|initialize|install|npm|package/,
    'feature': /feature|implement|build|create|add/
  };
  
  for (const [type, regex] of Object.entries(patterns)) {
    if (regex.test(text)) return type;
  }
  
  return 'feature'; // Default
}

/**
 * Predict task success probability
 */
function predictSuccess(task, chosenModel = null) {
  const taskType = detectTaskType(task);
  const hours = task.estimated_hours || 2;
  const pattern = TASK_TYPE_PATTERNS[taskType] || TASK_TYPE_PATTERNS['feature'];
  
  // Base success rate for task type
  let successRate = pattern.baseSuccessRate;
  
  // Adjust for task size (larger = lower success)
  if (hours > pattern.maxHours) {
    successRate *= 0.6; // 40% penalty for oversized tasks
  }
  
  // Adjust for model choice
  if (chosenModel) {
    const modelPerf = MODEL_PERFORMANCE[chosenModel];
    if (modelPerf) {
      // Blend task type success with model success
      successRate = (successRate + modelPerf.successRate) / 2;
    }
  }
  
  // Check if task should be decomposed
  const shouldDecompose = shouldDecomposeTask(task, taskType);
  
  // If decomposed, use higher success rate
  const decomposedRate = shouldDecompose ? pattern.decomposedSuccessRate : successRate;
  
  return {
    taskType,
    estimatedHours: hours,
    baseSuccessRate: Math.round(pattern.baseSuccessRate * 100),
    predictedSuccessRate: Math.round(successRate * 100),
    decomposedSuccessRate: Math.round(pattern.decomposedSuccessRate * 100),
    shouldDecompose,
    recommendedModel: pattern.recommendedModel,
    confidence: hours <= pattern.maxHours ? 'high' : 'low',
    reasoning: generateReasoning(task, taskType, successRate, shouldDecompose)
  };
}

/**
 * Determine if task should be auto-decomposed
 */
function shouldDecomposeTask(task, taskType = null) {
  const type = taskType || detectTaskType(task);
  const pattern = TASK_TYPE_PATTERNS[type];
  const hours = task.estimated_hours || 2;
  
  if (!pattern) return hours > 4;
  
  return (
    hours > pattern.maxHours ||
    pattern.autoDecompose ||
    (task.title + ' ' + (task.description || '')).toLowerCase().includes('and')
  );
}

/**
 * Recommend optimal model for task
 */
function recommendModel(task, budgetRemaining = 15) {
  const taskType = detectTaskType(task);
  const pattern = TASK_TYPE_PATTERNS[taskType] || TASK_TYPE_PATTERNS['feature'];
  const hours = task.estimated_hours || 2;
  
  const recommended = pattern.recommendedModel;
  const modelPerf = MODEL_PERFORMANCE[recommended];
  const estimatedCost = modelPerf.avgCost * hours;
  
  // Check budget constraints
  const alternatives = [];
  
  if (estimatedCost > budgetRemaining * 0.5) {
    // Suggest cheaper alternatives
    const cheaperModels = Object.entries(MODEL_PERFORMANCE)
      .filter(([name, perf]) => perf.avgCost * hours <= budgetRemaining * 0.5)
      .sort((a, b) => b[1].successRate - a[1].successRate);
    
    if (cheaperModels.length > 0) {
      alternatives.push({
        model: cheaperModels[0][0],
        cost: cheaperModels[0][1].avgCost * hours,
        successRate: Math.round(cheaperModels[0][1].successRate * 100),
        reason: 'Budget-friendly alternative'
      });
    }
  }
  
  // Check if task needs stronger model
  if (pattern.baseSuccessRate < 0.5 && recommended !== 'sonnet' && recommended !== 'opus') {
    alternatives.push({
      model: 'sonnet',
      cost: 2.00 * hours,
      successRate: Math.round(MODEL_PERFORMANCE.sonnet.successRate * 100),
      reason: 'Higher success rate for this task type'
    });
  }
  
  return {
    recommended,
    estimatedCost,
    successRate: Math.round(modelPerf.successRate * 100),
    alternatives: alternatives.slice(0, 2),
    withinBudget: estimatedCost <= budgetRemaining
  };
}

/**
 * Generate human-readable reasoning
 */
function generateReasoning(task, taskType, successRate, shouldDecompose) {
  const reasons = [];
  
  reasons.push(`Task type "${taskType}" has ${Math.round(TASK_TYPE_PATTERNS[taskType]?.baseSuccessRate * 100 || 65)}% base success rate`);
  
  if (task.estimated_hours > 4) {
    reasons.push(`Task size (${task.estimated_hours}h) exceeds optimal threshold (4h), reducing success probability`);
  }
  
  if (shouldDecompose) {
    reasons.push(`Auto-decomposition recommended: breaks complex task into manageable pieces`);
  }
  
  return reasons;
}

/**
 * Predict queue exhaustion
 */
function predictQueueExhaustion(tasks, spawnRatePerHour = 2) {
  const ready = tasks.filter(t => t.status === 'ready');
  const inProgress = tasks.filter(t => t.status === 'in_progress');
  
  const avgCompletionTime = 2.5; // hours per task
  const completionRate = inProgress.length / avgCompletionTime; // tasks per hour completing
  
  const readyHours = ready.length / spawnRatePerHour;
  const completionHours = inProgress.length > 0 ? inProgress.length * avgCompletionTime : Infinity;
  
  const willEmpty = readyHours < 2; // Less than 2 hours of work
  
  return {
    readyTasks: ready.length,
    inProgressTasks: inProgress.length,
    estimatedEmptyTime: willEmpty ? `${Math.round(readyHours * 60)} minutes` : `${Math.round(readyHours)} hours`,
    willEmptySoon: willEmpty,
    recommendation: willEmpty ? 'Create new tasks immediately to prevent idle time' : 'Queue healthy'
  };
}

/**
 * Predict budget exhaustion
 */
function predictBudgetExhaustion(spentToday, dailyBudget, recentSpendRate) {
  const remaining = dailyBudget - spentToday;
  const hoursRemaining = remaining / (recentSpendRate || 0.5); // default $0.50/hr
  
  return {
    spentToday,
    remaining,
    dailyBudget,
    percentUsed: Math.round((spentToday / dailyBudget) * 100),
    estimatedExhaustion: recentSpendRate > 0 ? `~${Math.round(hoursRemaining)} hours` : 'N/A (no recent spend)',
    willExhaustToday: remaining < (recentSpendRate * 4), // Less than 4 hours at current rate
    recommendation: remaining < (dailyBudget * 0.2) ? 'Consider increasing budget for critical tasks' : 'Budget healthy'
  };
}

/**
 * Log prediction for learning
 */
function logPrediction(prediction) {
  const entry = {
    timestamp: new Date().toISOString(),
    ...prediction
  };
  fs.appendFileSync(PREDICTIONS_LOG, JSON.stringify(entry) + '\n');
}

/**
 * Format prediction for display
 */
function formatPrediction(prediction) {
  const emoji = prediction.predictedSuccessRate >= 80 ? '✅' : 
                prediction.predictedSuccessRate >= 60 ? '⚠️' : '❌';
  
  return `
${emoji} Prediction: ${prediction.predictedSuccessRate}% success probability

Task Type: ${prediction.taskType}
Estimated Hours: ${prediction.estimatedHours}

Base Success Rate: ${prediction.baseSuccessRate}%
Predicted with Model: ${prediction.predictedSuccessRate}%
If Decomposed: ${prediction.decomposedSuccessRate}%

Should Decompose: ${prediction.shouldDecompose ? 'YES ✂️' : 'NO'}
Recommended Model: ${prediction.recommendedModel}
Confidence: ${prediction.confidence}

Reasoning:
${prediction.reasoning.map(r => '  • ' + r).join('\n')}
`;
}

// CLI
const command = process.argv[2];

switch (command) {
  case '--predict':
    const title = process.argv[3];
    const hours = parseFloat(process.argv[4]) || 2;
    const model = process.argv[5];
    const pred = predictSuccess({ title, estimated_hours: hours }, model);
    console.log(formatPrediction(pred));
    logPrediction({ task: title, ...pred });
    break;
    
  case '--analyze':
    // Would load from task-store
    console.log('Use --predict with task details for now');
    break;
    
  case '--recommend-model':
    const taskTitle = process.argv[3];
    const budget = parseFloat(process.argv[4]) || 15;
    const rec = recommendModel({ title: taskTitle }, budget);
    console.log(`
Recommended Model: ${rec.recommended}
Estimated Cost: $${rec.estimatedCost.toFixed(2)}
Predicted Success: ${rec.successRate}%
Within Budget: ${rec.withinBudget ? '✅' : '❌'}

Alternatives:
${rec.alternatives.map(a => `  • ${a.model}: $${a.cost.toFixed(2)} (${a.successRate}%) - ${a.reason}`).join('\n') || '  None'}
`);
    break;
    
  case '--should-decompose':
    const dTitle = process.argv[3];
    const dHours = parseFloat(process.argv[4]) || 2;
    const should = shouldDecomposeTask({ title: dTitle, estimated_hours: dHours });
    console.log(`Should decompose: ${should ? 'YES ✂️' : 'NO'}`);
    break;
    
  case '--queue-health':
    // Would load tasks from Supabase
    console.log('Queue health prediction requires task data');
    break;
    
  default:
    console.log(`
Predictive Engine - Phase 2

Commands:
  --predict "<task-title>" <hours> [model]
  --recommend-model "<task-title>" [budget]
  --should-decompose "<task-title>" <hours>

Examples:
  node predictive-engine.js --predict "Build Dashboard" 6
  node predictive-engine.js --predict "API Integration" 4 kimi
  node predictive-engine.js --recommend-model "Stripe Webhook" 15
  node predictive-engine.js --should-decompose "Build Dashboard" 6
`);
}

module.exports = {
  predictSuccess,
  recommendModel,
  shouldDecomposeTask,
  predictQueueExhaustion,
  predictBudgetExhaustion,
  detectTaskType,
  formatPrediction
};
