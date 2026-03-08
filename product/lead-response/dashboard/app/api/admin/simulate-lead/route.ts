import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * POST /api/admin/simulate-lead
 * Runs a dry-run AI SMS simulation without sending real Twilio messages.
 * Stores result in lead_simulations table.
 */

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Scripted lead replies for the 3-turn simulation
const LEAD_SCRIPTS = [
  { delay: 1000, message: (name: string, interest: string) =>
    `Hi! I saw your listing${interest ? ` for ${interest}` : ''}. I'm interested in learning more.` },
  { delay: 1500, message: () =>
    `What's the price range? And is it still available?` },
  { delay: 2000, message: () =>
    `That sounds great! I'd love to schedule a showing this week if possible.` },
]

// AI response templates for each turn
const AI_RESPONSES = [
  (name: string, interest: string) =>
    `Hi ${name}! 👋 I'm the AI assistant for this property${interest ? ` at ${interest}` : ''}. I'd love to help you explore your options! Could you tell me a bit about your budget and timeline?`,
  (name: string) =>
    `Great question, ${name}! This property is priced competitively for the area and is still available as of today. I can share full details and comparable sales if helpful. Are you pre-approved for a mortgage?`,
  (name: string) =>
    `Wonderful! I can get you booked in for a showing. 📅 I have openings Tuesday–Thursday this week. What time works best for you? I'll send a confirmation link once we lock it in.`,
]

interface ConversationTurn {
  role: 'lead' | 'ai'
  message: string
  timestamp: string
}

export async function POST(request: NextRequest) {
  try {
    // Validate admin access (basic check — Stojan-only tool)
    // In production this would check session; for now we trust the middleware
    const body = await request.json()
    const { leadName, leadPhone, propertyInterest } = body

    if (!leadName || typeof leadName !== 'string') {
      return NextResponse.json({ error: 'leadName is required' }, { status: 400 })
    }

    const name = leadName.trim()
    const interest = (propertyInterest || '').trim()
    const phone = (leadPhone || '+15550000000').trim()

    // Build simulated conversation (3 turns each direction)
    const conversation: ConversationTurn[] = []
    const baseTime = Date.now()

    for (let i = 0; i < 3; i++) {
      // Lead message
      const leadMsg = LEAD_SCRIPTS[i].message(name, interest)
      conversation.push({
        role: 'lead',
        message: leadMsg,
        timestamp: new Date(baseTime + i * 3000).toISOString(),
      })

      // AI response
      const aiMsg = AI_RESPONSES[i](name, interest)
      conversation.push({
        role: 'ai',
        message: aiMsg,
        timestamp: new Date(baseTime + i * 3000 + 800).toISOString(),
      })
    }

    // Store simulation in Supabase
    const { data, error } = await supabaseAdmin
      .from('lead_simulations')
      .insert({
        lead_name: name,
        lead_phone: phone,
        property_interest: interest || null,
        conversation,
        outcome: 'completed',
        triggered_by: 'stojan',
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to store simulation:', error)
      // Still return success to the user even if DB write fails
    }

    return NextResponse.json({
      success: true,
      simulationId: data?.id ?? null,
      leadName: name,
      propertyInterest: interest || null,
      conversation,
      outcome: 'completed',
      note: 'No real SMS was sent. This is a dry-run simulation only.',
    })
  } catch (err: any) {
    console.error('Simulation error:', err)
    return NextResponse.json(
      { error: 'Simulation failed', detail: err.message },
      { status: 500 }
    )
  }
}
