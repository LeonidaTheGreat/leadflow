import { NextRequest, NextResponse } from 'next/server'
import { logEvent } from '@/lib/supabase'
import { verifyWebhookSignature } from '@/lib/fub'
import {
  handleLeadCreated,
  handleLeadUpdated,
  handleStatusChanged,
  handleLeadAssigned,
} from '@/lib/services/fub-webhook-service'
import type { FubWebhookPayload } from '@/lib/types'

// Force dynamic rendering - webhook must handle runtime requests
export const dynamic = 'force-dynamic'

// ============================================
// FUB WEBHOOK HANDLER
// ============================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('x-signature')
    const secret = process.env.FUB_WEBHOOK_SECRET

    // Verify webhook signature if secret is configured
    if (secret && signature) {
      const isValid = verifyWebhookSignature(body, signature, secret)
      if (!isValid) {
        console.error('❌ Invalid FUB webhook signature')
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    const payload: FubWebhookPayload = JSON.parse(body)
    console.log('📨 FUB Webhook received:', payload.event)

    // Log the event
    await logEvent({
      event_type: `fub_${payload.event}`,
      event_data: payload.data,
      source: 'fub_webhook',
    })

    // Handle the event
    switch (payload.event) {
      case 'lead.created':
      case 'peopleCreated':
        return await handleLeadCreated(payload.data, payload.resourceIds, payload.uri)

      case 'lead.updated':
      case 'peopleUpdated':
        return await handleLeadUpdated(payload.data, payload.resourceIds, payload.uri)

      case 'lead.status_changed':
      case 'peopleStageUpdated':
        return await handleStatusChanged(payload.data, payload.resourceIds, payload.uri)

      case 'lead.assigned':
        return await handleLeadAssigned(payload.data)

      default:
        console.log('Unhandled FUB event:', payload.event)
        return NextResponse.json({ received: true, handled: false, event: payload.event })
    }
  } catch (error: any) {
    console.error('❌ FUB webhook error:', error)
    console.error('Error stack:', error.stack)

    try {
      await logEvent({
        event_type: 'fub_webhook_error',
        event_data: { error: error.message, stack: error.stack },
        source: 'fub_webhook',
      })
    } catch (logError) {
      console.error('Failed to log error:', logError)
    }

    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
