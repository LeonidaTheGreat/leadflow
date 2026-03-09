import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// Force dynamic rendering — stats must reflect current data
export const dynamic = 'force-dynamic'

// ============================================
// SMS ANALYTICS API — Delivery, Reply & Booking Conversion
// GET /api/analytics/sms-stats?window=30d
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
  try {
    const { searchParams } = request.nextUrl
    const windowParam = searchParams.get('window') || '30d'
    const agentId = searchParams.get('agent_id') || null

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
    // Fix: query sms_messages (has agent_id column, unlike messages).
    // Twilio stores direction as 'outbound-api' or 'outbound-reply', not 'outbound'.
    // Use .in() to capture all outbound Twilio direction variants.
    // ============================================================

    let outboundQuery = supabaseAdmin
      .from('sms_messages')
      .select('id, status, lead_id')
      .in('direction', ['outbound-api', 'outbound-reply'])

    if (windowStart) {
      outboundQuery = outboundQuery.gte('created_at', windowStart.toISOString())
    }
    if (agentId) {
      outboundQuery = outboundQuery.eq('agent_id', agentId)
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
    // ============================================================

    // Fix: query sms_messages; Twilio stores inbound direction as 'inbound'.
    // Use message_body column (sms_messages column name vs 'body' in messages table).
    let inboundQuery = supabaseAdmin
      .from('sms_messages')
      .select('lead_id, message_body')
      .eq('direction', 'inbound')

    if (windowStart) {
      inboundQuery = inboundQuery.gte('created_at', windowStart.toISOString())
    }
    if (agentId) {
      inboundQuery = inboundQuery.eq('agent_id', agentId)
    }

    const { data: inboundMessages, error: inboundError } = await inboundQuery

    if (inboundError) {
      console.error('[sms-stats] Error fetching inbound messages:', inboundError)
      throw inboundError
    }

    // Unique leads who replied (excluding opt-outs)
    // Use message_body — the column name in sms_messages (not 'body')
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

    let bookingsQuery = supabaseAdmin
      .from('bookings')
      .select('lead_id')

    if (windowStart) {
      bookingsQuery = bookingsQuery.gte('created_at', windowStart.toISOString())
    }
    if (agentId) {
      bookingsQuery = bookingsQuery.eq('agent_id', agentId)
    }

    const { data: bookings, error: bookingsError } = await bookingsQuery

    if (bookingsError) {
      console.error('[sms-stats] Error fetching bookings:', bookingsError)
      // Booking table errors are non-fatal — return null for conversion rate
    }

    const bookedLeadIds = new Set(
      (bookings || [])
        .map((b: any) => b.lead_id)
        .filter(Boolean)
        .filter((id: string) => repliedAndMessaged.has(id)) // only count replied leads
    )

    const uniqueLeadsBooked = bookedLeadIds.size
    const bookingConversion =
      uniqueLeadsReplied > 0 ? uniqueLeadsBooked / uniqueLeadsReplied : null

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
