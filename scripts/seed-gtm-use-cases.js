#!/usr/bin/env node
/**
 * seed-gtm-use-cases.js — Seed GTM (Go-To-Market) use cases
 *
 * Generic use case templates that any project gets automatically.
 * These are the distribution/marketing counterpart to the feature UCs.
 *
 * Usage:
 *   node scripts/seed-gtm-use-cases.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })
const { createClient } = require('@supabase/supabase-js')
const { getConfig } = require('../project-config-loader')

const config = getConfig()
const PROJECT_ID = config.project_id

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const GTM_USE_CASES = [
  {
    id: 'gtm-landing-page',
    name: 'Landing Page',
    description: 'Create a high-converting landing page that clearly communicates the value proposition, pricing, and includes a signup CTA.',
    workflow: ['product', 'marketing', 'design', 'dev', 'qc'],
    priority: 2,
    revenue_impact: 'high',
    acceptance_criteria: [
      'Page loads in <3s',
      'Clear headline and value prop above the fold',
      'Pricing section visible',
      'Signup/CTA button functional',
      'Mobile responsive',
      'SEO meta tags present'
    ]
  },
  {
    id: 'gtm-signup-flow',
    name: 'Signup Flow',
    description: 'Build a frictionless signup flow: email → verification → onboarding → dashboard.',
    workflow: ['product', 'design', 'dev', 'qc'],
    priority: 2,
    revenue_impact: 'high',
    acceptance_criteria: [
      'Email signup works',
      'Email verification sent',
      'Redirects to onboarding after signup',
      'Stores user in database',
      'Error handling for duplicate emails'
    ]
  },
  {
    id: 'gtm-onboarding',
    name: 'User Onboarding',
    description: 'Guide new users through setup: connect integrations, configure preferences, see first value within 5 minutes.',
    workflow: ['product', 'design', 'dev', 'qc'],
    priority: 3,
    revenue_impact: 'medium',
    acceptance_criteria: [
      'Step-by-step setup wizard',
      'Integration connection UI',
      'Progress indicator',
      'Skip option for non-essential steps',
      'Completion celebration / first value moment'
    ]
  },
  {
    id: 'gtm-conversion-optimization',
    name: 'Conversion Optimization',
    description: 'Analyze funnel drop-offs and implement changes to improve trial-to-paid conversion rate.',
    workflow: ['analytics', 'product', 'dev', 'qc'],
    priority: 3,
    revenue_impact: 'high',
    acceptance_criteria: [
      'Funnel analysis document produced',
      'Top 3 drop-off points identified',
      'A/B test plan for top improvement',
      'Implementation of highest-impact change',
      'Conversion tracking in place'
    ]
  },
  {
    id: 'gtm-content-marketing',
    name: 'Content Marketing',
    description: 'Create content that drives organic traffic: blog posts, guides, case studies targeting ICP search terms.',
    workflow: ['product', 'marketing', 'qc'],
    priority: 4,
    revenue_impact: 'medium',
    acceptance_criteria: [
      'SEO keyword research completed',
      'Content calendar (4 pieces/month)',
      'First piece published',
      'Distribution plan (social, email, communities)',
      'Analytics tracking for content performance'
    ]
  }
]

async function seedGTMUseCases() {
  console.log('Seeding GTM use cases...')

  // Find or create a GTM PRD
  let prdId = null
  const { data: existingPRD } = await supabase
    .from('prds')
    .select('id')
    .eq('project_id', PROJECT_ID)
    .ilike('title', '%GTM%')
    .limit(1)

  if (existingPRD && existingPRD.length > 0) {
    prdId = existingPRD[0].id
  } else {
    const { data: newPRD, error: prdErr } = await supabase
      .from('prds')
      .insert({
        project_id: PROJECT_ID,
        title: 'GTM & Distribution',
        description: 'Go-to-market use cases for landing page, signup, onboarding, conversion, and content marketing.',
        status: 'approved',
        version: 1
      })
      .select()
      .single()

    if (prdErr) {
      console.error('Failed to create GTM PRD:', prdErr.message)
      return
    }
    prdId = newPRD.id
    console.log(`  Created GTM PRD (id: ${prdId})`)
  }

  // Seed each use case
  for (const uc of GTM_USE_CASES) {
    const { data: existing } = await supabase
      .from('use_cases')
      .select('id')
      .eq('id', uc.id)
      .limit(1)

    if (existing && existing.length > 0) {
      console.log(`  Skipping ${uc.id} — already exists`)
      continue
    }

    const { error } = await supabase
      .from('use_cases')
      .insert({
        id: uc.id,
        prd_id: prdId,
        name: uc.name,
        description: uc.description,
        workflow: uc.workflow,
        priority: uc.priority,
        revenue_impact: uc.revenue_impact,
        acceptance_criteria: uc.acceptance_criteria,
        implementation_status: 'not_started'
      })

    if (error) {
      console.warn(`  Failed to seed ${uc.id}:`, error.message)
    } else {
      console.log(`  Seeded: ${uc.id} — ${uc.name} (${uc.workflow.join(' → ')})`)
    }
  }

  console.log('GTM use case seeding complete')
}

module.exports = { seedGTMUseCases, GTM_USE_CASES }

if (require.main === module) {
  seedGTMUseCases().catch(err => {
    console.error('Fatal:', err)
    process.exit(1)
  })
}
