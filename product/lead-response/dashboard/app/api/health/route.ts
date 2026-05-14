/**
 * Task Spec (28489ac8-8554-4d02-a7bb-eaf791afe7a3)
 * What:
 * - Change `product/lead-response/dashboard/app/api/health/route.ts` `GET()` database probe to use
 *   an abortable direct PostgREST fetch (`checkDatabaseHealth`) instead of a non-canceling wrapper.
 * - Update timeout guard tests in:
 *   - `product/lead-response/dashboard/tests/fix-health-route-db-timeout-guard.test.js`
 *   - `product/lead-response/dashboard/tests/qc-health-timeout-behavior.test.js`
 *   to assert the new abort-based timeout path.
 * Verify:
 * - `cd product/lead-response/dashboard && npm test -- tests/fix-health-route-db-timeout-guard.test.js tests/qc-health-timeout-behavior.test.js`
 * - `cd product/lead-response/dashboard && npx next build`
 * - `cd /private/var/folders/6d/xd0z4ldx1l17klqt54scqxsc0000gp/T/leadflow-28489ac8-8554-4d02-a7bb-eaf791afe7a3 && npm test`
 * - `cd /private/var/folders/6d/xd0z4ldx1l17klqt54scqxsc0000gp/T/leadflow-28489ac8-8554-4d02-a7bb-eaf791afe7a3 && npm run build`
 * Boundaries:
 * - Do not modify project.config smoke test IDs/URLs.
 * - Do not touch unrelated auth/onboarding middleware or schema/migrations.
 * - Do not change non-health API routes.
 */
import { NextResponse } from 'next/server'
import { isPostgrestConfigured } from '@/lib/db'

const DB_HEALTH_TIMEOUT_MS = 1500

async function checkDatabaseHealth(): Promise<{ ok: boolean; detail: string }> {
  const postgrestUrl = (process.env.NEXT_PUBLIC_API_URL || '').trim()
  const postgrestKey = (process.env.API_SECRET_KEY || process.env.NEXT_PUBLIC_API_KEY || '').trim()
  if (!postgrestUrl) {
    return { ok: false, detail: 'skipped — NEXT_PUBLIC_API_URL missing' }
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), DB_HEALTH_TIMEOUT_MS)
  try {
    const url = new URL('/real_estate_agents', postgrestUrl)
    url.searchParams.set('select', 'id')
    url.searchParams.set('limit', '1')

    const headers: Record<string, string> = { Accept: 'application/json' }
    if (postgrestKey) {
      headers.apikey = postgrestKey
      headers.Authorization = `Bearer ${postgrestKey}`
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers,
      signal: controller.signal,
      cache: 'no-store',
    })

    if (!response.ok) {
      const body = await response.text()
      return {
        ok: false,
        detail: `query failed: HTTP ${response.status}${body ? ` ${body.slice(0, 120)}` : ''}`,
      }
    }

    return { ok: true, detail: 'connected' }
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      return { ok: false, detail: `exception: timeout after ${DB_HEALTH_TIMEOUT_MS}ms` }
    }
    return { ok: false, detail: `exception: ${err?.message || 'unknown error'}` }
  } finally {
    clearTimeout(timeout)
  }
}

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
      detail: !value ? 'missing' : isPlaceholder ? 'placeholder' : 'set' }
  }

  // 2. Database connectivity via PostgREST
  if (isPostgrestConfigured()) {
    const db = await checkDatabaseHealth()
    checks['database'] = db
  } else {
    checks['database'] = {
      ok: false,
      detail: 'skipped — PostgREST not configured' }
  }

  // 3. API connectivity — derives from database connectivity check above
  // If the database is reachable, the PostgREST API is reachable (they are the same endpoint).
  if (checks['database']) {
    checks['api_connectivity'] = {
      ok: checks['database'].ok,
      detail: checks['database'].ok ? 'ok' : checks['database'].detail }
  } else {
    checks['api_connectivity'] = {
      ok: false,
      detail: 'skipped — database check not run' }
  }

  // Critical checks determine overall status (env vars + database connectivity).
  // api_connectivity is informational — external API issues don't make the app unhealthy.
  const criticalKeys = [
    'NEXT_PUBLIC_API_URL',
    'NEXT_PUBLIC_API_KEY',
    'API_SECRET_KEY',
    'RESEND_API_KEY',
    'database',
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
      ...(warningFailed.length > 0 && { warnings: warningFailed }) },
    { status: allOk ? 200 : 503 }
  )
}
