#!/usr/bin/env node
/**
 * Smart Spawn - Phase 2 Integration
 * 
 * Spawns agents with predictive analysis:
 * - Pre-spawn success prediction
 * - Auto-decomposition when beneficial
 * - Optimal model selection
 * - Budget-aware decisions
 * 
 * Usage:
 *   node smart-spawn.js <task-id>
 *   node smart-spawn.js --analyze-only <task-id>
 */

const { TaskStore } = require('./task-store');
const { predictSuccess, recommendModel } = require('./predictive-engine');
const { autoDecompose } = require('./auto-decompose');
const { optimizeSpawn, getCurrentMode } = require('./optimizer');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const store = new TaskStore();
const SMART_SPAWN_LOG = path.join(process.cwd(), '.smart-spawns.jsonl');

/**
 * Analyze task before spawning
 */
async function analyzeTask(taskId) {
  const task = await store.getTask(taskId);
  if (!task) {
    throw new Error(`Task ${taskId} not found`);
  }
  
  // Get budget state
  const budgetConfig = require('./.budget-config.json');
  const remainingBudget = budgetConfig.daily_budget || 15;
  
  // Get optimization mode
  const optMode = getCurrentMode();
  
  // Get optimization recommendation
  const optRec = optimizeSpawn(task, remainingBudget);
  
  // Predict success with optimized model
  const prediction = predictSuccess(task, optRec.recommended_model);
  
  // Check if should decompose (using optimizer's recommendation)
  const decomposeCheck = await autoDecompose(taskId, true);
  const shouldDecompose = optRec.should_decompose && prediction.predictedSuccessRate < optRec.quality_threshold;
  
  return {
    task,
    optMode,
    optRec,
    prediction,
    decomposeCheck,
    recommendation: generateRecommendation(prediction, optRec, decomposeCheck, remainingBudget, optMode)
  };
}

/**
 * Generate final recommendation
 */
function generateRecommendation(prediction, optRec, decomposeCheck, budget, optMode) {
  const recommendations = [];
  let action = 'spawn';
  let model = optRec.recommended_model;
  
  // Add optimization mode context
  recommendations.push({
    type: 'mode',
    priority: 'info',
    message: `Operating in ${optMode.emoji} ${optMode.name} mode`,
    action: `Speed: ${(optMode.tradeoffs.speed_weight * 100).toFixed(0)}% | Cost: ${(optMode.tradeoffs.cost_weight * 100).toFixed(0)}% | Quality: ${(optMode.tradeoffs.quality_weight * 100).toFixed(0)}%`
  });
  
  // Check if decomposition is recommended (based on optimization mode)
  if (optRec.should_decompose && prediction.predictedSuccessRate < optRec.quality_threshold) {
    action = 'decompose';
    recommendations.push({
      type: 'decompose',
      priority: 'high',
      message: `Task has ${prediction.predictedSuccessRate}% success rate (below ${optRec.quality_threshold}% threshold), decomposition increases to ${prediction.decomposedSuccessRate}%`,
      action: `Decompose into ${decomposeCheck.subtasks?.length || 3} subtasks before spawning`
    });
  }
  
  // Check model optimization
  if (prediction.predictedSuccessRate < optRec.quality_threshold && optRec.recommended_model !== model) {
    recommendations.push({
      type: 'model',
      priority: 'medium',
      message: `Selected ${optRec.recommended_model} (optimization score: ${(optRec.optimization_score * 100).toFixed(1)}%)`,
      action: `Model chosen for ${optMode.name.toLowerCase()} mode`
    });
  }
  
  // Check budget
  if (!optRec.within_budget) {
    recommendations.push({
      type: 'budget',
      priority: optMode.tradeoffs.cost_weight > 0.7 ? 'high' : 'medium',
      message: `Task cost $${optRec.estimated_cost.toFixed(2)} may impact budget`,
      action: optMode.tradeoffs.cost_weight > 0.7 ? 'Consider deferring to next day' : 'Monitor spend closely'
    });
  }
  
  // Check parallel spawning capability
  if (!optRec.can_spawn_parallel && optMode.behavior.parallel_spawning) {
    recommendations.push({
      type: 'parallel',
      priority: 'low',
      message: 'At max parallel agents for current mode',
      action: 'Will spawn serially until slot available'
    });
  }
  
  return {
    action,
    model,
    shouldDecompose: optRec.should_decompose && prediction.predictedSuccessRate < optRec.quality_threshold,
    recommendations,
    confidence: prediction.predictedSuccessRate >= optRec.quality_threshold ? 'high' : 
                prediction.predictedSuccessRate >= optRec.quality_threshold * 0.8 ? 'medium' : 'low',
    optimization: optRec
  };
}

