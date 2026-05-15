#!/usr/bin/env node
'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const { getPool } = require('../../lib/db');
const PilotSignupOutreachService = require('../../lib/services/PilotSignupOutreachService');

async function main() {
  const pool = getPool();

  const service = new PilotSignupOutreachService({ pool });
  const results = await service.runSequence();

  console.log(`Processed: ${results.processed}`);
  console.log(`Sent: ${results.sent}`);
  console.log(`Converted (auto-completed): ${results.converted}`);
  console.log(`Skipped (not due): ${results.skipped}`);
  console.log(`Errors: ${results.errors}`);

  if (results.errorDetails.length > 0) {
    for (const err of results.errorDetails) {
      console.log(`  ERROR: ${err.email} step ${err.step} — ${err.error}`);
    }
  }

  await pool.end();
  return results;
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Pilot signup outreach failed:', err.message);
      process.exit(1);
    });
}

module.exports = { main };
