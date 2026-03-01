import posthog from 'posthog-js'

// PostHog Configuration
export const POSTHOG_CONFIG = {
  apiKey: import.meta.env.VITE_POSTHOG_API_KEY || 'phc_placeholder',
  apiHost: import.meta.env.VITE_POSTHOG_HOST || 'https://app.posthog.com',
  // Enable debug mode in development
  debug: import.meta.env.DEV,
  // Capture pageviews automatically
  capture_pageview: true,
  // Persistence settings
  persistence: 'localStorage+cookie' as const,
  // Loaded callback
  loaded: (_posthog: any) => {
    if (import.meta.env.DEV) {
      console.log('PostHog loaded successfully')
    }
  }
}

// Initialize PostHog
export const initPostHog = () => {
  if (typeof window !== 'undefined') {
    posthog.init(POSTHOG_CONFIG.apiKey, {
      api_host: POSTHOG_CONFIG.apiHost,
      debug: POSTHOG_CONFIG.debug,
      capture_pageview: POSTHOG_CONFIG.capture_pageview,
      persistence: POSTHOG_CONFIG.persistence,
      loaded: POSTHOG_CONFIG.loaded,
      // Enable session recordings
      disable_session_recording: false,
      // Feature flags settings
      feature_flag_request_timeout_ms: 3000,
    })
  }
  return posthog
}

// Get PostHog instance
export const getPostHog = () => posthog

// Custom event tracking helpers
export const trackEvent = (eventName: string, properties?: Record<string, any>) => {
  if (posthog) {
    posthog.capture(eventName, properties)
  }
}

// Track conversion events
export const trackConversion = (conversionType: string, value?: number, properties?: Record<string, any>) => {
  trackEvent('conversion', {
    conversion_type: conversionType,
    conversion_value: value,
    ...properties
  })
}

// Track landing page events
export const trackLandingPageEvent = (action: string, variant: string, properties?: Record<string, any>) => {
  trackEvent(`landing_page_${action}`, {
    variant,
    ...properties
  })
}

export default posthog
