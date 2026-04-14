'use strict';

const { logger } = require('../logger');

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
        this.log.info('Half-open, testing request');
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
        this.log.info('Closed — service recovered');
      }
      return result;
    } catch (error) {
      this.failures++;
      this.lastFailure = Date.now();
      if (this.failures >= this.failureThreshold) {
        this.state = 'OPEN';
        this.log.error(`OPEN after ${this.failures} failures`, error);
      }
      throw error;
    }
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

/**
 * Retry wrapper for transient failures.
 * Retries up to maxRetries times with exponential backoff.
 *
 * @param {Function} fn - Async function to retry
 * @param {Object} options
 * @param {number} [options.maxRetries=3] - Maximum number of retry attempts
 * @param {number} [options.baseDelay=1000] - Base delay in ms (doubles each retry)
 * @param {Function} [options.retryOn] - Optional predicate: (err) => boolean. Return true to retry.
 */
async function withRetry(fn, options = {}) {
  const { maxRetries = 3, baseDelay = 1000, retryOn } = options;
  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      // Don't retry circuit breaker OPEN errors
      if (err.code === 'CIRCUIT_OPEN') throw err;
      // Don't retry non-retryable errors (4xx)
      if (err.response?.status >= 400 && err.response?.status < 500) throw err;
      // Custom retry predicate
      if (retryOn && !retryOn(err)) throw err;
      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

module.exports = { CircuitBreaker, breakers, withRetry };
