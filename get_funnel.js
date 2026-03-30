require('dotenv').config({ path: '.env' });

const { Client } = require('pg');
const url = process.env.LOCAL_PG_URL;

const client = new Client({ connectionString: url });

(async () => {
  try {
    await client.connect();
    
    console.log('\n=== CONVERSION FUNNEL METRICS ===\n');
    
    const queries = [
      { label: 'Total Signups', q: 'SELECT COUNT(*) as count FROM real_estate_agents;' },
      { label: 'Trial Users', q: 'SELECT COUNT(*) as count FROM real_estate_agents WHERE plan_tier = \'trial\';' },
      { label: 'Paid Customers', q: 'SELECT COUNT(*) as count FROM real_estate_agents WHERE stripe_customer_id IS NOT NULL AND stripe_customer_id != \'\';' },
      { label: 'Onboarded (page views)', q: 'SELECT COUNT(DISTINCT agent_id) as count FROM agent_page_views;' },
      { label: 'Sent Outbound SMS', q: 'SELECT COUNT(DISTINCT lead_id) as count FROM messages WHERE direction = \'outbound\';' },
      { label: 'Current MRR', q: 'SELECT COALESCE(SUM(mrr), 0) as count FROM real_estate_agents WHERE mrr > 0;' }
    ];
    
    for (const item of queries) {
      const res = await client.query(item.q);
      const val = res.rows[0].count;
      console.log(`${item.label}: ${val}`);
    }
    
    // Get sample of agent state
    console.log('\n=== AGENT STATE SAMPLE (first 5) ===\n');
    const sample = await client.query('SELECT email, plan_tier, stripe_customer_id, mrr, created_at FROM real_estate_agents LIMIT 5;');
    sample.rows.forEach(r => {
      console.log(`${r.email}: tier=${r.plan_tier}, customer_id=${r.stripe_customer_id || 'NONE'}, mrr=${r.mrr}, created=${r.created_at.toISOString().split('T')[0]}`);
    });
    
    await client.end();
  } catch (e) {
    console.error('DB Error:', e.message);
    process.exit(1);
  }
})();
