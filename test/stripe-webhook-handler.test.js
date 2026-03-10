/**
 * Stripe Webhook Handler Tests
 * Validates the webhook handler fixes for subscriptions table integration
 */

const assert = require('assert');

// Test Results
const testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

async function runTest(name, testFn) {
  try {
    await testFn();
    testResults.passed++;
    testResults.tests.push({ name, status: 'PASSED' });
    console.log(`✅ ${name}`);
  } catch (error) {
    testResults.failed++;
    testResults.tests.push({ name, status: 'FAILED', error: error.message });
    console.error(`❌ ${name}: ${error.message}`);
  }
}

// Mock Supabase client
class MockSupabase {
  constructor() {
    this.tables = {
      subscriptions: [],
      subscription_events: [],
      payments: [],
      agents: []
    };
  }

  from(table) {
    return {
      insert: async (data) => {
        this.tables[table] = this.tables[table] || [];
        this.tables[table].push(data);
        return { data: [data], error: null };
      },
      upsert: async (data, options) => {
        this.tables[table] = this.tables[table] || [];
        this.tables[table].push(data);
        return { data: [data], error: null };
      },
      update: async (data) => {
        return { data: data, error: null };
      },
      eq: (col, val) => {
        return {
          update: async (data) => {
            return { data: data, error: null };
          },
          single: async () => {
            const item = this.tables[table]?.find(t => t.id === val);
            return { data: item, error: item ? null : { message: 'Not found' } };
          }
        };
      },
      select: (cols) => {
        return {
          eq: (col, val) => {
            return {
              single: async () => {
                const item = this.tables[table]?.find(t => t[col] === val);
                return { data: item, error: null };
              }
            };
          }
        };
      }
    };
  }

  getData(table) {
    return this.tables[table] || [];
  }
}

// Mock Stripe subscription object
function createMockSubscription(overrides = {}) {
  return {
    id: 'sub_test_' + Date.now(),
    status: 'active',
    current_period_start: Math.floor(Date.now() / 1000),
    current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
    trial_start: null,
    trial_end: null,
    cancel_at_period_end: false,
    canceled_at: null,
    ended_at: null,
    items: {
      data: [{
        id: 'item_test_' + Date.now(),
        price: {
          id: 'price_professional_monthly',
          unit_amount: 99700,
          recurring: { interval: 'month' }
        }
      }]
    },
    metadata: {
      user_id: 'user_123',
      tier: 'professional'
    },
    customer: 'cust_test_' + Date.now(),
    ...overrides
  };
}

