#!/usr/bin/env node
require('dotenv').config({ path: '/Users/clawdbot/projects/leadflow/.env' });
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const now = new Date().toISOString();

const walkthroughSpec = [
  {
    url: 'http://127.0.0.1:8787/dashboard.html',
    product_id: 'internal-dashboard',
    description: 'Orchestration dashboard (local, Tailscale accessible)',
    expected_behavior: 'Internal Dashboard loads correctly and is functional',
    actual_behavior: 'HTTP 200. Dashboard loads correctly with Supabase integration active. Live data renders: tasks, agent activity, KPIs. Auto-refresh functional. MRR shows $0. 1 active task in_progress (this PM review). Dashboard is fully operational.',
    status: 'pass'
  }
];

const findings = [
  {
    type: 'revenue_gap',
    severity: 'critical',
    summary: 'MRR is $0 — no paying customers despite all technical blockers being resolved',
    details: 'subscriptions table: 0 rows. real_estate_agents: 133 rows but all are smoke-test/QC/example accounts. Non-test real accounts: madzunkov@gmail.com (trial, email_verified=true), madzunkov@hotmail.com (plan_tier=null), test@example-never-real.com. PRD sign-off declared all 3 critical actions complete on March 7. Product is technically ready. Pilot recruitment has not launched.',
    affected_uc_ids: ['UC-REVENUE-RECOVERY-001'],
    suggested_fix: 'Unblock pilot recruitment immediately. Two action_items have been WAITING for Stojan approval since Feb 25 (17+ days): Marketing Recruitment Timing and Pilot Launch Decision. Must be resolved to start revenue generation.'
  },
  {
    type: 'blocked_action_items',
    severity: 'critical',
    summary: 'Pilot recruitment blocked — 2 action items WAITING since Feb 25 with no response',
    details: 'Action items bd16d510 (Marketing Recruitment Timing) and c0fd9c86 (Pilot Launch Decision) have status=WAITING, awaiting_input=Stojan since Feb 25, 2026. No response recorded. This is 17+ days of delay on the most revenue-critical action. Day 20 go/no-go checkpoint passed technically but business execution is stalled.',
    affected_uc_ids: ['UC-REVENUE-RECOVERY-001'],
    suggested_fix: 'Stojan must approve pilot recruitment. Marketing agent is ready to execute outreach. Orchestrator should re-surface these action items with urgency.'
  },
  {
    type: 'account_status',
    severity: 'high',
    summary: 'madzunkov@hotmail.com has plan_tier=null — account may be broken',
    details: 'madzunkov@hotmail.com was previously locked out (fix-madzunkov-hotmail-com use case marked complete) but now shows plan_tier=null and trial_ends_at=null. If Stojan uses this account, he may hit broken product states.',
    affected_uc_ids: ['UC-AUTH-FIX-001'],
    suggested_fix: 'Set plan_tier=trial and trial_ends_at to 30 days from now for madzunkov@hotmail.com, or confirm account is intentionally deactivated.'
  },
  {
    type: 'pilot_signups_quality',
    severity: 'medium',
    summary: 'pilot_signups table contains only test/example emails — no real prospects captured',
    details: 'pilot_signups has 5 entries, all test/example emails (test@example.com, pmtest@example.com, etc.). No real estate agent prospects captured yet. Landing page lead magnet is functional but has not received real traffic.',
    affected_uc_ids: ['UC-LANDING-MARKETING-001', 'gtm-landing-page'],
    suggested_fix: 'Begin outreach campaigns (Facebook groups, LinkedIn, direct DM). Target 20 real agents per PRD. Requires pilot recruitment go-ahead from Stojan first.'
  },
  {
    type: 'in_progress_use_cases',
    severity: 'low',
    summary: '2 non-revenue use cases still in_progress',
    details: 'feat-genome-auto-generated-docs-convention and feat-genome-project-structure-convention are both implementation_status=in_progress. Both revenue_impact=none. Infrastructure/convention tasks, non-blocking for revenue phase.',
    affected_uc_ids: ['feat-genome-auto-generated-docs-convention', 'feat-genome-project-structure-convention'],
    suggested_fix: 'Monitor progress. No action needed for revenue phase.'
  }
];

