'use strict';

/**
 * OnboardingTelemetryService — Tracks agent onboarding funnel events and stuck-agent alerts
 */

const STEP_INDEX = {
  email_verified: 1,
  fub_connected: 2,
  phone_configured: 3,
  sms_verified: 4,
  aha_completed: 5,
};

const STEP_NAMES = Object.keys(STEP_INDEX);

class OnboardingTelemetryService {
  /**
   * @param {Object} db - PostgREST client (required)
   * @param {Object} [options]
   * @param {Object} [options.logger] - Logger (defaults to console)
   */
  constructor(db, options = {}) {
    this._db = db;
    this.logger = options.logger || console;
  }

  isSmokeTestAccount(email) {
    if (!email) return false;
    return /^smoke-test@/.test(email) || /@leadflow-test\.com$/.test(email);
  }

  /**
   * Log an onboarding step event for an agent
   * @param {string} agentId
   * @param {string} stepName
   * @param {string} status
   * @param {Object} [metadata]
   * @returns {Promise<Object>}
   */
  async logOnboardingEvent(agentId, stepName, status, metadata = {}) {
    try {
      if (!STEP_NAMES.includes(stepName)) {
        this.logger.error(`[OnboardingTelemetryService] Invalid step name: ${stepName}`);
        return {
          success: false,
          error: `Invalid step name: ${stepName}. Valid values: ${STEP_NAMES.join(', ')}`,
        };
      }

      const { data: event, error: eventError } = await this._db
        .from('onboarding_events')
        .insert({
          agent_id: agentId,
          step_name: stepName,
          status,
          timestamp: new Date().toISOString(),
          metadata,
        })
        .select()
        .single();

      if (eventError) {
        this.logger.error('[OnboardingTelemetryService] Event insert error:', eventError);
        return { success: false, error: eventError.message };
      }

      this.logger.log(`[OnboardingTelemetryService] Event logged: ${agentId} → ${stepName} (${status})`);

      if (status === 'completed') {
        const stepIndex = STEP_INDEX[stepName];

        const { data: agent, error: getError } = await this._db
          .from('real_estate_agents')
          .select('onboarding_step')
          .eq('id', agentId)
          .single();

        if (getError) {
          this.logger.error('[OnboardingTelemetryService] Error fetching agent:', getError);
          return { success: true, event, updateError: getError.message };
        }

        const currentStep = agent?.onboarding_step || 0;

        if (stepIndex > currentStep) {
          const { error: updateError } = await this._db
            .from('real_estate_agents')
            .update({
              onboarding_step: stepIndex,
              last_onboarding_step_update: new Date().toISOString(),
            })
            .eq('id', agentId);

          if (updateError) {
            this.logger.error('[OnboardingTelemetryService] Error updating step:', updateError);
            return { success: true, event, updateError: updateError.message };
          }

          this.logger.log(`[OnboardingTelemetryService] Step updated: ${agentId} step ${currentStep} → ${stepIndex}`);

          if (stepIndex === 5) {
            const { error: completeError } = await this._db
              .from('real_estate_agents')
              .update({
                onboarding_completed: true,
                onboarding_completed_at: new Date().toISOString(),
              })
              .eq('id', agentId);

            if (completeError) {
              this.logger.warn('[OnboardingTelemetryService] Error marking onboarding complete:', completeError);
            } else {
              this.logger.log(`[OnboardingTelemetryService] Onboarding completed: ${agentId}`);
            }
          }
        }
      }

      return { success: true, event };
    } catch (err) {
      this.logger.error('[OnboardingTelemetryService] Unexpected error:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Get funnel status for all agents
   * @returns {Promise<Object>}
   */
  async getFunnelStatus() {
    try {
      const { data: agents, error } = await this._db
        .from('funnel_real_agents')
        .select('*')
        .order('onboarding_step', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        this.logger.error('[OnboardingTelemetryService] Error fetching funnel status:', error);
        return { success: false, error: error.message };
      }

      const agentsWithTimeAtStep = agents.map((a) => {
        const msAtStep = Date.now() - new Date(a.last_onboarding_step_update).getTime();
        const hoursAtStep = msAtStep / (1000 * 60 * 60);
        return {
          ...a,
          time_at_step_hours: Math.round(hoursAtStep * 100) / 100,
          is_stuck: hoursAtStep > 24,
        };
      });

      return { success: true, agents: agentsWithTimeAtStep };
    } catch (err) {
      this.logger.error('[OnboardingTelemetryService] Unexpected error in getFunnelStatus:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Get funnel conversion rates
   * @returns {Promise<Object>}
   */
  async getFunnelConversions() {
    try {
      const { data: conversions, error } = await this._db
        .from('funnel_conversion_rates')
        .select('*');

      if (error) {
        this.logger.error('[OnboardingTelemetryService] Error fetching conversion rates:', error);
        return { success: false, error: error.message };
      }

      return { success: true, conversions };
    } catch (err) {
      this.logger.error('[OnboardingTelemetryService] Unexpected error in getFunnelConversions:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Check for stuck agents and create/update alerts
   * @returns {Promise<Object>}
   */
  async checkAndAlertStuckAgents() {
    try {
      const { data: allAgents, error: queryError } = await this._db
        .from('funnel_real_agents')
        .select('*')
        .order('created_at', { ascending: true });

      if (queryError) {
        return { success: false, error: queryError.message };
      }

      const stuckAgents = allAgents.filter((agent) => {
        const msAtStep = Date.now() - new Date(agent.last_onboarding_step_update).getTime();
        return msAtStep > 24 * 60 * 60 * 1000;
      });

      return this.createStuckAlerts(stuckAgents);
    } catch (err) {
      this.logger.error('[OnboardingTelemetryService] Unexpected error in checkAndAlertStuckAgents:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Create or update stuck agent alerts
   * @param {Array} stuckAgents
   * @returns {Promise<Object>}
   */
  async createStuckAlerts(stuckAgents) {
    const alerts = [];

    for (const agent of stuckAgents) {
      try {
        const stepName = Object.entries(STEP_INDEX).find(([, idx]) => idx === agent.onboarding_step)?.[0] || 'unknown';

        const { data: existingAlert } = await this._db
          .from('onboarding_stuck_alerts')
          .select('*')
          .eq('agent_id', agent.id)
          .eq('step_name', stepName)
          .single();

        if (existingAlert) {
          const { data: updated, error: updateError } = await this._db
            .from('onboarding_stuck_alerts')
            .update({
              last_alert_at: new Date().toISOString(),
              alert_count: (existingAlert.alert_count || 1) + 1,
            })
            .eq('id', existingAlert.id)
            .select()
            .single();

          if (!updateError) {
            alerts.push(updated);
          }
        } else {
          const hoursStuck = Math.round(
            (Date.now() - new Date(agent.last_onboarding_step_update).getTime()) / (1000 * 60 * 60)
          );

          const { data: newAlert, error: insertError } = await this._db
            .from('onboarding_stuck_alerts')
            .insert({
              agent_id: agent.id,
              step_name: stepName,
              stuck_since: agent.last_onboarding_step_update,
              metadata: {
                email: agent.email,
                step_index: agent.onboarding_step,
                hours_stuck: hoursStuck,
              },
            })
            .select()
            .single();

          if (!insertError) {
            alerts.push(newAlert);
            this.logger.log(`[OnboardingTelemetryService] Stuck alert created: ${agent.id} on step ${stepName}`);

            const { error: feedbackError } = await this._db
              .from('product_feedback')
              .insert({
                project_id: 'leadflow',
                source: 'telemetry_alert',
                feedback_type: 'ux_issue',
                agent_id: agent.id,
                data: {
                  alert_type: 'stuck_onboarding',
                  agent_id: agent.id,
                  email: agent.email,
                  step_name: stepName,
                  step_index: agent.onboarding_step,
                  stuck_since: agent.last_onboarding_step_update,
                  hours_stuck: hoursStuck,
                  stuck_alert_id: newAlert.id,
                },
              });

            if (feedbackError) {
              this.logger.error(
                `[OnboardingTelemetryService] Failed to insert product_feedback for stuck agent ${agent.id}:`,
                feedbackError.message
              );
            } else {
              this.logger.log(
                `[OnboardingTelemetryService] product_feedback row created for stuck agent ${agent.id} at step ${stepName}`
              );
            }
          }
        }
      } catch (err) {
        this.logger.error(`[OnboardingTelemetryService] Error creating alert for ${agent.id}:`, err);
      }
    }

    return { success: true, alerts_created: alerts.length, alerts };
  }

  /**
   * Get onboarding events (optionally filtered by agent)
   * @param {string|null} [agentId]
   * @param {number} [limit]
   * @returns {Promise<Object>}
   */
  async getOnboardingEvents(agentId = null, limit = 50) {
    try {
      let query = this._db
        .from('onboarding_events')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (agentId) {
        query = query.eq('agent_id', agentId);
      }

      const { data: events, error } = await query;

      if (error) {
        this.logger.error('[OnboardingTelemetryService] Error fetching events:', error);
        return { success: false, error: error.message };
      }

      return { success: true, events };
    } catch (err) {
      this.logger.error('[OnboardingTelemetryService] Unexpected error in getOnboardingEvents:', err);
      return { success: false, error: err.message };
    }
  }
}

OnboardingTelemetryService.STEP_INDEX = STEP_INDEX;
OnboardingTelemetryService.STEP_NAMES = STEP_NAMES;

module.exports = OnboardingTelemetryService;
