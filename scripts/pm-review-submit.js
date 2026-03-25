#!/usr/bin/env node
require('dotenv').config({ path: '/Users/clawdbot/projects/leadflow/.env' });
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const TASK_ID = '43e51aa4-b911-44c0-be14-31f1d421815e';

const walkthroughSpec = [
  {
    step: 1,
    title: 'Orchestration dashboard',
    url: 'http://127.0.0.1:8787/dashboard.html',
    expected: 'Internal Dashboard loads correctly and is functional',
    actual_behavior: 'Dashboard HTTP 200 confirmed. Product review conducted via comprehensive code review: signup routes, setup wizard, middleware, dashboard components, and API endpoints all inspected.',
    status: 'pass'
  }
];

const findings = [
  {
    type: 'bug',
    severity: 'critical',
    summary: 'Cookie name mismatch: trial signup sets auth-token but middleware reads leadflow_session',
    details: 'The trial-signup route (/api/auth/trial-signup/route.ts line 263) sets an "auth-token" HTTP-only cookie after successful signup. However, the Next.js middleware (middleware.ts line 97) reads "leadflow_session" cookie to validate sessions via validateSession(). This means users completing trial signup cannot access protected routes (/dashboard, /setup) — the middleware sees them as unauthenticated and redirects to /login, completely breaking the frictionless onboarding SLA. The login route correctly sets "leadflow_session". Only trial signup has the mismatch. This is a previously identified bug (tests/fix-cookie-name-mismatch-trial-start-sets-auth-token-u.test.js exists) but remains unfixed in the core trial-signup route.',
    affected_uc_ids: ['feat-frictionless-onboarding-flow'],
    suggested_fix: 'In /app/api/auth/trial-signup/route.ts, replace the JWT cookie set with a call to createSession() from lib/session.ts (same pattern as login route), then set the leadflow_session cookie. This unifies the auth pattern and unblocks the entire post-signup flow.'
  },
  {
    type: 'bug',
    severity: 'high',
    summary: 'OnboardingWizardLauncher "Continue Setup" CTA navigates to /onboarding instead of /setup',
    details: 'In components/dashboard/OnboardingWizardLauncher.tsx, handleStartWizard() does: window.location.href = "/onboarding". But the guided setup wizard lives at /app/setup/page.tsx (/setup route). There is also a /dashboard/onboarding page found in the codebase, but the wizard with FUB/SMS/simulator steps is definitively at /setup. Users clicking the CTA from the dashboard will land on the wrong page or a 404, breaking the wizard auto-launch requirement (FR-5).',
    affected_uc_ids: ['feat-frictionless-onboarding-flow'],
    suggested_fix: 'Change window.location.href = "/onboarding" to window.location.href = "/setup" in OnboardingWizardLauncher.tsx handleStartWizard().'
  },
  {
    type: 'bug',
    severity: 'medium',
    summary: 'SampleDataBanner dismiss key uses boolean (hasSampleLeads) instead of agentId — shared across all users',
    details: 'In SampleDataBanner.tsx, the banner checks if dismissed using key "sample-data-dismissed-" + data.agentId from the API, then stores the dismiss state using key "sample-data-dismissed-" + status.hasSampleLeads (a boolean value). These are different keys. The net effect: dismissal tracks on "sample-data-dismissed-true" for all agents, meaning one agent dismissing the banner dismisses it for all agents on that browser.',
    affected_uc_ids: ['feat-frictionless-onboarding-flow'],
    suggested_fix: 'Ensure the /api/leads/sample-status endpoint returns agentId, and use status.agentId (not status.hasSampleLeads) for the localStorage dismiss key in SampleDataBanner.tsx.'
  },
  {
    type: 'gap',
    severity: 'medium',
    summary: 'Pricing section CTAs route to paid flow (/signup?plan=X), not the trial flow',
    details: 'The landing page (app/page.tsx line 392) has pricing CTA links to /signup?plan=${name.toLowerCase()} which leads to the paid checkout flow (plan selection → account details → Stripe checkout). This contradicts FR-1 (no credit card for trial) and the PRD requirement that the landing page CTA path leads to the frictionless trial. The hero section and features section correctly point to /signup/trial. The pricing section is the inconsistency.',
    affected_uc_ids: ['feat-frictionless-onboarding-flow'],
    suggested_fix: 'Route pricing section CTAs to /signup/trial (or /signup/trial?plan=X to pre-select intended plan). The paid flow can be offered as an upgrade path post-onboarding.'
  },
  {
    type: 'gap',
    severity: 'medium',
    summary: 'Auto-launch wizard on first dashboard visit only works for login flow, not trial signup flow',
    details: 'The middleware enforces onboarding redirect (/dashboard → /setup if onboarding_completed=false). But this only works for sessions authenticated via "leadflow_session" cookie. Trial signup users have "auth-token" cookie, so middleware cannot authenticate them — they get redirected to /login instead. The wizard auto-launch is effectively non-functional for all self-serve trial signups until the cookie mismatch is fixed.',
    affected_uc_ids: ['feat-frictionless-onboarding-flow'],
    suggested_fix: 'Fix the primary cookie name mismatch (critical finding #1). No separate fix needed once that is resolved.'
  },
  {
    type: 'gap',
    severity: 'low',
    summary: 'Instrumentation missing trial_cta_clicked and trial_signup_started events per FR-8',
    details: 'FR-8 requires tracking: trial_cta_clicked, trial_signup_started, trial_signup_completed. The form fires a generic trackCTAClick() for the button, but not a distinct "trial_cta_clicked" event. No "trial_signup_started" event is fired before the API call. "trial_signup_completed" IS tracked server-side correctly. The event names in the code do not match the spec exactly (start_trial_form vs trial_cta_clicked).',
    affected_uc_ids: ['feat-frictionless-onboarding-flow'],
    suggested_fix: 'Add: (1) trial_cta_clicked event on form component mount or first interaction; (2) trial_signup_started event at the beginning of handleSubmit before API call. Use exact event names from FR-8 spec.'
  },
  {
    type: 'ux_issue',
    severity: 'low',
    summary: 'LeadSatisfactionCard hardcoded with test-agent-id in production dashboard',
    details: 'In /app/dashboard/page.tsx: <LeadSatisfactionCard agentId="test-agent-id" /> — hardcoded placeholder. A TODO comment in the file confirms this is known. This means the satisfaction widget will never show real data for production agents.',
    affected_uc_ids: [],
    suggested_fix: 'Read agentId from the authenticated session and pass it to LeadSatisfactionCard. Can use existing /api/auth/trial-status endpoint or a session context provider.'
  }
];

