import { supabaseAdmin } from '@/lib/supabase'

export class EventService {
  constructor(dbClient) {
    this.db = dbClient
  }

  static createDefaultService() {
    return new EventService(supabaseAdmin)
  }

  async logEvent(event) {
    await this.db
      .from('events')
      .insert(event)
      .select('*')
      .single()
      .execute()
  }
}

export const eventService = EventService.createDefaultService()
