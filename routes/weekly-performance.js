/**
 * Weekly Performance Email Routes
 *
 * Handles the weekly AI performance report email sequence:
 *   - Cron trigger: GET /api/cron/weekly-performance
 *   - Email preview: GET /api/cron/weekly-performance + /preview suffix
 */

const express = require('express');
const router = express.Router();
const { createDefaultWeeklyPerformanceService } = require('../lib/services/WeeklyPerformanceService');
const weeklyPerformanceService = createDefaultWeeklyPerformanceService();

/**
 * GET /api/cron/weekly-performance
 *
 * Vercel cron trigger: sends weekly AI performance emails to all eligible agents.
 * In production Vercel sets the Authorization header for cron requests.
 */
router.get('/api/cron/weekly-performance', async (req, res) => {
  try {
    console.log('[Weekly Performance] Cron triggered');

    const results = await weeklyPerformanceService.runWeeklyReportSequence();

    console.log('[Weekly Performance] Sequence completed:', {
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
    console.error('[Weekly Performance] Cron error:', error);
    return res.status(500).json({
      success: false,
      message: 'Weekly performance email sequence failed',
      error: error.message,
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
router.get('/api/cron/weekly-performance/preview', async (req, res) => {
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
    console.error('[Weekly Performance] Preview error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate email preview',
      error: error.message
    });
  }
});

module.exports = router;
