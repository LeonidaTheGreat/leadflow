import axios from 'axios'
import type { FubWebhookPayload, FubLeadData, Lead, Agent } from '@/lib/types'

// ============================================
// FOLLOW UP BOSS API CLIENT
// ============================================

const FUB_API_BASE = process.env.FUB_API_BASE_URL || 'https://api.followupboss.com/v1'
const FUB_API_KEY = process.env.FUB_API_KEY

const fubClient = axios.create({
  baseURL: FUB_API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add request interceptor to set auth header dynamically
fubClient.interceptors.request.use((config) => {
  const apiKey = process.env.FUB_API_KEY
  if (apiKey) {
    const basicAuth = Buffer.from(`${apiKey.trim()}:`).toString('base64')
    config.headers.Authorization = `Basic ${basicAuth}`
  }
  // Also add X-System headers
  config.headers['X-System'] = (process.env.FUB_SYSTEM_NAME || 'LeadFlow-Properties').trim()
  config.headers['X-System-Key'] = (process.env.FUB_SYSTEM_KEY || '').trim()
  return config
})

// ============================================
// LEAD OPERATIONS
// ============================================

/**
 * Fetch lead details from FUB
 */
export async function fetchLeadFromFub(leadId: string): Promise<FubLeadData | null> {
  if (!FUB_API_KEY) return null

  try {
    const response = await fubClient.get(`/people/${leadId}`)
    return response.data
  } catch (error: any) {
    console.error('❌ FUB fetch lead error:', error.message)
    return null
  }
}

/**
 * Create a new lead in FUB
 */
export async function createLeadInFub(leadData: Partial<FubLeadData>): Promise<FubLeadData | null> {
  const apiKey = process.env.FUB_API_KEY
  if (!apiKey) return null

  try {
    const basicAuth = Buffer.from(`${apiKey.trim()}:`).toString('base64')
    const response = await fetch('https://api.followupboss.com/v1/people', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${basicAuth}`,
        'X-System': (process.env.FUB_SYSTEM_NAME || 'LeadFlow-Properties').trim(),
        'X-System-Key': (process.env.FUB_SYSTEM_KEY || '').trim(),
      },
      body: JSON.stringify(leadData),
    })
    
    if (!response.ok) {
      const errorData = await response.text()
      console.error('❌ FUB create lead error:', response.status, errorData)
      return null
    }
    
    const data = await response.json()
    console.log('✅ Lead created in FUB:', data.id)
    return data
  } catch (error: any) {
    console.error('❌ FUB create lead fetch error:', error.message)
    return null
  }
}

/**
 * Update existing lead in FUB
 */
export async function updateLeadInFub(
  leadId: string,
  updates: Partial<FubLeadData>
): Promise<FubLeadData | null> {
  if (!FUB_API_KEY) return null

  try {
    const response = await fubClient.put(`/people/${leadId}`, updates)
    console.log('✅ Lead updated in FUB:', leadId)
    return response.data
  } catch (error: any) {
    console.error('❌ FUB update lead error:', error.message)
    return null
  }
}

/**
 * Search for lead by phone number in FUB
 */
export async function searchLeadByPhone(phone: string): Promise<FubLeadData | null> {
  const apiKey = process.env.FUB_API_KEY
  if (!apiKey) return null

  try {
    const basicAuth = Buffer.from(`${apiKey.trim()}:`).toString('base64')
    const response = await fetch(`https://api.followupboss.com/v1/people?phone=${encodeURIComponent(phone)}`, {
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'X-System': (process.env.FUB_SYSTEM_NAME || 'LeadFlow-Properties').trim(),
        'X-System-Key': (process.env.FUB_SYSTEM_KEY || '').trim(),
      },
    })
    
    if (!response.ok) {
      console.error('❌ FUB search error:', response.status)
      return null
    }
    
    const data = await response.json()
    const people = data.people || []
    return people.length > 0 ? people[0] : null
  } catch (error: any) {
    console.error('❌ FUB search fetch error:', error.message)
    return null
  }
}

