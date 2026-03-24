/**
 * Lead Satisfaction Feedback Service
 * Handles satisfaction ping logic and reply classification
 */

import { supabaseAdmin } from '@/lib/supabase'
import { sendSms } from '@/lib/twilio'

// ============================================
// CONSTANTS
// ============================================

export const SATISFACTION_PING_MESSAGE =
  'Was this conversation helpful? Reply YES or NO — it helps us improve. (Reply STOP anytime to unsubscribe)'

export const SATISFACTION_COOLDOWN_MS = 10 * 60 * 1000 // 10 minutes

// ============================================
// RATING CLASSIFICATION
// ============================================

export type SatisfactionRating = 'positive' | 'negative' | 'neutral' | 'unclassified'

const POSITIVE_KEYWORDS = ['yes', 'helpful', 'good', 'great', 'thanks', 'thank', 'awesome', 'perfect', 'excellent', 'amazing']
const NEGATIVE_KEYWORDS = ['no', 'bad', 'annoying', 'quit', 'terrible', 'horrible', 'awful', 'hate', 'useless']
const NEUTRAL_KEYWORDS = ['neutral', 'ok', 'okay', 'fine', 'meh', 'alright', 'average']

/**
 * Classify an inbound reply to a satisfaction ping
 * STOP is handled separately (triggers opt-out flow) — not classified here
 */
export function classifyReply(reply: string): SatisfactionRating {
  const normalized = reply.trim().toLowerCase()

  if (POSITIVE_KEYWORDS.includes(normalized)) return 'positive'
  if (NEGATIVE_KEYWORDS.includes(normalized)) return 'negative'
  if (NEUTRAL_KEYWORDS.includes(normalized)) return 'neutral'

  // Check if any keyword is a prefix of the reply
  for (const kw of POSITIVE_KEYWORDS) {
    if (normalized.startsWith(kw + ' ') || normalized === kw) return 'positive'
  }
  for (const kw of NEGATIVE_KEYWORDS) {
    if (normalized.startsWith(kw + ' ') || normalized === kw) return 'negative'
  }
  for (const kw of NEUTRAL_KEYWORDS) {
    if (normalized.startsWith(kw + ' ') || normalized === kw) return 'neutral'
  }

  return 'unclassified'
}

// ============================================
// PENDING PING DETECTION
// ============================================

/**
 * Check if a lead has a pending (unanswered) satisfaction ping
 */
export async function getPendingSatisfactionPing(leadId: string) {
  const { data, error } = await supabaseAdmin
    .from('lead_satisfaction_events')
    .select('*')
    .eq('lead_id', leadId)
    .not('satisfaction_ping_sent_at', 'is', null)
    .is('rating', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('❌ Error checking pending satisfaction ping:', error)
    return null
  }

  return data
}

// ============================================
// RECORD SATISFACTION REPLY
// ============================================

/**
 * Update a pending satisfaction event with the lead's reply
 */
export async function recordSatisfactionReply(
  eventId: string,
  rawReply: string,
  rating: SatisfactionRating
) {
  const { error } = await supabaseAdmin
    .from('lead_satisfaction_events')
    .update({
      raw_reply: rawReply,
      rating,
    })
    .eq('id', eventId)

  if (error) {
    console.error('❌ Error recording satisfaction reply:', error)
    return false
  }

  console.log(`✅ Satisfaction reply recorded: ${rating} for event ${eventId}`)
  return true
}

// ============================================
// SEND SATISFACTION PING
// ============================================

export interface SendSatisfactionPingOptions {
  leadId: string
  agentId: string | null
  conversationId?: string | null
  phone: string
  lastAiMessageAt?: string | null
  agentSatisfactionPingEnabled?: boolean
}

/**
 * Send a satisfaction ping after an AI conversation exchange
 * Returns true if ping was sent, false if skipped
 */
