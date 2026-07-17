/**
 * Admin Payment Link Routes
 *
 * GET  /api/admin/payment-link-candidates   — list agents who completed onboarding but haven't paid
 * POST /api/admin/create-payment-link       — generate a Stripe Payment Link for a specific agent
 *
 * Auth: LEADFLOW_API_KEY bearer token (admin-only)
 *
 * UC: uc-stripe-payment-link-direct
 */

'use strict';

const express = require('express');
const router = express.Router();
const PaymentLinkService = require('../../lib/services/PaymentLinkService');
const requireApiKey = require('../../lib/middleware/require-api-key');
const { logger } = require('../../lib/logger');
const log = logger.child('admin-payment-link');

const VALID_PLAN_TIERS = ['starter', 'professional', 'enterprise'];

function makeService() {
  return new PaymentLinkService();
}

// ─── GET /api/admin/payment-link-candidates ───────────────────────────────────
router.get('/api/admin/payment-link-candidates', requireApiKey, async (req, res) => {
  try {
    const service = makeService();
    const agents = await service.listCompletedOnboardingAgents();
    return res.json({ agents });
  } catch (err) {
    log.error('payment-link-candidates error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/admin/create-payment-link ──────────────────────────────────────
router.post('/api/admin/create-payment-link', requireApiKey, async (req, res) => {
  const { agentId, planTier } = req.body || {};

  if (!agentId || typeof agentId !== 'string' || !agentId.trim()) {
    return res.status(400).json({ error: 'agentId is required and must be a non-empty string' });
  }
  if (!VALID_PLAN_TIERS.includes(planTier)) {
    return res.status(400).json({ error: `planTier must be one of: ${VALID_PLAN_TIERS.join(', ')}` });
  }

  try {
    const service = makeService();
    const result = await service.createPaymentLink(agentId, planTier);
    return res.json({ success: true, url: result.url, linkId: result.linkId });
  } catch (err) {
    log.error('create-payment-link error', err);
    if (err.message.includes('not found')) return res.status(404).json({ error: err.message });
    if (err.message.includes('not configured')) return res.status(503).json({ error: 'Stripe not configured' });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
