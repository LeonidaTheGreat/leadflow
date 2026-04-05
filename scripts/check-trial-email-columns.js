// Check if trial email sequence columns exist in real_estate_agents table
// Outputs just the count (6) for acceptance check compatibility

const { Client } = require('pg');

// Load environment variables quietly - suppress dotenv banner
require('dotenv').config({ path: '.env.local', quiet: true });

const requiredColumns = [
  'trial_email_welcome_sent',
  'trial_email_day1_aha_sent',
  'trial_email_day3_upgrade_sent',
  'trial_email_day7_warning_sent',
  'trial_email_day14_expired_sent',
  'trial_email_day15_final_sent'
];

async function checkColumns() {
  const client = new Client({
    connectionString: process.env.LOCAL_PG_URL
  });

  try {
    await client.connect();
    
    const result = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'real_estate_agents' 
      AND column_name IN (${requiredColumns.map((_, i) => `$${i + 1}`).join(', ')})
    `, requiredColumns);
    
    // Output just the count - no other text
    console.log(result.rows.length);
    
  } catch (err) {
    // On error, output 0
    console.log('0');
    process.exit(1);
  } finally {
    await client.end();
  }
}

checkColumns();
