# PostHog Analytics Tracking Plan

## Overview

This document outlines the analytics tracking implementation for LeadFlow AI using PostHog. The tracking plan covers user behavior, funnel conversion, and key metrics.

## Setup Instructions

### 1. Create PostHog Project

1. Go to [PostHog](https://posthog.com) and sign up/login
2. Create a new project named "LeadFlow AI"
3. Go to Project Settings → API Keys
4. Copy the Project API Key (starts with `phc_`)

### 2. Configure Environment Variables

Add the following to your `.env.local` file:

```bash
NEXT_PUBLIC_POSTHOG_KEY=phc_YOUR_PROJECT_API_KEY
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

For EU data residency, use:
```bash
NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com
```

### 3. Verify Installation

Run the development server and check the browser console for:
```
[PostHog] Initialized successfully
```

## Event Tracking

### Page View Events

Automatically tracked on all pages:

| Event | Description | Properties |
|-------|-------------|------------|
| `$pageview` | User views a page | `pathname`, `current_url`, `referrer` |
| `$pageleave` | User leaves a page | `pathname`, `time_spent` |

### User Action Events

| Event | Description | When to Track |
|-------|-------------|---------------|
| `user_login` | User logs in | After successful authentication |
| `user_logout` | User logs out | When user clicks logout |
| `user_signup` | User creates account | After account creation |
| `user_onboarding_started` | Onboarding begins | When user starts onboarding flow |
| `user_onboarding_completed` | Onboarding finishes | After onboarding completion |
| `user_settings_updated` | Settings changed | When user saves settings |

**Example:**
```typescript
import { useAnalytics, PostHogEvents } from '@/lib/analytics';

const { track } = useAnalytics();

// Track login
track(PostHogEvents.USER_LOGIN, {
  method: 'email',
  has_completed_onboarding: true,
});
```

### Lead Events

| Event | Description | Properties |
|-------|-------------|------------|
| `lead_viewed` | User views lead details | `lead_id`, `lead_source` |
| `lead_created` | New lead created | `lead_id`, `source`, `status` |
| `lead_updated` | Lead information updated | `lead_id`, `fields_updated` |
| `lead_deleted` | Lead removed | `lead_id` |
| `lead_qualified` | Lead marked as qualified | `lead_id`, `qualification_score` |

### Funnel Events

The signup to activation funnel:

| Event | Funnel Step | Description |
|-------|-------------|-------------|
| `funnel_signup_started` | Step 1 | User clicks signup/get started |
| `funnel_signup_completed` | Step 2 | User completes registration |
| `funnel_onboarding_step_1` | Step 3 | User completes welcome step |
| `funnel_onboarding_step_2` | Step 4 | User completes agent info |
| `funnel_onboarding_step_3` | Step 5 | User completes calendar/SMS config |
| `funnel_first_lead_created` | Step 6 | User creates their first lead |
| `funnel_first_lead_qualified` | Step 7 | First lead gets qualified |

### Dashboard Events

| Event | Description | Properties |
|-------|-------------|------------|
| `dashboard_accessed` | User opens dashboard | `view`, `referrer` |
| `dashboard_metrics_viewed` | User views analytics | `time_range`, `metrics_shown` |
| `dashboard_reports_viewed` | User opens reports | `report_type` |

### Settings Events

| Event | Description | Properties |
|-------|-------------|------------|
| `settings_page_viewed` | User opens settings | `tab`, `section` |
| `settings_integration_connected` | Integration added | `integration_name`, `integration_category` |
| `settings_notifications_updated` | Notification prefs changed | `notification_type`, `enabled` |

### Feature Usage Events

| Event | Description | Properties |
|-------|-------------|------------|
| `feature_used` | Generic feature usage | `feature_name`, `feature_category` |
| `feature_flag_enabled` | Feature flag triggered | `flag_key`, `flag_value` |

### Error Events

| Event | Description | Properties |
|-------|-------------|------------|
| `error_occurred` | Generic error | `error_type`, `error_message` |
| `error_boundary_caught` | React error caught | `error_message`, `error_stack`, `component_stack` |

## User Identification

### When to Identify Users

Identify users after:
- Successful signup
- Login
- Onboarding completion

### User Properties

```typescript
identify(userId, {
  email: 'user@example.com',
  first_name: 'John',
  last_name: 'Doe',
  phone: '+1234567890',
  role: 'agent',
  plan: 'pro',
  company: 'Real Estate Inc',
  timezone: 'America/New_York',
  state: 'CA',
  onboarding_completed: true,
  onboarding_completion_date: '2026-02-26T00:00:00Z',
});
```

### User Properties to Track

| Property | Type | Description |
|----------|------|-------------|
| `email` | string | User's email address |
| `first_name` | string | First name |
| `last_name` | string | Last name |
| `role` | string | User role (agent, admin, etc.) |
| `plan` | string | Subscription plan (free, pro, enterprise) |
| `company` | string | Company or team name |
| `timezone` | string | User's timezone |
| `state` | string | State/province |
| `onboarding_completed` | boolean | Whether onboarding is done |
| `leads_created_count` | number | Total leads created |
| `last_active_at` | datetime | Last activity timestamp |

## Session Recording

Session recording is enabled in production with the following settings:

- **Masking**: All input fields are masked
- **Sampling**: 100% of sessions (adjust in PostHog dashboard)
- **Retention**: 30 days

## Feature Flags

Feature flags can be used for:
- Gradual rollouts
- A/B testing
- Beta features

### Usage

```typescript
const { isFeatureEnabled } = useAnalytics();

if (isFeatureEnabled('new-dashboard-design')) {
  return <NewDashboard />;
}
return <OldDashboard />;
```

## Creating Dashboards in PostHog

### 1. User Acquisition Dashboard

Metrics to include:
- Signup conversion rate
- Traffic sources
- Landing page views
- Signup funnel drop-off

### 2. Activation Dashboard

Metrics to include:
- Onboarding completion rate
- Time to first lead
- Funnel conversion rates
- Feature adoption

### 3. Engagement Dashboard

Metrics to include:
- Daily/weekly active users
- Feature usage frequency
- Session duration
- Return rate

### 4. Retention Dashboard

Metrics to include:
- Cohort retention
- Churn rate
- Re-engagement success

### 5. Revenue Dashboard (if applicable)

Metrics to include:
- Conversion to paid
- Upgrade rates
- MRR/LTV

## Privacy & Compliance

### Data Collection

- **IP Addresses**: Not collected (configured in PostHog)
- **PII**: Masked in session recordings
- **Cookies**: First-party only

### User Consent

Add a cookie consent banner that:
1. Explains analytics usage
2. Allows opt-out
3. Respects `Do Not Track`

### GDPR Compliance

- Users can request data export
- Users can request data deletion
- Data retention policies configured

## Debugging

### Enable Debug Mode

In development, debug mode is automatically enabled. Check the browser console for:
- `[PostHog] Initialized successfully`
- `[PostHog] Event tracked: event_name`

### Verify Events

1. Open PostHog dashboard
2. Go to "Live Events"
3. Perform actions in your app
4. Verify events appear in real-time

### Common Issues

| Issue | Solution |
|-------|----------|
| Events not appearing | Check `NEXT_PUBLIC_POSTHOG_KEY` is set correctly |
| Page views not tracking | Ensure `PostHogProvider` wraps the app |
| User not identified | Call `identify()` after login/signup |

## Best Practices

1. **Consistent Naming**: Use the `PostHogEvents` constants to ensure event names are consistent
2. **Relevant Properties**: Only include properties that add context
3. **Don't Over-track**: Focus on meaningful events, not every click
4. **Test in Dev**: Always verify events fire correctly in development
5. **Document Changes**: Update this document when adding new events

## Migration Guide

### From Google Analytics

- Replace `gtag('event', ...)` with `track(PostHogEvents.EVENT_NAME, ...)`
- Page views are automatic, no manual tracking needed
- User properties replace custom dimensions

### From Mixpanel

- Replace `mixpanel.track()` with `track()`
- Replace `mixpanel.identify()` with `identify()`
- User properties work similarly

## Support

For PostHog support:
- Documentation: https://posthog.com/docs
- Community: https://posthog.com/questions
- Email: hey@posthog.com

## Changelog

| Date | Version | Changes |
|------|---------|---------|
| 2026-02-26 | 1.0.0 | Initial tracking plan implementation |
