'use strict';

const { logger } = require('../logger');
const log = logger.child('TrialActivationService');
const { buildTrialCTAEmail } = require('../templates/trial-cta-email');

const PENDING_PILOTS_SQL = `
  SELECT id, agent_id, stage, trial_cta_sent, stage_entered_at
  FROM pilot_progress
  WHERE stage = 'signed_up'
    AND trial_cta_sent = false
    AND stage_entered_at < NOW() - INTERVAL '1 minute' * $1
  ORDER BY stage_entered_at ASC
`;

const GET_AGENT_SQL = `
  SELECT id, email, first_name, last_name
  FROM real_estate_agents
  WHERE id = $1
`;

// Note: trial_email_logs table doesn't have pilot_progress_id, so we check via pilot_progress.trial_cta_sent instead
const EMAIL_SENT_SQL = `
  SELECT trial_cta_sent FROM pilot_progress
  WHERE id = $1
`;

const UPDATE_PILOT_PROGRESS_SQL = `
  UPDATE pilot_progress
  SET trial_cta_sent = true,
      trial_cta_sent_at = NOW(),
      stage = 'trial_started',
      updated_at = NOW()
  WHERE id = $1
`;

const UPDATE_AGENT_PILOT_START_SQL = `
  UPDATE real_estate_agents
  SET pilot_started_at = NOW(),
      updated_at = NOW()
  WHERE id = $1
`;

const INSERT_LEAD_SIMULATION_SQL = `
  INSERT INTO lead_simulations (agent_id, lead_name, scenario, status, result)
  VALUES ($1, 'Sample Lead', NULL, 'completed', NULL)
`;

/**
 * TrialActivationService — sends trial CTA emails to newly signed-up pilots and transitions them to trial_started stage.
 */
class TrialActivationService {
  constructor(options = {}) {
    this.pool = options.pool || null;
    this.emailService = options.emailService || null;
    this.appUrl = options.appUrl || process.env.NEXT_PUBLIC_APP_URL || 'https://leadflow-ai-five.vercel.app';
  }

  isDbConfigured() {
    return this.pool !== null;
  }

  isEmailConfigured() {
    return this.emailService !== null && this.emailService.isConfigured();
  }

  async findPendingPilots(minAgeMinutes = 5) {
    if (!this.isDbConfigured()) {
      log.warn('DB not configured');
      return [];
    }

    try {
      const result = await this.pool.query(PENDING_PILOTS_SQL, [minAgeMinutes]);
      log.info('Found pending pilots', { count: result.rows.length });
      return result.rows || [];
    } catch (error) {
      log.error('Error in findPendingPilots', error);
      throw error;
    }
  }

  async getAgent(agentId) {
    if (!this.isDbConfigured()) {
      return null;
    }

    try {
      const result = await this.pool.query(GET_AGENT_SQL, [agentId]);
      return result.rows[0] || null;
    } catch (error) {
      log.error('Error in getAgent', error, { agentId });
      return null;
    }
  }

  async hasEmailBeenSent(pilotId) {
    if (!this.isDbConfigured()) {
      return false;
    }

    try {
      const result = await this.pool.query(EMAIL_SENT_SQL, [pilotId]);
      if (result.rows.length === 0) return false;
      return result.rows[0].trial_cta_sent === true;
    } catch (error) {
      log.warn('Error in hasEmailBeenSent', error, { pilotId });
      return false;
    }
  }

  async sendTrialCTA(agent, pilot) {
    if (!this.isEmailConfigured()) {
      log.warn('Email service not configured');
      return { success: false, error: 'Email service not configured' };
    }

    try {
      const agentName = agent.first_name || agent.email.split('@')[0];
      const emailContent = buildTrialCTAEmail(agentName, this.appUrl);

      const sendResult = await this.emailService.send({
        to: agent.email,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
        tags: [{ name: 'campaign', value: 'trial-activation' }],
        failIfUnconfigured: false,
      });

      if (!sendResult.success) {
        log.error('Failed to send trial CTA email', { email: agent.email, error: sendResult.error });
        return { success: false, error: sendResult.error };
      }

      log.info('Sent trial CTA email', { email: agent.email, messageId: sendResult.resend_id });
      return { success: true, messageId: sendResult.resend_id };
    } catch (error) {
      log.error('Error in sendTrialCTA', error, { email: agent.email });
      return { success: false, error: 'Failed to send email' };
    }
  }

