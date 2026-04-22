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

  const stepNames = { 1: 'Welcome', 2: 'Day 3 Reminder', 3: 'Day 7 Final Offer' };
  for (const [step, data] of Object.entries(results.steps)) {
    const name = stepNames[step] || `Step ${step}`;
    console.log(`${name}: ${data.sent} sent, ${data.failed} failed (${data.eligible} eligible)`);
    if (data.errors.length > 0) {
      for (const err of data.errors) {
        console.log(`  ERROR: ${err.email} — ${err.error}`);
      }
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
