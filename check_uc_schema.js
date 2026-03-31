require('dotenv').config({ path: '.env' });

const { Client } = require('pg');
const url = process.env.LOCAL_PG_URL;

const client = new Client({ connectionString: url });

(async () => {
  try {
    await client.connect();
    
    const cols = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'use_cases'
      ORDER BY ordinal_position;
    `);
    
    console.log('use_cases columns:\n');
    cols.rows.forEach(r => {
      console.log(`  ${r.column_name}: ${r.data_type}`);
    });
    
    await client.end();
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
})();
