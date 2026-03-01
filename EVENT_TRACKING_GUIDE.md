# PostHog Event Tracking - Implementation Guide

## Overview

This document describes the comprehensive event tracking system implemented for LeadFlow using PostHog. The system provides standardized event tracking, funnel analytics, form tracking, and user identification.

## Files Created/Modified

### New Files

1. **`frontend/src/lib/analytics-events.ts`**
   - Standardized event name constants
   - Type definitions for event properties
   - Event categories (Page, User, Lead, Funnel, Conversion, Feature, Integration, Error, Performance, Navigation)

2. **`frontend/src/hooks/useEventTracking.ts`**
   - `useEventTracking` - Core event tracking hook
   - `useFunnelTracking` - Funnel progression tracking
   - `useFormTracking` - Form interaction and validation tracking

3. **`frontend/__tests__/useEventTracking.test.tsx`**
   - Comprehensive test suite (22 tests)
   - Tests for all tracking methods
   - Funnel and form tracking tests

4. **`frontend/src/hooks/index.ts`** (new)
   - Central exports for all hooks

### Modified Files

1. **`frontend/src/lib/index.ts`**
   - Added analytics events exports

2. **`frontend/src/components/LandingPage.tsx`**
   - Integrated new event tracking hooks
   - Added standardized event tracking alongside A/B test tracking

## Event Categories

### Page Events
- `landing_page_viewed` - Landing page impressions
- `onboarding_page_viewed` - Onboarding page views
- `dashboard_page_viewed` - Dashboard access
- `settings_page_viewed` - Settings page views
- `experiments_page_viewed` - A/B test experiments page

### User Events
- `user_login` / `user_logout` - Authentication events
- `user_signup` - New user registration
- `user_onboarding_started` / `user_onboarding_completed` - Onboarding lifecycle
- `user_onboarding_step_completed` - Step-by-step onboarding progress
- `user_settings_updated` / `user_profile_updated` - Profile changes

### Lead Events
- `lead_viewed` - Lead detail views
- `lead_created` / `lead_updated` / `lead_deleted` - Lead CRUD operations
- `lead_qualified` - Lead qualification
- `lead_captured` - Lead capture from any source

### Funnel Events
- `funnel_signup_started` / `funnel_signup_completed` - Signup funnel
- `funnel_onboarding_step_1/2/3` - Onboarding steps
- `funnel_first_lead_created` / `funnel_first_lead_qualified` - Milestone events
- `funnel_first_booking` - First booking milestone

### Conversion Events
- `conversion` - Generic conversion with type and value
- `lead_capture` - Lead capture conversion
- `email_captured` - Email submission
- `form_submitted` - Form completion
- `cta_clicked` - Call-to-action clicks

### Feature Events
- `feature_used` - Feature usage tracking
- `feature_clicked` - Feature interactions
- `feature_flag_enabled` - Feature flag states

### Integration Events
- `integration_connected` / `integration_disconnected`
- `integration_error`
- `calcom_booking_created` / `calcom_booking_cancelled`
- `fub_sync_completed`
- `stripe_payment_success` / `stripe_payment_failed`

### Error Events
- `error_occurred` - General errors
- `error_boundary_caught` - React error boundaries
- `api_error` / `validation_error` - Specific error types

### Performance Events
- `page_load_time` / `component_render_time`
- `api_response_time`
- `lcp_measured` / `fid_measured` / `cls_measured` - Core Web Vitals

### Navigation Events
- `nav_login_clicked` / `nav_get_started_clicked`
- `footer_privacy_clicked` / `footer_terms_clicked` / `footer_support_clicked`

## Usage Examples

### Basic Event Tracking

```typescript
import { useEventTracking } from '@/hooks/useEventTracking'
import { PostHogEvents } from '@/lib/analytics-events'

function MyComponent() {
  const { track, trackPageView, trackFeature } = useEventTracking({
    context: 'my_component',
    defaultProperties: { source: 'dashboard' }
  })

  // Track a custom event
  const handleClick = () => {
    track(PostHogEvents.FEATURE_USED, {
      feature_name: 'export_data',
      feature_category: 'data_management'
    })
  }

  // Track page view (auto-tracked on mount)
  useEffect(() => {
    trackPageView({ path: '/my-page', title: 'My Page' })
  }, [])

  return <button onClick={handleClick}>Export</button>
}
```

### Lead Tracking

```typescript
import { useEventTracking } from '@/hooks/useEventTracking'

function LeadCaptureForm() {
  const { trackLead, trackConversion } = useEventTracking()

  const handleSubmit = (email: string) => {
    // Track lead capture with automatic email domain extraction
    trackLead({
      email,
      source: 'landing_page',
      variant: 'control'
    })

    // Track as conversion with value
    trackConversion({
      conversion_type: 'lead_capture',
      conversion_value: 50,
      currency: 'USD'
    })
  }

  return <form>{/* ... */}</form>
}
```

