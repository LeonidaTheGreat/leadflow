/**
 * Cal.com Webhook Management Routes
 * API endpoints for webhook registration, monitoring, and management
 * 
 * Base: /api/calcom/webhooks
 */

const express = require('express');
const router = express.Router();
const {
    listWebhooks,
    registerWebhook,
    deleteWebhook,
    updateWebhook,
    getWebhook,
    getWebhookDeliveryLogs,
    getWebhookStats,
    testWebhook,
    logWebhookDelivery
} = require('../lib/calcom-webhook-management');

/**
 * GET /api/calcom/webhooks
 * List all registered webhooks
 */
router.get('/', async (req, res) => {
    try {
        const webhooks = await listWebhooks();
        
        res.json({
            success: true,
            count: webhooks.length,
            webhooks
        });
    } catch (error) {
        console.error('Error listing webhooks:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to list webhooks',
            message: error.message
        });
    }
});

/**
 * POST /api/calcom/webhooks
 * Register a new webhook
 */
router.post('/', async (req, res) => {
    try {
        const { subscriberUrl, eventTriggers, active, metadata } = req.body;

        // Validation
        if (!subscriberUrl) {
            return res.status(400).json({
                success: false,
                error: 'Missing required field: subscriberUrl'
            });
        }

        if (!eventTriggers || !Array.isArray(eventTriggers) || eventTriggers.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Missing required field: eventTriggers (must be a non-empty array)'
            });
        }

        // Validate URL format
        try {
            new URL(subscriberUrl);
        } catch (e) {
            return res.status(400).json({
                success: false,
                error: 'Invalid subscriberUrl format'
            });
        }

        // Validate event triggers
        const validEvents = [
            'BOOKING_CREATED',
            'BOOKING_RESCHEDULED',
            'BOOKING_CANCELLED',
            'BOOKING_REJECTED',
            'MEETING_ENDED',
            'MEETING_STARTED',
            'RECORDING_READY'
        ];

        const invalidEvents = eventTriggers.filter(e => !validEvents.includes(e));
        if (invalidEvents.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'Invalid event triggers',
                invalidEvents,
                validEvents
            });
        }

        const result = await registerWebhook({
            subscriberUrl,
            eventTriggers,
            active: active !== false,
            metadata,
            registeredBy: req.user?.id || 'api'
        });

        res.status(201).json(result);
    } catch (error) {
        console.error('Error registering webhook:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to register webhook',
            message: error.message
        });
    }
});

/**
 * GET /api/calcom/webhooks/:webhookId
 * Get a specific webhook by ID
 */
router.get('/:webhookId', async (req, res) => {
    try {
        const { webhookId } = req.params;
        const result = await getWebhook(webhookId);
        res.json(result);
    } catch (error) {
        console.error('Error getting webhook:', error);
        
        if (error.message === 'Webhook not found') {
            return res.status(404).json({
                success: false,
                error: 'Webhook not found'
            });
        }
        
        res.status(500).json({
            success: false,
            error: 'Failed to get webhook',
            message: error.message
        });
    }
});

/**
 * PATCH /api/calcom/webhooks/:webhookId
 * Update webhook configuration
 */
router.patch('/:webhookId', async (req, res) => {
    try {
        const { webhookId } = req.params;
        const updates = req.body;

        // Only allow specific fields to be updated
        const allowedUpdates = {};
        if (updates.active !== undefined) allowedUpdates.active = updates.active;
        if (updates.eventTriggers !== undefined) allowedUpdates.eventTriggers = updates.eventTriggers;
        if (updates.subscriberUrl !== undefined) allowedUpdates.subscriberUrl = updates.subscriberUrl;
        if (updates.metadata !== undefined) allowedUpdates.metadata = updates.metadata;

        if (Object.keys(allowedUpdates).length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No valid fields to update'
            });
        }

        const result = await updateWebhook(webhookId, allowedUpdates);
        res.json(result);
    } catch (error) {
        console.error('Error updating webhook:', error);
        
        if (error.message === 'Webhook not found') {
            return res.status(404).json({
                success: false,
                error: 'Webhook not found'
            });
        }
        
        res.status(500).json({
            success: false,
            error: 'Failed to update webhook',
            message: error.message
        });
    }
});

/**
 * DELETE /api/calcom/webhooks/:webhookId
 * Delete a webhook
 */
