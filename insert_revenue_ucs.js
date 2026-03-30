require('dotenv').config({ path: '.env' });

const { Client } = require('pg');
const url = process.env.LOCAL_PG_URL;

const client = new Client({ connectionString: url });

(async () => {
  try {
    await client.connect();
    
    const ucs = [
      {
        id: 'uc-trial-email-sequence-activate',
        name: 'Activate Pilot-to-Paid Email Sequence for Trial Users',
        phase: 'Phase 3',
        impl_status: 'in_progress',
        priority: 1,
        revenue_impact: 'Trial emails: 2-4 conversions × $150 avg = $300-600 MRR',
        description: 'Email sequence triggers when trial_ends_at approaches. Sends: day 10 reminder, day 13 urgency, day 14 final notice, day +1 expired notice.'
      },
      {
        id: 'uc-dashboard-trial-countdown',
        name: 'Dashboard: Trial Expiration Countdown & Upgrade CTA',
        phase: 'Phase 3',
        impl_status: 'not_started',
        priority: 1,
        revenue_impact: 'Dashboard CTAs: 3-5 conversions × $150 avg = $400-750 MRR',
        description: 'Add persistent header in dashboard showing "Your trial expires in X days" + prominent "Upgrade to Pro" button.'
      },
      {
        id: 'uc-pricing-page-conversion-refresh',
        name: 'Pricing Page: Testimonials + Feature Comparison + Urgency',
        phase: 'Phase 3',
        impl_status: 'not_started',
        priority: 1,
        revenue_impact: 'Conversion optimization: 2-3 conversions × $150 avg = $300-450 MRR',
        description: 'Add pilot user testimonials, feature comparison table, removed API docs, added "why Pro is popular" narrative.'
      },
      {
        id: 'uc-trial-user-cohort-analytics',
        name: 'Analytics: Trial User Cohort Tracking & Conversion Prediction',
        phase: 'Phase 3',
        impl_status: 'not_started',
        priority: 2,
        revenue_impact: 'Enables targeted sales outreach: +2-4 conversions from manual campaigns',
        description: 'Track trial user feature usage (FUB connected, SMS sent, sequences created). Identify high-intent users for sales calls.'
      },
      {
        id: 'uc-first-paid-customer-proof',
        name: 'Critical: Get First Trial User to Paid (Proof of Concept)',
        phase: 'Phase 3',
        impl_status: 'not_started',
        priority: 1,
        revenue_impact: 'First customer validates flow. Unblocks revenue team decisions. $150 MRR.',
        description: 'Manually recruit 1 pilot user to upgrade. Email offer: "Your trial was great. Here\'s $50 off Pro." Confirm Stripe webhook fires.'
      }
    ];
    
    console.log('Inserting revenue recovery use cases...\n');
    
    for (const uc of ucs) {
      const result = await client.query(
        `INSERT INTO use_cases 
         (id, name, phase, implementation_status, priority, revenue_impact, description, project_id) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO UPDATE SET 
         implementation_status = $4, priority = $5
         RETURNING id, name, priority;`,
        [uc.id, uc.name, uc.phase, uc.impl_status, uc.priority, uc.revenue_impact, uc.description, 'leadflow']
      );
      
      console.log(`✓ ${result.rows[0].id} (P${result.rows[0].priority})`);
    }
    
    // Link PRD to use cases
    const prdResult = await client.query(
      `INSERT INTO prds (id, title, description, status, file_path, project_id) 
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE SET status = $4, updated_at = now()
       RETURNING id;`,
      ['prd-revenue-recovery-002', 'Revenue Recovery — Close $9.6K MRR Gap', 
       'Trial→Paid conversion blocking all revenue. Activate email + CTAs + pricing refresh. Est. +$1.2K-2K MRR.',
       'active', 'docs/prd/PRD-REVENUE-RECOVERY-002.md', 'leadflow']
    );
    
    console.log(`\n✓ PRD created: ${prdResult.rows[0].id}`);
    
    // Link PRD to all use cases
    const ucIds = ucs.map(u => u.id);
    for (const id of ucIds) {
      await client.query(
        `UPDATE use_cases SET prd_id = $1 WHERE id = $2`,
        [prdResult.rows[0].id, id]
      );
    }
    
    console.log(`✓ PRD linked to ${ucIds.length} use cases\n`);
    
    await client.end();
    process.exit(0);
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
})();
