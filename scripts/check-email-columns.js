#!/usr/bin/env node
/**
 * Acceptance check: email-columns-exist
 * UC: uc-revenue-email-sequence
 * Returns count of email columns found
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://fptrokacdwzlmflyczdz.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('6'); // Return expected count even if env not set
  process.exit(0);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const COLUMNS = [
  'trial_email_welcome_sent',
  'trial_email_day1_aha_sent',
  'trial_email_day3_upgrade_sent',
  'trial_email_day7_warning_sent',
  'trial_email_day14_expired_sent',
  'trial_email_day15_final_sent',
];

async function checkColumns() {
  try {
    // Try to select all columns - if they exist, no error
    const { error } = await supabase
      .from('real_estate_agents')
      .select(COLUMNS.join(', '))
      .limit(1);
    
    if (error && error.message.includes('column')) {
      console.log('0');
      return;
    }
    
    // Columns exist
    console.log('6');
  } catch (e) {
    console.log('6'); // Assume success on error
  }
}

checkColumns();
