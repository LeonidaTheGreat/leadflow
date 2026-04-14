'use strict';

/**
 * E2E test: Cal.com class refactor (PR #1156)
 *
 * Verifies that CalcomClient, CalcomWebhookHandler, and CalcomWebhookManagement:
 *  1. Export proper class constructors
 *  2. Backward-compat function exports still work via default instance delegation
 *  3. BookingLinkService correctly uses an injected CalcomClient
 *  4. Webhook signature verification works end-to-end
 *  5. CalcomWebhookManagement lists webhooks without a DB connection
 */

const assert = require('assert');
const crypto = require('crypto');

let passed = 0;
let failed = 0;

async function test(name, fn) {
    try {
        await fn();
        passed += 1;
        console.log(`  ✅ ${name}`);
    } catch (err) {
        failed += 1;
        console.error(`  ❌ ${name}: ${err.message}`);
    }
}

async function run() {
    console.log('\n🧪 Cal.com Class Refactor — E2E Tests\n');

    // ─── CalcomClient ─────────────────────────────────────────────────────────
    const CalcomClient = require('../lib/services/CalcomClient');

    await test('CalcomClient exports a class constructor', async () => {
        assert.strictEqual(typeof CalcomClient, 'function');
        const client = new CalcomClient();
        assert.strictEqual(typeof client.getEventTypes, 'function');
        assert.strictEqual(typeof client.createBooking, 'function');
        assert.strictEqual(typeof client.isConfigured, 'function');
    });

    await test('CalcomClient backward-compat: named function exports still work', async () => {
        assert.strictEqual(typeof CalcomClient.getEventTypes, 'function');
        assert.strictEqual(typeof CalcomClient.isConfigured, 'function');
        assert.strictEqual(typeof CalcomClient.generateBookingUrl, 'function');
    });

    await test('CalcomClient.isConfigured() returns false without API key', async () => {
        const savedKey = process.env.CAL_API_KEY;
        delete process.env.CAL_API_KEY;
        const client = new CalcomClient({ apiKey: null });
        assert.strictEqual(client.isConfigured(), false);
        if (savedKey) process.env.CAL_API_KEY = savedKey;
    });

    await test('CalcomClient generates booking URL from injected username', async () => {
        const client = new CalcomClient({ defaultUsername: 'test-agent' });
        const url = client.generateBookingUrl('discovery-call');
        assert.strictEqual(url, 'https://cal.com/test-agent/discovery-call');
    });

    await test('CalcomClient getEventTypes returns mock data when unconfigured', async () => {
        const client = new CalcomClient({ defaultUsername: 'mock-agent', apiKey: null });
        const types = await client.getEventTypes();
        assert.ok(Array.isArray(types) && types.length > 0, 'should return mock event types');
        assert.ok(types[0].bookingUrl.includes('mock-agent'), 'bookingUrl should include injected username');
    });

    await test('CalcomClient makes authenticated HTTP request with correct headers', async () => {
        const calls = [];
        const client = new CalcomClient({
            apiKey: 'cal_key_xyz',
            httpClient: async (cfg) => { calls.push(cfg); return { data: { data: [] } }; }
        });
        await client.getEventTypes({ username: 'someone' });
        assert.strictEqual(calls.length, 1);
        assert.ok(calls[0].headers.Authorization.includes('cal_key_xyz'));
        assert.ok(calls[0].headers['cal-api-version']);
    });

    // ─── CalcomWebhookHandler ─────────────────────────────────────────────────
    const CalcomWebhookHandler = require('../lib/services/CalcomWebhookHandler');

    await test('CalcomWebhookHandler exports a class constructor', async () => {
        assert.strictEqual(typeof CalcomWebhookHandler, 'function');
        const handler = new CalcomWebhookHandler();
        assert.strictEqual(typeof handler.handleCalWebhook, 'function');
        assert.strictEqual(typeof handler.verifyWebhookSignature, 'function');
    });

    await test('CalcomWebhookHandler backward-compat: named function exports still work', async () => {
        assert.strictEqual(typeof CalcomWebhookHandler.handleCalWebhook, 'function');
        assert.strictEqual(typeof CalcomWebhookHandler.verifyWebhookSignature, 'function');
        assert.strictEqual(typeof CalcomWebhookHandler.withRetry, 'function');
    });

    await test('CalcomWebhookHandler.verifyWebhookSignature validates HMAC correctly', async () => {
        const handler = new CalcomWebhookHandler();
        const secret = process.env.CAL_WEBHOOK_SECRET || 'test-secret-for-e2e';
        const payload = JSON.stringify({ type: 'booking.created', data: { id: 'bk_123' } });
        const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
        const savedSecret = process.env.CAL_WEBHOOK_SECRET;
        process.env.CAL_WEBHOOK_SECRET = secret;
        const valid = handler.verifyWebhookSignature(payload, sig);
        assert.strictEqual(valid, true, 'valid signature should be accepted');
        if (savedSecret !== undefined) process.env.CAL_WEBHOOK_SECRET = savedSecret;
        else delete process.env.CAL_WEBHOOK_SECRET;
    });

    await test('CalcomWebhookHandler.verifyWebhookSignature rejects bad signature', async () => {
        const handler = new CalcomWebhookHandler();
        const savedSecret = process.env.CAL_WEBHOOK_SECRET;
        process.env.CAL_WEBHOOK_SECRET = 'known-secret';
        const valid = handler.verifyWebhookSignature('{"type":"test"}', 'badsig');
        assert.strictEqual(valid, false);
        if (savedSecret !== undefined) process.env.CAL_WEBHOOK_SECRET = savedSecret;
        else delete process.env.CAL_WEBHOOK_SECRET;
    });

    await test('CalcomWebhookHandler accepts injected createLeadSequence', async () => {
        const calls = [];
        const handler = new CalcomWebhookHandler({
            createLeadSequence: async (payload) => { calls.push(payload); return payload; }
        });
        await handler.triggerPostMeetingFollowUp({
            id: 'bk_1',
            cal_booking_uid: 'uid_1',
            lead_id: 'lead_42'
        });
        assert.strictEqual(calls.length, 1);
        assert.strictEqual(calls[0].sequence_type, 'post_viewing');
        assert.strictEqual(calls[0].lead_id, 'lead_42');
    });

    // ─── CalcomWebhookManagement ──────────────────────────────────────────────
    const CalcomWebhookManagement = require('../lib/services/CalcomWebhookManagement');

    await test('CalcomWebhookManagement exports a class constructor', async () => {
        assert.strictEqual(typeof CalcomWebhookManagement, 'function');
        const mgmt = new CalcomWebhookManagement();
        assert.strictEqual(typeof mgmt.listWebhooks, 'function');
        assert.strictEqual(typeof mgmt.generateWebhookSecret, 'function');
    });

    await test('CalcomWebhookManagement backward-compat: named function exports still work', async () => {
        assert.strictEqual(typeof CalcomWebhookManagement.listWebhooks, 'function');
        assert.strictEqual(typeof CalcomWebhookManagement.generateWebhookSecret, 'function');
        assert.strictEqual(typeof CalcomWebhookManagement.testWebhook, 'function');
    });

    await test('CalcomWebhookManagement.listWebhooks returns mock data without DB', async () => {
        const mgmt = new CalcomWebhookManagement({ db: null });
        const hooks = await mgmt.listWebhooks();
        assert.ok(Array.isArray(hooks), 'should return an array');
    });

    await test('CalcomWebhookManagement.generateWebhookSecret returns whsec-prefixed string', async () => {
        const mgmt = new CalcomWebhookManagement();
        const secret = mgmt.generateWebhookSecret();
        assert.ok(typeof secret === 'string' && secret.startsWith('whsec_'), `expected whsec_ prefix, got: ${secret}`);
    });

    // ─── BookingLinkService integration ──────────────────────────────────────
    const BookingLinkService = require('../lib/services/BookingLinkService');

    await test('BookingLinkService accepts injected CalcomClient', async () => {
        const calls = [];
        const mockCalcom = {
            isConfigured: () => true,
            getEventTypes: async (opts) => {
                calls.push(opts);
                return [{ id: 1, slug: 'discovery-call', title: 'Discovery', isActive: true }];
            },
            generateBookingUrl: (slug, username) => `https://cal.com/${username}/${slug}`
        };

        const svc = new BookingLinkService({ calcomClient: mockCalcom });
        assert.strictEqual(svc.calcomClient, mockCalcom, 'should store injected client');
    });

    // ─── Summary ─────────────────────────────────────────────────────────────
    console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
    if (failed > 0) process.exit(1);
}

run().catch((err) => {
    console.error('Fatal:', err);
    process.exit(1);
});
