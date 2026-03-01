# PostHog Analytics Setup

This directory contains the PostHog analytics integration for the LeadFlow AI dashboard.

## Quick Start

1. **Get your PostHog API key**:
   - Sign up at [posthog.com](https://posthog.com)
   - Create a new project
   - Go to Settings → Project → Project API Key

2. **Configure environment**:
   ```bash
   # Add to .env.local
   NEXT_PUBLIC_POSTHOG_KEY=phc_your_project_api_key
   NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
   ```

3. **The analytics are already integrated**:
   - Provider is in `lib/analytics/posthog-provider.tsx`
   - Events are tracked automatically on page views
   - Custom events are implemented in key components

## File Structure

```
lib/analytics/
├── index.ts              # Main exports
├── posthog-config.ts     # Configuration & event constants
├── posthog-provider.tsx  # React provider & hook
└── error-boundary.tsx    # Error tracking

docs/
├── ANALYTICS_TRACKING_PLAN.md  # Complete tracking documentation
└── ANALYTICS_QUICK_START.md    # This file
```

## Usage Examples

### Track a Custom Event

```typescript
import { useAnalytics, PostHogEvents } from '@/lib/analytics';

function MyComponent() {
  const { track } = useAnalytics();

  const handleButtonClick = () => {
    track(PostHogEvents.FEATURE_USED, {
      feature_name: 'export_leads',
      feature_category: 'data_management',
    });
  };

  return <button onClick={handleButtonClick}>Export</button>;
}
```

### Identify a User

```typescript
import { useAnalytics } from '@/lib/analytics';

function OnboardingComplete({ user }) {
  const { identify, setUserProperties } = useAnalytics();

  useEffect(() => {
    identify(user.id, {
      email: user.email,
      first_name: user.firstName,
      plan: user.subscriptionPlan,
    });

    setUserProperties({
      onboarding_completed: true,
      onboarding_date: new Date().toISOString(),
    });
  }, []);
}
```

### Check Feature Flags

```typescript
import { useAnalytics } from '@/lib/analytics';

function Dashboard() {
  const { isFeatureEnabled } = useAnalytics();

  const showNewFeature = isFeatureEnabled('new-dashboard-v2');

  return (
    <div>
      {showNewFeature ? <NewDashboard /> : <OldDashboard />}
    </div>
  );
}
```

## Available Events

See `lib/analytics/posthog-config.ts` for all event names:

- `PostHogEvents.PAGE_VIEW` - Page viewed
- `PostHogEvents.USER_LOGIN` - User logged in
- `PostHogEvents.USER_ONBOARDING_COMPLETED` - Onboarding finished
- `PostHogEvents.LEAD_VIEWED` - Lead details viewed
- `PostHogEvents.FUNNEL_SIGNUP_STARTED` - Signup funnel started
- ... and more

## Dashboard Setup in PostHog

After deploying, create these dashboards in PostHog:

### 1. User Acquisition
- Metric: Signup conversion rate
- Metric: Landing page → Dashboard flow
- Funnel: Signup → Onboarding → First Lead

### 2. Engagement
- Metric: Daily active users
- Metric: Feature usage
- Retention: Weekly cohort analysis

### 3. Funnel Analysis
- Funnel: Landing → Signup → Onboarding → Activation
- Drop-off analysis at each step

## Troubleshooting

### Events not appearing in PostHog

1. Check browser console for errors
2. Verify `NEXT_PUBLIC_POSTHOG_KEY` is set
3. Check that you're using the public key (not the personal API key)
4. Ensure `PostHogProvider` wraps your app in `layout.tsx`

### Page views not tracking

Page views are tracked automatically. If not working:
1. Check that `<PostHogPageViewTracker />` is rendered inside the provider
2. Verify no ad blockers are enabled
3. Check PostHog dashboard → Live Events for real-time view

### Debug mode

In development, debug logging is automatic. Look for:
```
[PostHog] Initialized successfully
[PostHog] Event tracked: event_name { properties }
```

## Privacy

- All input fields are masked in session recordings
- No IP addresses are collected
- PII is not sent in event properties by default
- Users can opt-out via browser Do Not Track settings

## Further Reading

- [Full Tracking Plan](./ANALYTICS_TRACKING_PLAN.md)
- [PostHog Documentation](https://posthog.com/docs)
- [Next.js Integration Guide](https://posthog.com/docs/libraries/next-js)
