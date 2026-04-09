import { supabaseAdmin } from '@/lib/supabase'

export class MessageService {
  constructor(dbClient) {
    this.db = dbClient
  }

  static createDefaultService() {
    return new MessageService(supabaseAdmin)
  }

  async createMessage(message) {
    const { data, error } = await this.db
      .from('messages')
      .insert(message)
      .select('*')
      .single()
      .execute()

    return { data, error }
  }

  async getMessagesByLead(leadId) {
    const { data, error } = await this.db
      .from('messages')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: true })
      .execute()

    return { data: data || [], error }
  }

  async updateMessageStatus(twilioSid, status, deliveredAt) {
    const updates = {
      status,
      twilio_status: status,
    }

    if (deliveredAt) {
      updates.delivered_at = deliveredAt
    }

    const { data, error } = await this.db
      .from('messages')
      .update(updates)
      .eq('twilio_sid', twilioSid)
      .select('*')
      .single()
      .execute()

    return { data, error }
  }
}

export const messageService = MessageService.createDefaultService()
