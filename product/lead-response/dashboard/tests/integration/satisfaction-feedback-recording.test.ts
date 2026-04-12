/**
 * @jest-environment node
 */

import path from 'path'
import dotenv from 'dotenv'
import axios from 'axios'

dotenv.config({ path: path.join(process.cwd(), '.env.local'), quiet: true, override: true })

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ''
const API_KEY = process.env.API_SECRET_KEY || ''

if (!API_BASE_URL || !API_KEY) {
  throw new Error('NEXT_PUBLIC_API_URL and API_SECRET_KEY are required for PostgREST integration')
}

global.fetch = (async (url: string, init?: RequestInit) => {
  const method = init?.method || 'GET'
  const response = await axios({
    url,
    method,
    headers: init?.headers as Record<string, string>,
    data: init?.body as any,
    responseType: 'text',
    validateStatus: () => true,
  })

  const responseText =
    typeof response.data === 'string' ? response.data : JSON.stringify(response.data ?? null)

  return {
    ok: response.status >= 200 && response.status < 300,
    status: response.status,
    text: async () => responseText,
    json: async () => (responseText ? JSON.parse(responseText) : null),
    headers: {
      get: (name: string) => {
        const value = response.headers[name.toLowerCase()]
        if (Array.isArray(value)) return value.join(',')
        return value ?? null
      },
    },
  } as Response
}) as unknown as typeof fetch

const {
  classifyReply,
  getPendingSatisfactionPing,
  recordSatisfactionReply,
} = require('@/lib/satisfaction') as {
  classifyReply: (reply: string) => string
  getPendingSatisfactionPing: (leadId: string) => Promise<{ id: string } | null>
  recordSatisfactionReply: (eventId: string, rawReply: string, rating: string) => Promise<boolean>
}

type HandleResult = {
  handled: boolean
  recorded: boolean
  rating: string | null
  eventId: string | null
}

async function postgrestRequest(
  method: 'GET' | 'POST' | 'DELETE',
  resourcePath: string,
  body?: unknown,
  prefer?: string
) {
  return axios({
    method,
    url: `${API_BASE_URL}${resourcePath}`,
    data: body,
    validateStatus: () => true,
    headers: {
      apikey: API_KEY,
      Authorization: `Bearer ${API_KEY}`,
      ...(prefer ? { Prefer: prefer } : {}),
    },
  })
}

function rows(data: any): any[] {
  if (Array.isArray(data)) return data
  if (data === null || data === undefined) return []
  return [data]
}

async function handleSatisfactionFeedback(leadId: string, rawReply: string): Promise<HandleResult> {
  const pendingPing = await getPendingSatisfactionPing(leadId)

  if (!pendingPing) {
    return {
      handled: false,
      recorded: false,
      rating: null,
      eventId: null,
    }
  }

  const rating = classifyReply(rawReply)
  const recorded = await recordSatisfactionReply(pendingPing.id, rawReply, rating)

  return {
    handled: true,
    recorded,
    rating,
    eventId: pendingPing.id,
  }
}

describe('satisfaction reply recording (real DB integration)', () => {
  jest.setTimeout(20000)

  let leadId = ''
  let eventId = ''

  beforeAll(async () => {
    const agentRes = await postgrestRequest('GET', '/real_estate_agents?select=id&order=created_at.asc&limit=1')
    if (agentRes.status !== 200 || !Array.isArray(agentRes.data) || agentRes.data.length === 0) {
      throw new Error(`Unable to load agent fixture row. status=${agentRes.status}`)
    }

    leadId = `it-lead-${Date.now()}`

    const createRes = await postgrestRequest(
      'POST',
      '/lead_satisfaction_events',
      {
        lead_id: leadId,
        agent_id: agentRes.data[0].id,
        conversation_id: `integration-conv-${Date.now()}`,
        satisfaction_ping_sent_at: new Date().toISOString(),
        rating: null,
        created_at: new Date().toISOString(),
      },
      'return=representation'
    )

    if (createRes.status < 200 || createRes.status >= 300) {
      throw new Error(`Failed to create pending satisfaction event. status=${createRes.status}`)
    }

    const createdRows = rows(createRes.data)
    if (!createdRows[0]?.id) {
      throw new Error('Pending satisfaction event creation returned no id')
    }

    eventId = createdRows[0].id
  })

  afterAll(async () => {
    if (!eventId) return
    await postgrestRequest('DELETE', `/lead_satisfaction_events?id=eq.${eventId}`)
  })

  test('handleSatisfactionFeedback updates rating and raw_reply in database', async () => {
    const rawReply = 'YES this was helpful'

    const result = await handleSatisfactionFeedback(leadId, rawReply)

    expect(result.handled).toBe(true)
    expect(result.recorded).toBe(true)
    expect(result.rating).toBe('positive')
    expect(result.eventId).toBe(eventId)

    const verifyRes = await postgrestRequest(
      'GET',
      `/lead_satisfaction_events?id=eq.${eventId}&select=id,raw_reply,rating&limit=1`
    )

    expect(verifyRes.status).toBe(200)
    const verifiedRows = rows(verifyRes.data)
    expect(verifiedRows.length).toBe(1)
    expect(verifiedRows[0].raw_reply).toBe(rawReply)
    expect(verifiedRows[0].rating).toBe('positive')
  })
})
