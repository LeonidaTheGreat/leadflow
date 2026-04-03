#!/usr/bin/env node
/**
 * Update PRD and use case records for revenue collector dedup fix.
 */

const path = require('path')
const fs = require('fs')

const envPath = path.join(__dirname, '..', '.env')
if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath })
}

let sb = null
try {
  const { createClient } = require(path.join(__dirname, '..', 'lib', 'db-client'))

  sb = createClient()
  console.log('✅ Connected via PostgREST')
} catch (err) {
  console.error('Failed to load PostgREST client:', err.message)
  process.exit(1)
}

async function updateDatabase() {
  try {
    // 1. Upsert PRD
    console.log('\n[1] Upserting PRD...')
    const { data: prdData, error: prdError } = await sb
      .from('prds')
      .upsert({
        id: 'prd-revenue-collector-dedup',
        project_id: 'leadflow',
        title: 'Revenue Collector Deduplication',
        description: 'Fix duplicate revenue alert task creation in Genome Loop 5. Implement deduplication query, trajectory tracking, and auto-closure on improvement.',
        file_path: 'docs/prd/PRD-REVENUE-COLLECTOR-DEDUP.md',
        status: 'approved',
        version: '1.0'
      }, { onConflict: 'id' })

    if (prdError) {
      console.error('❌ PRD upsert error:', prdError)
      process.exit(1)
    }
    console.log('✅ PRD upserted: prd-revenue-collector-dedup')

    // 2. Create/update use case
    console.log('\n[2] Upserting use case...')
    const { data: ucData, error: ucError } = await sb
      .from('use_cases')
      .upsert({
        id: 'uc-revenue-collector-dedup',
        prd_id: 'prd-revenue-collector-dedup',
        name: 'Revenue Collector Deduplication',
        description: 'Prevent duplicate revenue alert tasks from being created every heartbeat when revenue is off-track. Implement deduplication logic in revenue-collector.js (Genome Loop 5).',
        phase: 'Phase 1',
        priority: 1,
        implementation_status: 'not_started',
        e2e_tests_defined: false,
        e2e_tests_passing: false,
        acceptance_criteria: [
          'No more than 1 revenue alert task per trajectory per goal type in ready/in_progress status',
          'Deduplication check queries existing tasks before createTask()',
          'Loop detection not triggered for 24+ hours after deploy',
          'All revenue alert tasks include goal_type, trajectory, gap_percent, days_remaining in metadata',
          'Tasks auto-close when trajectory improves (critical → behind)',
          'All 4 E2E test scenarios pass verification'
        ],
        workflow: ['Dev', 'QC', 'PM'],
        revenue_impact: 'high',
        project_id: 'leadflow',
        metadata: {
          affected_systems: ['genome', 'revenue-collector'],
          scope: 'orchestration',
          root_cause: 'No deduplication check in createRevenueAlertTasks()',
          blocks_loop_detection: true
        }
      }, { onConflict: 'id' })

    if (ucError) {
      console.error('❌ Use case upsert error:', ucError)
      process.exit(1)
    }
    console.log('✅ Use case upserted: uc-revenue-collector-dedup')

    console.log('\n✅ Database update complete\n')
    process.exit(0)
  } catch (err) {
    console.error('Fatal error:', err)
    process.exit(1)
  }
}

updateDatabase()
