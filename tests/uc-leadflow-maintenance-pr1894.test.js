/**
 * Investigation: Orphan Branch dev/fix-trial-expired-redirect-loop
 *
 * Task: babadd9c-aeb2-4dd1-834f-a7be55f29ab7
 * Investigator: Dev agent (2026-07-17)
 *
 * VERDICT: ALREADY SHIPPED — branch can be deleted
 *
 * Findings:
 *   - Orphan branch has 1 commit ahead of main:
 *       commit 668365c1 (2026-06-13)
 *       "fix: middleware redirect loop on /login for expired trials"
 *       Author: Stojan Madjunkov <madzunkov@hotmail.com>
 *       Co-Authored-By: Claude Opus 4.7
 *
 *   - The fix added '/dashboard/trial-expired' to EXPIRED_TRIAL_ALLOWED_ROUTES
 *     in product/lead-response/dashboard/middleware.ts, preventing an infinite
 *     redirect loop where Safari capped at ~20 redirects and users could not
 *     reach /login after their trial expired.
 *
 *   - The same fix was already merged to main via PR #1834 on 2026-06-16:
 *       commit 528b8b06
 *       "fix: middleware redirect loop on /login for expired trials (#1834)"
 *       Merge commit message is nearly identical — same author, same commit
 *       body, same co-author.
 *
 *   - The regression test shipped too:
 *       product/lead-response/dashboard/tests/middleware-trial-expired-redirect-loop.test.ts
 *       exists on main (identical to the test in the orphan branch).
 *
 * Previous attempts:
 *   - dev/bffbe730-investigate-orphan-branch-dev-fix-trial — created a JSON
 *     completion report file but did NOT create the required
 *     tests/uc-leadflow-maintenance-pr1894.test.js. No test file = task not
 *     closed; branch superseded by this attempt.
 *   - dev/d97c48cd-investigate-orphan-branch-dev-fix-trial — not found on
 *     remote; likely never pushed.
 *
 * Recommended action: Delete orphan branch dev/fix-trial-expired-redirect-loop
 * from remote (git push origin --delete dev/fix-trial-expired-redirect-loop).
 * No new PR needed — all code and tests are already on main.
 */

'use strict';

const path = require('path');
const fs = require('fs');

// Resolve to the actual project root (this test lives in tests/ at repo root)
const PROJECT_ROOT = path.resolve(__dirname, '..');
const MIDDLEWARE_PATH = path.join(
  PROJECT_ROOT,
  'product/lead-response/dashboard/middleware.ts'
);
const REGRESSION_TEST_PATH = path.join(
  PROJECT_ROOT,
  'product/lead-response/dashboard/tests/middleware-trial-expired-redirect-loop.test.ts'
);

describe('Orphan branch investigation: dev/fix-trial-expired-redirect-loop', () => {
  it('middleware.ts on main already contains the /dashboard/trial-expired fix', () => {
    const source = fs.readFileSync(MIDDLEWARE_PATH, 'utf8');
    // The fix adds '/dashboard/trial-expired' to EXPIRED_TRIAL_ALLOWED_ROUTES
    const match = source.match(/EXPIRED_TRIAL_ALLOWED_ROUTES\s*=\s*\[([^\]]*)\]/s);
    expect(match).not.toBeNull();

    const routes = match[1]
      .split(',')
      .map((s) => s.trim().replace(/^['"`]|['"`]$/g, ''))
      .filter(Boolean);

    expect(routes).toContain('/dashboard/trial-expired');
  });

  it('the regression test from the orphan branch already exists on main', () => {
    expect(fs.existsSync(REGRESSION_TEST_PATH)).toBe(true);
  });

  it('middleware.ts contains the warning comment referencing the orphan branch', () => {
    const source = fs.readFileSync(MIDDLEWARE_PATH, 'utf8');
    // The comment in the fix references the branch name
    expect(source).toContain('dev/fix-trial-expired-redirect-loop');
  });
});
