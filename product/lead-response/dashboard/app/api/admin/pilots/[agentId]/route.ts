import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { isAdminUser } from '@/lib/services/AuthService'
import {
  sendPilotWelcomeEmail,
  sendPilotSetupCompleteEmail,
  sendPilotAhaMomentEmail,
  sendPilotTrialCTAEmail } from '@/lib/email-service'
import crypto from 'crypto'
import { logger } from '@/lib/logger'

/**
 * POST /api/admin/pilots/[agentId]/log-contact
 * Log a support interaction for a pilot agent
 * Updates: last_contact_at, last_contact_type, support_notes
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    if (!await isAdminUser(request)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { agentId } = await params
    const body = await request.json()
    const { contactType, notes, stageAdvanced } = body

    // Validate input
    if (!agentId || !contactType) {
      return NextResponse.json(
        { success: false, error: 'agentId and contactType are required' },
        { status: 400 }
      )
    }

    const validContactTypes = ['email', 'call', 'zoom', 'slack']
    if (!validContactTypes.includes(contactType)) {
      return NextResponse.json(
        { success: false, error: `contactType must be one of: ${validContactTypes.join(', ')}` },
        { status: 400 }
      )
    }

    // Use the PostgREST client for direct DB access
    const { data, error } = await supabaseServer
      .from('pilot_progress')
      .update({
        last_contact_at: new Date().toISOString(),
        last_contact_type: contactType,
        support_notes: notes
          ? (notes || '') + `\n[${contactType.toUpperCase()}] ${new Date().toISOString()}: ${notes}`
          : null })
      .eq('agent_id', agentId)
      .select()
      .single()

    if (error || !data) {
      return NextResponse.json(
        { success: false, error: 'Failed to update pilot progress' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, pilot: data })
  } catch (error) {
    logger.error('Failed to log contact:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to log contact' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/admin/pilots/[agentId]/advance-stage
 * Advance a pilot to the next stage and trigger lifecycle email
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    if (!await isAdminUser(request)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { agentId } = await params
    const body = await request.json()
    const { newStage } = body

    // Validate input
    if (!agentId || !newStage) {
      return NextResponse.json(
        { success: false, error: 'agentId and newStage are required' },
        { status: 400 }
      )
    }

    const validStages = [
      'signed_up',
      'email_verified',
      'fub_connected',
      'first_lead_responded',
      'aha_moment',
      'trial_started',
      'paid',
    ]
    if (!validStages.includes(newStage)) {
      return NextResponse.json(
        { success: false, error: `newStage must be one of: ${validStages.join(', ')}` },
        { status: 400 }
      )
    }

    // Update stage
    const { data: updatedPilot, error: updateError } = await supabaseServer
      .from('pilot_progress')
      .update({
        stage: newStage,
        stage_entered_at: new Date().toISOString() })
      .eq('agent_id', agentId)
      .select()
      .single()

    if (updateError || !updatedPilot) {
      return NextResponse.json(
        { success: false, error: 'Failed to advance stage' },
        { status: 500 }
      )
    }

    // Fetch agent details for email
    const { data: agent } = await supabaseServer
      .from('real_estate_agents')
      .select('email, first_name')
      .eq('id', agentId)
      .single()

    if (!agent) {
      return NextResponse.json(
        { success: false, error: 'Agent not found' },
        { status: 404 }
      )
    }

    // Trigger lifecycle email based on new stage
    const dashboardUrl = `${process.env.NEXT_PUBLIC_DASHBOARD_URL || 'https://leadflow-ai-five.vercel.app'}/dashboard`
    const upgradeUrl = `${dashboardUrl}/plans`

    let emailSent = false
    try {
      switch (newStage) {
        case 'signed_up':
          emailSent = await sendPilotWelcomeEmail(agent.email, agent.first_name || 'Agent', dashboardUrl)
          break
        case 'fub_connected':
          emailSent = await sendPilotSetupCompleteEmail(
            agent.email,
            agent.first_name || 'Agent',
            dashboardUrl
          )
          break
        case 'aha_moment':
          emailSent = await sendPilotAhaMomentEmail(agent.email, agent.first_name || 'Agent', dashboardUrl)
          break
        case 'trial_started':
          emailSent = await sendPilotTrialCTAEmail(
            agent.email,
            agent.first_name || 'Agent',
            dashboardUrl,
            upgradeUrl
          )
          break
      }
    } catch (emailError) {
      logger.error('Failed to send lifecycle email:', emailError)
      // Don't fail the stage advance if email fails — log and continue
    }

    return NextResponse.json({
      success: true,
      pilot: updatedPilot,
      emailSent })
  } catch (error) {
    logger.error('Failed to advance stage:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to advance stage' },
      { status: 500 }
    )
  }
}
