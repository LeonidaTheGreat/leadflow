/**
 * Spec:
 * What:
 * - Update product/lead-response/dashboard/app/api/metrics/roi/route.ts only.
 * - Change the GET() response-time query from the legacy sms_messages table to the canonical messages table.
 * - Align the outbound direction filter with messages.direction values used elsewhere in the app.
 * Verify:
 * - Run: npm run build
 * - Run: git grep -n "sms_messages\|outbound-api\|outbound-reply" -- product/lead-response/dashboard/app/api/metrics/roi/route.ts
 * - Expected: build succeeds, and the ROI route no longer references sms_messages/outbound-api/outbound-reply.
 * Boundaries:
 * - Do not change ROI formulas, auth behavior, booking queries, or unrelated message-writing code.
 * - Do not modify database schema, migrations, or other API routes.
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUserId } from '@/lib/services/AuthService'

// Force dynamic rendering — metrics must reflect current data
export const dynamic = 'force-dynamic'

/**
 * ROI Metrics API
 * GET /api/metrics/roi
 *
 * Returns ROI metrics for the authenticated agent:
 * - leadsResponded: Total count of leads responded to
 * - avgResponseTime: Average response time in seconds
 * - appointmentsBookedThisMonth: Count of appointments booked in current month
 * - estimatedRevenueProtected: Estimated revenue = leadsResponded × avgCommission × bookingRate
 *
 * Security: agent_id is read exclusively from authenticated session.
 */

export async function GET(request: NextRequest) {
  // ============================================================
  // AUTH — agent_id comes from session, never from query params
  // ============================================================
  const agentId = await getAuthUserId(request)
  if (!agentId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // ============================================================
    // 1. LEADS RESPONDED COUNT
    // Query all leads for this agent with status = 'responded'
    // Include created_at for response time calculation
    // ============================================================
    const { data: respondedLeads, error: respondedError } = await supabaseAdmin
      .from('leads')
      .select('id,created_at')
      .eq('agent_id', agentId)
      .eq('status', 'responded')

    if (respondedError) {
      console.error('Error fetching responded leads:', respondedError)
      return NextResponse.json({ error: 'Failed to fetch responded leads' }, { status: 500 })
    }

    const leadsResponded = respondedLeads?.length || 0

    // ============================================================
    // 2. AVERAGE RESPONSE TIME
    // For each responded lead, find the earliest outbound SMS.
    // Response time = firstOutboundMessage.created_at - lead.created_at
    // ============================================================
    let avgResponseTimeSeconds = 0
    if (leadsResponded > 0 && respondedLeads) {
      const leadIds = respondedLeads.map((l: any) => l.id)

      // Query canonical messages table for earliest outbound response per lead.
      const { data: outboundMessages } = await supabaseAdmin
        .from('messages')
        .select('lead_id,created_at')
        .in('lead_id', leadIds)
        .eq('direction', 'outbound')
        .order('created_at', { ascending: true })

      if (outboundMessages && outboundMessages.length > 0) {
        // Build map: lead_id → earliest outbound message timestamp
        const firstMessageByLead = new Map<string, string>()
        for (const msg of outboundMessages as Array<{ lead_id: string; created_at: string }>) {
          if (!firstMessageByLead.has(msg.lead_id)) {
            firstMessageByLead.set(msg.lead_id, msg.created_at)
          }
        }

        let totalResponseTimeSeconds = 0
        let leadsWithResponses = 0

        for (const lead of respondedLeads as Array<{ id: string; created_at: string }>) {
          const firstMessageAt = firstMessageByLead.get(lead.id)
          if (firstMessageAt) {
            const leadCreatedAt = new Date(lead.created_at).getTime()
            const responseTimeMs = new Date(firstMessageAt).getTime() - leadCreatedAt
            const responseTimeSeconds = Math.max(0, Math.round(responseTimeMs / 1000))
            totalResponseTimeSeconds += responseTimeSeconds
            leadsWithResponses++
          }
        }

        if (leadsWithResponses > 0) {
          avgResponseTimeSeconds = Math.round(totalResponseTimeSeconds / leadsWithResponses)
        }
      }
    }

    // ============================================================
    // 3. APPOINTMENTS BOOKED THIS MONTH
    // Count bookings created in current calendar month
    // ============================================================
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).toISOString()

    const { data: monthlyBookings, error: bookingsError } = await supabaseAdmin
      .from('bookings')
      .select('id')
      .eq('agent_id', agentId)
      .gte('created_at', monthStart)
      .lte('created_at', monthEnd)

    if (bookingsError) {
      console.error('Error fetching monthly bookings:', bookingsError)
      return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 })
    }

    const appointmentsBookedThisMonth = monthlyBookings?.length || 0

    // ============================================================
    // 3b. ALL-TIME APPOINTMENTS BOOKED (for booking rate calculation)
    // Count all bookings for this agent (no date filter)
    // ============================================================
    const { data: allTimeBookings, error: allTimeBookingsError } = await supabaseAdmin
      .from('bookings')
      .select('id')
      .eq('agent_id', agentId)

    if (allTimeBookingsError) {
      console.error('Error fetching all-time bookings:', allTimeBookingsError)
      return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 })
    }

    const appointmentsBookedAllTime = allTimeBookings?.length || 0

    // ============================================================
    // 4. ESTIMATED REVENUE PROTECTED
    // Formula: leadsResponded × avgCommission × bookingRate
    //
    // avgCommission: Typical real estate commission (assume 5%)
    // bookingRate: Conversion from lead to booking
    //   - If leadsResponded > 0: bookingRate = appointmentsBookedAllTime / leadsResponded
    //   - Default: 5% (0.05) if no data
    // ============================================================
    const AVG_COMMISSION = 0.05 // 5% typical real estate commission
    const DEFAULT_BOOKING_RATE = 0.05 // 5% default booking rate

    let bookingRate = DEFAULT_BOOKING_RATE
    if (leadsResponded > 0) {
      bookingRate = appointmentsBookedAllTime / leadsResponded
    }

    // Average property value assumption: $350,000 USD
    const AVG_PROPERTY_VALUE = 350000
    const estimatedRevenueProtected = Math.round(
      leadsResponded * AVG_PROPERTY_VALUE * AVG_COMMISSION * bookingRate
    )

    // ============================================================
    // Return metrics
    // ============================================================
    return NextResponse.json({
      leadsResponded,
      avgResponseTimeSeconds,
      appointmentsBookedThisMonth,
      estimatedRevenueProtected,
      bookingRate: Math.round(bookingRate * 100 * 10) / 10, // Round to 1 decimal place (%)
      hasData: leadsResponded > 0 || appointmentsBookedThisMonth > 0,
    })
  } catch (error) {
    console.error('Error fetching ROI metrics:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