const decisionsNeeded = [
  {
    summary: 'Auth token strategy: JWT cookie (auth-token) vs session table (leadflow_session)',
    category: 'auth_architecture',
    options: [
      { id: 'a', label: 'Standardize on auth-token JWT cookie', description: 'Update middleware and all session checks to read auth-token JWT. Simpler, stateless. Trial signup flow already uses this pattern.' },
      { id: 'b', label: 'Standardize on leadflow_session DB session', description: 'Update trial-signup route to create a DB session and set leadflow_session cookie. Matches login flow, revocable, consistent with existing middleware.' },
      { id: 'c', label: 'Dual read: check both cookies in middleware', description: 'Middleware checks auth-token first, falls back to leadflow_session. Highest backward-compatibility but increases middleware complexity.' }
    ],
    recommended: 'b',
    reason: 'DB sessions (leadflow_session) are already used by login and match existing middleware.ts expectations. Revocability is important for security. Trial signup should create a proper session — one change in one route, no middleware changes needed.',
    blocking: true
  }
];

const actionItems = [
  {
    title: 'CRITICAL: Fix cookie mismatch — trial signup cannot access dashboard',
    description: 'Trial signup sets auth-token cookie but middleware reads leadflow_session. Users completing trial signup are immediately redirected back to /login when they try to reach /setup or /dashboard. This breaks the entire onboarding flow and makes the PRD SLA impossible. Fix before any pilot invite.',
    priority: 1,
    type: 'ACTION',
    options: [
      { id: 'opt_a', label: 'Update trial-signup to create DB session (leadflow_session)', description: 'Call createSession() from lib/session.ts in trial-signup route, set leadflow_session cookie. Same pattern as login. One route change.' },
      { id: 'opt_b', label: 'Update middleware to accept auth-token JWT', description: 'In middleware.ts, fall back to verifying auth-token JWT if leadflow_session is absent. Two files changed.' }
    ],
    recommended_option: 'opt_a'
  },
  {
    title: 'Fix wizard launcher redirect (/onboarding → /setup)',
    description: 'OnboardingWizardLauncher.tsx "Continue Setup" button navigates to /onboarding but the wizard is at /setup. One-line fix, high impact — wizard auto-launch from dashboard will be broken without it.',
    priority: 1,
    type: 'ACTION',
    options: [
      { id: 'opt_a', label: 'Change redirect to /setup in OnboardingWizardLauncher.tsx', description: 'window.location.href = "/setup" — one line change.' }
    ],
    recommended_option: 'opt_a'
  },
  {
    title: 'Align pricing CTA routing: trial vs paid flow',
    description: 'Pricing section CTAs currently route to /signup?plan=X (paid flow with Stripe checkout). The PRD requires no-card trial as the primary path. Decide whether pricing CTAs should route to trial or paid flow.',
    priority: 2,
    type: 'DECISION',
    options: [
      { id: 'opt_a', label: 'Route all CTAs to /signup/trial (trial first)', description: 'Route pricing CTAs to /signup/trial. Upsell to paid post-onboarding. Maximizes trial starts.' },
      { id: 'opt_b', label: 'Keep pricing section as paid-only path', description: 'Pricing is for users who want to pay immediately. Hero/features CTAs drive trial. Add clear labeling.' }
    ],
    recommended_option: 'opt_a'
  }
];

