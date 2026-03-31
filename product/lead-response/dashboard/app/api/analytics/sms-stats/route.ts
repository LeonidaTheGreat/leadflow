import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUserId } from '@/lib/auth'

// Force dynamic rendering — stats must reflect current data
export const dynamic = 'force-dynamic'

// ============================================
// SMS ANALYTICS API — Delivery, Reply & Booking Conversion
// GET /api/analytics/sms-stats?window=30d
//
// Security: agent_id is read exclusively from the authenticated session.
// Query parameter agent_id is NOT accepted — prevents cross-agent data access.
// ============================================

/**
 * Parse window param to a Date (start of window) or null (all-time).
 */
function parseWindowStart(window: string): Date | null {
  const now = Date.now()
  if (window === '7d') return new Date(now - 7 * 24 * 60 * 60 * 1000)
  if (window === '30d') return new Date(now - 30 * 24 * 60 * 60 * 1000)
  if (window === 'all') return null
  // Default to 30 days if invalid value provided
  return new Date(now - 30 * 24 * 60 * 60 * 1000)
}

/**
 * Opt-out keywords — replies with these phrases are excluded from reply rate.
 */
const OPT_OUT_KEYWORDS = ['stop', 'unsubscribe', 'cancel', 'quit', 'end', 'optout', 'opt-out']

function isOptOut(body: string): boolean {
  return OPT_OUT_KEYWORDS.includes((body || '').toLowerCase().trim())
}

