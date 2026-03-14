const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const assert = require('assert');

dotenv.config();

// Test: Verify madzunkov@hotmail.com account has proper plan_tier and trial_ends_at
describe('Account Status: madzunkov@hotmail.com', () => {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  it('should have plan_tier set to "trial" (not null)', async () => {
    const { data, error } = await supabase
      .from('real_estate_agents')
      .select('plan_tier')
      .eq('email', 'madzunkov@hotmail.com');

    assert(!error, `Database error: ${error?.message}`);
    assert(data.length > 0, 'Account not found');
    assert.strictEqual(
      data[0].plan_tier,
      'trial',
      'plan_tier should be "trial", not null'
    );
  });

  it('should have trial_ends_at set to a valid future date (not null)', async () => {
    const { data, error } = await supabase
      .from('real_estate_agents')
      .select('trial_ends_at')
      .eq('email', 'madzunkov@hotmail.com');

    assert(!error, `Database error: ${error?.message}`);
    assert(data.length > 0, 'Account not found');
    assert.notStrictEqual(
      data[0].trial_ends_at,
      null,
      'trial_ends_at should not be null'
    );

    const trialDate = new Date(data[0].trial_ends_at);
    const now = new Date();
    assert(
      trialDate > now,
      `trial_ends_at (${data[0].trial_ends_at}) should be in the future`
    );
  });

  it('should have status that allows access to the platform', async () => {
    const { data, error } = await supabase
      .from('real_estate_agents')
      .select('status, subscription_status')
      .eq('email', 'madzunkov@hotmail.com');

    assert(!error, `Database error: ${error?.message}`);
    assert(data.length > 0, 'Account not found');
    
    // Status should be onboarding or active, not blocked/locked
    const validStatuses = ['onboarding', 'active'];
    assert(
      validStatuses.includes(data[0].status),
      `status should be one of ${validStatuses.join(', ')}, got "${data[0].status}"`
    );
  });

  it('should not have null values for critical fields', async () => {
    const { data, error } = await supabase
      .from('real_estate_agents')
      .select('plan_tier, trial_ends_at, subscription_status')
      .eq('email', 'madzunkov@hotmail.com');

    assert(!error, `Database error: ${error?.message}`);
    assert(data.length > 0, 'Account not found');
    
    const agent = data[0];
    assert.notStrictEqual(agent.plan_tier, null, 'plan_tier should not be null');
    assert.notStrictEqual(agent.trial_ends_at, null, 'trial_ends_at should not be null');
  });
});

// Regression test: Ensure no other critical accounts have null plan_tier
describe('Account Status: Regression Check', () => {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  it('should not have non-test accounts with null plan_tier', async () => {
    const { data, error } = await supabase
      .from('real_estate_agents')
      .select('email, plan_tier, created_at')
      .is('plan_tier', null);

    assert(!error, `Database error: ${error?.message}`);
    
    // Filter out test accounts
    const productionAccounts = data.filter(
      account => !account.email.includes('test') && 
                  !account.email.includes('example.com') &&
                  !account.email.includes('leadflow-test')
    );

    if (productionAccounts.length > 0) {
      console.warn('⚠️  Production accounts with null plan_tier:');
      productionAccounts.forEach(account => {
        console.warn(`  - ${account.email} (created: ${account.created_at})`);
      });
    }

    assert.strictEqual(
      productionAccounts.length,
      0,
      'No production accounts should have null plan_tier'
    );
  });
});