router.delete('/:webhookId', async (req, res) => {
    try {
        const { webhookId } = req.params;
        const result = await deleteWebhook(webhookId);
        res.json(result);
    } catch (error) {
        console.error('Error deleting webhook:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete webhook',
            message: error.message
        });
    }
});

/**
 * POST /api/calcom/webhooks/:webhookId/test
 * Send a test webhook
 */
router.post('/:webhookId/test', async (req, res) => {
    try {
        const { webhookId } = req.params;
        const result = await testWebhook(webhookId);
        
        if (result.success) {
            res.json(result);
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        console.error('Error testing webhook:', error);
        
        if (error.message === 'Webhook not found') {
            return res.status(404).json({
                success: false,
                error: 'Webhook not found'
            });
        }
        
        res.status(500).json({
            success: false,
            error: 'Failed to test webhook',
            message: error.message
        });
    }
});

/**
 * GET /api/calcom/webhooks/:webhookId/logs
 * Get delivery logs for a webhook
 */
router.get('/:webhookId/logs', async (req, res) => {
    try {
        const { webhookId } = req.params;
        const { status, limit, startDate, endDate } = req.query;

        const filters = { webhookId };
        if (status) filters.status = status;
        if (limit) filters.limit = parseInt(limit);
        if (startDate) filters.startDate = startDate;
        if (endDate) filters.endDate = endDate;

        const logs = await getWebhookDeliveryLogs(filters);
        
        res.json({
            success: true,
            webhookId,
            count: logs.length,
            logs
        });
    } catch (error) {
        console.error('Error getting webhook logs:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get webhook logs',
            message: error.message
        });
    }
});

/**
 * GET /api/calcom/webhooks/:webhookId/stats
 * Get statistics for a webhook
 */
router.get('/:webhookId/stats', async (req, res) => {
    try {
        const { webhookId } = req.params;
        const { startDate, endDate } = req.query;

        const dateRange = {};
        if (startDate) dateRange.startDate = startDate;
        if (endDate) dateRange.endDate = endDate;

        const stats = await getWebhookStats(webhookId, dateRange);
        
        res.json({
            success: true,
            webhookId,
            stats
        });
    } catch (error) {
        console.error('Error getting webhook stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get webhook stats',
            message: error.message
        });
    }
});

/**
 * GET /api/calcom/webhooks/stats/overall
 * Get overall webhook statistics
 */
router.get('/stats/overall', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        const dateRange = {};
        if (startDate) dateRange.startDate = startDate;
        if (endDate) dateRange.endDate = endDate;

        const stats = await getWebhookStats(null, dateRange);
        
        res.json({
            success: true,
            stats
        });
    } catch (error) {
        console.error('Error getting overall stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get webhook statistics',
            message: error.message
        });
    }
});

/**
 * POST /api/calcom/webhooks/logs
 * Manually log a webhook delivery (for external integrations)
 */
router.post('/logs', async (req, res) => {
    try {
        const logData = req.body;
        
        // Required fields validation
        if (!logData.webhookId || !logData.eventType || !logData.status) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: webhookId, eventType, status'
            });
        }

        await logWebhookDelivery(logData);
        
        res.json({
            success: true,
            message: 'Webhook delivery logged'
        });
    } catch (error) {
        console.error('Error logging webhook delivery:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to log webhook delivery',
            message: error.message
        });
    }
});

/**
 * GET /api/calcom/webhooks/health/summary
 * Get health summary for all webhooks
 */
router.get('/health/summary', async (req, res) => {
    try {
        const { createClient } = require('@supabase/supabase-js');
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseKey) {
            return res.json({
                success: true,
                mock: true,
                summary: [{
                    webhook_id: 'wh_mock_001',
                    subscriber_url: 'https://example.com/webhook',
                    active: true,
                    deliveries_24h: 10,
                    successful_24h: 9,
                    failed_24h: 1,
                    last_status: 'success'
                }]
            });
        }

        const supabase = createClient(supabaseUrl, supabaseKey, {
            auth: { autoRefreshToken: false, persistSession: false }
        });

        const { data, error } = await supabase
            .from('webhook_health_summary')
            .select('*')
            .limit(100);

        if (error) {
            throw error;
        }

        res.json({
            success: true,
            count: data?.length || 0,
            summary: data || []
        });
    } catch (error) {
        console.error('Error getting health summary:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get health summary',
            message: error.message
        });
    }
});

module.exports = router;