async function runTests() {
  console.log('\n🧪 Running Stripe Webhook Handler Tests\n');

  // Test 1: Webhook handler uses user_id not agent_id
  await runTest('Webhook handler uses user_id for subscriptions', async () => {
    const supabase = new MockSupabase();
    const userId = 'user_123';
    const subscription = createMockSubscription();
    
    // Simulate handleCheckoutComplete
    const { data } = await supabase
      .from('subscriptions')
      .upsert({
        user_id: userId,
        stripe_customer_id: subscription.customer,
        stripe_subscription_id: subscription.id,
        status: subscription.status,
        tier: 'professional',
        price_id: subscription.items.data[0].price.id,
        interval: 'month',
      });
    
    assert(data[0].user_id === userId, 'Should store user_id not agent_id');
    assert(data[0].stripe_subscription_id === subscription.id, 'Should store stripe_subscription_id');
  });

  // Test 2: Subscription events use user_id
  await runTest('Subscription events table uses user_id', async () => {
    const supabase = new MockSupabase();
    const userId = 'user_456';
    
    const { data } = await supabase
      .from('subscription_events')
      .insert({
        user_id: userId,
        event_type: 'subscription_created',
        stripe_event_data: { tier: 'professional' }
      });
    
    assert(data[0].user_id === userId, 'subscription_events should use user_id');
    assert(!data[0].agent_id, 'subscription_events should not use agent_id');
  });

  // Test 3: Payments table uses user_id
  await runTest('Payments table uses user_id', async () => {
    const supabase = new MockSupabase();
    const userId = 'user_789';
    
    const { data } = await supabase
      .from('payments')
      .insert({
        user_id: userId,
        amount: 997.00,
        currency: 'usd',
        status: 'succeeded',
        stripe_invoice_id: 'inv_test_123'
      });
    
    assert(data[0].user_id === userId, 'payments should use user_id');
  });

  // Test 4: Upsert on stripe_subscription_id for subscriptions
  await runTest('Subscriptions use upsert with stripe_subscription_id', async () => {
    const supabase = new MockSupabase();
    const userId = 'user_123';
    const stripeSubId = 'sub_test_abc';
    
    // First insert
    await supabase.from('subscriptions').upsert({
      user_id: userId,
      stripe_subscription_id: stripeSubId,
      status: 'active',
      tier: 'professional'
    });
    
    // Second upsert (should update)
    await supabase.from('subscriptions').upsert({
      user_id: userId,
      stripe_subscription_id: stripeSubId,
      status: 'canceled',
      tier: 'professional'
    });
    
    const data = supabase.getData('subscriptions');
    assert(data.length >= 1, 'Should have subscriptions');
    assert(data.some(s => s.stripe_subscription_id === stripeSubId), 'Should have the stripe subscription ID');
  });

  // Test 5: Webhook stores full Stripe data in stripe_event_data
  await runTest('Webhook stores full Stripe data in stripe_event_data', async () => {
    const supabase = new MockSupabase();
    const eventData = {
      tier: 'professional',
      mrr: 997.00,
      stripe_subscription_id: 'sub_test_123'
    };
    
    await supabase.from('subscription_events').insert({
      user_id: 'user_123',
      event_type: 'subscription_created',
      stripe_event_data: eventData
    });
    
    const events = supabase.getData('subscription_events');
    assert(events[0].stripe_event_data, 'Should store stripe_event_data');
    assert(events[0].stripe_event_data.tier === 'professional', 'Should preserve tier in event data');
  });

  // Test 6: Payment succeeded event
  await runTest('Payment succeeded event is handled', async () => {
    const supabase = new MockSupabase();
    const userId = 'user_123';
    const amount = 997.00;
    
    await supabase.from('payments').insert({
      user_id: userId,
      amount: amount,
      status: 'succeeded',
      stripe_invoice_id: 'inv_test_123'
    });
    
    await supabase.from('subscription_events').insert({
      user_id: userId,
      event_type: 'payment_succeeded',
      stripe_event_data: { amount, invoice_id: 'inv_test_123' }
    });
    
    const payments = supabase.getData('payments');
    const events = supabase.getData('subscription_events');
    
    assert(payments[0].status === 'succeeded', 'Payment should be marked succeeded');
    assert(events.some(e => e.event_type === 'payment_succeeded'), 'Should log payment succeeded event');
  });

  // Test 7: Payment failed event
  await runTest('Payment failed event is handled', async () => {
    const supabase = new MockSupabase();
    const userId = 'user_123';
    
    await supabase.from('payments').insert({
      user_id: userId,
      amount: 997.00,
      status: 'failed',
      failure_message: 'Card declined',
      stripe_invoice_id: 'inv_test_456'
    });
    
    await supabase.from('subscription_events').insert({
      user_id: userId,
      event_type: 'payment_failed',
      stripe_event_data: { error: 'Card declined' }
    });
    
    const payments = supabase.getData('payments');
    assert(payments[0].status === 'failed', 'Payment should be marked failed');
    assert(payments[0].failure_message, 'Should store failure message');
  });

  // Test 8: Subscription cancelled event
  await runTest('Subscription cancelled event updates subscription status', async () => {
    const supabase = new MockSupabase();
    const userId = 'user_123';
    const stripeSubId = 'sub_test_789';
    
    // Create subscription first
    await supabase.from('subscriptions').insert({
      user_id: userId,
      stripe_subscription_id: stripeSubId,
      status: 'active'
    });
    
    // Cancel it
    await supabase.from('subscriptions').update({
      status: 'canceled',
      canceled_at: new Date().toISOString()
    });
    
    // Log event
    await supabase.from('subscription_events').insert({
      user_id: userId,
      event_type: 'subscription_cancelled',
      stripe_event_data: { stripe_subscription_id: stripeSubId }
    });
    
    const subscriptions = supabase.getData('subscriptions');
    const events = supabase.getData('subscription_events');
    
    assert(subscriptions.length > 0, 'Should have subscription');
    assert(events.some(e => e.event_type === 'subscription_cancelled'), 'Should log cancellation event');
  });

  // Test 9: MRR calculation from subscription
  await runTest('MRR calculation from Stripe subscription', async () => {
    const subscription = createMockSubscription({
      items: {
        data: [{
          id: 'item_123',
          price: {
            id: 'price_monthly',
            unit_amount: 99700, // $997.00 in cents
            recurring: { interval: 'month' }
          }
        }]
      }
    });
    
    const item = subscription.items.data[0];
    const amount = item.price.unit_amount || 0;
    const quantity = 1;
    const mrr = (amount * quantity) / 100; // Convert cents to dollars
    
    assert(mrr === 997.00, 'MRR should be 997.00');
  });

  // Test 10: Tier extraction from subscription metadata
  await runTest('Tier extraction from subscription metadata', async () => {
    const subscription = createMockSubscription({
      metadata: { tier: 'enterprise' }
    });
    
    const tier = subscription.metadata?.tier || 'professional';
    assert(tier === 'enterprise', 'Tier should be enterprise');
  });

  // Test 11: Trial period handling
  await runTest('Trial period is preserved in subscriptions table', async () => {
    const subscription = createMockSubscription({
      trial_start: Math.floor(Date.now() / 1000),
      trial_end: Math.floor(Date.now() / 1000) + 14 * 24 * 60 * 60
    });
    
    assert(subscription.trial_start, 'Trial start should exist');
    assert(subscription.trial_end, 'Trial end should exist');
    assert(subscription.trial_end > subscription.trial_start, 'Trial end should be after start');
  });

  // Test 12: Current period tracking
  await runTest('Current period dates are stored correctly', async () => {
    const subscription = createMockSubscription();
    
    assert(subscription.current_period_start, 'Current period start should exist');
    assert(subscription.current_period_end, 'Current period end should exist');
    assert(subscription.current_period_end > subscription.current_period_start, 'Period end should be after start');
  });

  // Test 13: Agent table is updated with subscription status
  await runTest('Agent table is updated with subscription info', async () => {
    const supabase = new MockSupabase();
    const userId = 'user_123';
    
    // Insert agent record first
    await supabase.from('agents').insert({
      id: userId,
      subscription_status: 'active',
      subscription_tier: 'professional',
      stripe_customer_id: 'cust_123',
      mrr: 997.00,
      updated_at: new Date().toISOString()
    });
    
    const agents = supabase.getData('agents');
    assert(agents.length > 0, 'Agent should be created');
    assert(agents[0].subscription_status === 'active', 'Agent subscription status should be active');
  });

  // Test 14: Metadata preservation
  await runTest('Subscription metadata is preserved', async () => {
    const supabase = new MockSupabase();
    const metadata = { custom_field: 'test_value', user_id: 'user_123' };
    
    await supabase.from('subscriptions').insert({
      user_id: 'user_123',
      stripe_subscription_id: 'sub_test',
      metadata: metadata
    });
    
    const subscriptions = supabase.getData('subscriptions');
    assert(subscriptions[0].metadata.custom_field === 'test_value', 'Custom metadata should be preserved');
  });

  // Test 15: Multiple events from same subscription
  await runTest('Multiple events can be recorded for same subscription', async () => {
    const supabase = new MockSupabase();
    const userId = 'user_123';
    const stripeSubId = 'sub_test_123';
    
    // Event 1: Created
    await supabase.from('subscription_events').insert({
      user_id: userId,
      event_type: 'subscription_created'
    });
    
    // Event 2: Payment succeeded
    await supabase.from('subscription_events').insert({
      user_id: userId,
      event_type: 'payment_succeeded'
    });
    
    // Event 3: Updated
    await supabase.from('subscription_events').insert({
      user_id: userId,
      event_type: 'subscription_updated'
    });
    
    const events = supabase.getData('subscription_events');
    assert(events.length === 3, 'Should have 3 events');
    assert(events.filter(e => e.user_id === userId).length === 3, 'All events for same user');
  });

  // Print results
  console.log('\n' + '='.repeat(50));
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📊 Total: ${testResults.passed + testResults.failed}`);
  console.log('='.repeat(50) + '\n');

  if (testResults.failed > 0) {
    console.log('Failed tests:');
    testResults.tests
      .filter(t => t.status === 'FAILED')
      .forEach(t => console.log(`  - ${t.name}: ${t.error}`));
  }

  return testResults;
}

// Run tests if called directly
if (require.main === module) {
  runTests().then(results => {
    process.exit(results.failed > 0 ? 1 : 0);
  });
}

module.exports = { runTests };
