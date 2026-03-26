import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/db'

/**
 * GET /api/health — Server-side health check for smoke tests
 *
 * Checks that all required env vars are set and critical services are reachable.
 * Returns structured JSON so the orchestrator's smoke test can parse it.
 *
 * This runs server-side, catching config issues that only manifest as
 * client-side JS crashes (e.g. missing NEXT_PUBLIC_API_URL).
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
    const isPlaceholder = !value || value === 'placeholder' || value === 'https://placeholder.supabase.co'
    checks[key] = {
      ok: !!value && !isPlaceholder,
      detail: !value ? 'missing' : isPlaceholder ? 'placeholder' : 'set',
    }
  }

  // 2. API connectivity (only if env vars are present)
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.imagineapi.org'
  const apiKey = process.env.API_SECRET_KEY || process.env.NEXT_PUBLIC_API_KEY
  if (apiUrl && apiKey && apiUrl !== 'https://placeholder.supabase.co' && apiKey !== 'placeholder') {
    try {
      // Query real_estate_agents (the product customer table) to verify connectivity
      const { error } = await supabaseAdmin.from('real_estate_agents').select('id').limit(1)
      checks['api_connectivity'] = {
        ok: !error,
        detail: error ? `query failed: ${error.message}` : 'connected',
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
