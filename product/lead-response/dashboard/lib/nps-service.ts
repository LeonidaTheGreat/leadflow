/**
 * NPS Survey Service
 * Handles NPS survey scheduling, token generation, and response processing
 * feat-nps-agent-feedback
 */

import { createClient } from '@/lib/db'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'

// Initialize Supabase client
const dbUrl = process.env.NEXT_PUBLIC_API_URL || ''
const dbKey = process.env.API_SECRET_KEY || ''

const supabase = createClient(dbUrl, dbKey)

// JWT Configuration
const JWT_SECRET = process.env.NPS_SURVEY_JWT_SECRET || process.env.JWT_SECRET || 'fallback-secret-change-in-production'
const TOKEN_EXPIRY_DAYS = 7

// Survey timing configuration
const FIRST_SURVEY_DAYS = 14
const RECURRING_SURVEY_DAYS = 90
const PROMPT_DISMISSAL_DAYS = 30

// ==================== TYPES ====================

export interface NPSResponse {
  id: string
  agent_id: string
  score: number
  open_text: string | null
  survey_trigger: 'auto_14d' | 'auto_90d' | 'manual'
  responded_via: 'email' | 'in_app'
  token_hash: string | null
  created_at: string
}

export interface SurveySchedule {
  agent_id: string
  next_survey_at: string
  last_survey_at: string | null
  survey_count: number
  updated_at: string
}

export interface ProductFeedback {
  id: string
  agent_id: string | null
  source: 'agent_self_report' | 'churn_risk' | 'nps_followup'
  feedback_type: 'praise' | 'bug' | 'idea' | 'frustration' | 'churn_risk'
  content: string
  metadata: Record<string, any>
  is_processed: boolean
  processed_at: string | null
  created_at: string
}

export interface NPSTokenPayload {
  agent_id: string
  trigger: 'auto_14d' | 'auto_90d' | 'manual'
  iat: number
  exp: number
}

export interface NPSStats {
  currentNPS: number
  responseCount: number
  previousPeriodCount: number
  promoters: number
  passives: number
  detractors: number
  recentResponses: NPSResponse[]
}

// ==================== TOKEN MANAGEMENT ====================

/**
 * Generate a signed JWT token for NPS survey link
 */
export function generateSurveyToken(
  agentId: string,
  trigger: 'auto_14d' | 'auto_90d' | 'manual'
): string {
  const payload: Omit<NPSTokenPayload, 'iat' | 'exp'> = {
    agent_id: agentId,
    trigger,
  }

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: `${TOKEN_EXPIRY_DAYS}d`,
  })
}

/**
 * Verify and decode a survey token
 */
export function verifySurveyToken(token: string): NPSTokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as NPSTokenPayload
  } catch (error) {
    return null
  }
}

/**
 * Hash a token for storage (prevents replay)
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

/**
 * Check if a token has already been used
 */
export async function isTokenUsed(tokenHash: string): Promise<boolean> {
  const { data } = await supabase
    .from('nps_survey_tokens')
    .select('used_at')
    .eq('token_hash', tokenHash)
    .single()

  return !!data?.used_at
}

/**
 * Mark a token as used
 */
