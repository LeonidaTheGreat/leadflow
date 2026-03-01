#!/usr/bin/env node
/**
 * Populate e2e_test_specs table from E2E_MAPPINGS.md
 * Usage: node scripts/seed-e2e-test-specs.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const specs = [
  // UC-1: Lead-Initiated SMS
  {
    use_case_id: 'UC-1',
    test_name: 'UC-1: Lead-Initiated SMS Flow',
    test_file: 'tests/e2e/uc-1-inbound-sms.test.ts',
    test_spec: {
      setup: { leadPhone: '+12015559999', messageBody: "Hi, I'm looking for a house in Austin", expectedIntent: 'buy', expectedUrgency: 7 },
      timeout: 5000, retries: 2
    },
    assertions: [
      { type: 'api', endpoint: 'POST /api/webhook/twilio', expect: 200 },
      { type: 'database', table: 'leads', query: 'phone = +12015559999', expect: 'exists' },
      { type: 'database', table: 'messages', query: "direction = 'inbound'", expect: 'exists' },
      { type: 'ai', check: "response.includes('Austin') || response.includes('house')", expect: true },
      { type: 'database', table: 'messages', query: "direction = 'outbound' AND ai_generated = true", expect: 'exists' },
      { type: 'response', contains: '<Response><Message>', expect: true }
    ],
    last_result: 'pass'
  },

  // UC-2: FUB New Lead Auto-Response
  {
    use_case_id: 'UC-2',
    test_name: 'UC-2: FUB New Lead Auto-Response',
    test_file: 'tests/e2e/uc-2-fub-new-lead.test.ts',
    test_spec: {
      setup: { fubLead: { name: 'Test Lead', phone: '+12015559998', email: 'test@example.com', source: 'Zillow' } },
      timeout: 10000, retries: 2
    },
    assertions: [
      { type: 'api', endpoint: 'POST /api/webhook/fub', payload: 'peopleCreated', expect: 200 },
      { type: 'database', table: 'leads', query: 'fub_id IS NOT NULL', expect: 'exists' },
      { type: 'database', table: 'qualifications', expect: 'exists' },
      { type: 'time', metric: 'sms_sent_within', max: 30000 },
      { type: 'database', table: 'messages', query: "direction = 'outbound'", expect: 'exists' },
      { type: 'api', endpoint: 'GET /fub/activities', expect: 'contains SMS activity' }
    ],
    last_result: 'not_run'
  },

  // UC-3: FUB Status Change SMS
  {
    use_case_id: 'UC-3',
    test_name: 'UC-3: FUB Status Change SMS',
    test_file: 'tests/e2e/uc-3-fub-status-change.test.ts',
    test_spec: {
      scenarios: [
        { name: 'Appointment Set', statusChange: { from: 'new', to: 'appointment' }, expectSms: true, smsType: 'booking_confirmation' },
        { name: 'Lead Responded', statusChange: { from: 'new', to: 'responded' }, expectSms: true, smsType: 'follow_up' }
      ]
    },
    assertions: [
      { type: 'api', endpoint: 'POST /api/webhook/fub', payload: 'peopleStageUpdated', expect: 200 },
      { type: 'database', table: 'leads', query: "status = 'appointment'", expect: 'exists' },
      { type: 'conditional', if: "status = 'appointment'", then: "sms_type = 'booking_confirmation'" },
      { type: 'api', endpoint: 'GET /fub/activities', expect: 'contains status change + SMS' }
    ],
    last_result: 'not_run'
  },

  // UC-4: Agent Assignment Intro SMS
  {
    use_case_id: 'UC-4',
    test_name: 'UC-4: Agent Assignment Intro SMS',
    test_file: 'tests/e2e/uc-4-agent-assignment.test.ts',
    test_spec: {
      setup: { agent: { name: 'Jane Smith', fubId: 'agent_123', calComLink: 'https://cal.com/janesmith' } },
      todo: 'Add intro SMS template in templates/sms/agent-assignment.txt'
    },
    assertions: [
      { type: 'api', endpoint: 'POST /api/webhook/fub', payload: 'lead.assigned', expect: 200 },
      { type: 'database', table: 'leads', query: "agent_id = 'agent_123'", expect: 'exists' },
      { type: 'database', table: 'messages', query: "content ILIKE '%Jane Smith%'", expect: 'exists' },
      { type: 'sms', contains: ['new agent', 'Jane Smith'], expect: true }
    ],
    last_result: 'not_run'
  },

  // UC-5: Opt-Out Handling
  {
    use_case_id: 'UC-5',
    test_name: 'UC-5: Opt-Out Handling',
    test_file: 'tests/e2e/uc-5-opt-out.test.ts',
    test_spec: {
      scenarios: [
        { keyword: 'STOP', expectBlock: true },
        { keyword: 'stop', expectBlock: true },
        { keyword: 'UNSUBSCRIBE', expectBlock: true },
        { keyword: 'unsubscribe', expectBlock: true }
      ]
    },
    assertions: [
      { type: 'api', endpoint: 'POST /api/webhook/twilio', body: 'STOP', expect: 200 },
      { type: 'database', table: 'leads', query: "status = 'opted_out'", expect: 'exists' },
      { type: 'database', table: 'leads', query: 'dnc = true', expect: 'exists' },
      { type: 'sms', contains: 'unsubscribed', expect: true },
      { type: 'test', name: 'follow_up_blocked', action: 'send SMS to opted-out lead', expect: 'blocked' }
    ],
    last_result: 'pass'
  },

  // UC-6: Cal.com Booking Confirmation
  {
    use_case_id: 'UC-6',
    test_name: 'UC-6: Cal.com Booking Confirmation',
    test_file: 'tests/e2e/uc-6-cal-booking.test.ts',
    test_spec: {
      setup: { booking: { leadPhone: '+12015559997', date: '2026-03-01', time: '14:00', timezone: 'America/New_York' } }
    },
    assertions: [
      { type: 'api', endpoint: 'POST /api/webhook/calcom', expect: 200 },
      { type: 'database', table: 'bookings', expect: 'exists' },
      { type: 'sms', contains: ['March 1', '2:00 PM', 'confirmed'], expect: true },
      { type: 'database', table: 'leads', query: "status = 'appointment'", expect: 'exists' },
      { type: 'scheduled', job: 'reminder_sms', trigger: '24h before appointment', expect: 'scheduled' }
    ],
    last_result: 'pass'
  },

  // UC-7: Dashboard Manual SMS
  {
    use_case_id: 'UC-7',
    test_name: 'UC-7: Dashboard Manual SMS',
    test_file: 'tests/e2e/uc-7-dashboard-sms.test.ts',
    test_spec: {
      setup: { agentId: 'agent_test', leadId: 'lead_test', message: 'Hi! Just following up on your inquiry.' }
    },
    assertions: [
      { type: 'ui', action: 'click #send-sms-button', expect: 'modal opens' },
      { type: 'ui', action: 'type message', expect: 'input updates' },
      { type: 'api', endpoint: 'POST /api/messages/send', expect: 200 },
      { type: 'database', table: 'messages', query: "status = 'pending'", expect: 'exists (before send)' },
      { type: 'database', table: 'messages', query: "status = 'sent'", expect: 'exists (after send)' },
      { type: 'ui', action: 'check message thread', expect: 'message appears' },
      { type: 'webhook', event: 'twilio.status_callback', expect: 'delivered status updated' }
    ],
    last_result: 'pass'
  },

  // UC-8: Follow-up Sequences
  {
    use_case_id: 'UC-8',
    test_name: 'UC-8: Follow-up Sequences',
    test_file: 'tests/e2e/uc-8-followup-sequences.test.ts',
    test_spec: {
      scenarios: [
        { name: 'Day 1 Follow-up', trigger: '24h after initial contact, no response', expectSms: true, messageType: 'gentle_follow_up' },
        { name: 'Day 3 Follow-up', trigger: '72h after initial contact, no response', expectSms: true, messageType: 'value_add' },
        { name: 'Stop on Response', trigger: 'Lead replies to any message', expectAction: 'pause_sequence' }
      ]
    },
    assertions: [
      { type: 'cron', job: 'followup-check', runs: 'every hour', expect: 'executes' },
      { type: 'database', table: 'sequences', query: "status = 'active'", expect: 'exists' },
      { type: 'ai', check: 'message.contextually_relevant', expect: true },
      { type: 'sms', sent: true },
      { type: 'database', table: 'sequence_steps', query: 'completed = true', expect: 'exists' },
      { type: 'test', name: 'reply_stops_sequence', action: 'simulate lead reply', expect: 'sequence paused' }
    ],
    last_result: 'pass'
  },

  // UC-9: Customer Sign-Up Flow
  {
    use_case_id: 'UC-9',
    test_name: 'UC-9: Customer Sign-Up Flow',
    test_file: 'tests/e2e/uc-9-customer-signup.test.ts',
    test_spec: {
      setup: {
        testCustomer: { email: 'test@example.com', name: 'Test Agent', phone: '+12015551234', selectedPlan: 'pro', testCard: '4242424242424242' },
        expectedPlanPrice: 14900
      },
      timeout: 30000, retries: 2
    },
    assertions: [
      { type: 'ui', action: 'visit /signup', expect: 'page loads with 3 plan options' },
      { type: 'ui', action: 'select Pro plan', expect: 'Pro highlighted' },
      { type: 'ui', action: 'fill email, name, phone', expect: 'form validates' },
      { type: 'api', endpoint: 'POST /api/billing/create-checkout', expect: 200 },
      { type: 'redirect', url_contains: 'stripe.com/checkout', expect: true },
      { type: 'stripe', action: 'complete checkout', expect: 'success' },
      { type: 'webhook', event: 'checkout.session.completed', expect: 'received' },
      { type: 'database', table: 'customers', query: "email = 'test@example.com'", expect: 'exists' },
      { type: 'database', table: 'customers', query: "plan_tier = 'pro'", expect: 'exists' },
      { type: 'redirect', url_contains: '/onboarding', expect: true }
    ],
    last_result: 'not_run'
  },

  // UC-10: Billing Portal Access
  {
    use_case_id: 'UC-10',
    test_name: 'UC-10: Billing Portal Access',
    test_file: 'tests/e2e/uc-10-billing-portal.test.ts',
    test_spec: {
      setup: { customerId: 'cust_test_123', existingPlan: 'pro', existingPrice: 14900 },
      timeout: 45000, retries: 2
    },
    assertions: [
      { type: 'auth', action: 'login as customer', expect: 'success' },
      { type: 'ui', action: 'navigate to /settings/billing', expect: 'page loads' },
      { type: 'ui', check: "plan displays as 'Pro - $149/month'", expect: true },
      { type: 'api', endpoint: 'POST /api/stripe/portal-session', expect: 200 },
      { type: 'response', contains: 'billing.stripe.com', expect: true },
      { type: 'stripe_portal', check: 'logo is LeadFlow logo', expect: true },
      { type: 'stripe_portal', check: 'payment methods section visible', expect: true },
      { type: 'stripe_portal', action: 'add new card', expect: 'success' },
      { type: 'webhook', event: 'payment_method.attached', expect: 'received' }
    ],
    last_result: 'not_run'
  },

  // UC-11: Subscription Lifecycle
  {
    use_case_id: 'UC-11',
    test_name: 'UC-11: Subscription Lifecycle',
    test_file: 'tests/e2e/uc-11-subscription-lifecycle.test.ts',
    test_spec: {
      scenarios: [
        { name: 'Successful Renewal', trigger: 'invoice.paid webhook' },
        { name: 'Failed Payment', trigger: 'invoice.payment_failed webhook', setup: { card: '4000000000000002' } },
        { name: 'Cancellation', trigger: 'customer.subscription.deleted webhook' }
      ],
      timeout: 60000, retries: 3
    },
    assertions: [
      { type: 'webhook', event: 'invoice.paid', expect: 'received' },
      { type: 'database', table: 'customers', query: 'current_period_end > NOW()', expect: 'extended' },
      { type: 'webhook', event: 'invoice.payment_failed', expect: 'received' },
      { type: 'database', table: 'customers', query: "status = 'past_due'", expect: 'exists' },
      { type: 'email', subject_contains: 'Payment Failed', expect: 'sent' },
      { type: 'database', table: 'customers', query: "status = 'canceled'", expect: 'exists' },
      { type: 'database', table: 'customers', query: 'data_retention_until > NOW()', expect: 'exists' }
    ],
    last_result: 'not_run'
  },

  // UC-12: MRR Reporting
  {
    use_case_id: 'UC-12',
    test_name: 'UC-12: MRR Reporting',
    test_file: 'tests/e2e/uc-12-mrr-reporting.test.ts',
    test_spec: {
      setup: {
        testCustomers: [
          { plan: 'starter', price: 4900, status: 'active' },
          { plan: 'pro', price: 14900, status: 'active' },
          { plan: 'pro', price: 14900, status: 'active' },
          { plan: 'team', price: 39900, status: 'active' },
          { plan: 'pro', price: 14900, status: 'canceled' }
        ],
        expectedMRR: 59700, expectedActiveCount: 4, expectedChurnRate: 20
      },
      timeout: 10000, retries: 1
    },
    assertions: [
      { type: 'api', endpoint: 'GET /api/billing/metrics', expect: 200 },
      { type: 'response', path: 'mrr', equals: 59700 },
      { type: 'response', path: 'active_customers', equals: 4 },
      { type: 'response', path: 'churn_rate', equals: 20 },
      { type: 'ui', check: "MRR displays as '$597'", expect: true },
      { type: 'api', endpoint: 'GET /api/billing/metrics?export=csv', content_type: 'text/csv', expect: true }
    ],
    last_result: 'not_run'
  }
]

async function seed() {
  console.log(`Seeding ${specs.length} E2E test specs...\n`)

  let success = 0
  for (const spec of specs) {
    const { error } = await supabase
      .from('e2e_test_specs')
      .upsert({
        use_case_id: spec.use_case_id,
        test_name: spec.test_name,
        test_file: spec.test_file,
        test_spec: spec.test_spec,
        assertions: spec.assertions,
        last_result: spec.last_result,
        updated_at: new Date().toISOString()
      }, { onConflict: 'test_name' })

    if (error) {
      // upsert on test_name might not work (no unique constraint) — try insert
      const { error: insertErr } = await supabase.from('e2e_test_specs').insert({
        use_case_id: spec.use_case_id,
        test_name: spec.test_name,
        test_file: spec.test_file,
        test_spec: spec.test_spec,
        assertions: spec.assertions,
        last_result: spec.last_result
      })
      if (insertErr) {
        console.log(`  FAIL: ${spec.test_name} — ${insertErr.message}`)
        continue
      }
    }
    console.log(`  ✓ ${spec.test_name} [${spec.last_result}]`)
    success++
  }

  console.log(`\nSeeded ${success}/${specs.length} test specs.`)

  // Verify
  const { data, error } = await supabase.from('e2e_test_specs').select('use_case_id, test_name, last_result').order('use_case_id')
  if (data) {
    console.log(`\nVerification (${data.length} rows in e2e_test_specs):`)
    for (const row of data) {
      const icon = row.last_result === 'pass' ? '✅' : row.last_result === 'fail' ? '❌' : '⬜'
      console.log(`  ${icon} ${row.use_case_id}: ${row.test_name}`)
    }
  }
}

seed().catch(err => {
  console.error('Seed failed:', err)
  process.exit(1)
})
