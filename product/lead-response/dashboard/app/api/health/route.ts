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

  // 3. API connectivity (only if env vars are present)
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.imagineapi.org'
  const apiKey = process.env.API_SECRET_KEY || process.env.NEXT_PUBLIC_API_KEY
  if (apiUrl && apiKey && apiUrl !== 'https://placeholder.supabase.co' && apiKey !== 'placeholder') {
    try {
      const response = await fetch(`${apiUrl}/api/health`, {
        headers: { 'x-api-key': apiKey },
        signal: AbortSignal.timeout(5000),
      })
      const reachable = response.status < 500
      checks['api_connectivity'] = {
        ok: reachable,
        detail: response.ok ? 'connected' : `HTTP ${response.status} (reachable)`,
      }
    } catch (err: any) {
      checks['api_connectivity'] = {
        ok: false,
        detail: `exception: ${err.message}`,
      }
    }
  } else {
    checks['api_connectivity'] = {
      ok: false,
      detail: 'skipped — missing credentials',
    }
  }

  // Critical checks determine overall status (env vars + supabase connectivity).
  // api_connectivity is informational — external API issues don't make the app unhealthy.
  const criticalKeys = [
    'NEXT_PUBLIC_API_URL',
    'NEXT_PUBLIC_API_KEY',
    'API_SECRET_KEY',
    'RESEND_API_KEY',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'supabase_connectivity',
  ]
  const criticalFailed = Object.entries(checks)
    .filter(([name, c]) => criticalKeys.includes(name) && !c.ok)
    .map(([name, c]) => `${name}: ${c.detail}`)
  const warningFailed = Object.entries(checks)
    .filter(([name, c]) => !criticalKeys.includes(name) && !c.ok)
    .map(([name, c]) => `${name}: ${c.detail}`)

  const allOk = criticalFailed.length === 0

  return NextResponse.json(
    {
      status: allOk ? 'ok' : 'degraded',
      checks,
      ...(criticalFailed.length > 0 && { errors: criticalFailed }),
      ...(warningFailed.length > 0 && { warnings: warningFailed }),
    },
    { status: allOk ? 200 : 503 }
  )
}
