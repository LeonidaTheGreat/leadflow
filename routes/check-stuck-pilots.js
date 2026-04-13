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
const { createDefaultStuckPilotsService } = require('../lib/services/StuckPilotsService');
const requireCronSecret = require('../lib/middleware/require-cron-secret');
const stuckPilotsService = createDefaultStuckPilotsService();

/**
 * GET /api/cron/check-stuck-pilots
 *
 * Vercel sets Authorization: Bearer <CRON_SECRET> on legitimate cron invocations.
 */
router.get('/api/cron/check-stuck-pilots', requireCronSecret, async (req, res) => {
  console.log('[check-stuck-pilots] Cron triggered');

  try {
    const result = await stuckPilotsService.checkAndAlertStuckPilots();

    console.log('[check-stuck-pilots] Done:', result);
    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (error) {
    console.error('[check-stuck-pilots] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString(),
    });
  }
});

module.exports = router;
