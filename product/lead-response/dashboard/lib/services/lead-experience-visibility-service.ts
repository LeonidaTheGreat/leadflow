'use strict'

import crypto from 'crypto'

const DEMO_LINK_TTL_MS = 24 * 60 * 60 * 1000
const SAMPLE_MIN_COUNT = 10

type ServiceDeps = {
  db: any
  logger: any
}

type SimulationInput = {
  leadName: string
  leadPhone?: string | null
  propertyInterest?: string | null
}

const LEAD_SCRIPTS = [
  (name: string, property: string) =>
    `Hi, I'm ${name}. I'm interested in ${property}. Can you help me?`,
  () => `Yes, I'd like to see listings. My budget is around $600,000.`,
  () => `Sounds good. When can we schedule a call?`,
]

const SAMPLE_CONVERSATIONS = Array.from({ length: SAMPLE_MIN_COUNT }).map((_, index) => {
  const i = index + 1
  const outcomes = ['booked', 'in_progress', 'opted_out', 'unqualified'] as const
  const outcome = outcomes[index % outcomes.length]
  return {
    id: `sample-${i}`,
    scenarioLabel: `Scenario ${i}: Buyer inquiry from paid ads`,
    leadName: `Prospect ${i}`,
    maskedPhone: `***-***-${String(1000 + i).slice(-4)}`,
    date: new Date(Date.now() - i * 86400000).toISOString(),
    messageCount: 4,
    outcome,
    messages: [
      { id: `s${i}-1`, direction: 'inbound', body: 'Hi, I am looking for a 3 bed home near transit.', timestamp: new Date(Date.now() - i * 86400000).toISOString() },
      { id: `s${i}-2`, direction: 'outbound', body: 'Great timing. I can share 3 strong matches and schedule a tour.', timestamp: new Date(Date.now() - i * 86400000 + 120000).toISOString() },
      { id: `s${i}-3`, direction: 'inbound', body: 'Can we do Thursday afternoon?', timestamp: new Date(Date.now() - i * 86400000 + 240000).toISOString() },
      { id: `s${i}-4`, direction: 'outbound', body: 'Confirmed for Thursday at 2:00 PM. I will send the invite now.', timestamp: new Date(Date.now() - i * 86400000 + 300000).toISOString() },
    ],
  }
})

export class LeadExperienceVisibilityService {
  private db: any
  private logger: any

  constructor(deps: ServiceDeps) {
    this.db = deps.db
    this.logger = deps.logger
  }

  runSimulation(input: SimulationInput) {
    const name = input.leadName.trim()
    const phone = input.leadPhone?.trim() || '+15550000000'
    const property = input.propertyInterest?.trim() || 'buying a home'

    const conversation = [] as Array<{ role: 'lead' | 'ai'; message: string; timestamp: string }>
    const now = new Date()

    for (let turn = 0; turn < 3; turn++) {
      const leadTimestamp = new Date(now.getTime() + turn * 60000).toISOString()
      const aiTimestamp = new Date(now.getTime() + turn * 60000 + 15000).toISOString()

      conversation.push({ role: 'lead', message: LEAD_SCRIPTS[turn](name, property), timestamp: leadTimestamp })
      conversation.push({ role: 'ai', message: this.generateAiResponse(turn, name, property), timestamp: aiTimestamp })
    }

    return { name, phone, property, conversation }
  }

  async saveSimulation(payload: { name: string; phone: string; property: string; conversation: any[] }) {
    return this.db
      .from('lead_simulations')
      .insert({
        lead_name: payload.name,
        lead_phone: payload.phone,
        property_interest: payload.property,
        conversation: payload.conversation,
        outcome: 'completed',
        triggered_by: 'stojan',
      })
      .select('id, created_at')
      .single()
  }

