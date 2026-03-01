#!/usr/bin/env node
/**
 * Goal Planner - Option A Implementation
 * 
 * Converts milestones into executable task sequences
 * 
 * Usage:
 *   node goal-planner.js --create "First paying customer by March 7"
 *   node goal-planner.js --check-milestone "March 7"
 *   node goal-planner.js --adjust "March 7 slipped by 3 days"
 */

const { TaskStore } = require('./task-store');
const { predictSuccess } = require('./predictive-engine');
const { optimizeQueueOrder } = require('./optimizer');
const fs = require('fs');
const path = require('path');

const store = new TaskStore();
const GOALS_FILE = path.join(process.cwd(), '.goals.json');
const MILESTONE_LOG = path.join(process.cwd(), '.milestone-adjustments.jsonl');

// Milestone templates with task sequences
const MILESTONE_TEMPLATES = {
  'first_revenue': {
    name: 'First Paying Customer',
    description: 'Get first real estate agent to pay for the service',
    targetMrr: 400,
    typicalTasks: [
      { title: 'Stripe Billing Live', hours: 1, priority: 1, agent: 'dev', model: 'kimi', blocks: ['Agent Onboarding'] },
      { title: 'Agent Onboarding Flow', hours: 3, priority: 1, agent: 'dev', model: 'kimi', blocks: ['Pilot Recruitment'] },
      { title: 'Recruit 3 Pilot Agents', hours: 4, priority: 1, agent: 'marketing', model: 'kimi', blocks: ['Pilot Validation'] },
      { title: 'Pilot Onboarding & Setup', hours: 2, priority: 2, agent: 'dev', model: 'haiku', blocks: ['First Lead'] },
      { title: 'First AI-Qualified Lead', hours: 1, priority: 2, agent: 'system', model: 'none', blocks: ['Close Sale'] },
      { title: 'Sales Call & Close', hours: 2, priority: 1, agent: 'marketing', model: 'kimi', blocks: [] }
    ]
  },
  'five_customers': {
    name: '5 Paying Customers',
    description: 'Reach $2,000 MRR with 5 agents',
    targetMrr: 2000,
    typicalTasks: [
      { title: 'Onboarding Improvements from Feedback', hours: 3, priority: 1, agent: 'dev', model: 'kimi' },
      { title: 'Recruit 5 More Agents', hours: 6, priority: 1, agent: 'marketing', model: 'kimi' },
      { title: 'Referral Program Setup', hours: 2, priority: 2, agent: 'marketing', model: 'kimi' },
      { title: 'Case Studies & Social Proof', hours: 3, priority: 2, agent: 'marketing', model: 'kimi' }
    ]
  },
  'mvp_launch': {
    name: 'MVP Launch',
    description: 'System ready for first pilots',
    targetMrr: 0,
    typicalTasks: [
      { title: 'Core SMS Flow Working', hours: 4, priority: 1, agent: 'dev', model: 'kimi' },
      { title: 'FUB Integration Complete', hours: 3, priority: 1, agent: 'dev', model: 'kimi' },
      { title: 'Basic Dashboard', hours: 3, priority: 2, agent: 'dev', model: 'kimi' },
      { title: 'TCPA Compliance Audit', hours: 2, priority: 1, agent: 'qc', model: 'haiku' },
      { title: 'Deploy to Production', hours: 1, priority: 1, agent: 'dev', model: 'kimi' }
    ]
  },
  'scale_ready': {
    name: 'Scale-Ready (15 Customers)',
    description: 'System can handle 15 customers without breaking',
    targetMrr: 12000,
    typicalTasks: [
      { title: 'Performance Optimization', hours: 4, priority: 1, agent: 'dev', model: 'sonnet' },
      { title: 'Automated Monitoring & Alerts', hours: 3, priority: 1, agent: 'dev', model: 'kimi' },
      { title: 'Customer Support System', hours: 3, priority: 2, agent: 'dev', model: 'kimi' },
      { title: 'Recruit 10 More Agents', hours: 8, priority: 1, agent: 'marketing', model: 'kimi' }
    ]
  }
};

