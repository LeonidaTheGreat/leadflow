import { supabaseAdmin } from '@/lib/supabase'

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
}

export const leadService = LeadService.createDefaultService()