/**
 * Execute smart spawn
 */
async function smartSpawn(taskId, options = {}) {
  const analysis = await analyzeTask(taskId);
  
  console.log('🔮 Smart Spawn Analysis\n');
  console.log(`Mode: ${analysis.optMode.emoji} ${analysis.optMode.name}`);
  console.log(`Task: ${analysis.task.title}`);
  console.log(`Type: ${analysis.prediction.taskType}`);
  console.log(`Hours: ${analysis.task.estimated_hours}`);
  console.log(`\nPredicted Success: ${analysis.prediction.predictedSuccessRate}% (threshold: ${analysis.optRec.quality_threshold}%)`);
  console.log(`If Decomposed: ${analysis.prediction.decomposedSuccessRate}%`);
  console.log(`\nRecommended Action: ${analysis.recommendation.action.toUpperCase()}`);
  console.log(`Recommended Model: ${analysis.recommendation.model}`);
  console.log(`Estimated Cost: $${analysis.optRec.estimated_cost.toFixed(2)}`);
  
  if (analysis.recommendation.recommendations.length > 0) {
    console.log('\n⚠️  Recommendations:');
    analysis.recommendation.recommendations.forEach(rec => {
      const emoji = rec.priority === 'high' ? '🔴' : '🟡';
      console.log(`${emoji} ${rec.message}`);
      console.log(`   → ${rec.action}`);
    });
  }
  
  // If dry run, stop here
  if (options.dryRun) {
    return { ...analysis, executed: false };
  }
  
  // Execute based on recommendation
  let result;
  
  if (analysis.recommendation.shouldDecompose && !options.skipDecompose) {
    console.log('\n✂️  Auto-decomposing task...');
    result = await autoDecompose(taskId, false);
    console.log(`Created ${result.subtasksCreated?.length || 0} subtasks`);
    
    // Spawn first subtask
    if (result.subtasksCreated && result.subtasksCreated.length > 0) {
      const firstSubtask = await store.supabase
        .from('tasks')
        .select('*')
        .eq('title', result.subtasksCreated[0])
        .single();
      
      if (firstSubtask.data) {
        console.log(`\n🚀 Spawning first subtask: ${firstSubtask.data.title}`);
        // Would call actual spawn here
      }
    }
  } else {
    console.log('\n🚀 Spawning with model:', analysis.recommendation.model);
    // Update task model if different
    if (analysis.recommendation.model !== analysis.task.model) {
      await store.updateTask(taskId, { model: analysis.recommendation.model });
    }
    // Would call actual spawn here
  }
  
  // Log
  fs.appendFileSync(SMART_SPAWN_LOG, JSON.stringify({
    timestamp: new Date().toISOString(),
    taskId,
    optMode: analysis.optMode.key,
    analysis: {
      predictedSuccess: analysis.prediction.predictedSuccessRate,
      recommendedModel: analysis.recommendation.model,
      action: analysis.recommendation.action,
      estimatedCost: analysis.optRec.estimated_cost,
      optimizationScore: analysis.optRec.optimization_score
    },
    executed: true
  }) + '\n');
  
  return { ...analysis, executed: true, result };
}

// CLI
const taskId = process.argv[2];
const dryRun = process.argv.includes('--dry-run') || process.argv.includes('--analyze-only');

if (!taskId || taskId.startsWith('--')) {
  console.log(`
Smart Spawn - Phase 2

Usage:
  node smart-spawn.js <task-id>          Analyze and execute
  node smart-spawn.js <task-id> --dry-run  Analyze only

Examples:
  node smart-spawn.js abc123
  node smart-spawn.js abc123 --dry-run
`);
  process.exit(0);
}

(async () => {
  try {
    const result = await smartSpawn(taskId, { dryRun });
    
    if (dryRun) {
      console.log('\n--- Dry run complete, no action taken ---');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();

module.exports = {
  analyzeTask,
  smartSpawn,
  generateRecommendation
};
