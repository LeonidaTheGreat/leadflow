import { anthropic } from '@ai-sdk/anthropic'
import { createOpenAI } from '@ai-sdk/openai'
import { generateObject, generateText } from 'ai'
import { z } from 'zod'
import type { 
  QualificationInput, 
  AiQualificationResult, 
  AiSmsResponse,
  Lead,
  Agent,
  Market 
} from '@/lib/types'

// ============================================
// AI TIMEOUT WRAPPER
// ============================================

/**
 * Wrap a promise with a timeout
 * Throws error if timeout is exceeded
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string = 'Operation'
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => {
        const error = new Error(`${label} timeout after ${timeoutMs}ms`);
        (error as any).code = 'TIMEOUT';
        reject(error);
      }, timeoutMs)
    ),
  ]);
}

// ============================================
// AI QUALIFICATION ENGINE
// ============================================

// Configurable AI model - defaults to Qwen 3.5 local
const AI_PROVIDER = process.env.AI_PROVIDER || 'qwen-local'
const AI_MODEL = process.env.AI_MODEL || 'qwen3.5-14b'
const AI_TIMEOUT_MS = 5000; // 5 second timeout for AI operations

// Qwen local client configuration
const qwenLocal = createOpenAI({
  baseURL: process.env.QWEN_LOCAL_URL || 'http://localhost:11434/v1',
  apiKey: 'ollama', // Ollama doesn't require auth but SDK needs a value
})

// Get the appropriate model client based on configuration
function getModelClient() {
  switch (AI_PROVIDER) {
    case 'anthropic':
      return anthropic(AI_MODEL || 'claude-3-haiku-20240307')
    case 'qwen-local':
    default:
      return qwenLocal(AI_MODEL || 'qwen3.5-14b')
  }
}

// Runtime check for mock mode (not build-time)
function isMockMode(): boolean {
  // Check for Qwen local availability
  if (AI_PROVIDER === 'qwen-local') {
    // Qwen local is always available if the server is running
    return false
  }
  
  // Check for Anthropic
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) return true
  if (key === 'sk-ant-placeholder') return true
  if (key.includes('placeholder')) return true
  if (key.length < 20) return true // Real keys are longer
  return false
}

// Qualification schema for structured output
export const qualificationSchema = z.object({
  intent: z.enum(['buy', 'sell', 'rent', 'info', 'unknown']),
  budget_min: z.number().nullable().describe('Minimum budget in USD/CAD, null if not mentioned'),
  budget_max: z.number().nullable().describe('Maximum budget in USD/CAD, null if not mentioned'),
  timeline: z.enum(['immediate', '1-3months', '3-6months', '6+months', 'unknown']),
  location: z.string().nullable().describe('City, neighborhood, or area of interest'),
  property_type: z.enum(['house', 'condo', 'land', 'commercial', 'unknown']).nullable(),
  bedrooms: z.number().nullable().describe('Number of bedrooms if specified'),
  bathrooms: z.number().nullable().describe('Number of bathrooms if specified'),
  square_feet: z.number().nullable().describe('Minimum square footage if specified'),
  notes: z.string().nullable().describe('Additional context from the lead'),
  confidence_score: z.number().min(0).max(1).describe('Confidence in qualification accuracy'),
  is_qualified: z.boolean().describe('Whether this lead is qualified for immediate response'),
  qualification_reason: z.string().describe('Explanation of qualification decision'),
})

export type QualificationResult = z.infer<typeof qualificationSchema>

// ============================================
// LEAD QUALIFICATION
// ============================================

/**
 * Qualify a lead using Claude 3.5 Sonnet
 * Analyzes lead data to extract intent, budget, timeline, and property preferences
 */
