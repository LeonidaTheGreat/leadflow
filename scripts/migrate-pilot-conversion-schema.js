#!/usr/bin/env node
/**
 * Schema Migration: Pilot Conversion Email Sequence
 * 
 * This script creates the pilot_conversion_email_logs table and related
 * views/functions needed for the pilot-to-paid conversion email sequence.
 * 
 * IMPORTANT: Must be run BEFORE the conversion sequence is used.
 * 
 * Usage:
 *   node scripts/migrate-pilot-conversion-schema.js
 * 
 * Or via Supabase CLI:
 *   supabase db push
 */

require('dotenv').config();
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Migration statements (broken into smaller chunks for reliability)
 */
const migrations = [
  // Create pilot_conversion_email_logs table
  `
    CREATE TABLE IF NOT EXISTS pilot_conversion_email_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      agent_id UUID NOT NULL REFERENCES real_estate_agents(id) ON DELETE CASCADE,
      milestone VARCHAR(20) NOT NULL CHECK (milestone IN ('day_30', 'day_45', 'day_55')),
      template_key VARCHAR(50) NOT NULL,
      template_version VARCHAR(10) DEFAULT '1.0',
      recipient_email TEXT NOT NULL,
      subject TEXT NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'failed', 'skipped')),
      provider VARCHAR(20) DEFAULT 'resend',
      provider_message_id TEXT,
      error_message TEXT,
      personalized_data JSONB DEFAULT '{}',
      stats_leads_responded INTEGER,
      stats_avg_response_time_seconds INTEGER,
      stats_appointments_booked INTEGER,
      skipped_reason VARCHAR(50),
      sent_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(agent_id, milestone)
    )
  `,
  
  // Create indexes
  `CREATE INDEX IF NOT EXISTS idx_pilot_conversion_logs_agent_id ON pilot_conversion_email_logs(agent_id)`,
  `CREATE INDEX IF NOT EXISTS idx_pilot_conversion_logs_milestone ON pilot_conversion_email_logs(milestone)`,
  `CREATE INDEX IF NOT EXISTS idx_pilot_conversion_logs_status ON pilot_conversion_email_logs(status)`,
  `CREATE INDEX IF NOT EXISTS idx_pilot_conversion_logs_created_at ON pilot_conversion_email_logs(created_at DESC)`,
  
  // Create view for status
  `
    CREATE OR REPLACE VIEW pilot_conversion_sequence_status AS
    SELECT 
        a.id as agent_id,
        a.email as agent_email,
        a.first_name,
        a.last_name,
        a.plan_tier,
        a.pilot_started_at,
        CASE 
            WHEN a.pilot_started_at IS NULL THEN NULL
            ELSE EXTRACT(DAY FROM NOW() - a.pilot_started_at)::INTEGER
        END as days_since_pilot_start,
        COALESCE(d30.status, 'pending') as day_30_status,
        d30.sent_at as day_30_sent_at,
        COALESCE(d45.status, 'pending') as day_45_status,
        d45.sent_at as day_45_sent_at,
        COALESCE(d55.status, 'pending') as day_55_status,
        d55.sent_at as day_55_sent_at,
        COUNT(CASE WHEN pcl.status = 'sent' THEN 1 END) as emails_sent_count,
        MAX(pcl.sent_at) as last_email_sent_at
    FROM real_estate_agents a
    LEFT JOIN pilot_conversion_email_logs d30 ON d30.agent_id = a.id AND d30.milestone = 'day_30'
    LEFT JOIN pilot_conversion_email_logs d45 ON d45.agent_id = a.id AND d45.milestone = 'day_45'
    LEFT JOIN pilot_conversion_email_logs d55 ON d55.agent_id = a.id AND d55.milestone = 'day_55'
    LEFT JOIN pilot_conversion_email_logs pcl ON pcl.agent_id = a.id
    WHERE a.plan_tier = 'pilot' OR pcl.agent_id IS NOT NULL
    GROUP BY a.id, a.email, a.first_name, a.last_name, a.plan_tier, a.pilot_started_at,
             d30.status, d30.sent_at, d45.status, d45.sent_at, d55.status, d55.sent_at
  `,
  
  // Enable RLS
  `ALTER TABLE pilot_conversion_email_logs ENABLE ROW LEVEL SECURITY`,
  
  // Create RLS policy
  `
    CREATE POLICY "Service role can manage pilot conversion logs" ON pilot_conversion_email_logs
    FOR ALL USING (auth.role() = 'service_role')
  `,
  
  // Create trigger function for updated_at
  `
    CREATE OR REPLACE FUNCTION update_pilot_conversion_logs_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = CURRENT_TIMESTAMP;
      RETURN NEW;
    END;
    $$ language 'plpgsql'
  `,
  
  // Create trigger
  `
    DROP TRIGGER IF EXISTS update_pilot_conversion_logs_updated_at ON pilot_conversion_email_logs;
    CREATE TRIGGER update_pilot_conversion_logs_updated_at
    BEFORE UPDATE ON pilot_conversion_email_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_pilot_conversion_logs_updated_at()
  `
];

/**
 * Run migrations
 */
async function runMigrations() {
  console.log('\n' + '='.repeat(60));
  console.log('Pilot Conversion Email Sequence - Schema Migration');
  console.log('='.repeat(60));

  let completed = 0;
  let failed = 0;

  for (let i = 0; i < migrations.length; i++) {
    const sql = migrations[i].trim();
    if (!sql) continue;

    try {
      console.log(`[${i + 1}/${migrations.length}] Running migration...`);
      
      // Use postgres directly via RPC if available, otherwise use supabase
      const { error } = await supabase.rpc('exec', {
        sql
      }).catch(() => {
        // If exec doesn't exist, return error so we can handle it
        return { error: { message: 'exec function not available' } };
      });

      if (error) {
        // Try direct approach if RPC failed
        console.log('   ⚠️  RPC method not available, attempting direct execution...');
        // In production, you would use pg module directly
        // For now, just log that it should be run via Supabase dashboard
        console.log('   ℹ️  Please run this migration via Supabase dashboard or CLI');
        console.log('   Command: supabase db push');
        failed++;
      } else {
        console.log('   ✅ Migration applied');
        completed++;
      }
    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`);
      failed++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('Migration Summary');
  console.log('='.repeat(60));
  console.log(`✅ Completed: ${completed}`);
  console.log(`❌ Failed: ${failed}`);

  if (failed > 0) {
    console.log('\n⚠️  Some migrations could not be applied automatically.');
    console.log('   Please apply them manually via Supabase dashboard:');
    console.log('   1. Go to SQL editor in Supabase dashboard');
    console.log('   2. Copy content from: sql/pilot-conversion-email-schema.sql');
    console.log('   3. Execute the SQL');
  } else {
    console.log('\n✅ All migrations applied successfully!');
  }

  console.log('='.repeat(60));
  return failed === 0 ? 0 : 1;
}

// Run if called directly
if (require.main === module) {
  runMigrations().then(exitCode => process.exit(exitCode));
}

module.exports = { runMigrations };
