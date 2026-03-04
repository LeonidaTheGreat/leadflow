import { useEffect, Suspense, ReactNode } from 'react';

// PostHog is loaded dynamically to avoid SSR issues
let posthogModule: any = null;

/**
 * Load PostHog dynamically on client side only
 */
async function loadPostHog() {
  if (typeof window === 'undefined') return null;
  if (posthogModule) return posthogModule;
  
  try {
    posthogModule = await import('posthog-js');
    return posthogModule;
  } catch (e) {
    console.error('Failed to load PostHog:', e);
    return null;
  }
}

/**
 * PostHog Page View Tracker
 */
function PostHogPageViewTracker(): null {
  useEffect(() => {
    // Page view tracking is handled by the PostHog autocapture
  }, []);

  return null;
}

/**
 * Suspense wrapper for page view tracker
 */
function SuspendedPostHogPageView(): React.ReactElement | null {
  return (
    <Suspense fallback={null}>
      <PostHogPageViewTracker />
    </Suspense>
  );
}

/**
 * PostHog Provider Props
 */
interface PostHogProviderProps {
  children: ReactNode;
}

/**
 * PostHog Provider Component
 * 
 * This is a stub provider that doesn't actually wrap children with PostHog
 * to avoid SSR issues. Analytics will be loaded dynamically on the client.
 */
export function PostHogProvider({ children }: PostHogProviderProps): React.ReactElement {
  // Load PostHog on client side only
  useEffect(() => {
    loadPostHog().then((posthog) => {
      if (posthog && typeof window !== 'undefined') {
        const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
        if (apiKey) {
          posthog.default.init(apiKey, {
            api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
            capture_pageview: false,
            loaded: () => {
              console.log('[PostHog] Loaded successfully');
            }
          });
        }
      }
    });
  }, []);

  return (
    <>
      <SuspendedPostHogPageView />
      {children}
    </>
  );
}

/**
 * Custom hook for tracking events
 * Stub implementation that works during SSR
 */
export function useAnalytics() {
  return {
    track: (eventName: string, properties?: Record<string, any>) => {
      if (typeof window !== 'undefined' && posthogModule) {
        posthogModule.default.capture(eventName, properties);
      }
    },
    identify: (userId: string, userProperties?: Record<string, any>) => {
      if (typeof window !== 'undefined' && posthogModule) {
        posthogModule.default.identify(userId, userProperties);
      }
    },
    reset: () => {
      if (typeof window !== 'undefined' && posthogModule) {
        posthogModule.default.reset();
      }
    },
    posthog: posthogModule?.default || null,
  };
}
