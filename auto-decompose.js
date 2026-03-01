#!/usr/bin/env node
/**
 * Auto-Decompose Tasks - Phase 2 Feature
 * 
 * Automatically decomposes tasks on creation based on:
 * - Task size (>4 hours)
 * - Task type (dashboard, integration, api)
 * - Historical failure patterns
 * 
 * Usage:
 *   node auto-decompose.js --check <task-id>
 *   node auto-decompose.js --auto <task-id>
 *   node auto-decompose.js --create-subtasks <parent-id>
 */

const { TaskStore } = require('./task-store');
const { predictSuccess, shouldDecomposeTask, detectTaskType } = require('./predictive-engine');
const fs = require('fs');
const path = require('path');

const store = new TaskStore();
const AUTO_DECOMPOSE_LOG = path.join(process.cwd(), '.auto-decompose-log.jsonl');

// Decomposition patterns from LEARNINGS.md
const DECOMPOSITION_PATTERNS = {
  'dashboard': {
    name: 'Dashboard Pattern',
    description: 'Split into data, UI, and integration layers',
    subtasks: [
      { titleSuffix: ' - Data Layer', hours: 1.5, agent: 'dev', model: 'kimi', acceptance_criteria: ['Data endpoints working', 'Schema defined'] },
      { titleSuffix: ' - UI Components', hours: 1.5, agent: 'dev', model: 'kimi', acceptance_criteria: ['Components render', 'Styling complete'] },
      { titleSuffix: ' - Integration & Tests', hours: 1, agent: 'qc', model: 'haiku', acceptance_criteria: ['Data flows to UI', 'Tests pass'] }
    ]
  },
  'integration': {
    name: 'Integration Pattern',
    description: 'Research, auth, mapping, implementation, testing',
    subtasks: [
      { titleSuffix: ' - Research & Planning', hours: 0.5, agent: 'dev', model: 'sonnet', acceptance_criteria: ['API docs reviewed', 'Integration plan documented'] },
      { titleSuffix: ' - Auth Setup', hours: 0.5, agent: 'dev', model: 'sonnet', acceptance_criteria: ['Authentication working', 'Tokens stored securely'] },
      { titleSuffix: ' - Core Implementation', hours: 1.5, agent: 'dev', model: 'sonnet', acceptance_criteria: ['API calls working', 'Error handling implemented'] },
      { titleSuffix: ' - Testing & Validation', hours: 0.5, agent: 'qc', model: 'haiku', acceptance_criteria: ['Unit tests pass', 'Integration tests pass'] }
    ]
  },
  'api': {
    name: 'API Pattern',
    description: 'Split into schema, handler, and tests',
    subtasks: [
      { titleSuffix: ' - Schema & Validation', hours: 0.75, agent: 'dev', model: 'kimi', acceptance_criteria: ['Schema defined', 'Validation rules implemented'] },
      { titleSuffix: ' - Handler Implementation', hours: 1.5, agent: 'dev', model: 'kimi', acceptance_criteria: ['Endpoints working', 'Business logic correct'] },
      { titleSuffix: ' - Tests & Documentation', hours: 0.75, agent: 'qc', model: 'haiku', acceptance_criteria: ['Unit tests >80%', 'API docs updated'] }
    ]
  },
  'landing_page': {
    name: 'Landing Page Pattern',
    description: 'Split into structure, content, styling, SEO',
    subtasks: [
      { titleSuffix: ' - Structure', hours: 1, agent: 'dev', model: 'kimi', acceptance_criteria: ['HTML structure complete', 'Responsive layout'] },
      { titleSuffix: ' - Content', hours: 1, agent: 'marketing', model: 'kimi', acceptance_criteria: ['Copy written', 'Images sourced'] },
      { titleSuffix: ' - Styling', hours: 1, agent: 'design', model: 'haiku', acceptance_criteria: ['CSS complete', 'Mobile optimized'] },
      { titleSuffix: ' - SEO & Meta', hours: 0.5, agent: 'marketing', model: 'kimi', acceptance_criteria: ['Meta tags added', 'SEO optimized'] }
    ]
  },
  'feature': {
    name: 'Feature Pattern',
    description: 'Split into planning, implementation, testing',
    subtasks: [
      { titleSuffix: ' - Planning & Design', hours: 1, agent: 'dev', model: 'sonnet', acceptance_criteria: ['Design doc complete', 'Tech approach defined'] },
      { titleSuffix: ' - Core Implementation', hours: 2, agent: 'dev', model: 'kimi', acceptance_criteria: ['Feature working', 'Basic functionality complete'] },
      { titleSuffix: ' - Testing & Polish', hours: 1, agent: 'qc', model: 'haiku', acceptance_criteria: ['Tests pass', 'Edge cases handled'] }
    ]
  }
};

/**
 * Check if task should be auto-decomposed
 */
async function checkTaskForDecomposition(taskId) {
  const task = await store.getTask(taskId);
  if (!task) {
    return { error: 'Task not found' };
  }
  
  const prediction = predictSuccess(task);
  const taskType = detectTaskType(task);
  
  const result = {
    taskId,
    title: task.title,
    taskType,
    estimatedHours: task.estimated_hours,
    shouldDecompose: prediction.shouldDecompose,
    reason: prediction.shouldDecompose ? 
      `Task type "${taskType}" benefits from decomposition (${prediction.baseSuccessRate}% → ${prediction.decomposedSuccessRate}%)` :
      'Task within optimal size for single execution',
    predictedSuccess: {
      original: prediction.predictedSuccessRate,
      decomposed: prediction.decomposedSuccessRate
    },
    pattern: DECOMPOSITION_PATTERNS[taskType] || null
  };
  
  return result;
}

