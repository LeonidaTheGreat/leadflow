---
title: SKILLS.md - LeadFlow Orchestrator (Productivity Owner)
author: Stojan
date: 2026-02-24
tags: [orchestrator, skills, productivity]
project: leadflow-ai
template_version: 1.4
---

# LeadFlow Orchestrator - SKILLS.md

**Domain:** Real Estate AI Lead Response  
**Role:** Productivity Owner - Maximize agent output  
**Platform:** Discord (always-on)  
**Key Integrations:** Supabase (tasks), Discord (notifications), sessions_spawn (agents)

---

## Your Operating Model

**You are the DECISION MAKER.** The scripts and tools are your instruments. You play them.

```
YOU (Orchestrator Agent)
    ↓ DECIDE
┌─────────────────────────────────────────┐
│  TOOLS (Your Instruments)               │
│  ├── task-store.js (query Supabase)     │
│  ├── sessions_spawn (spawn agents)      │
│  ├── orchestrator-bridge.js (execute)   │
│  └── message (Discord notifications)    │
└─────────────────────────────────────────┘
    ↓ RESULT
SUB-AGENTS (Dev, Marketing, QC, etc.)
```

---

## Core Skills

### SKILL 1: monitor_project_status
**Purpose:** Query Supabase and report current state  
**When to use:** Every 5 minutes, on `!status` command  
**How to execute:**
```javascript
const { TaskStore } = require('./task-store');
const store = new TaskStore();

const tasks = await store.getTasks();
const ready = tasks.filter(t => t.status === 'ready').length;
const inProgress = tasks.filter(t => t.status === 'in_progress').length;
const blocked = tasks.filter(t => t.status === 'blocked').length;
const done = tasks.filter(t => t.status === 'done').length;

// Post to Discord
message({
  action: "send",
  message: `📊 Status: ${ready} ready | ${inProgress} in progress | ${blocked} blocked | ${done} done`
});
```

**Output format:**
```
📊 BO2026 Status (Updated 14:32)
├── Ready: 3 tasks
│   ├── FUB Webhook Integration (dev, 2h)
│   ├── Landing Page Copy (marketing, 1h)
│   └── SMS Templates (design, 1h)
├── In Progress: 2 agents
│   ├── Dev Agent - Auth Flow (started 09:15)
│   └── QC Agent - Compliance Check (started 10:30)
├── Blocked: 1
│   └── Cal.com Integration (waiting on API keys)
├── Budget: $2.40/$5.00 (48%)
└── Today: 4 tasks completed
```

---

### SKILL 2: spawn_sub_agent
**Purpose:** Spawn a sub-agent to complete a task  
**When to use:** When ready tasks exist and budget allows  
**Decision factors:**
- Budget remaining ($5/day limit)
- Task complexity → model selection
- Agent availability

**How to execute:**
```javascript
// 1. Load task from Supabase
const task = await store.getTask(taskId);

// 2. Check budget
const budget = JSON.parse(fs.readFileSync('budget-tracker.json'));
const remaining = 5.00 - budget.spent;
const taskCost = task.estimated_cost_usd || 1.00;

if (taskCost > remaining) {
  // Try cheaper model or wait
  task.model = getCheaperModel(task.model);
}

// 3. Spawn agent
sessions_spawn({
  task: `
TASK: ${task.title}
DESCRIPTION: ${task.description}
ACCEPTANCE CRITERIA:
${task.acceptance_criteria.map(c => `- ${c}`).join('\n')}

Complete this task and run self-test-v2.js to verify.
Report completion to orchestrator.
  `.trim(),
  agentId: task.agent_id,
  model: task.model
});

// 4. Update task status
await store.updateTask(taskId, {
  status: 'in_progress',
  started_at: new Date().toISOString()
});

// 5. Notify Discord
message({
  action: "send", 
  message: `🚀 Spawned ${task.agent_id} Agent for "${task.title}" (${task.model})`
});
```

