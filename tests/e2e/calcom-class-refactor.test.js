'use strict';

/**
 * E2E test: PR #1156 — CalcomClient, CalcomWebhookHandler, CalcomWebhookManagement class refactor
 * Verifies: class instantiation, dependency injection, backward-compat exports, BookingLinkService integration
 */

const assert = require('assert');

let passed = 0;
let failed = 0;

function test(name, fn) {
    try {
        const result = fn();
        if (result && typeof result.then === 'function') {
            return result.then(() => {
                passed += 1;
                console.log(`  ✅ ${name}`);
            }).catch((err) => {
                failed += 1;
                console.error(`  ❌ ${name}: ${err.message}`);
            });
        }
        passed += 1;
        console.log(`  ✅ ${name}`);
        return Promise.resolve();
    } catch (err) {
        failed += 1;
        console.error(`  ❌ ${name}: ${err.message}`);
        return Promise.resolve();
    }
}

async function run() {
    console.log('\n🧪 E2E: Cal.com class refactor (PR #1156)\n');

    const CalcomClient = require('../../lib/services/CalcomClient');
    const CalcomWebhookHandler = require('../../lib/services/CalcomWebhookHandler');
    const CalcomWebhookManagement = require('../../lib/services/CalcomWebhookManagement');
    const BookingLinkService = require('../../lib/services/BookingLinkService');

    // --- CalcomClient ---

    await test('CalcomClient: class constructor exported', () => {
        assert.strictEqual(typeof CalcomClient, 'function');
        const c = new CalcomClient();
        assert.strictEqual(typeof c.isConfigured, 'function');
        assert.strictEqual(typeof c.getEventTypes, 'function');
        assert.strictEqual(typeof c.generateBookingUrl, 'function');
    });

    await test('CalcomClient: backward-compat isConfigured export', () => {
        assert.strictEqual(typeof CalcomClient.isConfigured, 'function');
        // should return false when CAL_API_KEY is unset in test env
        const result = CalcomClient.isConfigured();
        assert.strictEqual(typeof result, 'boolean');
    });

    await test('CalcomClient: backward-compat generateBookingUrl export', () => {
        assert.strictEqual(typeof CalcomClient.generateBookingUrl, 'function');
    });

    await test('CalcomClient: dependency injection for httpClient', async () => {
        const httpCalls = [];
        const client = new CalcomClient({
            apiKey: 'test-key',
            httpClient: async (config) => {
                httpCalls.push(config);
                return { data: { data: [] } };
            }
        });
        await client.getEventTypes({});
        assert.strictEqual(httpCalls.length, 1);
        assert.ok(httpCalls[0].headers.Authorization.includes('test-key'));
    });

    await test('CalcomClient: mock data uses injected defaultUsername', async () => {
        const client = new CalcomClient({ defaultUsername: 'test-agent' });
        const types = await client.getEventTypes();
        assert.ok(types.every((t) => t.bookingUrl.includes('/test-agent/')));
    });

    // --- CalcomWebhookHandler ---

    await test('CalcomWebhookHandler: class constructor exported', () => {
        assert.strictEqual(typeof CalcomWebhookHandler, 'function');
        const h = new CalcomWebhookHandler();
        assert.strictEqual(typeof h.handleCalWebhook, 'function');
        assert.strictEqual(typeof h.verifyWebhookSignature, 'function');
    });

    await test('CalcomWebhookHandler: backward-compat handleCalWebhook export', () => {
        assert.strictEqual(typeof CalcomWebhookHandler.handleCalWebhook, 'function');
    });

    await test('CalcomWebhookHandler: injected createLeadSequence used in triggerPostMeetingFollowUp', async () => {
        const calls = [];
        const handler = new CalcomWebhookHandler({
            createLeadSequence: async (p) => { calls.push(p); return p; }
        });
        await handler.triggerPostMeetingFollowUp({ id: 'b1', cal_booking_uid: 'u1', lead_id: 'l1' });
        assert.strictEqual(calls.length, 1);
        assert.strictEqual(calls[0].sequence_type, 'post_viewing');
    });

    await test('CalcomWebhookHandler: two independent instances have separate _db state', () => {
        const h1 = new CalcomWebhookHandler({ db: { id: 'db1' } });
        const h2 = new CalcomWebhookHandler({ db: { id: 'db2' } });
        assert.strictEqual(h1._db.id, 'db1');
        assert.strictEqual(h2._db.id, 'db2');
        assert.notStrictEqual(h1._db, h2._db);
    });

    // --- CalcomWebhookManagement ---

    await test('CalcomWebhookManagement: class constructor exported', () => {
        assert.strictEqual(typeof CalcomWebhookManagement, 'function');
        const m = new CalcomWebhookManagement();
        assert.strictEqual(typeof m.listWebhooks, 'function');
        assert.strictEqual(typeof m.registerWebhook, 'function');
        assert.strictEqual(typeof m.generateWebhookSecret, 'function');
    });

    await test('CalcomWebhookManagement: backward-compat listWebhooks export', () => {
        assert.strictEqual(typeof CalcomWebhookManagement.listWebhooks, 'function');
    });

    await test('CalcomWebhookManagement: generateWebhookSecret returns whsec_ prefixed hex', () => {
        const m = new CalcomWebhookManagement();
        const secret = m.generateWebhookSecret();
        assert.ok(/^whsec_[0-9a-f]{64}$/.test(secret), `Expected whsec_<64 hex chars>, got: ${secret}`);
    });

    await test('CalcomWebhookManagement: returns mock webhook list without db', async () => {
        const m = new CalcomWebhookManagement();
        const hooks = await m.listWebhooks();
        assert.ok(Array.isArray(hooks));
        assert.ok(hooks.length > 0);
        assert.ok(hooks[0].webhookId);
    });

    // --- BookingLinkService integration ---

    await test('BookingLinkService: accepts injected CalcomClient instance', () => {
        const client = new CalcomClient({ defaultUsername: 'injected-agent' });
        const svc = new BookingLinkService({ calcomClient: client });
        assert.strictEqual(svc.calcomClient, client);
    });

    await test('BookingLinkService: creates its own CalcomClient when none injected', () => {
        const svc = new BookingLinkService();
        assert.ok(svc.calcomClient instanceof CalcomClient);
    });

    console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
    if (failed > 0) process.exit(1);
}

run().catch((err) => {
    console.error('Fatal:', err);
    process.exit(1);
});
