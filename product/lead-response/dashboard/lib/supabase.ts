import { createClient } from '@supabase/supabase-js'
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
// SUPABASE CLIENTS
// ============================================
// Build-safe client initialization
// During build, env vars may not be available - use placeholders

const isBuildTime = typeof window === 'undefined' && process.env.NODE_ENV === 'production' && !process.env.VERCEL_ENV

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co').trim()
const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder').trim()
const supabaseServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder').trim()

// Client-side client (for use in components)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Server-side admin client (for use in API routes only)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

// Lazy getters for runtime initialization
export function getSupabaseClient() {
  if (isBuildTime) {
    return supabase
  }
  return supabase
}

export function getSupabaseAdmin() {
  if (isBuildTime) {
    return supabaseAdmin
  }
  return supabaseAdmin
}

// ============================================
// LEAD OPERATIONS
// ============================================

export async function createLead(
  lead: Partial<Lead>
): Promise<{ data: Lead | null; error: any }> {
  const { data, error } = await supabaseAdmin
    .from('leads')
    .insert(lead)
    .select()
    .single()

  return { data, error }
}

export async function getLeadById(id: string): Promise<{ data: Lead | null; error: any }> {
  const { data, error } = await supabaseAdmin
    .from('leads')
    .select('*, agent:real_estate_agents(*), latest_qualification:qualifications(*)')
    .eq('id', id)
    .single()

  return { data, error }
}

export async function getLeadByPhone(phone: string): Promise<{ data: Lead | null; error: any }> {
  const { data, error } = await supabaseAdmin
    .from('leads')
    .select('*')
    .eq('phone', phone)
    .single()

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
  let query = supabaseAdmin
    .from('leads')
    .select('*, agent:real_estate_agents(*), latest_qualification:qualifications(*)', { count: 'exact' })
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

export async function updateLead(
  id: string,
  updates: Partial<Lead>
): Promise<{ data: Lead | null; error: any }> {
  const { data, error } = await supabaseAdmin
    .from('leads')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  return { data, error }
}

// ============================================
// QUALIFICATION OPERATIONS
// ============================================

export async function createQualification(
  qualification: Partial<Qualification>
): Promise<{ data: Qualification | null; error: any }> {
  const { data, error } = await supabaseAdmin
    .from('qualifications')
    .insert(qualification)
    .select()
    .single()

  return { data, error }
}

export async function getQualificationsByLead(
  leadId: string
): Promise<{ data: Qualification[]; error: any }> {
  const { data, error } = await supabaseAdmin
    .from('qualifications')
    .select('*')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })

  return { data: data || [], error }
}

// ============================================
// MESSAGE OPERATIONS
// ============================================

export async function createMessage(
  message: Partial<Message>
): Promise<{ data: Message | null; error: any }> {
  const { data, error } = await supabaseAdmin
    .from('messages')
    .insert(message)
    .select()
    .single()

  return { data, error }
}

export async function getMessagesByLead(
  leadId: string
): Promise<{ data: Message[]; error: any }> {
  const { data, error } = await supabaseAdmin
    .from('messages')
    .select('*')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: true })

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

  const { data, error } = await supabaseAdmin
    .from('messages')
    .update(updates)
    .eq('twilio_sid', twilioSid)
    .select()
    .single()

  return { data, error }
}

// ============================================
// AGENT OPERATIONS
// ============================================

export async function getAgentById(id: string): Promise<{ data: Agent | null; error: any }> {
  const { data, error } = await supabaseAdmin
    .from('real_estate_agents')
    .select('*')
    .eq('id', id)
    .single()

  return { data, error }
}

export async function getAgentByEmail(email: string): Promise<{ data: Agent | null; error: any }> {
  const { data, error } = await supabaseAdmin
    .from('real_estate_agents')
    .select('*')
    .eq('email', email)
    .single()

  return { data, error }
}

export async function getActiveAgents(): Promise<{ data: Agent[]; error: any }> {
  const { data, error } = await supabaseAdmin
    .from('real_estate_agents')
    .select('*')
    .eq('is_active', true)

  return { data: data || [], error }
}

// ============================================
// BOOKING OPERATIONS
// ============================================

export async function createBooking(
  booking: Partial<Booking>
): Promise<{ data: Booking | null; error: any }> {
  const { data, error } = await supabaseAdmin
    .from('bookings')
    .insert(booking)
    .select()
    .single()

  return { data, error }
}

export async function getBookingsByLead(
  leadId: string
): Promise<{ data: Booking[]; error: any }> {
  const { data, error } = await supabaseAdmin
    .from('bookings')
    .select('*')
    .eq('lead_id', leadId)
    .order('start_time', { ascending: false })

  return { data: data || [], error }
}

export async function updateBooking(
  id: string,
  updates: Partial<Booking>
): Promise<{ data: Booking | null; error: any }> {
  const { data, error } = await supabaseAdmin
    .from('bookings')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

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
  let query = supabaseAdmin.from('templates').select('*')

  if (options.category) {
    query = query.eq('category', options.category)
  }

  if (options.market) {
    query = query.eq('market', options.market)
  }

  if (options.isActive !== undefined) {
    query = query.eq('is_active', options.isActive)
  }

  const { data, error } = await query.order('category')
  return { data: data || [], error }
}

export async function getTemplateById(id: string): Promise<{ data: Template | null; error: any }> {
  const { data, error } = await supabaseAdmin
    .from('templates')
    .select('*')
    .eq('id', id)
    .single()

  return { data, error }
}

export async function incrementTemplateUsage(id: string): Promise<void> {
  await supabaseAdmin.rpc('increment_template_usage', { template_id: id })
}

// ============================================
// EVENT/LOGGING OPERATIONS
// ============================================

export async function logEvent(
  event: Partial<Event>
): Promise<void> {
  await supabaseAdmin.from('events').insert(event)
}

// ============================================
// DASHBOARD STATS
// ============================================

export async function getDashboardStats(agentId: string): Promise<{ data: DashboardStats | null; error: any }> {
  const { data, error } = await supabaseAdmin
    .from('dashboard_stats')
    .select('*')
    .eq('agent_id', agentId)
    .single()

  return { data, error }
}

export async function getLeadSummary(agentId: string): Promise<{ data: any[]; error: any }> {
  const { data, error } = await supabaseAdmin
    .from('lead_summary')
    .select('*')
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false })
    .limit(50)

  return { data: data || [], error }
}

// ============================================
// REALTIME SUBSCRIPTIONS
// ============================================

export function subscribeToLeads(callback: (payload: any) => void) {
  return supabase
    .channel('leads')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, callback)
    .subscribe()
}

export function subscribeToMessages(leadId: string, callback: (payload: any) => void) {
  return supabase
    .channel(`messages:${leadId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'messages', filter: `lead_id=eq.${leadId}` },
      callback
    )
    .subscribe()
}