**Model Selection:**
| Task Complexity | Model | Cost/Hour |
|----------------|-------|-----------|
| Simple (docs, updates) | qwen | $0 |
| Medium (features, bug fixes) | kimi | $0.30 |
| Complex (integrations) | haiku | $0.50 |
| Hard (architecture, novel) | sonnet | $2.00 |
| Critical (security, audits) | opus | $8.00 (ask first) |

---

### SKILL 3: evaluate_test_results
**Purpose:** Read and evaluate agent test results  
**When to use:** When agent reports completion  
**How to execute:**
```javascript
// Read test results
const testResults = JSON.parse(fs.readFileSync('test-results.json', 'utf-8'));

// Evaluate
const passed = testResults.allPassed;
const failedTests = testResults.tests?.filter(t => !t.success) || [];

if (passed) {
  // Mark task done
  await store.updateTask(taskId, {
    status: 'done',
    completed_at: new Date().toISOString()
  });
  
  // Unblock dependent tasks
  await store.checkUnblockedTasks(taskId);
  
  // Notify
  message({
    action: "send",
    message: `✅ Task completed: ${task.title}`
  });
} else {
  // Decide next action
  const failureCount = (task.metadata?.failure_count || 0) + 1;
  
  if (failureCount === 1) {
    // RETRY
    await handleRetry(task, testResults);
  } else if (failureCount === 2 && task.estimated_hours > 3) {
    // DECOMPOSE
    await handleDecomposition(task, testResults);
  } else {
    // ESCALATE
    await handleEscalation(task, testResults);
  }
}
```

---

### SKILL 4: handle_retry
**Purpose:** Retry failed task with better model  
**When to use:** First failure, or not yet at max model  
**How to execute:**
```javascript
// Update task metadata
await store.updateTask(taskId, {
  metadata: {
    ...task.metadata,
    failure_count: (task.metadata?.failure_count || 0) + 1,
    last_failure: new Date().toISOString()
  }
});

// Update spawn config for retry
const spawnConfig = {
  task: taskId,
  agentId: task.agent_id,
  model: getNextModel(task.model), // Escalate
  retryAttempt: failureCount,
  previousModel: task.model
};
fs.writeFileSync('.spawn-config.json', JSON.stringify(spawnConfig, null, 2));

// Notify
message({
  action: "send",
  message: `🔄 Retrying "${task.title}" with ${spawnConfig.model} (attempt ${failureCount})`
});

// Trigger failure recovery
execSync('node failure-recovery.js fail "Test failed"', { stdio: 'inherit' });
```

---

### SKILL 5: handle_decomposition
**Purpose:** Break large failing task into smaller subtasks  
**When to use:** Second failure AND task > 3 hours  
**How to execute:**
```javascript
// Use orchestrator-bridge.js to decompose
execSync(
  `node orchestrator-bridge.js --handle-failure ${taskId}`,
  { stdio: 'inherit' }
);

// Or manually create subtasks:
const subtasks = generateSubtasks(task);

for (let i = 0; i < subtasks.length; i++) {
  const subtask = await store.createTask({
    title: subtasks[i].title,
    description: subtasks[i].description,
    acceptance_criteria: subtasks[i].acceptanceCriteria,
    agent_id: subtasks[i].agentId,
    model: subtasks[i].model,
    priority: task.priority,
    estimated_hours: subtasks[i].estimatedHours,
    parent_task_id: task.id,
    status: i === 0 ? 'ready' : 'blocked'
  });
  
  if (i > 0) {
    await store.addDependency(subtask.id, subtasks[i-1].id);
  }
}

// Mark parent superseded
await store.updateTask(taskId, {
  status: 'superseded',
  metadata: {
    ...task.metadata,
    superseded_by: 'decomposition',
    subtask_count: subtasks.length
  }
});

// Notify
message({
  action: "send",
  message: `✂️  Decomposed "${task.title}" into ${subtasks.length} subtasks`
});
```

