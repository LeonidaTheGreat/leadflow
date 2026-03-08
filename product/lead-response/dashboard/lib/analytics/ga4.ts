/**
 * GA4 Analytics Helper
 *
 * Provides a type-safe wrapper around Google Analytics 4 (gtag.js) events.
 * Designed for the LeadFlow AI landing page instrumentation.
 *
 * Usage:
 *   import { trackEvent, trackCTAClick, trackFormEvent } from '@/lib/analytics/ga4';
 *
 * All functions are SSR-safe — they are no-ops if window is not defined or gtag
 * has not been loaded yet.
 */

// ─── Type declarations ────────────────────────────────────────────────────────

declare global {
  interface Window {
    gtag: Gtag.Gtag;
    dataLayer: unknown[];
  }
}

// ─── CTA identifiers (FR-2) ───────────────────────────────────────────────────

export type CTAId =
  | 'join_pilot_hero'
  | 'see_how_it_works'
  | 'join_pilot_nav'
  | 'start_trial_form'
  | 'pricing_starter'
  | 'pricing_pro'
  | 'pricing_team'
  | 'lead_magnet_cta'
  | 'get_started_hero'
  | 'get_started_nav'
  | 'sign_in_nav'
  | string; // allow ad-hoc CTA ids

export type Section =
  | 'hero'
  | 'navigation'
  | 'signup'
  | 'pricing'
  | 'lead_magnet'
  | 'features'
  | 'footer'
  | string;

// ─── Form funnel stages (FR-4) ────────────────────────────────────────────────

export type FormFunnelEvent =
  | 'form_view'
  | 'form_start'
  | 'form_submit_attempt'
  | 'pilot_signup_complete'
  | 'form_submit_error';

// ─── Core helper ─────────────────────────────────────────────────────────────

/**
 * Fires a GA4 event via gtag(). No-op during SSR or when GA4 is not loaded.
 * IMPORTANT: Never include PII (email, phone, name) in event parameters (NFR-2).
 */
export function trackEvent(name: string, params?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;
  if (typeof window.gtag !== 'function') return;
  window.gtag('event', name, params);
}

// ─── CTA click tracking (FR-2, US-1) ─────────────────────────────────────────

/**
 * Track a CTA button click.
 *
 * @param ctaId     — Identifier from the CTA table in the PRD
 * @param ctaLabel  — Human-readable button label (no PII)
 * @param section   — Page section where the CTA lives
 */
export function trackCTAClick(
  ctaId: CTAId,
  ctaLabel: string,
  section: Section,
): void {
  trackEvent('cta_click', {
    cta_id: ctaId,
    cta_label: ctaLabel,
    section,
    page_url: typeof window !== 'undefined' ? window.location.href : undefined,
  });
}

// ─── Scroll depth tracking (FR-3, US-2) ──────────────────────────────────────

/**
 * Track a scroll milestone (25 | 50 | 75 | 90 percent).
 * GA4 Enhanced Measurement covers 90% automatically; this covers the rest.
 */
export function trackScrollMilestone(percentScrolled: 25 | 50 | 75 | 90): void {
  trackEvent('scroll_milestone', {
    percent_scrolled: percentScrolled,
    page_url: typeof window !== 'undefined' ? window.location.href : undefined,
  });
}

// ─── Form funnel tracking (FR-4, US-3) ───────────────────────────────────────

/**
 * Track a step in the signup form funnel.
 * No PII should ever be passed here — use form_id or form_name only.
 */
export function trackFormEvent(
  event: FormFunnelEvent,
  formId: string = 'pilot_signup',
  extraParams?: Record<string, unknown>,
): void {
  trackEvent(event, {
    form_id: formId,
    page_url: typeof window !== 'undefined' ? window.location.href : undefined,
    ...extraParams,
  });
}

// ─── Scroll depth observer factory (FR-3) ────────────────────────────────────

const MILESTONES: Array<25 | 50 | 75> = [25, 50, 75];

/**
 * Attach a scroll-depth IntersectionObserver to a ref element.
 * Fires trackScrollMilestone() when the element enters the viewport.
 * Returns a cleanup function — call it in useEffect's return.
 *
 * @param elementRef  — React ref to the element that marks the milestone
 * @param milestone   — Percentage to fire (25, 50, or 75)
 */
export function createScrollObserver(
  element: Element,
  milestone: 25 | 50 | 75,
): IntersectionObserver {
  const fired = new Set<number>();
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !fired.has(milestone)) {
          fired.add(milestone);
          trackScrollMilestone(milestone);
        }
      });
    },
    { threshold: 0.1 },
  );
  observer.observe(element);
  return observer;
}

/**
 * Convenience: attach IntersectionObservers to multiple milestone elements.
 * Elements must be passed in ascending milestone order: [25-el, 50-el, 75-el].
 * Returns a cleanup function.
 */
export function attachScrollMilestoneObservers(
  elements: Array<Element | null>,
): () => void {
  const observers: IntersectionObserver[] = [];
  elements.forEach((el, idx) => {
    if (!el) return;
    const milestone = MILESTONES[idx];
    if (milestone) {
      observers.push(createScrollObserver(el, milestone));
    }
  });
  return () => observers.forEach((o) => o.disconnect());
}
