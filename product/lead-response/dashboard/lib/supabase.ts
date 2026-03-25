/**
 * PostgREST Database Client Re-exports
 * 
 * This module maintains backward compatibility by re-exporting from lib/db.ts.
 * All imports have been migrated from the Supabase SDK to use the PostgREST client (lib/db.ts).
 */

import { postgrestAdmin, postgrestPublic } from './db'
import type { 
  Lead, 
  Agent, 
  Message, 
  Qualification, 
  Booking, 
  Template,
  Event,
  DashboardStats 
} from '@/lib/types'

// ============================================
// CLIENT RE-EXPORTS
// ============================================

// Server-side admin client (for use in API routes only)
export const supabaseAdmin = postgrestAdmin

// Client-side public client (for use in components)
export const supabase = postgrestPublic

// Lazy getters for runtime initialization
export function getSupabaseClient() {
  return postgrestPublic
}

export function getSupabaseAdmin() {
  return postgrestAdmin
}

// ============================================
// LEAD OPERATIONS
// ============================================

export async function createLead(
  lead: Partial<Lead>
): Promise<{ data: Lead | null; error: any }> {
  const { data, error } = await postgrestAdmin
    .from('leads')
    .insert(lead)
    .select('*')
    .single()
    .execute()

  return { data, error }
}

export async function getLeadById(id: string): Promise<{ data: Lead | null; error: any }> {
  const { data, error } = await postgrestAdmin
    .from('leads')
    .select('*')
    .eq('id', id)
    .single()
    .execute()

  return { data, error }
}

export async function getLeadByPhone(phone: string): Promise<{ data: Lead | null; error: any }> {
  const { data, error } = await postgrestAdmin
    .from('leads')
    .select('*')
    .eq('phone', phone)
    .single()
    .execute()

  return { data, error }
}

export async function getLeadsByAgent(
  agentId: string,
  options: {
    status?: string
    limit?: number
    offset?: number
  } = {}
): Promise<{ data: Lead[]; count: number | null; error: any }> {
  let query = postgrestAdmin
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

export async function updateLead(
  id: string,
  updates: Partial<Lead>
): Promise<{ data: Lead | null; error: any }> {
  const { data, error } = await postgrestAdmin
    .from('leads')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single()
    .execute()

  return { data, error }
}

// ============================================
// QUALIFICATION OPERATIONS
// ============================================

export async function createQualification(
  qualification: Partial<Qualification>
): Promise<{ data: Qualification | null; error: any }> {
  const { data, error } = await postgrestAdmin
    .from('qualifications')
    .insert(qualification)
    .select('*')
    .single()
    .execute()

  return { data, error }
}

export async function getQualificationsByLead(
  leadId: string
): Promise<{ data: Qualification[]; error: any }> {
  const { data, error } = await postgrestAdmin
    .from('qualifications')
    .select('*')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })
    .execute()

  return { data: data || [], error }
}

// ============================================
// MESSAGE OPERATIONS
// ============================================

export async function createMessage(
  message: Partial<Message>
): Promise<{ data: Message | null; error: any }> {
  const { data, error } = await postgrestAdmin
    .from('messages')
    .insert(message)
    .select('*')
    .single()
    .execute()

  return { data, error }
}

export async function getMessagesByLead(
  leadId: string
): Promise<{ data: Message[]; error: any }> {
  const { data, error } = await postgrestAdmin
    .from('messages')
    .select('*')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: true })
    .execute()

  return { data: data || [], error }
}

export async function updateMessageStatus(
  twilioSid: string,
  status: string,
  deliveredAt?: string
): Promise<{ data: Message | null; error: any }> {
  const updates: Partial<Message> = { 
    status: status as Message['status'],
    twilio_status: status,
  }
  
  if (deliveredAt) {
    updates.delivered_at = deliveredAt
  }

  const { data, error } = await postgrestAdmin
    .from('messages')
    .update(updates)
    .eq('twilio_sid', twilioSid)
    .select('*')
    .single()
    .execute()

  return { data, error }
}

// ============================================
// AGENT OPERATIONS
// ============================================

export async function getAgentById(id: string): Promise<{ data: Agent | null; error: any }> {
  const { data, error } = await postgrestAdmin
    .from('real_estate_agents')
    .select('*')
    .eq('id', id)
    .single()
    .execute()

  return { data, error }
}

