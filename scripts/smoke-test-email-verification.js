const { createClient } = require('../lib/db');
require('dotenv').config();

const apiUrl = process.env.NEXT_PUBLIC_API_URL;
const apiKey = process.env.API_SECRET_KEY;

const db = createClient(apiUrl, apiKey);

async function runSmokeTest() {
  console.log('=== Email Verification Smoke Test ===\n');

  let testsPassed = 0;
  let testsTotal = 0;

  // Test 1: Table exists
  testsTotal++;
  console.log('Test 1: email_verification_tokens table exists');
  const { data: tableData, error: tableError } = await db
    .from('email_verification_tokens')
    .select('*', { count: 'exact', head: true });
  
  if (tableError) {
    console.log('   ❌ FAIL:', tableError.message);
  } else {
    console.log('   ✅ PASS: Table exists and is queryable');
    testsPassed++;
  }

  // Test 2: Can insert a token
  testsTotal++;
  console.log('\nTest 2: Can insert a verification token');
  
  // First get a valid agent_id
  const { data: agent } = await db
    .from('real_estate_agents')
    .select('id')
    .eq('email', 'madzunkov@hotmail.com')
    .single();

  if (!agent) {
    console.log('   ❌ FAIL: Could not find test agent');
  } else {
    const testToken = {
      agent_id: agent.id,
      token: 'test-token-' + Date.now(),
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    };

    const { data: insertData, error: insertError } = await db
      .from('email_verification_tokens')
      .insert(testToken)
      .select()
      .single();

    if (insertError) {
      console.log('   ❌ FAIL:', insertError.message);
    } else {
      console.log('   ✅ PASS: Token inserted successfully');
      console.log('   Token ID:', insertData.id);
      testsPassed++;

      // Clean up test token
      await db
        .from('email_verification_tokens')
        .delete()
        .eq('id', insertData.id);
    }
  }

  // Test 3: madzunkov@hotmail.com is verified
  testsTotal++;
  console.log('\nTest 3: madzunkov@hotmail.com is verified');
  const { data: userData, error: userError } = await db
    .from('real_estate_agents')
    .select('email_verified')
    .eq('email', 'madzunkov@hotmail.com')
    .single();

  if (userError) {
    console.log('   ❌ FAIL:', userError.message);
  } else if (!userData.email_verified) {
    console.log('   ❌ FAIL: User is not verified');
  } else {
    console.log('   ✅ PASS: User is verified');
    testsPassed++;
  }

  // Test 4: Token has unique constraint
  testsTotal++;
  console.log('\nTest 4: Token uniqueness constraint');
  const duplicateToken = 'duplicate-test-token';
  const { data: agent2 } = await db
    .from('real_estate_agents')
    .select('id')
    .eq('email', 'madzunkov@hotmail.com')
    .single();

  if (agent2) {
    // Insert first token
    const { data: firstInsert } = await db
      .from('email_verification_tokens')
      .insert({
        agent_id: agent2.id,
        token: duplicateToken,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      })
      .select()
      .single();

    // Try to insert duplicate
    const { error: dupError } = await db
      .from('email_verification_tokens')
      .insert({
        agent_id: agent2.id,
        token: duplicateToken,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      });

    // Clean up
    if (firstInsert) {
      await db.from('email_verification_tokens').delete().eq('id', firstInsert.id);
    }

    if (dupError && dupError.code === '23505') {
      console.log('   ✅ PASS: Unique constraint enforced (duplicate rejected)');
      testsPassed++;
    } else if (dupError) {
      console.log('   ✅ PASS: Duplicate rejected with error:', dupError.message);
      testsPassed++;
    } else {
      console.log('   ❌ FAIL: Duplicate was allowed (constraint missing?)');
    }
  }

  // Summary
  console.log('\n=== Test Summary ===');
  console.log(`Tests Passed: ${testsPassed}/${testsTotal}`);
  console.log(`Pass Rate: ${(testsPassed/testsTotal*100).toFixed(0)}%`);

  if (testsPassed === testsTotal) {
    console.log('\n✅ All tests passed!');
    process.exit(0);
  } else {
    console.log('\n❌ Some tests failed');
    process.exit(1);
  }
}

runSmokeTest().catch(err => {
  console.error('Smoke test failed:', err);
  process.exit(1);
});
