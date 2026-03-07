import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * GET /api/health — Server-side health check for smoke tests
 *
 * Checks that all required env vars are set and critical services are reachable.
 * Returns structured JSON so the orchestrator's smoke test can parse it.
 *
 * This runs server-side, catching config issues that only manifest as
 * client-side JS crashes (e.g. missing NEXT_PUBLIC_SUPABASE_URL).
 */
export async function GET() {
  const checks: Record<string, { ok: boolean; detail: string }> = {}

  // 1. Required env vars (existence only, never expose values)
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
  ]

  for (const key of requiredEnvVars) {
    const value = process.env[key]
    const isPlaceholder = !value || value === 'placeholder' || value === 'https://placeholder.supabase.co'
    checks[key] = {
      ok: !!value && !isPlaceholder,
      detail: !value ? 'missing' : isPlaceholder ? 'placeholder' : 'set',
    }
  }

  // 2. Supabase connectivity (only if env vars are present)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (supabaseUrl && supabaseKey && supabaseUrl !== 'https://placeholder.supabase.co' && supabaseKey !== 'placeholder') {
    try {
      const client = createClient(supabaseUrl, supabaseKey)
      const { error } = await client.from('real_estate_agents').select('id').limit(1)
      checks['supabase_connectivity'] = {
        ok: !error,
        detail: error ? `query failed: ${error.message}` : 'connected',
      }
    } catch (err: any) {
      checks['supabase_connectivity'] = {
        ok: false,
        detail: `exception: ${err.message}`,
      }
    }
  } else {
    checks['supabase_connectivity'] = {
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
