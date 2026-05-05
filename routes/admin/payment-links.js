'use strict';

const express = require('express');
const router = express.Router();
const { getPool } = require('../../lib/db');
const PaymentLinkService = require('../../lib/services/PaymentLinkService');
const requireApiKey = require('../../lib/middleware/require-api-key');
const { logger } = require('../../lib/logger');
const { ValidationError } = require('../../lib/errors');
const log = logger.child('payment-links');

const VALID_TIERS = ['starter', 'pro', 'team'];
const MAX_DISCOUNT_PERCENT = 100;

function getService() {
  return new PaymentLinkService({ pool: getPool() });
}

// ─── POST /api/admin/generate-payment-link ────────────────────────────────────
router.post('/api/admin/generate-payment-link', requireApiKey, async (req, res) => {
  const service = getService();
  try {
    const { agentId, tier, discountPercent } = req.body || {};

    if (!agentId || typeof agentId !== 'string' || !agentId.trim()) {
      throw new ValidationError('agentId is required');
    }
    if (!tier || !VALID_TIERS.includes(tier)) {
      throw new ValidationError(`tier must be one of: ${VALID_TIERS.join(', ')}`);
    }
    if (discountPercent !== undefined) {
      const dp = Number(discountPercent);
      if (isNaN(dp) || dp < 0 || dp > MAX_DISCOUNT_PERCENT) {
        throw new ValidationError('discountPercent must be between 0 and 100');
      }
    }

    const result = await service.generatePaymentLink({
      agentId: agentId.trim(),
      tier,
      discountPercent: discountPercent ? Number(discountPercent) : undefined,
    });

    log.info({ agentId, tier }, 'Payment link generated');
    return res.status(201).json(result);
  } catch (err) {
    if (err instanceof ValidationError) {
      return res.status(400).json({ error: err.message });
    }
    log.error('Payment link generation failed', err);
    return res.status(500).json({ error: 'Failed to generate payment link' });
  }
});

// ─── GET /api/admin/payment-link-agents ───────────────────────────────────────
router.get('/api/admin/payment-link-agents', requireApiKey, async (req, res) => {
  const service = getService();
  try {
    const agents = await service.listTrialPilotAgents();
    return res.json({ agents });
  } catch (err) {
    log.error('Failed to list agents', err);
    return res.status(500).json({ error: 'Failed to list agents' });
  }
});

module.exports = router;
