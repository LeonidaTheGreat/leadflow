/**
 * Vercel Cron Route: Pilot Conversion Email Sequence
 * 
 * Path: /api/cron/pilot-conversion
 * Schedule: Runs daily at 9 AM UTC
 * 
 * This is a serverless function that triggers the pilot-to-paid conversion email sequence.
 * Vercel will call this automatically based on the schedule defined in vercel.json
 */

const pilotConversionService = require('../lib/pilot-conversion-service');

/**
 * Handler for Vercel cron invocations
 */
async function handler(req, res) {
  // Verify this is a cron request from Vercel
  // (In production, Vercel sets the Authorization header for cron requests)
  const cronSecret = req.headers['x-vercel-cron-secret'];
  
  if (process.env.VERCEL_ENV === 'production' && !cronSecret) {
    console.warn('Cron request without proper authorization header');
  }

  try {
    console.log('[Cron] Starting pilot conversion email sequence');
    
    const results = await pilotConversionService.runDailyConversionSequence();

    console.log('[Cron] Sequence completed:', {
      totalEligible: results.totalEligible,
      totalSent: results.totalSent,
      totalFailed: results.totalFailed
    });

    return res.status(200).json({
      success: true,
      message: 'Pilot conversion sequence executed',
      timestamp: new Date().toISOString(),
      results
    });
  } catch (error) {
    console.error('[Cron] Error:', error);

    return res.status(500).json({
      success: false,
      message: 'Pilot conversion sequence failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = handler;
