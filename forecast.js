#!/usr/bin/env node
/**
 * Forecasting & Early Warning System - Phase 2
 * 
 * Predicts queue exhaustion, budget depletion, and velocity trends
 * 
 * Usage:
 *   node forecast.js --queue
 *   node forecast.js --budget
 *   node forecast.js --full
 */

const { TaskStore } = require('./task-store');
const { predictQueueExhaustion, predictBudgetExhaustion } = require('./predictive-engine');
const fs = require('fs');
const path = require('path');

const store = new TaskStore();
const FORECAST_LOG = path.join(process.cwd(), '.forecasts.jsonl');

/**
 * Get current task state
 */
async function getTaskState() {
  const { data: tasks } = await store.supabase
    .from('tasks')
    .select('*')
    .eq('project_id', 'bo2026');
  
  return {
    ready: (tasks || []).filter(t => t.status === 'ready'),
    in_progress: (tasks || []).filter(t => t.status === 'in_progress'),
    blocked: (tasks || []).filter(t => t.status === 'blocked'),
    done: (tasks || []).filter(t => t.status === 'done'),
    all: tasks || []
  };
}

/**
 * Get budget state
 */
async function getBudgetState() {
  const { data: costs } = await store.supabase
    .from('cost_tracking')
    .select('*')
    .eq('project_id', 'bo2026')
    .order('updated_date', { ascending: false })
    .limit(1)
    .single();
  
  // Get today's actual spend from spawn log
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
  
  return {
    budgetLimit: costs?.budget_limit_usd || 15,
    spentToday,
    remaining: (costs?.budget_limit_usd || 15) - spentToday,
    percentUsed: (spentToday / (costs?.budget_limit_usd || 15)) * 100
  };
}

/**
 * Calculate velocity metrics
 */
async function calculateVelocity(days = 7) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  
  const { data: completed } = await store.supabase
    .from('tasks')
    .select('*')
    .eq('status', 'done')
    .gte('completed_at', since);
  
  const tasksCompleted = completed?.length || 0;
  const tasksPerDay = tasksCompleted / days;
  
  // Estimate completion time for in-progress tasks
  const { data: inProgress } = await store.supabase
    .from('tasks')
    .select('estimated_hours')
    .eq('status', 'in_progress');
  
  const remainingHours = (inProgress || []).reduce((sum, t) => sum + (t.estimated_hours || 2), 0);
  const estimatedCompletionDays = tasksPerDay > 0 ? remainingHours / (tasksPerDay * 8) : Infinity;
  
  return {
    periodDays: days,
    tasksCompleted,
    tasksPerDay: tasksPerDay.toFixed(2),
    avgHoursPerTask: tasksCompleted > 0 ? 
      (completed.reduce((sum, t) => sum + (t.estimated_hours || 2), 0) / tasksCompleted).toFixed(1) : 
      'N/A',
    remainingHours: remainingHours.toFixed(1),
    estimatedCompletionDays: estimatedCompletionDays === Infinity ? '>7' : estimatedCompletionDays.toFixed(1),
    velocityTrend: tasksPerDay > 3 ? 'increasing' : tasksPerDay > 1 ? 'stable' : 'decreasing'
  };
}

/**
 * Full forecast report
 */
async function generateForecast() {
  console.log('🔮 Generating Forecast...\n');
  
  const tasks = await getTaskState();
  const budget = await getBudgetState();
  const velocity = await calculateVelocity();
  
  // Queue forecast
  const queueForecast = predictQueueExhaustion(tasks.all, parseFloat(velocity.tasksPerDay));
  
  // Budget forecast (assume $0.50/hr average spend)
  const recentSpendRate = budget.spentToday / Math.max(1, new Date().getHours() - 9); // Since 9am
  const budgetForecast = predictBudgetExhaustion(budget.spentToday, budget.budgetLimit, recentSpendRate);
  
  const forecast = {
    timestamp: new Date().toISOString(),
    queue: queueForecast,
    budget: budgetForecast,
    velocity,
    recommendations: []
  };
  
  // Generate recommendations
  if (queueForecast.willEmptySoon) {
    forecast.recommendations.push({
      priority: 'high',
      type: 'queue',
      message: `Queue will empty in ${queueForecast.estimatedEmptyTime}`,
      action: 'Create new tasks immediately to prevent agent idle time'
    });
  }
  
  if (budgetForecast.willExhaustToday) {
    forecast.recommendations.push({
      priority: 'high',
      type: 'budget',
      message: `Budget will exhaust in ${budgetForecast.estimatedExhaustion}`,
      action: 'Use !budget command to increase daily limit or defer non-critical tasks'
    });
  }
  
  if (parseFloat(velocity.tasksPerDay) < 1) {
    forecast.recommendations.push({
      priority: 'medium',
      type: 'velocity',
      message: `Velocity decreasing (${velocity.tasksPerDay} tasks/day)`,
      action: 'Check for blockers, decompose large tasks, or spawn more agents'
    });
  }
  
  // Log forecast
  fs.appendFileSync(FORECAST_LOG, JSON.stringify(forecast) + '\n');
  
  return forecast;
}

