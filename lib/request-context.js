'use strict';

/**
 * Task Spec (024a786b-5215-4213-8343-395d91510154)
 * What:
 * - Change getRequestId() in lib/request-context.js to use crypto randomness.
 * - Change requestLogger() in lib/logger.js to use crypto randomness.
 * - Change withRetry() jitter in lib/utils/circuit-breaker.js to use crypto randomness.
 * - Add/update unit checks in tests/unit/weak-randomness-fix.test.js and tests/unit/request-context.test.js.
 * Verify:
 * - node tests/unit/request-context.test.js
 * - node tests/unit/weak-randomness-fix.test.js
 * - npm run lint
 * - npm run build
 * - npm test
 * - npm audit --audit-level=high
 * - rg -n "Math\\.random\\(" lib/request-context.js lib/logger.js lib/utils/circuit-breaker.js
 * Boundaries:
 * - No route/API contract, schema, migration, or product dashboard changes.
 * - No exported function signature changes.
 */

const { AsyncLocalStorage } = require('node:async_hooks');
const crypto = require('node:crypto');

const requestContext = new AsyncLocalStorage();

/**
 * Get the current request context (requestId, etc.)
 * Returns empty object if not in a request context (e.g., cron jobs, background tasks).
 */
function getRequestContext() {
  return requestContext.getStore() || {};
}

/**
 * Get the current requestId, or generate a synthetic one for non-request contexts.
 */
function getRequestId() {
  const ctx = getRequestContext();
  return ctx.requestId || `bg-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
}

module.exports = { requestContext, getRequestContext, getRequestId };
