/**
 * PATCH /api/agents/satisfaction-ping
 * Toggle satisfaction ping enabled/disabled for an agent
 * 
 * Body: { agentId: string, enabled: boolean }
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { agentId, enabled } = body

    if (!agentId) {
      return NextResponse.json({ error: 'agentId is required' }, { status: 400 })
    }
    if (typeof enabled !== 'boolean') {
      return NextResponse.json({ error: 'enabled must be a boolean' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('agents')
      .update({
        satisfaction_ping_enabled: enabled,
        updated_at: new Date().toISOString(),
      })
      .eq('id', agentId)
      .select('id, satisfaction_ping_enabled')
      .single()

    if (error) {
      console.error('❌ Error updating satisfaction_ping_enabled:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log(`✅ Agent ${agentId} satisfaction ping ${enabled ? 'enabled' : 'disabled'}`)

    return NextResponse.json({
      success: true,
      agentId: data.id,
      satisfactionPingEnabled: data.satisfaction_ping_enabled,
    })
  } catch (error: any) {
    console.error('❌ /api/agents/satisfaction-ping error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get('agentId')

    if (!agentId) {
      return NextResponse.json({ error: 'agentId is required' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('agents')
      .select('id, satisfaction_ping_enabled')
      .eq('id', agentId)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      agentId: data.id,
      satisfactionPingEnabled: data.satisfaction_ping_enabled ?? true,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
