import { NextRequest, NextResponse } from 'next/server'
import { randomUUID, randomInt } from 'crypto'

/**
 * POST /api/onboarding/simulator
 *
 * Handles onboarding simulator — runs a scripted lead conversation demo.
 * Fully self-contained, no DB dependency (Vercel serverless can't share
 * in-memory state between start/status calls — different containers).
 *
 * - action: 'start' - Runs full 3-turn simulation in one request, returns conversation
 * - action: 'skip' - Returns success
 */

function generateConversation(): { leadName: string, conversation: Array<{role: string, message: string, timestamp: string}> } {
  const leadNames = ['Sarah Johnson', 'Michael Chen', 'Emily Rodriguez', 'David Thompson', 'Lisa Park']
  const leadName = leadNames[randomInt(leadNames.length)]
  const firstName = leadName.split(' ')[0]
  const properties = ['a 3-bedroom home', 'a downtown condo', 'a family house', 'investment property', 'a new construction']
  const property = properties[randomInt(properties.length)]

  const now = Date.now()
  const conversation = [
    {
      role: 'lead',
      message: `Hi, I'm ${leadName}. I'm interested in ${property}. Can you help me?`,
      timestamp: new Date(now).toISOString(),
    },
    {
      role: 'ai',
      message: `Hi ${firstName}! 👋 I'm your AI assistant from LeadFlow. I'd love to help you with ${property}. I can show you our latest listings and help schedule a viewing. Are you looking to buy in the next 1–3 months?`,
      timestamp: new Date(now + 1200).toISOString(),
    },
    {
      role: 'lead',
      message: `Yes, I'd like to see some listings. My budget is around $600,000.`,
      timestamp: new Date(now + 3000).toISOString(),
    },
    {
      role: 'ai',
      message: `Perfect! With a $600K budget, you have some excellent options in the area. I've found 3 properties that match your criteria — would you like me to send you details? I can also check availability for a walkthrough this week.`,
      timestamp: new Date(now + 4500).toISOString(),
    },
    {
      role: 'lead',
      message: `That sounds great! When can we schedule a call to discuss?`,
      timestamp: new Date(now + 6000).toISOString(),
    },
    {
      role: 'ai',
      message: `I'd be happy to set that up! 📅 I have availability this Thursday at 2 PM or Friday at 10 AM. Which works best for you? I'll send a calendar invite right away. Reply STOP at any time to opt out.`,
      timestamp: new Date(now + 7800).toISOString(),
    },
  ]

  return { leadName, conversation }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, agentId } = body

    if (!action || !agentId) {
      return NextResponse.json(
        { error: 'Missing required fields: action, agentId' },
        { status: 400 }
      )
    }

    if (action === 'start') {
      const simulationId = randomUUID()
      const now = new Date().toISOString()
      const { leadName, conversation } = generateConversation()

      return NextResponse.json({
        success: true,
        state: {
          id: simulationId,
          session_id: `setup-${agentId}-${Date.now()}`,
          agent_id: agentId,
          status: 'success',
          simulation_started_at: now,
          inbound_received_at: now,
          ai_response_received_at: now,
          response_time_ms: 1200,
          conversation,
          lead_name: leadName,
        },
      })
    }

    if (action === 'status') {
      // Since we return success immediately on start, status should also return success
      return NextResponse.json({
        state: {
          status: 'success',
          conversation: [],
        },
      })
    }

    if (action === 'skip') {
      return NextResponse.json({
        success: true,
        message: 'Simulation skipped',
      })
    }

    return NextResponse.json(
      { error: 'Invalid action. Must be start, status, or skip' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Onboarding simulator error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
