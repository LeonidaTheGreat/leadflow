#!/usr/bin/env node
require('dotenv').config({ path: '/Users/clawdbot/projects/leadflow/.env' });
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const ucId = 'free-pilot-no-credit-card-required';
  
  const uc = {
    id: ucId,
    project_id: 'leadflow',
    name: 'Free Pilot Onboarding — No Credit Card Required',
    description: [
      '## Decision Implementation: Free Pilot (No Credit Card Required)',
      '',
      '**Decision ID:** 6293dfc3-01c5-4276-b024-df04fbdeda92',
      '**Chosen Option:** Free pilot - no credit card required, pilot agents get 30-60 days free, convert manually',
      '**Rationale:** Maximize pilot signups at Day 22 with $0 MRR. Remove all friction from the onboarding funnel.',
      '',
      '### What to Build',
      '',
      'Pilot agents (the first 3-5 real estate agents) can sign up and access LeadFlow AI without entering a credit card. They get full access for 30-60 days. Conversion to paid is handled manually by Stojan.',
      '',
      '### User Journey',
      '',
      '1. Agent visits leadflow-ai-five.vercel.app',
      '2. Clicks "Start Free Pilot" CTA',
      '3. Fills out signup form: name, email, brokerage, FUB API key',
      '4. **No credit card step** — goes directly to onboarding',
      '5. Agent is created in Supabase `agents` table with:',
      '   - `plan_tier: "pilot"`',
      '   - `pilot_started_at: now()`',
      '   - `pilot_expires_at: now() + 60 days`',
      '   - `stripe_customer_id: null` (no card required)',
      '6. Agent receives welcome email with setup instructions',
      '7. Agent connects FUB + Cal.com integrations',
      '8. System begins responding to leads via SMS',
      '',
      '### Pilot Expiry Flow (Manual)',
      '- At day 45: Stojan manually contacts pilot agents to discuss conversion',
      '- At day 60: Pilot expires, system pauses SMS sending for expired pilots',
      '- Conversion: Stojan manually creates Stripe subscription, updates agent record',
      '',
      '### Schema Changes Required',
      '',
      'Add to `agents` table:',
      '- `pilot_started_at` (timestamptz, nullable)',
      '- `pilot_expires_at` (timestamptz, nullable)',
      '',
      'Update `plan_tier` enum/check to include `"pilot"` as a valid value.',
      '',
      '### Signup Route Changes',
      '',
      'Current `/api/agents/signup` (or equivalent) must:',
      '- Remove any Stripe payment intent creation',
      '- Remove credit card form from frontend',
      '- Set `plan_tier = "pilot"`, `pilot_started_at = NOW()`, `pilot_expires_at = NOW() + INTERVAL 60 days`',
      '- Send welcome email via existing email integration',
      '- Notify Stojan via Telegram: "New pilot agent signed up: {name} ({email})"',
    ].join('\n'),
    phase: 'Phase 1',
    priority: 0,
    implementation_status: 'not_started',
    e2e_tests_defined: true,
    e2e_tests_passing: false,
    acceptance_criteria: [
      'Signup page has no credit card form or Stripe Elements',
      'Signup form collects: name, email, brokerage name, FUB API key',
      'Successful signup creates agent record with plan_tier=pilot, pilot_started_at, pilot_expires_at (60 days)',
      'Agent is redirected to dashboard immediately after signup (no payment step)',
      'Dashboard shows pilot status banner: "X days remaining on your free pilot"',
      'Welcome email is sent on signup with onboarding instructions and FUB setup guide',
      'FUB webhook integration activates automatically on signup',
      'SMS lead response is live within 5 minutes of signup',
      'Expired pilots (>60 days) see a soft paywall: upgrade CTA, SMS paused with clear message',
      'Stojan receives Telegram notification when a new pilot agent signs up: name, email, brokerage',
      'agents table: pilot agents have plan_tier=pilot, no stripe_customer_id required to use product',
      'No Stripe charge or card-on-file created during pilot signup flow'
    ],
    depends_on: null,
    workflow: ['dev', 'qc'],
    shippable_after_step: null,
    revenue_impact: 'high',
    metadata: {
      decision_id: '6293dfc3-01c5-4276-b024-df04fbdeda92',
      decision_category: 'pricing',
      pilot_duration_days: 60,
      pilot_max_agents: 5,
      conversion_method: 'manual',
      created_by: 'pm-decision-implementation',
      source_task_id: '09afb62a-f1a4-4744-93dd-916778009fbe'
    }
  };
  
  const { data, error } = await sb.from('use_cases').upsert(uc).select();
  if (error) {
    console.error('Error creating UC:', error);
    process.exit(1);
  }
  console.log('UC created successfully:', data[0].id);
  
  // Update the product_decisions row with the resulting UC ID
  const { error: decisionError } = await sb.from('product_decisions')
    .update({ resulting_uc_ids: [ucId] })
    .eq('id', '6293dfc3-01c5-4276-b024-df04fbdeda92');
  if (decisionError) {
    console.error('Error updating decision:', decisionError);
  } else {
    console.log('Decision updated with resulting UC ID:', ucId);
  }
  
  // Check if product_reviews row exists for this task
  const { data: reviews } = await sb.from('product_reviews')
    .select('id, status')
    .eq('task_id', '09afb62a-f1a4-4744-93dd-916778009fbe');
  
  if (reviews && reviews.length > 0) {
    const reviewId = reviews[0].id;
    console.log('Found product_reviews row:', reviewId);
    
    // Update the product_reviews row
    const { error: reviewError } = await sb.from('product_reviews').update({
      walkthrough_spec: [{
        url: 'https://leadflow-ai-five.vercel.app',
        product_id: 'leadflow-dashboard',
        description: 'Free pilot signup flow — no credit card required',
        expected_behavior: 'Agent can sign up without credit card and access dashboard immediately',
        actual_behavior: 'UC spec created. Pilot signup flow must be implemented by dev team. Decision: free pilot (no CC), 60-day access, manual conversion.',
        status: 'pending'
      }],
      findings: [{
        type: 'decision',
        severity: 'high',
        summary: 'Pilot pricing decision implemented as UC spec',
        details: 'Decision approved by Stojan: Free pilot, no credit card required. Pilot agents get 30-60 days free access. Manual conversion. UC created: free-pilot-no-credit-card-required. Dev team must remove Stripe card collection from signup flow and add pilot_started_at / pilot_expires_at columns to agents table.',
        affected_uc_ids: ['free-pilot-no-credit-card-required'],
        suggested_fix: 'Implement UC free-pilot-no-credit-card-required: remove CC from signup, set plan_tier=pilot, add pilot expiry dates, add Telegram notification on signup'
      }],
      decisions_needed: [],
      verdict: 'pass_with_issues',
      readiness_score: 70,
      summary: 'Pricing decision implemented as a use case spec. The approved decision (free pilot, no credit card, 30-60 days, manual conversion) has been translated into UC free-pilot-no-credit-card-required with 12 acceptance criteria and submitted to the dev workflow. Product is not yet pilot-ready as the current signup flow still requires credit card. Dev team must implement this UC before the first pilot agent can sign up.',
      status: 'completed',
      completed_at: new Date().toISOString(),
      resulting_uc_ids: [ucId]
    }).eq('id', reviewId);
    
    if (reviewError) {
      console.error('Error updating product_reviews:', reviewError);
    } else {
      console.log('product_reviews row updated successfully');
    }
  } else {
    console.log('No product_reviews row found for this task — creating one');
    
    const { data: newReview, error: createError } = await sb.from('product_reviews').insert({
      project_id: 'leadflow',
      task_id: '09afb62a-f1a4-4744-93dd-916778009fbe',
      review_type: 'manual',
      scope_uc_ids: ['free-pilot-no-credit-card-required'],
      scope_product_ids: ['leadflow-dashboard'],
      walkthrough_spec: [{
        url: 'https://leadflow-ai-five.vercel.app',
        product_id: 'leadflow-dashboard',
        description: 'Free pilot signup flow — no credit card required',
        expected_behavior: 'Agent can sign up without credit card and access dashboard immediately',
        actual_behavior: 'UC spec created. Decision: free pilot (no CC), 60-day access, manual conversion. Dev implementation pending.',
        status: 'pending'
      }],
      findings: [{
        type: 'decision',
        severity: 'high',
        summary: 'Pilot pricing decision implemented as UC spec',
        details: 'Decision approved by Stojan: Free pilot, no credit card required. Pilot agents get 30-60 days free access. Manual conversion. UC created: free-pilot-no-credit-card-required.',
        affected_uc_ids: ['free-pilot-no-credit-card-required'],
        suggested_fix: 'Implement UC: remove CC from signup, set plan_tier=pilot, add pilot expiry dates, notify Stojan on signup'
      }],
      decisions_needed: [],
      verdict: 'pass_with_issues',
      readiness_score: 70,
      summary: 'Pricing decision implemented as a use case spec. The approved decision (free pilot, no credit card, 30-60 days, manual conversion) has been translated into UC free-pilot-no-credit-card-required with 12 acceptance criteria and submitted to the dev workflow.',
      status: 'completed',
      completed_at: new Date().toISOString(),
      resulting_uc_ids: ['free-pilot-no-credit-card-required']
    }).select();
    
    if (createError) {
      console.error('Error creating product_reviews row:', createError);
    } else {
      console.log('product_reviews row created:', newReview[0].id);
    }
  }
}

main().catch(console.error);
