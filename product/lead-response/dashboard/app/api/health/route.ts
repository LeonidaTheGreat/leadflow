import { NextResponse } from 'next/server'
import { createClient } from '@/lib/db'

/**
 * GET /api/health — Server-side health check for smoke tests
 *
 * Checks that all required env vars are set and critical services are reachable.
 * Returns structured JSON so the orchestrator's smoke test can parse it.
 */
export async function GET() {
  const checks: Record<string, { ok: boolean; detail: string }> = {}

  // 1. Required env vars (existence only, never expose values)
  const requiredEnvVars = [
    'NEXT_PUBLIC_API_URL',
    'NEXT_PUBLIC_API_KEY',
    'API_SECRET_KEY',
  ]

  for (const name of requiredEnvVars) {
    const value = process.env[name]
    const isPlaceholder = !value || value === 'placeholder' || value === 'https://placeholder.local'
    checks[name] = {
      ok: !!value && !isPlaceholder,
      detail: !value ? 'missing' : isPlaceholder ? 'placeholder' : 'set',
    }
  }

  // 2. Database connectivity (only if env vars are present)
  const dbUrl = process.env.NEXT_PUBLIC_API_URL
  const dbKey = process.env.API_SECRET_KEY
  if (dbUrl && dbKey && dbUrl !== 'https://placeholder.local' && dbKey !== 'placeholder') {
    try {
      const client = createClient(dbUrl, dbKey)
      const { error } = await client.from('real_estate_agents').select('id').limit(1)
      checks['db_connectivity'] = {
        ok: !error,
        detail: error ? `query failed: ${error.message} (url: ${dbUrl})` : 'connected',
      }
    } catch (err: any) {
      checks['db_connectivity'] = {
        ok: false,
        detail: `exception: ${err.message}`,
      }
    }
  } else {
    checks['db_connectivity'] = {
      ok: false,
      detail: 'skipped — missing credentials',
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
