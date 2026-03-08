import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * POST /api/admin/simulate-lead
 *
 * Runs a dry-run SMS conversation simulation for a fake lead.
 * No real SMS is sent. The conversation is stored in lead_simulations.
 *
 * Body:
 *   { leadName: string, leadPhone?: string, propertyInterest?: string }
 *
 * Returns:
 *   { id: string, conversation: ConversationTurn[], outcome: string }
 */

interface ConversationTurn {
  role: 'lead' | 'ai'
  message: string
  timestamp: string
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
}

// Pre-scripted lead replies that simulate a real conversation
const LEAD_SCRIPTS = [
  (name: string, property: string) =>
    `Hi, I'm ${name}. I'm interested in ${property || 'buying a home'}. Can you help me?`,
  () => `Yes, I'd like to see some listings. My budget is around $600,000.`,
  () => `That sounds great! When can we schedule a call to discuss?`,
]

// Scripted AI responses for simulation (no real API call needed in demo)
function generateAiResponse(turn: number, leadName: string, propertyInterest: string | null): string {
  const firstName = leadName.split(' ')[0]
  const property = propertyInterest || 'real estate'

  switch (turn) {
    case 0:
      return `Hi ${firstName}! 👋 I'm your AI assistant from LeadFlow. I'd love to help you with ${property}. I can show you our latest listings and help schedule a viewing. Are you looking to buy in the next 1–3 months?`
    case 1:
      return `Perfect! With a $600K budget, you have some excellent options in the area. I've found 3 properties that match your criteria — would you like me to send you details? I can also check availability for a walkthrough this week.`
    case 2:
      return `I'd be happy to set that up! 📅 I have availability this Thursday at 2 PM or Friday at 10 AM. Which works best for you? I'll send a calendar invite right away. Reply STOP at any time to opt out.`
    default:
      return `Thanks for reaching out! Let me connect you with our team for next steps.`
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { leadName, leadPhone, propertyInterest } = body

    if (!leadName || typeof leadName !== 'string' || leadName.trim().length === 0) {
      return NextResponse.json({ error: 'leadName is required' }, { status: 400 })
    }

    const name = leadName.trim()
    const phone = leadPhone?.trim() || '+15550000000' // fake default
    const property = propertyInterest?.trim() || null

    const conversation: ConversationTurn[] = []
    const now = new Date()

    // Run 3-turn simulation
    for (let turn = 0; turn < 3; turn++) {
      const leadTimestamp = new Date(now.getTime() + turn * 60000).toISOString()
      const aiTimestamp = new Date(now.getTime() + turn * 60000 + 15000).toISOString()

      // Lead message
      const leadMessage = LEAD_SCRIPTS[turn](name, property || 'buying a home')
      conversation.push({
        role: 'lead',
        message: leadMessage,
        timestamp: leadTimestamp,
      })

      // AI response
      const aiMessage = generateAiResponse(turn, name, property)
      conversation.push({
        role: 'ai',
        message: aiMessage,
        timestamp: aiTimestamp,
      })
    }

    // Store in lead_simulations table
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('lead_simulations')
      .insert({
        lead_name: name,
        lead_phone: phone,
        property_interest: property,
        conversation,
        outcome: 'completed',
        triggered_by: 'stojan',
      })
      .select('id, created_at')
      .single()

    if (error) {
      console.error('Failed to store simulation:', error)
      // Still return the conversation even if storage fails
      return NextResponse.json({
        id: null,
        conversation,
        outcome: 'completed',
        warning: 'Simulation ran but could not be saved',
      })
    }

    return NextResponse.json({
      id: data.id,
      conversation,
      outcome: 'completed',
      createdAt: data.created_at,
    })
  } catch (err: any) {
    console.error('Simulation error:', err)
    return NextResponse.json({ error: 'Simulation failed', detail: err.message }, { status: 500 })
  }
}
