/**
 * Admin Payment Link Routes
 *
 * POST /api/admin/generate-payment-link
 *   Generate a shareable Stripe Checkout URL for a specific agent.
 *   The URL can be shared via iMessage, WhatsApp, LinkedIn, or any channel.
 *   No agent login required — email is prefilled, agent_id embedded in metadata.
 *
 * GET /api/admin/upgrade-candidates
 *   List all pilot/trial agents who are candidates for upgrade.
 *   Used by the admin UI to populate the payment links table.
 *
 * Auth: x-api-key header (LEADFLOW_API_KEY)
 *
 * UC: feat-shareable-stripe-payment-link
 */

'use strict';

const express = require('express');
const router = express.Router();
const AdminPaymentLinkService = require('../../lib/services/AdminPaymentLinkService');
const requireApiKey = require('../../lib/middleware/require-api-key');
const { logger } = require('../../lib/logger');
const { ValidationError } = require('../../lib/errors');
const log = logger.child('payment-link');

const VALID_TIERS = AdminPaymentLinkService.VALID_TIERS;

function getService() {
  return new AdminPaymentLinkService();
}

// ─── POST /api/admin/generate-payment-link ────────────────────────────────────
router.post('/api/admin/generate-payment-link', requireApiKey, async (req, res) => {
  try {
    const { agentId, tier, discountPercent } = req.body || {};

    // Input validation
    if (!agentId || typeof agentId !== 'string' || !agentId.trim()) {
      throw new ValidationError('agentId is required and must be a non-empty string');
    }

    // Basic UUID format check
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidPattern.test(agentId.trim())) {
      throw new ValidationError('agentId must be a valid UUID');
    }

    if (!VALID_TIERS.includes(tier)) {
      throw new ValidationError(`tier must be one of: ${VALID_TIERS.join(', ')}`);
    }

    if (discountPercent !== undefined && discountPercent !== null) {
      const d = Number(discountPercent);
      if (!Number.isFinite(d) || d < 1 || d > 99) {
        throw new ValidationError('discountPercent must be a number between 1 and 99');
      }
    }

    const service = getService();
    const result = await service.generatePaymentLink({
      agentId: agentId.trim(),
      tier,
      discountPercent: discountPercent != null ? Number(discountPercent) : undefined,
    });

    return res.status(201).json(result);
  } catch (err) {
    if (err instanceof ValidationError) {
      return res.status(400).json({ error: err.message });
    }
    if (err.message && err.message.startsWith('Agent not found')) {
      return res.status(404).json({ error: err.message });
    }
    log.error('Generate payment link error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/admin/upgrade-candidates ───────────────────────────────────────
router.get('/api/admin/upgrade-candidates', requireApiKey, async (req, res) => {
  try {
    const service = getService();
    const candidates = await service.listUpgradeCandidates();
    return res.json({ candidates });
  } catch (err) {
    log.error('List upgrade candidates error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
