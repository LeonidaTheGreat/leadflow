/**
 * CalcomService integration test
 * Verifies the CalcomService consolidation refactor works correctly.
 * Confirms old calcom.js behavior is preserved via backward-compat shims.
 *
 * Run: node tests/integration/calcom-service.test.js
 */

'use strict';

const assert = require('assert');
const crypto = require('crypto');

// Set up env before requiring module
process.env.CAL_WEBHOOK_SECRET = 'test-secret-12345';
process.env.CAL_USERNAME = 'test-agent';
// Do NOT set CAL_API_KEY so isConfigured() returns false (no live API calls)

let passed = 0;
let failed = 0;

function pass(name) { console.log(`  PASS: ${name}`); passed++; }
function fail(name, err) { console.log(`  FAIL: ${name}: ${err}`); failed++; }

async function test(name, fn) {
    try { await fn(); pass(name); }
    catch (err) { fail(name, err.message); }
}

// ── 1. CalcomService class ──────────────────────────────────────────────────
console.log('\n1. CalcomService class');
const { CalcomService } = require('../../lib/services/CalcomService');

test('CalcomService class exports', async () => {
    assert.strictEqual(typeof CalcomService, 'function');
});
test('CalcomService instantiates', async () => {
    const svc = new CalcomService();
    assert.ok(svc instanceof CalcomService);
});
test('isConfigured returns false without API key', async () => {
    const svc = new CalcomService();
    assert.strictEqual(svc.isConfigured(), false);
});
test('isConfigured returns true with API key', async () => {
    const svc = new CalcomService({ apiKey: 'test-key' });
    assert.strictEqual(svc.isConfigured(), true);
});
test('webhookSecret falls back to env', async () => {
    const svc = new CalcomService();
    assert.strictEqual(svc.webhookSecret, 'test-secret-12345');
});
test('username falls back to env', async () => {
    const svc = new CalcomService();
    assert.strictEqual(svc.username, 'test-agent');
});

// ── 2. API client methods present ───────────────────────────────────────────
console.log('\n2. API client methods');
const svc = new CalcomService();
for (const method of ['getEventTypes', 'getEventType', 'getAvailableSlots', 'createBooking',
    'getBooking', 'cancelBooking', 'rescheduleBooking', 'getMe', 'getTeamMembers',
    'generateBookingUrl', 'calApiRequest']) {
    test(`${method} is a function`, async () => {
        assert.strictEqual(typeof svc[method], 'function');
    });
}

// ── 3. Mock behavior (no API key) ────────────────────────────────────────────
console.log('\n3. Mock behavior when unconfigured');
test('getEventTypes returns mock array when unconfigured', async () => {
    const types = await svc.getEventTypes();
    assert.ok(Array.isArray(types), 'should return array');
    assert.ok(types.length > 0, 'mock data should not be empty');
    assert.ok(types[0].id !== undefined, 'mock event types should have id');
});
test('generateBookingUrl uses username from env', async () => {
    const url = svc.generateBookingUrl('30min');
    assert.ok(url, 'should return a URL');
    assert.ok(url.includes('test-agent'), 'URL should include username');
    assert.ok(url.includes('30min'), 'URL should include slug');
});

// ── 4. Webhook signature verification ───────────────────────────────────────
console.log('\n4. Webhook signature verification');
test('verifyWebhookSignature validates correct signature', async () => {
    const secret = 'test-secret-12345';
    const payload = JSON.stringify({ test: 'payload' });
    const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    const result = svc.verifyWebhookSignature(payload, sig);
    assert.strictEqual(result, true);
});
test('verifyWebhookSignature rejects wrong signature', async () => {
    const wrong = 'wrongsig0000000000000000000000000000000000000000000000000000000000';
    const result = svc.verifyWebhookSignature('{"test":"payload"}', wrong);
    assert.strictEqual(result, false);
});

