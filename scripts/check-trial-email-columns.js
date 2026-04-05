#!/usr/bin/env node

/**
 * Check if all 6 trial email sequence columns exist in real_estate_agents table
 * Outputs only the count (e.g., "6") for acceptance check compatibility
 */

require('dotenv').config({ path: require('path').join(process.env.HOME, '.env'), quiet: true });

const { Client } = require('pg');

async function checkColumns() {
  const supabaseUrl = process.env.SUPABASE_URL || '';
  const host = `db.${supabaseUrl.replace('https://', '')}`;
  
  const client = new Client({
    host: host,
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: process.env.SUPABASE_DB_PASSWORD,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();

    const result = await client.query(`
      SELECT COUNT(*) as count
      FROM information_schema.columns
      WHERE table_name = 'real_estate_agents'
      AND column_name IN (
        'trial_email_welcome_sent',
        'trial_email_day1_aha_sent',
        'trial_email_day3_upgrade_sent',
        'trial_email_day7_warning_sent',
        'trial_email_day14_expired_sent',
        'trial_email_day15_final_sent'
      )
    `);

    // Output only the count, nothing else
    console.log(result.rows[0].count);
  } catch (error) {
    // On error, output 0
    console.log('0');
    process.exit(1);
  } finally {
    await client.end();
  }
}

checkColumns();
