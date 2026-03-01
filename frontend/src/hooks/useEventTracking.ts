/**
 * PostHog Event Tracking Hook
 * Provides standardized event tracking functionality
 */

import { useCallback, useRef, useEffect } from 'react'
import { usePostHog } from '@/components/PostHogProvider'
import {
  PostHogEventName,
  EventProperties,
  ConversionProperties,
  LeadProperties,
  PageViewProperties,
  FeatureProperties,
  ErrorProperties,
  PerformanceProperties,
  PostHogEvents,
} from '@/lib/analytics-events'

interface UseEventTrackingOptions {
  context?: string
  defaultProperties?: EventProperties
}

interface EventTrackingResult {
  // Core tracking methods
  track: (event: PostHogEventName, properties?: EventProperties) => void
  trackConversion: (properties: ConversionProperties) => void
  trackLead: (properties: LeadProperties) => void
  trackPageView: (properties?: PageViewProperties) => void
  trackFeature: (properties: FeatureProperties) => void
  trackError: (error: Error | string, properties?: ErrorProperties) => void
  trackPerformance: (event: string, properties: PerformanceProperties) => void
  
  // Funnel tracking
  trackFunnel: (step: string, properties?: EventProperties) => void
  
  // User identification
  identify: (distinctId: string, properties?: EventProperties) => void
  
  // Feature flags
  isFeatureEnabled: (flagKey: string) => boolean | string
  getFeatureFlag: (flagKey: string) => boolean | string
  
  // Session management
  startSessionRecording: () => void
  stopSessionRecording: () => void
}

export function useEventTracking(options: UseEventTrackingOptions = {}): EventTrackingResult {
  const { context, defaultProperties = {} } = options
  const { posthog, isReady } = usePostHog()
  
  // Track page view on mount
  const hasTrackedPageView = useRef(false)
  
  useEffect(() => {
    if (isReady && !hasTrackedPageView.current && typeof window !== 'undefined') {
      hasTrackedPageView.current = true
      
      // Auto-track page view with default properties
      trackPageView({
        url: window.location.href,
        path: window.location.pathname,
        referrer: document.referrer,
        title: document.title,
      })
    }
  }, [isReady])

  // Core track method
  const track = useCallback((event: PostHogEventName, properties?: EventProperties) => {
    if (!posthog) {
      console.warn('[Analytics] PostHog not initialized, event not tracked:', event)
      return
    }
    
    const mergedProperties = {
      ...defaultProperties,
      ...properties,
      context,
      timestamp: new Date().toISOString(),
    }
    
    posthog.capture(event, mergedProperties)
    
    if (import.meta.env.DEV) {
      console.log('[Analytics]', event, mergedProperties)
    }
  }, [posthog, defaultProperties, context])

  // Track conversion
  const trackConversion = useCallback((properties: ConversionProperties) => {
    track(PostHogEvents.CONVERSION, properties)
  }, [track])

  // Track lead events
  const trackLead = useCallback((properties: LeadProperties) => {
    const enrichedProperties = {
      ...properties,
      email_domain: properties.email ? properties.email.split('@')[1] : undefined,
    }
    track(PostHogEvents.LEAD_CAPTURED, enrichedProperties)
  }, [track])

  // Track page view
  const trackPageView = useCallback((properties?: PageViewProperties) => {
    track(PostHogEvents.LANDING_PAGE_VIEW, properties)
  }, [track])

  // Track feature usage
  const trackFeature = useCallback((properties: FeatureProperties) => {
    track(PostHogEvents.FEATURE_USED, properties)
  }, [track])

  // Track error
  const trackError = useCallback((error: Error | string, properties?: ErrorProperties) => {
    const errorProperties: ErrorProperties = {
      ...properties,
      error_message: typeof error === 'string' ? error : error.message,
      error_stack: typeof error === 'string' ? undefined : error.stack,
    }
    track(PostHogEvents.ERROR_OCCURRED, errorProperties)
  }, [track])

  // Track performance metrics
  const trackPerformance = useCallback((event: string, properties: PerformanceProperties) => {
    track(event as PostHogEventName, properties)
  }, [track])

  // Track funnel progress
  const trackFunnel = useCallback((step: string, properties?: EventProperties) => {
    const funnelEvent = `funnel_${step}` as PostHogEventName
    track(funnelEvent, {
      ...properties,
      funnel_step: step,
    })
  }, [track])

  // Identify user
  const identify = useCallback((distinctId: string, properties?: EventProperties) => {
    if (!posthog) {
      console.warn('[Analytics] PostHog not initialized, cannot identify user')
      return
    }
    
    posthog.identify(distinctId, properties)
    
    if (import.meta.env.DEV) {
      console.log('[Analytics] Identify', distinctId, properties)
    }
  }, [posthog])

  // Check feature flag
  const isFeatureEnabled = useCallback((flagKey: string): boolean | string => {
    if (!posthog) return false
    return posthog.isFeatureEnabled(flagKey) ?? false
  }, [posthog])

  // Get feature flag value
  const getFeatureFlag = useCallback((flagKey: string): boolean | string => {
    if (!posthog) return false
    return posthog.getFeatureFlag(flagKey) ?? false
  }, [posthog])

  // Session recording
  const startSessionRecording = useCallback(() => {
    if (posthog) {
      posthog.startSessionRecording()
    }
  }, [posthog])

  const stopSessionRecording = useCallback(() => {
    if (posthog) {
      posthog.stopSessionRecording()
    }
  }, [posthog])

  return {
    track,
    trackConversion,
    trackLead,
    trackPageView,
    trackFeature,
    trackError,
    trackPerformance,
    trackFunnel,
    identify,
    isFeatureEnabled,
    getFeatureFlag,
    startSessionRecording,
    stopSessionRecording,
  }
}

