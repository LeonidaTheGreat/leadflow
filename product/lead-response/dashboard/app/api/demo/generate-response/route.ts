/**
 * API Route: POST /api/demo/generate-response
 *
 * Generates an AI SMS response for the Live AI Demo.
 * No authentication required - publicly accessible.
 */

import { NextRequest, NextResponse } from 'next/server'
import { generateText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'

interface DemoRequest {
  leadName: string
  propertyInterest: string
  leadSource?: string
}

// Demo-specific AI prompt for generating realistic SMS responses
const DEMO_SYSTEM_PROMPT = `You are an AI assistant for a real estate agent. Your job is to write a friendly, personalized SMS response to a new lead.

Guidelines:
- Keep it under 160 characters (single SMS)
- Be warm and professional
- Reference the lead's name and property interest
- Include a clear next step (call, text back, or book a time)
- Sound human, not robotic
- Do not use emojis

The response should feel like it was written by a busy but attentive real estate agent who responds quickly.`

function buildDemoPrompt(data: DemoRequest): string {
  const { leadName, propertyInterest, leadSource } = data
  
  let prompt = `A new lead named ${leadName} has expressed interest in ${propertyInterest}.`
  
  if (leadSource) {
    prompt += ` They came from ${leadSource}.`
  }
  
  prompt += `\n\nWrite a personalized SMS response to send to this lead.`
  
  return prompt
}

// Check if we're in mock mode (no valid API key)
function isMockMode(): boolean {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) return true
  if (key === 'sk-ant-placeholder') return true
  if (key.includes('placeholder')) return true
  if (key.length < 20) return true
  return false
}

// Generate mock response for demo when API key is not available
function generateMockResponse(data: DemoRequest): string {
  const { leadName, propertyInterest } = data
  
  const mockResponses = [
    `Hi ${leadName}, thanks for your interest in ${propertyInterest}! I'd love to help you explore your options. When's a good time for a quick call this week?`,
    `Hey ${leadName}, saw your inquiry about ${propertyInterest}. I'm available to chat today or tomorrow - what's your schedule like?`,
    `Hi ${leadName}, excited to help with ${propertyInterest}! This is a great area. Can we set up a brief call to discuss what you're looking for?`,
    `Thanks for reaching out, ${leadName}! ${propertyInterest} has some fantastic options right now. When works for a 10-minute call to learn more about your needs?`,
    `Hi ${leadName}, I received your message about ${propertyInterest}. I'd love to show you what's available. Are you free for a call this afternoon or tomorrow?`,
  ]
  
  // Deterministic selection based on lead name length + property interest length
  const index = (leadName.length + propertyInterest.length) % mockResponses.length
  return mockResponses[index]
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    let body: DemoRequest
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      )
    }

    const { leadName, propertyInterest, leadSource } = body

    // Validation
    if (!leadName || typeof leadName !== 'string' || leadName.trim().length === 0) {
      return NextResponse.json(
        { error: 'Lead name is required' },
        { status: 400 }
      )
    }

    if (!propertyInterest || typeof propertyInterest !== 'string' || propertyInterest.trim().length === 0) {
      return NextResponse.json(
        { error: 'Property interest is required' },
        { status: 400 }
      )
    }

    // Sanitize inputs (basic)
    const sanitizedName = leadName.trim().slice(0, 50)
    const sanitizedProperty = propertyInterest.trim().slice(0, 100)
    const sanitizedSource = leadSource?.trim().slice(0, 50)

    let responseText: string
    let usedMockMode = false

    if (isMockMode()) {
      // Use mock response when API key is not available
      responseText = generateMockResponse({
        leadName: sanitizedName,
        propertyInterest: sanitizedProperty,
        leadSource: sanitizedSource,
      })
      usedMockMode = true
      
      // Add small delay to simulate AI processing
      await new Promise(resolve => setTimeout(resolve, 800))
    } else {
      // Call Claude API
      try {
        const result = await generateText({
          model: anthropic('claude-3-haiku-20240307'),
          system: DEMO_SYSTEM_PROMPT,
          prompt: buildDemoPrompt({
            leadName: sanitizedName,
            propertyInterest: sanitizedProperty,
            leadSource: sanitizedSource,
          }),
          maxTokens: 200,
          temperature: 0.7,
        } as any)
        
        responseText = result.text.trim()
      } catch (aiError) {
        console.error('[demo] AI generation failed:', aiError)
        // Fallback to mock response on AI error
        responseText = generateMockResponse({
          leadName: sanitizedName,
          propertyInterest: sanitizedProperty,
          leadSource: sanitizedSource,
        })
        usedMockMode = true
      }
    }

    const responseTimeMs = Date.now() - startTime

    return NextResponse.json({
      response: responseText,
      responseTimeMs,
      usedMockMode,
      personalization: {
        leadName: sanitizedName,
        propertyInterest: sanitizedProperty,
        leadSource: sanitizedSource,
      },
    })
  } catch (error) {
    console.error('[demo] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
