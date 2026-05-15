#!/usr/bin/env node
'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const { getPool } = require('../../lib/db');

const MIGRATION_SQL = `
ALTER TABLE pilot_signups
  ADD COLUMN IF NOT EXISTS follow_up_stage INTEGER DEFAULT 0;

ALTER TABLE pilot_signups
  ADD COLUMN IF NOT EXISTS last_follow_up_at TIMESTAMP WITH TIME ZONE;

CREATE TABLE IF NOT EXISTS pilot_email_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pilot_signup_id UUID NOT NULL REFERENCES pilot_signups(id),
  email_type TEXT NOT NULL,
  recipient TEXT NOT NULL,
  subject TEXT,
  status TEXT NOT NULL DEFAULT 'sent',
  resend_id TEXT,
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pilot_email_log_signup ON pilot_email_log(pilot_signup_id);
CREATE INDEX IF NOT EXISTS idx_pilot_email_log_type ON pilot_email_log(email_type);
`;

async function run() {
  const pool = getPool();
  try {
    await pool.query(MIGRATION_SQL);
    console.log('Migration applied: pilot-signup-follow-up');
    console.log('  - pilot_signups.follow_up_stage INTEGER DEFAULT 0');
    console.log('  - pilot_signups.last_follow_up_at TIMESTAMPTZ');
    console.log('  - pilot_email_log table and indexes created');
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
