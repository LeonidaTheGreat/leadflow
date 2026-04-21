/**
 * Integration tests for checkout price validation bug fixes.
 *
 * Bug 1: create-checkout/route.ts regex had `{14 }` (space) instead of `{14,}`
 *         — rejected ALL valid Stripe price IDs, making checkout impossible.
 * Bug 2: upgrade-checkout/route.ts used invalid fallback price ID strings
 *         and wrong env var names (PROFESSIONAL → PRO, ENTERPRISE → TEAM).
 * Bug 3: upgrade-checkout wrote to non-existent `subscription_attempts` table
 *         instead of `checkout_sessions`.
 */

const assert = require('assert');

const testResults = { passed: 0, failed: 0, tests: [] };

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

async function runAllTests() {
  console.log('\n🧪 Checkout Price Validation Bug Fixes\n');

  // --- Bug 1: Price ID regex validation ---

  const FIXED_REGEX = /^price_[A-Za-z0-9]{14,}$/;
  const BROKEN_REGEX = /^price_[A-Za-z0-9]{14 }$/;

  await runTest('Bug1: Fixed regex accepts real Stripe price ID (24 chars after prefix)', async () => {
    const realPriceId = 'price_1QvIEf2eZvKYlo2CkuDLQABG';
    assert.strictEqual(FIXED_REGEX.test(realPriceId), true,
      `Fixed regex should accept "${realPriceId}"`);
  });

  await runTest('Bug1: Fixed regex accepts price ID with exactly 14 chars after prefix', async () => {
    const minimalPriceId = 'price_1QvIEf2eZvKYlo';
    assert.strictEqual(FIXED_REGEX.test(minimalPriceId), true,
      `Fixed regex should accept 14-char suffix`);
  });

  await runTest('Bug1: Fixed regex rejects placeholder strings', async () => {
    const placeholders = [
      'price_starter_monthly',
      'price_pro_149',
      'price_professional_monthly',
      'price_enterprise_monthly'
    ];
    for (const p of placeholders) {
      // Placeholders contain underscores which are not [A-Za-z0-9]
      assert.strictEqual(FIXED_REGEX.test(p), false,
        `Should reject placeholder "${p}"`);
    }
  });

  await runTest('Bug1: Broken regex (with space) rejects ALL valid price IDs', async () => {
    const realPriceId = 'price_1QvIEf2eZvKYlo2CkuDLQABG';
    assert.strictEqual(BROKEN_REGEX.test(realPriceId), false,
      `Broken regex incorrectly rejects valid price ID — this was the bug`);
  });

  await runTest('Bug1: Fixed regex rejects empty and undefined', async () => {
    assert.strictEqual(FIXED_REGEX.test(''), false);
    assert.strictEqual(FIXED_REGEX.test('undefined'), false);
    assert.strictEqual(FIXED_REGEX.test('null'), false);
  });

  // --- Bug 2: Env var name mapping ---

  await runTest('Bug2: upgrade-checkout uses correct env var names (PRO not PROFESSIONAL)', async () => {
    const fs = require('fs');
    const path = require('path');
    const routeContent = fs.readFileSync(
      path.join(__dirname, '../../product/lead-response/dashboard/app/api/stripe/upgrade-checkout/route.ts'),
      'utf8'
    );

    assert(!routeContent.includes('STRIPE_PRICE_PROFESSIONAL_MONTHLY'),
      'Should NOT reference STRIPE_PRICE_PROFESSIONAL_MONTHLY');
    assert(!routeContent.includes('STRIPE_PRICE_ENTERPRISE_MONTHLY'),
      'Should NOT reference STRIPE_PRICE_ENTERPRISE_MONTHLY');
    assert(routeContent.includes('STRIPE_PRICE_PRO_MONTHLY'),
      'Should reference STRIPE_PRICE_PRO_MONTHLY');
    assert(routeContent.includes('STRIPE_PRICE_TEAM_MONTHLY'),
      'Should reference STRIPE_PRICE_TEAM_MONTHLY');
  });

  await runTest('Bug2: upgrade-checkout has no invalid fallback price IDs', async () => {
    const fs = require('fs');
    const path = require('path');
    const routeContent = fs.readFileSync(
      path.join(__dirname, '../../product/lead-response/dashboard/app/api/stripe/upgrade-checkout/route.ts'),
      'utf8'
    );

    assert(!routeContent.includes("'price_starter_monthly'"),
      'Should NOT have placeholder fallback price_starter_monthly');
    assert(!routeContent.includes("'price_professional_monthly'"),
      'Should NOT have placeholder fallback price_professional_monthly');
    assert(!routeContent.includes("'price_enterprise_monthly'"),
      'Should NOT have placeholder fallback price_enterprise_monthly');
  });

  // --- Bug 3: Table reference ---

  await runTest('Bug3: upgrade-checkout writes to checkout_sessions (not subscription_attempts)', async () => {
    const fs = require('fs');
    const path = require('path');
    const routeContent = fs.readFileSync(
      path.join(__dirname, '../../product/lead-response/dashboard/app/api/stripe/upgrade-checkout/route.ts'),
      'utf8'
    );

    assert(!routeContent.includes('subscription_attempts'),
      'Should NOT reference non-existent subscription_attempts table');
    assert(routeContent.includes('checkout_sessions'),
      'Should write to checkout_sessions table');
  });

  // --- Bug 2 continued: Price validation before Stripe call ---

  await runTest('Bug2: upgrade-checkout validates price ID before creating Stripe session', async () => {
    const fs = require('fs');
    const path = require('path');
    const routeContent = fs.readFileSync(
      path.join(__dirname, '../../product/lead-response/dashboard/app/api/stripe/upgrade-checkout/route.ts'),
      'utf8'
    );

    assert(routeContent.includes('PRICE_NOT_CONFIGURED'),
      'Should return PRICE_NOT_CONFIGURED error when env var missing');
    assert(routeContent.includes('price_[A-Za-z0-9]{14,}'),
      'Should validate price ID format with correct regex');
  });

  // --- create-checkout regex in actual file ---

  await runTest('Bug1: create-checkout/route.ts has correct regex (no space)', async () => {
    const fs = require('fs');
    const path = require('path');
    const routeContent = fs.readFileSync(
      path.join(__dirname, '../../product/lead-response/dashboard/app/api/billing/create-checkout/route.ts'),
      'utf8'
    );

    assert(routeContent.includes('{14,}'),
      'Should have {14,} quantifier (14 or more chars)');
    assert(!routeContent.includes('{14 }'),
      'Should NOT have {14 } (space in quantifier was the bug)');
  });

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📊 Total: ${testResults.passed + testResults.failed}`);
  console.log('='.repeat(60) + '\n');

  return testResults;
}

if (require.main === module) {
  runAllTests().then((results) => {
    process.exit(results.failed > 0 ? 1 : 0);
  }).catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { runAllTests, testResults };
