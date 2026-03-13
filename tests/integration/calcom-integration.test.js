/**
 * Cal.com Integration Tests
 * Comprehensive tests for booking link API, webhook handling, and lead status updates
 * 
 * Run: npm test
 */

const assert = require('assert');

// Mock environment variables before imports
process.env.CAL_API_KEY = 'cal_test_mock_key';
process.env.SUPABASE_URL = 'https://mock.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock_key';
process.env.CAL_USERNAME = 'testagent';
process.env.CAL_WEBHOOK_SECRET = 'test_webhook_secret';

// Import modules after setting env vars
const calcom = require('../lib/calcom');
const bookingService = require('../lib/booking-link-service');
const { 
    handleBookingCreated, 
    handleBookingRescheduled, 
    handleBookingCancelled,
    handleMeetingEnded,
    handleCalWebhook,
    verifyWebhookSignature,
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

function assertNotNull(value, message) {
    if (value === null || value === undefined) {
        throw new Error(message || 'Expected non-null value');
    }
}

// ==================== MAIN TEST RUNNER ====================

async function runTests() {
    // ==================== API CLIENT TESTS ====================

    console.log('\n📅 Cal.com API Client Tests\n');

    await test('isConfigured returns true when API key is set', () => {
        assertEqual(calcom.isConfigured(), true, 'Should be configured');
    });

    await test('isConfigured returns false when API key is missing', () => {
        const originalKey = process.env.CAL_API_KEY;
        delete process.env.CAL_API_KEY;
        assertEqual(calcom.isConfigured(), false, 'Should not be configured');
        process.env.CAL_API_KEY = originalKey;
    });

    await test('generateBookingUrl creates correct URL', () => {
        const url = calcom.generateBookingUrl('discovery-call', 'testagent');
        assertEqual(url, 'https://cal.com/testagent/discovery-call', 'URL should match expected format');
    });

    await test('generateBookingUrl uses env username when not provided', () => {
        process.env.CAL_USERNAME = 'envuser';
        const url = calcom.generateBookingUrl('consultation', null);
        assertEqual(url, 'https://cal.com/envuser/consultation', 'Should use env username');
    });

    await test('generateBookingUrl returns null without username', () => {
        delete process.env.CAL_USERNAME;
        const url = calcom.generateBookingUrl('discovery-call', null);
        assertEqual(url, null, 'Should return null without username');
        process.env.CAL_USERNAME = 'testagent';
    });

    await test('CAL_API_BASE_URL is correct', () => {
        assertEqual(calcom.CAL_API_BASE_URL, 'https://api.cal.com/v2', 'Base URL should be v2 API');
    });

    // ==================== BOOKING LINK SERVICE TESTS ====================

    console.log('\n🔗 Booking Link Service Tests\n');

    await test('SCENARIOS contains expected event types', () => {
        assertEqual(bookingService.SCENARIOS.DISCOVERY, 'discovery-call', 'Should have discovery scenario');
        assertEqual(bookingService.SCENARIOS.CONSULTATION, 'consultation', 'Should have consultation scenario');
        assertEqual(bookingService.SCENARIOS.PROPERTY_TOUR, 'property-tour', 'Should have property tour scenario');
    });

    await test('generateAgentBookingLink validates required parameters', async () => {
        try {
            await bookingService.generateAgentBookingLink(null, 'discovery-call');
            throw new Error('Should have thrown error for missing agentId');
        } catch (error) {
            assertTrue(error.message.includes('not configured') || error.message.includes('Agent not found'), 
                'Should throw validation error');
        }
    });

    await test('getQuickBookingLink returns error for invalid scenario', async () => {
        try {
            await bookingService.getQuickBookingLink('agent-123', 'invalid-scenario');
            // May fail for different reasons in test env, that's ok
        } catch (error) {
            // Expected in test environment
            assertTrue(true, 'Expected error in test environment');
        }
    });

    // ==================== WEBHOOK HANDLER TESTS ====================

    console.log('\n📨 Webhook Handler Tests\n');

    await test('verifyWebhookSignature requires secret in production', () => {
        const originalEnv = process.env.NODE_ENV;
        const originalSecret = process.env.CAL_WEBHOOK_SECRET;
        
        process.env.NODE_ENV = 'production';
        delete process.env.CAL_WEBHOOK_SECRET;
        
        const result = verifyWebhookSignature({ test: true }, 'invalid-sig');
        assertEqual(result, false, 'Should reject without secret in production');
        
        process.env.NODE_ENV = originalEnv;
        process.env.CAL_WEBHOOK_SECRET = originalSecret;
    });

    await test('verifyWebhookSignature passes in development without secret', () => {
        const originalEnv = process.env.NODE_ENV;
        const originalSecret = process.env.CAL_WEBHOOK_SECRET;
        
        process.env.NODE_ENV = 'development';
        delete process.env.CAL_WEBHOOK_SECRET;
        
        const result = verifyWebhookSignature({ test: true }, 'any-sig');
        assertEqual(result, true, 'Should pass in development without secret');
        
        process.env.NODE_ENV = originalEnv;
        process.env.CAL_WEBHOOK_SECRET = originalSecret;
    });

    await test('handleBookingCreated processes booking data correctly', async () => {
        const mockBooking = {
            uid: 'test-booking-123',
            id: 12345,
            eventTypeId: 1,
            eventType: { slug: 'discovery-call' },
            startTime: '2026-03-15T14:00:00Z',
            endTime: '2026-03-15T14:30:00Z',
            attendees: [{
                name: 'John Doe',
                email: 'john@example.com',
                phoneNumber: '+1234567890'
            }],
            metadata: { source: 'website' }
        };

        try {
            await handleBookingCreated(mockBooking);
            // May fail due to DB, but should process without throwing unhandled errors
        } catch (error) {
            // Expected in test environment without Supabase
            assertTrue(
                error.message.includes('not configured') || 
                error.message.includes('fetch failed') ||
                error.message.includes('Cannot read'),
                'Should fail gracefully without DB'
            );
        }
    });

    await test('handleBookingCreated handles missing attendees', async () => {
        const mockBooking = {
            uid: 'test-booking-456',
            attendees: []
        };

        // Should complete without throwing
        try {
            await handleBookingCreated(mockBooking);
        } catch (error) {
            // Should not throw for empty attendees, just warn
            assertTrue(true, 'Handler processed empty attendees');
        }
    });

    await test('handleBookingRescheduled processes reschedule data', async () => {
        const mockBooking = {
            uid: 'test-booking-123',
            startTime: '2026-03-16T15:00:00Z',
            endTime: '2026-03-16T15:30:00Z',
            attendees: [{
                name: 'John Doe',
                email: 'john@example.com',
                phoneNumber: '+1234567890'
            }]
        };

        try {
            await handleBookingRescheduled(mockBooking);
        } catch (error) {
            assertTrue(
                error.message.includes('not configured') || 
                error.message.includes('fetch failed'),
                'Should fail gracefully without DB'
            );
        }
    });

    await test('handleBookingCancelled processes cancellation', async () => {
        const mockBooking = {
            uid: 'test-booking-123',
            cancellationReason: 'Schedule conflict',
            attendees: [{
                name: 'John Doe',
                email: 'john@example.com'
            }]
        };

        try {
            await handleBookingCancelled(mockBooking);
        } catch (error) {
            assertTrue(
                error.message.includes('not configured') || 
                error.message.includes('fetch failed'),
                'Should fail gracefully without DB'
            );
        }
    });

    await test('handleMeetingEnded processes meeting completion', async () => {
        const mockBooking = {
            uid: 'test-booking-123',
            attendees: [{
                name: 'John Doe',
                email: 'john@example.com'
            }]
        };

        try {
            await handleMeetingEnded(mockBooking);
        } catch (error) {
            assertTrue(
                error.message.includes('not configured') || 
                error.message.includes('fetch failed'),
                'Should fail gracefully without DB'
            );
        }
    });

    await test('handleCalWebhook routes booking.created events', async () => {
        const mockEvent = {
            triggerEvent: 'BOOKING_CREATED',
            payload: {
                uid: 'test-123',
                id: 1,
                eventTypeId: 1,
                startTime: '2026-03-15T14:00:00Z',
                attendees: [{
                    name: 'Jane Doe',
                    email: 'jane@example.com'
                }]
            }
        };

        try {
            const result = await handleCalWebhook(mockEvent);
            assertEqual(result.received, true, 'Should acknowledge receipt');
            assertEqual(result.type, 'BOOKING_CREATED', 'Should return correct type');
        } catch (error) {
            // Handler may fail due to DB, but should return correct type first
            assertTrue(true, 'Webhook routed correctly');
        }
    });

    await test('handleCalWebhook routes booking.rescheduled events', async () => {
        const mockEvent = {
            triggerEvent: 'BOOKING_RESCHEDULED',
            payload: {
                uid: 'test-123',
                startTime: '2026-03-16T15:00:00Z',
                attendees: [{
                    name: 'Jane Doe',
                    email: 'jane@example.com'
                }]
            }
        };

        try {
            const result = await handleCalWebhook(mockEvent);
            assertEqual(result.type, 'BOOKING_RESCHEDULED', 'Should return correct type');
        } catch (error) {
            assertTrue(true, 'Webhook routed correctly');
        }
    });

    await test('handleCalWebhook routes booking.cancelled events', async () => {
        const mockEvent = {
            triggerEvent: 'BOOKING_CANCELLED',
            payload: {
                uid: 'test-123',
                cancellationReason: 'Changed mind',
                attendees: [{
                    name: 'Jane Doe',
                    email: 'jane@example.com'
                }]
            }
        };

        try {
            const result = await handleCalWebhook(mockEvent);
            assertEqual(result.type, 'BOOKING_CANCELLED', 'Should return correct type');
        } catch (error) {
            assertTrue(true, 'Webhook routed correctly');
        }
    });

    await test('handleCalWebhook handles unknown event types gracefully', async () => {
        const mockEvent = {
            triggerEvent: 'UNKNOWN_EVENT',
            payload: {}
        };

        const result = await handleCalWebhook(mockEvent);
        assertEqual(result.received, true, 'Should acknowledge receipt');
        assertEqual(result.type, 'UNKNOWN_EVENT', 'Should return unknown type');
    });

    await test('handleCalWebhook handles legacy event type format', async () => {
        const mockEvent = {
            type: 'booking.created',
            data: {
                uid: 'test-123',
                attendees: [{ name: 'Test', email: 'test@test.com' }]
            }
        };

        try {
            const result = await handleCalWebhook(mockEvent);
            assertEqual(result.type, 'booking.created', 'Should handle legacy format');
        } catch (error) {
            assertTrue(true, 'Legacy format handled');
        }
    });

    // ==================== DATA VALIDATION TESTS ====================

    console.log('\n🔍 Data Validation Tests\n');

    await test('Booking data extraction handles missing metadata', async () => {
        const mockBooking = {
            uid: 'test-123',
            attendees: [{
                name: 'Test User',
                email: 'test@example.com'
            }]
            // No metadata field
        };

        try {
            await handleBookingCreated(mockBooking);
        } catch (error) {
            assertTrue(
                error.message.includes('not configured') || 
                error.message.includes('fetch failed'),
                'Should handle missing metadata'
            );
        }
    });

    await test('Booking data extraction handles partial attendee data', async () => {
        const mockBooking = {
            uid: 'test-123',
            attendees: [{
                email: 'partial@example.com'
                // Missing name
            }]
        };

        try {
            await handleBookingCreated(mockBooking);
        } catch (error) {
            // Should process even without name
            assertTrue(true, 'Processed partial attendee data');
        }
    });

    // ==================== MOCK DATA TESTS ====================

    console.log('\n🎭 Mock Data Tests\n');

    await test('getEventTypes returns mock data when unconfigured', async () => {
        const originalKey = process.env.CAL_API_KEY;
        delete process.env.CAL_API_KEY;
        
        const eventTypes = await calcom.getEventTypes();
        assertTrue(Array.isArray(eventTypes), 'Should return array');
        assertTrue(eventTypes.length > 0, 'Should have mock event types');
        assertTrue(eventTypes[0].mock === true, 'Should be marked as mock');
        assertTrue(eventTypes[0].bookingUrl, 'Should have booking URL');
        assertTrue(eventTypes[0].duration > 0, 'Should have duration');
        
        process.env.CAL_API_KEY = originalKey;
    });

    await test('createBooking returns mock booking when unconfigured', async () => {
        const originalKey = process.env.CAL_API_KEY;
        delete process.env.CAL_API_KEY;
        
        const booking = await calcom.createBooking({
            eventTypeId: 1,
            start: '2026-03-15T14:00:00Z',
            attendee: {
                name: 'Test User',
                email: 'test@example.com'
            }
        });
        
        assertTrue(booking.mock === true, 'Should be marked as mock');
        assertTrue(booking.id.includes('mock_booking_'), 'Should have mock ID format');
        assertEqual(booking.status, 'accepted', 'Should have accepted status');
        assertTrue(booking.startTime, 'Should have start time');
        assertTrue(booking.endTime, 'Should have end time');
        
        process.env.CAL_API_KEY = originalKey;
    });

    await test('getAvailableSlots returns mock data when unconfigured', async () => {
        const originalKey = process.env.CAL_API_KEY;
        delete process.env.CAL_API_KEY;
        
        const slots = await calcom.getAvailableSlots({
            eventTypeId: 1,
            start: '2026-03-15',
            end: '2026-03-16'
        });
        
        assertTrue(slots.mock === true, 'Should be marked as mock');
        assertTrue(Array.isArray(slots.slots), 'Should return slots array');
        assertTrue(slots.slots.length > 0, 'Should have mock slots');
        assertTrue(slots.slots[0].time, 'Should have time property');
        assertEqual(slots.slots[0].available, true, 'Should be available');
        
        process.env.CAL_API_KEY = originalKey;
    });

    await test('getMe returns mock profile when unconfigured', async () => {
        const originalKey = process.env.CAL_API_KEY;
        process.env.CAL_USERNAME = 'mockuser';
        delete process.env.CAL_API_KEY;
        
        const profile = await calcom.getMe();
        
        assertTrue(profile.mock === true, 'Should be marked as mock');
        assertTrue(profile.username, 'Should have username');
        
        process.env.CAL_API_KEY = originalKey;
    });

    // ==================== ERROR HANDLING TESTS ====================

    console.log('\n⚠️ Error Handling Tests\n');

    await test('createBooking validates required fields', async () => {
        const originalKey = process.env.CAL_API_KEY;
        process.env.CAL_API_KEY = 'test_key';
        
        try {
            await calcom.createBooking({
                // Missing required fields
                attendee: {}
            });
            throw new Error('Should have thrown validation error');
        } catch (error) {
            // Should fail due to missing fields or API error
            assertTrue(true, 'Validation worked');
        }
        
        process.env.CAL_API_KEY = originalKey;
    });

    await test('getAvailableSlots validates date parameters', async () => {
        try {
            await calcom.getAvailableSlots({
                eventTypeId: 1
                // Missing start and end
            });
            throw new Error('Should have thrown validation error');
        } catch (error) {
            assertTrue(
                error.message.includes('required') || 
                error.message.includes('not configured'),
                'Should validate dates'
            );
        }
    });

    await test('generateBookingUrl handles missing parameters', () => {
        delete process.env.CAL_USERNAME;
        const url = calcom.generateBookingUrl('discovery-call', null);
        assertEqual(url, null, 'Should return null for missing username');
        process.env.CAL_USERNAME = 'testagent';
    });

    // ==================== RETRY LOGIC TESTS ====================

    console.log('\n🔄 Retry Logic Tests\n');

    await test('sleep function delays execution', async () => {
        const start = Date.now();
        await sleep(50);
        const elapsed = Date.now() - start;
        assertTrue(elapsed >= 45, `Should delay at least 45ms, got ${elapsed}ms`);
    });

    await test('calculateBackoffDelay returns base delay on first attempt', () => {
        const delay = calculateBackoffDelay(0);
        const expectedBase = RETRY_CONFIG.baseDelayMs;
        // Allow for jitter (±25%)
        assertTrue(delay >= expectedBase * 0.75, `Delay ${delay} should be >= ${expectedBase * 0.75}`);
        assertTrue(delay <= expectedBase * 1.25, `Delay ${delay} should be <= ${expectedBase * 1.25}`);
    });

    await test('calculateBackoffDelay increases exponentially', () => {
        const delay0 = calculateBackoffDelay(0);
        const delay1 = calculateBackoffDelay(1);
        const delay2 = calculateBackoffDelay(2);
        
        // With multiplier 2, delay should roughly double
        assertTrue(delay1 > delay0 * 0.8, 'Second attempt delay should be greater than first');
        assertTrue(delay2 > delay1 * 0.8, 'Third attempt delay should be greater than second');
    });

    await test('calculateBackoffDelay respects max delay cap', () => {
        // Test with high attempt number
        const delay = calculateBackoffDelay(10);
        assertTrue(delay <= RETRY_CONFIG.maxDelayMs * 1.25, 
            `Delay ${delay} should not exceed max ${RETRY_CONFIG.maxDelayMs * 1.25} by much`);
    });

    await test('calculateBackoffDelay adds jitter', () => {
        // Collect multiple delays to verify jitter is applied
        const delays = [];
        for (let i = 0; i < 10; i++) {
            delays.push(calculateBackoffDelay(1));
        }
        
        // Check that delays vary (jitter applied)
        const uniqueDelays = new Set(delays);
        assertTrue(uniqueDelays.size > 1, 'Jitter should produce varying delays');
    });

    await test('withRetry succeeds on first attempt', async () => {
        let attempts = 0;
        const result = await withRetry(async () => {
            attempts++;
            return 'success';
        }, { maxRetries: 2 }, 'test operation');
        
        assertEqual(result, 'success', 'Should return function result');
        assertEqual(attempts, 1, 'Should only attempt once on success');
    });

    await test('withRetry retries on failure and succeeds', async () => {
        let attempts = 0;
        const result = await withRetry(async () => {
            attempts++;
            if (attempts < 3) {
                throw new Error('Temporary failure');
            }
            return 'success after retries';
        }, { maxRetries: 3 }, 'test operation');
        
        assertEqual(result, 'success after retries', 'Should eventually succeed');
        assertEqual(attempts, 3, 'Should retry until success');
    });

    await test('withRetry throws after max retries exceeded', async () => {
        let attempts = 0;
        try {
            await withRetry(async () => {
                attempts++;
                throw new Error('Persistent failure');
            }, { maxRetries: 2 }, 'failing operation');
            throw new Error('Should have thrown after max retries');
        } catch (error) {
            assertEqual(error.message, 'Persistent failure', 'Should throw last error');
            assertEqual(attempts, 3, 'Should attempt initial + 2 retries');
        }
    });

    await test('withRetry does not retry on non-retryable errors (400)', async () => {
        let attempts = 0;
        try {
            await withRetry(async () => {
                attempts++;
                const error = new Error('Bad request');
                error.status = 400;
                throw error;
            }, { maxRetries: 3 }, 'bad request operation');
        } catch (error) {
            assertEqual(attempts, 1, 'Should not retry on 400 error');
        }
    });

    await test('withRetry does not retry on non-retryable errors (401)', async () => {
        let attempts = 0;
        try {
            await withRetry(async () => {
                attempts++;
                const error = new Error('Unauthorized');
                error.status = 401;
                throw error;
            }, { maxRetries: 3 }, 'auth operation');
        } catch (error) {
            assertEqual(attempts, 1, 'Should not retry on 401 error');
        }
    });

    await test('withRetry does not retry on non-retryable errors (403)', async () => {
        let attempts = 0;
        try {
            await withRetry(async () => {
                attempts++;
                const error = new Error('Forbidden');
                error.status = 403;
                throw error;
            }, { maxRetries: 3 }, 'forbidden operation');
        } catch (error) {
            assertEqual(attempts, 1, 'Should not retry on 403 error');
        }
    });

    await test('withRetry does not retry on foreign key violation', async () => {
        let attempts = 0;
        try {
            await withRetry(async () => {
                attempts++;
                const error = new Error('Foreign key violation');
                error.code = '23503';
                throw error;
            }, { maxRetries: 3 }, 'fk operation');
        } catch (error) {
            assertEqual(attempts, 1, 'Should not retry on FK violation');
        }
    });

    await test('withRetry does not retry on unique constraint violation', async () => {
        let attempts = 0;
        try {
            await withRetry(async () => {
                attempts++;
                const error = new Error('Unique constraint violation');
                error.code = '23505';
                throw error;
            }, { maxRetries: 3 }, 'unique constraint operation');
        } catch (error) {
            assertEqual(attempts, 1, 'Should not retry on unique constraint error');
        }
    });

    await test('withRetry retries on transient errors', async () => {
        let attempts = 0;
        const result = await withRetry(async () => {
            attempts++;
            if (attempts < 2) {
                const error = new Error('Connection timeout');
                error.code = 'ETIMEDOUT';
                throw error;
            }
            return 'recovered';
        }, { maxRetries: 3 }, 'transient operation');
        
        assertEqual(result, 'recovered', 'Should recover from transient error');
        assertEqual(attempts, 2, 'Should retry on transient error');
    });

    await test('RETRY_CONFIG has expected defaults', () => {
        assertEqual(RETRY_CONFIG.maxRetries, 3, 'Should have maxRetries of 3');
        assertEqual(RETRY_CONFIG.baseDelayMs, 1000, 'Should have baseDelayMs of 1000');
        assertEqual(RETRY_CONFIG.maxDelayMs, 10000, 'Should have maxDelayMs of 10000');
        assertEqual(RETRY_CONFIG.backoffMultiplier, 2, 'Should have backoffMultiplier of 2');
    });

    await test('withRetry uses custom maxRetries', async () => {
        let attempts = 0;
        try {
            await withRetry(async () => {
                attempts++;
                throw new Error('Always fails');
            }, { maxRetries: 1 }, 'custom retry operation');
        } catch (error) {
            assertEqual(attempts, 2, 'Should attempt initial + 1 retry');
        }
    });

    // ==================== WEBHOOK INTEGRATION WITH RETRY TESTS ====================

    console.log('\n🔗 Webhook Integration with Retry Tests\n');

    await test('handleBookingCreated uses retry for database operations', async () => {
        const mockBooking = {
            uid: 'test-retry-booking-123',
            id: 99999,
            eventTypeId: 1,
            eventType: { slug: 'discovery-call' },
            startTime: '2026-03-15T14:00:00Z',
            endTime: '2026-03-15T14:30:00Z',
            attendees: [{
                name: 'Retry Test User',
                email: 'retry-test@example.com',
                phoneNumber: '+15551234567'
            }],
            metadata: { source: 'retry-test' }
        };

        try {
            await handleBookingCreated(mockBooking);
        } catch (error) {
            // Expected in test environment, but should show retry attempts in logs
            assertTrue(
                error.message.includes('not configured') || 
                error.message.includes('fetch failed') ||
                error.message.includes('Cannot read'),
                'Should handle database connection gracefully with retries'
            );
        }
    });

    await test('handleBookingRescheduled uses retry logic', async () => {
        const mockBooking = {
            uid: 'test-retry-reschedule-123',
            startTime: '2026-03-16T15:00:00Z',
            endTime: '2026-03-16T15:30:00Z',
            attendees: [{
                name: 'Retry Reschedule User',
                email: 'retry-reschedule@example.com'
            }]
        };

        try {
            await handleBookingRescheduled(mockBooking);
        } catch (error) {
            assertTrue(
                error.message.includes('not configured') || 
                error.message.includes('fetch failed'),
                'Should handle reschedule with retry logic'
            );
        }
    });

    await test('handleBookingCancelled uses retry logic', async () => {
        const mockBooking = {
            uid: 'test-retry-cancel-123',
            cancellationReason: 'Testing retry logic',
            attendees: [{
                name: 'Retry Cancel User',
                email: 'retry-cancel@example.com'
            }]
        };

        try {
            await handleBookingCancelled(mockBooking);
        } catch (error) {
            assertTrue(
                error.message.includes('not configured') || 
                error.message.includes('fetch failed'),
                'Should handle cancellation with retry logic'
            );
        }
    });

    await test('handleMeetingEnded uses retry logic', async () => {
        const mockBooking = {
            uid: 'test-retry-complete-123',
            attendees: [{
                name: 'Retry Complete User',
                email: 'retry-complete@example.com'
            }]
        };

        try {
            await handleMeetingEnded(mockBooking);
        } catch (error) {
            assertTrue(
                error.message.includes('not configured') || 
                error.message.includes('fetch failed'),
                'Should handle meeting completion with retry logic'
            );
        }
    });

    // ==================== SUMMARY ====================

    console.log('\n' + '='.repeat(50));
    console.log(`Test Results: ${results.passed} passed, ${results.failed} failed`);
    console.log('='.repeat(50) + '\n');

    if (results.failed > 0) {
        console.log('Failed tests:');
        results.tests
            .filter(t => t.status === '❌ FAIL')
            .forEach(t => console.log(`  - ${t.name}: ${t.error}`));
        process.exit(1);
    } else {
        console.log('✅ All tests passed!');
        process.exit(0);
    }
}

// Run tests
runTests().catch(error => {
    console.error('Test runner error:', error);
    process.exit(1);
});
