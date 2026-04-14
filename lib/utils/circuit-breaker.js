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

module.exports = { CircuitBreaker, breakers };
