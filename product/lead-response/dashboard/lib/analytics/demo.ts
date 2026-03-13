/**
 * GA4 Analytics Helper for Demo
 *
 * Provides analytics tracking for the Live AI Demo page.
 * Tracks demo funnel events: started, response_generated, completed, cta_clicked
 */

import { trackEvent } from './ga4'

// Demo event types
export type DemoEvent =
  | 'demo_started'
  | 'demo_response_generated'
  | 'demo_completed'
  | 'demo_cta_clicked'
  | 'demo_error'

export interface DemoEventParams {
  entry_point?: string
  property_type?: string
  lead_source?: string
  session_id?: string
  response_time_ms?: number
  response_time_bucket?: string
  personalization_present?: boolean
  cta_target?: string
  cta_visible?: boolean
  error_type?: string
}

/**
 * Generate a unique session ID for demo analytics using crypto.getRandomValues()
 */
export function generateDemoSessionId(): string {
  const randomBytes = crypto.getRandomValues(new Uint8Array(6))
  const randomHex = Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('')
  return `demo_${Date.now()}_${randomHex}`
}

/**
 * Track a demo funnel event
 * No PII should ever be passed here
 */
export function trackDemoEvent(
  event: DemoEvent,
  params: DemoEventParams = {}
): void {
  trackEvent(event, {
    ...params,
    page_url: typeof window !== 'undefined' ? window.location.href : undefined,
    timestamp: new Date().toISOString(),
  })
}

/**
 * Get response time bucket for analytics
 */
export function getResponseTimeBucket(ms: number): string {
  if (ms < 5000) return '<5s'
  if (ms < 10000) return '5-10s'
  if (ms < 20000) return '10-20s'
  if (ms < 30000) return '20-30s'
  return '>30s'
}
