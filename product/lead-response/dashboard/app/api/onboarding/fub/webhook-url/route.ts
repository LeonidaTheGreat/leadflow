import { NextRequest, NextResponse } from 'next/server'
import { getAuthUserId } from '@/lib/services/AuthService'

/**
 * GET /api/onboarding/fub/webhook-url
 *
 * Returns the agent-specific webhook URL for FUB configuration.
 * The agent pastes this URL in FUB → Admin → Webhooks → Add Webhook.
 *
 * Returns: { url: string }
 */
export async function GET(request: NextRequest) {
  const agentId = await getAuthUserId(request)
  if (!agentId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const baseUrl = 'https://api.imagineapi.org'
  const webhookUrl = `${baseUrl}/webhooks/fub/${agentId}`

  return NextResponse.json({ url: webhookUrl })
}
