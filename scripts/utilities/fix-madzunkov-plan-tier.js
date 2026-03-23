#!/usr/bin/env node
/**
 * Fix: madzunkov@hotmail.com has plan_tier=null
 * 
 * Issue: Account was previously locked out and showed plan_tier=null + trial_ends_at=null
 * Solution: Set plan_tier='trial' and trial_ends_at to 30 days from account creation
 * 
 * This script verifies and repairs the account as needed.
 */

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config();

const EMAIL = 'madzunkov@hotmail.com';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  console.log(`\n🔍 Checking account: ${EMAIL}\n`);

  // Step 1: Fetch current account state
  const { data: accounts, error: fetchError } = await supabase
    .from('real_estate_agents')
    .select('*')
    .eq('email', EMAIL);

  if (fetchError) {
    console.error('❌ Database error:', fetchError);
    process.exit(1);
  }

  if (accounts.length === 0) {
    console.error(`❌ Account not found: ${EMAIL}`);
    process.exit(1);
  }

  const account = accounts[0];
  console.log('Current account state:');
  console.log(`  ID: ${account.id}`);
  console.log(`  Email: ${account.email}`);
  console.log(`  Plan Tier: ${account.plan_tier || 'NULL ⚠️'}`);
  console.log(`  Trial Ends At: ${account.trial_ends_at || 'NULL ⚠️'}`);
  console.log(`  Status: ${account.status}`);
  console.log(`  Subscription Status: ${account.subscription_status}`);

  // Step 2: Verify fix is applied
  if (account.plan_tier !== null && account.trial_ends_at !== null) {
    const trialDate = new Date(account.trial_ends_at);
    const now = new Date();

    if (trialDate > now) {
      console.log('\n✅ Account is fixed and valid!');
      console.log(`   - plan_tier is set to: ${account.plan_tier}`);
      console.log(`   - trial_ends_at is in the future: ${account.trial_ends_at}`);
      return;
    }
  }

  // Step 3: Apply fix if needed
  console.log('\n⚠️  Account needs fixing. Applying fix...\n');

  const createdAt = new Date(account.created_at);
  const trialEndsAt = new Date(createdAt.getTime() + 30 * 24 * 60 * 60 * 1000);

  const { error: updateError } = await supabase
    .from('real_estate_agents')
    .update({
      plan_tier: 'trial',
      trial_ends_at: trialEndsAt.toISOString(),
      subscription_status: 'inactive'
    })
    .eq('id', account.id);

  if (updateError) {
    console.error('❌ Failed to update account:', updateError);
    process.exit(1);
  }

  console.log('✅ Account fixed successfully!');
  console.log(`   - plan_tier set to: trial`);
  console.log(`   - trial_ends_at set to: ${trialEndsAt.toISOString()}`);
  console.log(`   - subscription_status set to: inactive`);

  // Step 4: Verify the fix
  const { data: updated, error: verifyError } = await supabase
    .from('real_estate_agents')
    .select('plan_tier, trial_ends_at')
    .eq('id', account.id);

  if (verifyError || !updated || updated.length === 0) {
    console.error('❌ Failed to verify fix');
    process.exit(1);
  }

  const fixed = updated[0];
  if (fixed.plan_tier === 'trial' && fixed.trial_ends_at !== null) {
    console.log('\n✅ Fix verified in database\n');
  } else {
    console.error('❌ Fix verification failed');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