// ── 5. Webhook management methods present ───────────────────────────────────
console.log('\n5. Webhook management methods');
for (const method of ['listWebhooks', 'registerWebhook', 'deleteWebhook', 'updateWebhook',
    'getWebhook', 'logWebhookDelivery', 'getWebhookDeliveryLogs', 'getWebhookStats',
    'testWebhook', 'generateWebhookSecret']) {
    test(`${method} is a function`, async () => {
        assert.strictEqual(typeof svc[method], 'function');
    });
}
test('generateWebhookSecret returns a non-empty string', async () => {
    const secret = svc.generateWebhookSecret();
    assert.strictEqual(typeof secret, 'string');
    assert.ok(secret.length >= 16, 'secret should be at least 16 chars');
});
test('generateWebhookSecret produces unique values', async () => {
    const s1 = svc.generateWebhookSecret();
    const s2 = svc.generateWebhookSecret();
    assert.notStrictEqual(s1, s2);
});
test('registerWebhook validates subscriberUrl', async () => {
    try {
        await svc.registerWebhook({ subscriberUrl: '', eventTriggers: ['BOOKING_CREATED'] });
        assert.fail('should throw');
    } catch (e) {
        assert.ok(e.message.includes('subscriberUrl'));
    }
});
test('registerWebhook validates eventTriggers', async () => {
    try {
        await svc.registerWebhook({ subscriberUrl: 'https://example.com', eventTriggers: [] });
        assert.fail('should throw');
    } catch (e) {
        assert.ok(e.message.includes('eventTriggers'));
    }
});
test('registerWebhook rejects invalid URL', async () => {
    try {
        await svc.registerWebhook({ subscriberUrl: 'not-a-url', eventTriggers: ['BOOKING_CREATED'] });
        assert.fail('should throw');
    } catch (e) {
        assert.ok(e.message.toLowerCase().includes('url') || e.message.toLowerCase().includes('invalid'));
    }
});
test('listWebhooks returns mock array when no DB', async () => {
    const result = await svc.listWebhooks();
    assert.ok(Array.isArray(result));
});

// ── 6. Retry utilities ───────────────────────────────────────────────────────
console.log('\n6. Retry utilities');
test('sleep resolves after delay', async () => {
    const start = Date.now();
    await svc.sleep(10);
    assert.ok(Date.now() - start >= 9);
});
test('calculateBackoffDelay returns positive number', async () => {
    const delay = svc.calculateBackoffDelay(0);
    assert.ok(typeof delay === 'number');
    assert.ok(delay > 0);
});
test('withRetry succeeds on first try', async () => {
    let calls = 0;
    const result = await svc.withRetry(() => { calls++; return Promise.resolve('ok'); }, {}, 'test');
    assert.strictEqual(result, 'ok');
    assert.strictEqual(calls, 1);
});
test('withRetry retries and succeeds on second try', async () => {
    let calls = 0;
    const result = await svc.withRetry(
        () => {
            calls++;
            if (calls < 2) throw new Error('transient error');
            return Promise.resolve('retry-ok');
        },
        { maxRetries: 2 },
        'retry-test'
    );
    assert.strictEqual(result, 'retry-ok');
    assert.strictEqual(calls, 2);
});

// ── 7. Backward compat shims (old calcom.js behavior preserved) ─────────────
console.log('\n7. Backward compat shims');
const calcom = require('../../lib/calcom');
const calcomHandler = require('../../lib/calcom-webhook-handler');
const calcomMgmt = require('../../lib/calcom-webhook-management');

for (const [mod, name, methods] of [
    [calcom, 'lib/calcom.js', ['getEventTypes', 'createBooking', 'isConfigured', 'generateBookingUrl', 'CAL_API_BASE_URL']],
    [calcomHandler, 'lib/calcom-webhook-handler.js', ['handleCalWebhook', 'verifyWebhookSignature', 'handleBookingCreated', 'handleBookingRescheduled', 'handleBookingCancelled', 'handleMeetingEnded']],
    [calcomMgmt, 'lib/calcom-webhook-management.js', ['listWebhooks', 'registerWebhook', 'generateWebhookSecret']],
]) {
    for (const method of methods) {
        test(`${name}.${method} exists`, async () => {
            assert.ok(mod[method] !== undefined, `${method} should be exported`);
            if (method !== 'CAL_API_BASE_URL') {
                assert.strictEqual(typeof mod[method], 'function');
            }
        });
    }
}

test('calcom.js isConfigured() works via shim', async () => {
    const result = calcom.isConfigured();
    assert.strictEqual(typeof result, 'boolean');
});
test('calcom.js getEventTypes() returns array via shim', async () => {
    const types = await calcom.getEventTypes();
    assert.ok(Array.isArray(types));
});
test('calcom.js generateBookingUrl() works via shim', async () => {
    const url = calcom.generateBookingUrl('30min', 'test-agent');
    assert.ok(url.includes('test-agent'));
});
test('calcom-webhook-handler.js verifyWebhookSignature works via shim', async () => {
    const secret = 'test-secret-12345';
    const payload = JSON.stringify({ test: 'data' });
    const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    const result = calcomHandler.verifyWebhookSignature(payload, sig);
    assert.strictEqual(result, true);
});

// ── Summary ──────────────────────────────────────────────────────────────────
setTimeout(() => {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`Results: ${passed} passed, ${failed} failed`);
    console.log('='.repeat(50));
    if (failed > 0) process.exit(1);
    console.log('\nAll tests passed!');
}, 200);