/**
 * Format forecast for display
 */
function formatForecast(forecast) {
  let output = `
╔════════════════════════════════════════════════════════════╗
║                    FORECAST REPORT                         ║
╚════════════════════════════════════════════════════════════╝

📊 QUEUE STATUS
─────────────────────────────────────────────────────────────
Ready Tasks:        ${forecast.queue.readyTasks}
In Progress:        ${forecast.queue.inProgressTasks}
Time to Empty:      ${forecast.queue.estimatedEmptyTime}
Status:             ${forecast.queue.willEmptySoon ? '⚠️  CRITICAL - Will empty soon' : '✅ Healthy'}

💰 BUDGET STATUS
─────────────────────────────────────────────────────────────
Spent Today:        $${forecast.budget.spentToday.toFixed(2)}
Remaining:          $${forecast.budget.remaining.toFixed(2)}
Daily Budget:       $${forecast.budget.dailyBudget.toFixed(2)}
Percent Used:       ${forecast.budget.percentUsed.toFixed(1)}%
Time to Exhaust:    ${forecast.budget.estimatedExhaustion}
Status:             ${forecast.budget.willExhaustToday ? '⚠️  WARNING - Will exhaust today' : '✅ Healthy'}

⚡ VELOCITY (Last ${forecast.velocity.periodDays} days)
─────────────────────────────────────────────────────────────
Tasks Completed:    ${forecast.velocity.tasksCompleted}
Tasks/Day:          ${forecast.velocity.tasksPerDay}
Avg Hours/Task:     ${forecast.velocity.avgHoursPerTask}
Trend:              ${forecast.velocity.velocityTrend}

📋 RECOMMENDATIONS
─────────────────────────────────────────────────────────────
`;

  if (forecast.recommendations.length === 0) {
    output += '✅ All systems operating within normal parameters\n';
  } else {
    forecast.recommendations.forEach((rec, i) => {
      const emoji = rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : '🟢';
      output += `${emoji} ${rec.message}\n`;
      output += `   → ${rec.action}\n\n`;
    });
  }
  
  output += `─────────────────────────────────────────────────────────────\n`;
  output += `Generated: ${new Date().toLocaleString()}\n`;
  
  return output;
}

// CLI
const command = process.argv[2];

(async () => {
  switch (command) {
    case '--queue':
      const tasks = await getTaskState();
      const qf = predictQueueExhaustion(tasks.all);
      console.log(formatForecast({ queue: qf, budget: {}, velocity: {}, recommendations: [] }));
      break;
      
    case '--budget':
      const budget = await getBudgetState();
      const bf = predictBudgetExhaustion(budget.spentToday, budget.budgetLimit, 0.5);
      console.log(formatForecast({ queue: {}, budget: bf, velocity: {}, recommendations: [] }));
      break;
      
    case '--velocity':
      const vel = await calculateVelocity();
      console.log('Velocity:', JSON.stringify(vel, null, 2));
      break;
      
    case '--full':
    default:
      const forecast = await generateForecast();
      console.log(formatForecast(forecast));
      
      // Update dashboard with forecast
      try {
        fs.writeFileSync('.latest-forecast.json', JSON.stringify(forecast, null, 2));
        console.log('\n💾 Forecast saved to .latest-forecast.json');
      } catch (e) {}
      break;
  }
})();

module.exports = {
  generateForecast,
  getTaskState,
  getBudgetState,
  calculateVelocity,
  formatForecast
};
