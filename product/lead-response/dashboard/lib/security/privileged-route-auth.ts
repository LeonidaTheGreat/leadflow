import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'

function safeEqual(a: string, b: string): boolean {
  if (!a || !b) return false
  try {
    const bufA = Buffer.from(a)
    const bufB = Buffer.from(b)
    if (bufA.length !== bufB.length) {
      // Run a dummy comparison to avoid timing leak on length mismatch
      const dummy = Buffer.alloc(bufA.length)
      crypto.timingSafeEqual(dummy, dummy)
      return false
    }
    return crypto.timingSafeEqual(bufA, bufB)
  } catch {
    return false
  }
}

export async function requirePrivilegedRouteAuth(request: NextRequest): Promise<NextResponse | null> {
  const token = request.headers.get('x-admin-token') || ''
  const expected = process.env.ADMIN_SECRET || ''

  if (!safeEqual(token, expected)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return null
}