/**
 * Generate subtasks from decomposition pattern
 */
function generateSubtasks(parentTask, pattern) {
  const totalSubtasks = pattern.subtasks.length;
  return pattern.subtasks.map((sub, index) => ({
    title: `${parentTask.title}${sub.titleSuffix} (${index + 1} of ${totalSubtasks})`,
    description: `${sub.acceptance_criteria.join(', ')}`,
    status: index === 0 ? 'ready' : 'blocked',
    priority: parentTask.priority,
    agent_id: sub.agent,
    model: sub.model,
    estimated_hours: sub.hours,
    estimated_cost_usd: sub.hours * (sub.model === 'sonnet' ? 2.0 : sub.model === 'haiku' ? 0.5 : sub.model === 'kimi' ? 0.3 : 0),
    acceptance_criteria: sub.acceptance_criteria,
    dependencies: index === 0 ? [] : [parentTask.title + pattern.subtasks[index-1].titleSuffix + ` (${index} of ${totalSubtasks})`],
    parent_task_id: parentTask.id,
    sequence_order: index + 1,
    project_id: parentTask.project_id || 'bo2026'
  }));
}

/**
 * Auto-decompose a task
 */
async function autoDecompose(taskId, dryRun = false) {
  const check = await checkTaskForDecomposition(taskId);
  
  if (check.error) {
    return check;
  }
  
  if (!check.shouldDecompose) {
    return {
      ...check,
      action: 'none',
      message: 'Task does not require decomposition'
    };
  }
  
  if (!check.pattern) {
    return {
      ...check,
      action: 'manual_review',
      message: 'No decomposition pattern available for this task type'
    };
  }
  
  const parentTask = await store.getTask(taskId);
  const subtasks = generateSubtasks(parentTask, check.pattern);
  
  if (dryRun) {
    return {
      ...check,
      action: 'would_decompose',
      subtasks: subtasks.map(s => ({
        title: s.title,
        agent: s.agent_id,
        model: s.model,
        hours: s.estimated_hours,
        cost: s.estimated_cost_usd
      })),
      totalHours: subtasks.reduce((sum, s) => sum + s.estimated_hours, 0),
      totalCost: subtasks.reduce((sum, s) => sum + s.estimated_cost_usd, 0)
    };
  }
  
  // Actually create subtasks
  const created = [];
  for (const subtask of subtasks) {
    try {
      await store.createTask(subtask);
      created.push(subtask.title);
    } catch (error) {
      console.error(`Failed to create subtask: ${error.message}`);
    }
  }
  
  // Mark parent as superseded
  await store.updateTask(taskId, {
    status: 'superseded',
    superseded_by: created,
    notes: `Auto-decomposed into ${created.length} subtasks`
  });
  
  // Log
  fs.appendFileSync(AUTO_DECOMPOSE_LOG, JSON.stringify({
    timestamp: new Date().toISOString(),
    parentTask: taskId,
    subtasks: created,
    reason: check.reason
  }) + '\n');
  
  return {
    ...check,
    action: 'decomposed',
    subtasksCreated: created,
    message: `Created ${created.length} subtasks, marked parent as superseded`
  };
}

/**
 * Process all ready tasks for auto-decomposition
 */
async function processAllReadyTasks(dryRun = true) {
  const { data: tasks } = await store.supabase
    .from('tasks')
    .select('*')
    .eq('status', 'ready');
  
  const results = [];
  
  for (const task of tasks || []) {
    const check = await checkTaskForDecomposition(task.id);
    if (check.shouldDecompose) {
      const result = await autoDecompose(task.id, dryRun);
      results.push(result);
    }
  }
  
  return results;
}

// CLI
const command = process.argv[2];
const arg1 = process.argv[3];

(async () => {
  switch (command) {
    case '--check':
      const check = await checkTaskForDecomposition(arg1);
      console.log(JSON.stringify(check, null, 2));
      break;
      
    case '--dry-run':
      const dry = await autoDecompose(arg1, true);
      console.log(JSON.stringify(dry, null, 2));
      break;
      
    case '--auto':
      const result = await autoDecompose(arg1, false);
      console.log(JSON.stringify(result, null, 2));
      break;
      
    case '--scan':
      const scan = await processAllReadyTasks(true);
      console.log(`Found ${scan.length} tasks that would be decomposed`);
      scan.forEach(s => console.log(`  • ${s.title} → ${s.subtasks?.length || 0} subtasks`));
      break;
      
    default:
      console.log(`
Auto-Decompose - Phase 2

Commands:
  --check <task-id>     Check if task should be decomposed
  --dry-run <task-id>   Show what would be created
  --auto <task-id>      Actually decompose the task
  --scan                Check all ready tasks

Examples:
  node auto-decompose.js --check abc123
  node auto-decompose.js --dry-run abc123
  node auto-decompose.js --auto abc123
`);
  }
})();

module.exports = {
  checkTaskForDecomposition,
  autoDecompose,
  generateSubtasks,
  processAllReadyTasks
};