/**
 * Parse natural language goal into structured milestone
 */
function parseGoal(input) {
  // Try to match against templates
  const lower = input.toLowerCase();
  
  for (const [key, template] of Object.entries(MILESTONE_TEMPLATES)) {
    if (lower.includes(template.name.toLowerCase()) || 
        lower.includes(key.replace('_', ' '))) {
      return {
        type: key,
        ...template,
        raw: input
      };
    }
  }
  
  // Extract date if present
  const dateMatch = input.match(/by\s+([A-Za-z]+\s+\d+|\d{1,2}\/\d{1,2})/i);
  const targetDate = dateMatch ? parseDate(dateMatch[1]) : null;
  
  // Extract number if present
  const numberMatch = input.match(/(\d+)\s+(customer|agent|pilot|k|thousand)/i);
  const targetNumber = numberMatch ? parseInt(numberMatch[1]) : null;
  
  return {
    type: 'custom',
    name: input,
    description: input,
    targetDate,
    targetNumber,
    raw: input
  };
}

/**
 * Parse date string
 */
function parseDate(dateStr) {
  try {
    const date = new Date(dateStr + ', 2026');
    if (!isNaN(date.getTime())) return date.toISOString().split('T')[0];
  } catch (e) {}
  return null;
}

/**
 * Generate task sequence for milestone
 */
async function generateTaskSequence(milestone) {
  const template = MILESTONE_TEMPLATES[milestone.type];
  if (!template) {
    return generateCustomSequence(milestone);
  }
  
  // Check current state
  const currentState = await assessCurrentState();
  
  // Filter out already completed work
  const neededTasks = template.typicalTasks.filter(task => {
    return !currentState.completed.some(c => 
      c.work_name.toLowerCase().includes(task.title.toLowerCase())
    );
  });
  
  // Estimate total time
  const totalHours = neededTasks.reduce((sum, t) => sum + t.hours, 0);
  const estimatedDays = Math.ceil(totalHours / 6); // Assume 6 productive hours/day
  
  // Check if target date is realistic
  const targetDate = milestone.targetDate;
  const realistic = targetDate ? 
    (new Date(targetDate) - new Date()) / (1000 * 60 * 60 * 24) >= estimatedDays :
    true;
  
  return {
    milestone: milestone.name,
    targetDate,
    totalHours,
    estimatedDays,
    realistic,
    tasks: neededTasks.map((t, i) => ({
      ...t,
      sequence: i + 1,
      estimated_cost_usd: t.hours * (t.model === 'sonnet' ? 2.0 : t.model === 'haiku' ? 0.5 : 0.3),
      dependencies: i > 0 ? [neededTasks[i-1].title] : []
    })),
    gaps: identifyGaps(currentState, neededTasks)
  };
}

/**
 * Assess current project state
 */
async function assessCurrentState() {
  const { data: completed } = await store.supabase
    .from('completed_work')
    .select('*')
    .eq('project_id', 'bo2026')
    .eq('status', 'COMPLETE');
  
  const { data: ready } = await store.supabase
    .from('tasks')
    .select('*')
    .eq('status', 'ready');
  
  const { data: inProgress } = await store.supabase
    .from('tasks')
    .select('*')
    .eq('status', 'in_progress');
  
  return {
    completed: completed || [],
    ready: ready || [],
    inProgress: inProgress || [],
    hasStripe: (completed || []).some(c => c.work_name.includes('Stripe')),
    hasOnboarding: (completed || []).some(c => c.work_name.includes('Onboarding')),
    hasPilots: (completed || []).some(c => c.work_name.includes('Pilot'))
  };
}

/**
 * Identify gaps between current state and needed tasks
 */