const summary = 'The frictionless onboarding feature set is substantially implemented in code: trial signup form (email + password only, no card), 3-lead sample data seeding with AI responses, guided setup wizard with FUB/SMS/simulator steps, trial status banner with countdown, and an onboarding wizard launcher. However, a critical auth cookie name mismatch renders the entire post-signup flow non-functional: trial-signup sets "auth-token" while the middleware reads "leadflow_session", causing every trial user to be redirected back to login upon reaching /setup or /dashboard. The PRD SLA of signup to dashboard in under 60 seconds is currently impossible to achieve. Two additional high-priority bugs exist: the wizard launcher CTA navigates to /onboarding instead of /setup, and the sample data banner dismiss logic is broken. Verdict: FAIL — not ready for pilot until critical auth fix is deployed and verified.';

async function run() {
  // The task_id (43e51aa4) is not in the tasks table (re-spawned task).
  // UPDATE the existing product_reviews row for this PM feature (task bcfdc9cf).
  const REVIEW_ID = 'ec5932ad-cbc7-4d57-8ca5-029c56aa0a39';

  const { data, error } = await sb.from('product_reviews').update({
    status: 'completed',
    verdict: 'fail',
    readiness_score: 35,
    summary: summary,
    walkthrough_spec: walkthroughSpec,
    findings: findings,
    decisions_needed: decisionsNeeded,
    action_items: actionItems,
    completed_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }).eq('id', REVIEW_ID).select('id');

  if (error) {
    console.error('Update error:', error);
    process.exit(1);
  }
  console.log('Updated review:', data[0].id);
}
run().catch(e => { console.error(e); process.exit(1); });
