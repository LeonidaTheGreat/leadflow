import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer as supabase } from '@/lib/supabase-server'
import { sendAhaMomentDay1Email } from '@/lib/email-service'
import { logger } from '@/lib/logger'

/**
 * POST /api/onboarding/send-aha-day1
 * 
 * Send the day-1 "See Your AI in Action" email to a trial agent.
 * Called after email verification is confirmed.
 * 
 * UC: uc-revenue-aha-moment — R3
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { agentId, agentEmail, agentName } = body

    if (!agentId || !agentEmail) {
      return NextResponse.json(
        { error: 'Missing required fields: agentId, agentEmail' },
        { status: 400 }
      )
    }

    // Check if agent has already completed the simulator
    const { data: existingSim } = await supabase
      .from('onboarding_simulations')
      .select('id')
      .eq('agent_id', agentId)
      .eq('status', 'success')
      .limit(1)
      .single()

    if (existingSim) {
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: 'Simulator already completed'
      })
    }

    // Check if day-1 email was already sent
    const { data: existingEmail } = await supabase
      .from('email_events')
      .select('id')
      .eq('customer_id', agentId)
      .eq('email_type', 'aha_moment_day1')
      .limit(1)
      .single()

    if (existingEmail) {
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: 'Day-1 email already sent'
      })
    }

    // Send the email
    const simulatorUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://leadflow-ai-five.vercel.app'}/setup/simulator`
    
    const emailSent = await sendAhaMomentDay1Email(agentEmail, agentId, {
      agentName,
      simulatorUrl
    })

    if (!emailSent) {
      return NextResponse.json(
        { error: 'Failed to send email' },
        { status: 500 }
      )
    }

    // Log analytics event
    await supabase.from('events').insert({
      agent_id: agentId,
      event_type: 'onboarding_email_sent',
      event_data: {
        email_type: 'aha_moment_day1',
        timestamp: new Date().toISOString()
      },
      source: 'onboarding_day1_email'
    })

    return NextResponse.json({
      success: true,
      emailSent: true
    })

  } catch (error) {
    logger.error('Day-1 email error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
