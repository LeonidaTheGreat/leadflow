'use strict';

const { logger } = require('../logger');
const { getRequestId } = require('../request-context');
const log = logger.child('dead-letter-replay');

/**
 * Replay dead-lettered webhook events with exponential backoff.
 *
 * Strategy:
 * - Query unprocessed dead letters ordered by created_at
 * - Skip items with retry_count >= maxRetries
 * - Skip items younger than backoff delay (2^retry_count minutes)
 * - For each eligible item: re-dispatch to the appropriate webhook handler
 * - Mark as 'replayed' on success, increment retry_count on failure
 * - Mark as 'abandoned' after maxRetries exhausted
 */
class DeadLetterReplay {
  constructor(pool, options = {}) {
    this.pool = pool;
    this.maxRetries = options.maxRetries || 5;
    this.tableName = options.tableName || 'webhook_dead_letters';
    this.handlers = options.handlers || {};
  }

  /**
   * Register a replay handler for a source.
   * Handler signature: async (payload, eventType) => void
   * Throw on failure to trigger retry.
   */
  registerHandler(source, handler) {
    this.handlers[source] = handler;
  }

  async getEligibleItems() {
    const result = await this.pool.query(`
      SELECT * FROM ${this.tableName}
      WHERE status IS NULL OR status = 'pending'
      ORDER BY created_at ASC
      LIMIT 20
    `);

    return (result.rows || []).filter(item => {
      const retries = item.retry_count || 0;
      if (retries >= this.maxRetries) return false;

      // Exponential backoff: wait 2^retries minutes between attempts
      const backoffMs = Math.pow(2, retries) * 60 * 1000;
      const lastRetry = item.last_retry_at ? new Date(item.last_retry_at).getTime() : 0;
      return Date.now() - lastRetry > backoffMs;
    });
  }

  async replayItem(item) {
    const retries = (item.retry_count || 0) + 1;
    const payload = typeof item.payload === 'string' ? JSON.parse(item.payload) : item.payload;

    log.info('Replaying dead letter', {
      id: item.id,
      source: item.source,
      eventType: item.event_type,
      attempt: retries,
      requestId: getRequestId(),
    });

    const handler = this.handlers[item.source];
    if (!handler) {
      // No handler registered for this source — mark for manual review
      await this._updateStatus(item.id, retries, 'needs_review');
      log.warn('No replay handler for source', { source: item.source, id: item.id });
      return { success: false, action: 'needs_review', reason: `no handler for ${item.source}` };
    }

    try {
      await handler(payload, item.event_type);

      // Success — mark as replayed
      await this._updateStatus(item.id, retries, 'replayed');
      log.info('Dead letter replayed successfully', { id: item.id, source: item.source, attempt: retries });
      return { success: true, action: 'replayed' };
    } catch (error) {
      log.error('Dead letter replay failed', error, { id: item.id, source: item.source, attempt: retries });

      if (retries >= this.maxRetries) {
        await this._updateStatus(item.id, retries, 'abandoned');
        return { success: false, action: 'abandoned' };
      }

      await this._updateStatus(item.id, retries, 'pending');
      return { success: false, action: 'will_retry' };
    }
  }

  async _updateStatus(id, retryCount, status) {
    try {
      await this.pool.query(
        `UPDATE ${this.tableName}
         SET retry_count = $1, last_retry_at = NOW(), status = $2
         WHERE id = $3`,
        [retryCount, status, id]
      );
    } catch (err) {
      log.error('Dead letter status update failed', err, { id, status });
    }
  }

  async run() {
    const items = await this.getEligibleItems();
    if (items.length === 0) {
      log.info('No eligible dead letters to replay');
      return { processed: 0, total: 0, results: [] };
    }

    log.info(`Found ${items.length} dead letters to process`);
    let processed = 0;
    const results = [];

    for (const item of items) {
      const result = await this.replayItem(item);
      results.push({ id: item.id, source: item.source, ...result });
      if (result.success) processed++;
    }

    log.info('Dead letter replay complete', { processed, total: items.length });
    return { processed, total: items.length, results };
  }
}

module.exports = { DeadLetterReplay };
