/**
 * GA4 Event Tracking Utility
 * Helper functions for tracking GA4 custom events
 */

export function trackEvent(name: string, params?: Record<string, string | number | boolean>) {
  if (typeof window === 'undefined') return;
  if (typeof (window as any).gtag !== 'function') return;
  
  (window as any).gtag('event', name, params);
}

export function trackCTAClick(location: string, text: string, destination: string) {
  trackEvent('cta_click', {
    cta_location: location,
    cta_text: text,
    destination: destination,
  });
}

export function trackFormOpen(formName: string) {
  trackEvent('form_open', {
    form_name: formName,
  });
}

export function trackFormSubmit(formName: string) {
  trackEvent('form_submit', {
    form_name: formName,
  });
}

export function trackFormSuccess(formName: string) {
  trackEvent('form_success', {
    form_name: formName,
  });
}

export function trackFormError(formName: string, errorMessage?: string) {
  trackEvent('form_error', {
    form_name: formName,
    error_message: errorMessage || 'Unknown error',
  });
}

export function trackScrollDepth(depthPercent: number) {
  trackEvent('scroll_depth', {
    depth_percent: depthPercent,
  });
}

// Type definitions for window.gtag
declare global {
  interface Window {
    dataLayer?: any[];
    gtag?: (...args: any[]) => void;
  }
}