// Specialized hook for funnel tracking
interface FunnelTrackingOptions {
  funnelName: string
  totalSteps: number
}

export function useFunnelTracking(options: FunnelTrackingOptions) {
  const { funnelName, totalSteps } = options
  const { track, identify } = useEventTracking({ context: `funnel:${funnelName}` })
  const currentStep = useRef(0)
  const funnelStartTime = useRef<Date | null>(null)

  const startFunnel = useCallback((userId?: string) => {
    currentStep.current = 0
    funnelStartTime.current = new Date()
    
    if (userId) {
      identify(userId, { funnel_name: funnelName })
    }
    
    track(`funnel_${funnelName}_started` as PostHogEventName, {
      funnel_name: funnelName,
      total_steps: totalSteps,
    })
  }, [funnelName, totalSteps, track, identify])

  const trackStep = useCallback((stepNumber: number, stepName: string, properties?: EventProperties) => {
    currentStep.current = stepNumber
    
    const stepDuration = funnelStartTime.current 
      ? Date.now() - funnelStartTime.current.getTime()
      : 0
    
    track(`funnel_${funnelName}_step_${stepNumber}` as PostHogEventName, {
      funnel_name: funnelName,
      step_number: stepNumber,
      step_name: stepName,
      total_steps: totalSteps,
      step_duration_ms: stepDuration,
      ...properties,
    })
  }, [funnelName, totalSteps, track])

  const completeFunnel = useCallback((properties?: EventProperties) => {
    const totalDuration = funnelStartTime.current
      ? Date.now() - funnelStartTime.current.getTime()
      : 0
    
    track(`funnel_${funnelName}_completed` as PostHogEventName, {
      funnel_name: funnelName,
      total_steps: totalSteps,
      steps_completed: currentStep.current,
      total_duration_ms: totalDuration,
      ...properties,
    })
    
    // Reset funnel state
    currentStep.current = 0
    funnelStartTime.current = null
  }, [funnelName, totalSteps, track])

  const abandonFunnel = useCallback((reason?: string) => {
    const totalDuration = funnelStartTime.current
      ? Date.now() - funnelStartTime.current.getTime()
      : 0
    
    track(`funnel_${funnelName}_abandoned` as PostHogEventName, {
      funnel_name: funnelName,
      steps_completed: currentStep.current,
      total_steps: totalSteps,
      total_duration_ms: totalDuration,
      abandonment_reason: reason || 'unknown',
    })
    
    // Reset funnel state
    currentStep.current = 0
    funnelStartTime.current = null
  }, [funnelName, totalSteps, track])

  return {
    startFunnel,
    trackStep,
    completeFunnel,
    abandonFunnel,
    currentStep: currentStep.current,
  }
}

// Hook for form tracking
interface FormTrackingOptions {
  formName: string
}

export function useFormTracking(options: FormTrackingOptions) {
  const { formName } = options
  const { track } = useEventTracking({ context: `form:${formName}` })
  const fieldErrors = useRef<Record<string, number>>({})
  const formStartTime = useRef<Date | null>(null)

  const startForm = useCallback(() => {
    formStartTime.current = new Date()
    fieldErrors.current = {}
    
    track(PostHogEvents.FORM_SUBMITTED, {
      form_name: formName,
      action: 'started',
    })
  }, [formName, track])

  const trackFieldInteraction = useCallback((fieldName: string, action: 'focus' | 'blur' | 'change') => {
    track(`form_field_${action}` as PostHogEventName, {
      form_name: formName,
      field_name: fieldName,
    })
  }, [formName, track])

  const trackFieldError = useCallback((fieldName: string, errorMessage: string) => {
    fieldErrors.current[fieldName] = (fieldErrors.current[fieldName] || 0) + 1
    
    track(PostHogEvents.VALIDATION_ERROR, {
      form_name: formName,
      field_name: fieldName,
      error_message: errorMessage,
      error_count: fieldErrors.current[fieldName],
    })
  }, [formName, track])

  const submitForm = useCallback((success: boolean, properties?: EventProperties) => {
    const completionTime = formStartTime.current
      ? Date.now() - formStartTime.current.getTime()
      : 0
    
    track(PostHogEvents.FORM_SUBMITTED, {
      form_name: formName,
      action: 'submitted',
      success,
      completion_time_ms: completionTime,
      field_error_count: Object.keys(fieldErrors.current).length,
      total_errors: Object.values(fieldErrors.current).reduce((a, b) => a + b, 0),
      ...properties,
    })
    
    // Reset form state
    formStartTime.current = null
    fieldErrors.current = {}
  }, [formName, track])

  return {
    startForm,
    trackFieldInteraction,
    trackFieldError,
    submitForm,
    fieldErrors: fieldErrors.current,
  }
}

export default useEventTracking
