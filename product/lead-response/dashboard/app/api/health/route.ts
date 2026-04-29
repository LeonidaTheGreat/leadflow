/**
 * Task Spec (ac55e92e-980a-47b2-8644-5d0ccaf89439)
 * What:
 * - Update product/lead-response/dashboard/app/api/health/route.ts GET() to enforce a bounded timeout on the database probe.
 * - Add a focused regression test in product/lead-response/dashboard/tests/health-route-timeout.test.ts for timeout fallback behavior.
 * Verify:
 * - cd product/lead-response/dashboard && npx jest tests/health-route-timeout.test.ts --runInBand should pass.
 * - curl -m 5 https://leadflow-ai-five.vercel.app/api/health should return within 5 seconds.
 * - npm run build, npm run lint, npm test, npm audit --audit-level=high should pass at repo root.
 * Boundaries:
 * - Do not modify unrelated routes/services/schema/migrations.
 * - Do not change dashboard health response shape beyond timeout failure detail.
 */
import { NextResponse } from 'next/server'
import { postgrestAdmin, isPostgrestConfigured } from '@/lib/db'

const DB_HEALTH_TIMEOUT_MS = 1500

function withTimeout<T>(promise: PromiseLike<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`timeout after ${timeoutMs}ms`))
    }, timeoutMs)

    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error) => {
        clearTimeout(timer)
        reject(error)
      }
    )
  })
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
    try {
      const dbCheckPromise = postgrestAdmin
        .from('real_estate_agents')
        .select('id')
        .limit(1) as PromiseLike<{ error: { message: string } | null }>

      const { error } = await withTimeout(
        dbCheckPromise,
        DB_HEALTH_TIMEOUT_MS
      )
      checks['database'] = {
        ok: !error,
        detail: error ? `query failed: ${error.message}` : 'connected' }
    } catch (err: any) {
      checks['database'] = {
        ok: false,
        detail: `exception: ${err.message}` }
    }
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
