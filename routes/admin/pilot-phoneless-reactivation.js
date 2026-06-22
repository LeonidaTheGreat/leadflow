'use strict';

/**
 * Admin route: Email reactivation campaign for pilot signups with no phone number.
 *
 * GET  /api/admin/pilot-phoneless-reactivation — preview eligible signups
 * POST /api/admin/pilot-phoneless-reactivation — run campaign (dryRun: true|false)
 *
 * UC: uc-pilot-email-reactivation-zero-phone
 */

const express = require('express');
const router = express.Router();
const { getPool } = require('../../lib/db');
const PilotPhonelessReactivationService = require('../../lib/services/PilotPhonelessReactivationService');
const requireApiKey = require('../../lib/middleware/require-api-key');
const { logger } = require('../../lib/logger');

const log = logger.child('pilot-phoneless-reactivation');
const { DEFAULT_LIMIT, MAX_LIMIT } = PilotPhonelessReactivationService;

function parseLimit(val) {
  if (val === undefined || val === null) return DEFAULT_LIMIT;
  const n = Number(val);
  if (!Number.isInteger(n) || n <= 0) return null;
  return Math.min(n, MAX_LIMIT);
}

function getService() {
  return new PilotPhonelessReactivationService({ pool: getPool() });
}

// GET /api/admin/pilot-phoneless-reactivation — list eligible (dry run)
router.get('/api/admin/pilot-phoneless-reactivation', requireApiKey, async (req, res) => {
  const limit = parseLimit(req.query.limit);
  if (limit === null) {
    return res.status(400).json({ error: 'limit must be a positive integer' });
  }

  try {
    const service = getService();
    const [eligible, signups] = await Promise.all([
      service.countEligible(),
      service.getEligible(limit),
    ]);
    return res.json({
      eligible,
      signups: signups.map(s => ({
        id: s.id,
        email: s.email,
        name: s.name,
        created_at: s.created_at,
        status: s.status,
      })),
    });
  } catch (err) {
    log.error('List pilot-phoneless-reactivation error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/pilot-phoneless-reactivation — run campaign
router.post('/api/admin/pilot-phoneless-reactivation', requireApiKey, async (req, res) => {
  const body = req.body || {};

  if (typeof body.dryRun !== 'boolean') {
    return res.status(400).json({ error: 'dryRun must be a boolean' });
  }

  const limit = parseLimit(body.limit);
  if (limit === null) {
    return res.status(400).json({ error: 'limit must be a positive integer' });
  }

  try {
    const service = getService();
    const result = await service.runCampaign({ dryRun: body.dryRun, limit });
    return res.json(result);
  } catch (err) {
    log.error('Run pilot-phoneless-reactivation error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
