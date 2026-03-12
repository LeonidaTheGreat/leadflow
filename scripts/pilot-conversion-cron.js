#!/usr/bin/env node
/**
 * Pilot Conversion Email Sequence - Daily Cron Job
 * 
 * This script runs daily to check for pilot agents at conversion milestones
 * and sends appropriate conversion emails.
 * 
 * Usage:
 *   node scripts/pilot-conversion-cron.js
 * 
 * Environment Variables:
 *   - SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 *   - RESEND_API_KEY
 *   - FROM_EMAIL (optional, defaults to stojan@leadflow.ai)
 * 
 * Scheduling (cron):
 *   0 9 * * * /usr/bin/node /path/to/scripts/pilot-conversion-cron.js
 *   (Runs daily at 9 AM)
 */

require('dotenv').config();

const { runConversionSequence } = require('../lib/pilot-conversion-service');

async function main() {
  console.log('='.repeat(60));
  console.log('Pilot Conversion Email Sequence - Daily Cron');
  console.log(`Started: ${new Date().toISOString()}`);
  console.log('='.repeat(60));

  try {
    // Validate environment
    const requiredEnv = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
    const missing = requiredEnv.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      console.warn('⚠️  Missing environment variables:', missing.join(', '));
      console.warn('Some functionality may be limited.');
    }

    if (!process.env.RESEND_API_KEY) {
      console.warn('⚠️  RESEND_API_KEY not set - emails will be logged but not sent');
    }

    // Run the conversion sequence
    const results = await runConversionSequence();

    // Output summary
    console.log('\n' + '='.repeat(60));
    console.log('Results Summary');
    console.log('='.repeat(60));
    
    let totalSent = 0;
    let totalSkipped = 0;
    let totalFailed = 0;

    for (const [milestone, data] of Object.entries(results.milestones)) {
      console.log(`\n${milestone}:`);
      console.log(`  Processed: ${data.processed}`);
      console.log(`  Sent: ${data.sent}`);
      console.log(`  Skipped: ${data.skipped}`);
      console.log(`  Failed: ${data.failed}`);
      
      totalSent += data.sent;
      totalSkipped += data.skipped;
      totalFailed += data.failed;

      if (data.errors.length > 0) {
        console.log(`  Errors:`);
        data.errors.forEach(err => {
          console.log(`    - ${err.agent || 'Unknown'}: ${err.error}`);
        });
      }
    }

    console.log('\n' + '-'.repeat(60));
    console.log(`Total: ${totalSent} sent, ${totalSkipped} skipped, ${totalFailed} failed`);
    console.log('='.repeat(60));
    console.log(`Completed: ${new Date().toISOString()}`);
    console.log('='.repeat(60));

    // Exit with error code if there were failures
    process.exit(totalFailed > 0 ? 1 : 0);

  } catch (error) {
    console.error('\n❌ Fatal error in cron job:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { main };
