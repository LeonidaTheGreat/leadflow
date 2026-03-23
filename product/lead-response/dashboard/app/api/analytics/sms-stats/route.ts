import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { validateSession } from '@/lib/session'

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
  // ============================================================
  const sessionToken = request.cookies.get('leadflow_session')?.value
  if (!sessionToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const session = await validateSession(sessionToken)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // The authenticated agent's ID — used for all data queries
  const agentId = session.userId

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
    // DELIVERY RATE
    // delivery_rate = delivered / total_outbound
    //
    // Uses sms_messages table which has a direct agent_id column.
    // Direction value: 'outbound-api' (Twilio canonical value)
    // ============================================================

    let outboundQuery = supabaseAdmin
      .from('sms_messages')
      .select('id, status, lead_id')
      .eq('direction', 'outbound-api')
      .eq('agent_id', agentId)

    if (windowStart) {
      outboundQuery = outboundQuery.gte('created_at', windowStart.toISOString())
    }

    const { data: outboundMessages, error: outboundError } = await outboundQuery

    if (outboundError) {
      console.error('[sms-stats] Error fetching outbound messages:', outboundError)
      throw outboundError
    }

    const totalOutbound = outboundMessages?.length || 0
    const totalDelivered = outboundMessages?.filter(
      (m: any) => m.status === 'delivered'
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
    // Uses message_body column for opt-out detection.
    // ============================================================

    let inboundQuery = supabaseAdmin
      .from('sms_messages')
      .select('lead_id, message_body')
      .eq('direction', 'inbound')
      .eq('agent_id', agentId)

    if (windowStart) {
      inboundQuery = inboundQuery.gte('created_at', windowStart.toISOString())
    }

    const { data: inboundMessages, error: inboundError } = await inboundQuery

    if (inboundError) {
      console.error('[sms-stats] Error fetching inbound messages:', inboundError)
      throw inboundError
    }

    // Unique leads who replied (excluding opt-outs)
    const repliedLeadIds = new Set(
      (inboundMessages || [])
        .filter((m: any) => !isOptOut(m.message_body))
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

    // NOTE: bookings.agent_id may be NULL if not set during webhook processing.
    // We must join through leads to find all bookings for an agent's leads.
    // Uses Supabase foreign table syntax: leads!inner(agent_id) for cross-table filter

    let bookingsQuery = supabaseAdmin
      .from('bookings')
      .select('lead_id, leads!inner(agent_id)')
      .eq('leads.agent_id', agentId)

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
