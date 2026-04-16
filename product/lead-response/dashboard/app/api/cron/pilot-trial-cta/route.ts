import { NextRequest, NextResponse } from 'next/server'
import { postgrestAdmin } from '@/lib/db'
import { sendPilotTrialCTAEmail } from '@/lib/email-service'
import { logger } from '@/lib/logger'

/**
 * POST /api/cron/pilot-trial-cta
 * Sends trial CTA emails to pilots who have been in the aha_moment stage
 * for more than 48 hours and haven't received the trial CTA email yet.
 * 
 * Query: pilot_progress WHERE stage = 'aha_moment' 
 *        AND stage_entered_at < NOW() - INTERVAL '48 hours'
 *        AND trial_cta_sent = false
 * 
 * Should be called daily via Vercel Cron at 11:00 UTC
 */
export async function POST(request: NextRequest) {
  try {
    // Verify this is a cron request (check for Cron secret if configured)
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret) {
      const authHeader = request.headers.get('authorization')
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      }
    }

    logger.info('📧 Running pilot trial CTA email job...')

    // Find pilots in aha_moment stage for > 48h who haven't received trial CTA
    const { data: pilots, error: pilotsError } = await postgrestAdmin
      .from('pilot_progress')
      .select('agent_id, stage_entered_at')
      .eq('stage', 'aha_moment')
      .eq('trial_cta_sent', false)
      .lt('stage_entered_at', new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString())

    if (pilotsError) {
      logger.error('Error fetching pilots for trial CTA:', pilotsError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch pilots' },
        { status: 500 }
      )
    }

    if (!pilots || pilots.length === 0) {
      logger.info('✅ No pilots need trial CTA emails at this time')
      return NextResponse.json({
        success: true,
        message: 'No pilots need trial CTA emails',
        sent: 0,
        failed: 0,
        results: []
      })
    }

    logger.info(`📧 Found ${pilots.length} pilots needing trial CTA emails`)

    // Fetch agent details for each pilot
    const agentIds = pilots.map((p: any) => p.agent_id)
    const { data: agents, error: agentsError } = await postgrestAdmin
      .from('real_estate_agents')
      .select('id, email, first_name')
      .in('id', agentIds)

    if (agentsError) {
      logger.error('Error fetching agent details:', agentsError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch agent details' },
        { status: 500 }
      )
    }

    const agentMap = new Map((agents as any[])?.map((a: any) => [a.id, a]) || [])
    const dashboardUrl = `${process.env.NEXT_PUBLIC_DASHBOARD_URL || 'https://leadflow-ai-five.vercel.app'}/dashboard`
    const upgradeUrl = `${dashboardUrl}/plans`

    const results: { agentId: string; email: string; success: boolean; error?: string }[] = []
    let sentCount = 0
    let failedCount = 0

    // Send trial CTA emails
    for (const pilot of pilots as any[]) {
      const agent = agentMap.get(pilot.agent_id) as any
      if (!agent || !agent.email) {
        logger.warn(`Agent not found or no email for pilot ${pilot.agent_id}`)
        results.push({ agentId: pilot.agent_id, email: '', success: false, error: 'Agent not found or no email' })
        failedCount++
        continue
      }

      try {
        const emailSent = await sendPilotTrialCTAEmail(
          agent.email,
          agent.first_name || 'Agent',
          dashboardUrl,
          upgradeUrl
        )

        if (emailSent) {
          // Mark trial_cta_sent as true
          const { error: updateError } = await postgrestAdmin
            .from('pilot_progress')
            .update({
              trial_cta_sent: true,
              trial_cta_sent_at: new Date().toISOString()
            })
            .eq('agent_id', pilot.agent_id)

          if (updateError) {
            logger.error(`Failed to mark trial_cta_sent for ${pilot.agent_id}:`, updateError)
            results.push({ agentId: pilot.agent_id, email: agent.email, success: false, error: 'Failed to update record' })
            failedCount++
            continue
          }

          logger.info(`✅ Trial CTA email sent to ${agent.email}`)
          results.push({ agentId: pilot.agent_id, email: agent.email, success: true })
          sentCount++
        } else {
          logger.error(`Failed to send trial CTA email to ${agent.email}`)
          results.push({ agentId: pilot.agent_id, email: agent.email, success: false, error: 'Email send failed' })
          failedCount++
        }
      } catch (emailError) {
        const errorMessage = emailError instanceof Error ? emailError.message : String(emailError)
        logger.error(`Error sending trial CTA email to ${agent.email}:`, emailError)
        results.push({ agentId: pilot.agent_id, email: agent.email, success: false, error: errorMessage })
        failedCount++
      }
    }

    return NextResponse.json({
      success: true,
      message: `Pilot trial CTA emails processed: ${sentCount} sent, ${failedCount} failed`,
      sent: sentCount,
      failed: failedCount,
      results
    })

  } catch (error) {
    logger.error('❌ Pilot trial CTA cron job error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Pilot trial CTA cron job failed' },
      { status: 500 }
    )
  }
}

// Allow GET for health checks
export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Pilot trial CTA cron endpoint',
    method: 'POST',
    description: 'Sends trial CTA emails to pilots 48h after aha_moment stage'
  })
}
