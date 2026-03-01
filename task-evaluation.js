/**
 * task-evaluation.js
 * Decision logic for task pass/fail/retry/decompose/escalate
 */

const { TaskStore } = require('./task-store');

// Thresholds for decision making
const THRESHOLDS = {
  MIN_PASS_RATE: 0.8,        // 80% tests must pass
  MAX_RETRIES: 2,            // Max retries before decompose/escalate
  LARGE_TASK_HOURS: 3,       // Tasks over 3h get decomposed on failure
  DECOMPOSE_MAX_SUBTASKS: 4  // Max subtasks when decomposing
};

// Model escalation path
const MODEL_ESCALATION = {
  'kimi': 'sonnet',
  'sonnet': 'opus',
  'opus': 'opus'  // Already at max
};

/**
 * Evaluate a completed task and decide next action
 * @param {Object} task - The task from TaskStore
 * @param {Object} completionReport - The completion report
 * @returns {Object} Decision with action and metadata
 */
async function evaluateTaskCompletion(task, completionReport) {
  const { testResults, error, retryRecommendation } = completionReport;
  const retryCount = task.metadata?.retryCount || 0;
  
  // Check if tests passed threshold
  const passed = testResults?.passRate >= THRESHOLDS.MIN_PASS_RATE;
  
  if (passed) {
    return {
      action: 'mark_done',
      reason: `Tests passed: ${Math.round(testResults.passRate * 100)}% (${testResults.passed}/${testResults.total})`,
      updates: {
        status: 'done',
        completed_at: new Date().toISOString(),
        'metadata.testResults': testResults,
        'metadata.completionReportPath': completionReport.completionReportPath,
        'metadata.retryCount': retryCount
      }
    };
  }
  
  // Tests failed - decide what to do
  return await decideFailureAction(task, completionReport, retryCount);
}

/**
 * Decide what to do when a task fails
 */
async function decideFailureAction(task, completionReport, retryCount) {
  const { error, testResults } = completionReport;
  const estimatedHours = task.estimated_hours || 1;
  const currentModel = task.model || 'kimi';
  
  // Decision tree
  
  // 1. First failure: Retry with same or escalated model
  if (retryCount === 0) {
    const nextModel = MODEL_ESCALATION[currentModel] || currentModel;
    return {
      action: 'retry',
      reason: `First failure. Retrying with ${nextModel} model.`,
      updates: {
        status: 'failed',
        'metadata.retryCount': 1,
        'metadata.lastError': error,
        'metadata.lastTestResults': testResults,
        model: nextModel
      },
      spawnConfig: {
        task: task.title,
        agentId: task.agent_id,
        model: nextModel,
        prompt: generateRetryPrompt(task, error),
        taskId: task.id
      }
    };
  }
  
  // 2. Second failure + large task: Decompose
  if (retryCount === 1 && estimatedHours > THRESHOLDS.LARGE_TASK_HOURS) {
    const subtasks = generateSubtasks(task);
    return {
      action: 'decompose',
      reason: `Large task (${estimatedHours}h) failed twice. Decomposing into ${subtasks.length} smaller tasks.`,
      updates: {
        status: 'decomposed',
        'metadata.retryCount': retryCount + 1,
        'metadata.lastError': error,
        'metadata.subtaskCount': subtasks.length
      },
      subtasks
    };
  }
  
  // 3. Third failure or already at max model: Escalate to human
  if (retryCount >= THRESHOLDS.MAX_RETRIES || currentModel === 'opus') {
    return {
      action: 'escalate',
      reason: `Persistent failure after ${retryCount} retries. Human intervention needed.`,
      updates: {
        status: 'escalated',
        'metadata.retryCount': retryCount + 1,
        'metadata.lastError': error,
        'metadata.escalatedAt': new Date().toISOString()
      },
      escalation: {
        to: 'product-manager',
        message: `Task ${task.id} (${task.title}) has failed ${retryCount + 1} times. Latest error: ${error}`
      }
    };
  }
  
  // Default: Retry with escalated model
  const nextModel = MODEL_ESCALATION[currentModel] || currentModel;
  return {
    action: 'retry',
    reason: `Retry ${retryCount + 1} with escalated model (${nextModel}).`,
    updates: {
      status: 'failed',
      'metadata.retryCount': retryCount + 1,
      'metadata.lastError': error,
      model: nextModel
    },
    spawnConfig: {
      task: task.title,
      agentId: task.agent_id,
      model: nextModel,
      prompt: generateRetryPrompt(task, error),
      taskId: task.id
    }
  };
}

/**
 * Generate subtasks when decomposing a large task
 */
function generateSubtasks(task) {
  const hours = task.estimated_hours || 4;
  const numSubtasks = Math.min(
    Math.ceil(hours / 1.5),  // Roughly 1.5h per subtask
    THRESHOLDS.DECOMPOSE_MAX_SUBTASKS
  );
  
  // This is a template - in practice, you'd use AI or structured decomposition
  const subtasks = [];
  
  // Extract keywords from task title for naming
  const taskName = task.title.split(':')[0] || task.title;
  
  for (let i = 1; i <= numSubtasks; i++) {
    subtasks.push({
      title: `${taskName} - Part ${i}/${numSubtasks}`,
      description: `Decomposed from: ${task.title}\nPart ${i} of ${numSubtasks}`,
      agent_id: task.agent_id,
      model: 'kimi',  // Start smaller
      estimatedHours: hours / numSubtasks,
      estimatedCost: (task.estimated_cost_usd || 5) / numSubtasks,
      priority: task.priority,
      acceptanceCriteria: [
        `Complete Part ${i} implementation`,
        'All tests pass',
        'Update task status'
      ],
      tags: [...(task.tags || []), 'decomposed']
    });
  }
  
  return subtasks;
}

/**
 * Generate retry prompt with context from previous failure
 */
function generateRetryPrompt(task, previousError) {
  return `RETRY TASK: ${task.title}

Previous attempt failed with error:
${previousError}

ORIGINAL TASK:
${task.description}

ACCEPTANCE CRITERIA:
${(task.acceptance_criteria || []).map(ac => `- ${ac}`).join('\n')}

IMPORTANT: The previous attempt failed. Please:
1. Review the error carefully
2. Fix the root cause
3. Run all tests before completing
4. Document what you changed to prevent the same error

Task ID: ${task.id}`;
}

/**
 * Check if a task should be auto-approved for spawn
 * (based on cost, priority, etc.)
 */
function shouldAutoSpawn(task, dailySpend, dailyBudget = 20) {
  const remaining = dailyBudget - dailySpend;
  const taskCost = task.estimated_cost_usd || 5;
  
  // P0/P1 tasks under budget get auto-approved
  if (task.priority <= 2 && taskCost <= remaining) {
    return { approved: true, reason: 'P0/P1 task within budget' };
  }
  
  // P2+ tasks need approval if they'll use >50% of remaining budget
  if (taskCost > remaining * 0.5) {
    return { approved: false, reason: `Cost $${taskCost} exceeds 50% of remaining budget $${remaining}` };
  }
  
  return { approved: true, reason: 'Within budget constraints' };
}

module.exports = {
  evaluateTaskCompletion,
  decideFailureAction,
  shouldAutoSpawn,
  THRESHOLDS,
  MODEL_ESCALATION
};