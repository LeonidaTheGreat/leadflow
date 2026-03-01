/**
 * LeadFlow SMS Agent
 * 
 * An agent-based approach to SMS conversation management.
 * Uses SOUL.md for personality and SKILLS.md for capabilities.
 */

import { generateObject } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { z } from 'zod'

// Agent personality (embedded to avoid fs issues in edge runtime)
const SOUL_CONTENT = `You are a real estate agent's AI assistant, texting with potential homebuyers.

Core traits:
- Conversational: Text like a real person, not a bot. Use contractions, short sentences.
- Warm but professional: Friendly but not overly familiar. "Hey!" not "Greetings!"
- Efficient: Respect their time. Get to the point quickly.
- Helpful: Always focused on solving their problem (finding the right home).

Texting style:
- Start with "Hey!" or "Hi [name]!"
- Use contractions (I'm, don't, let's)
- Keep messages under 160 characters when possible
- Ask ONE question at a time
- Acknowledge what they said before asking something new
- Use casual language: "Got it", "Cool", "Nice", "Perfect"
- NO signatures like "-Name" at the end

Conversation flow:
1. Welcome → Get their name (if not provided)
2. Location → What area/neighbourhood?
3. Property Type → House, condo, townhouse?
4. Size → Bedrooms/bathrooms?
5. Budget → Price range (handle sensitively)
6. Timeline → How urgent?
7. Offer Value → Send listings or book showing

Key rule: Don't ask about things they've already told you.`

// Types
export interface Message {
  direction: 'inbound' | 'outbound'
  message_body: string
  created_at: string
}

export interface Lead {
  id: string
  name: string | null
  phone: string
  location: string | null
  budget_min: number | null
  budget_max: number | null
  timeline: string | null
  property_type: string | null
  bedrooms: number | null
  bathrooms: number | null
  status: string
  source: string
}

export interface Agent {
  id: string
  name: string
  market: string
  timezone: string
}

export interface ConversationState {
  knownFields: {
    name: boolean
    location: boolean
    propertyType: boolean
    size: boolean  // bedrooms/bathrooms
    budget: boolean
    timeline: boolean
  }
  lastQuestion?: string
  messageCount: number
  qualified: boolean
}

export interface AgentResponse {
  message: string
  action: 'continue' | 'offer_value' | 'escalate' | 'opt_out'
  nextState: Partial<ConversationState>
  confidence: number
}

// Claude model for SMS responses
const SMS_MODEL = anthropic('claude-3-haiku-20240307')

/**
 * Parse conversation history to determine current state
 */
export function analyzeConversation(
  lead: Lead,
  messages: Message[]
): ConversationState {
  const knownFields = {
    name: !!(lead.name && lead.name !== 'New Lead'),
    location: !!lead.location,
    propertyType: !!lead.property_type,
    size: !!(lead.bedrooms || lead.bathrooms),
    budget: !!(lead.budget_min || lead.budget_max),
    timeline: !!lead.timeline,
  }

  // Count how many fields we know
  const knownCount = Object.values(knownFields).filter(Boolean).length

  return {
    knownFields,
    messageCount: messages.length,
    qualified: knownCount >= 5, // Most fields known
  }
}

/**
 * Determine what question to ask next
 */
function getNextQuestion(state: ConversationState): string | null {
  if (!state.knownFields.name) return 'name'
  if (!state.knownFields.location) return 'location'
  if (!state.knownFields.propertyType) return 'property_type'
  if (!state.knownFields.size) return 'size'
  if (!state.knownFields.budget) return 'budget'
  if (!state.knownFields.timeline) return 'timeline'
  return null // Fully qualified
}

/**
 * Extract information from user's message
 */
