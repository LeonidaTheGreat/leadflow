const { createClient } = require('../lib/db');
require('dotenv').config();

const apiUrl = process.env.NEXT_PUBLIC_API_URL;
const apiKey = process.env.API_SECRET_KEY;

const db = createClient(apiUrl, apiKey);

async function verifyAndFix() {
  console.log('=== Email Verification Migration Verification ===\n');

  // 1. Check if table exists
  console.log('1. Checking email_verification_tokens table...');
  const { data: tableCheck, error: tableError } = await db
    .from('email_verification_tokens')
    .select('*', { count: 'exact', head: true });

  if (tableError) {
    console.error('   ❌ Table does NOT exist:', tableError.message);
    process.exit(1);
  }
  console.log('   ✅ Table email_verification_tokens EXISTS');

  // 2. Check indexes
  console.log('\n2. Checking indexes...');
  const { data: indexes, error: indexError } = await db
    .rpc('get_indexes_for_table', { table_name: 'email_verification_tokens' });
  
  if (indexError) {
    console.log('   ⚠️  Could not query indexes via RPC (this is OK if table exists)');
  } else {
    console.log('   Indexes found:', indexes);
  }

  // 3. Check madzunkov@hotmail.com status
  console.log('\n3. Checking madzunkov@hotmail.com status...');
  const { data: userData, error: userError } = await db
    .from('real_estate_agents')
    .select('id, email, email_verified, created_at')
    .eq('email', 'madzunkov@hotmail.com')
    .single();

  if (userError) {
    console.log('   ⚠️  User not found or error:', userError.message);
  } else {
    console.log('   User found:', userData);
    if (!userData.email_verified) {
      console.log('   User is NOT verified - will fix...');
      const { error: updateError } = await db
        .from('real_estate_agents')
        .update({ email_verified: true })
        .eq('id', userData.id);
      
      if (updateError) {
        console.error('   ❌ Failed to update user:', updateError.message);
      } else {
        console.log('   ✅ User email_verified set to TRUE');
      }
    } else {
      console.log('   ✅ User is already verified');
    }
  }

  // 4. Backfill pre-feature accounts
  console.log('\n4. Backfilling pre-feature accounts (created before 2026-03-09)...');
  const { data: backfillData, error: backfillError } = await db
    .from('real_estate_agents')
    .select('id, email, email_verified, created_at')
    .eq('email_verified', false)
    .lt('created_at', '2026-03-09T00:00:00Z');

  if (backfillError) {
    console.error('   ❌ Backfill query failed:', backfillError.message);
  } else {
    console.log(`   Found ${backfillData?.length || 0} accounts to backfill`);
    if (backfillData && backfillData.length > 0) {
      for (const account of backfillData) {
        console.log(`   - ${account.email} (created: ${account.created_at})`);
        const { error: updateErr } = await db
          .from('real_estate_agents')
          .update({ email_verified: true })
          .eq('id', account.id);
        
        if (updateErr) {
          console.error(`   ❌ Failed to update ${account.email}:`, updateErr.message);
        } else {
          console.log(`   ✅ Updated ${account.email}`);
        }
      }
    }
  }

  // 5. Final verification
  console.log('\n5. Final verification...');
  const { data: finalCheck, error: finalError } = await db
    .from('real_estate_agents')
    .select('email, email_verified')
    .eq('email', 'madzunkov@hotmail.com')
    .single();

  if (finalError) {
    console.log('   ⚠️  Could not verify final state:', finalError.message);
  } else {
    console.log('   Final state:', finalCheck);
    if (finalCheck.email_verified) {
      console.log('   ✅ madzunkov@hotmail.com is verified and unblocked!');
    }
  }

  console.log('\n=== Migration Complete ===');
}

verifyAndFix().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