function identifyGaps(state, neededTasks) {
  const gaps = [];
  
  if (neededTasks.some(t => t.title.includes('Stripe')) && !state.hasStripe) {
    gaps.push('Stripe billing not yet implemented');
  }
  
  if (neededTasks.some(t => t.title.includes('Onboarding')) && !state.hasOnboarding) {
    gaps.push('Agent onboarding not yet complete');
  }
  
  if (neededTasks.some(t => t.title.includes('Pilot')) && !state.hasPilots) {
    gaps.push('No pilot agents recruited yet');
  }
  
  return gaps;
}

/**
 * Generate custom task sequence for unrecognized goals
 */
async function generateCustomSequence(milestone) {
  // Use predictive engine to estimate tasks needed
  const tasks = [];
  
  if (milestone.raw.toLowerCase().includes('revenue') || milestone.raw.toLowerCase().includes('customer')) {
    tasks.push(
      { title: 'Billing System Ready', hours: 2, priority: 1, agent: 'dev', model: 'kimi' },
      { title: 'Customer Onboarding', hours: 3, priority: 1, agent: 'dev', model: 'kimi' },
      { title: 'Sales Materials', hours: 2, priority: 2, agent: 'marketing', model: 'kimi' },
      { title: 'First Customer Acquisition', hours: 4, priority: 1, agent: 'marketing', model: 'kimi' }
    );
  } else if (milestone.raw.toLowerCase().includes('launch') || milestone.raw.toLowerCase().includes('deploy')) {
    tasks.push(
      { title: 'Final Testing', hours: 3, priority: 1, agent: 'qc', model: 'haiku' },
      { title: 'Production Deploy', hours: 1, priority: 1, agent: 'dev', model: 'kimi' },
      { title: 'Monitoring Setup', hours: 2, priority: 2, agent: 'dev', model: 'kimi' }
    );
  } else {
    tasks.push(
      { title: 'Analysis & Planning', hours: 1, priority: 1, agent: 'dev', model: 'sonnet' },
      { title: 'Implementation', hours: 4, priority: 1, agent: 'dev', model: 'kimi' },
      { title: 'Testing & Validation', hours: 2, priority: 1, agent: 'qc', model: 'haiku' }
    );
  }
  
  return {
    milestone: milestone.name,
    targetDate: milestone.targetDate,
    totalHours: tasks.reduce((sum, t) => sum + t.hours, 0),
    estimatedDays: Math.ceil(tasks.reduce((sum, t) => sum + t.hours, 0) / 6),
    realistic: true,
    tasks: tasks.map((t, i) => ({ ...t, sequence: i + 1 })),
    gaps: [],
    note: 'Custom sequence generated - review recommended'
  };
}

/**
 * Create tasks in Supabase from sequence
 */
async function createTasksFromSequence(sequence, options = {}) {
  const created = [];
  const errors = [];
  
  for (const task of sequence.tasks) {
    try {
      const taskData = {
        title: task.title,
        description: `Auto-generated for milestone: ${sequence.milestone}`,
        status: task.sequence === 1 ? 'ready' : 'blocked',
        priority: task.priority,
        agent_id: task.agent,
        model: task.model,
        estimated_hours: task.hours,
        estimated_cost_usd: task.estimated_cost_usd || task.hours * 0.3,
        project_id: 'bo2026',
        sequence_order: task.sequence,
        milestone: sequence.milestone,
        target_date: sequence.targetDate
      };
      
      if (!options.dryRun) {
        await store.createTask(taskData);
      }
      
      created.push(task.title);
    } catch (error) {
      errors.push({ task: task.title, error: error.message });
    }
  }
  
  // Save goal
  if (!options.dryRun) {
    const goals = loadGoals();
    goals.push({
      milestone: sequence.milestone,
      targetDate: sequence.targetDate,
      createdAt: new Date().toISOString(),
      tasks: created,
      status: 'active'
    });
    saveGoals(goals);
  }
  
  return { created, errors, count: created.length };
}

