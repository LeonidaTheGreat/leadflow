'use strict';

/**
 * Investigation: Orphan Branch dev/fix-trial-expired-redirect-loop
 *
 * Task: b3a17c25-e608-4104-a2d8-865a5ef1863b
 * Investigator: Dev agent (2026-07-19)
 *
 * VERDICT: ALREADY SHIPPED — branch can be deleted
 *
 * Branch: dev/fix-trial-expired-redirect-loop
 * Commits ahead of main: 1 (668365c1)
 * Commit: "fix: middleware redirect loop on /login for expired trials"
 * Author: Stojan Madjunkov, 2026-06-13
 *
 * What the fix did:
 *   Added '/dashboard/trial-expired' to EXPIRED_TRIAL_ALLOWED_ROUTES in
 *   middleware.ts. Without it, expired-trial users were bounced back to
 *   /dashboard/trial-expired on every request (Safari hit the ~20-redirect
 *   cap and blocked /login entirely).
 *
 * Why it's already shipped:
 *   Identical fix merged to main via commit 528b8b06 / PR #1834 on
 *   2026-06-17. The regression test also landed on main at
 *   product/lead-response/dashboard/tests/middleware-trial-expired-redirect-loop.test.ts.
 *
 * Previous investigation attempts on this orphan (all reached same verdict):
 *   - dev/d97c48cd (PR #1834, merged 2026-06-17)
 *   - dev/bffbe730 (PR #1852, merged 2026-07-15)
 *   - dev/babadd9c (PR #1908, merged 2026-07-17)
 *
 * Recommendation: Delete orphan branch from remote:
 *   git push origin --delete dev/fix-trial-expired-redirect-loop
 */

const path = require('path');
const fs = require('fs');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const MIDDLEWARE_PATH = path.join(
  PROJECT_ROOT,
  'product/lead-response/dashboard/middleware.ts'
);

describe('Orphan branch investigation b3a17c25: dev/fix-trial-expired-redirect-loop', () => {
  it('middleware.ts already contains /dashboard/trial-expired in EXPIRED_TRIAL_ALLOWED_ROUTES', () => {
    const source = fs.readFileSync(MIDDLEWARE_PATH, 'utf8');
    const match = source.match(/EXPIRED_TRIAL_ALLOWED_ROUTES\s*=\s*\[([^\]]*)\]/s);
    expect(match).not.toBeNull();

    const routes = match[1]
      .split(',')
      .map((s) => s.trim().replace(/^['"`]|['"`]$/g, ''))
      .filter(Boolean);

    expect(routes).toContain('/dashboard/trial-expired');
  });

  it('middleware.ts references the orphan branch by name (guard comment exists)', () => {
    const source = fs.readFileSync(MIDDLEWARE_PATH, 'utf8');
    expect(source).toContain('dev/fix-trial-expired-redirect-loop');
  });

  it('regression test from orphan branch exists on main', () => {
    const testPath = path.join(
      PROJECT_ROOT,
      'product/lead-response/dashboard/tests/middleware-trial-expired-redirect-loop.test.ts'
    );
    expect(fs.existsSync(testPath)).toBe(true);
  });
});
