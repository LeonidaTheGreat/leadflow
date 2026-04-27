/**
 * Task Spec (808a7afc-42fe-4bf9-b920-36ba55ffd060)
 * What:
 * - Add a shared privileged-route auth helper used by admin/debug Next.js API routes.
 * - Update only route handlers under app/api/admin and app/api/debug that were flagged as unprotected.
 * Verify:
 * - `node scripts/check-debug-routes.js` must report no unprotected admin/debug routes.
 * - `git status --porcelain | grep product/lead-response/dashboard/` must be empty after commit.
 * - Dashboard quality gates pass: `npm run build`, `npm run lint`, `npm test`, `npm audit --audit-level=high`.
 * Boundaries:
 * - Do not change business logic, DB query semantics, or non-dashboard modules.
 * - Do not touch PM/docs/dashboard markdown files listed as non-committable.
 */
import { NextResponse } from 'next/server'
import crypto from 'crypto'

function safeEqual(a: string, b: string): boolean {
  if (!a || !b) return false
  try {
    const bufA = Buffer.from(a)
    const bufB = Buffer.from(b)
    if (bufA.length !== bufB.length) {
      // Run timingSafeEqual against a dummy buffer of the same length to avoid
      // early-exit timing oracle, then return false unconditionally.
      const dummy = Buffer.alloc(bufA.length)
      crypto.timingSafeEqual(bufA, dummy)
      return false
    }
    return crypto.timingSafeEqual(bufA, bufB)
  } catch {
    return false
  }
}

export async function requirePrivilegedRouteAuth(
  request: Request
): Promise<NextResponse | null> {
  const token = request.headers.get('x-admin-token')
  const expected = process.env.ADMIN_SECRET

  if (!safeEqual(token ?? '', expected ?? '')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}
