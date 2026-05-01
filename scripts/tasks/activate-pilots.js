#!/usr/bin/env node

/**
 * Trial Activation Auto-Pipeline
 * Activates new pilots: sends trial CTA email, updates records, creates sample leads
 *
 * Usage: node scripts/tasks/activate-pilots.js [--dry-run]
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') });
require('dotenv').config({ path: require('path').resolve(process.env.HOME || '/root', '.env') });

const { getPool } = require('../../lib/db');
const EmailService = require('../../lib/services/EmailService');
const TrialActivationService = require('../../lib/services/TrialActivationService');

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  console.log('🚀 Trial Activation Pipeline\n');

  if (dryRun) {
    console.log('📋 DRY RUN MODE - no changes will be persisted\n');
  }

  try {
    // Initialize database pool
    const pool = getPool();

    // Initialize email service
    const emailService = new EmailService({
      apiKey: process.env.RESEND_API_KEY,
      fromEmail: process.env.FROM_EMAIL || 'stojan@landyourleads.com',
      fromName: 'LeadFlow',
    });

    // Initialize trial activation service
    const service = new TrialActivationService({
      pool,
      emailService,
      appUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://leadflow-ai-five.vercel.app',
    });

    // Run activation process
    const results = await service.processActivations();

    // Display results
    console.log('\n📊 Results:\n');
    console.log(`  Found:       ${results.processed} pending pilots`);
    console.log(`  Activated:   ${results.activated}`);
    console.log(`  Skipped:     ${results.skipped} (already emailed)`);
    console.log(`  Failed:      ${results.failed}`);

    if (results.errors.length > 0) {
      console.log('\n⚠️  Errors:\n');
      results.errors.forEach((err) => {
        if (err.email) {
          console.log(`  - ${err.email}: ${err.error}`);
        } else {
          console.log(`  - ${err.error}`);
        }
      });
    }

    if (dryRun) {
      console.log('\n📋 DRY RUN COMPLETE - no changes persisted');
    } else {
      console.log('\n✅ Activation pipeline complete');
    }

    process.exit(results.failed > 0 ? 1 : 0);
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