/**
 * Check if milestone is on track
 */
async function checkMilestoneStatus(milestoneName) {
  const goals = loadGoals();
  const goal = goals.find(g => g.milestone.toLowerCase().includes(milestoneName.toLowerCase()));
  
  if (!goal) {
    return { error: `No active goal matching "${milestoneName}"` };
  }
  
  // Check completed tasks
  const { data: completed } = await store.supabase
    .from('tasks')
    .select('*')
    .eq('status', 'done')
    .in('title', goal.tasks);
  
  const completedCount = completed?.length || 0;
  const totalCount = goal.tasks.length;
  const percentComplete = (completedCount / totalCount) * 100;
  
  // Check timeline
  const daysRemaining = goal.targetDate ? 
    Math.ceil((new Date(goal.targetDate) - new Date()) / (1000 * 60 * 60 * 24)) :
    null;
  
  const onTrack = daysRemaining ? percentComplete >= (100 - (daysRemaining / 14 * 100)) : true;
  
  return {
    milestone: goal.milestone,
    targetDate: goal.targetDate,
    daysRemaining,
    percentComplete: Math.round(percentComplete),
    completedTasks: completedCount,
    totalTasks: totalCount,
    onTrack,
    status: onTrack ? 'on_track' : 'at_risk',
    recommendation: onTrack ? 'Continue current pace' : 'Consider scope reduction or deadline extension'
  };
}

/**
 * Adjust milestone when deadline slips
 */
async function adjustMilestone(milestoneName, reason, newDate = null) {
  const goals = loadGoals();
  const goalIndex = goals.findIndex(g => g.milestone.toLowerCase().includes(milestoneName.toLowerCase()));
  
  if (goalIndex === -1) {
    return { error: 'Goal not found' };
  }
  
  const adjustment = {
    timestamp: new Date().toISOString(),
    milestone: goals[goalIndex].milestone,
    oldDate: goals[goalIndex].targetDate,
    newDate: newDate || goals[goalIndex].targetDate,
    reason,
    action: newDate ? 'extended' : 'scope_reduced'
  };
  
  // Log adjustment
  fs.appendFileSync(MILESTONE_LOG, JSON.stringify(adjustment) + '\n');
  
  // Update goal
  if (newDate) {
    goals[goalIndex].targetDate = newDate;
  }
  goals[goalIndex].lastAdjusted = new Date().toISOString();
  goals[goalIndex].adjustmentReason = reason;
  saveGoals(goals);
  
  return {
    adjusted: true,
    milestone: goals[goalIndex].milestone,
    newDate: newDate || goals[goalIndex].targetDate,
    recommendation: generateAdjustmentRecommendation(reason)
  };
}

/**
 * Generate recommendation after adjustment
 */
function generateAdjustmentRecommendation(reason) {
  const lower = reason.toLowerCase();
  
  if (lower.includes('complex') || lower.includes('harder')) {
    return 'Consider decomposing remaining tasks into smaller pieces';
  } else if (lower.includes('resource') || lower.includes('budget')) {
    return 'Switch to !optimize cost mode and reduce scope';
  } else if (lower.includes('block') || lower.includes('depend')) {
    return 'Focus on unblocking critical path tasks first';
  } else if (lower.includes('quality') || lower.includes('bug')) {
    return 'Switch to !optimize quality mode to reduce rework';
  }
  
  return 'Continue with current optimization mode';
}

/**
 * Load/save goals
 */
function loadGoals() {
  try {
    if (fs.existsSync(GOALS_FILE)) {
      return JSON.parse(fs.readFileSync(GOALS_FILE, 'utf-8'));
    }
  } catch (e) {}
  return [];
}

function saveGoals(goals) {
  fs.writeFileSync(GOALS_FILE, JSON.stringify(goals, null, 2));
}

/**
 * Format sequence for display
 */
