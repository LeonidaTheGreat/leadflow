/**
 * TASK SPEC (7f073104-06e5-4076-8bf7-d160f6dfef7a)
 * What:
 * - Update `product/lead-response/dashboard/app/api/admin/gtm-status/route.ts`:
 *   - Include non-resolved action items (not only `WAITING`) in blocker evaluation.
 *   - Mark GTM execution as `blocked` when outreach targets exist but zero have been contacted while pending action items remain.
 *   - Return a blocker summary that explicitly calls out stalled pilot outreach and required owner action.
 * - Add focused API-route tests in `product/lead-response/dashboard/__tests__/gtm-status-route.test.ts`.
 *
 * Verify:
 * - Run `cd product/lead-response/dashboard && npm test -- --runInBand __tests__/gtm-status-route.test.ts`.
 * - Run `npm test` at repo root.
 * - Run `cd product/lead-response/dashboard && npm run build`.
 *
 * Boundaries:
 * - Do not modify outreach blast endpoints, campaign CRUD routes, or DB schema/migrations.
 * - Do not change unrelated admin UI routes/components outside GTM status behavior.
 * - Do not alter protected auto-generated docs/config files.
 */
import { NextRequest, NextResponse } from 'next/server'
import { isAdminUser } from '@/lib/services/AuthService'
import { postgrestAdmin } from '@/lib/db'
import { checkSmsDeliveryHealth, getA2pRegistrationStatus } from '@/lib/sms-delivery-monitor'
import { logger } from '@/lib/logger'

type ActionItem = {
  id: string
  title: string
  type: string
  priority: number
  status: string
  awaiting_input: string | null
  action_needed: string | null
  created_at: string
}

function deriveExecutionStatus(input: {
  targetCount: number
  contactedCount: number
  pilotCount: number
  pendingActionItems: number
  outreachBlocked: boolean
  a2pStatus: 'registered' | 'pending' | 'not_started' | 'unknown'
}): 'not_started' | 'blocked' | 'in_progress' | 'ready_to_scale' {
  if (input.targetCount === 0 && input.contactedCount === 0 && input.pilotCount === 0) {
    return input.pendingActionItems > 0 ? 'blocked' : 'not_started'
  }

  if (input.outreachBlocked) {
    return 'blocked'
  }

  if (input.a2pStatus === 'not_started' && input.pilotCount === 0) {
    return 'blocked'
  }

  if (input.pilotCount >= 3 && input.contactedCount >= 10) {
    return 'ready_to_scale'
  }

  return 'in_progress'
}

function computeCompletionPercent(input: {
  targetCount: number
  contactedCount: number
  pilotCount: number
  a2pStatus: 'registered' | 'pending' | 'not_started' | 'unknown'
}): number {
  let percent = 0

  if (input.targetCount > 0) percent += 25
  if (input.contactedCount > 0) percent += 30
  if (input.pilotCount > 0) percent += 30
  if (input.a2pStatus === 'pending' || input.a2pStatus === 'registered') percent += 10
  if (input.a2pStatus === 'registered') percent += 5

  return Math.min(percent, 100)
}

function isActionItemPending(item: ActionItem): boolean {
  const status = String(item.status || '').trim().toLowerCase()
  return status !== 'resolved' && status !== 'closed' && status !== 'done'
}

