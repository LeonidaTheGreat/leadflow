/**
 * Regression test for redirect loop on /login when trial is expired.
 *
 * Bug: middleware redirected expired-trial users to /dashboard/trial-expired,
 * but /dashboard/trial-expired was not in EXPIRED_TRIAL_ALLOWED_ROUTES, so the
 * middleware bounced it again on every hop. Safari capped at ~20 redirects and
 * users could not reach the login page.
 *
 * Fix: include /dashboard/trial-expired in EXPIRED_TRIAL_ALLOWED_ROUTES.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const MIDDLEWARE_PATH = path.resolve(__dirname, '..', 'proxy.ts');

function extractAllowedRoutes(source) {
  const match = source.match(/EXPIRED_TRIAL_ALLOWED_ROUTES\s*=\s*\[([^\]]*)\]/);
  if (!match) {
    throw new Error('EXPIRED_TRIAL_ALLOWED_ROUTES not found in proxy.ts');
  }
  return match[1]
    .split(',')
    .map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
    .filter(Boolean);
}

describe('middleware redirect-loop guard for expired trials', () => {
  const source = fs.readFileSync(MIDDLEWARE_PATH, 'utf8');
  const allowed = extractAllowedRoutes(source);

  it('EXPIRED_TRIAL_ALLOWED_ROUTES contains /dashboard/trial-expired so the redirect target itself is reachable', () => {
    expect(allowed).toContain('/dashboard/trial-expired');
  });

  it('redirect destination in source matches an allowed route prefix', () => {
    const redirectMatch = source.match(/NextResponse\.redirect\(new URL\(['"]([^'"]+)['"], request\.url\)\)/g) || [];
    const redirects = redirectMatch.map((line) => line.match(/['"]([^'"]+)['"]/)[1]);
    expect(redirects).toContain('/dashboard/trial-expired');

    const matches = allowed.some((route) =>
      '/dashboard/trial-expired' === route || '/dashboard/trial-expired'.startsWith(`${route}/`)
    );
    expect(matches).toBe(true);
  });
});
