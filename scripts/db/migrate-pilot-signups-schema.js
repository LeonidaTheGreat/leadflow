#!/usr/bin/env node
/**
 * Migration: pilot_signups schema fix
 * Task: 4d4a0dbf-df48-4f7a-a5ef-120bc1761549
 *
 * Adds missing columns required by /api/lead-capture:
 *   - first_name TEXT
 *   - status TEXT DEFAULT 'nurture'
 *   - utm_source TEXT
 *   - utm_medium TEXT
 *   - utm_campaign TEXT
 *
 * Also creates unique index on pilot_signups(email) for ON CONFLICT deduplication.
 *
 * Safe to re-run — all statements use IF NOT EXISTS.
 */

const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '../../.env') })

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_DB_PASSWORD = process.env.SUPABASE_DB_PASSWORD

if (!SUPABASE_URL || !SUPABASE_DB_PASSWORD) {
  console.error('Missing SUPABASE_URL or SUPABASE_DB_PASSWORD in .env')
  process.exit(1)
}

// Extract project ref from URL (e.g. fptrokacdwzlmflyczdz)
const ref = SUPABASE_URL.replace('https://', '').split('.')[0]
const connectionString = `postgresql://postgres:${encodeURIComponent(SUPABASE_DB_PASSWORD)}@db.${ref}.supabase.co:5432/postgres`

const { Client } = require('pg')

const MIGRATION_SQL = `
ALTER TABLE pilot_signups
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'nurture',
  ADD COLUMN IF NOT EXISTS utm_source TEXT,
  ADD COLUMN IF NOT EXISTS utm_medium TEXT,
  ADD COLUMN IF NOT EXISTS utm_campaign TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS pilot_signups_email_unique ON pilot_signups(email);
`

async function runMigration() {
  const client = new Client({ connectionString })
  await client.connect()
  console.log('Connected to Supabase Postgres')

  try {
    await client.query(MIGRATION_SQL)
    console.log('✅ Migration applied successfully')
    console.log('  - Columns: first_name, status, utm_source, utm_medium, utm_campaign')
    console.log('  - Index: pilot_signups_email_unique ON pilot_signups(email)')
  } finally {
    await client.end()
  }
}

runMigration().catch((err) => {
  console.error('Migration failed:', err.message)
  process.exit(1)
})
