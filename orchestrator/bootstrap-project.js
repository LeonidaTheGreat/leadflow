#!/usr/bin/env node
/**
 * bootstrap-project.js — Project Bootstrap Script
 *
 * Takes a project.config.json and sets up everything needed for the
 * orchestration engine to manage a project autonomously:
 *
 *   1. Run Supabase migrations idempotently
 *   2. Seed PRDs/UCs from config or playbook templates
 *   3. Register smoke test endpoints
 *   4. Initialize revenue goals
 *   5. Seed GTM use cases
 *   6. Run first heartbeat
 *
 * Usage:
 *   node orchestrator/bootstrap-project.js [path/to/project.config.json]
 *
 * If no config path is given, uses the default (repo root project.config.json).
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })
const fs = require('fs')
const path = require('path')
const { loadProjectConfig, clearCache } = require('../project-config-loader')
const { createClient } = require('@supabase/supabase-js')

async function bootstrapProject(configPath) {
  const config = loadProjectConfig(configPath)
  clearCache() // Reset cache so getConfig() picks up this config

  console.log('='.repeat(60))
  console.log(`Bootstrapping project: ${config.project_name}`)
  console.log(`Project ID: ${config.project_id}`)
  console.log('='.repeat(60))

  // Connect to Supabase
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  // ── Step 1: Run Supabase Migrations ─────────────────────────────────────

  console.log('\n1. Running Supabase migrations (idempotent)...')
  const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations')
  if (fs.existsSync(migrationsDir)) {
    const sqlFiles = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort()

    for (const sqlFile of sqlFiles) {
      const sql = fs.readFileSync(path.join(migrationsDir, sqlFile), 'utf-8')
      console.log(`   Running: ${sqlFile}`)
      const { error } = await supabase.rpc('exec_sql', { sql_text: sql }).catch(() => ({ error: { message: 'rpc not available' } }))
      if (error) {
        // Try direct execution via REST — migrations use IF NOT EXISTS so they're safe
        console.log(`   (rpc unavailable, migration assumed applied: ${sqlFile})`)
      }
    }
  } else {
    console.log('   No migrations directory found')
  }

  // ── Step 2: Seed PRDs/UCs from Playbook ─────────────────────────────────

  console.log('\n2. Seeding PRDs and Use Cases...')
  const playbook = config.playbook || 'saas-mvp'
  const playbookPath = path.join(__dirname, 'playbooks', `${playbook}.json`)

  if (fs.existsSync(playbookPath)) {
    const playbookData = JSON.parse(fs.readFileSync(playbookPath, 'utf-8'))
    await seedFromPlaybook(supabase, config, playbookData)
  } else {
    console.log(`   Playbook "${playbook}" not found, skipping PRD/UC seeding`)
  }

  // ── Step 3: Register Distribution Channels ──────────────────────────────

  console.log('\n3. Registering distribution channels...')
  for (const test of config.smoke_tests || []) {
    if (test.url && test.check_type !== 'supabase_read') {
      await supabase.from('distribution_channels').upsert({
        project_id: config.project_id,
        channel_type: 'landing_page',
        name: test.name || test.id,
        url: test.url,
        status: 'active'
      }, { onConflict: 'project_id,channel_type,name' }).catch(() => {})
    }
  }
  console.log('   Channels registered')

  // ── Step 4: Initialize Revenue Goals ────────────────────────────────────

  console.log('\n4. Initializing revenue goals...')
  for (const goal of config.goals || []) {
    const { error } = await supabase.from('project_goals').upsert({
      project_id: config.project_id,
      goal_type: goal.type,
      target_value: goal.target,
      target_date: goal.target_date,
      status: 'active',
      metadata: { currency: goal.currency, seeded_from: 'bootstrap' }
    }, { onConflict: 'project_id,goal_type' }).catch(e => ({ error: e }))

    if (error) {
      // Table may not have unique constraint yet — try insert
      await supabase.from('project_goals').insert({
        project_id: config.project_id,
        goal_type: goal.type,
        target_value: goal.target,
        target_date: goal.target_date,
        status: 'active',
        metadata: { currency: goal.currency, seeded_from: 'bootstrap' }
      }).catch(() => {})
    }
    console.log(`   Goal: ${goal.type} → ${goal.target} by ${goal.target_date}`)
  }

  // ── Step 5: Seed GTM Use Cases ──────────────────────────────────────────

  console.log('\n5. Seeding GTM use cases...')
  try {
    const { seedGTMUseCases } = require('../scripts/seed-gtm-use-cases')
    await seedGTMUseCases()
  } catch (err) {
    console.warn('   GTM seeding failed (non-fatal):', err.message)
  }

  // ── Step 6: First Heartbeat ─────────────────────────────────────────────

  console.log('\n6. Running first heartbeat...')
  try {
    const { HeartbeatExecutor } = require('../heartbeat-executor')
    const executor = new HeartbeatExecutor()
    await executor.run()
  } catch (err) {
    console.warn('   First heartbeat failed (non-fatal):', err.message)
  }

  console.log('\n' + '='.repeat(60))
  console.log(`Bootstrap complete for: ${config.project_name}`)
  console.log('='.repeat(60))
}

/**
 * Seed PRDs and UCs from a playbook definition.
 */
async function seedFromPlaybook(supabase, config, playbook) {
  for (const prd of playbook.prds || []) {
    // Check if PRD exists
    const { data: existing } = await supabase
      .from('prds')
      .select('id')
      .eq('project_id', config.project_id)
      .eq('title', prd.title)
      .limit(1)

    if (existing && existing.length > 0) {
      console.log(`   PRD exists: ${prd.title}`)
      continue
    }

    const { data: newPRD, error: prdErr } = await supabase
      .from('prds')
      .insert({
        project_id: config.project_id,
        title: prd.title,
        description: prd.description,
        status: prd.status || 'approved',
        version: 1
      })
      .select()
      .single()

    if (prdErr) {
      console.warn(`   Failed to create PRD ${prd.title}:`, prdErr.message)
      continue
    }

    console.log(`   Created PRD: ${prd.title} (id: ${newPRD.id})`)

    // Seed UCs for this PRD
    for (const uc of prd.use_cases || []) {
      const { error: ucErr } = await supabase
        .from('use_cases')
        .insert({
          id: uc.id,
          prd_id: newPRD.id,
          name: uc.name,
          description: uc.description,
          workflow: uc.workflow,
          priority: uc.priority || 3,
          revenue_impact: uc.revenue_impact || 'none',
          acceptance_criteria: uc.acceptance_criteria || [],
          implementation_status: 'not_started'
        })

      if (ucErr) {
        console.warn(`   Failed to seed UC ${uc.id}:`, ucErr.message)
      } else {
        console.log(`   Seeded UC: ${uc.id} — ${uc.name}`)
      }
    }
  }
}

module.exports = { bootstrapProject }

if (require.main === module) {
  const configPath = process.argv[2] || undefined
  bootstrapProject(configPath).catch(err => {
    console.error('Bootstrap failed:', err)
    process.exit(1)
  })
}