const decisionsNeeded = [
  {
    summary: 'Pilot Recruitment Launch — immediate go/no-go decision required',
    category: 'business_execution',
    options: [
      {
        id: 'launch_now',
        label: 'Launch Recruitment Now',
        description: 'Approve Marketing Recruitment Timing action item. Marketing agent begins outreach to 20 real estate agents this week via Facebook groups and LinkedIn. 30-day free trial, concierge onboarding.'
      },
      {
        id: 'delay_2_weeks',
        label: 'Delay 2 More Weeks',
        description: 'Wait for additional product polish before recruiting. Risk: Day 60 deadline becomes unachievable with only ~30 days remaining.'
      },
      {
        id: 'manual_sales',
        label: 'Pivot to Manual Direct Sales',
        description: 'Stojan personally outreaches to 5-10 known real estate agents. Faster for first 3 pilots but not scalable.'
      }
    ],
    recommended: 'launch_now',
    reason: 'All 3 technical blockers confirmed complete. Product is ready. Day 22 of 60 passed with 0 paying agents vs PRD target of 1 paying agent by Day 22. Every day of delay reduces probability of hitting $20K MRR by Day 60.',
    blocking: true
  }
];

const actionItems = [
  {
    title: 'URGENT: Approve Pilot Recruitment Launch',
    description: 'Two action items have been waiting for your approval since Feb 25 (17+ days). The product is technically ready — all 3 critical blockers from PRD-REVENUE-RECOVERY-001 are resolved. Marketing agent is ready to begin outreach. Every day of delay compresses runway to $20K MRR by Day 60. Day 22 of 60 has passed with 0 paying agents (target: 1).',
    priority: 1,
    type: 'DECISION',
    options: [
      {
        id: 'approve_now',
        label: 'Approve Now',
        description: 'Reply with approval — marketing agent begins outreach to 20 real estate agents this week'
      },
      {
        id: 'manual_outreach',
        label: 'Manual Outreach Instead',
        description: 'You personally DM 5-10 known agents for faster first 3 pilots'
      },
      {
        id: 'need_changes',
        label: 'Product Needs More Work First',
        description: 'Specify what needs to change — will create dev task immediately'
      }
    ],
    recommended_option: 'approve_now'
  },
  {
    title: 'Fix madzunkov@hotmail.com — plan_tier is null',
    description: 'Your hotmail account has plan_tier=null and no trial_ends_at. Logging in may produce broken product states. Restore to trial or confirm intentional.',
    priority: 2,
    type: 'ACTION',
    options: [
      {
        id: 'restore_trial',
        label: 'Restore to Trial',
        description: 'Set plan_tier=trial, trial_ends_at=30 days from now'
      },
      {
        id: 'leave_as_is',
        label: 'Leave As-Is',
        description: 'Account intentionally in this state'
      }
    ],
    recommended_option: 'restore_trial'
  }
];

const summary = 'LeadFlow is technically production-ready. All 3 critical blockers from PRD-REVENUE-RECOVERY-001 (onboarding fix, landing page, Twilio SMS) are confirmed complete per the March 7 PM sign-off. The orchestration dashboard loads correctly (HTTP 200, live Supabase data). However, revenue recovery has stalled at the execution layer: MRR remains $0, subscriptions table is empty, and the only real accounts are Stojan test accounts — no actual pilot agents. The critical bottleneck is not technical: the pilot recruitment approval has been WAITING since Feb 25 (17+ days). Day 22 of 60 has passed with 0 paying agents vs the PRD target of 1. Immediate action required: Stojan must approve pilot recruitment to unblock the marketing agent and start the revenue clock.';

sb.from('product_reviews').update({
  walkthrough_spec: walkthroughSpec,
  findings: findings,
  decisions_needed: decisionsNeeded,
  verdict: 'pass_with_issues',
  readiness_score: 62,
  summary: summary,
  action_items: actionItems,
  status: 'completed',
  completed_at: now,
  updated_at: now
})
.eq('task_id', '1a43e563-13ce-4f09-9d3e-0d461dd2eb36')
.then(({ data, error }) => {
  if (error) {
    console.log('UPDATE ERROR:', error.message);
    process.exit(1);
  } else {
    console.log('UPDATE SUCCESS — product_reviews row completed');
    process.exit(0);
  }
});
