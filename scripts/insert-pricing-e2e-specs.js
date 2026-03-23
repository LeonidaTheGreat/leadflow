require('dotenv').config({ path: '/Users/clawdbot/projects/leadflow/.env' });
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const specs = [
    {
      id: '11111111-1111-4111-a111-111111111101',
      use_case_id: 'improve-landing-page-pricing-4-tiers',
      project_id: 'leadflow',
      test_name: 'Landing page shows all 4 pricing tiers',
      test_spec: 'Navigate to leadflow-ai-five.vercel.app and scroll to verify a Pricing section with all 4 tiers (Starter, Pro, Team, Brokerage) before the footer.',
      assertions: JSON.stringify([
        'Pricing section heading visible on page',
        'Starter tier card present',
        'Pro tier card present',
        'Team tier card present',
        'Brokerage tier card present',
        'Pricing section appears before footer'
      ])
    },
    {
      id: 'e2e-landing-pricing-correct-prices',
      use_case_id: 'improve-landing-page-pricing-4-tiers',
      project_id: 'leadflow',
      test_name: 'Pricing section shows correct PMF.md prices',
      test_spec: 'Verify displayed prices match PMF.md: Starter $49, Pro $149, Team $399, Brokerage $999+. No wrong prices ($497/$997/$1997) anywhere.',
      assertions: JSON.stringify([
        'Starter price = $49/mo',
        'Pro price = $149/mo',
        'Team price = $399/mo',
        'Brokerage price = $999+ or $999+/mo',
        'No price of $497 visible anywhere',
        'No price of $997 visible anywhere',
        'No price of $1997 visible anywhere'
      ])
    },
    {
      id: 'e2e-landing-pricing-pro-highlighted',
      use_case_id: 'improve-landing-page-pricing-4-tiers',
      project_id: 'leadflow',
      test_name: 'Pro tier is visually highlighted as Most Popular',
      test_spec: 'The Pro tier card must display a Most Popular badge and be visually distinct from Starter and Team cards.',
      assertions: JSON.stringify([
        'Pro card has "Most Popular" badge or equivalent label',
        'Pro card has distinct visual treatment (border, background, or glow)'
      ])
    },
    {
      id: 'e2e-landing-pricing-ctas-work',
      use_case_id: 'improve-landing-page-pricing-4-tiers',
      project_id: 'leadflow',
      test_name: 'Pricing tier CTA buttons navigate correctly',
      test_spec: 'Click each tier CTA button and verify correct routing: Starter/Pro/Team to /signup, Brokerage to contact/mailto.',
      assertions: JSON.stringify([
        'Starter CTA links to /signup or /signup?plan=starter',
        'Pro CTA links to /signup or /signup?plan=pro',
        'Team CTA links to /signup or /signup?plan=team',
        'Brokerage CTA opens mailto or contact form (not /signup)'
      ])
    },
    {
      id: 'e2e-pricing-page-feature-comparison',
      use_case_id: 'improve-landing-page-pricing-4-tiers',
      project_id: 'leadflow',
      test_name: '/pricing page has feature comparison table',
      test_spec: 'Navigate to /pricing and verify a feature comparison table exists with all 4 tiers as columns and correct checkmarks/values per row.',
      assertions: JSON.stringify([
        'Feature comparison table visible below tier cards',
        'Columns: Starter, Pro, Team, Brokerage',
        'SMS row: Starter=100/mo, others=Unlimited',
        'Cal.com row: Starter=dash, Pro/Team/Brokerage=checkmark',
        'White-label row: only Brokerage=checkmark',
        'Agents row: Starter=1, Pro=1, Team=5, Brokerage=Unlimited'
      ])
    },
    {
      id: 'e2e-pricing-mobile-responsive',
      use_case_id: 'improve-landing-page-pricing-4-tiers',
      project_id: 'leadflow',
      test_name: 'Pricing section mobile responsive at 375px',
      test_spec: 'Set browser width to 375px and verify pricing cards stack vertically with no horizontal overflow.',
      assertions: JSON.stringify([
        'All 4 tier cards stack vertically at 375px viewport',
        'No horizontal scrollbar on the page',
        'All prices and text readable without truncation'
      ])
    }
  ];

  for (const spec of specs) {
    const { data, error } = await sb.from('e2e_test_specs').upsert(spec, { onConflict: 'id' }).select();
    if (error) console.error('E2E spec error for', spec.id, ':', JSON.stringify(error));
    else console.log('E2E spec inserted:', spec.id);
  }
  console.log('All done!');
}
run().catch(console.error);