// ============================================
// SYNC OPERATIONS
// ============================================

/**
 * Sync local lead to FUB (create or update)
 */
export async function syncLeadToFub(lead: Lead): Promise<{ success: boolean; fubId?: string }> {
  if (!FUB_API_KEY) return { success: false }

  try {
    const fubData = transformToFubLead(lead)

    if (lead.fub_id) {
      // Update existing
      await updateLeadInFub(lead.fub_id, fubData)
      return { success: true, fubId: lead.fub_id }
    } else {
      // Check if lead exists by phone
      const existing = await searchLeadByPhone(lead.phone)
      
      if (existing?.id) {
        // Update existing
        await updateLeadInFub(existing.id, fubData)
        return { success: true, fubId: existing.id }
      } else {
        // Create new
        const created = await createLeadInFub(fubData)
        return { success: !!created, fubId: created?.id }
      }
    }
  } catch (error: any) {
    console.error('❌ FUB sync error:', error.message)
    return { success: false }
  }
}

/**
 * Transform internal lead format to FUB format
 */
function transformToFubLead(lead: Lead): Partial<FubLeadData> {
  return {
    firstName: lead.name?.split(' ')[0] || '',
    lastName: lead.name?.split(' ').slice(1).join(' ') || '',
    phones: lead.phone ? [{value: lead.phone, type: 'Mobile', isPrimary: 1}] : undefined,
    emails: lead.email ? [{value: lead.email, type: 'Home', isPrimary: 1}] : undefined,
    source: lead.source,
    stage: mapStatusToFub(lead.status),
  }
}

/**
 * Map internal status to FUB status
 */
function mapStatusToFub(status: string): string {
  const statusMap: Record<string, string> = {
    'new': 'New Lead',
    'qualified': 'Working',
    'nurturing': 'Nurture',
    'appointment': 'Appointment Set',
    'responded': 'Contacted',
    'closed': 'Closed',
    'dnc': 'Dead',
    'spam': 'Trash',
  }
  return statusMap[status] || 'New Lead'
}

// ============================================
// NOTES & ACTIVITIES
// ============================================

/**
 * Add a note to a lead in FUB
 */
export async function addNoteToLead(
  leadId: string,
  note: string,
  metadata?: Record<string, any>
): Promise<boolean> {
  if (!FUB_API_KEY) return false

  try {
    const noteText = metadata 
      ? `${note}\n\n[Metadata: ${JSON.stringify(metadata)}]`
      : note

    await fubClient.post(`/people/${leadId}/notes`, {
      text: noteText,
      isHtml: false,
    })

    console.log('✅ Note added to FUB lead:', leadId)
    return true
  } catch (error: any) {
    console.error('❌ FUB add note error:', error.message)
    return false
  }
}

/**
 * Log SMS activity in FUB
 */
export async function logSmsActivity(
  leadId: string,
  messageBody: string,
  twilioSid: string,
  status: string
): Promise<boolean> {
  const note = `[AI SMS Sent]\n${messageBody}\n\nTwilio SID: ${twilioSid}\nStatus: ${status}`
  return addNoteToLead(leadId, note, { type: 'sms_ai_response', twilioSid, status })
}

/**
 * Log AI qualification in FUB
 */
export async function logQualification(
  leadId: string,
  qualification: {
    intent?: string | null
    is_qualified?: boolean
    confidence_score?: number | null
    qualification_reason?: string | null
  }
): Promise<boolean> {
  const note = `[AI Qualification]\nIntent: ${qualification.intent || 'unknown'}\nQualified: ${qualification.is_qualified ? 'Yes' : 'No'}\nConfidence: ${Math.round((qualification.confidence_score || 0) * 100)}%\nReason: ${qualification.qualification_reason || 'N/A'}`
  
  return addNoteToLead(leadId, note, { type: 'ai_qualification', ...qualification })
}

