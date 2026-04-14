'use strict';

const { getPool } = require('../db');
const { logger } = require('../logger');
const log = logger.child('dead-letter');

/**
 * Write a dead letter record for a failed webhook processing attempt.
 * Best-effort: failures are logged but never thrown.
 *
 * @param {string} source       - Origin system (e.g. 'stripe', 'calcom', 'fub')
 * @param {string} eventType    - Event type string from the webhook payload
 * @param {Object} payload      - Full webhook payload object
 * @param {string} errorMessage - Error message from the caught exception
 */
async function writeDeadLetter(source, eventType, payload, errorMessage) {
  try {
    const pool = getPool();
    await pool.query(
      'INSERT INTO webhook_dead_letters (source, event_type, payload, error_message) VALUES ($1, $2, $3, $4)',
      [source, eventType, JSON.stringify(payload), errorMessage]
    );
  } catch (dbErr) {
    log.error('Dead letter DB write failed', dbErr, { source, eventType });
  }
}

module.exports = { writeDeadLetter };
