/**
 * POST /api/test-lead
 *
 * Sends a test lead through the real SMS pipeline so agents can verify
 * their setup works end-to-end (AI qualification → Twilio SMS).
 *
 * Constructs a FUB-format webhook payload and forwards it to the
 * internal /api/webhook/fub handler. If FUB_WEBHOOK_SECRET is set,
 * the request is signed with an HMAC-SHA256 signature so the handler
 * accepts it.
 *
 * Body:  { phoneNumber: string }
 * Returns: { success: true, message: string }
 */

import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUserId } from '@/lib/services/AuthService'
import { supabaseAdmin } from '@/lib/db'
import type { FubWebhookPayload } from '@/lib/types'
import { logger } from '@/lib/logger'

const TEST_LEAD_FIRST_NAME = 'Test'
const TEST_LEAD_LAST_NAME = 'Lead'
const TEST_LEAD_SOURCE = 'test_pipeline'
// Synthetic FUB person ID — large enough to never collide with real records
const TEST_LEAD_FUB_ID = 999999999

function buildTestPayload(phoneNumber: string): FubWebhookPayload {
  return {
    event: 'peopleCreated',
    data: {
      id: String(TEST_LEAD_FUB_ID),
      firstName: TEST_LEAD_FIRST_NAME,
      lastName: TEST_LEAD_LAST_NAME,
      phoneNumber,
      phones: [{ value: phoneNumber, type: 'mobile', isPrimary: 1 }],
      source: TEST_LEAD_SOURCE,
      status: 'New Lead',
      consents: { sms: true, email: false } } }
}

function signPayload(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex')
}

function getWebhookUrl(): string {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://leadflow-ai-five.vercel.app').trim()
  return `${appUrl}/api/webhook/fub`
}

export async function POST(request: NextRequest) {
  // Require authentication — same pattern as /api/demo/run
  const agentId = await getAuthUserId(request)
  if (!agentId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  // Parse body
  let body: { phoneNumber?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const rawPhone = body.phoneNumber
  if (!rawPhone || typeof rawPhone !== 'string' || !rawPhone.trim()) {
    return NextResponse.json({ error: 'phoneNumber is required' }, { status: 400 })
  }

  const phoneNumber = rawPhone.trim()

  // Validate basic phone format — must start with + and have digits
  if (!/^\+\d{7,15}$/.test(phoneNumber)) {
    return NextResponse.json(
      { error: 'Invalid phone number. Use E.164 format: +14165551234' },
      { status: 400 }
    )
  }

  // Fetch the agent's name for logging
  const { data: agent } = await supabaseAdmin
    .from('real_estate_agents')
    .select('id, email')
    .eq('id', agentId)
    .single()

  if (!agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
  }

  // Build FUB-format payload
  const payload = buildTestPayload(phoneNumber)
  const payloadStr = JSON.stringify(payload)

  // Prepare request headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-test-lead': 'true' }

  // Sign if webhook secret is configured
  const webhookSecret = process.env.FUB_WEBHOOK_SECRET
  if (webhookSecret) {
    headers['x-signature'] = signPayload(payloadStr, webhookSecret)
  }

  // Forward to internal webhook handler
  const webhookUrl = getWebhookUrl()

  let webhookResponse: Response
  try {
    webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers,
      body: payloadStr })
  } catch (err: any) {
    logger.error('[test-lead] Failed to reach webhook endpoint:', err?.message)
    return NextResponse.json(
      { error: 'Could not reach the webhook endpoint. Check NEXT_PUBLIC_APP_URL.' },
      { status: 502 }
    )
  }

  if (!webhookResponse.ok) {
    let detail = ''
    try {
      const errBody = await webhookResponse.json()
      detail = errBody.error || JSON.stringify(errBody)
    } catch {
      detail = await webhookResponse.text().catch(() => String(webhookResponse.status))
    }
    logger.error(`[test-lead] Webhook returned ${webhookResponse.status}:`, detail)
    return NextResponse.json(
      { error: `Pipeline error (${webhookResponse.status}): ${detail}` },
      { status: 502 }
    )
  }

  logger.info(`[test-lead] Pipeline triggered for agent=${agent.email} phone=${phoneNumber}`)

  return NextResponse.json({
    success: true,
    message: 'Test lead sent — you should receive an SMS shortly' })
}
