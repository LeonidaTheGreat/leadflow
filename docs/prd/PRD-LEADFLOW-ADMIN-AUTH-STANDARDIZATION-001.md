# PRD-LEADFLOW-ADMIN-AUTH-STANDARDIZATION-001

**Status:** Ready for Dev  
**Priority:** P1 — Security + Maintainability  
**UC:** uc-buyer-journey-admin-auth-standardization  
**Task ID:** 5940392e-2e23-4506-888c-d3f2754d64e8

---

## Problem

Three incompatible admin auth patterns coexist in the Next.js dashboard routes. This creates security risk (inconsistent timing-safe comparison) and maintenance burden (no single place to tighten auth logic).

**Pattern 1 — isAdminUser (ADMIN_EMAIL + session):** 4 routes  
Requires a live session JWT + DB lookup. Not suitable for server-to-server or CLI admin calls.

**Pattern 2 — x-admin-token / ADMIN_SECRET (inline, no shared helper):** 5 routes  
Two of five use plain `===` comparison instead of `crypto.timingSafeEqual` — timing-attack vulnerable.

**Pattern 3 — LEADFLOW_API_KEY inline Bearer check:** 3 routes  
All three use plain `===` comparison — timing-attack vulnerable.

**Pattern 4 — `isAdmin()` inline, API_SECRET_KEY:** 1 route  
`app/api/admin/nps/route.ts` checks `Authorization: Bearer` against `API_SECRET_KEY` (an alias for `LEADFLOW_API_KEY` in `lib/config/index.js`). Plain `===` — timing-attack vulnerable.

Express routes (`routes/admin/`) already use `requireApiKey` middleware correctly. No changes needed there.

---

## Solution

Create one shared helper `requireAdmin()` for all Next.js admin routes.  
Use `LEADFLOW_API_KEY` as the single env var. Remove `ADMIN_EMAIL` and `ADMIN_SECRET`.

### New File: `product/lead-response/dashboard/lib/auth/require-admin.ts`

```ts
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

/**
 * Returns null if the request is authorized (proceed).
 * Returns a 401 NextResponse if unauthorized.
 *
 * Accepts the LEADFLOW_API_KEY via any of:
 *   x-api-key: <key>
 *   x-admin-token: <key>    ← backward-compat for existing admin UI pages
 *   Authorization: Bearer <key>
 *
 * Uses timing-safe comparison to prevent timing attacks.
 */
export function requireAdmin(request: NextRequest): NextResponse | null {
  const expected = process.env.LEADFLOW_API_KEY
  if (!expected) {
    return NextResponse.json({ error: 'Admin auth not configured' }, { status: 500 })
  }

  const apiKeyHeader = request.headers.get('x-api-key')
  const adminTokenHeader = request.headers.get('x-admin-token')
  const authHeader = request.headers.get('authorization')
  const provided =
    apiKeyHeader ||
    adminTokenHeader ||
    (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null)

  if (!provided) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const expectedBuf = Buffer.from(expected.trim())
  const providedBuf = Buffer.from(provided.trim())

  if (
    expectedBuf.length !== providedBuf.length ||
    !crypto.timingSafeEqual(expectedBuf, providedBuf)
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return null
}
```

**Why accept `x-admin-token`:** Three admin UI pages (`outreach/page.tsx`, `invite/page.tsx`, `pilot-campaigns/page.tsx`) already send `x-admin-token` from `localStorage.getItem('admin_token')`. Accepting this header avoids a frontend change. The admin simply updates their localStorage value from `ADMIN_SECRET` → `LEADFLOW_API_KEY` once.

### Migration Pattern

Replace the inline `checkAdminAuth()` / `isAdminUser()` / `verifyAdminAuth()` call in each route:

**Before (x-admin-token pattern):**
```ts
function checkAdminAuth(request: NextRequest): boolean { ... }
export async function GET(request: NextRequest) {
  if (!checkAdminAuth(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  ...
}
```

**Before (isAdminUser pattern):**
```ts
const authService = getAuthService()
if (!await authService.isAdminUser(request)) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}
```

**Before (inline Bearer pattern):**
```ts
function verifyAdminAuth(request: NextRequest): boolean {
  const apiKey = process.env.LEADFLOW_API_KEY
  const authHeader = request.headers.get('authorization')
  return authHeader === `Bearer ${apiKey}`
}
```

**After (all patterns → requireAdmin):**
```ts
import { requireAdmin } from '@/lib/auth/require-admin'

export async function GET(request: NextRequest) {
  const authError = requireAdmin(request)
  if (authError) return authError
  ...
}
```

---

## Files to Change

### CREATE
- `product/lead-response/dashboard/lib/auth/require-admin.ts`

### MODIFY — isAdminUser routes (4 files)
- `product/lead-response/dashboard/app/api/admin/pilots/route.ts`
- `product/lead-response/dashboard/app/api/admin/pilots/[agentId]/route.ts`
- `product/lead-response/dashboard/app/api/admin/a2p-status/route.ts`
- `product/lead-response/dashboard/app/api/admin/gtm-status/route.ts`

### MODIFY — x-admin-token routes (5 files)
- `product/lead-response/dashboard/app/api/admin/outreach/blast/route.ts`
- `product/lead-response/dashboard/app/api/admin/invite-pilot/route.ts`
- `product/lead-response/dashboard/app/api/admin/outreach/targets/route.ts`
- `product/lead-response/dashboard/app/api/admin/prospects/route.ts`
- `product/lead-response/dashboard/app/api/admin/pilot-targets/[id]/invite/route.ts`

