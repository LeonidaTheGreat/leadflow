import { supabaseAdmin } from '@/lib/supabase'
import type { Lead } from '@/lib/types'

type LeadQueryOptions = {
  status?: string
  limit?: number
  offset?: number
}

export class LeadService {
  private db: typeof supabaseAdmin

  constructor(dbClient = supabaseAdmin) {
    this.db = dbClient
  }

  static createDefaultService() {
    return new LeadService(supabaseAdmin)
  }

  async createLead(lead: Partial<Lead>): Promise<{ data: Lead | null; error: any }> {
    const { data, error } = await this.db.from('leads').insert(lead).select().single()
    return { data, error }
  }

  async getLeadById(id: string): Promise<{ data: Lead | null; error: any }> {
    const { data, error } = await this.db
      .from('leads')
      .select('*, agent:agents(*), latest_qualification:qualifications(*)')
      .eq('id', id)
      .single()

    return { data, error }
  }

  async getLeadByPhone(phone: string): Promise<{ data: Lead | null; error: any }> {
    const { data, error } = await this.db.from('leads').select('*').eq('phone', phone).single()
    return { data, error }
  }

  async getLeadsByAgent(
    agentId: string,
    options: LeadQueryOptions = {}
  ): Promise<{ data: Lead[]; count: number | null; error: any }> {
    let query = this.db
      .from('leads')
      .select('*, agent:agents(*), latest_qualification:qualifications(*)', { count: 'exact' })
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

    const { data, error, count } = await query
    return { data: data || [], count, error }
  }

  async updateLead(id: string, updates: Partial<Lead>): Promise<{ data: Lead | null; error: any }> {
    const { data, error } = await this.db.from('leads').update(updates).eq('id', id).select().single()
    return { data, error }
  }
}

export const leadService = LeadService.createDefaultService()
