import { NextRequest, NextResponse } from 'next/server'
import { getAgentById, getLeadById } from '@/lib/supabase'
import { generateBookingLink, getAgentBookingLink } from '@/lib/calcom'

// Force dynamic rendering - API routes should never be static
export const dynamic = 'force-dynamic'

// ============================================
// BOOKING LINK API
// ============================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const leadId = searchParams.get('lead_id')
    const agentId = searchParams.get('agent_id')

    if (!leadId && !agentId) {
      return NextResponse.json(
        { error: 'Missing required parameter: lead_id or agent_id' },
        { status: 400 }
      )
    }

    let agentUsername: string | null = null
    let lead: any = null

    // Get agent
    if (agentId) {
      const { data: agent } = await getAgentById(agentId)
      if (!agent?.calcom_username) {
        return NextResponse.json(
          { error: 'Agent does not have Cal.com configured' },
          { status: 400 }
        )
      }
      agentUsername = agent.calcom_username
    }

    // Get lead and agent from lead
    if (leadId) {
      const { data: leadData } = await getLeadById(leadId)
      if (!leadData) {
        return NextResponse.json(
          { error: 'Lead not found' },
          { status: 404 }
        )
      }
      lead = leadData

      // If no agentId provided, get from lead
      if (!agentId && lead.agent_id) {
        const { data: agent } = await getAgentById(lead.agent_id)
        if (agent?.calcom_username) {
          agentUsername = agent.calcom_username
        }
      }
    }

    if (!agentUsername) {
      return NextResponse.json(
        { error: 'No agent with Cal.com configuration found' },
        { status: 400 }
      )
    }

    // Generate booking link
    const bookingLink = generateBookingLink({
      agentUsername,
      leadName: lead?.name || undefined,
      leadEmail: lead?.email || undefined,
      leadPhone: lead?.phone || undefined,
    })

    return NextResponse.json({
      success: true,
      booking_link: bookingLink,
      agent_username: agentUsername,
    })

  } catch (error: any) {
    console.error('❌ Booking API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ============================================
// CREATE BOOKING (via API)
// ============================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { lead_id, start_time, end_time, notes } = body

    if (!lead_id || !start_time || !end_time) {
      return NextResponse.json(
        { error: 'Missing required fields: lead_id, start_time, end_time' },
        { status: 400 }
      )
    }

    // Get lead with agent
    const { data: lead } = await getLeadById(lead_id)
    
    if (!lead) {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      )
    }

    if (!lead.agent_id) {
      return NextResponse.json(
        { error: 'Lead has no assigned agent' },
        { status: 400 }
      )
    }

    const { data: agent } = await getAgentById(lead.agent_id)
    
    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      )
    }

    // For now, return the booking link
    // Full booking creation would require Cal.com API integration
    const bookingLink = agent.calcom_username
      ? getAgentBookingLink(agent, lead)
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
    console.error('❌ Create booking error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