export async function qualifyLead(input: QualificationInput): Promise<AiQualificationResult> {
  // Mock mode: return sensible defaults without calling API
  if (isMockMode()) {
    console.log('🤖 Using mock AI qualification (no API key)')
    return {
      intent: 'buy',
      budget_min: 500000,
      budget_max: 800000,
      timeline: '1-3months',
      location: 'Toronto',
      property_type: 'house',
      bedrooms: 3,
      bathrooms: 2,
      square_feet: null,
      notes: 'Mock qualification - AI API not configured',
      confidence_score: 0.7,
      is_qualified: true,
      qualification_reason: 'Lead provided contact info and expressed interest',
      raw_response: { mock: true },
    }
  }

  const prompt = buildQualificationPrompt(input)

  try {
    const result = await generateObject({
      model: getModelClient(),
      schema: qualificationSchema,
      prompt,
      temperature: 0.2, // Lower temperature for consistent extraction
    })

    return {
      ...result.object,
      raw_response: result.object,
    }
  } catch (error) {
    console.error('❌ AI qualification failed:', error)
    console.log('🤖 Falling back to mock qualification')
    
    // Fallback to mock qualification
    return {
      intent: 'buy',
      budget_min: 500000,
      budget_max: 800000,
      timeline: '1-3months',
      location: 'Toronto',
      property_type: 'house',
      bedrooms: 3,
      bathrooms: 2,
      square_feet: null,
      notes: 'Mock qualification - AI API failed',
      confidence_score: 0.6,
      is_qualified: true,
      qualification_reason: 'Lead provided contact info',
      raw_response: { mock: true, error: String(error) },
    }
  }
}

/**
 * Build the qualification prompt with lead context
 */
function buildQualificationPrompt(input: QualificationInput): string {
  return `You are a real estate lead qualification assistant. Analyze this lead and extract key information.

<lead_data>
Name: ${input.name || 'Not provided'}
Email: ${input.email || 'Not provided'}
Phone: ${input.phone}
Source: ${input.source}
Message/Notes: ${input.message || 'No message provided'}
${input.metadata ? `Additional Metadata: ${JSON.stringify(input.metadata, null, 2)}` : ''}
</lead_data>

<instructions>
Extract and infer the following information:

1. INTENT (buy/sell/rent/info/unknown):
   - "buy": Looking to purchase a property
   - "sell": Looking to sell their property  
   - "rent": Looking to rent/lease
   - "info": Just browsing, requesting general information
   - "unknown": Cannot determine from data

2. BUDGET RANGE:
   - Extract any mentioned price ranges
   - Look for numbers followed by k/thousand, m/million
   - Convert to numeric values (e.g., "500k" → 500000)
   - If range given (e.g., "400-600k"), set min and max accordingly

3. TIMELINE:
   - "immediate": Ready now, ASAP, urgent
   - "1-3months": Soon, within a few months
   - "3-6months": Later this year
   - "6+months": Next year or later
   - "unknown": Not specified

4. LOCATION:
   - City, neighborhood, or area mentioned
   - Be specific if possible (e.g., "Downtown Toronto" vs just "Toronto")

5. PROPERTY TYPE:
   - house, condo, land, commercial, or unknown

6. BEDROOMS/BATHROOMS:
   - Extract if explicitly mentioned
   - Look for patterns like "3 bed", "2 bedroom", "2.5 bath"

<qualification_criteria>
A lead is QUALIFIED if:
- Clear intent (buy/sell/rent) is determined
- Location is specified OR timeline is immediate
- Budget is mentioned OR timeline indicates serious intent

A lead is NOT qualified if:
- Intent is "info" or "unknown"
- Vague inquiry with no specifics
- Appears to be spam or test submission
- No contact information provided
</qualification_criteria>

<output_format>
Provide structured data with confidence_score (0-1) based on:
- 0.9-1.0: Very detailed lead with clear intent, budget, timeline
- 0.7-0.9: Good information, minor details missing
- 0.5-0.7: Some information, could use follow-up
- 0.3-0.5: Limited information, vague inquiry
- 0-0.3: Very little information, likely not serious

Include qualification_reason explaining your decision.
</output_format>
</instructions>`
}

// ============================================
// AI SMS RESPONSE GENERATION
// ============================================

/**
 * Generate AI SMS response based on lead context and trigger type
 */
