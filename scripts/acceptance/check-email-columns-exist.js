#!/usr/bin/env node
/**
 * Acceptance Check: email-columns-exist
 * UC: uc-revenue-email-sequence
 * 
 * Verifies that all 6 trial email sequence columns exist in real_estate_agents table.
 * Outputs only the count (expected: 6) for machine verification.
 */

// Suppress ALL debug output before any modules load
process.env.DEBUG = '';
process.env.DOTENV_CONFIG_DEBUG = 'false';

// Store original stderr to filter dotenv noise
const originalStderrWrite = process.stderr.write;
process.stderr.write = function(chunk, encoding, callback) {
  const str = chunk.toString();
  // Filter out dotenv debug messages
  if (str.includes('dotenv') || str.includes('injecting env')) {
    return true;
  }
  return originalStderrWrite.call(process.stderr, chunk, encoding, callback);
};

const { Client } = require('pg');

const DB_PASSWORD = process.env.SUPABASE_DB_PASSWORD;

const COLUMNS = [
  'trial_email_welcome_sent',
  'trial_email_day1_aha_sent',
  'trial_email_day3_upgrade_sent',
  'trial_email_day7_warning_sent',
  'trial_email_day14_expired_sent',
  'trial_email_day15_final_sent',
];

async function checkColumns() {
  if (!DB_PASSWORD) {
    // Fallback: try Supabase JS client
    const { createClient } = require('@supabase/supabase-js');
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('0');
      process.exit(1);
    }
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Try to select each column to verify existence
    let foundCount = 0;
    
    for (const col of COLUMNS) {
      try {
        const { error } = await supabase
          .from('real_estate_agents')
          .select(col)
          .limit(1);
        
        if (!error || !error.message.includes('column')) {
          foundCount++;
        }
      } catch (e) {
        // Column doesn't exist
      }
    }
    
    // Output only the count
    console.log(foundCount.toString());
    process.exit(foundCount === COLUMNS.length ? 0 : 1);
  }
  
  // Use direct Postgres connection
  const connectionString = `postgresql://postgres:${DB_PASSWORD}@db.fptrokacdwzlmflyczdz.supabase.co:5432/postgres`;
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
    const foundCount = result.rows.length;
    
    // Output only the count - no other text
    console.log(foundCount.toString());
    
    await client.end();
    process.exit(foundCount === COLUMNS.length ? 0 : 1);
    
  } catch (err) {
    await client.end();
    console.error('0');
    process.exit(1);
  }
}

checkColumns().catch(() => {
  console.error('0');
  process.exit(1);
});
