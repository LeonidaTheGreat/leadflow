import { supabaseAdmin } from '@/lib/supabase'

const SAMPLE_LEADS = [
  {
    name: 'Sarah Johnson',
    phone: '+15551234567',
    email: 'sarah.j@example.com',
    source: 'Zillow',
    status: 'new',
    property_interest: '3-bedroom home in Austin',
    budget: '$600,000 - $750,000',
    timeline: '1-3 months',
    is_sample: true,
    sample_type: 'demo'
  },
  {
    name: 'Michael Chen',
    phone: '+15559876543',
    email: 'mchen@example.com',
    source: 'Realtor.com',
    status: 'responded',
    property_interest: 'Downtown condo',
    budget: '$400,000 - $500,000',
    timeline: '3-6 months',
    is_sample: true,
    sample_type: 'demo'
  },
  {
    name: 'Emily Rodriguez',
    phone: '+15555678901',
    email: 'emily.r@example.com',
    source: 'Facebook Ads',
    status: 'qualified',
    property_interest: 'Family home with pool',
    budget: '$800,000+',
    timeline: 'ASAP',
    is_sample: true,
    sample_type: 'demo'
  }
]

const SAMPLE_AI_RESPONSES = [
  "Hi Sarah! 👋 I'm your AI assistant from LeadFlow. I'd love to help you find a 3-bedroom home in Austin. Are you looking in any specific neighborhoods?",
  "Hi Michael! Thanks for reaching out about downtown condos. I can definitely help you find something in the $400-500K range. When would be a good time for a quick call to discuss your preferences?",
  "Hi Emily! 🏊‍♀️ A family home with a pool sounds wonderful! I have several listings that might interest you. Would you like me to send you details on properties with pools in your area?"
]

const ONE_HOUR_MS = 60 * 60 * 1000
const ONE_MINUTE_MS = 60 * 1000

export class LeadService {
  constructor(dbClient) {
    this.db = dbClient
  }

  static createDefaultService() {
    return new LeadService(supabaseAdmin)
  }

  async createLead(lead) {
    const { data, error } = await this.db
      .from('leads')
      .insert(lead)
      .select('*')
      .single()
      .execute()

    return { data, error }
  }

  async getLeadById(id) {
    const { data, error } = await this.db
      .from('leads')
      .select('*')
      .eq('id', id)
      .single()
      .execute()

    return { data, error }
  }

  async getLeadByPhone(phone) {
    const { data, error } = await this.db
      .from('leads')
      .select('*')
      .eq('phone', phone)
      .single()
      .execute()

    return { data, error }
  }

  async getLeadsByAgent(agentId, options = {}) {
    let query = this.db
      .from('leads')
      .select('*')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false })

    if (options.status) {
      query = query.eq('status', options.status)
    }

    if (options.limit) {
      query = query.limit(options.limit)
    }

    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1)
    }

    const { data, error, count } = await query.execute()
    return { data: data || [], count: count ?? null, error }
  }

  async updateLead(id, updates) {
    const { data, error } = await this.db
      .from('leads')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single()
      .execute()

    return { data, error }
  }

  async seedDemoLeads(agentId) {
    const nowMs = Date.now()
    const sampleLeadsWithAgent = SAMPLE_LEADS.map((lead, index) => {
      const createdAt = new Date(nowMs - index * ONE_HOUR_MS).toISOString()
      return {
        ...lead,
        agent_id: agentId,
        created_at: createdAt,
        updated_at: createdAt
      }
    })

    const { data: createdLeads, error: leadsError } = await this.db
      .from('leads')
      .insert(sampleLeadsWithAgent)
      .select('id')
      .execute()

    if (leadsError || !createdLeads?.length) {
      return { data: [], error: leadsError || null }
    }

    const sampleMessages = createdLeads.map((lead, index) => ({
      lead_id: lead.id,
      message_body: SAMPLE_AI_RESPONSES[index] || SAMPLE_AI_RESPONSES[0],
      direction: 'outbound',
      channel: 'sms',
      ai_generated: true,
      status: 'sent',
      is_sample: true,
      created_at: new Date(nowMs - index * ONE_HOUR_MS + ONE_MINUTE_MS).toISOString()
    }))

    const { error: messagesError } = await this.db
      .from('messages')
      .insert(sampleMessages)
      .execute()

    if (messagesError) {
      // Keep signup flow resilient: sample data should not block account creation.
      return { data: createdLeads, error: messagesError }
    }

    return { data: createdLeads, error: null }
  }
}

export const leadService = LeadService.createDefaultService()
