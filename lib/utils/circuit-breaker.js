'use strict';

const { logger } = require('../logger');
const { getRequestId } = require('../request-context');

/**
 * Lightweight circuit breaker for external API calls.
 *
 * States: CLOSED (normal) → OPEN (failing, reject fast) → HALF_OPEN (test one request)
 */
class CircuitBreaker {
  constructor(name, options = {}) {
    this.name = name;
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 30000; // 30s
    this.state = 'CLOSED';
    this.failures = 0;
    this.lastFailure = null;
    this.log = logger.child(`circuit-breaker:${name}`);
  }

  async execute(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailure > this.resetTimeout) {
        this.state = 'HALF_OPEN';
        this.log.info('State: OPEN → HALF_OPEN', { requestId: getRequestId() });
      } else {
        const err = new Error(`Circuit breaker OPEN for ${this.name}`);
        err.code = 'CIRCUIT_OPEN';
        throw err;
      }
    }

    try {
      const result = await fn();
      if (this.state === 'HALF_OPEN') {
        this.state = 'CLOSED';
        this.failures = 0;
        this.log.info('State: HALF_OPEN → CLOSED — service recovered', { requestId: getRequestId() });
      }
      return result;
    } catch (error) {
      this.failures++;
      this.lastFailure = Date.now();
      if (this.failures >= this.failureThreshold) {
        this.state = 'OPEN';
        this.log.error('State: → OPEN', error, { failures: this.failures, threshold: this.failureThreshold, requestId: getRequestId() });
      }
      throw error;
    }
  }

  getMetrics() {
    return {
      name: this.name,
      state: this.state,
      failures: this.failures,
      lastFailure: this.lastFailure,
      failureThreshold: this.failureThreshold,
      resetTimeout: this.resetTimeout,
    };
  }

  getState() {
    return { name: this.name, state: this.state, failures: this.failures };
  }
}

// Singleton instances for each external service
const breakers = {
  fub: new CircuitBreaker('fub', { failureThreshold: 5, resetTimeout: 30000 }),
  stripe: new CircuitBreaker('stripe', { failureThreshold: 3, resetTimeout: 60000 }),
  calcom: new CircuitBreaker('calcom', { failureThreshold: 5, resetTimeout: 30000 }),
  twilio: new CircuitBreaker('twilio', { failureThreshold: 5, resetTimeout: 30000 }),
};

// DB error codes that should never be retried (PostgREST and PostgreSQL)
const NON_RETRYABLE_DB_CODES = new Set([
  'PGRST116', // Row not found
  '23503',    // Foreign key violation
  '23505',    // Unique constraint violation
]);

/**
 * Retry wrapper for transient failures.
 * Retries up to maxRetries times with exponential backoff and jitter.
 *
 * @param {Function} fn - Async function to retry
 * @param {Object} options
 * @param {number} [options.maxRetries=3] - Maximum number of retry attempts
 * @param {number} [options.baseDelay=1000] - Base delay in ms (doubles each retry)
 * @param {number} [options.maxDelay=10000] - Cap on delay in ms
 * @param {Function} [options.retryOn] - Optional predicate: (err) => boolean. Return true to retry.
 * @param {string} [options.operationName='operation'] - Name used in log messages
 */
async function withRetry(fn, options = {}) {
  const { maxRetries = 3, baseDelay = 1000, maxDelay = 10000, retryOn, operationName = 'operation' } = options;
  const log = logger.child('withRetry');
  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      // Don't retry circuit breaker OPEN errors
      if (err.code === 'CIRCUIT_OPEN') throw err;
      // Don't retry non-retryable DB error codes
      if (NON_RETRYABLE_DB_CODES.has(err.code)) {
        log.warn(`${operationName} failed with non-retryable DB error`, { code: err.code, message: err.message });
        throw err;
      }
      // Don't retry non-retryable HTTP errors (4xx)
      if (err.response?.status >= 400 && err.response?.status < 500) throw err;
      if (err.status >= 400 && err.status < 500) throw err;
      // Custom retry predicate
      if (retryOn && !retryOn(err)) throw err;
      if (attempt < maxRetries) {
        const exponential = baseDelay * Math.pow(2, attempt);
        const capped = Math.min(exponential, maxDelay);
        // Add ±25% jitter to prevent thundering herd
        const jitter = capped * 0.25 * (Math.random() * 2 - 1);
        const delay = Math.floor(capped + jitter);
        log.warn(`${operationName} failed, retrying`, { attempt: attempt + 1, maxAttempts: maxRetries + 1, delayMs: delay, error: err.message });
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        log.warn(`${operationName} failed after all attempts`, { attempts: maxRetries + 1, error: err.message });
      }
    }
  }
  throw lastError;
}

/**
 * Returns current metrics for all registered circuit breaker instances.
 */
function getAllBreakerMetrics() {
  return Object.values(breakers).map(b => b.getMetrics());
}

module.exports = { CircuitBreaker, breakers, withRetry, getAllBreakerMetrics };
