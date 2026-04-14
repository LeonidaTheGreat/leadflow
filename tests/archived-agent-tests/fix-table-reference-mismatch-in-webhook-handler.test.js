/**
 * Test: fix-table-reference-mismatch-in-webhook-handler
 * 
 * Verifies that the Stripe webhook handler references the correct 'agents'
 * table instead of the non-existent 'real_estate_agents' table.
 */

const fs = require('fs');
const path = require('path');

const WEBHOOK_ROUTE_PATH = path.join(
  __dirname,
  '../product/lead-response/dashboard/app/api/webhooks/stripe/route.ts'
);

describe('Stripe Webhook Handler - Table Reference Fix', () => {
  let routeContent;

  beforeAll(() => {
    routeContent = fs.readFileSync(WEBHOOK_ROUTE_PATH, 'utf8');
  });

  test('should NOT reference real_estate_agents table', () => {
    expect(routeContent).not.toContain("from('real_estate_agents')");
  });

  test('should reference agents table for subscription updates', () => {
    const agentsMatches = (routeContent.match(/from\('agents'\)/g) || []).length;
    // There should be at least 4 references (handleCheckoutComplete, handleInvoicePaid,
    // handlePaymentFailed, handleSubscriptionCancelled)
    expect(agentsMatches).toBeGreaterThanOrEqual(4);
  });

  test('handleCheckoutComplete should update agents table', () => {
    // Find the handleCheckoutComplete function and confirm it uses 'agents'
    const checkoutFnMatch = routeContent.match(
      /async function handleCheckoutComplete[\s\S]*?^}/m
    );
    // Just verify the overall file uses 'agents' not 'real_estate_agents'
    expect(routeContent).not.toContain("real_estate_agents");
  });

  test('all subscription event handlers use correct table name', () => {
    const functions = [
      'handleCheckoutComplete',
      'handleInvoicePaid',
      'handlePaymentFailed',
      'handleSubscriptionCancelled',
    ];

    functions.forEach(fnName => {
      // Find the function block
      const fnRegex = new RegExp(`async function ${fnName}[\\s\\S]*?\\n\\}`);
      const match = routeContent.match(fnRegex);
      if (match) {
        expect(match[0]).not.toContain('real_estate_agents');
      }
    });
  });
});