export async function sendSatisfactionPing(opts: SendSatisfactionPingOptions): Promise<boolean> {
  const {
    leadId,
    agentId,
    conversationId,
    phone,
    lastAiMessageAt,
    agentSatisfactionPingEnabled = true,
  } = opts

  // 1. Check agent setting
  if (!agentSatisfactionPingEnabled) {
    console.log('📊 Satisfaction ping disabled for agent — skipping')
    return false
  }

  // 2. Check cooldown — last AI message must be ≥10 minutes ago
  if (lastAiMessageAt) {
    const lastAiMs = new Date(lastAiMessageAt).getTime()
    const ageMs = Date.now() - lastAiMs
    if (ageMs < SATISFACTION_COOLDOWN_MS) {
      const remainingMin = Math.ceil((SATISFACTION_COOLDOWN_MS - ageMs) / 60000)
      console.log(`⏳ Satisfaction ping cooldown — ${remainingMin}m remaining, skipping`)
      return false
    }
  }

  // 3. Check if a ping was already sent for this conversation
  const pingQuery = supabaseAdmin
    .from('lead_satisfaction_events')
    .select('id')
    .eq('lead_id', leadId)
    .not('satisfaction_ping_sent_at', 'is', null)

  if (conversationId) {
    pingQuery.eq('conversation_id', conversationId)
  } else {
    // No conversation ID — check any pending or answered ping in last 24h
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    pingQuery.gte('created_at', cutoff)
  }

  const { data: existingPings } = await pingQuery.limit(1)
  if (existingPings && existingPings.length > 0) {
    console.log('📊 Satisfaction ping already sent for this conversation — skipping')
    return false
  }

  // 4. Send the ping SMS
  const smsResult = await sendSms({
    to: phone,
    body: SATISFACTION_PING_MESSAGE,
  })

  if (!smsResult.success) {
    console.error('❌ Failed to send satisfaction ping:', smsResult.error)
    return false
  }

  // 5. Create the event record (rating = null, pending reply)
  const now = new Date().toISOString()
  const { error: insertError } = await supabaseAdmin
    .from('lead_satisfaction_events')
    .insert({
      lead_id: leadId,
      agent_id: agentId,
      conversation_id: conversationId || null,
      satisfaction_ping_sent_at: now,
      rating: null,
      created_at: now,
    })

  if (insertError) {
    console.error('❌ Error logging satisfaction ping event:', insertError)
    // Don't fail — ping was still sent
  }

  console.log(`✅ Satisfaction ping sent to lead ${leadId} (SID: ${smsResult.messageSid})`)
  return true
}

// ============================================
// STATS
// ============================================

export interface SatisfactionStats {
  total: number
  positive: number
  negative: number
  neutral: number
  unclassified: number
  positivePct: number
  negativePct: number
  neutralPct: number
  trend: 'improving' | 'declining' | 'stable' | 'insufficient_data'
}

/**
 * Get satisfaction stats for an agent (last 30 days)
 */
export async function getSatisfactionStats(agentId: string): Promise<SatisfactionStats> {
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString()

  // Current 30d
  const { data: current } = await supabaseAdmin
    .from('lead_satisfaction_events')
    .select('rating')
    .eq('agent_id', agentId)
    .not('rating', 'is', null)
    .gte('created_at', thirtyDaysAgo)

  // Prior 30d (for trend)
  const { data: prior } = await supabaseAdmin
    .from('lead_satisfaction_events')
    .select('rating')
    .eq('agent_id', agentId)
    .not('rating', 'is', null)
    .gte('created_at', sixtyDaysAgo)
    .lt('created_at', thirtyDaysAgo)

  const events = current || []
  const total = events.length
  const positive = events.filter((e: any) => e.rating === 'positive').length
  const negative = events.filter((e: any) => e.rating === 'negative').length
  const neutral = events.filter((e: any) => e.rating === 'neutral').length
  const unclassified = events.filter((e: any) => e.rating === 'unclassified').length

  const positivePct = total > 0 ? Math.round((positive / total) * 100) : 0
  const negativePct = total > 0 ? Math.round((negative / total) * 100) : 0
  const neutralPct = total > 0 ? Math.round((neutral / total) * 100) : 0

  // Trend calculation
  let trend: SatisfactionStats['trend'] = 'insufficient_data'
  const priorEvents = prior || []
  if (priorEvents.length >= 3 && total >= 3) {
    const priorPositive = priorEvents.filter((e: any) => e.rating === 'positive').length
    const priorPositivePct = Math.round((priorPositive / priorEvents.length) * 100)
    const diff = positivePct - priorPositivePct
    if (diff >= 5) trend = 'improving'
    else if (diff <= -5) trend = 'declining'
    else trend = 'stable'
  }

  return { total, positive, negative, neutral, unclassified, positivePct, negativePct, neutralPct, trend }
}
