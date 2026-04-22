#!/usr/bin/env node
'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const { getPool } = require('../../lib/db');

const MIGRATION_SQL = `
-- 1. pilot_signups: add follow_up_sent tracking column
ALTER TABLE pilot_signups
  ADD COLUMN IF NOT EXISTS follow_up_sent BOOLEAN DEFAULT false;

-- 2. email_events: allow null customer_id for non-customer emails (pilot signups)
ALTER TABLE email_events ALTER COLUMN customer_id DROP NOT NULL;

-- 3. email_events: add source_id to reference originating record (e.g. pilot_signup.id)
ALTER TABLE email_events
  ADD COLUMN IF NOT EXISTS source_id UUID;

-- 4. email_events: expand email_type check to include pilot_signup_outreach
ALTER TABLE email_events DROP CONSTRAINT IF EXISTS email_events_email_type_check;
ALTER TABLE email_events ADD CONSTRAINT email_events_email_type_check
  CHECK (email_type = ANY (ARRAY[
    'welcome', 'renewal_success', 'payment_failed',
    'subscription_cancelled', 'subscription_upgraded',
    'subscription_downgraded', 'trial_ending', 'trial_ended',
    'upgrade_offer', 'pilot_signup_outreach'
  ]));

-- 5. Index for fast idempotency lookups
CREATE INDEX IF NOT EXISTS idx_email_events_source_id ON email_events(source_id);
`;

async function run() {
  const pool = getPool();
  try {
    await pool.query(MIGRATION_SQL);
    console.log('Migration applied: pilot-signup-follow-up');
    console.log('  - pilot_signups.follow_up_sent BOOLEAN DEFAULT false');
    console.log('  - email_events.customer_id now nullable');
    console.log('  - email_events.source_id UUID column added');
    console.log('  - email_events.email_type_check updated with pilot_signup_outreach');
    console.log('  - idx_email_events_source_id index created');
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  run().catch(err => {
    console.error('Migration failed:', err.message);
    process.exit(1);
  });
}

module.exports = { run, MIGRATION_SQL };
