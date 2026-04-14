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
 * - For each eligible item: update retry_count and last_retry_at
 * - Mark as 'needs_review' on each attempt (human review required to re-execute)
 * - Mark as 'abandoned' after maxRetries exhausted
 */
class DeadLetterReplay {
  constructor(pool, options = {}) {
    this.pool = pool;
    this.maxRetries = options.maxRetries || 5;
    this.tableName = options.tableName || 'webhook_dead_letters';
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
    log.info('Replaying dead letter', {
      id: item.id,
      source: item.source,
      eventType: item.event_type,
      attempt: retries,
      requestId: getRequestId(),
    });

    try {
      // Re-dispatch based on source
      // The actual replay would call the appropriate service.
      // For now, mark as needing manual review if handler not available.
      await this.pool.query(
        `UPDATE ${this.tableName}
         SET retry_count = $1, last_retry_at = NOW(), status = 'needs_review'
         WHERE id = $2`,
        [retries, item.id]
      );

      log.info('Dead letter marked for review', { id: item.id, attempt: retries });
      return { success: true, action: 'marked_for_review' };
    } catch (error) {
      log.error('Dead letter replay failed', error, { id: item.id, attempt: retries });

      if (retries >= this.maxRetries) {
        await this.pool.query(
          `UPDATE ${this.tableName}
           SET retry_count = $1, last_retry_at = NOW(), status = 'abandoned'
           WHERE id = $2`,
          [retries, item.id]
        ).catch(() => {});
        return { success: false, action: 'abandoned' };
      }

      await this.pool.query(
        `UPDATE ${this.tableName}
         SET retry_count = $1, last_retry_at = NOW()
         WHERE id = $2`,
        [retries, item.id]
      ).catch(() => {});
      return { success: false, action: 'will_retry' };
    }
  }

  async run() {
    const items = await this.getEligibleItems();
    if (items.length === 0) {
      log.info('No eligible dead letters to replay');
      return { processed: 0, total: 0 };
    }

    log.info(`Found ${items.length} dead letters to process`);
    let processed = 0;

    for (const item of items) {
      const result = await this.replayItem(item);
      if (result.success) processed++;
    }

    log.info('Dead letter replay complete', { processed, total: items.length });
    return { processed, total: items.length };
  }
}

module.exports = { DeadLetterReplay };
