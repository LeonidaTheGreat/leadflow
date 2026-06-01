/**
 * PostHog Analytics Client Wrapper
 *
 * Thin, SSR-safe wrapper around PostHog for landing page event tracking.
 * Falls back to a no-op when NEXT_PUBLIC_POSTHOG_KEY is not set or
 * when running on the server.
 *
 * Usage:
 *   import { trackEvent, trackScrollDepth, trackCTAClick } from '@/lib/analytics'
 *
 * This file also re-exports everything from lib/analytics/index.ts so
 * existing imports of useAnalytics, PostHogEvents, etc. continue to work.
 */

// ─── Re-exports from existing analytics module ────────────────────────────────
export {
  useAnalytics,
  posthogConfig,
  isPostHogConfigured,
  PostHogEvents,
  PostHogProperties,
  PostHogProvider,
  PostHogErrorBoundary,
  RecoverableErrorBoundary,
} from './analytics/index';
export type { PostHogUser, PostHogEventName, PostHogPropertyName } from './analytics/index';

// ─── Internal helper ──────────────────────────────────────────────────────────

function getPostHog() {
  if (typeof window === 'undefined') return null;
  // posthog-js attaches itself to window.posthog after init
  return (window as unknown as { posthog?: { capture: (event: string, props?: Record<string, unknown>) => void } }).posthog ?? null;
}

// ─── Core event tracker ───────────────────────────────────────────────────────

/**
 * Capture a PostHog event.
 * No-op during SSR or when PostHog is not initialised.
 */
export function trackEvent(
  event: string,
  props?: Record<string, unknown>,
): void {
  if (typeof window === 'undefined') return;
  const ph = getPostHog();
  if (!ph) return;
  ph.capture(event, props);
}

// ─── Scroll depth ─────────────────────────────────────────────────────────────

/**
 * Track a scroll depth milestone (25, 50, 75, or 100 percent).
 */
export function trackScrollDepth(depth: number): void {
  trackEvent('scroll_depth', {
    depth_percent: depth,
    page: typeof window !== 'undefined' ? window.location.pathname : undefined,
  });
}

// ─── CTA click ────────────────────────────────────────────────────────────────

/**
 * Track a CTA button click.
 *
 * @param ctaName  — Machine-readable CTA identifier (e.g. 'get-started')
 * @param location — Page section where the CTA lives (e.g. 'hero', 'pricing')
 */
export function trackCTAClick(ctaName: string, location: string): void {
  trackEvent('cta_clicked', {
    cta_name: ctaName,
    location,
    page: typeof window !== 'undefined' ? window.location.pathname : undefined,
  });
}

// ─── Conversion funnel helpers ────────────────────────────────────────────────

/**
 * Track a form submission (signup form).
 * Call when the form is successfully submitted — not on attempt.
 */
export function trackFormSubmitted(formId: string = 'signup'): void {
  trackEvent('form_submitted', {
    form_id: formId,
    page: typeof window !== 'undefined' ? window.location.pathname : undefined,
  });
}

/**
 * Track a trial started event.
 * Call after the pilot/trial signup flow completes successfully.
 */
export function trackTrialStarted(plan?: string): void {
  trackEvent('trial_started', {
    plan,
    page: typeof window !== 'undefined' ? window.location.pathname : undefined,
  });
}
