import { NextResponse } from 'next/server'
import { postgrestAdmin, isPostgrestConfigured } from '@/lib/db'

/**
 * GET /api/health — Server-side health check for smoke tests
 *
 * Checks that all required env vars are set and the database is reachable.
 * Returns structured JSON so the orchestrator's smoke test can parse it.
 */
export async function GET() {
  const checks: Record<string, { ok: boolean; detail: string }> = {}

  // 1. Required env vars (existence only, never expose values)
  const requiredEnvVars = [
    'NEXT_PUBLIC_API_URL',
    'NEXT_PUBLIC_API_KEY',
    'API_SECRET_KEY',
    'RESEND_API_KEY',
  ]

  for (const key of requiredEnvVars) {
    const value = process.env[key]
    const isPlaceholder = !value || value === 'placeholder'
    checks[key] = {
      ok: !!value && !isPlaceholder,
      detail: !value ? 'missing' : isPlaceholder ? 'placeholder' : 'set',
    }
  }

  // 2. Database connectivity via PostgREST
  if (isPostgrestConfigured()) {
    try {
      const { error } = await postgrestAdmin
        .from('real_estate_agents')
        .select('id')
        .limit(1)
      checks['database'] = {
        ok: !error,
        detail: error ? `query failed: ${error.message}` : 'connected',
      }
    } catch (err: any) {
      checks['database'] = {
        ok: false,
        detail: `exception: ${err.message}`,
      }
    }
  } else {
    checks['database'] = {
      ok: false,
      detail: 'skipped — PostgREST not configured',
    }
  }

  // Overall status
  const allOk = Object.values(checks).every((c) => c.ok)
  const failedChecks = Object.entries(checks)
    .filter(([, c]) => !c.ok)
    .map(([name, c]) => `${name}: ${c.detail}`)

  return NextResponse.json(
    {
      status: allOk ? 'ok' : 'degraded',
      checks,
      ...(failedChecks.length > 0 && { errors: failedChecks }),
    },
    { status: allOk ? 200 : 503 }
  )
}