export async function generateAiSmsResponse(
  lead: Lead,
  agent: Agent,
  options: {
    trigger?: 'initial' | 'followup' | 'status_change' | 'agent_intro' | 'booking_confirmation' | 'inbound_reply' | 'manual';
    previousStatus?: string;
    newStatus?: string;
    customContext?: string;
    inboundMessage?: string;
    conversation?: Array<{ direction: 'inbound' | 'outbound'; message_body: string; created_at: string }>;
  } = {}
): Promise<AiSmsResponse> {
  // Check mock mode
  const mockMode = isMockMode()
  console.log('🤖 AI SMS - Mock mode check:', { mockMode, hasKey: !!process.env.ANTHROPIC_API_KEY, keyLength: process.env.ANTHROPIC_API_KEY?.length || 0 })
  
  // Mock mode: return a default message
  if (mockMode) {
    console.log('🤖 Using mock SMS response (no API key or invalid key)')
    const firstName = (lead.name && lead.name !== 'New Lead') ? lead.name.split(' ')[0] : 'there'
    const agentFirstName = agent.name.split(' ')[0]
    const location = lead.location || 'the area'
    
    let message = ''
    switch (options.trigger) {
      case 'initial':
        message = `Hi ${firstName}, I'm ${agentFirstName}. I saw you're interested in ${location}. I have some great listings to share. Reply YES to see options. Reply STOP to opt out.`
        break
      case 'inbound_reply':
        message = firstName === 'there' 
          ? `Thanks for your reply! I'd be happy to help. What specific features are you looking for? Reply STOP to opt out.`
          : `Thanks for your reply, ${firstName}! I'd be happy to help. What specific features are you looking for? Reply STOP to opt out.`
        break
      default:
        message = `Hi ${firstName}, following up on your interest in ${location}. Let me know if you'd like to schedule a viewing. Reply STOP to opt out.`
    }
    
    return {
      message,
      trigger: options.trigger || 'initial',
      confidence: 0.7,
      suggested_action: 'nurture',
      personalize: true,
    }
  }

  const prompt = buildSmsPrompt(lead, agent, options)

  try {
    const result = await generateObject({
      model: getModelClient(),
      schema: z.object({
        message: z.string().max(320).describe('SMS message, max 320 chars (2 SMS segments)'),
        confidence: z.number().min(0).max(1),
        suggested_action: z.enum(['book', 'nurture', 'handoff', 'discard']).describe('Recommended next action'),
        personalize: z.boolean().describe('Whether message should be personalized'),
      }),
      prompt,
      temperature: 0.7, // Slightly higher for creative but professional responses
    })
    
    // Add compliance footer based on market
    let message = result.object.message
    if (!message.includes('STOP')) {
      message += ' Reply STOP to opt out.'
    }

    return {
      message,
      trigger: options.trigger || 'initial',
      confidence: result.object.confidence,
      suggested_action: result.object.suggested_action,
      personalize: result.object.personalize,
    }
  } catch (error) {
    console.error('❌ AI SMS generation failed:', error)
    // Return error instead of mock to diagnose the issue
    throw error
    
    // Fallback to mock response if API fails
    const firstName = lead.name?.split(' ')[0] || 'there'
    const agentFirstName = agent.name.split(' ')[0]
    const location = lead.location || 'the area'
    
    let message = ''
    switch (options.trigger) {
      case 'initial':
        message = `Hi ${firstName}, I'm ${agentFirstName}. I saw you're interested in ${location}. I have some great listings to share. Reply YES to see options. Reply STOP to opt out.`
        break
      case 'inbound_reply':
        message = `Thanks for your reply, ${firstName}! I'd be happy to help. What specific features are you looking for? Reply STOP to opt out.`
        break
      default:
        message = `Hi ${firstName}, following up on your interest in ${location}. Let me know if you'd like to schedule a viewing. Reply STOP to opt out.`
    }
    
    return {
      message,
      trigger: options.trigger || 'initial',
      confidence: 0.6,
      suggested_action: 'nurture',
      personalize: true,
    }
  }
}

/**
 * Build SMS generation prompt
 */
