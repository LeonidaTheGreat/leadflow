/**
 * Onboarding Telemetry Library
 */

const { createClient } = require('@supabase/supabase-js')

const STEP_INDEX = {
  email_verified: 1,
  fub_connected: 2,
  phone_configured: 3,
  sms_verified: 4,
  aha_completed: 5,
}

const STEP_NAMES = Object.keys(STEP_INDEX)

function isSmokTestAccount(email) {
  if (!email) return false
  return /^smoke-test@/.test(email) || /@leadflow-test\.com$/.test(email)
}

async function logOnboardingEvent(supabase, agentId, stepName, status, metadata = {}) {
  try {
    if (!STEP_NAMES.includes(stepName)) {
      console.error(`[onboarding-telemetry] Invalid step name: ${stepName}`)
      return {
        success: false,
        error: `Invalid step name: ${stepName}. Valid values: ${STEP_NAMES.join(', ')}`,
      }
    }

    const { data: event, error: eventError } = await supabase
      .from('onboarding_events')
      .insert({
        agent_id: agentId,
        step_name: stepName,
        status,
        timestamp: new Date().toISOString(),
        metadata,
      })
      .select()
      .single()

    if (eventError) {
      console.error('[onboarding-telemetry] Event insert error:', eventError)
      return { success: false, error: eventError.message }
    }

    console.log(`[onboarding-telemetry] Event logged: ${agentId} → ${stepName} (${status})`)

    if (status === 'completed') {
      const stepIndex = STEP_INDEX[stepName]
      
      const { data: agent, error: getError } = await supabase
        .from('real_estate_agents')
        .select('onboarding_step')
        .eq('id', agentId)
        .single()

      if (getError) {
        console.error('[onboarding-telemetry] Error fetching agent:', getError)
        return { success: true, event, updateError: getError.message }
      }

      const currentStep = agent?.onboarding_step || 0

      if (stepIndex > currentStep) {
        const { error: updateError } = await supabase
          .from('real_estate_agents')
          .update({
            onboarding_step: stepIndex,
            last_onboarding_step_update: new Date().toISOString(),
          })
          .eq('id', agentId)

        if (updateError) {
          console.error('[onboarding-telemetry] Error updating step:', updateError)
          return { success: true, event, updateError: updateError.message }
        }

        console.log(`[onboarding-telemetry] Step updated: ${agentId} step ${currentStep} → ${stepIndex}`)

        if (stepIndex === 5) {
          const { error: completeError } = await supabase
            .from('real_estate_agents')
            .update({
              onboarding_completed: true,
              onboarding_completed_at: new Date().toISOString(),
            })
            .eq('id', agentId)

          if (completeError) {
            console.warn('[onboarding-telemetry] Error marking onboarding complete:', completeError)
          } else {
            console.log(`[onboarding-telemetry] Onboarding completed: ${agentId}`)
          }
        }
      }
    }

    return { success: true, event }
  } catch (err) {
    console.error('[onboarding-telemetry] Unexpected error:', err)
    return { success: false, error: err.message }
  }
}

async function getFunnelStatus(supabase) {
  try {
    const { data: agents, error } = await supabase
      .from('funnel_real_agents')
      .select('*')
      .order('onboarding_step', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[onboarding-telemetry] Error fetching funnel status:', error)
      return { success: false, error: error.message }
    }

    const agentsWithTimeAtStep = agents.map((a) => {
      const msAtStep = Date.now() - new Date(a.last_onboarding_step_update).getTime()
      const hoursAtStep = msAtStep / (1000 * 60 * 60)
      
      return {
        ...a,
        time_at_step_hours: Math.round(hoursAtStep * 100) / 100,
        is_stuck: hoursAtStep > 24,
      }
    })

    return { success: true, agents: agentsWithTimeAtStep }
  } catch (err) {
    console.error('[onboarding-telemetry] Unexpected error in getFunnelStatus:', err)
    return { success: false, error: err.message }
  }
}

