/**
 * Admin Payment Link — Direct Stripe Payment Link for completed-onboarding agents
 *
 * POST /api/admin/create-payment-link  { agentId, planTier }
 *
 * Bypasses the broken Checkout Session flow (price IDs not set in Vercel ENV) by
 * creating Price objects on the fly via the Stripe API, then generating a Payment Link.
 * Payment Links do not require pre-configured price IDs in env.
 *
 * Auth: LEADFLOW_API_KEY (x-api-key header)
 */

'use strict';

const express = require('express');
const router = express.Router();
const Stripe = require('stripe');
const { getPool } = require('../../lib/db');
const requireApiKey = require('../../lib/middleware/require-api-key');
const { ValidationError } = require('../../lib/errors');
const { logger } = require('../../lib/logger');
const log = logger.child('admin-payment-link');

const VALID_TIERS = ['starter', 'pro', 'team'];

const TIER_CONFIG = {
  starter: { name: 'LeadFlow AI — Starter', amount: 4900 },
  pro:     { name: 'LeadFlow AI — Pro',     amount: 14900 },
  team:    { name: 'LeadFlow AI — Team',    amount: 39900 },
};

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://leadflow-ai-five.vercel.app').replace(/\/$/, '');

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key, { apiVersion: '2024-11-20' });
}

// ─── POST /api/admin/create-payment-link ─────────────────────────────────────
router.post('/api/admin/create-payment-link', requireApiKey, async (req, res) => {
  try {
    const { agentId, planTier } = req.body || {};

    if (!agentId || typeof agentId !== 'string' || !agentId.trim()) {
      throw new ValidationError('agentId is required');
    }
    if (!VALID_TIERS.includes(planTier)) {
      throw new ValidationError(`planTier must be one of: ${VALID_TIERS.join(', ')}`);
    }

    const stripe = getStripe();
    if (!stripe) {
      return res.status(503).json({ error: 'Stripe not configured (STRIPE_SECRET_KEY missing)' });
    }

    const pool = getPool();
    const { rows } = await pool.query(
      'SELECT id, first_name, last_name, email, stripe_customer_id, onboarding_completed, email_verified, subscription_status FROM real_estate_agents WHERE id = $1',
      [agentId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const agent = rows[0];

    if (!agent.email) {
      return res.status(422).json({ error: 'Agent has no email address' });
    }

    const tierCfg = TIER_CONFIG[planTier];

    // Create a price on the fly — bypasses missing Vercel price ID env vars
    const price = await stripe.prices.create({
      currency: 'usd',
      unit_amount: tierCfg.amount,
      recurring: { interval: 'month' },
      product_data: { name: tierCfg.name },
    });

    const metadata = {
      agent_id: agentId,
      agent_email: agent.email,
      tier: planTier,
      source: 'admin_payment_link',
    };
    if (agent.stripe_customer_id) {
      metadata.stripe_customer_id = agent.stripe_customer_id;
    }

    const paymentLink = await stripe.paymentLinks.create({
      line_items: [{ price: price.id, quantity: 1 }],
      after_completion: {
        type: 'redirect',
        redirect: { url: `${APP_URL}/dashboard?upgrade=success` },
      },
      metadata,
    });

    log.info({ agentId, planTier, url: paymentLink.url }, 'Payment link created');

    return res.status(201).json({
      url: paymentLink.url,
      agentId,
      tier: planTier,
      amount: tierCfg.amount,
    });
  } catch (err) {
    if (err instanceof ValidationError) {
      return res.status(400).json({ error: err.message });
    }
    log.error('create-payment-link error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
