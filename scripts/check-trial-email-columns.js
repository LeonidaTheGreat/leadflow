#!/usr/bin/env node
/**
 * Check trial email columns count
 * UC: uc-revenue-email-sequence
 * Outputs just the count of columns for Genome acceptance check
 */

// Load env vars quietly (no banner) - this prevents dotenv CLI from injecting its banner
require('dotenv').config({ path: '.env.local', quiet: true });

const { Client } = require('pg');

const DB_PASSWORD = process.env.SUPABASE_DB_PASSWORD;

if (!DB_PASSWORD) {
  console.error('SUPABASE_DB_PASSWORD not set');
  process.exit(1);
}

// Construct connection string
const connectionString = `postgresql://postgres:${DB_PASSWORD}@db.fptrokacdwzlmflyczdz.supabase.co:5432/postgres`;

const COLUMNS = [
  'trial_email_welcome_sent',
  'trial_email_day1_aha_sent',
  'trial_email_day3_upgrade_sent',
  'trial_email_day7_warning_sent',
  'trial_email_day14_expired_sent',
  'trial_email_day15_final_sent',
];

async function checkColumns() {
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    
    const verifySql = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'real_estate_agents' 
      AND column_name IN (${COLUMNS.map(c => `'${c}'`).join(', ')})
    `;
    
    const result = await client.query(verifySql);
    
    // Output just the count - no other logging
    console.log(result.rows.length);
    
    return result.rows.length === COLUMNS.length;
  } catch (err) {
    console.error('Error:', err.message);
    return false;
  } finally {
    await client.end();
  }
}

checkColumns().then(success => {
  process.exit(success ? 0 : 1);
}).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
