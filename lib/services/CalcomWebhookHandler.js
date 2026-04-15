'use strict';

/**
 * CalcomWebhookHandler — route-facing class for Cal.com webhooks.
 *
 * Responsibilities:
 *   - HMAC-SHA256 signature verification (verifyWebhookSignature)
 *   - HTTP request parsing and response (calcomWebhookHandler)
 *   - DB client initialisation (lazy, from config)
 *   - Delegating event processing to CalcomEventProcessor
 *
 * Event-specific booking logic lives in CalcomEventProcessor.
 */

const crypto = require('crypto');
const { createClient } = require('../db');
const { logger } = require('../logger');
const config = require('../config');
const { createLeadSequence } = require('./SequenceService');
const CalcomEventProcessor = require('./CalcomEventProcessor');
const { withRetry } = require('../utils/circuit-breaker');

const log = logger.child('CalcomWebhookHandler');

// Retry configuration constants — kept for backward compat with existing callers
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
};

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function calculateBackoffDelay(attempt) {
  const exponentialDelay = RETRY_CONFIG.baseDelayMs * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt);
  const cappedDelay = Math.min(exponentialDelay, RETRY_CONFIG.maxDelayMs);
  const jitter = cappedDelay * 0.25 * (Math.random() * 2 - 1);
  return Math.floor(cappedDelay + jitter);
}

class CalcomWebhookHandler {
  /**
   * @param {Object} options
   * @param {Object} [options.db]                   - DB client override (tests)
   * @param {Function} [options.createLeadSequence]  - Sequence factory override (tests)
   */
  constructor(options = {}) {
    this._db = options.db || null;
    this._createLeadSequence = options.createLeadSequence || createLeadSequence;
  }

  // ===== DB INITIALISATION =====

  getDb() {
    if (!this._db) {
      const apiUrl = config.calcom.apiUrl || config.app.appUrl;
      const apiKey = config.app.apiKey;

      if (apiUrl && apiKey) {
        this._db = createClient(apiUrl, apiKey);
      }
    }
    return this._db;
  }

  /**
   * Get (or lazily initialise) a CalcomEventProcessor bound to the current DB.
   */
  _getProcessor() {
    const db = this.getDb();
    if (!db) {
      throw new Error('CalcomWebhookHandler: DB client could not be initialised — check CAL_API_URL and API_SECRET_KEY');
    }
    return new CalcomEventProcessor({ db, createLeadSequence: this._createLeadSequence });
  }

  // ===== SIGNATURE VERIFICATION =====

  /**
   * Verify a Cal.com webhook HMAC-SHA256 signature.
   *
   * @param {string|Object} payload   - Raw body string or parsed object
   * @param {string}        signature - Value of x-cal-signature-256 header
   * @returns {boolean}
   */
  verifyWebhookSignature(payload, signature) {
    // Read directly from process.env so the value reflects any runtime override
    // (e.g. tests that mutate process.env after module load).
    // config.calcom.webhookSecret is resolved at import time and cannot be changed.
    const secret = process.env.CAL_WEBHOOK_SECRET || config.calcom.webhookSecret;

    if (!secret) {
      log.error('CAL_WEBHOOK_SECRET not configured — rejecting webhook');
      return false;
    }

    const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payloadString)
      .digest('hex');

    const cleanSignature = signature.replace('sha256=', '');

    if (expectedSignature.length !== cleanSignature.length) {
      log.error('Webhook signature length mismatch');
      return false;
    }

