import { useEffect, useState } from 'react'
import { usePostHog } from '@/components/PostHogProvider'

interface UseABTestOptions<T> {
  experimentKey: string
  variants: Record<string, T>
  defaultVariant?: string
}

interface UseABTestResult<T> {
  variant: T
  variantKey: string
  isLoading: boolean
  trackVariantEvent: (action: string, properties?: Record<string, any>) => void
}

export function useABTest<T>({ 
  experimentKey, 
  variants, 
  defaultVariant = 'control' 
}: UseABTestOptions<T>): UseABTestResult<T> {
  const { posthog, isReady } = usePostHog()
  const [variantKey, setVariantKey] = useState<string>(defaultVariant)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!isReady || !posthog) {
      return
    }

    // Get the assigned variant from PostHog feature flag
    const assignedVariant = posthog.getFeatureFlag(experimentKey) as string
    
    if (assignedVariant && variants[assignedVariant]) {
      setVariantKey(assignedVariant)
      // Track that user saw this variant
      posthog.capture('$feature_view', {
        feature_flag: experimentKey,
        feature_flag_variant: assignedVariant
      })
    } else {
      // Use default variant if no assignment or invalid
      setVariantKey(defaultVariant)
    }
    
    setIsLoading(false)
  }, [isReady, posthog, experimentKey, variants, defaultVariant])

  const trackVariantEvent = (action: string, properties?: Record<string, any>) => {
    if (posthog) {
      posthog.capture(action, {
        experiment: experimentKey,
        variant: variantKey,
        ...properties
      })
    }
  }

  return {
    variant: variants[variantKey] || variants[defaultVariant],
    variantKey,
    isLoading,
    trackVariantEvent
  }
}

// Hook specifically for landing page headline A/B test
interface HeadlineVariant {
  headline: string
  subheadline: string
  ctaText: string
}

const HEADLINE_VARIANTS: Record<string, HeadlineVariant> = {
  control: {
    headline: 'Never Miss Another Lead',
    subheadline: 'AI-powered follow-up that responds to your leads instantly, 24/7. Convert more prospects into clients while you focus on closing deals.',
    ctaText: 'Start Free Trial'
  },
  benefit_focused: {
    headline: 'Close 3x More Deals',
    subheadline: 'Our AI responds to leads in under 60 seconds, booking appointments while your competitors are still checking their email.',
    ctaText: 'See How It Works'
  },
  urgency_focused: {
    headline: 'Your Leads Are Waiting',
    subheadline: '78% of customers buy from the first company to respond. Our AI ensures that company is always you.',
    ctaText: 'Claim Your Edge'
  },
  social_proof: {
    headline: 'Join 1,000+ Top Agents',
    subheadline: 'The AI assistant trusted by leading real estate professionals to handle follow-up, scheduling, and lead nurturing.',
    ctaText: 'Join The Best'
  }
}

export function useLandingPageABTest(): UseABTestResult<HeadlineVariant> & { 
  allVariants: typeof HEADLINE_VARIANTS 
} {
  const result = useABTest<HeadlineVariant>({
    experimentKey: 'landing_page_headline_v1',
    variants: HEADLINE_VARIANTS,
    defaultVariant: 'control'
  })

  return {
    ...result,
    allVariants: HEADLINE_VARIANTS
  }
}

export default useABTest
