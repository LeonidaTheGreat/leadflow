/*
Task Spec (9050e37e-996e-427d-a438-fb327f20c13e)
What:
- Update routes/internal/check-stuck-pilots.js GET handler and module init path.
- Replace eager createDefaultStuckPilotsService() at module load with lazy init in request flow.
- Return route-scoped 503 when service boot fails instead of crashing process during require().
Verify:
- curl -i https://leadflow-ai-five.vercel.app/login returns HTTP 200 after deploy (no FUNCTION_INVOCATION_FAILED).
- npm test exits 0.
- npm run build exits 0.
- npm run lint exits 0.
- npm audit --audit-level=high exits 0.
- rg -n "createDefaultStuckPilotsService\\(\\)" routes/internal/check-stuck-pilots.js shows lazy init usage, not top-level construction.
Boundaries:
- Do not modify dashboard login page or Next.js middleware logic.
- Do not change StuckPilotsService internals or DB schema.
- Keep fix scoped to preventing global runtime crash from this cron module.
*/
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
const requireCronSecret = require('../../lib/middleware/require-cron-secret');
const { createDefaultStuckPilotsService } = require('../../lib/services/StuckPilotsService');
const { logger } = require('../../lib/logger');
const log = logger.child('check-stuck-pilots');
let stuckPilotsService = null;

function getStuckPilotsService() {
  if (!stuckPilotsService) {
    stuckPilotsService = createDefaultStuckPilotsService();
  }
  return stuckPilotsService;
}

/**
 * GET /api/cron/check-stuck-pilots
 *
 * Vercel sends Authorization: Bearer <CRON_SECRET> for legitimate cron invocations.
 * Rejects unauthenticated requests.
 */
router.get('/api/cron/check-stuck-pilots', requireCronSecret, async (req, res) => {
  log.info('Cron triggered');

  try {
    let service;
    try {
      service = getStuckPilotsService();
    } catch (error) {
      log.error('Service bootstrap failed', error);
      return res.status(503).json({
        success: false,
        error: 'Service unavailable',
        timestamp: new Date().toISOString(),
      });
    }

    const result = await service.checkAndAlertStuckPilots();

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
      error: 'Internal error',
      timestamp: new Date().toISOString(),
    });
  }
});

module.exports = router;
