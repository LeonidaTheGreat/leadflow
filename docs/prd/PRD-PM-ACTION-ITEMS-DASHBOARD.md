# PRD-PM-ACTION-ITEMS-DASHBOARD

## Title
PM Structured Action Items for Dashboard

## Version
1.0

## Status
Proposed

## Description
Currently, PM heartbeat reports and triage outcomes are narrative text posted to Telegram only. Action items requiring human decisions (pilot recruitment go-ahead, merge priorities, deployment decisions) are invisible on the dashboard. This PRD defines structured action items that get inserted into the `action_items` Supabase table so they appear on the execution dashboard and can be tracked to resolution.

## Problem Statement
- PM reports are only visible in Telegram (topic 10877)
- Action items requiring human input are not surfaced on the dashboard
- Orchestrator cannot track whether Stojan has reviewed/acted on PM decisions
- No audit trail of PM decisions and their outcomes

## User Stories

### As a Product Manager
- I want to insert structured action items into the `action_items` table so they appear on the dashboard
- I want action items to have clear types (DECISION, REVIEW, APPROVAL) so the orchestrator knows what's needed
- I want action items to have priority levels so Stojan knows what to act on first
- I want action items to have `awaiting_input` and `action_needed` fields so Stojan knows exactly what to do

### As Stojan (Human Decision Maker)
- I want to see PM action items on the dashboard alongside other tasks
- I want to see what decision is needed and why it matters
- I want to see the impact of each decision so I can prioritize
- I want to mark action items as resolved when I've made a decision

### As the Orchestrator
- I want to read `action_items` from Supabase so I know what PM decisions are pending
- I want to know when Stojan has responded to an action item
- I want to spawn follow-up tasks based on PM decisions

## Requirements

### 1. SOUL.md Updates
Add instructions to PM SOUL.md for writing to `action_items` table:

```javascript
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Insert action item for human decision
await sb.from('action_items').insert({
  project_id: 'leadflow',
  title: 'Short title of decision needed',
  type: 'DECISION',  // or 'REVIEW', 'APPROVAL'
  status: 'WAITING',
  priority: 1,  // 1=critical, 2=high, 3=medium, 4=low
  description: 'Context and background for the decision',
  awaiting_input: 'Stojan',
  impact: 'What happens if we do/don\'t act',
  action_needed: 'Exact action Stojan needs to take',
  metadata: {
    // Additional context as needed
  }
});
```

### 2. HEARTBEAT.md Updates
Add instructions to PM HEARTBEAT.md for inserting action items during:
- Pilot recruitment decisions
- Merge priority decisions
- Deployment go/no-go decisions
- Pricing strategy decisions
- Pivot decisions

### 3. Action Item Types
- **DECISION**: Requires Stojan to choose between options
- **REVIEW**: Requires Stojan to review and approve
- **APPROVAL**: Requires Stojan to give formal approval to proceed

### 4. Action Item Fields
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| project_id | string | Yes | 'leadflow' |
| title | string | Yes | Short, actionable title |
| type | string | Yes | DECISION, REVIEW, or APPROVAL |
| status | string | Yes | WAITING, RESOLVED, CANCELLED |
| priority | number | Yes | 1-4 (1=critical) |
| description | string | Yes | Full context |
| awaiting_input | string | Yes | Who needs to act (e.g., 'Stojan') |
| impact | string | Yes | Business impact |
| action_needed | string | Yes | Exact action required |
| options | jsonb | No | Decision options if applicable |
| recommended_option | string | No | PM's recommendation |
| response | string | No | Stojan's response |
| responded_at | timestamp | No | When Stojan responded |

## Acceptance Criteria

### AC-1: SOUL.md Updated
- SOUL.md contains code example for inserting action items
- SOUL.md explains when to use action items vs product_feedback
- SOUL.md is updated before this PRD is approved

### AC-2: HEARTBEAT.md Updated
- HEARTBEAT.md contains code example for inserting action items
- HEARTBEAT.md lists scenarios where action items should be created
- HEARTBEAT.md is updated before this PRD is approved

### AC-3: Action Items Appear on Dashboard
- Action items inserted by PM agent appear in dashboard's "Action Items" section
- Action items show title, priority, awaiting_input, action_needed
- Action items can be filtered by status and priority

### AC-4: Orchestrator Reads Action Items
- Orchestrator reads `action_items` table every heartbeat
- Orchestrator checks for WAITING items and surfaces them to Stojan
- Orchestrator spawns follow-up tasks when items are resolved

### AC-5: Action Item Lifecycle
- Items start as WAITING
- Stojan responds via Telegram or dashboard
- Orchestrator updates status to RESOLVED when response received
- Orchestrator spawns follow-up task based on decision

## E2E Test Specs

### Test 1: PM Inserts Action Item
1. PM agent writes heartbeat report with action item
2. PM agent inserts row into `action_items` table
3. Verify row exists in Supabase with correct fields
4. Verify dashboard shows the action item

### Test 2: Stojan Responds to Action Item
1. Stojan sees action item on dashboard
2. Stojan responds via Telegram: "Go ahead with recruitment"
3. Orchestrator detects response
4. Orchestrator updates action_items.status to 'RESOLVED'
5. Orchestrator spawns follow-up task

### Test 3: Action Item Priority Sorting
1. Create 3 action items with different priorities (1, 2, 3)
2. Verify dashboard sorts by priority (1 first)
3. Verify critical items are highlighted

## Implementation Notes

### When to Use Action Items vs product_feedback
- **action_items**: Decisions requiring human input, go/no-go decisions, strategic choices
- **product_feedback**: Bugs, feature requests, UX issues, spec gaps

### When to Create Action Items
- Pilot recruitment go-ahead
- Merge priority decisions
- Deployment go/no-go
- Pricing changes
- Pivot decisions
- Budget approvals
- Resource allocation decisions

### Example Action Item for Pilot Recruitment
```javascript
await sb.from('action_items').insert({
  project_id: 'leadflow',
  title: 'Pilot Recruitment Go-Ahead',
  type: 'APPROVAL',
  status: 'WAITING',
  priority: 1,
  description: 'We have 3 qualified real estate agents ready to join the pilot. They understand the terms (free for 60 days, must provide feedback, must be responsive). Pilot start date is critical for $20K MRR timeline.',
  awaiting_input: 'Stojan',
  impact: 'Determines first revenue timeline. Delay = delayed learning = delayed product-market fit.',
  action_needed: 'Say "go ahead with recruitment" to spawn marketing task',
  metadata: {
    candidate_count: 3,
    pilot_start_ready: true,
    marketing_task_pending: true
  }
});
```

## Success Metrics
- 100% of PM decisions requiring human input are captured as action items
- Action items appear on dashboard within 1 heartbeat
- Average time from action item creation to resolution < 24 hours
- Zero PM decisions lost in Telegram chat history

## Related Documents
- PM SOUL.md
- PM HEARTBEAT.md
- `action_items` Supabase table schema
- Dashboard action items section

## Open Questions
- Should action items have an `expires_at` field for time-sensitive decisions?
- Should there be a "remind me" feature for stale action items?
- Should action items support multiple approvers?
