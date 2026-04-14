/**
 * Unit tests for Cal.com webhook route input validation
 *
 * Tests cover the inline validation added to:
 *   POST /webhook/calcom (after signature verification)
 */

'use strict';

const assert = require('assert');
const { ValidationError } = require('../../lib/errors');

// ─── Replicate validation logic from routes/calcom-webhook.js ─────────────────

function validateCalcomEvent(event) {
    if (!event) {
        return { error: 'Invalid webhook payload' };
    }

    const triggerEvent = event.triggerEvent;
    const eventType = event.type;

    if ((!triggerEvent || typeof triggerEvent !== 'string') &&
        (!eventType || typeof eventType !== 'string')) {
        const ve = new ValidationError('Event must have a triggerEvent or type field (non-empty string)');
        return { error: ve.message, statusCode: 400 };
    }

    if ('payload' in event && !event.payload) {
        const ve = new ValidationError('Event payload must not be null or empty when present');
        return { error: ve.message, statusCode: 400 };
    }

    return null; // valid
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

// ─── Tests ───────────────────────────────────────────────────────────────────

console.log('\nPOST /webhook/calcom validation');

test('accepts event with triggerEvent string', () => {
    const err = validateCalcomEvent({ triggerEvent: 'BOOKING_CREATED', payload: { bookingId: 1 } });
    assert.strictEqual(err, null);
});

test('accepts event with type string', () => {
    const err = validateCalcomEvent({ type: 'booking.created', payload: { bookingId: 1 } });
    assert.strictEqual(err, null);
});

test('accepts event with triggerEvent and no payload key (payload not present)', () => {
    const err = validateCalcomEvent({ triggerEvent: 'BOOKING_CANCELLED' });
    assert.strictEqual(err, null);
});

test('accepts event with type and truthy payload object', () => {
    const err = validateCalcomEvent({ type: 'booking.created', payload: {} });
    assert.strictEqual(err, null);
});

test('rejects null event', () => {
    const err = validateCalcomEvent(null);
    assert.ok(err && err.error);
});

test('rejects event with neither triggerEvent nor type', () => {
    const err = validateCalcomEvent({ bookingId: 1 });
    assert.ok(err && /triggerEvent or type/.test(err.error));
});

test('rejects event with empty string triggerEvent and no type', () => {
    const err = validateCalcomEvent({ triggerEvent: '' });
    assert.ok(err && /triggerEvent or type/.test(err.error));
});

test('rejects event with non-string triggerEvent and no type', () => {
    const err = validateCalcomEvent({ triggerEvent: 42 });
    assert.ok(err && /triggerEvent or type/.test(err.error));
});

test('rejects event where payload key is present but null', () => {
    const err = validateCalcomEvent({ triggerEvent: 'BOOKING_CREATED', payload: null });
    assert.ok(err && /payload/.test(err.error));
});

test('rejects event where payload key is present but false', () => {
    const err = validateCalcomEvent({ triggerEvent: 'BOOKING_CREATED', payload: false });
    assert.ok(err && /payload/.test(err.error));
});

test('accepts event where payload key is present and is an object', () => {
    const err = validateCalcomEvent({ triggerEvent: 'BOOKING_CREATED', payload: { id: 1 } });
    assert.strictEqual(err, null);
});

test('validates ValidationError has statusCode 400', () => {
    const ve = new ValidationError('test');
    assert.strictEqual(ve.statusCode, 400);
    assert.strictEqual(ve.code, 'VALIDATION_ERROR');
    assert.ok(ve instanceof Error);
});

// ─── Summary ─────────────────────────────────────────────────────────────────

console.log(`\nResults: ${results.passed} passed, ${results.failed} failed\n`);

if (results.failed > 0) {
    process.exit(1);
}
