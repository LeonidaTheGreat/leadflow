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

const handler = new CalcomWebhookHandler();
const management = new CalcomWebhookManagement();

// ─── Auth middleware for admin endpoints ──────────────────────────────────────
function requireApiKey(req, res, next) {
    const provided = req.headers['x-api-key'];
    if (!provided || provided !== process.env.LEADFLOW_API_KEY) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    return next();
}

// ─── POST /webhook/calcom ────────────────────────────────────────────────────
router.post('/webhook/calcom', (req, res) => {
    const signature = req.headers['x-cal-signature-256'] ||
                      req.headers['cal-signature-256'] ||
                      req.headers['cal-signature'];

    // Verify signature when CALCOM_WEBHOOK_SECRET is configured
    if (process.env.CALCOM_WEBHOOK_SECRET) {
        const rawBody = typeof req.body === 'string'
            ? req.body
            : JSON.stringify(req.body);

        if (!handler.verifyWebhookSignature(rawBody, signature || '')) {
            return res.status(401).json({ error: 'Invalid webhook signature' });
        }
    }

    let event = req.body;
    if (typeof event === 'string') {
        try {
            event = JSON.parse(event);
        } catch (e) {
            return res.status(400).json({ error: 'Invalid JSON payload' });
        }
    }

    if (!event || (!event.triggerEvent && !event.type)) {
        return res.status(400).json({ error: 'Invalid webhook payload' });
    }

    handler.handleCalWebhook(event)
        .then(() => res.json({ received: true, processed: true }))
        .catch(err => {
            console.error('[calcom-webhook] processing error:', err.message);
            res.status(500).json({ error: 'Webhook processing failed' });
        });
});

// ─── GET /api/calcom/webhooks ────────────────────────────────────────────────
router.get('/api/calcom/webhooks', requireApiKey, async (req, res) => {
    try {
        const webhooks = await management.listWebhooks();
        return res.json({ success: true, webhooks });
    } catch (err) {
        console.error('[calcom-webhook] list error:', err.message);
        return res.status(500).json({ error: 'Failed to list webhooks', detail: err.message });
    }
});

// ─── POST /api/calcom/webhooks ───────────────────────────────────────────────
router.post('/api/calcom/webhooks', requireApiKey, async (req, res) => {
    try {
        const result = await management.registerWebhook(req.body);
        return res.status(201).json(result);
    } catch (err) {
        console.error('[calcom-webhook] register error:', err.message);
        const status = err.message.includes('required') || err.message.includes('Invalid') ? 400 : 500;
        return res.status(status).json({ error: err.message });
    }
});

// ─── DELETE /api/calcom/webhooks/:id ────────────────────────────────────────
router.delete('/api/calcom/webhooks/:id', requireApiKey, async (req, res) => {
    try {
        const result = await management.deleteWebhook(req.params.id);
        return res.json(result);
    } catch (err) {
        console.error('[calcom-webhook] delete error:', err.message);
        return res.status(500).json({ error: err.message });
    }
});

// ─── GET /api/calcom/webhooks/:id/stats ─────────────────────────────────────
router.get('/api/calcom/webhooks/:id/stats', requireApiKey, async (req, res) => {
    try {
        const stats = await management.getWebhookStats(req.params.id);
        return res.json({ success: true, webhookId: req.params.id, stats });
    } catch (err) {
        console.error('[calcom-webhook] stats error:', err.message);
        return res.status(500).json({ error: err.message });
    }
});

// ─── POST /api/calcom/webhooks/:id/test ─────────────────────────────────────
router.post('/api/calcom/webhooks/:id/test', requireApiKey, async (req, res) => {
    try {
        const result = await management.testWebhook(req.params.id);
        return res.json(result);
    } catch (err) {
        console.error('[calcom-webhook] test error:', err.message);
        const status = err.message.includes('not found') ? 404 : 500;
        return res.status(status).json({ error: err.message });
    }
});

module.exports = router;
