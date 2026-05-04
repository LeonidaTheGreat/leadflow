'use strict';

const { AsyncLocalStorage } = require('node:async_hooks');
const crypto = require('crypto');

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
  return ctx.requestId || `bg-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
}

module.exports = { requestContext, getRequestContext, getRequestId };
