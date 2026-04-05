import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer as supabase } from '@/lib/supabase-server'
import { sendAhaMomentDay3Email } from '@/lib/email-service'

/**
 * POST /api/onboarding/send-aha-day3
 * 
 * Send the day-3 re-engagement email to trial agents who haven't completed the simulator.
 * Called by cron job or heartbeat.
 * 
 * UC: uc-revenue-aha-moment — R4
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

    // Check if agent has completed the simulator
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

    // Check if day-3 email was already sent
    const { data: existingEmail } = await supabase
      .from('email_events')
      .select('id')
      .eq('customer_id', agentId)
      .eq('email_type', 'aha_moment_day3')
      .limit(1)
      .single()

    if (existingEmail) {
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: 'Day-3 email already sent'
      })
    }

    // Send the email
    const simulatorUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://leadflow-ai-five.vercel.app'}/setup/simulator`
    
    const emailSent = await sendAhaMomentDay3Email(agentEmail, agentId, {
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
        email_type: 'aha_moment_day3',
        timestamp: new Date().toISOString()
      },
      source: 'onboarding_day3_email'
    })

    return NextResponse.json({
      success: true,
      emailSent: true
    })

  } catch (error) {
    console.error('Day-3 email error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/onboarding/send-aha-day3
 * 
 * Get list of agents who need day-3 re-engagement.
 * Returns agents where:
 * - trial_start_date is exactly 3 days ago
 * - No successful onboarding_simulations record
 * - No day-3 email already sent
 */
export async function GET(request: NextRequest) {
  try {
    // Calculate 3 days ago
    const threeDaysAgo = new Date()
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
    threeDaysAgo.setHours(0, 0, 0, 0)
    
    const threeDaysAgoEnd = new Date(threeDaysAgo)
    threeDaysAgoEnd.setHours(23, 59, 59, 999)

    // Find agents who started trial 3 days ago
    const { data: agents, error } = await supabase
      .from('real_estate_agents')
      .select('id, email, first_name, last_name, trial_started_at')
      .eq('plan_tier', 'trial')
      .gte('trial_started_at', threeDaysAgo.toISOString())
      .lte('trial_started_at', threeDaysAgoEnd.toISOString())

    if (error) {
      console.error('Day-3 cohort fetch error:', error)
      return NextResponse.json({ error: 'Failed to fetch cohort' }, { status: 500 })
    }

    // Filter out agents who have completed simulator or already received day-3 email
    const eligibleAgents: Array<{ agentId: string; email: string; name: string }> = []
    
    for (const agent of agents || []) {
      // Check if simulator completed
      const { data: sim } = await supabase
        .from('onboarding_simulations')
        .select('id')
        .eq('agent_id', agent.id)
        .eq('status', 'success')
        .limit(1)
        .single()

      if (sim) continue

      // Check if day-3 email already sent
      const { data: email } = await supabase
        .from('email_events')
        .select('id')
        .eq('customer_id', agent.id)
        .eq('email_type', 'aha_moment_day3')
        .limit(1)
        .single()

      if (email) continue

      eligibleAgents.push({
        agentId: agent.id,
        email: agent.email,
        name: `${agent.first_name || ''} ${agent.last_name || ''}`.trim() || 'Agent'
      })
    }

    return NextResponse.json({
      agents: eligibleAgents,
      count: eligibleAgents.length
    })

  } catch (error) {
    console.error('Day-3 cohort error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
