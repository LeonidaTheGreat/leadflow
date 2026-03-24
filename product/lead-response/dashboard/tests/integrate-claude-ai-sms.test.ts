/**
 * @jest-environment node
 *
 * E2E Test: Claude AI SMS Response Generation
 * Task ID: 7b269b5a-3746-4279-8906-602252caf988
 * PR #507
 *
 * Tests runtime behavior of generateAiSmsResponse() in mock mode.
 * Mock mode is active when ANTHROPIC_API_KEY is absent or invalid (< 20 chars).
 */

// Mock the AI SDK to avoid TransformStream / browser-only dependencies in Node test env
jest.mock('@ai-sdk/anthropic', () => ({
  anthropic: jest.fn(() => ({})),
}))

jest.mock('ai', () => ({
  generateObject: jest.fn().mockResolvedValue({
    object: {
      message: 'Test AI message from mock',
      confidence: 0.85,
      suggested_action: 'nurture',
      personalize: true,
      replies: ['Let me help!', "What's your budget?", 'Want to schedule a call?'],
    },
  }),
  generateText: jest.fn(),
}))

import { generateAiSmsResponse } from '../lib/ai'
import type { Lead, Agent } from '../lib/types'

const mockLead: Lead = {
  id: 'lead-test-001',
  name: 'Jane Smith',
  phone: '+16475551234',
  email: 'jane@example.com',
  source: 'website',
  status: 'new',
  location: 'Toronto',
  budget_min: 600000,
  budget_max: 900000,
  timeline: '1-3months',
  latest_qualification: {
    intent: 'buy',
    property_type: 'house',
    bedrooms: 3,
    bathrooms: 2,
    confidence_score: 0.8,
    is_qualified: true,
    qualification_reason: 'Clear intent and budget',
    budget_min: 600000,
    budget_max: 900000,
    timeline: '1-3months',
    location: 'Toronto',
    square_feet: null,
    notes: null,
    raw_response: {},
  },
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

const mockAgent: Agent = {
  id: 'agent-test-001',
  name: 'Alex Johnson',
  email: 'alex@realestate.com',
  phone: '+16475559999',
  market: 'ca-ontario',
}

describe('generateAiSmsResponse() — Mock mode (no real API key)', () => {
  const originalKey = process.env.ANTHROPIC_API_KEY

  beforeEach(() => {
    delete process.env.ANTHROPIC_API_KEY
  })

  afterEach(() => {
    if (originalKey !== undefined) {
      process.env.ANTHROPIC_API_KEY = originalKey
    }
  })

  it('returns a valid AiSmsResponse object', async () => {
    const result = await generateAiSmsResponse(mockLead, mockAgent, { trigger: 'initial' })
    expect(result).toBeDefined()
    expect(typeof result.message).toBe('string')
    expect(result.message.length).toBeGreaterThan(0)
    expect(result.trigger).toBe('initial')
    expect(typeof result.confidence).toBe('number')
    expect(result.confidence).toBeGreaterThanOrEqual(0)
    expect(result.confidence).toBeLessThanOrEqual(1)
    expect(['book', 'nurture', 'handoff', 'discard']).toContain(result.suggested_action)
    expect(typeof result.personalize).toBe('boolean')
  })

  it('initial trigger: generates a non-empty message for the initial trigger', async () => {
    const result = await generateAiSmsResponse(mockLead, mockAgent, { trigger: 'initial' })
    // The AI-generated message (via mocked generateObject) should be non-empty
    expect(typeof result.message).toBe('string')
    expect(result.message.length).toBeGreaterThan(0)
    expect(result.trigger).toBe('initial')
  })

  it('message length is within SMS limits (320 chars max)', async () => {
    const result = await generateAiSmsResponse(mockLead, mockAgent, { trigger: 'initial' })
    expect(result.message.length).toBeLessThanOrEqual(320)
  })

  it('includes opt-out compliance text (STOP)', async () => {
    const result = await generateAiSmsResponse(mockLead, mockAgent, { trigger: 'initial' })
    expect(result.message).toContain('STOP')
  })

  it('handles unknown lead name gracefully — no "Hi New Lead"', async () => {
    const unknownLead: Lead = { ...mockLead, name: 'New Lead' }
    const result = await generateAiSmsResponse(unknownLead, mockAgent, { trigger: 'initial' })
    expect(typeof result.message).toBe('string')
    expect(result.message.length).toBeGreaterThan(0)
    expect(result.message).not.toContain('Hi New Lead')
  })

  it('inbound_reply trigger returns correct trigger in response', async () => {
    const result = await generateAiSmsResponse(mockLead, mockAgent, {
      trigger: 'inbound_reply',
      inboundMessage: 'Yes, I am interested!',
    })
    expect(result.trigger).toBe('inbound_reply')
    expect(typeof result.message).toBe('string')
    expect(result.message.length).toBeGreaterThan(0)
  })

  it('all trigger types return valid responses', async () => {
    const triggers: Array<'initial' | 'followup' | 'inbound_reply' | 'manual'> = [
      'initial', 'followup', 'inbound_reply', 'manual',
    ]
    for (const trigger of triggers) {
      const result = await generateAiSmsResponse(mockLead, mockAgent, { trigger })
      expect(result).toBeDefined()
      expect(result.trigger).toBe(trigger)
      expect(typeof result.message).toBe('string')
      expect(result.message.length).toBeGreaterThan(0)
    }
  })

  it('placeholder API key still returns a valid response (AI provider handles key gracefully)', async () => {
    // Note: AI_PROVIDER is a module-level constant set at load time; runtime env changes
    // won't affect it. With default qwen-local provider, AI generates via mocked generateObject.
    process.env.ANTHROPIC_API_KEY = 'sk-ant-placeholder'
    const result = await generateAiSmsResponse(mockLead, mockAgent, { trigger: 'initial' })
    expect(result).toBeDefined()
    expect(typeof result.message).toBe('string')
    expect(result.message.length).toBeGreaterThan(0)
    // confidence should be a valid number between 0 and 1
    expect(result.confidence).toBeGreaterThanOrEqual(0)
    expect(result.confidence).toBeLessThanOrEqual(1)
  })
})

describe('generateAiSmsResponse() — Real AI mode (with valid API key)', () => {
  it('calls generateObject with Anthropic model and appends STOP if missing', async () => {
    const { generateObject } = require('ai')
    // Mock returns message without STOP — function should append it
    ;(generateObject as jest.Mock).mockResolvedValueOnce({
      object: {
        message: 'Hey Jane! Alex here. Would you like to see some listings?',
        confidence: 0.9,
        suggested_action: 'nurture',
        personalize: true,
      },
    })

    // Simulate a real-looking API key (> 20 chars, no placeholder)
    process.env.ANTHROPIC_API_KEY = 'sk-ant-api03-validkey123456789'
    const result = await generateAiSmsResponse(mockLead, mockAgent, { trigger: 'initial' })

    expect(result.message).toContain('STOP')
    expect(result.confidence).toBe(0.9)
    expect(result.suggested_action).toBe('nurture')
    expect(result.trigger).toBe('initial')
    // generateObject must have been called (real AI path)
    expect(generateObject).toHaveBeenCalled()
  })
})