function buildSmsPrompt(
  lead: Lead,
  agent: Agent,
  options: {
    trigger?: string;
    previousStatus?: string;
    newStatus?: string;
    customContext?: string;
    inboundMessage?: string;
    conversation?: Array<{ direction: 'inbound' | 'outbound'; message_body: string; created_at: string }>;
  }
): string {
  const profession = agent.market === 'ca-ontario' ? 'real estate agent' : 'realtor'
  
  const conversationHistory = options.conversation && options.conversation.length > 0
    ? options.conversation.map(m => `${m.direction === 'inbound' ? 'THEM' : 'YOU'}: ${m.message_body}`).join('\n')
    : 'No previous messages - this is the start of the conversation.'

  const agentFirstName = agent.name.split(' ')[0].toLowerCase()
  const hasIntroduced = options.conversation?.some(m => 
    m.direction === 'outbound' && 
    (m.message_body.toLowerCase().includes("i'm " + agentFirstName) ||
     m.message_body.toLowerCase().includes('this is ' + agentFirstName))
  ) || false

  return `You are ${agent.name}, a ${profession} texting with a potential client. This is a text message conversation - keep it casual, short, and natural like you're texting a friend.

<agent_info>
Name: ${agent.name}
Market: ${agent.market}
Role: ${profession}
</agent_info>

<lead_info>
Name: ${lead.name && lead.name !== 'New Lead' ? lead.name : 'Unknown'}
Location: ${lead.location || 'Not specified'}
Budget: ${lead.budget_min && lead.budget_max ? `$${lead.budget_min.toLocaleString()}-$${lead.budget_max.toLocaleString()}` : lead.budget_min ? `$${lead.budget_min.toLocaleString()}+` : 'Not specified'}
Property Type: ${lead.latest_qualification?.property_type || 'Not specified'}
Bedrooms: ${lead.latest_qualification?.bedrooms || 'Not specified'}
Bathrooms: ${lead.latest_qualification?.bathrooms || 'Not specified'}
Timeline: ${lead.timeline || 'Not specified'}
</lead_info>

<conversation_history>
${conversationHistory}
</conversation_history>

<their_latest_message>
${options.inboundMessage || ''}
</their_latest_message>

<important_rules>
1. READ the conversation history above - don't ask questions they've already answered
2. ${hasIntroduced ? "You've already introduced yourself - don't do it again" : "Introduce yourself naturally on first message only"}
3. NO signatures like "- ${agent.name.split(' ')[0]}" at the end - this is texting, not email
4. Acknowledge what they just said before moving forward
5. If they answered your last question, ask the NEXT question (don't repeat)
6. Keep responses short (under 160 chars ideally)
7. Use casual language: "Hey", "Got it", "Cool", "Nice" 
8. Guide them through qualification: name → location → budget → timeline → show properties
9. Do NOT include "Reply STOP to opt out" - that gets added automatically
10. Use ${agent.market === 'ca-ontario' ? 'Canadian spelling (colour, centre, etc.)' : 'US spelling'}
</important_rules>

<response_examples>
First message (introduce yourself):
"Hey! ${agent.name.split(' ')[0]} here. Thanks for reaching out about buying! I'd love to help. What's your name?"

After they give name:
"Nice to meet you! So what area are you looking to buy in?"

After location:
"Got it! What's your budget range? That'll help me narrow down the best options."

After budget:
"Perfect. What kind of timeline are you on? Looking to buy soon or just exploring?"

When you have all info:
"Awesome, I've got a few places in mind! Want me to send some listings or would you prefer to see them in person?"
</response_examples>

Now respond to their latest message naturally, acknowledging what they said and moving the conversation forward:`
}

/**
 * Get trigger-specific guidelines
 */
function getTriggerGuidelines(trigger: string): string {
  const guidelines: Record<string, string> = {
    initial: '- Sound like a real person texting\n- Ask ONE question at a time\n- If name unknown: ask "What\'s your name?"\n- If name known: ask location or budget\n- Keep it casual and warm',
    followup: '- Reference what they last said\n- Ask the NEXT question in the flow\n- Don\'t repeat questions they already answered',
    status_change: '- Acknowledge status change casually\n- Ask what they want to do next',
    agent_intro: '- Warm, personal introduction\n- "Hey, I\'m [name] and I\'ll be helping you..."',
    booking_confirmation: '- Keep it brief and friendly\n- Show enthusiasm\n- Give them your direct contact',
    inbound_reply: '- Respond like you\'re texting a friend\n- Acknowledge what they said specifically\n- Ask ONE follow-up question to keep going\n- Guide naturally toward qualification\n- Be warm, not robotic',
  }
  return guidelines[trigger] || guidelines.initial
}

// ============================================
// SMART REPLY SUGGESTIONS
// ============================================

/**
 * Generate smart reply suggestions for inbound messages
 */