export async function getAgentByEmail(email: string): Promise<{ data: Agent | null; error: any }> {
  const { data, error } = await postgrestAdmin
    .from('real_estate_agents')
    .select('*')
    .eq('email', email)
    .single()
    .execute()

  return { data, error }
}

export async function getActiveAgents(): Promise<{ data: Agent[]; error: any }> {
  const { data, error } = await postgrestAdmin
    .from('real_estate_agents')
    .select('*')
    .eq('is_active', true)
    .execute()

  return { data: data || [], error }
}

// ============================================
// BOOKING OPERATIONS
// ============================================

export async function createBooking(
  booking: Partial<Booking>
): Promise<{ data: Booking | null; error: any }> {
  const { data, error } = await postgrestAdmin
    .from('bookings')
    .insert(booking)
    .select('*')
    .single()
    .execute()

  return { data, error }
}

export async function getBookingsByLead(
  leadId: string
): Promise<{ data: Booking[]; error: any }> {
  const { data, error } = await postgrestAdmin
    .from('bookings')
    .select('*')
    .eq('lead_id', leadId)
    .order('start_time', { ascending: false })
    .execute()

  return { data: data || [], error }
}

export async function updateBooking(
  id: string,
  updates: Partial<Booking>
): Promise<{ data: Booking | null; error: any }> {
  const { data, error } = await postgrestAdmin
    .from('bookings')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single()
    .execute()

  return { data, error }
}

// ============================================
// TEMPLATE OPERATIONS
// ============================================

export async function getTemplates(
  options: {
    category?: string
    market?: string
    isActive?: boolean
  } = {}
): Promise<{ data: Template[]; error: any }> {
  let query = postgrestAdmin.from('templates').select('*')

  if (options.category) {
    query = query.eq('category', options.category)
  }

  if (options.market) {
    query = query.eq('market', options.market)
  }

  if (options.isActive !== undefined) {
    query = query.eq('is_active', options.isActive)
  }

  const { data, error } = await query.order('category').execute()
  return { data: data || [], error }
}

export async function getTemplateById(id: string): Promise<{ data: Template | null; error: any }> {
  const { data, error } = await postgrestAdmin
    .from('templates')
    .select('*')
    .eq('id', id)
    .single()
    .execute()

  return { data, error }
}

export async function incrementTemplateUsage(id: string): Promise<void> {
  await postgrestAdmin.rpc('increment_template_usage', { template_id: id })
}

// ============================================
// EVENT/LOGGING OPERATIONS
// ============================================

export async function logEvent(
  event: Partial<Event>
): Promise<void> {
  await postgrestAdmin.from('events').insert(event).select('*').single().execute()
}

// ============================================
// DASHBOARD STATS
// ============================================

export async function getDashboardStats(agentId: string): Promise<{ data: DashboardStats | null; error: any }> {
  const { data, error } = await postgrestAdmin
    .from('dashboard_stats')
    .select('*')
    .eq('agent_id', agentId)
    .single()
    .execute()

  return { data, error }
}

export async function getLeadSummary(agentId: string): Promise<{ data: any[]; error: any }> {
  const { data, error } = await postgrestAdmin
    .from('lead_summary')
    .select('*')
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false })
    .limit(50)
    .execute()

  return { data: data || [], error }
}

// ============================================
// REALTIME SUBSCRIPTIONS
// ============================================
// Note: PostgREST does not support realtime subscriptions directly.
// For realtime functionality, you would need to use an alternative approach
// such as WebSockets or polling. These functions are stubs for now.

export function subscribeToLeads(callback: (payload: any) => void) {
  // PostgREST does not support realtime subscriptions
  // You would need to implement polling or WebSocket-based updates
  console.warn('subscribeToLeads: PostgREST does not support realtime subscriptions')
  return {
    unsubscribe: () => {},
  }
}

export function subscribeToMessages(leadId: string, callback: (payload: any) => void) {
  // PostgREST does not support realtime subscriptions
  // You would need to implement polling or WebSocket-based updates
  console.warn('subscribeToMessages: PostgREST does not support realtime subscriptions')
  return {
    unsubscribe: () => {},
  }
}
