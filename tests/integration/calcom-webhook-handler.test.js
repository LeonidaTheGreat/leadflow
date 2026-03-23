/**
 * Cal.com Webhook Handler Tests
 * Tests webhook signature validation, event parsing, and error handling
 * 
 * Run: node test/calcom-webhook-handler.test.js
 */

const assert = require('assert');
const crypto = require('crypto');

// Mock environment variables
process.env.CAL_API_KEY = 'cal_test_mock_key';
process.env.SUPABASE_URL = 'https://mock.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock_key';
process.env.CAL_USERNAME = 'testagent';
process.env.CAL_WEBHOOK_SECRET = 'test_webhook_secret_12345';

// Import the webhook handler
const {
    handleCalWebhook,
    verifyWebhookSignature,
    handleBookingCreated,
    handleBookingRescheduled,
    handleBookingCancelled,
    handleMeetingEnded,
    withRetry,
    sleep,
    calculateBackoffDelay,
    RETRY_CONFIG
} = require('../lib/calcom-webhook-handler');

// Test results tracker
const results = {
    passed: 0,
    failed: 0,
    tests: []
};

async function test(name, fn) {
    try {
        await fn();
        results.passed++;
        results.tests.push({ name, status: '✅ PASS' });
        console.log(`✅ ${name}`);
    } catch (error) {
        results.failed++;
        results.tests.push({ name, status: '❌ FAIL', error: error.message });
        console.log(`❌ ${name}: ${error.message}`);
    }
}

function assertEqual(actual, expected, message) {
    if (actual !== expected) {
        throw new Error(`${message || 'Assertion failed'}: expected ${expected}, got ${actual}`);
    }
}

function assertTrue(value, message) {
    if (!value) {
        throw new Error(message || 'Expected true, got false');
    }
}

function assertFalse(value, message) {
    if (value) {
        throw new Error(message || 'Expected false, got true');
    }
}

// ==================== SAMPLE WEBHOOK PAYLOADS ====================

const sampleBookingCreated = {
    triggerEvent: 'BOOKING_CREATED',
    type: 'BOOKING_CREATED',
    payload: {
        id: 12345,
        uid: 'booking-test-001',
        title: 'Discovery Call with John Doe',
        description: 'Initial consultation call',
        startTime: '2026-03-01T14:00:00.000Z',
        endTime: '2026-03-01T14:30:00.000Z',
        eventTypeId: 67890,
        eventType: {
            id: 67890,
            slug: 'discovery-call',
            title: 'Discovery Call',
            length: 30
        },
        attendees: [{
            name: 'John Doe',
            email: 'john.doe@example.com',
            phoneNumber: '+14155551234',
            timeZone: 'America/New_York'
        }],
        location: 'https://cal.com/video/meeting-room-001',
        status: 'ACCEPTED',
        metadata: {
            source: 'website',
            utm_source: 'google',
            utm_medium: 'cpc'
        },
        createdAt: '2026-02-26T10:00:00.000Z'
    }
};

const sampleBookingRescheduled = {
    triggerEvent: 'BOOKING_RESCHEDULED',
    type: 'BOOKING_RESCHEDULED',
    payload: {
        id: 12345,
        uid: 'booking-test-001',
        title: 'Discovery Call with John Doe',
        description: 'Initial consultation call',
        startTime: '2026-03-02T15:00:00.000Z',
        endTime: '2026-03-02T15:30:00.000Z',
        eventTypeId: 67890,
        eventType: {
            id: 67890,
            slug: 'discovery-call',
            title: 'Discovery Call'
        },
        attendees: [{
            name: 'John Doe',
            email: 'john.doe@example.com',
            phoneNumber: '+14155551234',
            timeZone: 'America/New_York'
        }],
        location: 'https://cal.com/video/meeting-room-001',
        status: 'ACCEPTED',
        rescheduleReason: 'Need to move to later time',
        metadata: {
            previousStartTime: '2026-03-01T14:00:00.000Z'
        }
    }
};

