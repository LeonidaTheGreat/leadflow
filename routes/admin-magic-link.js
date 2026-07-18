/**
 * Task Spec — 5646f685-89dc-4af2-9568-8f1b967eef25
 *
 * What:
 * - Add routes/admin-magic-link.js with POST /api/admin/magic-link, authenticated by X-API-Key against API_SECRET_KEY.
 * - Add lib/services/AdminMagicLinkService.js with createMagicLink(), findOrCreateAgent(), and signTrialActivationToken() to own DB writes and JWT creation.
 * - Update server.js to register the new route.
 * - Update lib/config/index.js to name ADMIN_MAGIC_LINK_TTL_HOURS.
 * - Update product/lead-response/dashboard/app/api/auth/accept-invite/route.ts so POST /api/auth/accept-invite accepts purpose="trial-activation" JWTs, creates auth-token and leadflow_session cookies, and redirects clients to /dashboard/onboarding.
 * - Update product/lead-response/dashboard/app/accept-invite/page.tsx to immediately follow successful magic-link redirects without the password form.
 * - Add tests/integration/magic-link.test.js covering happy path, invalid API key, and expired token handling.
 *
 * Verify:
 * - Run: node --test tests/integration/magic-link.test.js
 * - Run: npm test
 * - Run: npm run build
 * - Run: npm run lint
 * - Run: npm audit --audit-level=high
 * - Run: rg -n "\\.from\\(" routes/admin-magic-link.js and expect zero matches.
 *
 * Boundaries:
 * - Do not touch Resend email infrastructure.
 * - Do not alter existing signup/login password flows or Stripe/webhook routes.
 * - Do not add DB schema migrations or change generated dashboard/docs files.
 */
'use strict';

const express = require('express');
const AdminMagicLinkService = require('../lib/services/AdminMagicLinkService');
const { ApiKeyAuthService } = require('../lib/services/api-key-auth-service');
const { logger } = require('../lib/logger');

const router = express.Router();
const log = logger.child('admin-magic-link');

function isAuthorized(req) {
  return ApiKeyAuthService.isAuthorized({
    expected: process.env.API_SECRET_KEY,
    provided: req.headers['x-api-key'],
  });
}

function makeService() {
  return new AdminMagicLinkService();
}

router.post('/api/admin/magic-link', async (req, res) => {
  if (!isAuthorized(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const service = makeService();
    const result = await service.createMagicLink(req.body);
    return res.status(200).json({ loginUrl: result.loginUrl });
  } catch (err) {
    const statusCode = err.statusCode || 500;
    if (statusCode >= 500) {
      log.error('magic-link generation failed', err);
      return res.status(statusCode).json({ error: 'Internal server error' });
    }
    return res.status(statusCode).json({ error: err.message });
  }
});

module.exports = router;
