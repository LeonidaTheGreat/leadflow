/**
 * Tests for Live AI Demo API
 * @jest-environment node
 */

import { POST } from '@/app/api/demo/generate-response/route'
import { NextRequest } from 'next/server'

// Mock the AI SDK
jest.mock('ai', () => ({
  generateText: jest.fn(),
}))

jest.mock('@ai-sdk/anthropic', () => ({
  anthropic: jest.fn(() => 'mocked-anthropic-model'),
}))

import { generateText } from 'ai'

describe('Demo API - POST /api/demo/generate-response', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  function createRequest(body: object): NextRequest {
    return {
      json: async () => body,
    } as unknown as NextRequest
  }

  it('should return 400 for missing lead name', async () => {
    const request = createRequest({
      propertyInterest: '3-bedroom home',
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Lead name is required')
  })

  it('should return 400 for missing property interest', async () => {
    const request = createRequest({
      leadName: 'John Doe',
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Property interest is required')
  })

  it('should return 400 for invalid JSON', async () => {
    const request = {
      json: async () => { throw new Error('Invalid JSON') },
    } as unknown as NextRequest

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid JSON body')
  })

  it('should generate mock response when API key is placeholder', async () => {
    process.env.ANTHROPIC_API_KEY = 'placeholder'

    const request = createRequest({
      leadName: 'Sarah Johnson',
      propertyInterest: 'Condo in Miami',
      leadSource: 'Zillow',
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.response).toBeDefined()
    expect(data.response.length).toBeGreaterThan(0)
    expect(data.usedMockMode).toBe(true)
    expect(data.responseTimeMs).toBeGreaterThanOrEqual(0)
    expect(data.personalization.leadName).toBe('Sarah Johnson')
    expect(data.personalization.propertyInterest).toBe('Condo in Miami')
    expect(data.personalization.leadSource).toBe('Zillow')
  })

  it('should call AI API when valid key is present', async () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-api03-valid-key-that-is-long-enough'

    const mockResponse = {
      text: 'Hi Sarah, thanks for your interest in Miami condos! I\'d love to help you find the perfect place. When\'s a good time for a quick call?',
    }
    ;(generateText as jest.Mock).mockResolvedValue(mockResponse)

    const request = createRequest({
      leadName: 'Sarah Johnson',
      propertyInterest: 'Condo in Miami',
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.response).toBe(mockResponse.text)
    expect(data.usedMockMode).toBe(false)
    expect(generateText).toHaveBeenCalled()
  })

  it('should fallback to mock on AI error', async () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-api03-valid-key-that-is-long-enough'
    ;(generateText as jest.Mock).mockRejectedValue(new Error('AI service error'))

    const request = createRequest({
      leadName: 'Mike Smith',
      propertyInterest: 'House in Denver',
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.response).toBeDefined()
    expect(data.usedMockMode).toBe(true)
  })

  it('should sanitize inputs to prevent injection', async () => {
    process.env.ANTHROPIC_API_KEY = 'placeholder'

    const request = createRequest({
      leadName: 'John<script>alert("xss")</script>',
      propertyInterest: 'House'.repeat(50), // Very long input
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.personalization.leadName.length).toBeLessThanOrEqual(50)
    expect(data.personalization.propertyInterest.length).toBeLessThanOrEqual(100)
  })

  it('should handle empty lead source gracefully', async () => {
    process.env.ANTHROPIC_API_KEY = 'placeholder'

    const request = createRequest({
      leadName: 'Jane Doe',
      propertyInterest: 'Townhouse',
      leadSource: '',
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.response).toBeDefined()
  })
})
