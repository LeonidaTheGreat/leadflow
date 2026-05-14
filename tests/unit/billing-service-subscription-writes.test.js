/**
 * Unit tests — BillingService webhook subscription writes
 *
 * Verifies that checkout.session.completed and customer.subscription.*
 * webhook events correctly upsert data into the subscriptions table.
 *
 * Uses constructor injection (no mocking framework required).
 */

'use strict';

const assert = require('assert');
const { BillingService } = require('../../lib/services/BillingService');

// ─── Mock DB builder ─────────────────────────────────────────────────────────

function makeMockDb() {
    const calls = [];
    const chain = {
        _calls: calls,
        upsert: (data, opts) => { calls.push({ op: 'upsert', data, opts }); return chain; },
        insert: (data) => { calls.push({ op: 'insert', data }); return chain; },
        update: (data) => { calls.push({ op: 'update', data }); return chain; },
        select: () => chain,
        eq: () => chain,
        single: () => chain,
        then: (resolve) => resolve({ data: null, error: null }),
    };
    return {
        from: (table) => {
            calls.push({ op: 'from', table });
            return chain;
        },
        _calls: calls,
    };
}

// ─── Mock Stripe builder ─────────────────────────────────────────────────────

function makeMockStripe(subscriptionData = {}) {
    const defaultSub = {
        id: 'sub_test123',
        status: 'active',
        customer: 'cus_test123',
        current_period_start: 1700000000,
        current_period_end: 1702592000,
        trial_start: null,
        trial_end: null,
        cancel_at_period_end: false,
        items: { data: [{ price: { id: 'price_test', recurring: { interval: 'month' } } }] },
        metadata: { user_id: 'user_abc', tier: 'professional' },
        ...subscriptionData,
    };
    return {
        subscriptions: {
            retrieve: async () => defaultSub,
        },
        webhooks: {
            constructEvent: (payload, sig, secret) => JSON.parse(payload.toString()),
        },
    };
}

// ─── Test runner ─────────────────────────────────────────────────────────────

const results = { passed: 0, failed: 0 };

async function test(name, fn) {
    try {
        await fn();
        results.passed++;
        console.log(`  PASS  ${name}`);
    } catch (err) {
        results.failed++;
        console.error(`  FAIL  ${name}: ${err.message}`);
        if (process.env.VERBOSE) console.error(err.stack);
    }
}

