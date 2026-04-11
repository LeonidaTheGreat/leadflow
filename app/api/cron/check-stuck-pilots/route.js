/**
 * Stuck Pilots Alert - Vercel Cron Route
 *
 * This route is triggered by Vercel Cron to check for stuck pilots
 * and send Telegram alerts through StuckPilotsService.
 */

import stuckPilotsServiceModule from '@/lib/services/StuckPilotsService';

const { createDefaultStuckPilotsService } = stuckPilotsServiceModule;
const stuckPilotsService = createDefaultStuckPilotsService();

export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  const isCronRequest =
    authHeader === `Bearer ${process.env.CRON_SECRET}` ||
    request.headers.get('x-vercel-cron') === '1';

  const isServiceRole =
    authHeader === `Bearer ${process.env.API_SECRET_KEY}` ||
    authHeader === `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`;

  if (!isCronRequest && !isServiceRole) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('[Cron] Starting stuck pilots check...');

  try {
    const result = await stuckPilotsService.checkAndAlertStuckPilots();
    const summary = {
      success: true,
      timestamp: new Date().toISOString(),
      ...result,
    };

    console.log('[Cron] Stuck pilots check complete:', result);
    return Response.json(summary);
  } catch (error) {
    console.error('[Cron] Error in stuck pilots check:', error);
    return Response.json(
      {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  return GET(request);
}
