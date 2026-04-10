'use strict';

const assert = require('assert');
const SubscriptionService = require('../../lib/services/SubscriptionService');
const billingService = require('../../lib/services/BillingService');

function createQueryBuilder(result) {
  return {
    select() { return this; },
    eq() { return this; },
    order() { return this; },
    limit() { return Promise.resolve(result); }
  };
}

function createDbMock(subscriptions = []) {
  return {
    from(table) {
      if (table !== 'subscriptions') {
        throw new Error(`Unexpected table: ${table}`);
      }
      return {
        select() {
          return {
            eq() {
              return {
                order() {
                  return {
                    eq() {
                      return this;
                    },
                    limit() {
                      return Promise.resolve({ data: subscriptions, error: null });
                    },
                    then(resolve) {
                      return Promise.resolve({ data: subscriptions, error: null }).then(resolve);
                    }
                  };
                }
              };
            }
          };
        }
      };
    }
  };
}

async function run() {
  const mockModeService = new SubscriptionService(null, {
    stripe: null,
    now: () => 1700000000000,
    tierPrices: {
      starter: { month: 'price_starter_month' }
    }
  });

  const created = await mockModeService.createManagedSubscription({
    userId: 'agent-1',
    tier: 'starter',
    interval: 'month'
  });

  assert.equal(created.success, true);
  assert.equal(created.mock, true);
  assert.equal(created.subscriptionId, 'mock_sub_1700000000000');

  const dbService = new SubscriptionService(createDbMock([
    { id: 'sub-1', status: 'active' }
  ]), { stripe: null });

  const listed = await dbService.listUserSubscriptions('agent-1', { status: 'active', limit: 1 });
  assert.equal(listed.subscriptions.length, 1);
  assert.equal(listed.subscriptions[0].id, 'sub-1');

  assert.equal(typeof billingService.createCompleteSubscription, 'function');
  assert.equal(typeof billingService.BillingService, 'function');

  console.log('PASS subscription service class refactor tests');
}

run().catch((error) => {
  console.error('FAIL subscription service class refactor tests');
  console.error(error);
  process.exit(1);
});