export async function GET(request: NextRequest) {
  try {
    if (!await isAdminUser(request)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const [
      campaignsResult,
      targetsResult,
      invitesResult,
      verifiedAgentsResult,
      pilotsResult,
      actionItemsResult,
      deliveryHealth,
    ] = await Promise.all([
      postgrestAdmin
        .from('pilot_recruitment_campaigns')
        .select('id,name,status,goal_count,start_date,end_date,created_at')
        .order('created_at', { ascending: false }),
      postgrestAdmin
        .from('pilot_recruitment_targets')
        .select('id,campaign_id,status,source_channel,created_at'),
      postgrestAdmin
        .from('pilot_invites')
        .select('id,agent_id,status,invited_at'),
      postgrestAdmin
        .from('real_estate_agents')
        .select('id,email_verified,plan_tier,onboarding_completed')
        .eq('email_verified', true),
      postgrestAdmin
        .from('pilot_progress')
        .select('id,agent_id,stage,stuck_since,stage_entered_at'),
      postgrestAdmin
        .from('action_items')
        .select('id,title,type,priority,status,awaiting_input,action_needed,created_at')
        .order('priority', { ascending: true })
        .limit(20),
      checkSmsDeliveryHealth(),
    ])

    if (campaignsResult.error) throw campaignsResult.error
    if (targetsResult.error) throw targetsResult.error
    if (invitesResult.error) throw invitesResult.error
    if (verifiedAgentsResult.error) throw verifiedAgentsResult.error
    if (pilotsResult.error) throw pilotsResult.error

    const a2pRegistration = getA2pRegistrationStatus()

    const campaigns = campaignsResult.data || []
    const targets = targetsResult.data || []
    const invites = invitesResult.data || []
    const verifiedAgents = verifiedAgentsResult.data || []
    const pilots = pilotsResult.data || []
    const pendingActionItemsRaw = (actionItemsResult.error ? [] : actionItemsResult.data || []) as ActionItem[]
    const pendingActionItems = pendingActionItemsRaw.filter(isActionItemPending).slice(0, 5)

    const activeCampaign =
      campaigns.find((campaign: any) => campaign.status === 'active') ||
      campaigns[0] ||
      null

    const activeCampaignTargets = activeCampaign
      ? targets.filter((target: any) => target.campaign_id === activeCampaign.id)
      : targets

    const contactedStatuses = new Set(['contacted', 'responded', 'scheduled', 'signed_up'])
    const targetedAgentIds = new Set(invites.map((invite: any) => invite.agent_id).filter(Boolean))
    const byChannel: Record<string, number> = {}

    for (const target of activeCampaignTargets) {
      byChannel[target.source_channel] = (byChannel[target.source_channel] || 0) + 1
    }

    const targetCount = activeCampaignTargets.length
    const contactedCount = activeCampaignTargets.filter((target: any) => contactedStatuses.has(target.status)).length
    const signedUpCount = activeCampaignTargets.filter((target: any) => target.status === 'signed_up').length
    const verifiedCount = verifiedAgents.length
    const uncontactedVerifiedCount = verifiedAgents.filter((agent: any) => !targetedAgentIds.has(agent.id)).length
    const pilotCount = pilots.length
    const stuckPilotCount = pilots.filter((pilot: any) => pilot.stuck_since).length
    const outreachBlocked = targetCount > 0 && contactedCount === 0 && pendingActionItems.length > 0

    const executionStatus = deriveExecutionStatus({
      targetCount,
      contactedCount,
      pilotCount,
      pendingActionItems: pendingActionItems.length,
      outreachBlocked,
      a2pStatus: a2pRegistration.status })

    return NextResponse.json({
      success: true,
      execution: {
        status: executionStatus,
        completionPercent: computeCompletionPercent({
          targetCount,
          contactedCount,
          pilotCount,
          a2pStatus: a2pRegistration.status }),
        summary:
          executionStatus === 'not_started'
            ? 'No GTM execution has started yet. Add recruitment targets, begin outreach, and start A2P registration.'
            : executionStatus === 'blocked'
              ? outreachBlocked
                ? 'Pilot outreach has not happened yet: targets exist but zero have been contacted. Stojan action is required immediately.'
                : 'GTM work exists but execution is blocked by pending approvals or A2P compliance.'
              : executionStatus === 'ready_to_scale'
                ? 'Pilot recruitment is active and ready to scale into broader distribution.'
                : 'GTM execution is underway. Keep outreach, onboarding, and compliance moving in parallel.' },
      recruitment: {
        activeCampaign,
        targetCount,
        contactedCount,
        signedUpCount,
        byChannel },
      outreach: {
        verifiedCount,
        uncontactedVerifiedCount,
        inviteCount: invites.length,
        pilotPlanCount: verifiedAgents.filter((agent: any) => agent.plan_tier === 'pilot').length },
      pilots: {
        total: pilotCount,
        stuckCount: stuckPilotCount,
        paidCount: pilots.filter((pilot: any) => pilot.stage === 'paid').length },
      a2p: {
        registration: a2pRegistration,
        delivery: deliveryHealth },
      actionItems: pendingActionItems })
  } catch (error: any) {
    logger.error('[gtm-status] Error:', error.message)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to load GTM execution status' },
      { status: 500 }
    )
  }
}