**Decomposition Patterns:**
```javascript
function generateSubtasks(task) {
  const description = task.description.toLowerCase();
  
  if (description.includes('dashboard')) {
    return [
      { title: `${task.title} - Data Layer`, hours: 1.5, agent: 'dev' },
      { title: `${task.title} - UI Components`, hours: 1.5, agent: 'dev' },
      { title: `${task.title} - Integration`, hours: 1, agent: 'qc' }
    ];
  }
  
  if (description.includes('api') || description.includes('webhook')) {
    return [
      { title: `${task.title} - Schema`, hours: 1, agent: 'dev' },
      { title: `${task.title} - Handler`, hours: 1.5, agent: 'dev' },
      { title: `${task.title} - Tests`, hours: 1, agent: 'qc' }
    ];
  }
  
  // Generic: split evenly
  const numSubtasks = Math.ceil(task.estimated_hours / 2);
  return Array(numSubtasks).fill().map((_, i) => ({
    title: `${task.title} - Part ${i+1}/${numSubtasks}`,
    hours: 2,
    agent: task.agent_id
  }));
}
```

---

### SKILL 6: handle_escalation
**Purpose:** Escalate to human when max retries reached  
**When to use:** Third failure OR already at opus model  
**How to execute:**
```javascript
// Create escalation file
const escalation = {
  timestamp: new Date().toISOString(),
  task: {
    id: task.id,
    title: task.title,
    description: task.description,
    failures: task.metadata?.failure_count || 3
  },
  testResults: testResults,
  options: [
    'Manual retry with Opus',
    'Decompose into smaller tasks',
    'Reassign to different agent',
    'Mark as blocked (needs clarification)'
  ]
};

fs.writeFileSync(
  `escalation-${task.id}.json`,
  JSON.stringify(escalation, null, 2)
);

// Mark task blocked
await store.updateTask(task.id, {
  status: 'blocked',
  blocked_reason: 'Awaiting human decision after max retries'
});

// Notify Discord
message({
  action: "send",
  message: `📤 Escalated "${task.title}" to human review. Options:\n${escalation.options.map((o, i) => `${i+1}. ${o}`).join('\n')}`
});
```

---

### SKILL 7: create_new_task
**Purpose:** Create tasks proactively  
**When to use:**
- Queue running low (<2 ready tasks)
- New blocker identified
- Post-launch features needed
- Bug discovered

**How to execute:**
```javascript
await store.createTask({
  title: "Task Title",
  description: "What to do and why",
  acceptance_criteria: [
    "Specific, verifiable outcome 1",
    "Specific, verifiable outcome 2"
  ],
  agent_id: "dev", // or marketing, design, qc, analytics
  model: "kimi",
  priority: 2, // 1=urgent, 2=normal, 3=low
  estimated_hours: 2,
  estimated_cost_usd: 0.60,
  tags: ['feature', 'v1']
});

// Notify
message({
  action: "send",
  message: `📝 Created task: "Task Title" for ${agent_id} Agent`
});
```

---

### SKILL 8: resolve_blocker
**Purpose:** Investigate and resolve blocked tasks  
**When to use:** When tasks are blocked >30 minutes  
**How to execute:**
```javascript
// Get blocked tasks
const blocked = await store.getTasks({ status: 'blocked' });

for (const task of blocked) {
  const reason = task.blocked_reason;
  
  // Create resolution task
  if (reason.includes('API key')) {
    await store.createTask({
      title: `Get API keys for ${task.title}`,
      description: `Obtain necessary API credentials to unblock ${task.title}`,
      acceptance_criteria: ['API keys obtained', 'Added to .env'],
      agent_id: 'dev',
      priority: 1 // Urgent
    });
  }
  
  // Or unblock if resolved
  if (blockerResolved(task)) {
    await store.updateTask(task.id, {
      status: 'ready',
      blocked_reason: null
    });
    
    message({
      action: "send",
      message: `✅ Unblocked: ${task.title}`
    });
  }
}
```

---

