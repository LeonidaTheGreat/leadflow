import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer as supabase } from '@/lib/supabase-server'

const FUB_API_BASE = 'https://api.followupboss.com/v1'

/**
 * Register LeadFlow webhook subscriptions with FUB.
 * Subscribes to new_person and updated_contact events so FUB pushes
 * new leads and contact updates to our webhook endpoint.
 *
 * @param apiKey - The agent's FUB API key
 * @param webhookUrl - The LeadFlow webhook URL to register
 * @returns Object with success flag and any error details
 */
async function registerFubWebhooks(
  apiKey: string,
  webhookUrl: string
): Promise<{ success: boolean; subscriptions?: any[]; error?: string }> {
  const basicAuth = Buffer.from(`${apiKey}:`).toString('base64')
  const headers = {
    'Authorization': `Basic ${basicAuth}`,
    'Content-Type': 'application/json',
  }

  const eventsToSubscribe = ['new_person', 'updated_contact']
  const subscriptions: any[] = []

  for (const event of eventsToSubscribe) {
    try {
      const response = await fetch(`${FUB_API_BASE}/events/subscriptions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          uri: webhookUrl,
          event,
        }),
      })

      const responseText = await response.text()

      if (!response.ok) {
        // 409 Conflict means already registered — treat as success
        if (response.status === 409) {
          console.log(`ℹ️  FUB webhook already registered for event: ${event}`)
          subscriptions.push({ event, status: 'already_registered' })
        } else {
          console.error(`❌ FUB webhook registration failed for ${event}:`, response.status, responseText)
          return {
            success: false,
            error: `Failed to register webhook for event "${event}": ${response.status} ${responseText}`,
          }
        }
      } else {
        let data: any
        try {
          data = JSON.parse(responseText)
        } catch {
          data = { raw: responseText }
        }
        console.log(`✅ FUB webhook registered for event: ${event}`, data)
        subscriptions.push({ event, status: 'registered', id: data?.id })
      }
    } catch (err: any) {
      console.error(`❌ FUB webhook registration network error for ${event}:`, err.message)
      return { success: false, error: `Network error registering webhook: ${err.message}` }
    }
  }

  return { success: true, subscriptions }
}

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
    const verifyResponse = await fetch(`${FUB_API_BASE}/users`, {
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

    // Register LeadFlow webhook with FUB so it pushes lead events to us
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://leadflow-ai-five.vercel.app'
    const webhookUrl = `${appUrl}/api/webhook/fub`

    const webhookResult = await registerFubWebhooks(apiKey, webhookUrl)

    if (!webhookResult.success) {
      // Webhook registration failed — the API key was stored but the webhook
      // was not registered. Log the error but still return a partial success
      // so the agent is not blocked from completing onboarding. A background
      // job or manual retry can re-register later.
      console.error('⚠️  FUB webhook registration failed (API key stored):', webhookResult.error)
      return NextResponse.json({
        valid: true,
        message: 'FUB connected successfully, but webhook registration failed. Lead events may not arrive automatically.',
        webhook_registered: false,
        webhook_error: webhookResult.error,
      })
    }

    return NextResponse.json({
      valid: true,
      message: 'FUB connected successfully',
      webhook_registered: true,
      webhook_subscriptions: webhookResult.subscriptions,
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
