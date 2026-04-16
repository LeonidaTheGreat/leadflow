/**
 * Weekly Performance Email Routes
 *
 * Handles the weekly AI performance report email sequence:
 *   - Cron trigger: GET /api/cron/weekly-performance
 *   - Email preview: GET /api/cron/weekly-performance + /preview suffix
 */

const express = require('express');
const router = express.Router();
const requireCronSecret = require('../../lib/middleware/require-cron-secret');
const requireApiKey = require('../../lib/middleware/require-api-key');
const { WeeklyPerformanceService } = require('../../lib/services/WeeklyPerformanceService');
const { logger } = require('../../lib/logger');
const log = logger.child('weekly-performance');
const weeklyPerformanceService = new WeeklyPerformanceService();

/**
 * GET /api/cron/weekly-performance
 *
 * Vercel cron trigger: sends weekly AI performance emails to all eligible agents.
 * In production Vercel sets the Authorization header for cron requests.
 */
router.get('/api/cron/weekly-performance', requireCronSecret, async (req, res) => {
  try {
    log.info('Cron triggered');

    const results = await weeklyPerformanceService.runWeeklyReportSequence();

    log.info('Sequence completed', {
      totalEligible: results.totalEligible,
      totalSent: results.totalSent,
      totalFailed: results.totalFailed
    });

    return res.status(200).json({
      success: true,
      message: 'Weekly performance email sequence executed',
      timestamp: new Date().toISOString(),
      results
    });
  } catch (error) {
    log.error('Cron error', error);
    return res.status(500).json({
      success: false,
      message: 'Weekly performance email sequence failed',
      error: 'Internal error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Preview endpoint: returns the email HTML for a given agent (or demo agent if agentId is omitted).
 * Query params:
 *   agentId (optional) — UUID of the agent to preview
 *   format  (optional) — "json" returns JSON with stats; default returns raw HTML
 */
router.get('/api/cron/weekly-performance/preview', requireApiKey, async (req, res) => {
  try {
    const { agentId, format } = req.query;

    const { html, stats, weekRange, agent } = await weeklyPerformanceService.getPreviewData(agentId || null);

    if (format === 'json') {
      return res.status(200).json({
        success: true,
        agent: { id: agent.id, email: agent.email, firstName: agent.first_name, planTier: agent.plan_tier },
        stats,
        weekRange,
        html
      });
    }

    // Default: return raw HTML so it can be viewed directly in a browser
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(html);
  } catch (error) {
    log.error('Preview error', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate email preview',
      error: 'Internal error'
    });
  }
});

module.exports = router;