async function main() {
    // ─── checkout.session.completed ──────────────────────────────────────────

    console.log('\ncheckout.session.completed → subscriptions upsert');

    await test('upserts subscription when checkout completes with user and subscription', async () => {
        const db = makeMockDb();
        const service = new BillingService({ stripe: makeMockStripe(), db });

        const session = {
            id: 'cs_test',
            client_reference_id: 'user_abc',
            customer: 'cus_test123',
            subscription: 'sub_test123',
            metadata: { tier: 'professional' },
        };

        const result = await service.handleCheckoutCompleted(session);
        assert.strictEqual(result.acknowledged, true);
        assert.strictEqual(result.subscriptionPersisted, true);

        const subTableCall = db._calls.find(c => c.op === 'from' && c.table === 'subscriptions');
        assert.ok(subTableCall, 'should query subscriptions table');
    });

    await test('skips subscription upsert when userId is missing from checkout session', async () => {
        const db = makeMockDb();
        const service = new BillingService({ stripe: makeMockStripe(), db });

        const session = {
            id: 'cs_no_user',
            client_reference_id: null,
            customer: 'cus_test123',
            subscription: 'sub_test123',
            metadata: {},
        };

        const result = await service.handleCheckoutCompleted(session);
        assert.strictEqual(result.acknowledged, true);
        assert.strictEqual(result.subscriptionPersisted, false);
    });

    await test('handles checkout with no db gracefully', async () => {
        const service = new BillingService({ stripe: makeMockStripe(), db: null });

        const session = {
            id: 'cs_nodb',
            client_reference_id: 'user_abc',
            customer: 'cus_test123',
            subscription: 'sub_test123',
            metadata: { tier: 'professional' },
        };

        const result = await service.handleCheckoutCompleted(session);
        assert.strictEqual(result.acknowledged, true);
    });

    // ─── customer.subscription.created ───────────────────────────────────────

    console.log('\ncustomer.subscription.created → subscriptions upsert');

    await test('upserts subscription on subscription created event', async () => {
        const db = makeMockDb();
        const service = new BillingService({ stripe: makeMockStripe(), db });

        const subscription = {
            id: 'sub_new',
            status: 'active',
            customer: 'cus_abc',
            current_period_start: 1700000000,
            current_period_end: 1702592000,
            trial_start: null,
            trial_end: null,
            cancel_at_period_end: false,
            canceled_at: null,
            ended_at: null,
            items: { data: [{ price: { id: 'price_pro', recurring: { interval: 'month' } } }] },
            metadata: { user_id: 'user_abc', tier: 'professional' },
        };

        const result = await service.handleSubscriptionCreated(subscription);
        assert.strictEqual(result.acknowledged, true);

        const subTableCall = db._calls.find(c => c.op === 'from' && c.table === 'subscriptions');
        assert.ok(subTableCall, 'should query subscriptions table');
    });

    await test('returns acknowledged even when user_id is missing from metadata', async () => {
        const db = makeMockDb();
        const service = new BillingService({ stripe: makeMockStripe(), db });

        const subscription = {
            id: 'sub_nousermeta',
            status: 'active',
            customer: 'cus_abc',
            current_period_start: 1700000000,
            current_period_end: 1702592000,
            trial_start: null,
            trial_end: null,
            cancel_at_period_end: false,
            canceled_at: null,
            ended_at: null,
            items: { data: [{ price: { id: 'price_pro', recurring: { interval: 'month' } } }] },
            metadata: {},
        };

        const result = await service.handleSubscriptionCreated(subscription);
        assert.strictEqual(result.acknowledged, true);
    });

    // ─── customer.subscription.updated ───────────────────────────────────────

    console.log('\ncustomer.subscription.updated → subscriptions upsert');

    await test('upserts subscription on subscription updated event', async () => {
        const db = makeMockDb();
        const service = new BillingService({ stripe: makeMockStripe(), db });

        const subscription = {
            id: 'sub_upd',
            status: 'past_due',
            customer: 'cus_abc',
            current_period_start: 1700000000,
            current_period_end: 1702592000,
            trial_start: null,
            trial_end: null,
            cancel_at_period_end: false,
            canceled_at: null,
            ended_at: null,
            items: { data: [{ price: { id: 'price_pro', recurring: { interval: 'month' } } }] },
            metadata: { user_id: 'user_abc', tier: 'professional' },
        };

        const result = await service.handleSubscriptionUpdated(subscription);
        assert.strictEqual(result.acknowledged, true);
        assert.strictEqual(result.status, 'past_due');
    });

    // ─── processWebhookEvent routing ─────────────────────────────────────────

    console.log('\nprocessWebhookEvent → routes to correct handlers');

    await test('routes checkout.session.completed to handleCheckoutCompleted', async () => {
        const db = makeMockDb();
        const service = new BillingService({ stripe: makeMockStripe(), db });

        const handledTypes = [];
        const original = service.handleCheckoutCompleted.bind(service);
        service.handleCheckoutCompleted = async (obj) => {
            handledTypes.push('checkout.session.completed');
            return original(obj);
        };

        const event = {
            id: 'evt_checkout',
            type: 'checkout.session.completed',
            data: {
                object: {
                    id: 'cs_test',
                    client_reference_id: null,
                    customer: 'cus_abc',
                    subscription: null,
                    metadata: {},
                },
            },
        };

        await service.processWebhookEvent(event);
        assert.ok(handledTypes.includes('checkout.session.completed'),
            'should call handleCheckoutCompleted');
    });

    await test('routes customer.subscription.created to handleSubscriptionCreated', async () => {
        const db = makeMockDb();
        const service = new BillingService({ stripe: makeMockStripe(), db });

        const handledTypes = [];
        const original = service.handleSubscriptionCreated.bind(service);
        service.handleSubscriptionCreated = async (obj) => {
            handledTypes.push('customer.subscription.created');
            return original(obj);
        };

        const event = {
            id: 'evt_sub_created',
            type: 'customer.subscription.created',
            data: {
                object: {
                    id: 'sub_new',
                    status: 'active',
                    customer: 'cus_abc',
                    current_period_start: 1700000000,
                    current_period_end: 1702592000,
                    trial_start: null,
                    trial_end: null,
                    cancel_at_period_end: false,
                    canceled_at: null,
                    ended_at: null,
                    items: { data: [{ price: { id: 'price_pro', recurring: { interval: 'month' } } }] },
                    metadata: {},
                },
            },
        };

        await service.processWebhookEvent(event);
        assert.ok(handledTypes.includes('customer.subscription.created'),
            'should call handleSubscriptionCreated');
    });

    await test('returns processed:false for unregistered event types', async () => {
        const db = makeMockDb();
        const service = new BillingService({ stripe: makeMockStripe(), db });

        const event = {
            id: 'evt_unknown',
            type: 'unknown.event.type',
            data: { object: { id: 'x' } },
        };

        const result = await service.processWebhookEvent(event);
        assert.strictEqual(result.processed, false);
        assert.ok(result.reason, 'should include reason for skipped events');
    });

    // ─── Summary ──────────────────────────────────────────────────────────────

    console.log(`\nResults: ${results.passed} passed, ${results.failed} failed\n`);

    if (results.failed > 0) {
        process.exit(1);
    }
}

main().catch(err => {
    console.error('Test runner error:', err);
    process.exit(1);
});
