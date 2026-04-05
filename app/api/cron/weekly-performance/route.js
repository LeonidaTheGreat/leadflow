/**
 * Vercel Cron Route: Weekly Performance Email Report
 * 
 * Path: /api/cron/weekly-performance
 * Schedule: Runs every Monday at 9 AM UTC
 * 
 * This is a serverless function that triggers the weekly AI performance email report.
 * Vercel will call this automatically based on the schedule defined in vercel.json
 */

const weeklyPerformanceService = require('../../../../lib/weekly-performance-service');

/**
 * Handler for Vercel cron invocations
 */
async function handler(req, res) {
  // Verify this is a cron request from Vercel
  const cronSecret = req.headers['x-vercel-cron-secret'];
  
  if (process.env.VERCEL_ENV === 'production' && !cronSecret) {
    console.warn('[Weekly Performance Cron] Request without proper authorization header');
  }

  try {
    console.log('[Weekly Performance Cron] Starting weekly performance email sequence');
    
    const results = await weeklyPerformanceService.runWeeklyReportSequence();

    console.log('[Weekly Performance Cron] Sequence completed:', {
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
    console.error('[Weekly Performance Cron] Error:', error);

    return res.status(500).json({
      success: false,
      message: 'Weekly performance email sequence failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = handler;
