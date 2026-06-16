'use strict';

/**
 * Pilot Reactivation Cron Route
 *
 * GET /api/cron/pilot-reactivation
 *
 * Sends a 3-email reactivation sequence to pilot agents who have verified email
 * but never logged in (phone-less cohort that SMS nudge cannot reach).
 *
 * Email 1 (immediate):  "Your LeadFlow pilot account is ready — log in here"
 * Email 2 (+3 days):    "Don't lose your pilot spot..."
 * Email 3 (+7 days):    "Quick offer — 15-min setup call..."
 *
 * Auth: Vercel cron Authorization: Bearer <CRON_SECRET>
 */

const express = require('express');
const router = express.Router();
const requireCronSecret = require('../../lib/middleware/require-cron-secret');
const PilotReactivationService = require('../../lib/services/PilotReactivationService');
const { getPool } = require('../../lib/db');
const { logger } = require('../../lib/logger');

const log = logger.child('pilot-reactivation');

let service = null;

router.get('/api/cron/pilot-reactivation', requireCronSecret, async (req, res) => {
  log.info('Pilot reactivation cron triggered');

  try {
    if (!service) {
      service = new PilotReactivationService({ pool: getPool() });
    }

    const dryRun = req.query.dry_run === 'true';
    const result = await service.processSequence({ dryRun });

    log.info('Pilot reactivation complete', result);
    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (error) {
    log.error('Pilot reactivation cron error', error);
    return res.status(500).json({
      success: false,
      error: 'Internal error',
      timestamp: new Date().toISOString(),
    });
  }
});

module.exports = router;
