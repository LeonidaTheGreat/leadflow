'use strict';

/**
 * E2E test: CalcomWebhookHandler dependency injection consistency
 * Verifies that injected createLeadSequence is used consistently
 * across ALL code paths (booking cancelled AND meeting ended).
 *
 * This test exposes the bug in handleBookingCancelled which calls
 * the module-level createLeadSequence instead of this.createLeadSequence.
 */

const assert = require('assert');
const CalcomWebhookHandler = require('../../lib/services/CalcomWebhookHandler');

let passed = 0;
let failed = 0;

async function check(name, fn) {
    try {
        await fn();
        console.log(`  ✅ ${name}`);
        passed++;
    } catch (error) {
        console.log(`  ❌ ${name}: ${error.message}`);
        failed++;
    }
}

// Build a DB mock that supports the full .from().update().eq().eq() / .from().update().eq().select().single() chains
function makeDbMock(bookingResult = { id: 'b1', lead_id: 'lead-1' }) {
    const noopChain = {
        select: () => noopChain,
        single: () => Promise.resolve({ data: bookingResult, error: null }),
        eq: () => noopChain,
        update: () => noopChain,
        insert: () => Promise.resolve({ error: null }),
        upsert: () => noopChain
    };

    return {
        from: () => noopChain
    };
}

async function run() {
    console.log('\n🧪 CalcomWebhookHandler DI consistency tests\n');

    // Test 1: injected createLeadSequence is called on MEETING_ENDED
    await check('injected createLeadSequence is called on MEETING_ENDED', async () => {
        let seqCalled = false;
        const mockCreateLeadSequence = async () => { seqCalled = true; };
        const handler = new CalcomWebhookHandler({ createLeadSequence: mockCreateLeadSequence });
        handler._db = makeDbMock();

        const booking = {
            uid: 'uid-1',
            attendees: [{ name: 'Test', email: 'test@example.com' }],
            eventTypeId: 1
        };

        await handler.handleMeetingEnded(booking);
        assert.strictEqual(seqCalled, true, 'Expected injected createLeadSequence to be called for MEETING_ENDED');
    });

    // Test 2: injected createLeadSequence is called on BOOKING_CANCELLED
    // This test FAILS because handleBookingCancelled (free function) calls the
    // module-level createLeadSequence instead of this.createLeadSequence.
    await check('injected createLeadSequence is called on BOOKING_CANCELLED', async () => {
        let seqCalled = false;
        const mockCreateLeadSequence = async () => { seqCalled = true; };
        const handler = new CalcomWebhookHandler({ createLeadSequence: mockCreateLeadSequence });
        handler._db = makeDbMock();

        const booking = {
            uid: 'uid-2',
            attendees: [{ name: 'Test', email: 'test@example.com' }],
            eventTypeId: 1,
            cancellationReason: 'no-show'
        };

        await handler.handleBookingCancelled(booking);
        assert.strictEqual(seqCalled, true,
            'Expected injected createLeadSequence to be called for BOOKING_CANCELLED. ' +
            'BUG: CalcomWebhookHandler.js line 523 calls module-level createLeadSequence ' +
            'instead of this.createLeadSequence — injected mock is bypassed.');
    });

    console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
    if (failed > 0) {
        console.log('Fix required: Change line 523 from `await createLeadSequence({` to `await this.createLeadSequence({`\n');
        process.exit(1);
    }
}

run().catch((error) => {
    console.error(error);
    process.exit(1);
});
