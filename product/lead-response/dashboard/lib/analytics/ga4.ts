/**
 * GA4 Analytics Utility
 *
 * Provides Google Analytics 4 event tracking for the landing page.
 * Handles CTA clicks, form interactions, scroll depth, and UTM capture.
 */

declare global {
  interface Window {
    gtag: (...args: unknown[]) => void;
    dataLayer: unknown[];
  }
}

export const GA4_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID || '';

/**
 * Send a GA4 event via gtag.
 */
export function trackEvent(
  eventName: string,
  params?: Record<string, unknown>
): void {
  if (typeof window === 'undefined') return;
  if (!window.gtag) return;
  window.gtag('event', eventName, params ?? {});
}

// ── CTA Events ────────────────────────────────────────────────────────────────

/** "Join the Pilot Program" CTA was clicked */
export function trackJoinPilotClick(location: string): void {
  trackEvent('join_pilot', { cta_location: location });
}

/** "See How It Works" CTA was clicked */
export function trackSeeHowItWorksClick(): void {
  trackEvent('see_how_it_works', { cta_location: 'hero' });
}

// ── Form Events ───────────────────────────────────────────────────────────────

/** Pilot sign-up modal was opened */
export function trackFormOpen(): void {
  trackEvent('form_open', { form_id: 'pilot_signup' });
}

/** Pilot sign-up form was submitted successfully */
export function trackFormSubmission(utmParams: Record<string, string>): void {
  trackEvent('form_submission', {
    form_id: 'pilot_signup',
    ...utmParams,
  });
}

// ── Scroll Depth ──────────────────────────────────────────────────────────────

/** Report a scroll depth milestone (e.g. 25, 50, 75, 90) */
export function trackScrollDepth(depth: number): void {
  trackEvent('scroll_depth', { depth_percent: depth });
}

// ── UTM Helpers ───────────────────────────────────────────────────────────────

export interface UTMParams {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
}

/**
 * Extract UTM parameters from the current URL's search string.
 * Safe to call during SSR (returns empty object).
 */
export function captureUTMParams(search?: string): UTMParams {
  if (typeof window === 'undefined' && !search) return {};

  const params = new URLSearchParams(
    search ?? (typeof window !== 'undefined' ? window.location.search : '')
  );

  const utm: UTMParams = {};
  (['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const).forEach(
    (key) => {
      const value = params.get(key);
      if (value) utm[key] = value;
    }
  );

  return utm;
}

/**
 * Persist UTM params to sessionStorage so they survive modal open/close cycles.
 */
export function persistUTMParams(params: UTMParams): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem('leadflow_utm', JSON.stringify(params));
  } catch {
    // ignore storage errors
  }
}

/**
 * Retrieve persisted UTM params from sessionStorage.
 */
export function retrieveUTMParams(): UTMParams {
  if (typeof window === 'undefined') return {};
  try {
    const raw = sessionStorage.getItem('leadflow_utm');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
