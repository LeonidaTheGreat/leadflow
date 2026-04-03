require('dotenv').config({ path: '.env' });

const { Client } = require('pg');
const url = process.env.LOCAL_PG_URL;

const client = new Client({ connectionString: url });

(async () => {
  try {
    await client.connect();
    
    // Get existing statuses
    const rows = await client.query(
      `SELECT DISTINCT status FROM prds LIMIT 5;`
    );
    
    console.log('Existing PRD statuses:');
    rows.rows.forEach(r => console.log(`  - ${r.status}`));
    
    // Try to insert with 'proposed'
    const result = await client.query(
      `INSERT INTO prds (id, title, description, status, file_path, project_id) 
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status
       RETURNING id, status;`,
      ['prd-revenue-recovery-002', 'Revenue Recovery — Close $9.6K MRR Gap', 
       'Trial→Paid conversion blocking all revenue.', 'proposed', 'docs/prd/PRD-REVENUE-RECOVERY-002.md', 'leadflow']
    );
    
    console.log(`\n✓ PRD created: ${result.rows[0].id} (${result.rows[0].status})`);
    
    // Link use cases
    const ucIds = ['uc-trial-email-sequence-activate', 'uc-dashboard-trial-countdown', 
                   'uc-pricing-page-conversion-refresh', 'uc-trial-user-cohort-analytics', 
                   'uc-first-paid-customer-proof'];
    
    for (const id of ucIds) {
      await client.query(
        `UPDATE use_cases SET prd_id = $1 WHERE id = $2`,
        [result.rows[0].id, id]
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
