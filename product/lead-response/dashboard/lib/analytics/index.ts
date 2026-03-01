/**
 * Analytics Index
 *
 * Central export point for all analytics functionality.
 * This version is SSR-safe and will gracefully degrade when PostHog is not available.
 */

// SSR-safe hook that returns a no-op tracker when PostHog is not available
export function useAnalytics() {
  // Return a safe tracker that works during SSR and when PostHog isn't loaded
  return {
    track: (eventName: string, properties?: Record<string, any>) => {
      if (typeof window !== 'undefined' && (window as any).posthog) {
        (window as any).posthog.capture(eventName, properties);
      }
    },
    identify: (userId: string, properties?: Record<string, any>) => {
      if (typeof window !== 'undefined' && (window as any).posthog) {
        (window as any).posthog.identify(userId, properties);
      }
    },
    reset: () => {
      if (typeof window !== 'undefined' && (window as any).posthog) {
        (window as any).posthog.reset();
      }
    },
    setUserProperties: (properties: Record<string, any>) => {
      if (typeof window !== 'undefined' && (window as any).posthog) {
        (window as any).posthog.people.set(properties);
      }
    },
    isFeatureEnabled: (flagKey: string): boolean => {
      if (typeof window !== 'undefined' && (window as any).posthog) {
        return (window as any).posthog.isFeatureEnabled(flagKey) ?? false;
      }
      return false;
    },
    posthog: typeof window !== 'undefined' ? (window as any).posthog : null,
  };
}

// Export PostHog configuration
export {
  posthogConfig,
  isPostHogConfigured,
  PostHogEvents,
  PostHogProperties,
} from './posthog-config';

// Export types
export type { PostHogUser, PostHogEventName, PostHogPropertyName } from './posthog-config';

// Re-export PostHog provider (client-side only)
export { PostHogProvider } from './posthog-provider';

// Export error boundaries (client-side only)
export { PostHogErrorBoundary, RecoverableErrorBoundary } from './error-boundary';
