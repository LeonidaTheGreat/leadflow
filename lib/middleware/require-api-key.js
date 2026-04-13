'use strict';

const crypto = require('crypto');

/**
 * Express middleware that authenticates requests using the LEADFLOW_API_KEY
 * environment variable. Uses crypto.timingSafeEqual to prevent timing attacks.
 *
 * Responds 401 if the x-api-key header is missing, doesn't match, or the
 * server-side key is not configured.
 */
function requireApiKey(req, res, next) {
  const provided = req.headers['x-api-key'];
  const expected = process.env.LEADFLOW_API_KEY;

  if (!provided || !expected) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

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

module.exports = requireApiKey;