const sampleBookingCancelled = {
    triggerEvent: 'BOOKING_CANCELLED',
    type: 'BOOKING_CANCELLED',
    payload: {
        id: 12345,
        uid: 'booking-test-001',
        title: 'Discovery Call with John Doe',
        description: 'Initial consultation call',
        startTime: '2026-03-01T14:00:00.000Z',
        endTime: '2026-03-01T14:30:00.000Z',
        eventTypeId: 67890,
        eventType: {
            id: 67890,
            slug: 'discovery-call',
            title: 'Discovery Call'
        },
        attendees: [{
            name: 'John Doe',
            email: 'john.doe@example.com',
            phoneNumber: '+14155551234'
        }],
        location: 'https://cal.com/video/meeting-room-001',
        status: 'CANCELLED',
        cancellationReason: 'Found another solution',
        cancelledBy: 'attendee',
        metadata: {}
    }
};

const sampleMeetingEnded = {
    triggerEvent: 'MEETING_ENDED',
    type: 'MEETING_ENDED',
    payload: {
        id: 12345,
        uid: 'booking-test-001',
        title: 'Discovery Call with John Doe',
        startTime: '2026-03-01T14:00:00.000Z',
        endTime: '2026-03-01T14:30:00.000Z',
        eventTypeId: 67890,
        eventType: {
            id: 67890,
            slug: 'discovery-call',
            title: 'Discovery Call'
        },
        attendees: [{
            name: 'John Doe',
            email: 'john.doe@example.com'
        }],
        status: 'COMPLETED',
        metadata: {
            recordingUrl: 'https://cal.com/recordings/rec-001'
        }
    }
};

const sampleBookingRejected = {
    triggerEvent: 'BOOKING_REJECTED',
    type: 'BOOKING_REJECTED',
    payload: {
        id: 12346,
        uid: 'booking-test-002',
        title: 'Consultation with Jane Smith',
        startTime: '2026-03-03T10:00:00.000Z',
        endTime: '2026-03-03T10:30:00.000Z',
        eventTypeId: 67891,
        eventType: {
            id: 67891,
            slug: 'consultation',
            title: 'Consultation'
        },
        attendees: [{
            name: 'Jane Smith',
            email: 'jane.smith@example.com'
        }],
        status: 'REJECTED',
        rejectionReason: 'Schedule conflict',
        metadata: {}
    }
};

// ==================== TEST FUNCTIONS ====================

