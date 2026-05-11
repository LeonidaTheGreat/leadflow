import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer as supabase } from '@/lib/supabase-server'
import { canUseCalcom } from '@/lib/feature-gates'
import { logger } from '@/lib/logger'

async function getAgentTier(agentId: string): Promise<string> {
  try {
    const { data } = await supabase
      .from('real_estate_agents')
      .select('plan_tier')
      .eq('id', agentId)
      .limit(1)
      .single()
    return (data as any)?.plan_tier ?? 'starter'
  } catch {
    return 'starter'
  }
}

// Store Cal.com link
export async function POST(request: NextRequest) {
  try {
    const { calcomLink } = await request.json()
    const agentId = request.headers.get('x-agent-id') || 'test-agent-id'

    const tier = await getAgentTier(agentId)
    const gate = canUseCalcom(tier)
    if (!gate.allowed) {
      return NextResponse.json(
        { error: gate.message, requiredTier: gate.requiredTier, upgradeUrl: '/pricing' },
        { status: 403 }
      )
    }

    if (!calcomLink) {
      return NextResponse.json(
        { error: 'Cal.com link is required' },
        { status: 400 }
      )
    }

    // Validate format
    if (!calcomLink.includes('cal.com') && !calcomLink.includes('cal.dev')) {
      return NextResponse.json(
        { valid: false, message: 'Invalid Cal.com URL format' },
        { status: 400 }
      )
    }

    // Store the link
    const { error } = await supabase
      .from('agent_integrations')
      .upsert({
        agent_id: agentId,
        cal_com_link: calcomLink,
        updated_at: new Date().toISOString() }, {
        onConflict: 'agent_id' })

    if (error) {
      logger.error('Cal.com connection error:', error)
      return NextResponse.json(
        { error: 'Failed to store Cal.com link' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      valid: true,
      message: 'Cal.com connected successfully' })
  } catch (error) {
    logger.error('Cal.com connect error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Disconnect Cal.com
export async function DELETE(request: NextRequest) {
  try {
    const agentId = request.headers.get('x-agent-id') || 'test-agent-id'

    const tier = await getAgentTier(agentId)
    const gate = canUseCalcom(tier)
    if (!gate.allowed) {
      return NextResponse.json(
        { error: gate.message, requiredTier: gate.requiredTier, upgradeUrl: '/pricing' },
        { status: 403 }
      )
    }

    const { error } = await supabase
      .from('agent_integrations')
      .update({
        cal_com_link: null,
        updated_at: new Date().toISOString() })
      .eq('agent_id', agentId)

    if (error) {
      logger.error('Cal.com disconnect error:', error)
      return NextResponse.json(
        { error: 'Failed to disconnect Cal.com' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Cal.com disconnected successfully' })
  } catch (error) {
    logger.error('Cal.com disconnect error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}