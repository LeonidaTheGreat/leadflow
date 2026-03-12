#!/usr/bin/env node

/**
 * Pilot Conversion Email Cron Job
 * 
 * Runs daily to process pilot-to-paid conversion email sequence
 * Processes all three milestones: day 30, day 45, day 55
 * 
 * Usage:
 *   node scripts/pilot-conversion-cron.js
 * 
 * Scheduling:
 *   Add to vercel.json crons:
 *   "crons": [{
 *     "path": "/api/cron/pilot-conversion",
 *     "schedule": "0 9 * * *"  // 9 AM UTC daily
 *   }]
 */

const pilotConversionService = require('../lib/pilot-conversion-service');

/**
 * Main cron job function
 */
async function runConversionCron() {
  const startTime = Date.now();
  
  console.log('========================================');
  console.log('Starting pilot conversion email cron job');
  console.log('Timestamp:', new Date().toISOString());
  console.log('========================================');

  try {
    // Run the daily conversion sequence
    const results = await pilotConversionService.runDailyConversionSequence();

    // Log results
    console.log('\n✅ Conversion sequence completed');
    console.log('========================================');
    console.log('Summary:');
    console.log(`  Total eligible agents: ${results.totalEligible}`);
    console.log(`  Total emails sent: ${results.totalSent}`);
    console.log(`  Total failed: ${results.totalFailed}`);
    console.log('\nBreakdown by milestone:');
    
    for (const [milestone, data] of Object.entries(results.milestones)) {
      console.log(`\n  ${milestone}:`);
      console.log(`    Eligible: ${data.total}`);
      console.log(`    Sent: ${data.sent}`);
      console.log(`    Failed: ${data.failed}`);
      
      if (data.errors.length > 0) {
        console.log(`    Errors:`);
        data.errors.forEach(err => {
          console.log(`      - ${err.email || err.agent_id}: ${err.error}`);
        });
      }
    }

    const duration = Date.now() - startTime;
    console.log('\n========================================');
    console.log(`Cron job completed in ${duration}ms`);
    console.log('========================================\n');

    // Return for serverless/lambda execution
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Pilot conversion sequence processed',
        results
      })
    };
  } catch (error) {
    console.error('\n❌ Cron job failed:', error);
    console.error('========================================\n');

    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
}

// Run the cron job
if (require.main === module) {
  runConversionCron()
    .then(result => {
      console.log('Cron execution result:', result);
      process.exit(result.statusCode === 200 ? 0 : 1);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = runConversionCron;