    const isValid = crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(cleanSignature)
    );

    if (!isValid) {
      log.error('Webhook signature verification failed');
    }

    return isValid;
  }

  // ===== EVENT DISPATCH =====

  /**
   * Handle a normalised Cal.com webhook event.
   *
   * @param {Object} event - Webhook event object (triggerEvent or type required)
   * @returns {Promise<{received: boolean, type: string, processedAt: string}>}
   */
  async handleCalWebhook(event) {
    const eventType = event.triggerEvent || event.type;

    // Known event types require DB access — fail early with a clear error if DB unavailable.
    // Unknown/unhandled events are logged and short-circuited without touching the DB.
    const KNOWN_EVENTS = new Set([
      'BOOKING_CREATED', 'booking.created',
      'BOOKING_RESCHEDULED', 'booking.rescheduled',
      'BOOKING_CANCELLED', 'booking.cancelled',
      'BOOKING_REJECTED', 'booking.rejected',
      'MEETING_ENDED', 'meeting.ended',
    ]);

    if (!KNOWN_EVENTS.has(eventType)) {
      log.info('Unhandled Cal.com webhook type', { eventType });
      return { received: true, type: eventType, processedAt: new Date().toISOString() };
    }

    const processor = this._getProcessor();
    return processor.process(event);
  }

  // ===== HTTP HANDLER =====

  /**
   * Express middleware handler — parses body, verifies signature, dispatches.
   */
  calcomWebhookHandler(req, res) {
    const signature =
      req.headers['x-cal-signature-256'] ||
      req.headers['cal-signature-256'] ||
      req.headers['cal-signature'];

    let event;
    if (req.body && typeof req.body === 'string') {
      try {
        event = JSON.parse(req.body);
      } catch (e) {
        return res.status(400).send('Invalid JSON payload');
      }
    } else {
      event = req.body;
    }

    const rawBody = req.body && typeof req.body === 'string'
      ? req.body
      : JSON.stringify(req.body);

    if (!this.verifyWebhookSignature(rawBody, signature || '')) {
      return res.status(401).send('Invalid webhook signature');
    }

    if (!event || (!event.triggerEvent && !event.type)) {
      return res.status(400).send('Invalid webhook payload');
    }

    this.handleCalWebhook(event)
      .then(() => res.json({ received: true, processed: true }))
      .catch(err => {
        log.error('Webhook processing error', err);
        res.status(500).send('Webhook processing failed');
      });
  }

  // ===== BACKWARD-COMPAT DELEGATION =====
  // These methods are kept so existing code that calls handler.handleBookingCreated() etc.
  // continues to work. They delegate to a processor with the current DB.

  async handleBookingCreated(booking) {
    return this._getProcessor().handleBookingCreated(booking);
  }

  async handleBookingRescheduled(booking) {
    return this._getProcessor().handleBookingRescheduled(booking);
  }

  async handleBookingCancelled(booking) {
    return this._getProcessor().handleBookingCancelled(booking);
  }

  async handleMeetingEnded(booking) {
    return this._getProcessor().handleMeetingEnded(booking);
  }

  async findOrCreateLead(attendee, db) {
    const proc = db
      ? new CalcomEventProcessor({ db, createLeadSequence: this._createLeadSequence })
      : this._getProcessor();
    return proc.findOrCreateLead(attendee, db || this.getDb());
  }

  async findAgentForBooking(booking, db) {
    const proc = db
      ? new CalcomEventProcessor({ db, createLeadSequence: this._createLeadSequence })
      : this._getProcessor();
    return proc.findAgentForBooking(booking, db || this.getDb());
  }

  async logBookingActivity(activityData, db) {
    const proc = db
      ? new CalcomEventProcessor({ db, createLeadSequence: this._createLeadSequence })
      : this._getProcessor();
    return proc.logBookingActivity(activityData, db || this.getDb());
  }

  async sendBookingConfirmationSMS(bookingData) {
    return this._getProcessor().sendBookingConfirmationSMS(bookingData);
  }

  async sendRescheduleConfirmationSMS(bookingData) {
    return this._getProcessor().sendRescheduleConfirmationSMS(bookingData);
  }

  async scheduleBookingReminders(booking, db) {
    const proc = db
      ? new CalcomEventProcessor({ db, createLeadSequence: this._createLeadSequence })
      : this._getProcessor();
    return proc.scheduleBookingReminders(booking, db || this.getDb());
  }

  async cancelExistingReminders(bookingId, db) {
    const proc = db
      ? new CalcomEventProcessor({ db, createLeadSequence: this._createLeadSequence })
      : this._getProcessor();
    return proc.cancelExistingReminders(bookingId, db || this.getDb());
  }

  async triggerPostMeetingFollowUp(booking) {
    return this._getProcessor().triggerPostMeetingFollowUp(booking);
  }

  async withRetry(fn, options = {}) {
    return withRetry(fn, options);
  }

  sleep(ms) {
    return sleep(ms);
  }

  calculateBackoffDelay(attempt) {
    return calculateBackoffDelay(attempt);
  }
}

// ===== MODULE EXPORTS =====

const defaultHandler = new CalcomWebhookHandler();

module.exports = CalcomWebhookHandler;
module.exports.defaultHandler = defaultHandler;
module.exports.RETRY_CONFIG = RETRY_CONFIG;
module.exports.handleCalWebhook = (...args) => defaultHandler.handleCalWebhook(...args);
module.exports.calcomWebhookHandler = (...args) => defaultHandler.calcomWebhookHandler(...args);
module.exports.verifyWebhookSignature = (...args) => defaultHandler.verifyWebhookSignature(...args);
module.exports.handleBookingCreated = (...args) => defaultHandler.handleBookingCreated(...args);
module.exports.handleBookingRescheduled = (...args) => defaultHandler.handleBookingRescheduled(...args);
module.exports.handleBookingCancelled = (...args) => defaultHandler.handleBookingCancelled(...args);
module.exports.handleMeetingEnded = (...args) => defaultHandler.handleMeetingEnded(...args);
module.exports.withRetry = (...args) => defaultHandler.withRetry(...args);
module.exports.sleep = (...args) => defaultHandler.sleep(...args);
module.exports.calculateBackoffDelay = (...args) => defaultHandler.calculateBackoffDelay(...args);
