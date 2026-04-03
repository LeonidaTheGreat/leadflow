require('dotenv').config({ path: '.env' });

const { Client } = require('pg');
const url = process.env.LOCAL_PG_URL;

const client = new Client({ connectionString: url });

(async () => {
  try {
    await client.connect();
    
    // Try with draft
    const prdResult = await client.query(
      `INSERT INTO prds (id, title, description, status, file_path, project_id) 
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, updated_at = now()
       RETURNING id, status;`,
      ['prd-revenue-recovery-002', 'Revenue Recovery — Close $9.6K MRR Gap', 
       'draft', 'docs/prd/PRD-REVENUE-RECOVERY-002.md', 'leadflow', 'leadflow']
    );
    
    console.log(`✓ PRD created: ${prdResult.rows[0].id} (${prdResult.rows[0].status})`);
    
    // Link to use cases
    const ucIds = ['uc-trial-email-sequence-activate', 'uc-dashboard-trial-countdown', 
                   'uc-pricing-page-conversion-refresh', 'uc-trial-user-cohort-analytics', 
                   'uc-first-paid-customer-proof'];
    
    for (const id of ucIds) {
      await client.query(
        `UPDATE use_cases SET prd_id = $1 WHERE id = $2`,
        [prdResult.rows[0].id, id]
      );
    }
    
    console.log(`✓ PRD linked to ${ucIds.length} use cases`);
    
    await client.end();
    process.exit(0);
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
})();