  async getConversations(outcomeFilter: string) {
    const { data: leads, error: leadsError } = await this.db
      .from('leads')
      .select('id, name, phone, status, created_at, updated_at')
      .order('updated_at', { ascending: false })
      .limit(30)

    if (leadsError) throw leadsError
    if (!leads || leads.length === 0) return SAMPLE_CONVERSATIONS

    const leadIds = leads.map((l: any) => l.id)
    const { data: messages } = await this.db
      .from('sms_messages')
      .select('id, lead_id, direction, message_body, created_at')
      .in('lead_id', leadIds)
      .order('created_at', { ascending: true })

    const grouped: Record<string, any[]> = {}
    for (const msg of messages || []) {
      if (!msg.lead_id) continue
      if (!grouped[msg.lead_id]) grouped[msg.lead_id] = []
      grouped[msg.lead_id].push(msg)
    }

    const liveConversations = leads
      .filter((lead: any) => (grouped[lead.id] || []).length > 0)
      .map((lead: any) => {
        const status = lead.status || ''
        const outcome = status === 'appointment' ? 'booked' : status === 'dnc' ? 'opted_out' : 'in_progress'
        return {
          id: lead.id,
          scenarioLabel: 'Live lead conversation',
          leadName: (lead.name || 'Lead').split(' ')[0],
          maskedPhone: this.maskPhone(lead.phone),
          date: lead.updated_at || lead.created_at,
          messageCount: (grouped[lead.id] || []).length,
          outcome,
          messages: (grouped[lead.id] || []).map((m: any) => ({
            id: m.id,
            direction: m.direction === 'inbound' ? 'inbound' : 'outbound',
            body: m.message_body,
            timestamp: m.created_at,
          })),
        }
      })

    let combined = [...liveConversations, ...SAMPLE_CONVERSATIONS]
    if (outcomeFilter !== 'all') combined = combined.filter((c) => c.outcome === outcomeFilter)
    return combined.slice(0, 10)
  }

  async createDemoLink(input: { host: string; protocol: string; label?: string | null; contentType?: string | null; contentId?: string | null }) {
    const rawToken = crypto.randomBytes(24).toString('hex')
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')
    const expiresAt = new Date(Date.now() + DEMO_LINK_TTL_MS).toISOString()

    const labelParts = [input.label || 'lead-experience', input.contentType || 'unknown', input.contentId || 'none']
    const label = labelParts.join('|')

    const { data, error } = await this.db
      .from('demo_tokens')
      .insert({ token: tokenHash, expires_at: expiresAt, label, created_by: 'stojan' })
      .select('expires_at')
      .single()

    if (error) throw error

    return {
      token: rawToken,
      url: `${input.protocol}://${input.host}/admin/simulator?demo=${rawToken}`,
      expiresAt: data.expires_at,
    }
  }

  async validateDemoToken(rawToken: string) {
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')
    const { data, error } = await this.db
      .from('demo_tokens')
      .select('id, expires_at')
      .eq('token', tokenHash)
      .single()

    if (error || !data) return { valid: false }

    const expired = new Date() > new Date(data.expires_at)
    if (!expired) {
      await this.db.from('demo_tokens').update({ used_at: new Date().toISOString() }).eq('id', data.id)
    }

    return { valid: !expired, expiresAt: data.expires_at, expired }
  }

  async revokeDemoToken(rawToken: string) {
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')
    const { error } = await this.db
      .from('demo_tokens')
      .update({ expires_at: new Date().toISOString() })
      .eq('token', tokenHash)

    if (error) throw error
    return { revoked: true }
  }

  private maskPhone(phone: string | null): string {
    if (!phone) return '****'
    const digits = phone.replace(/\D/g, '')
    return digits.length >= 4 ? `****${digits.slice(-4)}` : '****'
  }

  private generateAiResponse(turn: number, leadName: string, propertyInterest: string): string {
    const firstName = leadName.split(' ')[0]
    switch (turn) {
      case 0:
        return `Hi ${firstName}, thanks for reaching out about ${propertyInterest}. I can help you shortlist options and book a quick call.`
      case 1:
        return 'Great. Based on your budget, I can send three strong options and prep a viewing plan today.'
      case 2:
        return 'I can do Thursday at 2 PM or Friday at 10 AM. Which time works best for you?'
      default:
        return 'Thanks for reaching out.'
    }
  }
}
