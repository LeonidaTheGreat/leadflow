'use strict'
/**
 * Onboarding Telemetry Library — project-root version
 * Standalone (no Next.js path aliases) for genome/server-side use.
 * Dashboard copy: product/lead-response/dashboard/lib/onboarding-telemetry.js
 */
const _log = (level, ...a) => console[level]('[onboarding-telemetry]', ...a)
const logger = { info: (...a) => _log('log', ...a), warn: (...a) => _log('warn', ...a), error: (...a) => _log('error', ...a) }

const STEP_INDEX = { email_verified: 1, fub_connected: 2, phone_configured: 3, sms_verified: 4, aha_completed: 5 }
const STEP_NAMES = Object.keys(STEP_INDEX)

function isSmokTestAccount(email) {
  if (!email) return false
  return /^smoke-test@/.test(email) || /@leadflow-test\.com$/.test(email)
}

async function logOnboardingEvent(supabase, agentId, stepName, status, metadata = {}) {
  try {
    if (!STEP_NAMES.includes(stepName))
      return { success: false, error: `Invalid step name: ${stepName}. Valid values: ${STEP_NAMES.join(', ')}` }
    const { data: event, error: eventError } = await supabase.from('onboarding_events')
      .insert({ agent_id: agentId, step_name: stepName, status, timestamp: new Date().toISOString(), metadata }).select().single()
    if (eventError) { logger.error('Event insert error:', eventError); return { success: false, error: eventError.message } }
    if (status === 'completed') {
      const stepIndex = STEP_INDEX[stepName]
      const { data: agent, error: getError } = await supabase.from('real_estate_agents').select('onboarding_step').eq('id', agentId).single()
      if (getError) return { success: true, event, updateError: getError.message }
      const currentStep = agent?.onboarding_step || 0
      if (stepIndex > currentStep) {
        await supabase.from('real_estate_agents')
          .update({ onboarding_step: stepIndex, last_onboarding_step_update: new Date().toISOString() }).eq('id', agentId)
        if (stepIndex === 5) {
          await supabase.from('real_estate_agents')
            .update({ onboarding_completed: true, onboarding_completed_at: new Date().toISOString() }).eq('id', agentId)
        }
      }
    }
    return { success: true, event }
  } catch (err) { logger.error('Unexpected error:', err); return { success: false, error: err.message } }
}

async function getFunnelStatus(supabase) {
  try {
    const { data: agents, error } = await supabase.from('funnel_real_agents').select('*')
      .order('onboarding_step', { ascending: false }).order('created_at', { ascending: false })
    if (error) return { success: false, error: error.message }
    const r = agents.map((a) => {
      const hrs = (Date.now() - new Date(a.last_onboarding_step_update).getTime()) / 3600000
      return { ...a, time_at_step_hours: Math.round(hrs * 100) / 100, is_stuck: hrs > 24 }
    })
    return { success: true, agents: r }
  } catch (err) { return { success: false, error: err.message } }
}

async function getFunnelConversions(supabase) {
  try {
    const { data: conversions, error } = await supabase.from('funnel_conversion_rates').select('*')
    return error ? { success: false, error: error.message } : { success: true, conversions }
  } catch (err) { return { success: false, error: err.message } }
}

async function checkAndAlertStuckAgents(supabase) {
  try {
    const { data: all, error } = await supabase.from('funnel_real_agents').select('*').order('created_at', { ascending: true })
    if (error) return { success: false, error: error.message }
    const stuck = all.filter((a) => Date.now() - new Date(a.last_onboarding_step_update).getTime() > 24 * 60 * 60 * 1000)
    return createStuckAlerts(supabase, stuck)
  } catch (err) { return { success: false, error: err.message } }
}

async function createStuckAlerts(supabase, stuckAgents) {
  const alerts = []
  for (const agent of stuckAgents) {
    try {
      const stepName = Object.entries(STEP_INDEX).find(([, i]) => i === agent.onboarding_step)?.[0] || 'unknown'
      const { data: ex } = await supabase.from('onboarding_stuck_alerts').select('*').eq('agent_id', agent.id).eq('step_name', stepName).single()
      if (ex) {
        const { data: u } = await supabase.from('onboarding_stuck_alerts').update({ last_alert_at: new Date().toISOString(), alert_count: (ex.alert_count || 1) + 1 }).eq('id', ex.id).select().single()
        if (u) alerts.push(u)
      } else {
        const hrs = Math.round((Date.now() - new Date(agent.last_onboarding_step_update).getTime()) / 3600000)
        const { data: n } = await supabase.from('onboarding_stuck_alerts').insert({ agent_id: agent.id, step_name: stepName, stuck_since: agent.last_onboarding_step_update, metadata: { email: agent.email, step_index: agent.onboarding_step, hours_stuck: hrs } }).select().single()
        if (n) { alerts.push(n); logger.info(`Stuck alert: ${agent.id} on ${stepName}`) }
      }
    } catch (err) { logger.error(`Error for ${agent.id}:`, err) }
  }
  return { success: true, alerts_created: alerts.length, alerts }
}

async function getOnboardingEvents(supabase, agentId = null, limit = 50) {
  try {
    let q = supabase.from('onboarding_events').select('*').order('timestamp', { ascending: false }).limit(limit)
    if (agentId) q = q.eq('agent_id', agentId)
    const { data: events, error } = await q
    return error ? { success: false, error: error.message } : { success: true, events }
  } catch (err) { return { success: false, error: err.message } }
}

module.exports = { logOnboardingEvent, getFunnelStatus, getFunnelConversions, checkAndAlertStuckAgents, createStuckAlerts, getOnboardingEvents, isSmokTestAccount, STEP_INDEX, STEP_NAMES }