export async function generateSmartReplies(
  conversation: Array<{ direction: 'inbound' | 'outbound'; message_body: string }>,
  lead: Lead
): Promise<string[]> {
  const lastMessages = conversation.slice(-5) // Last 5 messages for context
  
  const prompt = `Given this conversation with a real estate lead, suggest 3 quick reply options.

<conversation>
${lastMessages.map(m => `${m.direction.toUpperCase()}: ${m.message_body}`).join('\n')}
</conversation>

<lead_context>
Name: ${lead.name || 'Unknown'}
Intent: ${lead.latest_qualification?.intent || 'unknown'}
Status: ${lead.status}
</lead_context>

<requirements>
- Suggest 3 different response approaches
- Each should be 3-8 words max
- Professional but conversational
- Cover different scenarios (scheduling, info, follow-up)
</requirements>

<example_output>
["When works for a call?", "I'll send listings shortly", "What price range are you considering?"]
</example_output>

Generate 3 reply suggestions as a JSON array:`

  const result = await generateObject({
    model: anthropic(MODEL),
    schema: z.object({
      replies: z.array(z.string().max(50)).length(3),
    }),
    prompt,
    temperature: 0.5,
  })

  return result.object.replies
}

// ============================================
// INTENT CLASSIFICATION
// ============================================

/**
 * Classify intent from a short message
 */
export async function classifyIntent(message: string): Promise<{
  intent: 'buy' | 'sell' | 'rent' | 'info' | 'stop' | 'book' | 'question' | 'other';
  confidence: number;
  entities: Record<string, string>;
}> {
  const result = await generateObject({
    model: anthropic(MODEL),
    schema: z.object({
      intent: z.enum(['buy', 'sell', 'rent', 'info', 'stop', 'book', 'question', 'other']),
      confidence: z.number().min(0).max(1),
      entities: z.record(z.string(), z.string()).describe('Extracted entities like dates, times, locations'),
    }),
    prompt: `Classify the intent of this inbound message from a real estate lead.

Message: "${message}"

Intents:
- buy: Interested in purchasing
- sell: Interested in selling their property
- rent: Looking to rent/lease
- info: Requesting general information
- stop: Opt-out request (STOP, unsubscribe, etc.)
- book: Wants to schedule/view/book
- question: Asking a specific question
- other: Doesn't fit above categories`,
    temperature: 0.1,
  })

  return result.object
}

// ============================================
// CONVERSATION SUMMARY
// ============================================

/**
 * Generate a summary of conversation for agent handoff
 */
export async function summarizeConversation(
  messages: Array<{ direction: string; message_body: string; created_at: string }>
): Promise<{
  summary: string;
  key_points: string[];
  next_steps: string;
  sentiment: 'positive' | 'neutral' | 'negative';
}> {
  const conversation = messages
    .map(m => `[${m.direction}] ${m.message_body}`)
    .join('\n')

  const result = await generateObject({
    model: anthropic(MODEL),
    schema: z.object({
      summary: z.string().max(200).describe('Brief summary of conversation'),
      key_points: z.array(z.string().max(100)).max(5).describe('Key discussion points'),
      next_steps: z.string().max(100).describe('Recommended next action'),
      sentiment: z.enum(['positive', 'neutral', 'negative']),
    }),
    prompt: `Summarize this real estate conversation for an agent handoff.

<conversation>
${conversation}
</conversation>

Provide a concise summary, key points discussed, recommended next steps, and overall sentiment.`,
    temperature: 0.3,
  })

  return result.object
}

// ============================================
// LEAD SCORING
// ============================================

/**
 * Calculate lead score based on qualification data
 */
export function calculateLeadScore(qualification: AiQualificationResult): number {
  let score = 0
  const weights = {
    intent: 25,
    budget: 20,
    timeline: 20,
    location: 15,
    property_type: 10,
    confidence: 10,
  }

  // Intent scoring
  if (qualification.intent === 'buy') score += weights.intent
  else if (qualification.intent === 'sell') score += weights.intent * 0.9
  else if (qualification.intent === 'rent') score += weights.intent * 0.7

  // Budget scoring
  if (qualification.budget_min || qualification.budget_max) score += weights.budget

  // Timeline scoring
  if (qualification.timeline === 'immediate') score += weights.timeline
  else if (qualification.timeline === '1-3months') score += weights.timeline * 0.8
  else if (qualification.timeline === '3-6months') score += weights.timeline * 0.5

  // Location
  if (qualification.location) score += weights.location

  // Property type
  if (qualification.property_type && qualification.property_type !== 'unknown') {
    score += weights.property_type
  }

  // Confidence multiplier
  score = Math.round(score * (qualification.confidence_score || 0.5))

  return Math.min(score, 100)
}
