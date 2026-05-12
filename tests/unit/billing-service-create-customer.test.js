'use strict';

const assert = require('assert');

jest.mock('../../lib/utils/circuit-breaker', () => ({
  breakers: {
    stripe: {
      execute: fn => fn()
    }
  }
}));

jest.mock('stripe', () => {
  return function MockStripe() {
    return {};
  };
});

const { BillingService } = require('../../lib/services/BillingService');

describe('BillingService.createCustomer', () => {
  test('sets LANDYOURLEADS statement descriptor when creating customer', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'cus_123' });
    const service = new BillingService({
      stripe: {
        customers: { create }
      }
    });

    const agent = {
      id: 'agent_1',
      email: 'agent@example.com',
      name: 'Agent One'
    };

    await service.createCustomer(agent);

    assert.strictEqual(create.mock.calls.length, 1);
    assert.strictEqual(create.mock.calls[0][0].statement_descriptor, 'LANDYOURLEADS');
  });
});
