/**
 * PostHog Event Tracking Tests
 * @jest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useEventTracking, useFunnelTracking, useFormTracking } from '@/hooks/useEventTracking'
import { PostHogEvents } from '@/lib/analytics-events'

// Mock PostHog
const mockCapture = vi.fn()
const mockIdentify = vi.fn()
const mockIsFeatureEnabled = vi.fn()
const mockGetFeatureFlag = vi.fn()
const mockStartSessionRecording = vi.fn()
const mockStopSessionRecording = vi.fn()

vi.mock('@/components/PostHogProvider', () => ({
  usePostHog: () => ({
    posthog: {
      capture: mockCapture,
      identify: mockIdentify,
      isFeatureEnabled: mockIsFeatureEnabled,
      getFeatureFlag: mockGetFeatureFlag,
      startSessionRecording: mockStartSessionRecording,
      stopSessionRecording: mockStopSessionRecording,
    },
    isReady: true,
    featureFlags: {},
  }),
  PostHogProvider: ({ children }: { children: React.ReactNode }) => children,
}))

describe('useEventTracking', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('track', () => {
    it('should track a basic event', () => {
      renderHook(() => useEventTracking())
      
      // Get the last call and verify it was the auto page view
      expect(mockCapture).toHaveBeenCalledWith(
        PostHogEvents.LANDING_PAGE_VIEW,
        expect.any(Object)
      )
    })

    it('should track custom events after mount', () => {
      const { result } = renderHook(() => useEventTracking())
      
      // Clear the auto page view call
      mockCapture.mockClear()
      
      act(() => {
        result.current.track(PostHogEvents.LEAD_CAPTURED, { email: 'test@example.com' })
      })
      
      expect(mockCapture).toHaveBeenCalledWith(
        PostHogEvents.LEAD_CAPTURED,
        expect.objectContaining({
          email: 'test@example.com',
          timestamp: expect.any(String),
        })
      )
    })

    it('should merge default properties with event properties', () => {
      const { result } = renderHook(() => 
        useEventTracking({ 
          context: 'test-context',
          defaultProperties: { source: 'test' }
        })
      )
      
      // Clear the auto page view call
      mockCapture.mockClear()
      
      act(() => {
        result.current.track(PostHogEvents.LEAD_CAPTURED, { email: 'test@example.com' })
      })
      
      expect(mockCapture).toHaveBeenCalledWith(
        PostHogEvents.LEAD_CAPTURED,
        expect.objectContaining({
          source: 'test',
          context: 'test-context',
          email: 'test@example.com',
        })
      )
    })
  })

  describe('trackConversion', () => {
    it('should track conversion with type and value', () => {
      const { result } = renderHook(() => useEventTracking())
      
      // Clear the auto page view call
      mockCapture.mockClear()
      
      act(() => {
        result.current.trackConversion({
          conversion_type: 'lead_capture',
          conversion_value: 100,
          currency: 'USD',
        })
      })
      
      expect(mockCapture).toHaveBeenCalledWith(
        PostHogEvents.CONVERSION,
        expect.objectContaining({
          conversion_type: 'lead_capture',
          conversion_value: 100,
          currency: 'USD',
        })
      )
    })
  })

  describe('trackLead', () => {
    it('should track lead with email domain extraction', () => {
      const { result } = renderHook(() => useEventTracking())
      
      // Clear the auto page view call
      mockCapture.mockClear()
      
      act(() => {
        result.current.trackLead({
          email: 'test@example.com',
          source: 'landing_page',
        })
      })
      
      expect(mockCapture).toHaveBeenCalledWith(
        PostHogEvents.LEAD_CAPTURED,
        expect.objectContaining({
          email: 'test@example.com',
          email_domain: 'example.com',
          source: 'landing_page',
        })
      )
    })
  })

  describe('trackPageView', () => {
    it('should track page view with URL properties', () => {
      const { result } = renderHook(() => useEventTracking())
      
      // Clear the auto page view call
      mockCapture.mockClear()
      
      act(() => {
        result.current.trackPageView({
          url: 'https://example.com/page',
          path: '/page',
          referrer: 'https://google.com',
          title: 'Test Page',
        })
      })
      
      expect(mockCapture).toHaveBeenCalledWith(
        PostHogEvents.LANDING_PAGE_VIEW,
        expect.objectContaining({
          url: 'https://example.com/page',
          path: '/page',
          referrer: 'https://google.com',
          title: 'Test Page',
        })
      )
    })
  })

  describe('trackFeature', () => {
    it('should track feature usage', () => {
      const { result } = renderHook(() => useEventTracking())
      
      // Clear the auto page view call
      mockCapture.mockClear()
      
      act(() => {
        result.current.trackFeature({
          feature_name: 'export_data',
          feature_category: 'data_management',
        })
      })
      
      expect(mockCapture).toHaveBeenCalledWith(
        PostHogEvents.FEATURE_USED,
        expect.objectContaining({
          feature_name: 'export_data',
          feature_category: 'data_management',
        })
      )
    })
  })

  describe('trackError', () => {
    it('should track error with message', () => {
      const { result } = renderHook(() => useEventTracking({ context: 'error-context' }))
      
      // Clear the auto page view call
      mockCapture.mockClear()
      
      act(() => {
        result.current.trackError(new Error('Test error'))
      })
      
      expect(mockCapture).toHaveBeenCalledWith(
        PostHogEvents.ERROR_OCCURRED,
        expect.objectContaining({
          error_message: 'Test error',
          context: 'error-context',
        })
      )
    })

    it('should track string errors', () => {
      const { result } = renderHook(() => useEventTracking())
      
      // Clear the auto page view call
      mockCapture.mockClear()
      
      act(() => {
        result.current.trackError('String error message')
      })
      
      expect(mockCapture).toHaveBeenCalledWith(
        PostHogEvents.ERROR_OCCURRED,
        expect.objectContaining({
          error_message: 'String error message',
        })
      )
    })
  })

  describe('identify', () => {
    it('should identify user', () => {
      const { result } = renderHook(() => useEventTracking())
      
      act(() => {
        result.current.identify('user-123', { email: 'user@example.com' })
      })
      
      expect(mockIdentify).toHaveBeenCalledWith(
        'user-123',
        { email: 'user@example.com' }
      )
    })
  })

  describe('feature flags', () => {
    it('should check if feature is enabled', () => {
      mockIsFeatureEnabled.mockReturnValue(true)
      const { result } = renderHook(() => useEventTracking())
      
      const enabled = result.current.isFeatureEnabled('beta-feature')
      
      expect(enabled).toBe(true)
      expect(mockIsFeatureEnabled).toHaveBeenCalledWith('beta-feature')
    })

    it('should get feature flag value', () => {
      mockGetFeatureFlag.mockReturnValue('variant-a')
      const { result } = renderHook(() => useEventTracking())
      
      const flag = result.current.getFeatureFlag('experiment-1')
      
      expect(flag).toBe('variant-a')
      expect(mockGetFeatureFlag).toHaveBeenCalledWith('experiment-1')
    })
  })

  describe('session recording', () => {
    it('should start session recording', () => {
      const { result } = renderHook(() => useEventTracking())
      
      act(() => {
        result.current.startSessionRecording()
      })
      
      expect(mockStartSessionRecording).toHaveBeenCalled()
    })

    it('should stop session recording', () => {
      const { result } = renderHook(() => useEventTracking())
      
      act(() => {
        result.current.stopSessionRecording()
      })
      
      expect(mockStopSessionRecording).toHaveBeenCalled()
    })
  })
})

describe('useFunnelTracking', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should track funnel start', () => {
    const { result } = renderHook(() => 
      useFunnelTracking({ funnelName: 'signup', totalSteps: 3 })
    )
    
    // Clear the auto page view call
    mockCapture.mockClear()
    
    act(() => {
      result.current.startFunnel('user-123')
    })
    
    expect(mockCapture).toHaveBeenCalledWith(
      'funnel_signup_started',
      expect.objectContaining({
        funnel_name: 'signup',
        total_steps: 3,
      })
    )
    expect(mockIdentify).toHaveBeenCalledWith(
      'user-123',
      { funnel_name: 'signup' }
    )
  })

  it('should track funnel step', () => {
    const { result } = renderHook(() => 
      useFunnelTracking({ funnelName: 'signup', totalSteps: 3 })
    )
    
    // Clear the auto page view call
    mockCapture.mockClear()
    
    act(() => {
      result.current.startFunnel()
      vi.advanceTimersByTime(1000)
      result.current.trackStep(1, 'email_entry', { email: 'test@example.com' })
    })
    
    expect(mockCapture).toHaveBeenCalledWith(
      'funnel_signup_step_1',
      expect.objectContaining({
        funnel_name: 'signup',
        step_number: 1,
        step_name: 'email_entry',
        total_steps: 3,
        step_duration_ms: expect.any(Number),
        email: 'test@example.com',
      })
    )
  })

  it('should track funnel completion', () => {
    const { result } = renderHook(() => 
      useFunnelTracking({ funnelName: 'signup', totalSteps: 3 })
    )
    
    // Clear the auto page view call
    mockCapture.mockClear()
    
    act(() => {
      result.current.startFunnel()
      result.current.trackStep(1, 'step1')
      result.current.trackStep(2, 'step2')
      vi.advanceTimersByTime(5000)
      result.current.completeFunnel({ user_type: 'agent' })
    })
    
    expect(mockCapture).toHaveBeenCalledWith(
      'funnel_signup_completed',
      expect.objectContaining({
        funnel_name: 'signup',
        total_steps: 3,
        steps_completed: 2,
        total_duration_ms: expect.any(Number),
        user_type: 'agent',
      })
    )
  })

  it('should track funnel abandonment', () => {
    const { result } = renderHook(() => 
      useFunnelTracking({ funnelName: 'signup', totalSteps: 3 })
    )
    
    // Clear the auto page view call
    mockCapture.mockClear()
    
    act(() => {
      result.current.startFunnel()
      result.current.trackStep(1, 'step1')
      vi.advanceTimersByTime(3000)
      result.current.abandonFunnel('user_closed_tab')
    })
    
    expect(mockCapture).toHaveBeenCalledWith(
      'funnel_signup_abandoned',
      expect.objectContaining({
        funnel_name: 'signup',
        steps_completed: 1,
        total_steps: 3,
        abandonment_reason: 'user_closed_tab',
      })
    )
  })
})

describe('useFormTracking', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should track form start', () => {
    const { result } = renderHook(() => 
      useFormTracking({ formName: 'contact_form' })
    )
    
    // Clear the auto page view call
    mockCapture.mockClear()
    
    act(() => {
      result.current.startForm()
    })
    
    expect(mockCapture).toHaveBeenCalledWith(
      PostHogEvents.FORM_SUBMITTED,
      expect.objectContaining({
        form_name: 'contact_form',
        action: 'started',
      })
    )
  })

  it('should track field interactions', () => {
    const { result } = renderHook(() => 
      useFormTracking({ formName: 'contact_form' })
    )
    
    // Clear the auto page view call
    mockCapture.mockClear()
    
    act(() => {
      result.current.trackFieldInteraction('email', 'focus')
      result.current.trackFieldInteraction('email', 'change')
      result.current.trackFieldInteraction('email', 'blur')
    })
    
    // Expect 3 field interaction calls
    expect(mockCapture).toHaveBeenCalledTimes(3)
    expect(mockCapture).toHaveBeenNthCalledWith(
      1,
      'form_field_focus',
      expect.objectContaining({ form_name: 'contact_form', field_name: 'email' })
    )
  })

  it('should track field errors', () => {
    const { result } = renderHook(() => 
      useFormTracking({ formName: 'contact_form' })
    )
    
    // Clear the auto page view call
    mockCapture.mockClear()
    
    act(() => {
      result.current.trackFieldError('email', 'Invalid email format')
      result.current.trackFieldError('email', 'Email already exists')
    })
    
    expect(mockCapture).toHaveBeenCalledWith(
      PostHogEvents.VALIDATION_ERROR,
      expect.objectContaining({
        form_name: 'contact_form',
        field_name: 'email',
        error_message: 'Invalid email format',
        error_count: 1,
      })
    )
    
    expect(mockCapture).toHaveBeenLastCalledWith(
      PostHogEvents.VALIDATION_ERROR,
      expect.objectContaining({
        error_count: 2,
      })
    )
  })

  it('should track form submission', () => {
    const { result } = renderHook(() => 
      useFormTracking({ formName: 'contact_form' })
    )
    
    // Clear the auto page view call
    mockCapture.mockClear()
    
    act(() => {
      result.current.startForm()
      vi.advanceTimersByTime(2000)
      result.current.submitForm(true, { lead_source: 'organic' })
    })
    
    expect(mockCapture).toHaveBeenLastCalledWith(
      PostHogEvents.FORM_SUBMITTED,
      expect.objectContaining({
        form_name: 'contact_form',
        action: 'submitted',
        success: true,
        completion_time_ms: expect.any(Number),
        lead_source: 'organic',
      })
    )
  })
})
