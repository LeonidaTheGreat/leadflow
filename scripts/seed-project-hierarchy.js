#!/usr/bin/env node
/**
 * Seed script for project hierarchy tables (PRDs + Use Cases)
 * Run after migration 004_project_hierarchy.sql
 *
 * Usage: node scripts/seed-project-hierarchy.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const prds = [
  { id: 'PRD-CORE-SMS', title: 'Core SMS Lead Response', status: 'approved', description: 'Core lead response via SMS in <30 seconds' },
  { id: 'PRD-BILLING', title: 'Billing & Subscriptions', status: 'approved', description: 'Stripe-based billing with tiered subscriptions' },
  { id: 'PRD-INTEGRATIONS', title: 'CRM & Calendar Integrations', status: 'approved', description: 'FUB CRM and Cal.com calendar integrations' },
]

const useCases = [
  { id: 'UC-1', prd_id: 'PRD-CORE-SMS', name: 'Lead-Initiated SMS', description: 'Respond to inbound lead SMS messages with AI-generated responses', implementation_status: 'complete', priority: 1, phase: 'Phase 1', workflow: ['product', 'dev', 'qc'] },
  { id: 'UC-2', prd_id: 'PRD-CORE-SMS', name: 'FUB New Lead Auto-SMS', description: 'Automatically send SMS when new lead appears in FUB CRM', implementation_status: 'ready', priority: 1, phase: 'Phase 1', workflow: ['product', 'dev', 'qc'] },
  { id: 'UC-3', prd_id: 'PRD-CORE-SMS', name: 'FUB Status Change', description: 'Trigger SMS workflows on FUB lead status changes', implementation_status: 'ready', priority: 1, phase: 'Phase 1', workflow: ['product', 'dev', 'qc'] },
  { id: 'UC-4', prd_id: 'PRD-CORE-SMS', name: 'FUB Agent Assignment', description: 'Handle agent assignment changes in FUB CRM', implementation_status: 'partial', priority: 2, phase: 'Phase 1', workflow: ['product', 'dev', 'qc'] },
  { id: 'UC-5', prd_id: 'PRD-CORE-SMS', name: 'Lead Opt-Out', description: 'Process STOP/opt-out messages and update CRM', implementation_status: 'complete', priority: 1, phase: 'Phase 1', workflow: ['product', 'dev', 'qc'] },
  { id: 'UC-6', prd_id: 'PRD-INTEGRATIONS', name: 'Cal.com Booking', description: 'Book appointments via Cal.com from SMS conversations', implementation_status: 'not_started', priority: 2, phase: 'Phase 2', workflow: ['product', 'dev', 'qc'] },
  { id: 'UC-7', prd_id: 'PRD-CORE-SMS', name: 'Dashboard Manual SMS', description: 'Send manual SMS from dashboard interface', implementation_status: 'not_started', priority: 3, phase: 'Phase 2', workflow: ['product', 'design', 'dev', 'qc'] },
  { id: 'UC-8', prd_id: 'PRD-CORE-SMS', name: 'Follow-up Sequences', description: 'Automated multi-step follow-up SMS sequences', implementation_status: 'not_started', priority: 2, phase: 'Phase 2', workflow: ['product', 'dev', 'qc'] },
  { id: 'UC-9', prd_id: 'PRD-BILLING', name: 'Customer Sign-Up Flow', description: 'Stripe checkout + onboarding for new customers', implementation_status: 'not_started', priority: 1, phase: 'Phase 3', workflow: ['product', 'design', 'dev', 'qc'], depends_on: [] },
  { id: 'UC-10', prd_id: 'PRD-BILLING', name: 'Billing Portal', description: 'Customer self-serve billing management via Stripe portal', implementation_status: 'not_started', priority: 2, phase: 'Phase 3', workflow: ['product', 'design', 'dev', 'qc'], depends_on: ['UC-9'] },
  { id: 'UC-11', prd_id: 'PRD-BILLING', name: 'Subscription Lifecycle', description: 'Handle upgrades, downgrades, cancellations, renewals', implementation_status: 'not_started', priority: 2, phase: 'Phase 3', workflow: ['product', 'dev', 'qc'], depends_on: ['UC-9'] },
  { id: 'UC-12', prd_id: 'PRD-BILLING', name: 'MRR Reporting', description: 'Monthly recurring revenue tracking and analytics dashboard', implementation_status: 'not_started', priority: 3, phase: 'Phase 3', workflow: ['product', 'analytics'], depends_on: ['UC-11'] },
]

async function seed() {
  console.log('Seeding PRDs...')
  for (const prd of prds) {
    const { error } = await supabase
      .from('prds')
      .upsert(prd, { onConflict: 'id' })
    if (error) {
      console.error(`  Failed to seed PRD ${prd.id}:`, error.message)
    } else {
      console.log(`  ✓ ${prd.id}: ${prd.title}`)
    }
  }

  console.log('\nSeeding Use Cases...')
  for (const uc of useCases) {
    const { error } = await supabase
      .from('use_cases')
      .upsert(uc, { onConflict: 'id' })
    if (error) {
      console.error(`  Failed to seed UC ${uc.id}:`, error.message)
    } else {
      console.log(`  ✓ ${uc.id}: ${uc.name} [${uc.implementation_status}]`)
    }
  }

  console.log('\nSeed complete.')
}

seed().catch(err => {
  console.error('Seed failed:', err)
  process.exit(1)
})
