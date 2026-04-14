'use strict';

/**
 * Express middleware that verifies Vercel cron requests.
 *
 * Vercel sends `Authorization: Bearer <CRON_SECRET>` on cron invocations.
 * If CRON_SECRET is not set in env, the middleware rejects all requests
 * (fail-closed) rather than silently allowing unauthenticated access.
 */
function requireCronSecret(req, res, next) {
  const expected = process.env.CRON_SECRET;

  if (!expected) {
    return res.status(503).json({ error: 'CRON_SECRET not configured' });
  }

  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  if (!token || token !== expected) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  return next();
}

module.exports = requireCronSecret;
