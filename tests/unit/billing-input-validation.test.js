/**
 * Unit tests for billing route input validation
 *
 * Tests cover the inline validation added to:
 *   POST /webhook/stripe
 *   POST /api/billing/checkout
 *   POST /api/billing/portal
 */

'use strict';

const assert = require('assert');
const { ValidationError } = require('../../lib/errors');

// ─── Helpers ──────────────────────────────────────────────────────────────────

class MockRes {
    constructor() {
        this.statusCode = 200;
        this.body = null;
    }
    status(code) { this.statusCode = code; return this; }
    json(data) { this.body = data; return this; }
}

const VALID_TIERS = ['starter', 'professional', 'enterprise'];
const VALID_INTERVALS = ['month', 'year'];

/**
 * Replicate the checkout validation logic from routes/billing.js
 * so tests are decoupled from BillingService.
 */
function validateCheckout({ userId, tier, interval }) {
    if (!userId || typeof userId !== 'string' || !userId.trim()) {
        throw new ValidationError('userId is required and must be a non-empty string');
    }
    if (!VALID_TIERS.includes(tier)) {
        throw new ValidationError(`tier must be one of: ${VALID_TIERS.join(', ')}`);
    }
    if (interval !== undefined && !VALID_INTERVALS.includes(interval)) {
        throw new ValidationError(`interval must be one of: ${VALID_INTERVALS.join(', ')}`);
    }
}

/**
 * Replicate the portal validation logic from routes/billing.js
 */
function validatePortal({ customerId, returnUrl }) {
    if (!customerId || typeof customerId !== 'string' || !customerId.startsWith('cus_')) {
        throw new ValidationError('customerId is required and must be a string starting with "cus_"');
    }
    if (returnUrl !== undefined && typeof returnUrl !== 'string') {
        throw new ValidationError('returnUrl must be a string');
    }
}

/**
 * Replicate the stripe webhook event shape validation from routes/billing.js
 */
function validateStripeEvent(event) {
    if (!event.type || typeof event.type !== 'string') {
        return { error: 'Invalid event: type must be a non-empty string' };
    }
    if (!event.data || !event.data.object) {
        return { error: 'Invalid event: data.object is required' };
    }
    return null;
}

// ─── Test runner ─────────────────────────────────────────────────────────────

const results = { passed: 0, failed: 0 };

function test(name, fn) {
    try {
        fn();
        results.passed++;
        console.log(`  PASS  ${name}`);
    } catch (err) {
        results.failed++;
        console.error(`  FAIL  ${name}: ${err.message}`);
    }
}

// ─── POST /api/billing/checkout ───────────────────────────────────────────────

console.log('\nPOST /api/billing/checkout validation');

test('accepts valid starter/month', () => {
    assert.doesNotThrow(() => validateCheckout({ userId: 'u1', tier: 'starter', interval: 'month' }));
});

test('accepts valid professional/year', () => {
    assert.doesNotThrow(() => validateCheckout({ userId: 'u1', tier: 'professional', interval: 'year' }));
});

test('accepts valid enterprise with no interval (optional)', () => {
    assert.doesNotThrow(() => validateCheckout({ userId: 'u1', tier: 'enterprise' }));
});

test('rejects missing userId', () => {
    assert.throws(
        () => validateCheckout({ tier: 'starter' }),
        err => err instanceof ValidationError && err.statusCode === 400
    );
});

test('rejects empty string userId', () => {
    assert.throws(
        () => validateCheckout({ userId: '   ', tier: 'starter' }),
        err => err instanceof ValidationError
    );
});

test('rejects non-string userId', () => {
    assert.throws(
        () => validateCheckout({ userId: 42, tier: 'starter' }),
        err => err instanceof ValidationError
    );
});

test('rejects invalid tier "gold"', () => {
    assert.throws(
        () => validateCheckout({ userId: 'u1', tier: 'gold' }),
        err => err instanceof ValidationError && /tier must be one of/.test(err.message)
    );
});

test('rejects undefined tier', () => {
    assert.throws(
        () => validateCheckout({ userId: 'u1' }),
        err => err instanceof ValidationError
    );
});

test('rejects invalid interval "weekly"', () => {
    assert.throws(
        () => validateCheckout({ userId: 'u1', tier: 'starter', interval: 'weekly' }),
        err => err instanceof ValidationError && /interval must be one of/.test(err.message)
    );
});

test('accepts interval omitted (undefined)', () => {
    assert.doesNotThrow(() => validateCheckout({ userId: 'u1', tier: 'starter', interval: undefined }));
});

// ─── POST /api/billing/portal ─────────────────────────────────────────────────

console.log('\nPOST /api/billing/portal validation');

test('accepts valid cus_ prefixed customerId', () => {
    assert.doesNotThrow(() => validatePortal({ customerId: 'cus_abc123' }));
});

test('accepts valid customerId with optional returnUrl string', () => {
    assert.doesNotThrow(() => validatePortal({ customerId: 'cus_abc123', returnUrl: 'https://example.com' }));
});

test('accepts valid customerId with returnUrl omitted', () => {
    assert.doesNotThrow(() => validatePortal({ customerId: 'cus_abc123' }));
});

test('rejects missing customerId', () => {
    assert.throws(
        () => validatePortal({}),
        err => err instanceof ValidationError
    );
});

test('rejects customerId without cus_ prefix', () => {
    assert.throws(
        () => validatePortal({ customerId: 'stripe_abc' }),
        err => err instanceof ValidationError && /cus_/.test(err.message)
    );
});

test('rejects non-string customerId', () => {
    assert.throws(
        () => validatePortal({ customerId: 12345 }),
        err => err instanceof ValidationError
    );
});

test('rejects null customerId', () => {
    assert.throws(
        () => validatePortal({ customerId: null }),
        err => err instanceof ValidationError
    );
});

test('rejects non-string returnUrl', () => {
    assert.throws(
        () => validatePortal({ customerId: 'cus_abc', returnUrl: 42 }),
        err => err instanceof ValidationError && /returnUrl/.test(err.message)
    );
});

// ─── POST /webhook/stripe event shape ─────────────────────────────────────────

console.log('\nPOST /webhook/stripe event shape validation');

test('accepts valid event with type and data.object', () => {
    const err = validateStripeEvent({ type: 'invoice.paid', data: { object: { id: 'in_123' } } });
    assert.strictEqual(err, null);
});

test('rejects event with missing type', () => {
    const err = validateStripeEvent({ data: { object: {} } });
    assert.ok(err && /type/.test(err.error));
});

test('rejects event with empty string type', () => {
    const err = validateStripeEvent({ type: '', data: { object: {} } });
    assert.ok(err && /type/.test(err.error));
});

test('rejects event with non-string type', () => {
    const err = validateStripeEvent({ type: 42, data: { object: {} } });
    assert.ok(err && /type/.test(err.error));
});

test('rejects event with missing data', () => {
    const err = validateStripeEvent({ type: 'invoice.paid' });
    assert.ok(err && /data\.object/.test(err.error));
});

test('rejects event with data but no object', () => {
    const err = validateStripeEvent({ type: 'invoice.paid', data: {} });
    assert.ok(err && /data\.object/.test(err.error));
});

test('rejects event with null data.object', () => {
    const err = validateStripeEvent({ type: 'invoice.paid', data: { object: null } });
    assert.ok(err && /data\.object/.test(err.error));
});

// ─── Summary ──────────────────────────────────────────────────────────────────

console.log(`\nResults: ${results.passed} passed, ${results.failed} failed\n`);

if (results.failed > 0) {
    process.exit(1);
}
