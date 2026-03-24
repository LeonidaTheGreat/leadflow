/**
 * GA4 Analytics Utility
 * Google Analytics 4 event tracking for the LeadFlow landing page.
 * 
 * Measurement ID is sourced from VITE_GA4_MEASUREMENT_ID env var.
 * No PII is ever sent as event parameters.
 */

// Declare gtag on window for TypeScript
declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    dataLayer: any[];
  }
}

/**
 * Get the GA4 Measurement ID from environment.
 */
export const GA4_ID = import.meta.env.VITE_GA4_MEASUREMENT_ID as string | undefined;

/**
 * Check if GA4 is available and we're in a browser environment.
 */
export function isGA4Available(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.gtag === 'function' &&
    Boolean(GA4_ID)
  );
}

/**
 * Core GA4 event tracking helper.
 * All gtag calls must go through this to ensure SSR safety and graceful fallback.
 */
export function trackGA4Event(
  name: string,
  params?: Record<string, string | number | boolean>
): void {
  if (typeof window === 'undefined') return;
  if (typeof window.gtag !== 'function') return;
  if (!GA4_ID) return;

  try {
    window.gtag('event', name, params);
  } catch (err) {
    // Never throw — analytics must never break the app
    if (import.meta.env.DEV) {
      console.warn('[GA4] trackEvent failed:', err);
    }
  }
}

// ---------------------------------------------------------------------------
// CTA Click Events (FR-2)
// ---------------------------------------------------------------------------

export type CTALocation = 'hero' | 'nav' | 'pricing' | 'final_cta';

export interface CTAClickParams {
  cta_location: CTALocation;
  cta_text: string;
  destination?: string;
}

/**
 * Track a CTA button click.
 * 
 * @example
 * trackCTAClick({ cta_location: 'hero', cta_text: 'Start Free Pilot', destination: '/signup' });
 */
export function trackCTAClick(params: CTAClickParams): void {
  trackGA4Event('cta_click', {
    cta_location: params.cta_location,
    cta_text: params.cta_text,
    ...(params.destination ? { destination: params.destination } : {}),
  });
}

// ---------------------------------------------------------------------------
// Pilot Signup Form Events (FR-3)
// ---------------------------------------------------------------------------

export type FormEventType = 'form_open' | 'form_submit' | 'form_success' | 'form_error';

/**
 * Track a pilot signup form event.
 * form_name is always 'pilot_signup'.
 * No PII (email, name) is included.
 */
export function trackFormEvent(eventType: FormEventType, extraParams?: Record<string, string | number | boolean>): void {
  trackGA4Event(eventType, {
    form_name: 'pilot_signup',
    ...extraParams,
  });
}

// ---------------------------------------------------------------------------
// Scroll Depth Tracking (FR-4)
// ---------------------------------------------------------------------------

export type ScrollDepth = 25 | 50 | 75 | 90;

/**
 * Track a scroll depth milestone.
 */
export function trackScrollDepth(depth: ScrollDepth): void {
  trackGA4Event('scroll_depth', { depth_percent: depth });
}

/**
 * Set up scroll depth tracking using IntersectionObserver and scroll events.
 * Returns a cleanup function to remove event listeners.
 * 
 * Fires 'scroll_depth' events at 25%, 50%, 75%, and 90% scroll milestones.
 */
export function initScrollDepthTracking(): () => void {
  if (typeof window === 'undefined') return () => {};

  const milestones: ScrollDepth[] = [25, 50, 75, 90];
  const fired = new Set<number>();

  function getScrollPercent(): number {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const docHeight =
      Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight,
        document.body.offsetHeight,
        document.documentElement.offsetHeight,
        document.body.clientHeight,
        document.documentElement.clientHeight
      ) - window.innerHeight;
    if (docHeight <= 0) return 0;
    return Math.round((scrollTop / docHeight) * 100);
  }

  function onScroll() {
    if (!isGA4Available()) return;
    const pct = getScrollPercent();
    for (const milestone of milestones) {
      if (!fired.has(milestone) && pct >= milestone) {
        fired.add(milestone);
        trackScrollDepth(milestone);
      }
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });

  return () => {
    window.removeEventListener('scroll', onScroll);
  };
}

// ---------------------------------------------------------------------------
// GA4 Script Injection (FR-1)
// ---------------------------------------------------------------------------

let scriptInjected = false;

/**
 * Inject the GA4 gtag.js script into the document head.
 * Safe to call multiple times — only injects once.
 * Uses async loading to avoid blocking render (satisfies NFR: performance).
 * No-ops in development if VITE_GA4_DISABLE_DEV=true.
 */
export function injectGA4Script(): void {
  if (typeof window === 'undefined') return;
  if (scriptInjected) return;
  if (!GA4_ID) return;

  // Optional: skip in development
  if (import.meta.env.DEV && import.meta.env.VITE_GA4_DISABLE_DEV === 'true') {
    if (import.meta.env.DEV) {
      console.info('[GA4] Disabled in development (VITE_GA4_DISABLE_DEV=true)');
    }
    return;
  }

  scriptInjected = true;

  // Inject gtag.js
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`;
  document.head.appendChild(script);

  // Initialise dataLayer and gtag
  window.dataLayer = window.dataLayer || [];
  function gtag(...args: any[]) { window.dataLayer.push(args); }
  window.gtag = gtag;

  gtag('js', new Date());
  gtag('config', GA4_ID, { send_page_view: true });
}