export function extractInfo(message: string, currentQuestion: string | null): Partial<Lead> {
  const lower = message.toLowerCase()
  const extracted: Partial<Lead> = {}

  // Name extraction (basic patterns)
  if (currentQuestion === 'name' || !currentQuestion) {
    const nameMatch = message.match(/(?:my name is|i'm|i am|call me)\s+([a-z]+)/i)
    if (nameMatch) {
      extracted.name = nameMatch[1].charAt(0).toUpperCase() + nameMatch[1].slice(1)
    }
  }

  // Location extraction
  if (currentQuestion === 'location' || lower.includes('looking in') || lower.includes('want to live')) {
    // Look for neighbourhood/area names (simplified)
    const areaPatterns = [
      /(?:in|at|near)\s+([a-z\s]+(?:toronto|mississauga|brampton|etobicoke|scarborough|north york|mimico|liberty village|king west))/i,
      /([a-z]+(?:town|dale|wood|heights|village))/i,
    ]
    for (const pattern of areaPatterns) {
      const match = message.match(pattern)
      if (match) {
        extracted.location = match[1].trim()
        break
      }
    }
  }

  // Property type extraction
  if (currentQuestion === 'property_type' || lower.includes('house') || lower.includes('condo') || lower.includes('townhouse')) {
    if (lower.includes('house') && !lower.includes('townhouse')) extracted.property_type = 'house'
    else if (lower.includes('condo')) extracted.property_type = 'condo'
    else if (lower.includes('townhouse')) extracted.property_type = 'townhouse'
  }

  // Size extraction
  if (currentQuestion === 'size' || lower.match(/\d+\s*(?:bed|bdr|bd|bathroom|bath|ba)/)) {
    const bedMatch = message.match(/(\d+)\s*(?:bed|bdr|bd|bedroom)/i)
    const bathMatch = message.match(/(\d+)\s*(?:bath|ba|bathroom)/i)
    if (bedMatch) extracted.bedrooms = parseInt(bedMatch[1])
    if (bathMatch) extracted.bathrooms = parseInt(bathMatch[1])
  }

  // Budget extraction
  if (currentQuestion === 'budget' || lower.includes('$') || lower.includes('million') || lower.includes('k')) {
    // Look for patterns like "1.5M", "1.5 million", "$1,500,000"
    const budgetMatch = message.match(/\$?([\d,]+(?:\.\d+)?)\s*(m|million|k|thousand)?/i)
    if (budgetMatch) {
      let amount = parseFloat(budgetMatch[1].replace(/,/g, ''))
      const unit = budgetMatch[2]?.toLowerCase()
      if (unit === 'm' || unit === 'million') amount *= 1000000
      if (unit === 'k' || unit === 'thousand') amount *= 1000
      extracted.budget_max = amount
    }
  }

  // Timeline extraction
  if (currentQuestion === 'timeline' || lower.includes('asap') || lower.includes('soon') || lower.includes('month')) {
    if (lower.includes('asap') || lower.includes('immediately')) extracted.timeline = 'asap'
    else if (lower.includes('month') || lower.match(/\d+\s*months?/)) {
      const monthMatch = lower.match(/(\d+)\s*months?/)
      extracted.timeline = monthMatch ? `${monthMatch[1]} months` : 'few months'
    }
    else if (lower.includes('year')) extracted.timeline = '1+ year'
    else if (lower.includes('just looking') || lower.includes('browsing')) extracted.timeline = 'browsing'
  }

  return extracted
}

/**
 * Build the prompt for the AI agent
 */
function buildAgentPrompt(
  lead: Lead,
  agent: Agent,
  messages: Message[],
  state: ConversationState,
  inboundMessage: string
): string {
  const agentFirstName = agent.name.split(' ')[0]
  const conversationHistory = messages.length > 0
    ? messages.map(m => `${m.direction === 'inbound' ? 'THEM' : 'YOU'}: ${m.message_body}`).join('\n')
    : 'No previous messages (first contact).'

  const nextQuestion = getNextQuestion(state)
  const hasIntroduced = messages.some(m => 
    m.direction === 'outbound' && 
    (m.message_body.toLowerCase().includes("i'm " + agentFirstName.toLowerCase()) ||
     m.message_body.toLowerCase().includes("this is " + agentFirstName.toLowerCase()) ||
     m.message_body.toLowerCase().includes("hey ") && m.message_body.length < 200) // rough heuristic
  )

  return `You are ${agent.name}, a real estate agent texting with a potential buyer on SMS.

Your entire job: Have a natural text conversation to qualify the lead.
- Ask ONE thing at a time
- Remember what they've told you (DON'T repeat)
- Sound like a friend texting, not a bot
- If first message, say hi and ask their name
- Never use signatures or "-Name" endings

<what_you_know>
Name: ${state.knownFields.name ? lead.name || 'Unknown' : 'unknown'}
Location: ${state.knownFields.location ? lead.location : 'unknown'}
Property Type: ${state.knownFields.propertyType ? lead.property_type : 'unknown'}
Size: ${state.knownFields.size ? `${lead.bedrooms || '?'} bed, ${lead.bathrooms || '?'} bath` : 'unknown'}
Budget: ${state.knownFields.budget ? `$${lead.budget_max?.toLocaleString() || '?'}` : 'unknown'}
Timeline: ${state.knownFields.timeline ? lead.timeline : 'unknown'}
</what_you_know>

<conversation_history>
${conversationHistory}
</conversation_history>

<their_message_now>
"${inboundMessage}"
</their_message_now>

<key_facts>
- Already introduced: ${hasIntroduced ? 'YES - do NOT re-introduce' : 'NO - introduce on first reply'}
- Messages so far: ${state.messageCount}
- Missing info: ${nextQuestion || 'none - they\'re qualified'}
- This is ${state.messageCount === 0 ? 'FIRST CONTACT' : 'a follow-up'}
</key_facts>

Your response:
1. Acknowledge what they just said (be specific)
2. ${nextQuestion ? `Ask for the next missing piece: ${nextQuestion}` : 'Offer to send listings or schedule a tour'}
3. Keep it SHORT (try for 1-2 sentences)
4. NO signature, no formal closings
5. Sound natural (use "I'm", "don't", "let's" instead of formal speech)`
}

/**
 * Main agent function - generate response using conversation state
 */
export async function generateAgentResponse(
  lead: Lead,
  agent: Agent,
  messages: Message[],
  inboundMessage: string,
  options: {
    useLocalModel?: boolean
  } = {}
): Promise<AgentResponse> {
  console.log('🤖 SMS Agent: Analyzing conversation...')

  // Analyze current state
  const state = analyzeConversation(lead, messages)
  console.log('🤖 SMS Agent: State:', state)

  // Extract any new info from the message
  const currentQuestion = getNextQuestion(state)
  const extractedInfo = extractInfo(inboundMessage, currentQuestion)
  console.log('🤖 SMS Agent: Extracted info:', extractedInfo)

  // Build prompt
  const prompt = buildAgentPrompt(lead, agent, messages, state, inboundMessage)

  console.log('🤖 SMS Agent: Using Claude model')

  try {
    const result = await generateObject({
      model: SMS_MODEL,
      schema: z.object({
        message: z.string().max(320).describe('The SMS response text'),
        action: z.enum(['continue', 'offer_value', 'escalate', 'opt_out']).describe('What action to take'),
        confidence: z.number().min(0).max(1).describe('Confidence in this response'),
      }),
      prompt,
      temperature: 0.7,
    })

    // Determine next state based on extracted info
    const nextState: Partial<ConversationState> = {
      knownFields: { ...state.knownFields },
      messageCount: state.messageCount + 1,
    }

    // Update known fields based on extracted info
    if (extractedInfo.name) nextState.knownFields!.name = true
    if (extractedInfo.location) nextState.knownFields!.location = true
    if (extractedInfo.property_type) nextState.knownFields!.propertyType = true
    if (extractedInfo.bedrooms || extractedInfo.bathrooms) nextState.knownFields!.size = true
    if (extractedInfo.budget_max) nextState.knownFields!.budget = true
    if (extractedInfo.timeline) nextState.knownFields!.timeline = true

    // Check if now qualified
    const knownCount = Object.values(nextState.knownFields!).filter(Boolean).length
    nextState.qualified = knownCount >= 5

    console.log('🤖 SMS Agent: Response generated:', {
      action: result.object.action,
      confidence: result.object.confidence,
      messageLength: result.object.message.length,
    })

    return {
      message: result.object.message,
      action: result.object.action,
      nextState,
      confidence: result.object.confidence,
    }

  } catch (error) {
    console.error('🤖 SMS Agent: Generation error:', error)
    
    // Fallback to template response
    return generateFallbackResponse(lead, agent, state, currentQuestion)
  }
}

/**
 * Generate fallback response when AI fails
 */
function generateFallbackResponse(
  lead: Lead,
  agent: Agent,
  state: ConversationState,
  nextQuestion: string | null
): AgentResponse {
  const agentFirstName = agent.name.split(' ')[0]
  const hasIntroduced = state.messageCount > 0

  let message = ''

  if (!hasIntroduced) {
    message = `Hey! ${agentFirstName} here. Thanks for reaching out about buying! I'd love to help. What's your name?`
  } else if (!state.knownFields.name) {
    message = "Nice to meet you! What's your name?"
  } else if (!state.knownFields.location) {
    message = "What area are you looking to buy in?"
  } else if (!state.knownFields.propertyType) {
    message = "What type of place? House, condo, or townhouse?"
  } else if (!state.knownFields.size) {
    message = "How many bedrooms and bathrooms do you need?"
  } else if (!state.knownFields.budget) {
    message = "What's your budget range?"
  } else if (!state.knownFields.timeline) {
    message = "What's your timeline? Looking to buy soon or just exploring?"
  } else {
    message = "Perfect! I've got some places in mind. Want me to send listings or book a tour?"
  }

  return {
    message,
    action: nextQuestion ? 'continue' : 'offer_value',
    nextState: state,
    confidence: 0.5,
  }
}

/**
 * Check if user wants to opt out
 */
export function checkOptOut(message: string): boolean {
  const lower = message.toLowerCase().trim()
  return lower === 'stop' || lower === 'unsubscribe' || lower === 'cancel'
}
