'use strict';

/**
 * Structured JSON logger with PII masking.
 *
 * Usage:
 *   const log = require('./logger')('ModuleName');
 *   log.info('message', { key: value });
 *
 * Output format (stdout):
 *   { "timestamp": "...", "level": "info", "module": "ModuleName", "message": "...", "context": {...} }
 *
 * PII masking applied to all string values in context:
 *   - Phone numbers (10+ digits) → ***XXXX (last 4 preserved)
 *   - Email addresses → ***@domain
 */

function mask(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/\+?1?\d{10,}/g, (m) => '***' + m.slice(-4))
    .replace(/[\w.-]+@[\w.-]+/g, (m) => '***@' + m.split('@')[1]);
}

function emit(level, module, message, context) {
  const entry = { timestamp: new Date().toISOString(), level, module, message };
  if (context && Object.keys(context).length) {
    entry.context = JSON.parse(JSON.stringify(context), (k, v) => typeof v === 'string' ? mask(v) : v);
  }
  const output = JSON.stringify(entry);
  if (level === 'error') {
    console.error(output);
  } else if (level === 'warn') {
    console.warn(output);
  } else {
    console.log(output);
  }
}

function createLogger(module) {
  return {
    debug: (msg, ctx) => emit('debug', module, msg, ctx),
    info:  (msg, ctx) => emit('info',  module, msg, ctx),
    warn:  (msg, ctx) => emit('warn',  module, msg, ctx),
    error: (msg, ctx) => emit('error', module, msg, ctx),
  };
}

module.exports = createLogger;