  async createLeadSimulation(agentId) {
    if (!this.isDbConfigured()) {
      log.info('Lead simulation logged (mock)', { agentId });
      return { success: true };
    }

    try {
      await this.pool.query(INSERT_LEAD_SIMULATION_SQL, [agentId]);
      log.info('Created lead simulation', { agentId });
      return { success: true };
    } catch (error) {
      log.error('Error in createLeadSimulation', error, { agentId });
      return { success: false, error };
    }
  }

  async updatePilotProgress(pilotId) {
    if (!this.isDbConfigured()) {
      log.info('Pilot progress updated (mock)', { pilotId });
      return { success: true };
    }

    try {
      await this.pool.query(UPDATE_PILOT_PROGRESS_SQL, [pilotId]);
      log.info('Updated pilot progress', { pilotId });
      return { success: true };
    } catch (error) {
      log.error('Error in updatePilotProgress', error, { pilotId });
      return { success: false, error };
    }
  }

  async updateAgentPilotStartDate(agentId) {
    if (!this.isDbConfigured()) {
      log.info('Agent pilot start date updated (mock)', { agentId });
      return { success: true };
    }

    try {
      await this.pool.query(UPDATE_AGENT_PILOT_START_SQL, [agentId]);
      log.info('Updated agent pilot start date', { agentId });
      return { success: true };
    } catch (error) {
      log.error('Error in updateAgentPilotStartDate', error, { agentId });
      return { success: false, error };
    }
  }

  async activatePilot(pilot, agent) {
    try {
      // Send email
      const emailResult = await this.sendTrialCTA(agent, pilot);
      if (!emailResult.success) {
        return {
          success: false,
          error: `Failed to send email: ${emailResult.error}`,
        };
      }

      // Update pilot progress
      const progressResult = await this.updatePilotProgress(pilot.id);
      if (!progressResult.success) {
        return {
          success: false,
          error: 'Failed to update pilot progress',
        };
      }

      // Update agent pilot start date
      const agentResult = await this.updateAgentPilotStartDate(agent.id);
      if (!agentResult.success) {
        return {
          success: false,
          error: 'Failed to update agent pilot start date',
        };
      }

      // Create lead simulation
      const simResult = await this.createLeadSimulation(agent.id);
      if (!simResult.success) {
        log.warn('Failed to create lead simulation, but pilot activated', { agentId: agent.id });
      }

      log.info('Activated pilot', { pilotId: pilot.id, agentId: agent.id, email: agent.email });
      return { success: true };
    } catch (error) {
      log.error('Error in activatePilot', error, { pilotId: pilot.id, agentId: agent.id });
      return { success: false, error: 'Failed to activate pilot' };
    }
  }

  async processActivations() {
    log.info('Starting pilot activation process');
    const results = {
      processed: 0,
      activated: 0,
      skipped: 0,
      failed: 0,
      errors: [],
    };

    try {
      const pilots = await this.findPendingPilots(5);
      results.processed = pilots.length;

      for (const pilot of pilots) {
        try {
          // Check if email already sent (idempotency)
          const emailSent = await this.hasEmailBeenSent(pilot.id);
          if (emailSent) {
            log.info('Email already sent for pilot, skipping', { pilotId: pilot.id });
            results.skipped++;
            continue;
          }

          // Get agent details
          const agent = await this.getAgent(pilot.agent_id);
          if (!agent) {
            log.error('Agent not found, skipping', { agentId: pilot.agent_id });
            results.failed++;
            results.errors.push({
              pilotId: pilot.id,
              error: 'Agent not found',
            });
            continue;
          }

          // Activate pilot
          const activateResult = await this.activatePilot(pilot, agent);
          if (activateResult.success) {
            results.activated++;
          } else {
            results.failed++;
            results.errors.push({
              pilotId: pilot.id,
              email: agent.email,
              error: activateResult.error,
            });
          }
        } catch (error) {
          log.error('Error processing pilot', error, { pilotId: pilot.id });
          results.failed++;
          results.errors.push({
            pilotId: pilot.id,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      log.info('Pilot activation process complete', results);
      return results;
    } catch (error) {
      log.error('Error in processActivations', error);
      results.errors.push({ error: 'Failed to process activations' });
      return results;
    }
  }
}

module.exports = TrialActivationService;
