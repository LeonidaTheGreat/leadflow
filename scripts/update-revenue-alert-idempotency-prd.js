#!/usr/bin/env node

/**
 * Update use_cases table to link uc-revenue-alert-idempotency to PRD-REVENUE-ALERT-IDEMPOTENCY
 * and update the prds table with the new PRD entry
 */

require('dotenv').config({ path: `${__dirname}/../.env` });

const { createClient } = require('../lib/db-client');

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  try {
    console.log('🔄 Updating PRD and use_cases tables...\n');

    // 1. Insert or update PRD entry
    console.log('📝 Inserting PRD entry...');
    const { data: prdData, error: prdError } = await supabase
      .from('prds')
      .upsert({
        id: 'prd-revenue-alert-idempotency',
        title: 'Revenue Alert Idempotency & Loop Prevention',
        file_path: 'docs/prd/PRD-REVENUE-ALERT-IDEMPOTENCY.md',
        description: 'Fix duplicate revenue alert task creation and cascading loop detection. Implement idempotency check in revenue-collector.js to prevent same alert from spawning every heartbeat.',
        status: 'draft',
        version: '1.0',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' })
      .select();

    if (prdError) {
      console.error('❌ PRD insert error:', prdError);
      process.exit(1);
    }

    console.log('✅ PRD entry created:', prdData[0]?.id);

    // 2. Update use_case to link to PRD
    console.log('\n📋 Updating use_case entry...');
    const { data: ucData, error: ucError } = await supabase
      .from('use_cases')
      .update({
        prd_id: 'prd-revenue-alert-idempotency'
      })
      .eq('id', 'uc-revenue-alert-idempotency')
      .select();

    if (ucError) {
      console.error('❌ Use case update error:', ucError);
      process.exit(1);
    }

    console.log('✅ Use case entry updated:', ucData[0]?.id);

    // 3. Verify the link
    console.log('\n✅ Verification:');
    const { data: verification, error: verifyError } = await supabase
      .from('use_cases')
      .select('id, prd_id')
      .eq('id', 'uc-revenue-alert-idempotency')
      .single();

    if (verifyError) {
      console.error('❌ Verification error:', verifyError);
      process.exit(1);
    }

    console.log(`   Use case ID: ${verification.id}`);
    console.log(`   PRD ID: ${verification.prd_id}`);
    console.log('');

    console.log('🎉 Success! PRD has been created and linked to use case.');
    console.log('');
    console.log('Next steps:');
    console.log('  1. Dev team implements the specification');
    console.log('  2. QC team verifies acceptance criteria');
    console.log('  3. Monitor logs for idempotent task creation');

  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
    process.exit(1);
  }
}

main();
