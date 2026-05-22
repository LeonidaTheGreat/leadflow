#!/usr/bin/env node

/**
 * Insert Revenue Recovery Use Cases for PRD-REVENUE-RECOVERY-002
 * Inserts 4 new use cases that drive trial-to-paid conversion
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const { createClient } = require('../lib/db');

const sb = createClient(
  process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_URL,
  process.env.API_SECRET_KEY
);

const useCases = [
  {
    id: 'uc-trial-email-sequence-activate',
    name: 'Activate Pilot-to-Paid Email Sequence for Trial Users',
    phase: 'Phase 3',
    prd_id: 'prd-revenue-recovery-002',
    implementation_status: 'not_started',
    priority: 1,
    project_id: 'leadflow',
    description: 'Email sequence triggers when trial_ends_at approaches. Sends: day 10 reminder, day 13 urgency, day 14 final notice, day +1 expired notice.',
    acceptance_criteria: 'Email templates created in Resend; Cron job checks trial_ends_at daily and evaluates milestones; Three distinct email templates: midpoint, urgent, final warning; Each email includes personalized stats: leads responded, avg response time, appointments booked; Each email includes direct Stripe checkout link for Pro plan; Email send attempts tracked in agent_email_logs or analytics_events; Sequence halts automatically when agent upgrades from trial to paid; No duplicate sends for same agent+milestone within 24h',
    revenue_impact: 'Converts 12% of trial users to paid (0.36 agents × $149 = $54/mo minimum)',
    workflow: ['PM', 'Dev', 'QC']
  },
  {
    id: 'uc-dashboard-trial-countdown',
    name: 'Dashboard: Trial Expiration Countdown & Upgrade CTA',
    phase: 'Phase 3',
    prd_id: 'prd-revenue-recovery-002',
    implementation_status: 'not_started',
    priority: 1,
    project_id: 'leadflow',
    description: 'Add persistent header in dashboard showing "Your trial expires in X days" + prominent "Upgrade to Pro" button.',
    acceptance_criteria: 'Persistent banner at top of all dashboard pages (/dashboard, /settings, /integrations); Countdown updates hourly (not on every page load); Banner styled to stand out (green/amber based on days remaining); "Upgrade Now" button deep-links to Stripe checkout with Pro plan pre-selected; "Learn More" button links to /pricing page; Click tracking fires for both CTA buttons (GA4); Banner hidden for non-trial users (plan_tier ≠ trial); Works on mobile viewport (375px+)',
    revenue_impact: '20% of trial users see → 8% conversion = 0.24 additional paid agents (×$149 = $36/mo)',
    workflow: ['Design', 'Dev', 'QC']
  },
  {
    id: 'uc-pricing-page-conversion-refresh',
    name: 'Pricing Page: Testimonials + Feature Comparison + Urgency',
    phase: 'Phase 3',
    prd_id: 'prd-revenue-recovery-002',
    implementation_status: 'not_started',
    priority: 1,
    project_id: 'leadflow',
    description: 'Add pilot user testimonials, feature comparison table, remove API docs, add "why Pro is popular" narrative.',
    acceptance_criteria: 'API Endpoints developer table removed from /pricing page; Testimonials section added with real quotes from pilot agents (not stock); Feature comparison matrix present showing Starter | Pro | Team columns; Feature rows match PMF.md: SMS/mo, AI Qualification, Cal.com, Team Management; Pricing numbers correct and consistent with landing page ($49/$149/$399); Social proof section includes agent count and results stats; CTA buttons functional (not TODO placeholders); Mobile layout responsive (no horizontal scroll); Testimonial photos are real or use agent initials (no stock images); All prices and features match PMF.md exactly',
    revenue_impact: 'Converts 8% of pricing page visitors to trial (15% reach pricing, 8% convert) = 1 new trial/week → $150/mo in 4 weeks',
    workflow: ['Marketing', 'Design', 'Dev', 'QC']
  },
  {
    id: 'uc-first-paid-customer-proof',
    name: 'Critical: Get First Trial User to Paid (Proof of Concept)',
    phase: 'Phase 3',
    prd_id: 'prd-revenue-recovery-002',
    implementation_status: 'not_started',
    priority: 0,
    project_id: 'leadflow',
    description: 'Manually recruit 1 pilot user to upgrade. Email offer: "Your trial was great. Here\'s $50 off Pro." Confirm Stripe webhook fires.',
    acceptance_criteria: 'At least 1 trial agent converts to paid Pro plan (plan_tier updated); Stripe webhook checkout.session.completed fires successfully; real_estate_agents record updates: plan_tier, stripe_customer_id, stripe_subscription_id; Confirmation email sends via Resend; Billing portal loads at /settings/billing without errors; Subscription appears in Stripe dashboard; MRR increases by $149 minimum on metrics; No errors in Vercel logs during transaction',
    revenue_impact: '1 pilot × $149/mo = $149 MRR (proof of concept, foundation for scaling)',
    workflow: ['PM']
  }
];

async function insertUseCases() {
  console.log('🚀 Inserting Revenue Recovery Use Cases...\n');
  
  let inserted = 0;
  let errors = 0;
  
  for (const uc of useCases) {
    try {
      const { data, error } = await sb
        .from('use_cases')
        .insert([uc])
        .select();
      
      if (error) {
        console.log(`❌ ${uc.id}: ${error.message}`);
        errors++;
      } else {
        console.log(`✅ ${uc.id} inserted`);
        inserted++;
      }
    } catch (err) {
      console.log(`❌ ${uc.id}: ${err.message}`);
      errors++;
    }
  }
  
  console.log(`\n📊 Results: ${inserted} inserted, ${errors} errors`);
  process.exit(errors > 0 ? 1 : 0);
}

insertUseCases();
