'use strict';

jest.mock('stripe', () => {
  return function Stripe() {
    return {};
  };
}, { virtual: true });
jest.mock('../../lib/db', () => ({
  createClient: jest.fn()
}));

const { BillingService } = require('../../lib/services/BillingService');

describe('BillingService.createCustomer', () => {
  test('sets statement_descriptor to LANDYOURLEADS', async () => {
    const createMock = jest.fn().mockResolvedValue({ id: 'cus_123' });
    const billingService = new BillingService({
      stripe: {
        customers: {
          create: createMock
        }
      },
      db: {}
    });

    await billingService.createCustomer({
      id: 'agent_1',
      email: 'agent@example.com',
      name: 'Agent Name'
    });

    expect(createMock).toHaveBeenCalledWith(expect.objectContaining({
      email: 'agent@example.com',
      name: 'Agent Name',
      statement_descriptor: 'LANDYOURLEADS'
    }));
  });
});
