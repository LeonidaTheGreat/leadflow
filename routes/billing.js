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
const billing = require('../lib/services/BillingService');
const requireApiKey = require('../lib/middleware/require-api-key');
const { writeDeadLetter } = require('../lib/utils/dead-letter');
const { logger } = require('../lib/logger');
const { ValidationError } = require('../lib/errors');
const { stripe: stripeConfig } = require('../lib/config');
const log = logger.child('billing');

const VALID_TIERS = ['starter', 'professional', 'enterprise'];
const VALID_INTERVALS = ['month', 'year'];

// ─── POST /webhook/stripe ─────────────────────────────────────────────────────
// NOTE: express.raw() must be applied to this path in server.js BEFORE express.json()
// so the raw body is available here for Stripe signature verification.
router.post('/webhook/stripe', async (req, res) => {
    const signature = req.headers['stripe-signature'];

    // Signature verification is mandatory — reject if secret is not configured.
    // STRIPE_WEBHOOK_SECRET must be set in Vercel Dashboard → Project Settings →
    // Environment Variables (value: whsec_... from Stripe Dashboard → Webhooks).
    if (!stripeConfig.webhookSecret) {
        log.error('STRIPE_WEBHOOK_SECRET not configured — rejecting webhook');
        return res.status(503).json({ error: 'Webhook verification not configured' });
    }

    let event;
    try {
        // Throws if signature is invalid — raw body required
        event = billing.verifyWebhookSignature(req.body, signature);
    } catch (err) {
        log.error('Webhook signature error', err);
        return res.status(400).json({ error: 'Webhook signature verification failed' });
    }

    // Validate event shape after signature verification
    if (!event.type || typeof event.type !== 'string') {
        return res.status(400).json({ error: 'Invalid event: type must be a non-empty string' });
    }
    if (!event.data || !event.data.object) {
        return res.status(400).json({ error: 'Invalid event: data.object is required' });
    }

    try {
        const result = await billing.processWebhookEvent(event);
        return res.json({ received: true, ...result });
    } catch (err) {
        const eventType = event && event.type ? event.type : 'unknown';
        log.error('Webhook processing error', err, { eventType });
        writeDeadLetter('stripe', eventType, event, err.message);
        return res.status(200).json({ received: true, processed: false, error: 'Webhook processing failed' });
    }
});

// ─── POST /api/billing/checkout ──────────────────────────────────────────────
router.post('/api/billing/checkout', requireApiKey, async (req, res) => {
    try {
        const { userId, tier, interval, paymentMethodId, trial } = req.body || {};

        if (!userId || typeof userId !== 'string' || !userId.trim()) {
            throw new ValidationError('userId is required and must be a non-empty string');
        }
        if (!VALID_TIERS.includes(tier)) {
            throw new ValidationError(`tier must be one of: ${VALID_TIERS.join(', ')}`);
        }
        if (interval !== undefined && !VALID_INTERVALS.includes(interval)) {
            throw new ValidationError(`interval must be one of: ${VALID_INTERVALS.join(', ')}`);
        }

        const result = await billing.createCompleteSubscription({
            userId,
            tier,
            interval: interval || 'month',
            paymentMethodId,
            trial: !!trial
        });
        return res.status(201).json(result);
    } catch (err) {
        if (err instanceof ValidationError) {
            return res.status(400).json({ error: err.message });
        }
        log.error('Checkout error', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// ─── POST /api/billing/portal ────────────────────────────────────────────────
router.post('/api/billing/portal', requireApiKey, async (req, res) => {
    try {
        const { customerId, returnUrl } = req.body || {};

        if (!customerId || typeof customerId !== 'string' || !customerId.startsWith('cus_')) {
            throw new ValidationError('customerId is required and must be a string starting with "cus_"');
        }
        if (returnUrl !== undefined && typeof returnUrl !== 'string') {
            throw new ValidationError('returnUrl must be a string');
        }

        const result = await billing.createPortalSession(customerId, { returnUrl });
        return res.json(result);
    } catch (err) {
        if (err instanceof ValidationError) {
            return res.status(400).json({ error: err.message });
        }
        log.error('Portal error', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// ─── GET /api/billing/status/:userId ─────────────────────────────────────────
router.get('/api/billing/status/:userId', requireApiKey, async (req, res) => {
    try {
        const status = await billing.getUserSubscriptionStatus(req.params.userId);
        return res.json(status);
    } catch (err) {
        log.error('Status error', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
