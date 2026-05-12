import { NextRequest, NextResponse } from 'next/server'
import { getAgentById, getLeadById, getAgentCalcomLink } from '@/lib/supabase'
import { generateBookingLinkFromUrl } from '@/lib/calcom'
import { validateSession } from '@/lib/services/AuthService'
import { logger } from '@/lib/logger'

// Force dynamic rendering - API routes should never be static
export const dynamic = 'force-dynamic'

// ============================================
// BOOKING LINK API
// GET /api/booking?lead_id=<uuid>
//
// Security: agent_id is read exclusively from the authenticated session.
// Query parameter agent_id is NOT accepted — prevents cross-agent data access.
//
// Cal.com link source: agent_integrations.cal_com_link (full URL)
// Prefill params (name/email/phone) appended when lead_id is provided.
// ============================================

export async function GET(request: NextRequest) {
  // AUTH — agent_id comes from the session, never from query params
  const sessionToken = request.cookies.get('leadflow_session')?.value
  if (!sessionToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const session = await validateSession(sessionToken)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const agentId = session.userId

  try {
    const { searchParams } = new URL(request.url)
    const leadId = searchParams.get('lead_id')

    // Get agent Cal.com link from agent_integrations
    const { data: calComLink } = await getAgentCalcomLink(agentId)
    if (!calComLink) {
      return NextResponse.json(
        { error: 'Agent does not have Cal.com configured' },
        { status: 400 }
      )
    }

    let lead: any = null

    if (leadId) {
      const { data: leadData } = await getLeadById(leadId)
      if (!leadData) {
        return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
      }

      // Security: ensure the lead belongs to the authenticated agent
      if (leadData.agent_id && leadData.agent_id !== agentId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      lead = leadData
    }

    const bookingLink = generateBookingLinkFromUrl(calComLink, {
      leadName: lead?.name || undefined,
      leadEmail: lead?.email || undefined,
      leadPhone: lead?.phone || undefined,
    })

    return NextResponse.json({
      success: true,
      booking_link: bookingLink,
      cal_com_link: calComLink,
    })

  } catch (error: any) {
    logger.error('❌ Booking API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ============================================
// CREATE BOOKING (via API)
// ============================================

export async function POST(request: NextRequest) {
  // AUTH — agent_id comes from the session, never from body params
  const sessionToken = request.cookies.get('leadflow_session')?.value
  if (!sessionToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const session = await validateSession(sessionToken)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sessionAgentId = session.userId

  try {
    const body = await request.json()
    const { lead_id, start_time, end_time, notes } = body

    if (!lead_id || !start_time || !end_time) {
      return NextResponse.json(
        { error: 'Missing required fields: lead_id, start_time, end_time' },
        { status: 400 }
      )
    }

    const { data: lead } = await getLeadById(lead_id)
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    // Security: ensure the lead belongs to the authenticated agent
    if (lead.agent_id && lead.agent_id !== sessionAgentId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: agent } = await getAgentById(sessionAgentId)
    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    // Generate booking link from agent_integrations.cal_com_link
    const { data: calComLink } = await getAgentCalcomLink(sessionAgentId)
    const bookingLink = calComLink
      ? generateBookingLinkFromUrl(calComLink, {
          leadName: lead.name || undefined,
          leadEmail: lead.email || undefined,
          leadPhone: lead.phone || undefined,
        })
      : null

    return NextResponse.json({
      success: true,
      booking_link: bookingLink,
      lead_id,
      agent_id: agent.id,
      start_time,
      end_time,
      notes,
    })

  } catch (error: any) {
    logger.error('❌ Create booking error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