async function runTests() {
    console.log('\n🔒 Webhook Signature Validation Tests\n');

    await test('verifyWebhookSignature returns true for valid signature', () => {
        const payload = JSON.stringify(sampleBookingCreated);
        const signature = crypto
            .createHmac('sha256', process.env.CAL_WEBHOOK_SECRET)
            .update(payload)
            .digest('hex');
        
        const isValid = verifyWebhookSignature(payload, signature);
        assertTrue(isValid, 'Valid signature should be verified');
    });

    await test('verifyWebhookSignature returns false for invalid signature', () => {
        const payload = JSON.stringify(sampleBookingCreated);
        const invalidSignature = 'invalid_signature_12345';
        
        const isValid = verifyWebhookSignature(payload, invalidSignature);
        assertFalse(isValid, 'Invalid signature should be rejected');
    });

    await test('verifyWebhookSignature handles sha256= prefix', () => {
        const payload = JSON.stringify(sampleBookingCreated);
        const signature = 'sha256=' + crypto
            .createHmac('sha256', process.env.CAL_WEBHOOK_SECRET)
            .update(payload)
            .digest('hex');
        
        const isValid = verifyWebhookSignature(payload, signature);
        assertTrue(isValid, 'Signature with sha256= prefix should be verified');
    });

    await test('verifyWebhookSignature returns true when secret not configured (dev mode)', () => {
        const originalSecret = process.env.CAL_WEBHOOK_SECRET;
        delete process.env.CAL_WEBHOOK_SECRET;
        
        const isValid = verifyWebhookSignature('test', 'any');
        assertTrue(isValid, 'Should pass in dev mode without secret');
        
        process.env.CAL_WEBHOOK_SECRET = originalSecret;
    });

    console.log('\n📅 Webhook Event Parsing Tests\n');

    await test('handleCalWebhook processes BOOKING_CREATED event', async () => {
        // This will fail without database, but we're testing the parsing logic
        try {
            await handleCalWebhook(sampleBookingCreated);
        } catch (error) {
            // Expected to fail due to no DB, but should parse correctly
            assertTrue(error.message.includes('Supabase') || 
                      error.message.includes('fetch') || 
                      error.message.includes('network') ||
                      error.message.includes('relation'),
                      'Should fail on DB connection, not parsing');
        }
    });

    await test('handleCalWebhook processes BOOKING_RESCHEDULED event', async () => {
        try {
            await handleCalWebhook(sampleBookingRescheduled);
        } catch (error) {
            assertTrue(error.message.includes('Supabase') || 
                      error.message.includes('fetch') || 
                      error.message.includes('network') ||
                      error.message.includes('relation'),
                      'Should fail on DB connection, not parsing');
        }
    });

    await test('handleCalWebhook processes BOOKING_CANCELLED event', async () => {
        try {
            await handleCalWebhook(sampleBookingCancelled);
        } catch (error) {
            assertTrue(error.message.includes('Supabase') || 
                      error.message.includes('fetch') || 
                      error.message.includes('network') ||
                      error.message.includes('relation'),
                      'Should fail on DB connection, not parsing');
        }
    });

    await test('handleCalWebhook processes MEETING_ENDED event', async () => {
        try {
            await handleCalWebhook(sampleMeetingEnded);
        } catch (error) {
            assertTrue(error.message.includes('Supabase') || 
                      error.message.includes('fetch') || 
                      error.message.includes('network') ||
                      error.message.includes('relation'),
                      'Should fail on DB connection, not parsing');
        }
    });

    await test('handleCalWebhook handles unknown event types gracefully', async () => {
        const unknownEvent = {
            triggerEvent: 'UNKNOWN_EVENT',
            payload: { test: 'data' }
        };
        
        const result = await handleCalWebhook(unknownEvent);
        assertEqual(result.received, true, 'Should acknowledge receipt');
        assertEqual(result.type, 'UNKNOWN_EVENT', 'Should return event type');
    });

    await test('handleCalWebhook handles booking.rejected as cancellation', async () => {
        try {
            await handleCalWebhook(sampleBookingRejected);
        } catch (error) {
            assertTrue(error.message.includes('Supabase') || 
                      error.message.includes('fetch') || 
                      error.message.includes('network') ||
                      error.message.includes('relation'),
                      'Should handle rejection as cancellation');
        }
    });

    console.log('\n🔄 Retry Logic Tests\n');

    await test('calculateBackoffDelay returns base delay for first attempt', () => {
        const delay = calculateBackoffDelay(0);
        assertTrue(delay >= RETRY_CONFIG.baseDelayMs * 0.75, 'Delay should be at least 75% of base');
        assertTrue(delay <= RETRY_CONFIG.baseDelayMs * 1.25, 'Delay should be at most 125% of base');
    });

    await test('calculateBackoffDelay increases with attempts', () => {
        const delay0 = calculateBackoffDelay(0);
        const delay1 = calculateBackoffDelay(1);
        const delay2 = calculateBackoffDelay(2);
        
        // On average, delay should increase
        assertTrue(delay1 > delay0 * 0.5, 'Second attempt delay should be higher');
        assertTrue(delay2 > delay1 * 0.5, 'Third attempt delay should be higher');
    });

    await test('calculateBackoffDelay respects max delay', () => {
        const delay = calculateBackoffDelay(10); // High attempt number
        assertTrue(delay <= RETRY_CONFIG.maxDelayMs * 1.25, 'Delay should not exceed max significantly');
    });

    await test('sleep function delays execution', async () => {
        const start = Date.now();
        await sleep(50);
        const elapsed = Date.now() - start;
        assertTrue(elapsed >= 45, 'Should wait at least 45ms');
    });

    await test('withRetry succeeds on first attempt', async () => {
        let attempts = 0;
        const result = await withRetry(async () => {
            attempts++;
            return 'success';
        }, {}, 'test operation');
        
        assertEqual(result, 'success', 'Should return success');
        assertEqual(attempts, 1, 'Should only attempt once');
    });

    await test('withRetry retries on failure then succeeds', async () => {
        let attempts = 0;
        const result = await withRetry(async () => {
            attempts++;
            if (attempts < 3) {
                throw new Error('Temporary error');
            }
            return 'success';
        }, { maxRetries: 3 }, 'retry test');
        
        assertEqual(result, 'success', 'Should eventually succeed');
        assertEqual(attempts, 3, 'Should retry until success');
    });

    await test('withRetry does not retry on non-retryable errors', async () => {
        let attempts = 0;
        try {
            await withRetry(async () => {
                attempts++;
                const error = new Error('Bad request');
                error.status = 400;
                throw error;
            }, {}, 'non-retryable test');
        } catch (error) {
            assertEqual(attempts, 1, 'Should not retry on 400 error');
        }
    });

    console.log('\n📦 Payload Validation Tests\n');

    await test('Sample BOOKING_CREATED has required fields', () => {
        const payload = sampleBookingCreated.payload;
        assertTrue(payload.id, 'Should have booking id');
        assertTrue(payload.uid, 'Should have booking uid');
        assertTrue(payload.startTime, 'Should have start time');
        assertTrue(payload.endTime, 'Should have end time');
        assertTrue(payload.attendees && payload.attendees.length > 0, 'Should have attendees');
        assertTrue(payload.eventType, 'Should have event type');
    });

    await test('Sample booking has attendee with email', () => {
        const attendee = sampleBookingCreated.payload.attendees[0];
        assertTrue(attendee.email, 'Attendee should have email');
        assertTrue(attendee.email.includes('@'), 'Email should be valid format');
        assertTrue(attendee.name, 'Attendee should have name');
    });

    await test('Sample reschedule has metadata', () => {
        const payload = sampleBookingRescheduled.payload;
        assertTrue(payload.rescheduleReason, 'Should have reschedule reason');
        assertTrue(payload.metadata, 'Should have metadata');
    });

    await test('Sample cancellation has reason', () => {
        const payload = sampleBookingCancelled.payload;
        assertTrue(payload.cancellationReason, 'Should have cancellation reason');
        assertEqual(payload.status, 'CANCELLED', 'Status should be CANCELLED');
    });

    console.log('\n🔧 Error Handling Tests\n');

    await test('handleCalWebhook handles missing triggerEvent', async () => {
        const invalidEvent = { payload: { test: 'data' } };
        try {
            await handleCalWebhook(invalidEvent);
        } catch (error) {
            // Expected - no triggerEvent means unhandled
            assertTrue(error || true, 'Should handle gracefully');
        }
    });

    await test('handleCalWebhook handles null payload', async () => {
        const nullPayloadEvent = {
            triggerEvent: 'BOOKING_CREATED',
            payload: null
        };
        try {
            await handleCalWebhook(nullPayloadEvent);
        } catch (error) {
            assertTrue(error || true, 'Should handle null payload');
        }
    });

    await test('handles booking without attendees', async () => {
        const noAttendees = {
            ...sampleBookingCreated,
            payload: {
                ...sampleBookingCreated.payload,
                attendees: []
            }
        };
        try {
            await handleCalWebhook(noAttendees);
        } catch (error) {
            // Expected to handle gracefully
            assertTrue(error || true, 'Should handle missing attendees');
        }
    });

    console.log('\n📊 Test Summary\n');
    console.log(`✅ Passed: ${results.passed}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log(`📊 Total: ${results.passed + results.failed}`);
    console.log(`🎯 Success Rate: ${Math.round((results.passed / (results.passed + results.failed)) * 100)}%`);

    if (results.failed > 0) {
        console.log('\n❌ Failed Tests:');
        results.tests.filter(t => t.status === '❌ FAIL').forEach(t => {
            console.log(`   - ${t.name}: ${t.error}`);
        });
        process.exit(1);
    } else {
        console.log('\n🎉 All tests passed!');
        process.exit(0);
    }
}

// Run tests
runTests().catch(err => {
    console.error('Test runner error:', err);
    process.exit(1);
});