export async function markTokenUsed(
  tokenHash: string,
  agentId: string
): Promise<void> {
  await supabase
    .from('nps_survey_tokens')
    .upsert({
      token_hash: tokenHash,
      agent_id: agentId,
      expires_at: new Date(Date.now() + TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString(),
      used_at: new Date().toISOString(),
    })
}

// ==================== SURVEY SCHEDULING ====================

/**
 * Initialize survey schedule for a new agent
 */
export async function initializeSurveySchedule(agentId: string): Promise<void> {
  const nextSurveyAt = new Date()
  nextSurveyAt.setDate(nextSurveyAt.getDate() + FIRST_SURVEY_DAYS)

  await supabase.from('agent_survey_schedule').upsert({
    agent_id: agentId,
    next_survey_at: nextSurveyAt.toISOString(),
    survey_count: 0,
  })
}

/**
 * Get agents due for NPS survey
 */
export async function getAgentsDueForSurvey(): Promise<
  { agent_id: string; email: string; name: string; trigger: 'auto_14d' | 'auto_90d' }[]
> {
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('agent_survey_schedule')
    .select(`
      agent_id,
      survey_count,
      real_estate_agents!inner(email, first_name, last_name)
    `)
    .lte('next_survey_at', now)
    .eq('real_estate_agents.status', 'active')

  if (error || !data) {
    console.error('Error fetching agents due for survey:', error)
    return []
  }

  return data.map((row: any) => ({
    agent_id: row.agent_id,
    email: row.real_estate_agents.email,
    name: `${row.real_estate_agents.first_name || ''} ${row.real_estate_agents.last_name || ''}`.trim(),
    trigger: row.survey_count === 0 ? 'auto_14d' : 'auto_90d',
  }))
}

/**
 * Update survey schedule after a response
 */
export async function updateSurveyScheduleAfterResponse(
  agentId: string,
  trigger: 'auto_14d' | 'auto_90d' | 'manual'
): Promise<void> {
  const now = new Date()
  const nextSurveyAt = new Date()
  nextSurveyAt.setDate(now.getDate() + RECURRING_SURVEY_DAYS)

  const { data: existing } = await supabase
    .from('agent_survey_schedule')
    .select('survey_count')
    .eq('agent_id', agentId)
    .single()

  await supabase.from('agent_survey_schedule').upsert({
    agent_id: agentId,
    last_survey_at: now.toISOString(),
    next_survey_at: nextSurveyAt.toISOString(),
    survey_count: (existing?.survey_count || 0) + 1,
    updated_at: now.toISOString(),
  })
}

// ==================== RESPONSE HANDLING ====================

/**
 * Submit an NPS response
 */
export async function submitNPSResponse(
  agentId: string,
  score: number,
  openText: string | null,
  trigger: 'auto_14d' | 'auto_90d' | 'manual',
  respondedVia: 'email' | 'in_app',
  tokenHash?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Insert the NPS response
    const { error: responseError } = await supabase.from('agent_nps_responses').insert({
      agent_id: agentId,
      score,
      open_text: openText,
      survey_trigger: trigger,
      responded_via: respondedVia,
      token_hash: tokenHash || null,
    })

    if (responseError) {
      console.error('Error inserting NPS response:', responseError)
      return { success: false, error: 'Failed to save response' }
    }

    // Update survey schedule
    await updateSurveyScheduleAfterResponse(agentId, trigger)

    // If score is 0-6 (Detractor), create churn risk alert
    if (score <= 6) {
      await createChurnRiskAlert(agentId, score, openText)
    }

    return { success: true }
  } catch (error: any) {
    console.error('Error submitting NPS response:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Create a churn risk alert for detractor scores
 */
export async function createChurnRiskAlert(
  agentId: string,
  score: number,
  feedbackText: string | null
): Promise<void> {
  const content = feedbackText
    ? `NPS Score: ${score}/10. Feedback: ${feedbackText}`
    : `NPS Score: ${score}/10. No additional feedback provided.`

  await supabase.from('product_feedback').insert({
    agent_id: agentId,
    source: 'churn_risk',
    feedback_type: 'churn_risk',
    content,
    metadata: {
      nps_score: score,
      category: score <= 6 ? 'detractor' : score <= 8 ? 'passive' : 'promoter',
    },
    is_processed: false,
  })
}

// ==================== FEEDBACK HANDLING ====================

/**
 * Submit general product feedback
 */
export async function submitProductFeedback(
  agentId: string,
  feedbackType: 'praise' | 'bug' | 'idea' | 'frustration',
  content: string,
  metadata?: Record<string, any>
): Promise<{ success: boolean; error?: string; feedbackId?: string }> {
  try {
    const { data, error } = await supabase
      .from('product_feedback')
      .insert({
        agent_id: agentId,
        source: 'agent_self_report',
        feedback_type: feedbackType,
        content,
        metadata: metadata || {},
        is_processed: false,
      })
      .select('id')
      .single()

    if (error) {
      console.error('Error inserting product feedback:', error)
      return { success: false, error: 'Failed to save feedback' }
    }

    return { success: true, feedbackId: data.id }
  } catch (error: any) {
    console.error('Error submitting product feedback:', error)
    return { success: false, error: error.message }
  }
}

// ==================== IN-APP PROMPT MANAGEMENT ====================

/**
 * Check if agent should see NPS prompt
 */
export async function shouldShowNPSPrompt(agentId: string): Promise<{
  shouldShow: boolean
  trigger?: 'auto_14d' | 'auto_90d'
}> {
  const now = new Date().toISOString()

  // Check if there's a pending survey
  const { data: schedule } = await supabase
    .from('agent_survey_schedule')
    .select('*')
    .eq('agent_id', agentId)
    .lte('next_survey_at', now)
    .single()

  if (!schedule) {
    return { shouldShow: false }
  }

  // Check if already responded in last 7 days
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const { data: recentResponse } = await supabase
    .from('agent_nps_responses')
    .select('id')
    .eq('agent_id', agentId)
    .gte('created_at', sevenDaysAgo.toISOString())
    .single()

  if (recentResponse) {
    return { shouldShow: false }
  }

  // Check if dismissed recently
  const { data: dismissal } = await supabase
    .from('nps_prompt_dismissals')
    .select('*')
    .eq('agent_id', agentId)
    .gt('dismissed_until', now)
    .order('dismissed_at', { ascending: false })
    .limit(1)
    .single()

  if (dismissal) {
    return { shouldShow: false }
  }

  const trigger = schedule.survey_count === 0 ? 'auto_14d' : 'auto_90d'
  return { shouldShow: true, trigger }
}

/**
 * Dismiss NPS prompt
 */
export async function dismissNPSPrompt(
  agentId: string,
  trigger: 'auto_14d' | 'auto_90d'
): Promise<void> {
  const dismissedUntil = new Date()
  dismissedUntil.setDate(dismissedUntil.getDate() + PROMPT_DISMISSAL_DAYS)

  await supabase.from('nps_prompt_dismissals').insert({
    agent_id: agentId,
    dismissed_until: dismissedUntil.toISOString(),
    trigger_type: trigger,
  })
}

// ==================== ADMIN STATS ====================

/**
 * Get NPS statistics for admin dashboard
 */
export async function getNPSStats(): Promise<NPSStats> {
  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

  const previousPeriodStart = new Date()
  previousPeriodStart.setDate(previousPeriodStart.getDate() - 180)

  // Get current period responses
  const { data: currentResponses } = await supabase
    .from('agent_nps_responses')
    .select('*')
    .gte('created_at', ninetyDaysAgo.toISOString())

  // Get previous period responses
  const { data: previousResponses } = await supabase
    .from('agent_nps_responses')
    .select('*')
    .gte('created_at', previousPeriodStart.toISOString())
    .lt('created_at', ninetyDaysAgo.toISOString())

  // Get recent responses with agent info
  const { data: recentResponses } = await supabase
    .from('agent_nps_responses')
    .select(`
      *,
      real_estate_agents(first_name, last_name, email)
    `)
    .order('created_at', { ascending: false })
    .limit(20)

  const current = currentResponses || []
  const previous = previousResponses || []

  // Calculate NPS
  const promoters = current.filter((r: NPSResponse) => r.score >= 9).length
  const passives = current.filter((r: NPSResponse) => r.score >= 7 && r.score <= 8).length
  const detractors = current.filter((r: NPSResponse) => r.score <= 6).length

  const total = current.length
  const currentNPS = total > 0 ? Math.round(((promoters - detractors) / total) * 100) : 0

  return {
    currentNPS,
    responseCount: current.length,
    previousPeriodCount: previous.length,
    promoters,
    passives,
    detractors,
    recentResponses: recentResponses || [],
  }
}

/**
 * Get unprocessed churn risk alerts
 */
export async function getUnprocessedChurnRisks(): Promise<ProductFeedback[]> {
  const { data } = await supabase
    .from('product_feedback')
    .select(`
      *,
      real_estate_agents(first_name, last_name, email)
    `)
    .eq('feedback_type', 'churn_risk')
    .eq('is_processed', false)
    .order('created_at', { ascending: true })

  return data || []
}

/**
 * Mark churn risk as processed
 */
export async function markChurnRiskProcessed(feedbackId: string): Promise<void> {
  await supabase
    .from('product_feedback')
    .update({
      is_processed: true,
      processed_at: new Date().toISOString(),
    })
    .eq('id', feedbackId)
}
