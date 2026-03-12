require('dotenv').config({ path: '/Users/clawdbot/projects/leadflow/.env' });
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const taskId = '80060e23-0ae3-4cc6-910c-fc0e88a9d5f9';

async function run() {
  // 1. Create product_reviews row
  const walkthroughSpec = [
    {
      url: 'https://leadflow-ai-five.vercel.app',
      product_id: 'customer-dashboard',
      description: 'Marketing landing page with pricing, CTA, how-it-works',
      expected_behavior: 'Landing page loads, pricing visible, CTA links to signup/trial',
      actual_behavior: 'Loads correctly. Three-tier pricing (Starter $49, Pro $149, Team $399) visible. Start Free Trial CTA present. Sign In navigation works. How It Works section displayed. Missing Brokerage tier.',
      status: 'partial'
    },
    {
      url: 'https://leadflow-ai-five.vercel.app/signup/trial',
      product_id: 'customer-dashboard',
      description: 'Trial signup flow — no credit card required',
      expected_behavior: 'Trial signup form loads, agent can register without credit card',
      actual_behavior: 'Page returns 200. Trial signup route exists but no dedicated UI — redirects to landing page content. UC free-pilot-no-credit-card-required still in_progress.',
      status: 'partial'
    },
    {
      url: 'https://leadflow-ai-five.vercel.app/setup',
      product_id: 'customer-dashboard',
      description: 'Post-signup onboarding/setup wizard',
      expected_behavior: 'Authenticated users see onboarding wizard; unauthenticated redirected to login',
      actual_behavior: 'Returns 307 redirect — correct auth protection. Aha moment simulator (feat-aha-moment-lead-simulator) is not_started, so onboarding does not deliver activation.',
      status: 'partial'
    },
    {
      url: 'https://leadflow-ai-five.vercel.app/dashboard',
      product_id: 'customer-dashboard',
      description: 'Agent dashboard — main product interface',
      expected_behavior: 'Authenticated users see dashboard with upgrade CTA; unauthenticated redirected to login',
      actual_behavior: 'Returns 307 redirect — correct auth protection. No self-serve upgrade/Stripe checkout in dashboard per current UC coverage.',
      status: 'partial'
    },
    {
      url: 'https://fub-inbound-webhook.vercel.app/health',
      product_id: 'fub-webhook',
      description: 'FUB webhook API health check',
      expected_behavior: 'Returns status:ok with FUB configured',
      actual_behavior: 'Returns {status:ok, timestamp, fub:configured}. Webhook API is live and healthy.',
      status: 'pass'
    }
  ];

  const findings = [
    {
      type: 'revenue_gap',
      severity: 'critical',
      summary: 'No self-serve upgrade path from pilot to paid',
      details: 'Pilot agents get free access (no credit card) but there is zero self-serve mechanism to upgrade to a paid plan. Conversion requires manual Stojan intervention — will not scale to $20K MRR. No Stripe checkout in dashboard, no upgrade CTA, no in-app pricing comparison after trial.',
      affected_uc_ids: ['free-pilot-no-credit-card-required', 'UC-10', 'UC-11'],
      suggested_fix: 'Add self-serve Stripe checkout flow triggered from dashboard upgrade button. New UC: feat-self-serve-stripe-checkout.'
    },
    {
      type: 'revenue_gap',
      severity: 'critical',
      summary: 'Aha moment lead simulator not implemented (not_started at day 22)',
      details: 'feat-aha-moment-lead-simulator is not_started. Without experiencing AI responding to a lead in <30 seconds during onboarding, agents never reach activation. No activation = no retention = no conversion. This is the core funnel leak explaining $0 MRR at day 22.',
      affected_uc_ids: ['feat-aha-moment-lead-simulator', 'feat-post-login-onboarding-wizard'],
      suggested_fix: 'Escalate to P0 immediately. Agents must see "Your AI just responded to a lead in 28 seconds" before leaving onboarding.'
    },
    {
      type: 'revenue_gap',
      severity: 'high',
      summary: 'No pilot-to-paid conversion email sequence',
      details: 'Free pilot expires at day 60 but there are no automated emails nudging agents toward paid conversion. No urgency signals at day 30 (midpoint), day 45 (upgrade nudge), day 55 (5 days left). Agents will be surprised by expiry with no warm-up.',
      affected_uc_ids: ['free-pilot-no-credit-card-required'],
      suggested_fix: 'Build automated email sequence via Resend. New UC: feat-pilot-conversion-email-sequence.'
    },
    {
      type: 'ux',
      severity: 'high',
      summary: 'Brokerage tier missing from pricing page',
      details: 'PMF.md defines Brokerage at $999+/mo but live pricing only shows 3 tiers (Starter, Pro, Team). Highest-value segment has no entry point.',
      affected_uc_ids: ['UC-10'],
      suggested_fix: 'Add Brokerage tier card with contact-for-pricing CTA.'
    }
  ];

  const decisionsNeeded = [
    {
      summary: 'Self-serve vs. sales-assisted conversion strategy for pilot agents',
      category: 'revenue',
      options: [
        'Build self-serve Stripe checkout in dashboard (required for scale)',
        'Continue manual Stojan conversion (limits to fewer than 5 agents)',
        'Hybrid: self-serve for Starter/Pro, Stojan-assisted for Team/Brokerage'
      ],
      recommended: 'Hybrid: self-serve for Starter/Pro, Stojan-assisted for Team/Brokerage',
      reason: 'Maximizes self-serve revenue capture while preserving high-touch for larger deals. Solo agents should never need to talk to anyone to upgrade.',
      blocking: true
    }
  ];

  const { data: reviewData, error: reviewError } = await sb.from('product_reviews').insert({
    project_id: 'leadflow',
    review_type: 'revenue_gap_analysis',
    task_id: taskId,
    scope_product_ids: ['customer-dashboard', 'fub-webhook'],
    walkthrough_spec: walkthroughSpec,
    findings: findings,
    decisions_needed: decisionsNeeded,
    verdict: 'pass_with_issues',
    readiness_score: 52,
    summary: 'Day 22 with $0 MRR. Product is technically functional (landing page live, auth working, FUB webhook healthy) but revenue funnel has critical gaps: (1) aha moment simulator is not_started — agents never reach activation; (2) no self-serve upgrade path — all conversions require manual Stojan intervention; (3) no pilot-to-paid email sequence. Without fixing these three gaps, there is no path to $20K MRR in the remaining 38 days.',
    status: 'completed',
    completed_at: new Date().toISOString()
  }).select('id');

  if (reviewError) {
    console.error('Review error:', reviewError);
  } else {
    console.log('Review created:', reviewData[0].id);
  }

  // 2. Insert 3 new use cases
  const newUCs = [
    {
      id: 'feat-self-serve-stripe-checkout',
      project_id: 'leadflow',
      name: 'Self-Serve Stripe Checkout — In-Dashboard Upgrade Flow',
      description: 'Pilot agents and trial users can upgrade to a paid plan (Starter/Pro/Team) directly from the dashboard without contacting Stojan. An "Upgrade" button in the dashboard/settings opens a Stripe Checkout session for the selected plan. On success, plan_tier and stripe_customer_id update automatically. Acceptance criteria: (1) Upgrade CTA visible in dashboard for pilot/trial agents; (2) Stripe Checkout session created server-side; (3) Webhook updates agent plan_tier on checkout.session.completed; (4) Dashboard reflects new tier immediately after payment; (5) Confirmation email sent via Resend; (6) Failed payments surface clear error UI.',
      phase: 'Phase 1',
      priority: 0,
      implementation_status: 'not_started',
      revenue_impact: 'critical',
      workflow: ['product', 'dev', 'qc'],
      acceptance_criteria: [
        'Upgrade CTA visible in dashboard header/settings for pilot and trial plan agents',
        'Clicking Upgrade shows plan selection modal (Starter, Pro, Team with prices)',
        'Selecting a plan creates Stripe Checkout session via /api/billing/checkout',
        'Successful checkout triggers stripe webhook that updates agent plan_tier and stripe_customer_id',
        'Dashboard shows updated plan tier without page reload',
        'Confirmation email sent via Resend on successful upgrade',
        'Failed/cancelled payment returns user to dashboard with clear error message',
        'Brokerage tier shows contact-for-pricing CTA instead of Stripe checkout'
      ]
    },
    {
      id: 'feat-pilot-conversion-email-sequence',
      project_id: 'leadflow',
      name: 'Pilot-to-Paid Conversion Email Sequence',
      description: 'Automated email nurture sequence for pilot agents via Resend. Converts pilot agents to paid before expiry at day 60. Three touchpoints: day 30 (midpoint value recap + upgrade offer), day 45 (ROI stats + urgency), day 55 (5 days left with clear upgrade CTA). Acceptance criteria: (1) Cron job checks for pilot agents approaching key milestones; (2) Three distinct email templates: midpoint, urgent, final warning; (3) Each email contains personalized stats (leads responded, avg response time, appointments booked); (4) Emails include direct Stripe checkout link for Pro plan; (5) Email delivery tracked in agent_email_logs or analytics_events; (6) Sequence stops if agent upgrades.',
      phase: 'Phase 1',
      priority: 1,
      implementation_status: 'not_started',
      revenue_impact: 'high',
      workflow: ['product', 'dev', 'qc'],
      acceptance_criteria: [
        'Cron job runs daily and identifies pilots at day 30, 45, and 55',
        'Day 30 email: value recap with leads responded, meetings booked, avg response time',
        'Day 45 email: ROI calculation + upgrade urgency with one-click Stripe checkout link',
        'Day 55 email: 5 days remaining warning with clear upgrade CTA',
        'All emails delivered via Resend with tracking',
        'Sequence halts automatically when agent upgrades (plan_tier changes from pilot)',
        'Email send events logged to analytics_events table',
        'Each email renders correctly on mobile (responsive HTML)'
      ]
    },
    {
      id: 'feat-demo-without-signup',
      project_id: 'leadflow',
      name: 'Live AI Demo — Experience the Product Without Signing Up',
      description: 'Prospects can experience the core product value (AI responding to a lead in <30 seconds) directly on the landing page or a /demo route — no signup required. Interactive demo: visitor enters a fake lead name/property type, clicks "Send Lead", and watches the AI craft and send an SMS response in real-time. Reduces top-of-funnel friction from "curious visitor" to "activated prospect" before asking for email. Acceptance criteria: (1) /demo or landing page section shows interactive lead simulator; (2) No auth required; (3) AI generates personalized SMS copy using Claude; (4) Animation shows <30 second response; (5) CTA at end of demo links to trial signup; (6) Demo interactions logged for conversion analytics.',
      phase: 'Phase 1',
      priority: 1,
      implementation_status: 'not_started',
      revenue_impact: 'high',
      workflow: ['product', 'design', 'dev', 'qc'],
      acceptance_criteria: [
        '/demo page or landing page section loads without authentication',
        'Visitor can enter lead name, property interest, and source (Zillow, Realtor.com, etc.)',
        'Submit triggers Claude AI to generate personalized SMS response',
        'AI response appears within 5 seconds with animated typing effect',
        'Timer shows "Responded in X seconds" to reinforce the <30s value prop',
        'Demo ends with CTA: Start Free Trial — No Credit Card Required',
        'Demo events (started, completed, CTA clicked) tracked in analytics_events',
        'Works on mobile viewport (responsive)'
      ]
    }
  ];

  for (const uc of newUCs) {
    const { data, error } = await sb.from('use_cases').insert(uc).select('id');
    if (error) {
      console.error(`Error inserting ${uc.id}:`, error);
    } else {
      console.log('UC created:', data[0].id);
    }
  }

  // 3. Reprioritize aha moment simulator to P0
  const { error: updateError } = await sb.from('use_cases')
    .update({ priority: 0 })
    .eq('id', 'feat-aha-moment-lead-simulator')
    .eq('project_id', 'leadflow');

  if (updateError) {
    console.error('Update error:', updateError);
  } else {
    console.log('feat-aha-moment-lead-simulator reprioritized to P0');
  }

  console.log('Done');
}

run().catch(console.error);
