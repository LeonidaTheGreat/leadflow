require('dotenv').config({ path: '.env' });

const { Client } = require('pg');
const url = process.env.LOCAL_PG_URL;

const client = new Client({ connectionString: url });

(async () => {
  try {
    await client.connect();
    
    // First check if it exists
    const exists = await client.query(
      `SELECT id FROM prds WHERE id = $1;`,
      ['prd-revenue-recovery-002']
    );
    
    if (exists.rows.length === 0) {
      // Insert new PRD
      const result = await client.query(
        `INSERT INTO prds (id, title, description, status, file_path, project_id) 
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, status;`,
        ['prd-revenue-recovery-002', 'Revenue Recovery — Close $9.6K MRR Gap', 
         'Trial→Paid conversion is completely blocked (0 of 164 trial users converting to paid).',
         'draft', 'docs/prd/PRD-REVENUE-RECOVERY-002.md', 'leadflow']
      );
      console.log(`✓ PRD created: ${result.rows[0].id}`);
    } else {
      console.log(`✓ PRD already exists: prd-revenue-recovery-002`);
    }
    
    // Link use cases
    const ucIds = ['uc-trial-email-sequence-activate', 'uc-dashboard-trial-countdown', 
                   'uc-pricing-page-conversion-refresh', 'uc-trial-user-cohort-analytics', 
                   'uc-first-paid-customer-proof'];
    
    for (const id of ucIds) {
      await client.query(
        `UPDATE use_cases SET prd_id = $1 WHERE id = $2`,
        ['prd-revenue-recovery-002', id]
      );
    }
    
    console.log(`✓ PRD linked to ${ucIds.length} use cases\n`);
    
    // Verify
    const verify = await client.query(
      `SELECT id, name, prd_id, priority
       FROM use_cases 
       WHERE prd_id = $1
       ORDER BY priority ASC;`,
      ['prd-revenue-recovery-002']
    );
    
    console.log('Linked Use Cases:\n');
    verify.rows.forEach(r => {
      console.log(`  ${r.id} (P${r.priority})`);
    });
    
    await client.end();
    process.exit(0);
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
})();