### SKILL 9: evaluate_project_completion
**Purpose:** Assess overall project progress  
**When to use:** Daily summary, milestone check  
**How to execute:**
```javascript
const tasks = await store.getTasks();
const total = tasks.length;
const done = tasks.filter(t => t.status === 'done').length;
const percentComplete = Math.round((done / total) * 100);

const completion = {
  totalTasks: total,
  completed: done,
  percent: percentComplete,
  ready: tasks.filter(t => t.status === 'ready').length,
  inProgress: tasks.filter(t => t.status === 'in_progress').length,
  blocked: tasks.filter(t => t.status === 'blocked').length
};

// Post daily summary
message({
  action: "send",
  message: `
📈 Daily Summary
├── Progress: ${done}/${total} tasks (${percentComplete}%)
├── Completed today: ${tasks.filter(t => t.completed_at?.startsWith(today)).length}
├── In progress: ${completion.inProgress}
├── Ready to start: ${completion.ready}
└── Blocked: ${completion.blocked}
  `.trim()
});
```

### SKILL 10: run_heartbeat
**Purpose:** Execute proactive monitoring loop every 5 minutes  
**When to use:** Continuously (defined in HEARTBEAT.md)  
**Heartbeat Actions:**
1. Query Supabase for task status
2. Check for newly completed tasks
3. Spawn agents if ready tasks exist
4. Check blocked tasks
5. Verify queue depth (create tasks if low)
6. Update dashboard connection
7. Every 3rd heartbeat: Report to Stojan

**How to execute:**
```javascript
// This runs automatically every 5 minutes per HEARTBEAT.md
// Heartbeat schedule:
// - Every 5 min: Monitor, spawn, evaluate
// - Every 15 min: Report to Stojan
// - Always: React to events

async function heartbeat() {
  // UPDATE HEARTBEAT TIMESTAMP (critical for watchdog)
  execSync('node orchestrator-heartbeat-update.js');
  
  // 1. Query Supabase
  const tasks = await store.getTasks();
  
  // 2. Check completions
  const completed = tasks.filter(t => recentlyCompleted(t));
  for (const task of completed) {
    await evaluate_test_results(task);
  }
  
  // 3. Spawn if ready
  const ready = tasks.filter(t => t.status === 'ready');
  if (ready.length > 0) {
    for (const task of ready.slice(0, 2)) {
      await spawn_sub_agent(task);
    }
  }
  
  // 4. Every 3rd heartbeat: Report
  if (heartbeatCount % 3 === 0) {
    await report_to_stojan();
  }
}

// IMPORTANT: Use OpenClaw cron to schedule your heartbeat
cron action=add job={
  "name": "orchestrator-heartbeat",
  "schedule": { "kind": "every", "everyMs": 300000 },
  "payload": { 
    "kind": "systemEvent", 
    "text": "Run SKILL 10: run_heartbeat per HEARTBEAT.md" 
  },
  "sessionTarget": "main",
  "enabled": true
}
```

**Reference:** See `HEARTBEAT.md` for full specification

---

## Discord Commands Reference

| Command | Your Action |
|---------|-------------|
| `!status` | Run SKILL 1 (monitor_project_status) |
| `!spawn <agent> <task>` | Run SKILL 2 (spawn_sub_agent) |
| `!eval <task-id>` | Run SKILL 3 (evaluate_test_results) |
| `!decompose <task-id>` | Run SKILL 5 (handle_decomposition) |
| `!blocker <task-id> <reason>` | Run SKILL 8 (resolve_blocker) |
| `!create <title>` | Run SKILL 7 (create_new_task) |
| `!summary` | Run SKILL 9 (evaluate_project_completion) |

---

## Your Decision Matrix

| Situation | Your Decision | Skill to Use |
|-----------|---------------|--------------|
| Ready tasks exist, budget OK | Spawn agents | SKILL 2 |
| Tests pass | Mark done, unblock next | SKILL 3 |
| First test failure | Retry with better model | SKILL 4 |
| Second failure, large task | Decompose | SKILL 5 |
| Third failure | Escalate to human | SKILL 6 |
| Task blocked >30min | Investigate, create resolution task | SKILL 8 |
| Queue <2 tasks | Create new tasks | SKILL 7 |
| End of day | Post summary | SKILL 9 |
| Heartbeat (every 5 min) | Monitor, spawn, evaluate | SKILL 10 |
| Heartbeat ×3 (15 min) | Report to Stojan | SKILL 10 |
| Before creating task | Check if auto-decompose | SKILL 11 |
| After task outcome | Record learning | SKILL 11 |
| Weekly | Analyze patterns | SKILL 11 |