### MODIFY — inline LEADFLOW_API_KEY routes (3 files)
- `product/lead-response/dashboard/app/api/admin/funnel/checkout-attempts/route.ts`
- `product/lead-response/dashboard/app/api/admin/funnel/trial-activation/route.ts`
- `product/lead-response/dashboard/app/api/admin/metrics/aha-moment/route.ts`

### MODIFY — inline API_SECRET_KEY route (1 file)
- `product/lead-response/dashboard/app/api/admin/nps/route.ts` — remove `isAdmin()` inline function, replace with `requireAdmin`

### MODIFY — frontend admin UI pages (2 files that currently rely on session auth)
These pages call `isAdminUser` routes without sending any auth header — they relied on session cookies.  
After migration the routes will require a token. Update both pages to read `admin_token` from localStorage and send as `x-admin-token` (same pattern as `outreach/page.tsx` already uses):

```ts
const token = localStorage.getItem('admin_token')
if (!token) {
  // show error: 'Admin token required — run localStorage.setItem("admin_token", <LEADFLOW_API_KEY>) in console'
  return
}
// in all fetch calls to /api/admin/* routes:
headers: { 'x-admin-token': token }
```

- `product/lead-response/dashboard/app/admin/page.tsx` — fetch at line ~116 to `/api/admin/gtm-status`
- `product/lead-response/dashboard/app/admin/pilots/page.tsx` — fetches at lines ~62, ~95, ~128 to `/api/admin/pilots` and `/api/admin/pilots/[agentId]`

### MODIFY — env docs
- `product/lead-response/dashboard/.env.example` or root `.env.example` — remove `ADMIN_EMAIL`, `ADMIN_SECRET`

---

## Boundaries — Do NOT Touch

- Express routes in `routes/admin/` — already correct (`requireApiKey` middleware)
- `lib/services/api-key-auth-service.js` — use as-is
- `lib/middleware/require-api-key.js` — use as-is
- Any business logic inside the route handlers
- Database schema / migrations
- `AuthService.ts` `isAdminUser` method — leave it; only stop calling it from admin routes
- Any test files that already cover the new pattern

---

## Acceptance Criteria (runnable)

```bash
# Pattern 1 eliminated:
grep -r "isAdminUser" product/lead-response/dashboard/app/api/ | wc -l
# Expected: 0

# Pattern 2 eliminated:
grep -r "x-admin-token\|ADMIN_SECRET\|checkAdminAuth" product/lead-response/dashboard/app/api/ | wc -l
# Expected: 0

# Inline verifyAdminAuth / isAdmin eliminated:
grep -r "verifyAdminAuth\|isAdmin" product/lead-response/dashboard/app/api/ | wc -l
# Expected: 0

# requireAdmin used in all admin routes:
grep -r "requireAdmin" product/lead-response/dashboard/app/api/admin/ --include="route.ts" | wc -l
# Expected: ≥ 13

# No plain-equality token comparison in admin routes:
grep -r "=== expectedToken\|adminToken ===\|=== adminToken\|Bearer \${" product/lead-response/dashboard/app/api/ | wc -l
# Expected: 0

# Build passes:
cd product/lead-response/dashboard && npx next build
# Expected: exit 0

# All tests pass:
npm test
# Expected: exit 0

# No high/critical vulnerabilities:
npm audit --audit-level=high
# Expected: 0 high/critical
```

---

## Security Notes for Dev

1. The new `requireAdmin()` MUST use `crypto.timingSafeEqual` — this is the entire point of the migration.
2. Accept three headers: `x-api-key`, `x-admin-token`, and `Authorization: Bearer`. The `x-admin-token` header is accepted for backward compat — existing admin UI pages already use it via `localStorage.getItem('admin_token')`. The admin updates their localStorage value from `ADMIN_SECRET` → `LEADFLOW_API_KEY` once.
3. Do NOT log the API key value in any error or warning message.
4. If `LEADFLOW_API_KEY` is not set, return 500 (misconfiguration), not 401 — this helps operators diagnose missing env vars.

---

## Test Coverage

After migration, the existing tests that pass `x-admin-token` or `ADMIN_SECRET` will break — they need to be updated to send `x-api-key: <LEADFLOW_API_KEY>` (or `x-admin-token` which is also accepted). The dev agent must update those tests.

Existing test files to review for updates:
- `tests/e2e/admin-token-verify.test.js`
- `tests/e2e/admin-pilots-auth.test.js`
- `product/lead-response/dashboard/__tests__/pilot-outreach-blast.test.ts`
- `product/lead-response/dashboard/__tests__/outreach-targets-route.test.ts`

---

## Out-of-Scope Security Gap: 9 Unprotected Admin Routes (P1 — needs separate UC)

**Critical finding:** The Next.js middleware excludes `/api/` routes from its auth check (`matcher: '/((?!api|...).*)'`). This means all `/api/admin/` routes must enforce their own auth. **9 routes have zero auth:**

- `app/api/admin/conversations/route.ts` — returns anonymized SMS conversation data
- `app/api/admin/demo-link/route.ts`
- `app/api/admin/pilot-campaigns/route.ts` — exposes campaign data
- `app/api/admin/pilot-campaigns/[id]/stats/route.ts`
- `app/api/admin/pilot-campaigns/[id]/targets/route.ts`
- `app/api/admin/pilot-targets/[id]/route.ts`
- `app/api/admin/simulate-lead/route.ts` — runs lead simulations
- `app/api/admin/triage-use-cases/route.ts`
- `app/api/admin/pilot-signups/invite/route.ts`

These are **not in scope for this task** — adding auth to 9 more routes risks scope creep and merge conflicts. Raise a separate UC: `uc-admin-unprotected-routes-security-fix`. Estimated: add `requireAdmin()` to each file (same pattern as this task), update corresponding frontend pages.
