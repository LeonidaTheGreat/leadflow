'use client'

import { useEffect } from 'react'
import { useAnalytics, PostHogEvents } from '@/lib/analytics'

interface LeadViewTrackerProps {
  leadId: string
  leadSource?: string
  leadStatus?: string
}

/**
 * Lead View Tracker
 *
 * Client component that tracks when a lead is viewed.
 * Use this in server components to track lead views.
 *
 * Usage:
 * ```tsx
 * import { LeadViewTracker } from '@/components/analytics/LeadViewTracker';
 *
 * export default async function LeadPage({ params }) {
 *   const lead = await getLead(params.id);
 *   return (
 *     <>
 *       <LeadViewTracker
 *         leadId={lead.id}
 *         leadSource={lead.source}
 *         leadStatus={lead.status}
 *       />
 *       <LeadDetail lead={lead} />
 *     </>
 *   );
 * }
 * ```
 */
export function LeadViewTracker({ leadId, leadSource, leadStatus }: LeadViewTrackerProps) {
  const { track } = useAnalytics()

  useEffect(() => {
    track(PostHogEvents.LEAD_VIEWED, {
      lead_id: leadId,
      lead_source: leadSource || 'unknown',
      lead_status: leadStatus || 'unknown',
      view_timestamp: new Date().toISOString(),
    })
  }, [track, leadId, leadSource, leadStatus])

  return null
}