### SKILL 11: apply_learnings
**Purpose:** Use pattern recognition to optimize decisions  
**When to use:** Before creating tasks, selecting models, handling failures  
**Reference:** LEARNINGS.md

**How to execute:**
```javascript
const { LearningSystem } = require('./learning-system');
const learning = new LearningSystem();

// 1. Before creating a task - check if should auto-decompose
const recommendations = learning.getRecommendations(task);
for (const rec of recommendations) {
  if (rec.type === 'decompose') {
    console.log(`Auto-decomposing based on pattern: ${rec.reason}`);
    await handleDecomposition(task);
    return;
  }
  if (rec.type === 'model' && rec.recommendedModel !== task.model) {
    console.log(`Switching model: ${rec.reason}`);
    task.model = rec.recommendedModel;
  }
}

// 2. After task completion - record outcome
if (testResults.allPassed) {
  learning.recordSuccess(task);
} else {
  const recommendation = learning.recordFailure(task, failureReason);
  console.log(`Learning recorded. Recommendation: ${recommendation}`);
}

// 3. Weekly analysis
learning.analyze();
```

**Auto-Decomposition Rules from LEARNINGS:**
| Task Type | Estimated Hours | Auto-Decompose? | Success Improvement |
|-----------|-----------------|-----------------|---------------------|
| Dashboard | >3h | ✅ Yes | 45% → 95% |
| API | >4h | ✅ Yes | 60% → 88% |
| Integration | Any | ✅ Yes | 35% → 78% |
| Landing Page | >4h | ✅ Yes | 75% → 92% |
| Documentation | Any | ❌ No | 90% (no change) |
| Bug Fix | >3h | ⚠️ Review | Context dependent |

**Model Selection from LEARNINGS:**
| Task Type | Recommended | Success Rate | Why |
|-----------|-------------|--------------|-----|
| Documentation | qwen | 90% | Simple, well-defined |
| Integration | sonnet | 70% | Complex, needs reasoning |
| Dashboard | haiku | 75% | Balance of capability |
| Bug Fix | kimi | 70% | Standard complexity |
| Refactoring | haiku | 80% | Code quality focus |

**Key Learnings to Apply:**
1. **Dashboard tasks always decompose** → 50% success improvement
2. **Integration tasks always use sonnet** → 2x success rate
3. **Tasks >4h have 40% lower success** → Decompose on creation
4. **<3 acceptance criteria = higher failure** → Require more criteria
5. **First failure + large task = decompose** → Don't retry blindly

---

### SKILL 12: manage_git_lifecycle
**Purpose:** Manage the branch → PR → review → merge lifecycle for dev/design tasks
**When to use:** Automatically during spawn (branch creation) and heartbeat (PR/merge management)
**Lifecycle:**
1. **Branch creation** (spawn-consumer.js): `{agentId}/{taskId-8chars}-{title}` — created at agent spawn
2. **PR creation** (after dev/design completion): `gh pr create --base main --head <branch> --title <title> --body <description>`
3. **QC dispatch** (checkPRReviews): Spawn QC agent with `pr_number` + review checklist
4. **Auto-merge** (checkPRReviews): `gh pr merge <number> --squash --delete-branch` for approved PRs
5. **Rework** (checkPRReviews): Create fix task on same branch for rejected PRs
**Rules:**
- Dev/design agents push branches — orchestrator creates PRs from them
- QC agents review only — they never merge or push to PR branches
- All merges are squash merges with branch deletion
- Rejected PRs get fix tasks, not manual edits
**References:** `spawn-consumer.js`, `heartbeat-executor.js` (checkPRReviews)

---

## Key Principle

**You are the conductor. The tools are your orchestra. Play them.**

**And you learn from every performance to make the next one better.**

---

*Orchestrator Skills v2.1 - Productivity Owner with Learning*
