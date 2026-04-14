import { NextRequest, NextResponse } from 'next/server'
import { postgrestAdmin } from '@/lib/db'
import { sendStuckPilotAlert } from '@/lib/telegram-service'
import { logger } from '@/lib/logger'

/**
 * POST /api/cron/pilot-stuck-check
 * Checks for pilots stuck in pilot_progress stages for >24 hours
 * and sends Telegram alerts. This is the CORRECT detection source
 * for white-glove pilot program (not FUB wizard state).
 *
 * A pilot is "stuck" if:
 * - stage != 'paid'
 * - stage_entered_at > 24 hours ago
 * - stuck_since IS NULL (not already alerted)
 *
 * Should be called via Vercel Cron daily at 08:00 UTC
 */
export async function POST(request: NextRequest) {
  try {
    // Verify this is a cron request
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret) {
      const authHeader = request.headers.get('authorization')
      const querySecret = new URL(request.url).searchParams.get('secret')
      const providedSecret = authHeader?.replace('Bearer ', '') || querySecret

      if (providedSecret !== cronSecret) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      }
    }

    logger.info('🔍 Running pilot stuck check...')

    // Find pilots stuck for >24h who haven't been alerted yet
    // Uses pilot_progress table (correct source for white-glove program)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const { data: stuckPilots, error: queryError } = await postgrestAdmin
      .from('pilot_progress')
      .select(`
        id,
        agent_id,
        stage,
        stage_entered_at,
        stuck_since,
        last_contact_at,
        last_contact_type,
        real_estate_agents:agent_id (
          email,
          first_name,
          last_name
        )
      `)
      .neq('stage', 'paid')
      .lt('stage_entered_at', twentyFourHoursAgo)
      .is('stuck_since', null)
      .order('stage_entered_at', { ascending: true })

    if (queryError) {
      logger.error('Error querying stuck pilots:', queryError)
      return NextResponse.json(
        { success: false, error: 'Failed to query stuck pilots' },
        { status: 500 }
      )
    }

    if (!stuckPilots || stuckPilots.length === 0) {
      logger.info('✅ No stuck pilots detected')
      return NextResponse.json({
        success: true,
        message: 'No stuck pilots detected',
        alerted: 0,
        pilots: []
      })
    }

    logger.info(`⚠️ Found ${stuckPilots.length} stuck pilot(s)`)

    const results: Array<{
      agentId: string
      name: string
      stage: string
      hoursStuck: number
      alerted: boolean
      error?: string
    }> = []

    // Process each stuck pilot
    for (const pilot of stuckPilots as any[]) {
      const agent = pilot.real_estate_agents
      const agentName = agent
        ? `${agent.first_name || ''} ${agent.last_name || ''}`.trim() || agent.email
        : 'Unknown Agent'

      const stageEnteredAt = new Date(pilot.stage_entered_at)
      const hoursStuck = Math.round(
        (Date.now() - stageEnteredAt.getTime()) / (1000 * 60 * 60)
      )

      const lastContactAt = pilot.last_contact_at
        ? new Date(pilot.last_contact_at).toLocaleDateString()
        : null

      try {
        // Send Telegram alert
        const alerted = await sendStuckPilotAlert(
          agentName,
          pilot.stage,
          hoursStuck,
          lastContactAt,
          pilot.last_contact_type
        )

        if (alerted) {
          // Mark as alerted by setting stuck_since
          const { error: updateError } = await postgrestAdmin
            .from('pilot_progress')
            .update({
              stuck_since: new Date().toISOString()
            })
            .eq('id', pilot.id)

          if (updateError) {
            logger.error(`Failed to mark pilot ${pilot.id} as stuck:`, updateError)
            results.push({
              agentId: pilot.agent_id,
              name: agentName,
              stage: pilot.stage,
              hoursStuck,
              alerted: false,
              error: 'Failed to update stuck_since'
            })
            continue
          }

          logger.info(`✅ Alert sent for ${agentName} (stuck in ${pilot.stage} for ${hoursStuck}h)`)
          results.push({
            agentId: pilot.agent_id,
            name: agentName,
            stage: pilot.stage,
            hoursStuck,
            alerted: true
          })
        } else {
          logger.warn(`⚠️ Failed to send alert for ${agentName}`)
          results.push({
            agentId: pilot.agent_id,
            name: agentName,
            stage: pilot.stage,
            hoursStuck,
            alerted: false,
            error: 'Telegram send failed'
          })
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        logger.error(`Error processing stuck pilot ${pilot.id}:`, error)
        results.push({
          agentId: pilot.agent_id,
          name: agentName,
          stage: pilot.stage,
          hoursStuck,
          alerted: false,
          error: errorMessage
        })
      }
    }

    const successCount = results.filter(r => r.alerted).length
    const failCount = results.length - successCount

    return NextResponse.json({
      success: true,
      message: `Pilot stuck check complete: ${successCount} alerted, ${failCount} failed`,
      alerted: successCount,
      failed: failCount,
      pilots: results
    })

  } catch (error) {
    logger.error('❌ Pilot stuck check error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Pilot stuck check failed',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

// Allow GET for health checks and manual triggers
export async function GET(request: NextRequest) {
  // Support manual trigger with secret
  const querySecret = new URL(request.url).searchParams.get('secret')
  if (querySecret) {
    return POST(request)
  }

  return NextResponse.json({
    message: 'Pilot stuck check cron endpoint',
    method: 'POST',
    description: 'Checks for pilots stuck in pilot_progress stages for >24h and sends Telegram alerts'
  })
}
