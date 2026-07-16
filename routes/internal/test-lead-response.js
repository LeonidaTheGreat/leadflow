/**
 * POST /api/internal/test-lead-response
 *
 * Admin test trigger — fires a synthetic lead through the AI response engine
 * without calling FUB or Twilio. Validates the full AI path end-to-end.
 *
 * Request body (all optional):
 *   agentId   {string}  UUID of the real_estate_agents row to associate with
 *
 * Response:
 *   { response_text, response_time_ms, ai_generated, conversation_id }
 *
 * Auth: x-api-key (LEADFLOW_API_KEY)
 */

'use strict';

const express = require('express');
const router = express.Router();
const requireApiKey = require('../../lib/middleware/require-api-key');
const FUBService = require('../../lib/services/FUBService');
const FirstResponseNotificationService = require('../../lib/services/FirstResponseNotificationService');
const { getPool } = require('../../lib/db');
const { logger } = require('../../lib/logger');

const log = logger.child('test-lead-response');

const SAMPLE_LEAD = {
  id: 'test-lead-001',
  firstName: 'Test Lead',
  phoneNumber: '+15550000000',
  source: '123 Main St, Demo City',
  propertyInterest: '3BR house under $800k',
  assignedTo: { id: null, name: null },
  consents: { sms: true },
};

router.post('/api/internal/test-lead-response', requireApiKey, async (req, res) => {
  const { agentId } = req.body || {};
  const startMs = Date.now();

  let agentName = process.env.AGENT_NAME || 'your agent';
  let agentRow = null;

  // Resolve agent if ID provided
  if (agentId) {
    try {
      const pool = getPool();
      const { rows } = await pool.query(
        'SELECT id, first_name, last_name, email, phone_number FROM real_estate_agents WHERE id = $1',
        [agentId]
      );
      if (rows.length) {
        agentRow = rows[0];
        agentName = `${agentRow.first_name} ${agentRow.last_name}`.trim() || agentName;
      }
    } catch (err) {
      log.warn('Could not resolve agent, using defaults', { error: err.message });
    }
  }

  const lead = {
    ...SAMPLE_LEAD,
    assignedTo: { id: agentId || null, name: agentName },
  };

  // Use FUBService with no-op SMS and satisfaction handlers to avoid real sends
  const fubService = new FUBService({
    registerEventHandlers: false,
    sendSmsViatwilio: async () => ({ sid: `SM_test_${Date.now()}`, status: 'queued' }),
    scheduleSatisfactionPing: () => {},
    createLeadSequence: async () => null,
    findLeadByFubId: async () => null,
    logger: log,
  });

  let aiResponse;
  try {
    aiResponse = await fubService.generateAiSmsResponse(lead, {
      trigger: 'initial_response',
      agentName,
    });
  } catch (err) {
    log.error('AI response generation failed', err);
    return res.status(500).json({ error: 'AI response failed', detail: err.message });
  }

  const responseTimeMs = Date.now() - startMs;

  // Insert conversation row so the acceptance test can assert on it
  let conversationId = null;
  if (agentId) {
    try {
      const pool = getPool();
      const { rows } = await pool.query(
        `INSERT INTO conversations (agent_id, message_body, trigger_type, status, created_at, updated_at)
         VALUES ($1, $2, 'test_ai_response', 'sent', NOW(), NOW())
         RETURNING id`,
        [agentId, aiResponse.message]
      );
      conversationId = rows[0]?.id || null;

      // Fire first-response notification if this is agent's first conversation
      const notifier = new FirstResponseNotificationService();
      notifier.notify(agentId, {
        leadName: SAMPLE_LEAD.firstName,
        responseTimeMs,
        messageBody: aiResponse.message,
      }).catch(err => log.warn('First-response notification failed', { error: err.message }));
    } catch (err) {
      log.warn('Conversation insert failed', { error: err.message });
    }
  }

  return res.json({
    response_text: aiResponse.message,
    response_time_ms: responseTimeMs,
    ai_generated: aiResponse.ai_generated === true,
    conversation_id: conversationId,
    trigger: aiResponse.trigger,
  });
});

module.exports = router;
