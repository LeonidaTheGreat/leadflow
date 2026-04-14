/**
 * Billing Routes
 *
 * Stripe webhook (raw body required):
 *   POST /webhook/stripe             — Stripe event handler
 *
 * Billing API (require LEADFLOW_API_KEY):
 *   POST /api/billing/checkout       — create Stripe checkout session
 *   POST /api/billing/portal         — create Stripe billing portal session
 *   GET  /api/billing/status/:userId — get subscription status for a user
 */

'use strict';

const express = require('express');
const router = express.Router();
const BillingService = require('../lib/services/BillingService');
const requireApiKey = require('../lib/middleware/require-api-key');
const { writeDeadLetter } = require('../lib/utils/dead-letter');

const billing = new BillingService();

// ─── POST /webhook/stripe ─────────────────────────────────────────────────────
// NOTE: express.raw() must be applied to this path in server.js BEFORE express.json()
// so the raw body is available here for Stripe signature verification.
router.post('/webhook/stripe', async (req, res) => {
    const signature = req.headers['stripe-signature'];

    let event;
    try {
        if (process.env.STRIPE_WEBHOOK_SECRET) {
            // Throws if signature is invalid — raw body required
            event = billing.verifyWebhookSignature(req.body, signature);
        } else {
            // No secret configured: parse JSON body (dev/test only)
            event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        }
    } catch (err) {
        console.error('[billing] webhook signature error:', err.message);
        return res.status(400).json({ error: 'Webhook signature verification failed' });
    }

    try {
        const result = await billing.processWebhookEvent(event);
        return res.json({ received: true, ...result });
    } catch (err) {
        const eventType = event && event.type ? event.type : 'unknown';
        console.error(JSON.stringify({
            level: 'error',
            source: 'billing-webhook',
            event_type: eventType,
            error: err.message,
            timestamp: new Date().toISOString()
        }));
        writeDeadLetter('stripe', eventType, event, err.message);
        return res.status(200).json({ received: true, processed: false, error: 'Webhook processing failed' });
    }
});

// ─── POST /api/billing/checkout ──────────────────────────────────────────────
router.post('/api/billing/checkout', requireApiKey, async (req, res) => {
    const { userId, tier, interval, paymentMethodId, trial } = req.body || {};

    if (!userId || !tier) {
        return res.status(400).json({ error: 'userId and tier are required' });
    }

    try {
        const result = await billing.createCompleteSubscription({
            userId,
            tier,
            interval: interval || 'month',
            paymentMethodId,
            trial: !!trial
        });
        return res.status(201).json(result);
    } catch (err) {
        console.error('[billing] checkout error:', err.message);
        return res.status(500).json({ error: err.message });
    }
});

// ─── POST /api/billing/portal ────────────────────────────────────────────────
router.post('/api/billing/portal', requireApiKey, async (req, res) => {
    const { customerId, returnUrl } = req.body || {};

    if (!customerId) {
        return res.status(400).json({ error: 'customerId is required' });
    }

    try {
        const result = await billing.createPortalSession(customerId, { returnUrl });
        return res.json(result);
    } catch (err) {
        console.error('[billing] portal error:', err.message);
        return res.status(500).json({ error: err.message });
    }
});

// ─── GET /api/billing/status/:userId ─────────────────────────────────────────
router.get('/api/billing/status/:userId', requireApiKey, async (req, res) => {
    try {
        const status = await billing.getUserSubscriptionStatus(req.params.userId);
        return res.json(status);
    } catch (err) {
        console.error('[billing] status error:', err.message);
        return res.status(500).json({ error: err.message });
    }
});

module.exports = router;