function formatSequence(sequence) {
  let output = `
╔══════════════════════════════════════════════════════════╗
║  GOAL: ${sequence.milestone.substring(0, 50).padEnd(50)} ║
╠══════════════════════════════════════════════════════════╣
║  Target: ${(sequence.targetDate || 'TBD').padEnd(48)} ║
║  Estimated: ${sequence.totalHours}h (${sequence.estimatedDays} days)${''.padEnd(35)} ║
║  Realistic: ${sequence.realistic ? '✅ YES' : '⚠️  NO (tight timeline)'}${''.padEnd(35)} ║
╚══════════════════════════════════════════════════════════╝

Task Sequence:
`;

  sequence.tasks.forEach((task, i) => {
    const status = i === 0 ? '[READY]' : '[BLOCKED]';
    output += `  ${task.sequence}. ${status} ${task.title}\n`;
    output += `      Agent: ${task.agent} | Model: ${task.model} | Hours: ${task.hours}h\n`;
    if (task.dependencies?.length) {
      output += `      Depends on: ${task.dependencies.join(', ')}\n`;
    }
    output += '\n';
  });

  if (sequence.gaps.length > 0) {
    output += `\n⚠️  Gaps Identified:\n`;
    sequence.gaps.forEach(gap => output += `  • ${gap}\n`);
  }

  return output;
}

// CLI
const command = process.argv[2];
const arg = process.argv[3];
const arg2 = process.argv[4];
const arg3 = process.argv[5];

(async () => {
  switch (command) {
    case '--create':
    case '--plan':
      const milestone = parseGoal(arg);
      const sequence = await generateTaskSequence(milestone);
      console.log(formatSequence(sequence));
      
      if (!sequence.realistic) {
        console.log('\n⚠️  WARNING: Timeline may be tight. Consider:');
        console.log('  • Extending deadline');
        console.log('  • Reducing scope');
        console.log('  • Switching to !optimize speed mode');
      }
      
      // Save preview
      fs.writeFileSync('.goal-preview.json', JSON.stringify(sequence, null, 2));
      console.log('\n💾 Preview saved to .goal-preview.json');
      console.log('Run with --execute to create tasks in Supabase');
      break;
      
    case '--execute':
      const preview = JSON.parse(fs.readFileSync('.goal-preview.json', 'utf-8'));
      const result = await createTasksFromSequence(preview);
      console.log(`\n✅ Created ${result.count} tasks`);
      if (result.errors.length > 0) {
        console.log(`⚠️  Errors: ${result.errors.length}`);
        result.errors.forEach(e => console.log(`  • ${e.task}: ${e.error}`));
      }
      break;
      
    case '--check':
    case '--status':
      const status = await checkMilestoneStatus(arg);
      console.log(JSON.stringify(status, null, 2));
      break;
      
    case '--adjust':
      const adjustment = await adjustMilestone(arg, arg2, arg3);
      console.log(JSON.stringify(adjustment, null, 2));
      break;
      
    case '--list':
      const goals = loadGoals();
      console.log('Active Goals:');
      goals.filter(g => g.status === 'active').forEach(g => {
        console.log(`  • ${g.milestone} (by ${g.targetDate || 'TBD'})`);
      });
      break;
      
    default:
      console.log(`
Goal Planner - Option A

Commands:
  --plan "<goal>"              Generate task sequence
  --execute                    Create tasks from preview
  --check "<milestone>"        Check milestone status
  --adjust "<milestone>" "<reason>" [new-date]
  --list                       Show active goals

Examples:
  node goal-planner.js --plan "First paying customer by March 7"
  node goal-planner.js --plan "5 customers by end of month"
  node goal-planner.js --execute
  node goal-planner.js --check "First Paying Customer"
  node goal-planner.js --adjust "First Paying Customer" "Complexity underestimated" "2026-03-10"
`);
  }
})();

module.exports = {
  parseGoal,
  generateTaskSequence,
  createTasksFromSequence,
  checkMilestoneStatus,
  adjustMilestone,
  formatSequence
};