async function getFunnelConversions(supabase) {
  try {
    const { data: conversions, error } = await supabase
      .from('funnel_conversion_rates')
      .select('*')

    if (error) {
      console.error('[onboarding-telemetry] Error fetching conversion rates:', error)
      return { success: false, error: error.message }
    }

    return { success: true, conversions }
  } catch (err) {
    console.error('[onboarding-telemetry] Unexpected error in getFunnelConversions:', err)
    return { success: false, error: err.message }
  }
}

async function checkAndAlertStuckAgents(supabase) {
  try {
    const { data: allAgents, error: queryError } = await supabase
      .from('funnel_real_agents')
      .select('*')
      .order('created_at', { ascending: true })

    if (queryError) {
      return { success: false, error: queryError.message }
    }

    const stuckAgents = allAgents.filter((agent) => {
      const msAtStep = Date.now() - new Date(agent.last_onboarding_step_update).getTime()
      return msAtStep > 24 * 60 * 60 * 1000
    })

    return createStuckAlerts(supabase, stuckAgents)
  } catch (err) {
    console.error('[onboarding-telemetry] Unexpected error in checkAndAlertStuckAgents:', err)
    return { success: false, error: err.message }
  }
}

async function createStuckAlerts(supabase, stuckAgents) {
  const alerts = []

  for (const agent of stuckAgents) {
    try {
      const stepName = Object.entries(STEP_INDEX).find(([, idx]) => idx === agent.onboarding_step)?.[0] || 'unknown'

      const { data: existingAlert } = await supabase
        .from('onboarding_stuck_alerts')
        .select('*')
        .eq('agent_id', agent.id)
        .eq('step_name', stepName)
        .single()

      if (existingAlert) {
        const { data: updated, error: updateError } = await supabase
          .from('onboarding_stuck_alerts')
          .update({
            last_alert_at: new Date().toISOString(),
            alert_count: (existingAlert.alert_count || 1) + 1,
          })
          .eq('id', existingAlert.id)
          .select()
          .single()

        if (!updateError) {
          alerts.push(updated)
        }
      } else {
        const { data: newAlert, error: insertError } = await supabase
          .from('onboarding_stuck_alerts')
          .insert({
            agent_id: agent.id,
            step_name: stepName,
            stuck_since: agent.last_onboarding_step_update,
            metadata: {
              email: agent.email,
              step_index: agent.onboarding_step,
              hours_stuck: Math.round(
                (Date.now() - new Date(agent.last_onboarding_step_update).getTime()) / (1000 * 60 * 60)
              ),
            },
          })
          .select()
          .single()

        if (!insertError) {
          alerts.push(newAlert)
          console.log(`[onboarding-telemetry] Stuck alert created: ${agent.id} on step ${stepName}`)
        }
      }
    } catch (err) {
      console.error(`[onboarding-telemetry] Error creating alert for ${agent.id}:`, err)
    }
  }

  return { success: true, alerts_created: alerts.length, alerts }
}

async function getOnboardingEvents(supabase, agentId = null, limit = 50) {
  try {
    let query = supabase
      .from('onboarding_events')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(limit)

    if (agentId) {
      query = query.eq('agent_id', agentId)
    }

    const { data: events, error } = await query

    if (error) {
      console.error('[onboarding-telemetry] Error fetching events:', error)
      return { success: false, error: error.message }
    }

    return { success: true, events }
  } catch (err) {
    console.error('[onboarding-telemetry] Unexpected error in getOnboardingEvents:', err)
    return { success: false, error: err.message }
  }
}

module.exports = {
  logOnboardingEvent,
  getFunnelStatus,
  getFunnelConversions,
  checkAndAlertStuckAgents,
  getOnboardingEvents,
  isSmokTestAccount,
  STEP_INDEX,
  STEP_NAMES,
}
