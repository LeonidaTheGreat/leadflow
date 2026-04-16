/**
 * Cal.com Webhook Routes
 *
 * Incoming webhook:
 *   POST /webhook/calcom  — receives Cal.com booking events
 *
 * Admin endpoints (require LEADFLOW_API_KEY):
 *   GET  /api/calcom/webhooks          — list registered webhooks
 *   POST /api/calcom/webhooks          — register a webhook
 *   DELETE /api/calcom/webhooks/:id    — delete a webhook
 *   GET  /api/calcom/webhooks/:id/stats — get webhook stats
 *   POST /api/calcom/webhooks/:id/test — test a webhook
 */

'use strict';

const express = require('express');
const router = express.Router();
const CalcomWebhookHandler = require('../lib/services/CalcomWebhookHandler');
const CalcomWebhookManagement = require('../lib/services/CalcomWebhookManagement');
const requireApiKey = require('../lib/middleware/require-api-key');
const { writeDeadLetter } = require('../lib/utils/dead-letter');
const { logger } = require('../lib/logger');
const { ValidationError } = require('../lib/errors');
const log = logger.child('calcom-webhook');

const handler = new CalcomWebhookHandler();
const management = new CalcomWebhookManagement();

// ─── POST /webhook/calcom ────────────────────────────────────────────────────
router.post('/webhook/calcom', (req, res) => {
    const signature = req.headers['x-cal-signature-256'] ||
                      req.headers['cal-signature-256'] ||
                      req.headers['cal-signature'];

    // Signature verification is mandatory — reject if secret is not configured
    if (!process.env.CALCOM_WEBHOOK_SECRET) {
        log.error('CALCOM_WEBHOOK_SECRET not configured — rejecting webhook');
        return res.status(503).json({ error: 'Webhook verification not configured' });
    }

    const rawBody = typeof req.body === 'string'
        ? req.body
        : JSON.stringify(req.body);

    if (!handler.verifyWebhookSignature(rawBody, signature || '')) {
        return res.status(401).json({ error: 'Invalid webhook signature' });
    }

    let event = req.body;
    if (typeof event === 'string') {
        try {
            event = JSON.parse(event);
        } catch (e) {
            return res.status(400).json({ error: 'Invalid JSON payload' });
        }
    }

    if (!event) {
        return res.status(400).json({ error: 'Invalid webhook payload' });
    }

    const triggerEvent = event.triggerEvent;
    const eventType = event.type;
    if ((!triggerEvent || typeof triggerEvent !== 'string') &&
        (!eventType || typeof eventType !== 'string')) {
        const ve = new ValidationError('Event must have a triggerEvent or type field (non-empty string)');
        return res.status(400).json({ error: ve.message });
    }

    if ('payload' in event && !event.payload) {
        const ve = new ValidationError('Event payload must not be null or empty when present');
        return res.status(400).json({ error: ve.message });
    }

    handler.handleCalWebhook(event)
        .then(() => res.json({ received: true, processed: true }))
        .catch(err => {
            const eventType = event.triggerEvent || event.type || 'unknown';
            log.error('Webhook processing error', err, { eventType });
            writeDeadLetter('calcom', eventType, event, err.message);
            res.status(200).json({ received: true, processed: false, error: 'Webhook processing failed' });
        });
});

// ─── GET /api/calcom/webhooks ────────────────────────────────────────────────
router.get('/api/calcom/webhooks', requireApiKey, async (req, res) => {
    try {
        const webhooks = await management.listWebhooks();
        return res.json({ success: true, webhooks });
    } catch (err) {
        log.error('List webhooks error', err);
        return res.status(500).json({ error: 'Failed to list webhooks' });
    }
});

// ─── POST /api/calcom/webhooks ───────────────────────────────────────────────
router.post('/api/calcom/webhooks', requireApiKey, async (req, res) => {
    try {
        const result = await management.registerWebhook(req.body);
        return res.status(201).json(result);
    } catch (err) {
        log.error('Register webhook error', err);
        const status = err.message.includes('required') || err.message.includes('Invalid') ? 400 : 500;
        return res.status(status).json({ error: status === 400 ? err.message : 'Internal server error' });
    }
});

// ─── DELETE /api/calcom/webhooks/:id ────────────────────────────────────────
router.delete('/api/calcom/webhooks/:id', requireApiKey, async (req, res) => {
    try {
        const result = await management.deleteWebhook(req.params.id);
        return res.json(result);
    } catch (err) {
        log.error('Delete webhook error', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// ─── GET /api/calcom/webhooks/:id/stats ─────────────────────────────────────
router.get('/api/calcom/webhooks/:id/stats', requireApiKey, async (req, res) => {
    try {
        const stats = await management.getWebhookStats(req.params.id);
        return res.json({ success: true, webhookId: req.params.id, stats });
    } catch (err) {
        log.error('Webhook stats error', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// ─── POST /api/calcom/webhooks/:id/test ─────────────────────────────────────
router.post('/api/calcom/webhooks/:id/test', requireApiKey, async (req, res) => {
    try {
        const result = await management.testWebhook(req.params.id);
        return res.json(result);
    } catch (err) {
        log.error('Test webhook error', err);
        const status = err.message.includes('not found') ? 404 : 500;
        return res.status(status).json({ error: status === 404 ? 'Webhook not found' : 'Internal server error' });
    }
});

module.exports = router;