// ============================================
// WEBHOOK HANDLING
// ============================================

/**
 * Verify FUB webhook signature
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const crypto = require('crypto')
  
  const hash = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')

  return hash === signature
}

/**
 * Parse FUB webhook payload
 */
export function parseWebhookPayload(body: any): FubWebhookPayload | null {
  if (!body.event || !body.data) {
    return null
  }

  return {
    event: body.event,
    data: body.data,
  }
}

/**
 * Handle FUB webhook event
 */
export async function handleWebhookEvent(payload: FubWebhookPayload): Promise<{
  success: boolean
  action?: string
  leadId?: string
}> {
  const { event, data } = payload

  console.log('📨 FUB Webhook:', event, '- Lead:', data.id)

  switch (event) {
    case 'lead.created':
      return handleLeadCreated(data)
    
    case 'lead.updated':
      return handleLeadUpdated(data)
    
    case 'lead.status_changed':
      return handleStatusChanged(data)
    
    case 'lead.assigned':
      return handleLeadAssigned(data)
    
    default:
      console.log('⚠️  Unhandled FUB event:', event)
      return { success: false }
  }
}

async function handleLeadCreated(data: FubLeadData): Promise<{ success: boolean; action: string; leadId: string }> {
  // This will be handled by the main webhook handler
  // which triggers AI qualification and SMS
  return {
    success: true,
    action: 'lead_created',
    leadId: data.id,
  }
}

async function handleLeadUpdated(data: FubLeadData): Promise<{ success: boolean; action: string; leadId: string }> {
  // Update local cache/context
  return {
    success: true,
    action: 'lead_updated',
    leadId: data.id,
  }
}

async function handleStatusChanged(data: FubLeadData & { oldStatus?: string; newStatus?: string }): Promise<{ success: boolean; action: string; leadId: string }> {
  // Trigger status-specific SMS if needed
  return {
    success: true,
    action: 'status_changed',
    leadId: data.id,
  }
}

async function handleLeadAssigned(data: FubLeadData & { agentId?: string; agentName?: string }): Promise<{ success: boolean; action: string; leadId: string }> {
  // Send agent introduction SMS
  return {
    success: true,
    action: 'lead_assigned',
    leadId: data.id,
  }
}

// ============================================
// BULK OPERATIONS
// ============================================

/**
 * Fetch all leads from FUB (with pagination)
 */
export async function fetchAllLeads(
  options: {
    pageSize?: number
    updatedSince?: Date
  } = {}
): Promise<FubLeadData[]> {
  if (!FUB_API_KEY) return []

  const { pageSize = 100, updatedSince } = options
  const leads: FubLeadData[] = []
  let page = 0

  try {
    while (true) {
      const params: Record<string, any> = {
        page,
        pageSize,
      }

      if (updatedSince) {
        params.updatedSince = updatedSince.toISOString()
      }

      const response = await fubClient.get('/leads', { params })
      const pageLeads = response.data.leads || []

      if (pageLeads.length === 0) break

      leads.push(...pageLeads)
      
      if (pageLeads.length < pageSize) break
      page++
    }

    console.log(`✅ Fetched ${leads.length} leads from FUB`)
    return leads
  } catch (error: any) {
    console.error('❌ FUB fetch all leads error:', error.message)
    return leads
  }
}

/**
 * Sync leads from FUB to local database
 */
export async function syncLeadsFromFub(
  onLead: (lead: FubLeadData) => Promise<void>
): Promise<{ synced: number; errors: number }> {
  const leads = await fetchAllLeads()
  let synced = 0
  let errors = 0

  for (const lead of leads) {
    try {
      await onLead(lead)
      synced++
    } catch (error) {
      console.error('❌ Error syncing lead:', lead.id, error)
      errors++
    }
  }

  return { synced, errors }
}
