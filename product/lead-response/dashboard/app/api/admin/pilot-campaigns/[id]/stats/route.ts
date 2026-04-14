import { NextRequest, NextResponse } from 'next/server'
import { postgrestAdmin } from '@/lib/db'
import { logger } from '@/lib/logger'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Get campaign details
    const { data: campaign, error: campaignError } = await postgrestAdmin
      .from('pilot_recruitment_campaigns')
      .select('*')
      .eq('id', id)
      .single()

    if (campaignError) throw campaignError
    if (!campaign) {
      return NextResponse.json(
        { success: false, error: 'Campaign not found' },
        { status: 404 }
      )
    }

    // Get all targets for this campaign
    const { data: targets, error: targetsError } = await postgrestAdmin
      .from('pilot_recruitment_targets')
      .select('*')
      .eq('campaign_id', id)

    if (targetsError) throw targetsError

    // Calculate stats
    const totalTargets = targets?.length || 0
    const signedUp = targets?.filter(t => t.status === 'signed_up').length || 0
    const progress = campaign.goal_count > 0 ? (signedUp / campaign.goal_count) * 100 : 0

    // Status breakdown
    const statusCounts: Record<string, number> = {}
    targets?.forEach(t => {
      statusCounts[t.status] = (statusCounts[t.status] || 0) + 1
    })

    // Channel breakdown
    const channelCounts: Record<string, number> = {}
    targets?.forEach(t => {
      channelCounts[t.source_channel] = (channelCounts[t.source_channel] || 0) + 1
    })

    // Days remaining
    const endDate = new Date(campaign.end_date)
    const today = new Date()
    const daysRemaining = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    return NextResponse.json({
      success: true,
      stats: {
        campaign: {
          name: campaign.name,
          goal: campaign.goal_count,
          start_date: campaign.start_date,
          end_date: campaign.end_date,
          days_remaining: daysRemaining
        },
        progress: {
          signed_up: signedUp,
          total_targets: totalTargets,
          percentage: Math.round(progress * 100) / 100
        },
        by_status: Object.entries(statusCounts).map(([status, count]) => ({ status, count: String(count) })),
        by_channel: Object.entries(channelCounts).map(([source_channel, count]) => ({ source_channel, count: String(count) }))
      }
    })
  } catch (err) {
    logger.error('Error getting campaign stats:', err)
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
