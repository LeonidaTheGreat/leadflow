/**
 * Stuck Pilots Cron Route
 *
 * Vercel cron trigger: GET /api/cron/check-stuck-pilots
 * Schedule: daily at 08:00 UTC (configured in vercel.json)
 *
 * Checks pilot_progress.stage_entered_at — not onboarding_events/telemetry.
 * Fires a Telegram alert once per stage per pilot (guarded by stuck_since).
 */

const express = require('express');
const router = express.Router();
const requireCronSecret = require('../lib/middleware/require-cron-secret');
const { createDefaultStuckPilotsService } = require('../lib/services/StuckPilotsService');
const { logger } = require('../lib/logger');
const log = logger.child('check-stuck-pilots');
const stuckPilotsService = createDefaultStuckPilotsService();

/**
 * GET /api/cron/check-stuck-pilots
 *
 * Vercel sends Authorization: Bearer <CRON_SECRET> for legitimate cron invocations.
 * Rejects unauthenticated requests.
 */
router.get('/api/cron/check-stuck-pilots', requireCronSecret, async (req, res) => {
  log.info('Cron triggered');

  try {
    const result = await stuckPilotsService.checkAndAlertStuckPilots();

    log.info('Done', result);
    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (error) {
    log.error('Cron error', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

module.exports = router;
