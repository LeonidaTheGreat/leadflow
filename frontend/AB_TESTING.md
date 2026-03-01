# PostHog A/B Testing Setup for LeadFlow

## Overview
This setup provides A/B testing capabilities for the LeadFlow landing page using PostHog.

## Components Created

### 1. PostHog Configuration (`src/lib/posthog.ts`)
- PostHog initialization
- Event tracking utilities
- Conversion tracking helpers

### 2. PostHog Provider (`src/components/PostHogProvider.tsx`)
- React context for PostHog
- Feature flags management
- Initialization handling

### 3. A/B Testing Hook (`src/hooks/useABTest.ts`)
- `useABTest` - Generic A/B testing hook
- `useLandingPageABTest` - Pre-configured hook for landing page headlines

### 4. Landing Page (`src/components/LandingPage.tsx`)
- A/B tested headlines (4 variants)
- Event tracking for all interactions
- Email capture form with conversion tracking
- Feature click tracking

### 5. Experiment Dashboard (`src/components/ExperimentDashboard.tsx`)
- View experiment results
- Compare variant performance
- Track CTR and conversion rates

## Headline Variants

1. **Control**: "Never Miss Another Lead"
2. **Benefit Focused**: "Close 3x More Deals"
3. **Urgency Focused**: "Your Leads Are Waiting"
4. **Social Proof**: "Join 1,000+ Top Agents"

## Environment Variables

Add to your `.env` file:

```bash
# PostHog Configuration
VITE_POSTHOG_API_KEY=phc_your_project_api_key
VITE_POSTHOG_HOST=https://app.posthog.com
```

## PostHog Setup Steps

1. **Create PostHog Account**
   - Sign up at https://posthog.com
   - Create a new project

2. **Get API Key**
   - Go to Project Settings → API Keys
   - Copy your Project API Key

3. **Create Experiment**
   - Go to Experiments → New Experiment
   - Name: "Landing Page Headline V1"
   - Feature Flag Key: `landing_page_headline_v1`
   - Variants: control, benefit_focused, urgency_focused, social_proof
   - Distribution: 25% each

4. **Set Primary Metric**
   - Event: `conversion`
   - Property: `conversion_type = 'lead_capture'`

5. **Add Event Tracking (Optional)**
   - Track custom events in PostHog:
     - `landing_page_viewed`
     - `cta_clicked`
     - `email_captured`
     - `feature_clicked`

## Running Locally

```bash
cd frontend
npm install
npm run dev
```

Access the app at:
- Landing Page: http://localhost:5173/#landing
- Onboarding: http://localhost:5173/#onboarding
- Experiment Dashboard: http://localhost:5173/#experiments

## Tracked Events

| Event | Description | Properties |
|-------|-------------|------------|
| `landing_page_viewed` | User viewed landing page | url, referrer, variant |
| `cta_clicked` | User clicked CTA button | cta_location, cta_text, variant |
| `email_captured` | User submitted email | email_domain, variant |
| `conversion` | Conversion occurred | conversion_type, variant, value |
| `feature_clicked` | User clicked feature card | feature_name, variant |
| `nav_login_clicked` | User clicked login | - |
| `footer_*_clicked` | Footer link clicks | - |

## Analyzing Results

1. View real-time results in PostHog Experiments
2. Use the local Experiment Dashboard for quick overview
3. Look for:
   - Higher CTR (Click-Through Rate)
   - Higher Conversion Rate
   - Statistical significance (95%+ confidence)

## Next Steps

1. Get PostHog API key and add to `.env`
2. Create experiment in PostHog dashboard
3. Deploy and start collecting data
4. Run for at least 1-2 weeks for statistical significance
5. Implement winning variant as default

## Documentation

- PostHog Docs: https://posthog.com/docs
- Feature Flags: https://posthog.com/docs/feature-flags
- Experiments: https://posthog.com/docs/experiments
