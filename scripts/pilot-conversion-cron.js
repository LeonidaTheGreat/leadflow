#!/usr/bin/env node
/**
 * taskSpec
 * What:
 * - Update /scripts/pilot-conversion-cron.js main() env bootstrap logic so API URL/key are resolved from
 *   NEXT_PUBLIC_API_URL/API_SECRET_KEY first, then LEADFLOW_API_KEY, then SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY.
 * - Keep PilotConversionService invocation unchanged; only fix runtime wiring and operator-visible warnings.
 * Verify:
 * - NEXT_PUBLIC_API_URL=http://127.0.0.1:8788/rest/v1 API_SECRET_KEY=<key> node scripts/pilot-conversion-cron.js exits 0.
 * - node scripts/pilot-conversion-cron.js still exits 0 with no DB config and logs clear warning.
 * - launchctl list | grep ai.leadflow.pilot-conversion shows loaded launchd job after plist install.
 * Boundaries:
 * - Do not change PilotConversionService milestone logic/templates.
 * - Do not modify route handlers or unrelated cron jobs.
 * - Do not alter billing/email business rules beyond DB client configuration.
 */
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
 *   - FROM_EMAIL (optional, defaults to stojan@landyourleads.com)
 * 
 * Scheduling (cron):
 *   0 9 * * * /usr/bin/node /path/to/scripts/pilot-conversion-cron.js
 *   (Runs daily at 9 AM)
 */

require('dotenv').config();

const { createClient } = require('../lib/db');
const PilotConversionService = require('../lib/services/PilotConversionService');

async function main() {
  console.log('='.repeat(60));
  console.log('Pilot Conversion Email Sequence - Daily Cron');
  console.log(`Started: ${new Date().toISOString()}`);
  console.log('='.repeat(60));

  try {
    const normalizedSupabaseUrl = process.env.SUPABASE_URL
      ? process.env.SUPABASE_URL.replace(/\/$/, '')
      : '';
    const apiUrl = process.env.NEXT_PUBLIC_API_URL
      || (normalizedSupabaseUrl ? `${normalizedSupabaseUrl}/rest/v1` : '')
      || '';
    const apiKey = process.env.API_SECRET_KEY
      || process.env.LEADFLOW_API_KEY
      || process.env.SUPABASE_SERVICE_ROLE_KEY
      || '';

    if (!apiUrl || !apiKey) {
      console.warn('⚠️  Missing API DB env. Configure NEXT_PUBLIC_API_URL + API_SECRET_KEY (or LEADFLOW_API_KEY).');
      console.warn('Cron will run in no-op mode until DB env is configured.');
    }

    if (!process.env.RESEND_API_KEY) {
      console.warn('⚠️  RESEND_API_KEY not set - emails will be logged but not sent');
    }

    // Initialize service with DB client from resolved envs.
    const db = (apiUrl && apiKey) ? createClient(apiUrl, apiKey) : null;
    const service = new PilotConversionService({ db });

    // Run the conversion sequence
    const results = await service.runConversionSequence();

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
