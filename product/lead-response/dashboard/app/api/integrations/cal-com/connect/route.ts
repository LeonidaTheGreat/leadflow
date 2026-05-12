import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer as supabase } from '@/lib/supabase-server'
import { auth } from '@/lib/services/AuthService'
import { logger } from '@/lib/logger'

// Store Cal.com link
export async function POST(request: NextRequest) {
  const { user } = await auth(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const agentId = user.id

  try {
    const { calcomLink } = await request.json()

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
  const { user } = await auth(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const agentId = user.id

  try {

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