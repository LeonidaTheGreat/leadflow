/**
 * Task Spec (536f5ed5-baae-418c-9220-8a99ff9cbd2f)
 *
 * What:
 * - Add `requirePrivilegedRouteAuth()` in `product/lead-response/dashboard/lib/security/privileged-route-auth.ts`.
 * - Update unprotected handlers in:
 *   - `product/lead-response/dashboard/app/api/debug/<name>/route.ts`
 *   - `product/lead-response/dashboard/app/api/smoke/stripe-checkout-e2e/route.ts`
 *   - `product/lead-response/dashboard/app/api/admin/{simulate-lead,conversations,pilot-signups/invite,pilot-campaigns, pilot-campaigns/[id]/stats, pilot-campaigns/[id]/targets, pilot-targets/[id], demo-link}/route.ts`
 * - Add `scripts/check-debug-routes.js` to audit `/api/debug/*`, `/api/admin/*`, `/api/smoke/*`, `/api/internal/*` routes and fail on unprotected debug/admin routes.
 *
 * Verify:
 * - `node scripts/check-debug-routes.js` exits 0 and reports no unprotected `/api/debug/*` or `/api/admin/*` routes.
 * - `npm run lint`, `npm test`, `npm run build`, `npm audit --audit-level=high` all pass.
 * - Grep checks: `rg -n "requirePrivilegedRouteAuth\(" product/lead-response/dashboard/app/api/{debug,admin,smoke}` confirms protected handlers.
 *
 * Boundaries:
 * - Do not remove production-required admin endpoints.
 * - Do not alter business logic, database schema, or non-target route groups.
 * - Keep existing auth modes compatible (admin session, bearer API secret, x-admin-token flows).
 */
import crypto from 'crypto'
import { NextResponse, type NextRequest } from 'next/server'
import { isAdminUser } from '@/lib/services/AuthService'

function clean(value?: string | null): string {
  return (value || '').trim()
}

function safeEqual(a: string, b: string): boolean {
  if (!a || !b) return false

  const aBuf = Buffer.from(a)
  const bBuf = Buffer.from(b)

  if (aBuf.length !== bBuf.length) return false

  return crypto.timingSafeEqual(aBuf, bBuf)
}

function readBearerToken(request: Request): string {
  const authHeader = clean(request.headers.get('authorization'))
  if (!authHeader) return ''

  if (authHeader.startsWith('Bearer ')) {
    return clean(authHeader.slice(7))
  }

  return authHeader
}

function hasValidApiSecret(request: Request): boolean {
  const provided = readBearerToken(request)
  const candidates = [
    clean(process.env.API_SECRET_KEY),
    clean(process.env.NEXT_PUBLIC_API_KEY),
    clean(process.env.LEADFLOW_API_KEY),
    clean(process.env.INTERNAL_API_SECRET),
  ].filter(Boolean)

  return candidates.some(expected => safeEqual(provided, expected))
}

function hasValidAdminToken(request: Request): boolean {
  const provided = clean(request.headers.get('x-admin-token'))
  const expected = clean(process.env.ADMIN_SECRET)
  return safeEqual(provided, expected)
}

export async function requirePrivilegedRouteAuth(
  request: Request | NextRequest
): Promise<NextResponse | null> {
  const nextRequest = request as NextRequest

  if (await isAdminUser(nextRequest)) {
    return null
  }

  if (hasValidAdminToken(request) || hasValidApiSecret(request)) {
    return null
  }

  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