### Funnel Tracking

```typescript
import { useFunnelTracking } from '@/hooks/useEventTracking'

function OnboardingWizard() {
  const { startFunnel, trackStep, completeFunnel } = useFunnelTracking({
    funnelName: 'onboarding',
    totalSteps: 3
  })

  useEffect(() => {
    startFunnel(userId)
  }, [])

  const handleStep1 = () => {
    trackStep(1, 'personal_info', { name: user.name })
  }

  const handleStep2 = () => {
    trackStep(2, 'preferences', { notifications: true })
  }

  const handleComplete = () => {
    completeFunnel({ user_type: 'agent' })
  }

  return {/* ... */}
}
```

### Form Tracking

```typescript
import { useFormTracking } from '@/hooks/useEventTracking'

function ContactForm() {
  const { startForm, trackFieldInteraction, trackFieldError, submitForm } = 
    useFormTracking({ formName: 'contact_form' })

  useEffect(() => {
    startForm()
  }, [])

  const handleFieldFocus = (fieldName: string) => {
    trackFieldInteraction(fieldName, 'focus')
  }

  const handleFieldError = (fieldName: string, error: string) => {
    trackFieldError(fieldName, error)
  }

  const handleSubmit = (success: boolean) => {
    submitForm(success, { lead_source: 'organic' })
  }

  return {/* ... */}
}
```

### Error Tracking

```typescript
import { useEventTracking } from '@/hooks/useEventTracking'

function ErrorProneComponent() {
  const { trackError } = useEventTracking({ context: 'ErrorProneComponent' })

  const riskyOperation = () => {
    try {
      // Risky code
    } catch (error) {
      trackError(error as Error, { operation: 'riskyOperation' })
    }
  }

  return {/* ... */}
}
```

### User Identification

```typescript
import { useEventTracking } from '@/hooks/useEventTracking'

function AuthProvider({ children }) {
  const { identify } = useEventTracking()

  useEffect(() => {
    if (user) {
      identify(user.id, {
        email: user.email,
        plan: user.subscriptionPlan,
        signup_date: user.createdAt
      })
    }
  }, [user])

  return children
}
```

### Feature Flags

```typescript
import { useEventTracking } from '@/hooks/useEventTracking'

function FeatureGate() {
  const { isFeatureEnabled, getFeatureFlag } = useEventTracking()

  const showNewDashboard = isFeatureEnabled('new_dashboard_v2')
  const experimentVariant = getFeatureFlag('pricing_experiment')

  return showNewDashboard ? <NewDashboard /> : <OldDashboard />
}
```

## Property Standards

All events include these standard properties:
- `timestamp` - ISO 8601 timestamp
- `context` - Component or feature context
- `$current_url` / `$referrer` - Page information (added by PostHog)
- `$device_type` / `$browser` - Device information (added by PostHog)

Additional properties by event type:
- **Lead events**: `email_domain` (auto-extracted), `source`, `variant`
- **Funnel events**: `funnel_name`, `step_number`, `step_duration_ms`, `total_duration_ms`
- **Form events**: `form_name`, `field_name`, `error_count`, `completion_time_ms`
- **Conversion events**: `conversion_type`, `conversion_value`, `currency`

## Testing

Run the event tracking tests:

```bash
cd frontend
npm test -- useEventTracking.test.tsx
```

All 22 tests should pass, covering:
- Basic event tracking
- Property merging
- Lead tracking with email domain extraction
- Funnel progression (start, step, complete, abandon)
- Form interactions (start, field focus/change/blur, errors, submit)
- Error tracking (Error objects and strings)
- User identification
- Feature flags
- Session recording

## PostHog Dashboard Setup

### Recommended Dashboards

1. **User Acquisition Dashboard**
   - Signup conversion rate
   - Lead capture rate by source
   - Landing page A/B test results

2. **Activation Funnel**
   - Signup → Onboarding Step 1 → Step 2 → Step 3
   - Time to first lead created
   - Onboarding completion rate

3. **Engagement Metrics**
   - Feature usage frequency
   - Page views by section
   - Session duration

4. **Form Analytics**
   - Form completion rates
   - Field error rates
   - Average completion time

5. **Error Monitoring**
   - Error frequency by type
   - Error context breakdown
   - API error rates

### Event Validation

To verify events are being tracked:

1. Open PostHog dashboard
2. Go to "Events" → "Live Events"
3. Perform actions in your app
4. Verify events appear in real-time

## Privacy & Compliance

- No PII in event properties (use hashed/IDs instead)
- Email domains are logged but not full emails for analytics
- Session recordings respect user preferences
- GDPR-compliant data handling

## Next Steps

1. Configure `VITE_POSTHOG_API_KEY` in `.env.local`
2. Set up PostHog dashboards
3. Create custom insights for business metrics
4. Set up alerts for conversion rate drops
5. Configure feature flags for gradual rollouts
