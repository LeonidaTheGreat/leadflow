import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import posthog, { initPostHog } from '@/lib/posthog'

interface PostHogContextType {
  posthog: typeof posthog
  isReady: boolean
  featureFlags: Record<string, boolean | string>
}

const PostHogContext = createContext<PostHogContextType | null>(null)

interface PostHogProviderProps {
  children: ReactNode
}

export function PostHogProvider({ children }: PostHogProviderProps) {
  const [isReady, setIsReady] = useState(false)
  const [featureFlags, setFeatureFlags] = useState<Record<string, boolean | string>>({})

  useEffect(() => {
    // Initialize PostHog
    const ph = initPostHog()
    
    // Wait for feature flags to load
    const checkFeatureFlags = () => {
      if (ph) {
        // Get all feature flags using the featureFlags property
        const flags = ph.featureFlags?.getFlagVariants?.() || {}
        if (flags && Object.keys(flags).length > 0) {
          setFeatureFlags(flags as Record<string, boolean | string>)
        }
        setIsReady(true)
      }
    }

    // Check immediately and after a short delay for flags to load
    checkFeatureFlags()
    const timeout = setTimeout(checkFeatureFlags, 1000)

    return () => {
      clearTimeout(timeout)
    }
  }, [])

  return (
    <PostHogContext.Provider value={{ posthog, isReady, featureFlags }}>
      {children}
    </PostHogContext.Provider>
  )
}

export function usePostHog() {
  const context = useContext(PostHogContext)
  if (!context) {
    throw new Error('usePostHog must be used within a PostHogProvider')
  }
  return context
}

export default PostHogContext
