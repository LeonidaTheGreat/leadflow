/**
 * Cal.com Webhook API Route
 * Endpoint: /api/webhooks/calcom
 * 
 * Receives booking events from Cal.com:
 * - BOOKING_CREATED
 * - BOOKING_RESCHEDULED  
 * - BOOKING_CANCELLED
 * - BOOKING_REJECTED
 * - MEETING_ENDED
 */

const express = require('express');
const router = express.Router();
const { calcomWebhookHandler } = require('../lib/calcom-webhook-handler');

// POST /api/webhooks/calcom
// Main webhook endpoint - must use raw body parser for signature verification
router.post('/', express.raw({ type: 'application/json' }), calcomWebhookHandler);

// GET /api/webhooks/calcom
// Health check endpoint for the webhook
router.get('/', (req, res) => {
    res.json({
        status: 'ok',
        endpoint: '/api/webhooks/calcom',
        methods: ['POST'],
        events: [
            'BOOKING_CREATED',
            'BOOKING_RESCHEDULED',
            'BOOKING_CANCELLED',
            'BOOKING_REJECTED',
            'MEETING_ENDED'
        ],
        signatureRequired: process.env.NODE_ENV === 'production',
        timestamp: new Date().toISOString()
    });
});

// POST /api/webhooks/calcom/test
// Test endpoint with sample payload (development only)
router.post('/test', express.json(), async (req, res) => {
    if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({
            error: 'Test endpoint not available in production'
        });
    }

    const { handleCalWebhook } = require('../lib/calcom-webhook-handler');
    const eventType = req.body.triggerEvent || req.body.type || 'BOOKING_CREATED';
    
    // Create sample payload if none provided
    const payload = req.body.payload || req.body.data || createSamplePayload(eventType);
    
    const event = {
        triggerEvent: eventType,
        type: eventType,
        payload: payload
    };

    try {
        const result = await handleCalWebhook(event);
        res.json({
            success: true,
            message: 'Test webhook processed',
            eventType,
            result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            eventType
        });
    }
});

/**
 * Create sample payload for testing
 */
function createSamplePayload(eventType) {
    const baseBooking = {
        id: 12345,
        uid: `test-${Date.now()}`,
        title: 'Test Discovery Call',
        description: 'Sample booking for testing',
        startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        endTime: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(),
        eventTypeId: 67890,
        eventType: {
            id: 67890,
            slug: 'discovery-call',
            title: 'Discovery Call'
        },
        attendees: [{
            name: 'Test Lead',
            email: 'test@example.com',
            phoneNumber: '+1234567890',
            timeZone: 'America/New_York'
        }],
        location: 'https://cal.com/video/test-room',
        status: 'ACCEPTED',
        metadata: {
            source: 'test'
        }
    };

    switch (eventType) {
        case 'BOOKING_CANCELLED':
        case 'booking.cancelled':
            return {
                ...baseBooking,
                status: 'CANCELLED',
                cancellationReason: 'Test cancellation'
            };
        case 'BOOKING_RESCHEDULED':
        case 'booking.rescheduled':
            return {
                ...baseBooking,
                startTime: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
                endTime: new Date(Date.now() + 49 * 60 * 60 * 1000).toISOString(),
                rescheduleReason: 'Test reschedule'
            };
        case 'MEETING_ENDED':
        case 'meeting.ended':
            return {
                ...baseBooking,
                status: 'COMPLETED'
            };
        default:
            return baseBooking;
    }
}

module.exports = router;
