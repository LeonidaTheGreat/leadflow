import { supabaseAdmin } from '@/lib/supabase'

export class AgentService {
  constructor(dbClient) {
    this.db = dbClient
  }

  static createDefaultService() {
    return new AgentService(supabaseAdmin)
  }

  async getAgentById(id) {
    const { data, error } = await this.db
      .from('real_estate_agents')
      .select('*')
      .eq('id', id)
      .single()
      .execute()

    return { data, error }
  }

  async getAgentByEmail(email) {
    const { data, error } = await this.db
      .from('real_estate_agents')
      .select('*')
      .eq('email', email)
      .single()
      .execute()

    return { data, error }
  }

  async getActiveAgents() {
    const { data, error } = await this.db
      .from('real_estate_agents')
      .select('*')
      .eq('is_active', true)
      .execute()

    return { data: data || [], error }
  }
}

export const agentService = AgentService.createDefaultService()
