import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { validateSession } from '@/lib/session'

// ============================================
// SMS ANALYTICS STATS ENDPOINT
// GET /api/analytics/sms-stats?window=30d
//
// Returns delivery rate, reply rate, and booking conversion
// for the authenticated agent's SMS activity.
//
// Fix: queries sms_messages table (not messages — which lacks agent_id).
// Columns used: id, direction, status, agent_id, lead_id, message_body, created_at
// Direction values: 'outbound-api' (sent), 'inbound' (received by Twilio)
// Opt-out detection: message_body column (not body)
// ============================================

const OPT_OUT_KEYWORDS = ['STOP', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT', 'STOPALL']

function parseWindow(window: string | null): Date | null {
  const now = new Date()
  switch (window) {
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    case '30d':
    case null:
    case undefined:
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    case 'all':
      return null
    default: {
      const match = window.match(/^(\d+)d$/)
      if (match) {
        const days = parseInt(match[1], 10)
        return new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
      }
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    // ── Auth ─────────────────────────────────────────────────────────────
    // API routes are excluded from the Next.js middleware matcher so we
    // must validate the session manually here.
    const sessionToken = request.cookies.get('leadflow_session')?.value
    if (!sessionToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const session = await validateSession(sessionToken)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const agentId = session.userId

    // ── Time window ───────────────────────────────────────────────────────
    const windowParam = request.nextUrl.searchParams.get('window')
    const windowStart = parseWindow(windowParam)
    const resolvedWindow = windowParam === 'all' ? 'all' : windowParam ?? '30d'

    // ── Delivery Rate ─────────────────────────────────────────────────────
    // Correct table: sms_messages (has agent_id column).
    // Outbound direction in sms_messages = 'outbound-api' (Twilio canonical).
    let outboundQuery = supabaseAdmin
      .from('sms_messages')
      .select('id, status, lead_id')
      .eq('agent_id', agentId)
      .eq('direction', 'outbound-api')

    if (windowStart) {
      outboundQuery = outboundQuery.gte('created_at', windowStart.toISOString())
    }

    const { data: outboundMsgs, error: outboundError } = await outboundQuery

    if (outboundError) {
      console.error('[sms-stats] outbound query error:', outboundError)
      return NextResponse.json(
        { error: 'Failed to query SMS delivery data', detail: outboundError.message },
        { status: 500 }
      )
    }

    const messagesSent = outboundMsgs?.length ?? 0
    const messagesDelivered =
      outboundMsgs?.filter((m: any) => m.status === 'delivered').length ?? 0
    const deliveryRate = messagesSent > 0 ? messagesDelivered / messagesSent : null

    // ── Reply Rate ────────────────────────────────────────────────────────
    const leadsSentTo = new Set<string>(
      (outboundMsgs ?? []).map((m: any) => m.lead_id).filter(Boolean)
    )

    let replyRate: number | null = null
    let leadsReplied = 0

    if (leadsSentTo.size > 0) {
      // Inbound direction = 'inbound' (Twilio value).
      // Use message_body column (not 'body') for opt-out keyword detection.
      let inboundQuery = supabaseAdmin
        .from('sms_messages')
        .select('lead_id, message_body')
        .eq('agent_id', agentId)
        .eq('direction', 'inbound')
        .in('lead_id', Array.from(leadsSentTo))

      if (windowStart) {
        inboundQuery = inboundQuery.gte('created_at', windowStart.toISOString())
      }

      const { data: inboundMsgs, error: inboundError } = await inboundQuery

      if (inboundError) {
        console.error('[sms-stats] inbound query error:', inboundError)
        return NextResponse.json(
          { error: 'Failed to query SMS reply data', detail: inboundError.message },
          { status: 500 }
        )
      }

      // Exclude opt-out replies; count unique lead_ids that genuinely replied.
      const replyingLeads = new Set<string>()
      ;(inboundMsgs ?? []).forEach((m: any) => {
        const body = (m.message_body ?? '').trim().toUpperCase()
        const isOptOut = OPT_OUT_KEYWORDS.some(
          (kw) => body === kw || body.startsWith(kw + ' ')
        )
        if (!isOptOut && m.lead_id) {
          replyingLeads.add(m.lead_id)
        }
      })

      leadsReplied = replyingLeads.size
      replyRate = leadsSentTo.size > 0 ? leadsReplied / leadsSentTo.size : null
    }

    // ── Booking Conversion ────────────────────────────────────────────────
    // Denominator: leads who replied.
    // Numerator: leads who replied AND have a booking.
    let bookingsMade = 0
    let bookingConversion: number | null = null

    if (leadsReplied > 0) {
      let bookingQuery = supabaseAdmin
        .from('bookings')
        .select('lead_id')
        .eq('agent_id', agentId)

      if (windowStart) {
        bookingQuery = bookingQuery.gte('created_at', windowStart.toISOString())
      }

      const { data: bookingRows, error: bookingError } = await bookingQuery

      if (bookingError) {
        console.error('[sms-stats] booking query error:', bookingError)
        // Non-fatal: return partial data with null conversion
        bookingsMade = 0
        bookingConversion = null
      } else {
        bookingsMade = new Set(
          (bookingRows ?? []).map((b: any) => b.lead_id).filter(Boolean)
        ).size
        bookingConversion = leadsReplied > 0 ? bookingsMade / leadsReplied : null
      }
    }

    // ── Response ──────────────────────────────────────────────────────────
    return NextResponse.json(
      {
        window: resolvedWindow,
        deliveryRate,
        replyRate,
        bookingConversion,
        messagesSent,
        leadsReplied,
        bookingsMade,
      },
      {
        headers: {
          'Cache-Control': 'private, no-store',
        },
      }
    )
  } catch (error) {
    console.error('[sms-stats] unexpected error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    )
  }
}
