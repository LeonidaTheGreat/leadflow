'use strict';

const assert = require('assert');
const { BillingService } = require('../../lib/services/BillingService');

async function run() {
  let capturedParams = null;
  const stripeMock = {
    customers: {
      create: async (params) => {
        capturedParams = params;
        return { id: 'cus_test_123' };
      },
    },
  };

  const service = new BillingService({ stripe: stripeMock, db: {} });
  const agent = { id: 'agent_123', email: 'agent@example.com', name: 'Agent Example' };
  const customer = await service.createCustomer(agent);

  assert.strictEqual(customer.id, 'cus_test_123');
  assert.ok(capturedParams, 'Expected Stripe customer payload to be captured');
  assert.strictEqual(capturedParams.statement_descriptor, 'LANDYOURLEADS');

  console.log('PASS billing-service-statement-descriptor');
}

run().catch((error) => {
  console.error('FAIL billing-service-statement-descriptor:', error.message);
  process.exit(1);
});
