require('dotenv').config({ path: __dirname + '/../.env' });
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const specs = [
  {
    id: '62d77d2b-9dd0-4cc7-a958-eefa9df8912d',
    project_id: 'leadflow',
    use_case_id: 'feat-self-serve-stripe-checkout',
    test_name: 'Upgrade CTA visible for trial/pilot agents',
    test_spec: JSON.stringify({
      steps: [
        'Log in as an agent with plan_tier = trial',
        'Navigate to /dashboard',
        'Observe the page'
      ],
      expected: 'An Upgrade Plan CTA/banner is visible on the dashboard. No upgrade prompt shown for paid agents (starter/pro/team).'
    }),
    assertions: ['Upgrade CTA visible for trial agents', 'Upgrade CTA hidden for paid agents']
  },
  {
    id: '66f59c05-342d-4a14-9bc4-49267e294bc8',
    project_id: 'leadflow',
    use_case_id: 'feat-self-serve-stripe-checkout',
    test_name: 'Stripe Checkout session created server-side on upgrade click',
    test_spec: JSON.stringify({
      steps: [
        'Log in as a trial agent',
        'Navigate to /settings/billing',
        'Click Upgrade to Pro',
        'Open browser DevTools Network tab'
      ],
      expected: 'POST /api/billing/create-checkout-session returns a Stripe checkout URL. No Stripe secret key visible in network requests. Browser redirects to Stripe hosted checkout page.'
    }),
    assertions: ['create-checkout-session API returns Stripe URL', 'No secret key in client-side requests', 'Redirects to Stripe hosted page']
  },
  {
    id: '50229c30-1bad-4c33-a33c-f607c76daef5',
    project_id: 'leadflow',
    use_case_id: 'feat-self-serve-stripe-checkout',
    test_name: 'End-to-end payment updates plan_tier in DB and dashboard',
    test_spec: JSON.stringify({
      steps: [
        'Log in as trial agent',
        'Click Upgrade to Pro from billing page',
        'On Stripe Checkout, enter test card 4242 4242 4242 4242 with any future expiry and any CVC',
        'Complete payment',
        'Observe redirect and dashboard state',
        'Check real_estate_agents row in Supabase'
      ],
      expected: 'Redirected to /dashboard?upgrade=success. Success banner visible. DB shows plan_tier=pro, stripe_customer_id and stripe_subscription_id populated. Upgrade CTA gone.'
    }),
    assertions: [
      'Success redirect to /dashboard?upgrade=success',
      'Success banner displayed',
      'plan_tier updated to pro in DB',
      'stripe_customer_id populated',
      'stripe_subscription_id populated',
      'Upgrade CTA no longer visible'
    ]
  },
  {
    id: 'cf8249ef-0267-4323-ac9b-03b7fd7c5716',
    project_id: 'leadflow',
    use_case_id: 'feat-self-serve-stripe-checkout',
    test_name: 'Confirmation email received after successful upgrade',
    test_spec: JSON.stringify({
      steps: [
        'Complete a successful test payment in Stripe test mode',
        'Check the email inbox of the trial agent'
      ],
      expected: 'Email received with subject containing plan name. Body includes plan name, price, next billing date, billing portal link, and support@leadflowai.com.'
    }),
    assertions: [
      'Email delivered to agent inbox',
      'Subject contains plan name',
      'Body contains price',
      'Body contains next billing date',
      'Body contains support email'
    ]
  },
  {
    id: '6d57cde8-41ee-43e3-b219-4a52028dc45a',
    project_id: 'leadflow',
    use_case_id: 'feat-self-serve-stripe-checkout',
    test_name: 'Cancel checkout shows no-charge message',
    test_spec: JSON.stringify({
      steps: [
        'Log in as trial agent',
        'Click Upgrade to Pro',
        'On Stripe Checkout, click Back or abandon the checkout',
        'Observe the redirect'
      ],
      expected: 'Redirected to /settings/billing?upgrade=cancelled. Banner shows no charge message. plan_tier unchanged in DB.'
    }),
    assertions: [
      'Cancel redirects to /settings/billing?upgrade=cancelled',
      'No-charge message visible',
      'plan_tier unchanged in DB'
    ]
  },
  {
    id: '43865876-1beb-48b8-9669-632c38af5459',
    project_id: 'leadflow',
    use_case_id: 'feat-self-serve-stripe-checkout',
    test_name: 'Webhook rejects invalid Stripe signature',
    test_spec: JSON.stringify({
      steps: [
        'Send a POST request to /api/webhooks/stripe with a forged or missing Stripe-Signature header',
        'Observe response'
      ],
      expected: 'Response is 400. plan_tier is NOT updated in DB. Error logged server-side.'
    }),
    assertions: [
      'Invalid signature returns 400',
      'DB not updated on invalid signature'
    ]
  },
  {
    id: 'f1c31ace-ec57-4ddc-a962-8157e7c938a3',
    project_id: 'leadflow',
    use_case_id: 'feat-self-serve-stripe-checkout',
    test_name: 'Webhook is idempotent on repeated delivery',
    test_spec: JSON.stringify({
      steps: [
        'Send the same checkout.session.completed webhook event twice to /api/webhooks/stripe',
        'Check real_estate_agents row after both deliveries'
      ],
      expected: 'DB row updated correctly after first delivery. Second delivery does not error or create duplicate records. plan_tier remains correct.'
    }),
    assertions: [
      'Second webhook delivery does not error',
      'No duplicate records created',
      'plan_tier correct after both deliveries'
    ]
  }
];

async function run() {
  for (const spec of specs) {
    const { error } = await sb.from('e2e_test_specs').upsert(spec, { onConflict: 'id' });
    if (error) {
      console.error('Error inserting', spec.test_name, ':', error.message);
    } else {
      console.log('Inserted:', spec.test_name);
    }
  }
  console.log('Done.');
}

run().catch(console.error);
