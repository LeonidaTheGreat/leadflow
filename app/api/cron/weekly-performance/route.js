/**
 * Weekly Performance Report Email - Vercel Cron Route
 * 
 * This route is triggered by Vercel Cron to send weekly performance
 * report emails to all active agents every Monday at 9 AM.
 * 
 * Cron Schedule: 0 9 * * 1 (Mondays at 9 AM UTC)
 * 
 * @see lib/services/WeeklyPerformanceService.js
 */

import { createDefaultWeeklyPerformanceService } from '@/lib/services/WeeklyPerformanceService';

/**
 * GET handler for Vercel Cron
 * Vercel Cron jobs make GET requests to the configured endpoint
 */
export async function GET(request) {
  // Verify this is a cron request or authorized call
  const authHeader = request.headers.get('authorization');
  const isCronRequest = authHeader === `Bearer ${process.env.CRON_SECRET}` ||
                       request.headers.get('x-vercel-cron') === '1';

  // Also allow API secret key for manual triggers
  const isServiceRole = authHeader === `Bearer ${process.env.API_SECRET_KEY}`;

  if (!isCronRequest && !isServiceRole) {
    return Response.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  console.log('[Cron] Starting weekly performance email sequence...');

  try {
    const weeklyService = createDefaultWeeklyPerformanceService();
    const results = await weeklyService.runWeeklyReportSequence();

    const summary = {
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        weekStarting: results.weekStarting,
        weekEnding: results.weekEnding,
        totalEligible: results.totalEligible,
        totalSent: results.totalSent,
        totalFailed: results.totalFailed,
        totalSkipped: results.totalSkipped
      },
      agents: results.agents
    };

    console.log('[Cron] Weekly performance email sequence complete:', summary.summary);

    return Response.json(summary);

  } catch (error) {
    console.error('[Cron] Error in weekly performance email sequence:', error);
    
    return Response.json(
      {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

/**
 * POST handler for manual triggers
 */
export async function POST(request) {
  return GET(request);
}