export async function GET(request: NextRequest) {
  // ============================================================
  // AUTH — agent_id comes from the session, never from query params
  // Unified auth: checks auth-token (JWT from signup) and leadflow_session (from login)
  // ============================================================
  const agentId = await getAuthUserId(request)
  if (!agentId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = request.nextUrl
    const windowParam = searchParams.get('window') || '30d'

    // Validate window param
    if (!['7d', '30d', 'all'].includes(windowParam)) {
      return NextResponse.json(
        { error: "Invalid window param. Use '7d', '30d', or 'all'." },
        { status: 400 }
      )
    }

    const windowStart = parseWindowStart(windowParam)

    // ============================================================
    // GET AGENT'S LEAD IDS
    // sms_messages table doesn't have agent_id directly; must join through leads
    // ============================================================
    
    let agentLeadsQuery = supabaseAdmin
      .from('leads')
      .select('id')
      .eq('agent_id', agentId)

    if (windowStart) {
      agentLeadsQuery = agentLeadsQuery.gte('created_at', windowStart.toISOString())
    }

    const { data: agentLeads, error: agentLeadsError } = await agentLeadsQuery

    if (agentLeadsError || !agentLeads) {
      console.error('[sms-stats] Error fetching agent leads:', agentLeadsError)
      return NextResponse.json({
        deliveryRate: null,
        replyRate: null,
        totalOutbound: 0,
        totalDelivered: 0,
        totalReplies: 0,
        uniqueLeadsMessaged: 0,
        error: agentLeadsError?.message || 'Failed to fetch agent leads'
      })
    }

    const agentLeadIds = agentLeads.map((l: any) => l.id)
    if (agentLeadIds.length === 0) {
      // No leads for this agent, return zero stats
      return NextResponse.json({
        window: windowParam,
        deliveryRate: null,
        replyRate: null,
        bookingConversion: null,
        messagesSent: 0,
        messagesDelivered: 0,
        leadsMessaged: 0,
        leadsReplied: 0,
        bookingsMade: 0,
      })
    }

    // ============================================================
    // DELIVERY RATE
    // delivery_rate = delivered / total_outbound
    //
    // Uses sms_messages table via lead_id join.
    // Twilio stores direction as 'outbound-api' or 'outbound-reply', not 'outbound'.
    // Use .in() to capture all outbound Twilio direction variants.
    // ============================================================

    let outboundQuery = supabaseAdmin
      .from('sms_messages')
      .select('id, status, lead_id')
      .in('direction', ['outbound-api', 'outbound-reply'])
      .in('lead_id', agentLeadIds)

    if (windowStart) {
      outboundQuery = outboundQuery.gte('created_at', windowStart.toISOString())
    }

    const { data: outboundMessages, error: outboundError } = await outboundQuery

    if (outboundError) {
      console.error('[sms-stats] Error fetching outbound messages:', outboundError)
      // Return empty stats instead of crashing — table may have different schema
      return NextResponse.json({
        deliveryRate: null,
        replyRate: null,
        totalOutbound: 0,
        totalDelivered: 0,
        totalReplies: 0,
        uniqueLeadsMessaged: 0,
        error: outboundError.message || 'Failed to fetch SMS stats'
      })
    }

    const totalOutbound = outboundMessages?.length || 0
    const totalDelivered = outboundMessages?.filter(
      (m: any) => m.status === 'delivered' || m.twilio_status === 'delivered'
    ).length || 0

    const deliveryRate = totalOutbound > 0 ? totalDelivered / totalOutbound : null

    // Unique leads who received at least one outbound SMS
    const outboundLeadIds = new Set(
      (outboundMessages || []).map((m: any) => m.lead_id).filter(Boolean)
    )

    // ============================================================
    // REPLY RATE
    // reply_rate = unique_leads_replied / unique_leads_messaged
    // Excludes opt-out replies
    //
    // Uses body column for opt-out detection.
    // ============================================================

    // Query sms_messages; Twilio stores inbound direction as 'inbound'.
    // Use body column (the actual column name in production sms_messages table).
    let inboundQuery = supabaseAdmin
      .from('sms_messages')
      .select('lead_id, body')
      .eq('direction', 'inbound')
      .in('lead_id', agentLeadIds)

    if (windowStart) {
      inboundQuery = inboundQuery.gte('created_at', windowStart.toISOString())
    }

    const { data: inboundMessages, error: inboundError } = await inboundQuery

    if (inboundError) {
      console.error('[sms-stats] Error fetching inbound messages:', inboundError)
      throw inboundError
    }

    // Unique leads who replied (excluding opt-outs)
    // Use body — the actual column name in sms_messages table
    const repliedLeadIds = new Set(
      (inboundMessages || [])
        .filter((m: any) => !isOptOut(m.body))
        .map((m: any) => m.lead_id)
        .filter(Boolean)
    )

    // Only count replies from leads we actually messaged in this window
    const repliedAndMessaged = new Set(
      [...repliedLeadIds].filter((id) => outboundLeadIds.has(id))
    )

    const uniqueLeadsMsgd = outboundLeadIds.size
    const uniqueLeadsReplied = repliedAndMessaged.size
    const replyRate = uniqueLeadsMsgd > 0 ? uniqueLeadsReplied / uniqueLeadsMsgd : null

    // ============================================================
    // BOOKING CONVERSION RATE
    // booking_conversion = unique_leads_booked / unique_leads_replied
    // ============================================================

    // Filter bookings by lead_id (already filtered to agent's leads above)
    let bookingsQuery = supabaseAdmin
      .from('bookings')
      .select('lead_id')
      .in('lead_id', agentLeadIds)

    if (windowStart) {
      bookingsQuery = bookingsQuery.gte('created_at', windowStart.toISOString())
    }

    const { data: bookings, error: bookingsError } = await bookingsQuery

    if (bookingsError) {
      console.error('[sms-stats] Error fetching bookings:', bookingsError)
      // Booking table errors are non-fatal — return null for conversion rate
    }

    // If bookings query failed, conversion rate is unknown (null), not zero
    let uniqueLeadsBooked = 0
    let bookingConversion: number | null = null

    if (!bookingsError) {
      const bookedLeadIds = new Set(
        (bookings || [])
          .map((b: any) => b.lead_id)
          .filter(Boolean)
          .filter((id: string) => repliedAndMessaged.has(id)) // only count replied leads
      )
      uniqueLeadsBooked = bookedLeadIds.size
      bookingConversion = uniqueLeadsReplied > 0 ? uniqueLeadsBooked / uniqueLeadsReplied : null
    }

    // ============================================================
    // RESPONSE
    // ============================================================

    return NextResponse.json(
      {
        window: windowParam,
        deliveryRate,
        replyRate,
        bookingConversion,
        // Raw counts for display hints
        messagesSent: totalOutbound,
        messagesDelivered: totalDelivered,
        leadsMessaged: uniqueLeadsMsgd,
        leadsReplied: uniqueLeadsReplied,
        bookingsMade: uniqueLeadsBooked,
      },
      {
        headers: {
          // Cache for 60 seconds — fresh enough for near-real-time feel
          'Cache-Control': 'private, s-maxage=60, stale-while-revalidate=120',
        },
      }
    )
  } catch (error) {
    console.error('[sms-stats] Unexpected error:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to fetch SMS analytics',
      },
      { status: 500 }
    )
  }
}
