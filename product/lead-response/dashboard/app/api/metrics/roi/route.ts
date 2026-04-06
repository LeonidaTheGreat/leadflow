import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUserId } from '@/lib/auth'

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
    // ============================================================
    const { data: respondedLeads, error: respondedError } = await supabaseAdmin
      .from('leads')
      .select('id', { count: 'exact' })
      .eq('agent_id', agentId)
      .eq('status', 'responded')

    if (respondedError) {
      console.error('Error fetching responded leads:', respondedError)
      return NextResponse.json({ error: 'Failed to fetch responded leads' }, { status: 500 })
    }

    const leadsResponded = respondedLeads?.length || 0

    // ============================================================
    // 2. AVERAGE RESPONSE TIME
    // Calculate time between lead created_at and first outbound message
    // For each responded lead, find the first outbound message
    // ============================================================
    let avgResponseTimeSeconds = 0
    if (leadsResponded > 0 && respondedLeads) {
      const leadIds = respondedLeads.map(l => l.id)

      // Get all leads with their created_at and the first message time
      const { data: leadsWithMessages, error: messagesError } = await supabaseAdmin
        .from('leads')
        .select(`
          id,
          created_at,
          sms_messages!inner(created_at)
        `)
        .eq('agent_id', agentId)
        .in('id', leadIds)
        .in('sms_messages.direction', ['outbound-api', 'outbound-reply'])
        .order('sms_messages(created_at)', { ascending: true })

      if (!messagesError && leadsWithMessages && leadsWithMessages.length > 0) {
        let totalResponseTimeSeconds = 0
        let leadsWithResponses = 0

        leadsWithMessages.forEach((lead: any) => {
          if (lead.sms_messages && lead.sms_messages.length > 0) {
            const leadCreatedAt = new Date(lead.created_at).getTime()
            const firstMessageAt = new Date(lead.sms_messages[0].created_at).getTime()
            const responseTimeMs = firstMessageAt - leadCreatedAt
            const responseTimeSeconds = Math.max(0, Math.round(responseTimeMs / 1000))
            totalResponseTimeSeconds += responseTimeSeconds
            leadsWithResponses++
          }
        })

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
      .from('calcom_bookings')
      .select('id', { count: 'exact' })
      .eq('agent_id', agentId)
      .gte('created_at', monthStart)
      .lte('created_at', monthEnd)

    if (bookingsError) {
      console.error('Error fetching monthly bookings:', bookingsError)
      return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 })
    }

    const appointmentsBookedThisMonth = monthlyBookings?.length || 0

    // ============================================================
    // 4. ESTIMATED REVENUE PROTECTED
    // Formula: leadsResponded × avgCommission × bookingRate
    //
    // avgCommission: Typical real estate commission (assume 5%)
    // bookingRate: Conversion from lead to booking
    //   - If leadsResponded > 0: bookingRate = appointmentsBookedThisMonth / leadsResponded
    //   - Default: 5% (0.05) if no data
    // ============================================================
    const AVG_COMMISSION = 0.05 // 5% typical real estate commission
    const DEFAULT_BOOKING_RATE = 0.05 // 5% default booking rate

    let bookingRate = DEFAULT_BOOKING_RATE
    if (leadsResponded > 0) {
      bookingRate = appointmentsBookedThisMonth / leadsResponded
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
