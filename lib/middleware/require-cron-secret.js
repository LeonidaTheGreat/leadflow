'use strict';

const crypto = require('crypto');

/**
 * Express middleware that authenticates Vercel cron requests.
 *
 * Vercel sets `Authorization: Bearer <CRON_SECRET>` on all cron invocations.
 * If CRON_SECRET is set in the environment, we validate the token using a
 * timing-safe comparison. If CRON_SECRET is not set (local dev), we skip the
 * check and let the request through.
 *
 * Responds 401 if the token is missing or does not match.
 */
function requireCronSecret(req, res, next) {
  const expected = process.env.CRON_SECRET;

  // Dev mode: no secret configured — allow through
  if (!expected) {
    return next();
  }

  const authHeader = req.headers['authorization'] || '';
  const provided = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  if (!provided) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Use fixed-length buffers to avoid length-timing leaks
  const providedBuf = Buffer.from(provided);
  const expectedBuf = Buffer.from(expected);

  if (
    providedBuf.length !== expectedBuf.length ||
    !crypto.timingSafeEqual(providedBuf, expectedBuf)
  ) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  return next();
}

module.exports = requireCronSecret;
