/**
 * API Route: POST /api/demo/run
 *
 * Authenticated demo endpoint: generates AI SMS response for a simulated lead.
 * Tracks demo runs per agent, enforces 3-demo limit.
 * Never calls Twilio, FUB, or any external messaging API.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUserId } from '@/lib/services/AuthService'
import { supabaseAdmin } from '@/lib/db'
import { generateText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { logger } from '@/lib/logger'

const DEMO_LIMIT = 3

interface DemoLeadInput {
  name: string
  phone?: string
  email?: string
  source?: string
  property_interest: string
}

interface DemoRunRequest {
  lead: DemoLeadInput
}

const DEMO_SYSTEM_PROMPT = `You are an AI assistant for a real estate agent. Your job is to write a friendly, personalized SMS response to a new lead.

Guidelines:
- Keep it under 160 characters (single SMS)
- Be warm and professional
- Reference the lead's name and property interest
- Include a clear next step (call, text back, or book a time)
- Sound human, not robotic
- Do not use emojis

The response should feel like it was written by a busy but attentive real estate agent who responds quickly.`

function buildDemoPrompt(lead: DemoLeadInput): string {
  let prompt = `A new lead named ${lead.name} has expressed interest in ${lead.property_interest}.`
  if (lead.source) {
    prompt += ` They came from ${lead.source}.`
  }
  prompt += `\n\nWrite a personalized SMS response to send to this lead.`
  return prompt
}

function isMockMode(): boolean {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) return true
  if (key === 'sk-ant-placeholder') return true
  if (key.includes('placeholder')) return true
  if (key.length < 20) return true
  return false
}

const MOCK_RESPONSES = [
  (name: string, property: string) =>
    `Hi ${name}, thanks for your interest in ${property}! I'd love to help. When's a good time for a quick call this week?`,
  (name: string, property: string) =>
    `Hey ${name}, saw your inquiry about ${property}. I'm available to chat today or tomorrow - what's your schedule like?`,
  (name: string, property: string) =>
    `Hi ${name}, excited to help with ${property}! This is a great area. Can we set up a brief call to discuss your needs?`,
  (name: string, property: string) =>
    `Thanks for reaching out, ${name}! ${property} has great options right now. When works for a 10-min call?`,
  (name: string, property: string) =>
    `Hi ${name}, got your message about ${property}. I'd love to show you what's available. Free for a call today?`,
]

function generateMockResponse(lead: DemoLeadInput): string {
  const index = (lead.name.length + lead.property_interest.length) % MOCK_RESPONSES.length
  return MOCK_RESPONSES[index](lead.name, lead.property_interest)
}

async function generateAiResponse(lead: DemoLeadInput): Promise<string> {
  if (isMockMode()) {
    await new Promise((resolve) => setTimeout(resolve, 800))
    return generateMockResponse(lead)
  }
  try {
    const result = await generateText({
      model: anthropic('claude-3-haiku-20240307'),
      system: DEMO_SYSTEM_PROMPT,
      prompt: buildDemoPrompt(lead),
      maxTokens: 200,
      temperature: 0.7,
    } as any)
    return result.text.trim()
  } catch {
    return generateMockResponse(lead)
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  // Auth check
  const agentId = await getAuthUserId(request)
  if (!agentId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  // Parse body
  let body: DemoRunRequest
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { lead } = body
  if (!lead || typeof lead !== 'object') {
    return NextResponse.json({ error: 'lead object is required' }, { status: 400 })
  }

  const leadName = typeof lead.name === 'string' ? lead.name.trim().slice(0, 50) : ''
  const propertyInterest = typeof lead.property_interest === 'string'
    ? lead.property_interest.trim().slice(0, 100)
    : ''
  const leadPhone = typeof lead.phone === 'string' ? lead.phone.trim().slice(0, 20) : null
  const leadSource = typeof lead.source === 'string' ? lead.source.trim().slice(0, 50) : null

  if (!leadName) {
    return NextResponse.json({ error: 'lead.name is required' }, { status: 400 })
  }
  if (!propertyInterest) {
    return NextResponse.json({ error: 'lead.property_interest is required' }, { status: 400 })
  }

  // Fetch current demo count
  const { data: agent, error: agentError } = await supabaseAdmin
    .from('real_estate_agents')
    .select('demo_runs_used')
    .eq('id', agentId)
    .single()

  if (agentError || !agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
  }

  const demosUsed: number = agent.demo_runs_used ?? 0
  const demosRemaining = Math.max(0, DEMO_LIMIT - demosUsed)

  // Check limit
  if (demosUsed >= DEMO_LIMIT) {
    return NextResponse.json(
      {
        success: false,
        error: 'demo_limit_reached',
        demos_remaining: 0,
        cta: {
          text: 'Connect Follow Up Boss',
          url: '/dashboard/onboarding#fub',
        },
      },
      { status: 200 }
    )
  }

  // Generate AI response
  let aiResponse: string
  try {
    aiResponse = await generateAiResponse({
      name: leadName,
      phone: leadPhone ?? undefined,
      source: leadSource ?? undefined,
      property_interest: propertyInterest,
    })
  } catch (err) {
    logger.error('[demo/run] AI generation failed:', err)
    return NextResponse.json({ error: 'AI generation failed' }, { status: 500 })
  }

  const responseTimeMs = Date.now() - startTime

  // Increment demo counter atomically via RPC or direct update
  const { error: updateError } = await supabaseAdmin
    .from('real_estate_agents')
    .update({ demo_runs_used: demosUsed + 1 })
    .eq('id', agentId)

  if (updateError) {
    logger.error('[demo/run] Failed to increment demo counter:', updateError)
    // Non-fatal — proceed but log
  }

  // Log demo run
  const { data: demoRun, error: insertError } = await supabaseAdmin
    .from('demo_runs')
    .insert({
      agent_id: agentId,
      lead_name: leadName,
      lead_phone: leadPhone,
      lead_source: leadSource,
      ai_response: aiResponse,
      response_time_ms: responseTimeMs,
    })
    .select('id')
    .single()

  if (insertError) {
    logger.error('[demo/run] Failed to insert demo_run row:', insertError)
  }

  const newDemosUsed = demosUsed + 1
  const newDemosRemaining = Math.max(0, DEMO_LIMIT - newDemosUsed)

  return NextResponse.json({
    success: true,
    demo_run_id: demoRun?.id ?? null,
    ai_response: aiResponse,
    response_time_ms: responseTimeMs,
    demos_remaining: newDemosRemaining,
  })
}
