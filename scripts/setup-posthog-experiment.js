/**
 * PostHog Experiment Setup Script
 * 
 * This script helps configure the landing page headline A/B test in PostHog.
 * Run with: node scripts/setup-posthog-experiment.js
 */

const axios = require('axios')

// Configuration
const POSTHOG_API_KEY = process.env.POSTHOG_API_KEY
const POSTHOG_PROJECT_ID = process.env.POSTHOG_PROJECT_ID
const POSTHOG_HOST = process.env.POSTHOG_HOST || 'https://app.posthog.com'

// Experiment Configuration
const EXPERIMENT_CONFIG = {
  name: 'Landing Page Headline V1',
  key: 'landing_page_headline_v1',
  description: 'Test different headline variations to optimize conversion rate',
  variants: [
    {
      key: 'control',
      name: 'Control - Never Miss Another Lead',
      rollout_percentage: 25
    },
    {
      key: 'benefit_focused',
      name: 'Benefit Focused - Close 3x More Deals',
      rollout_percentage: 25
    },
    {
      key: 'urgency_focused',
      name: 'Urgency Focused - Your Leads Are Waiting',
      rollout_percentage: 25
    },
    {
      key: 'social_proof',
      name: 'Social Proof - Join 1,000+ Top Agents',
      rollout_percentage: 25
    }
  ],
  // Primary metric for the experiment
  parameters: {
    minimum_detectable_effect: 0.1, // 10% minimum detectable effect
    recommended_sample_size: 1000,
    recommended_running_time: 14 // days
  }
}

// Event tracking configuration
const TRACKED_EVENTS = [
  {
    event: 'landing_page_viewed',
    description: 'User viewed the landing page',
    properties: ['url', 'referrer', 'variant']
  },
  {
    event: 'cta_clicked',
    description: 'User clicked a CTA button',
    properties: ['cta_location', 'cta_text', 'variant']
  },
  {
    event: 'email_captured',
    description: 'User submitted email address',
    properties: ['email_domain', 'variant']
  },
  {
    event: 'conversion',
    description: 'User converted (primary metric)',
    properties: ['conversion_type', 'variant', 'value']
  }
]

async function createFeatureFlag() {
  if (!POSTHOG_API_KEY || !POSTHOG_PROJECT_ID) {
    console.log('⚠️  POSTHOG_API_KEY and POSTHOG_PROJECT_ID environment variables required')
    console.log('')
    console.log('Manual Setup Instructions:')
    console.log('1. Go to https://app.posthog.com/feature_flags')
    console.log('2. Click "New feature flag"')
    console.log('3. Set the following:')
    console.log('   Key:', EXPERIMENT_CONFIG.key)
    console.log('   Description:', EXPERIMENT_CONFIG.description)
    console.log('   Variants:')
    EXPERIMENT_CONFIG.variants.forEach(v => {
      console.log(`     - ${v.key} (${v.rollout_percentage}%) - ${v.name}`)
    })
    return
  }

  try {
    const response = await axios.post(
      `${POSTHOG_HOST}/api/projects/${POSTHOG_PROJECT_ID}/feature_flags/`,
      {
        key: EXPERIMENT_CONFIG.key,
        name: EXPERIMENT_CONFIG.name,
        description: EXPERIMENT_CONFIG.description,
        active: true,
        filters: {
          groups: [
            {
              properties: [],
              rollout_percentage: 100
            }
          ],
          multivariate: {
            variants: EXPERIMENT_CONFIG.variants.map(v => ({
              key: v.key,
              name: v.name,
              rollout_percentage: v.rollout_percentage
            }))
          }
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${POSTHOG_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    )

    console.log('✅ Feature flag created successfully!')
    console.log('Flag ID:', response.data.id)
  } catch (error) {
    console.error('❌ Error creating feature flag:', error.message)
    if (error.response?.data) {
      console.error('Response:', error.response.data)
    }
  }
}

async function createExperiment() {
  if (!POSTHOG_API_KEY || !POSTHOG_PROJECT_ID) {
    console.log('')
    console.log('To create an experiment manually:')
    console.log('1. Go to https://app.posthog.com/experiments')
    console.log('2. Click "New experiment"')
    console.log('3. Select the feature flag:', EXPERIMENT_CONFIG.key)
    console.log('4. Set primary metric: Event "conversion" with property "conversion_type = lead_capture"')
    console.log('5. Set goal: Increase conversion rate by at least 10%')
    return
  }

  try {
    const response = await axios.post(
      `${POSTHOG_HOST}/api/projects/${POSTHOG_PROJECT_ID}/experiments/`,
      {
        name: EXPERIMENT_CONFIG.name,
        description: EXPERIMENT_CONFIG.description,
        feature_flag_key: EXPERIMENT_CONFIG.key,
        parameters: EXPERIMENT_CONFIG.parameters
      },
      {
        headers: {
          'Authorization': `Bearer ${POSTHOG_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    )

    console.log('✅ Experiment created successfully!')
    console.log('Experiment ID:', response.data.id)
  } catch (error) {
    console.error('❌ Error creating experiment:', error.message)
    if (error.response?.data) {
      console.error('Response:', error.response.data)
    }
  }
}

function printEventTrackingSetup() {
  console.log('')
  console.log('📊 Event Tracking Configuration')
  console.log('================================')
  console.log('')
  console.log('The following events are tracked automatically:')
  console.log('')
  
  TRACKED_EVENTS.forEach(e => {
    console.log(`Event: ${e.event}`)
    console.log(`  Description: ${e.description}`)
    console.log(`  Properties: ${e.properties.join(', ')}`)
    console.log('')
  })

  console.log('To view these events in PostHog:')
  console.log('1. Go to https://app.posthog.com/events')
  console.log('2. Filter by event name')
  console.log('')
  console.log('For the experiment dashboard, go to:')
  console.log('https://app.posthog.com/experiments')
}

async function main() {
  console.log('🚀 PostHog A/B Test Setup for LeadFlow')
  console.log('========================================')
  console.log('')

  console.log('Experiment:', EXPERIMENT_CONFIG.name)
  console.log('Key:', EXPERIMENT_CONFIG.key)
  console.log('')

  console.log('Variants:')
  EXPERIMENT_CONFIG.variants.forEach(v => {
    console.log(`  • ${v.key}: ${v.name} (${v.rollout_percentage}%)`)
  })
  console.log('')

  // Create feature flag
  console.log('Creating feature flag...')
  await createFeatureFlag()
  console.log('')

  // Create experiment
  console.log('Creating experiment...')
  await createExperiment()

  // Print event tracking info
  printEventTrackingSetup()

  console.log('')
  console.log('✨ Setup complete!')
  console.log('')
  console.log('Next steps:')
  console.log('1. Add POSTHOG_API_KEY to your .env file')
  console.log('2. Start your application: npm run dev')
  console.log('3. Monitor results in PostHog dashboard')
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error)
}

module.exports = {
  EXPERIMENT_CONFIG,
  TRACKED_EVENTS,
  createFeatureFlag,
  createExperiment
}
