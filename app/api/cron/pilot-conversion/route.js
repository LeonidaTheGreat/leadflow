/**
 * Pilot Conversion Email Sequence - Vercel Cron Route
 * 
 * This route is triggered by Vercel Cron to check for pilot agents
 * at conversion milestones and send appropriate conversion emails.
 * 
 * Cron Schedule: 0 9 * * * (Daily at 9 AM)
 * 
 * @see lib/pilot-conversion-service.js
 */

import { runConversionSequence } from '@/lib/pilot-conversion-service';

/**
 * GET handler for Vercel Cron
 * Vercel Cron jobs make GET requests to the configured endpoint
 */
export async function GET(request) {
  // Verify this is a cron request or authorized call
  const authHeader = request.headers.get('authorization');
  const isCronRequest = authHeader === `Bearer ${process.env.CRON_SECRET}` ||
                       request.headers.get('x-vercel-cron') === '1';
  
  // Also allow service role key for manual triggers
  const isServiceRole = authHeader === `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`;
  
  if (!isCronRequest && !isServiceRole) {
    return Response.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  console.log('[Cron] Starting pilot conversion email sequence...');

  try {
    const results = await runConversionSequence();

    // Calculate totals
    let totalSent = 0;
    let totalSkipped = 0;
    let totalFailed = 0;
    let totalProcessed = 0;

    for (const [milestone, data] of Object.entries(results.milestones)) {
      totalSent += data.sent || 0;
      totalSkipped += data.skipped || 0;
      totalFailed += data.failed || 0;
      totalProcessed += data.processed || 0;
    }

    const summary = {
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        totalProcessed,
        totalSent,
        totalSkipped,
        totalFailed
      },
      milestones: results.milestones
    };

    console.log('[Cron] Pilot conversion sequence complete:', summary.summary);

    return Response.json(summary);

  } catch (error) {
    console.error('[Cron] Error in pilot conversion sequence:', error);
    
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
