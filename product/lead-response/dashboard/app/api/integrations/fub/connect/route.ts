import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer as supabase } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const { apiKey } = await request.json()
    const agentId = request.headers.get('x-agent-id') || 'test-agent-id'

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key is required' },
        { status: 400 }
      )
    }

    // Verify the API key with FUB
    const verifyResponse = await fetch('https://api.followupboss.com/v1/users', {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
    })

    if (!verifyResponse.ok) {
      return NextResponse.json(
        { valid: false, message: 'Invalid API key' },
        { status: 401 }
      )
    }

    // Store the API key (encrypted in production)
    const { error } = await supabase
      .from('agent_integrations')
      .upsert({
        agent_id: agentId,
        fub_api_key: apiKey,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'agent_id',
      })

    if (error) {
      console.error('FUB connection error:', error)
      return NextResponse.json(
        { error: 'Failed to store API key' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      valid: true,
      message: 'FUB connected successfully',
    })
  } catch (error) {
    console.error('FUB connect error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Disconnect FUB
export async function DELETE(request: NextRequest) {
  try {
    const agentId = request.headers.get('x-agent-id') || 'test-agent-id'

    const { error } = await supabase
      .from('agent_integrations')
      .update({
        fub_api_key: null,
        updated_at: new Date().toISOString(),
      })
      .eq('agent_id', agentId)

    if (error) {
      console.error('FUB disconnect error:', error)
      return NextResponse.json(
        { error: 'Failed to disconnect FUB' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'FUB disconnected successfully',
    })
  } catch (error) {
    console.error('FUB disconnect error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}