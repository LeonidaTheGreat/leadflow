import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'

// Mock posthog-js before any imports that use it
vi.mock('@/lib/posthog', () => ({
  initPostHog: vi.fn(() => ({
    capture: vi.fn(),
    getFeatureFlag: vi.fn(),
    featureFlags: {
      getFlagVariants: vi.fn().mockReturnValue({
        'test-flag': true,
        'experiment-variant': 'control'
      })
    }
  })),
  default: {
    capture: vi.fn(),
    getFeatureFlag: vi.fn(),
    featureFlags: {
      getFlagVariants: vi.fn().mockReturnValue({
        'test-flag': true,
        'experiment-variant': 'control'
      })
    }
  }
}))

// Import after mocking
import { PostHogProvider, usePostHog } from '@/components/PostHogProvider'

// Test wrapper component
function TestWrapper({ children }: { children: ReactNode }) {
  return <PostHogProvider>{children}</PostHogProvider>
}

describe('PostHog Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should initialize PostHog provider', () => {
    const { result } = renderHook(() => usePostHog(), { wrapper: TestWrapper })
    
    expect(result.current).toBeDefined()
    expect(result.current.posthog).toBeDefined()
  })

  it('should load feature flags and become ready', async () => {
    const { result } = renderHook(() => usePostHog(), { wrapper: TestWrapper })
    
    await waitFor(() => {
      expect(result.current.isReady).toBe(true)
    }, { timeout: 2000 })

    expect(result.current.featureFlags).toBeDefined()
  })

  it('should capture events through posthog instance', () => {
    const { result } = renderHook(() => usePostHog(), { wrapper: TestWrapper })
    
    // Verify the posthog instance is available
    expect(result.current.posthog.capture).toBeDefined()
    
    // Call capture
    result.current.posthog.capture('test_event', { test: 'data' })
    
    // The mock should have been called
    expect(result.current.posthog.capture).toHaveBeenCalledWith('test_event', { test: 'data' })
  })

  it('should provide access to feature flags', () => {
    const { result } = renderHook(() => usePostHog(), { wrapper: TestWrapper })
    
    expect(result.current.posthog.getFeatureFlag).toBeDefined()
    
    result.current.posthog.getFeatureFlag('test-flag')
    
    expect(result.current.posthog.getFeatureFlag).toHaveBeenCalledWith('test-flag')
  })
})

describe('PostHog Configuration', () => {
  it('should have placeholder environment variables defined', () => {
    // The env vars should be strings (either real or placeholder)
    expect(typeof import.meta.env.VITE_POSTHOG_API_KEY).toBe('string')
    expect(typeof import.meta.env.VITE_POSTHOG_HOST).toBe('string')
  })
})
