'use strict';

const rateLimit = require('express-rate-limit');

/**
 * Rate limiter for webhook endpoints.
 * Prevents DDoS from compromised partner accounts.
 */
const webhookLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120, // 120 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});

/**
 * Stricter rate limiter for admin/cron endpoints.
 */
const adminLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests' },
});

module.exports = { webhookLimiter, adminLimiter };
