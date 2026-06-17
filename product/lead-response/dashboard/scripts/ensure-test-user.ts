#!/usr/bin/env ts-node
/**
 * ensure-test-user — Genome QA fixture
 *
 * Spec:
 *   What:    Exports ensureTestUser({ email, password, state, data }).
 *            Idempotently provisions a known-good test user in one of 6 lifecycle states × 2 data modes.
 *   Verify:  Last line of stdout is JSON { email, password, state, agent_id, admin_session? }
 *   Bounds:  Operates via PostgREST (NEXT_PUBLIC_API_URL + API_SECRET_KEY).
 *            Only uses source='genome_fixture' for lead rows. Never touches real agents.
 *
 * States: new | onboarded | trial-active | trial-expired | paid | admin
 * Data:   populated (default) | empty
 *
 * Admin note: admin gate is a cookie (admin_session), not a DB column.
 *   The admin state provisions an onboarded user and returns an admin_session
 *   token generated from ADMIN_SECRET (from .env.local). The caller sets this
 *   as the admin_session cookie to access /admin/* routes.
 *
 * Run (from product/lead-response/dashboard/):
 *   npx ts-node --transpile-only \
 *     --compiler-options '{"module":"commonjs","moduleResolution":"node"}' \
 *     scripts/ensure-test-user.ts \
 *     --state onboarded --email genome-onboarded@test.leadflow.internal --password TestPass123
 */

import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'
import bcrypt from 'bcryptjs'

// ── Env loading ──────────────────────────────────────────────────────────────

function loadEnvFile(filePath: string): void {
  try {
    const text = fs.readFileSync(filePath, 'utf-8')
    for (const line of text.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq < 0) continue
      const key = trimmed.slice(0, eq).trim()
      let val = trimmed.slice(eq + 1).trim()
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1)
      }
      // Don't overwrite already-set env vars (first file wins)
      if (!process.env[key]) process.env[key] = val
    }
  } catch {
    // File may not exist — gracefully skip
  }
}

const DASHBOARD_DIR = path.join(__dirname, '..')
loadEnvFile(path.join(DASHBOARD_DIR, '.env'))
loadEnvFile(path.join(DASHBOARD_DIR, '.env.local'))
loadEnvFile(path.join(process.env.HOME ?? '', '.env'))

// ── Types ────────────────────────────────────────────────────────────────────

export type State = 'new' | 'onboarded' | 'trial-active' | 'trial-expired' | 'paid' | 'admin'
export type DataMode = 'populated' | 'empty'

export interface TestUserOptions {
  email: string
  password: string
  state: State
  data?: DataMode
}

export interface TestUserResult {
  email: string
  password: string
  state: State
  agent_id: string
  admin_session?: string
}

export const VALID_STATES: readonly State[] = [
  'new',
  'onboarded',
  'trial-active',
  'trial-expired',
  'paid',
  'admin',
] as const

// ── PostgREST helpers ────────────────────────────────────────────────────────

function getApiUrl(): string {
  return (process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/$/, '')
}

function getApiKey(): string {
  return process.env.API_SECRET_KEY ?? ''
}

function adminHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    apikey: getApiKey(),
    Authorization: `Bearer ${getApiKey()}`,
    ...extra,
  }
}

async function pgGet<T = Record<string, unknown>>(
  table: string,
  params: Record<string, string>
): Promise<T[]> {
  const url = new URL(`${getApiUrl()}/${table}`)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  const res = await fetch(url.toString(), { headers: adminHeaders() })
  if (!res.ok) {
    throw new Error(`GET /${table}: HTTP ${res.status} — ${await res.text()}`)
  }
  return res.json() as Promise<T[]>
}

async function pgInsert<T = Record<string, unknown>>(
  table: string,
  data: Record<string, unknown>
): Promise<T> {
  const res = await fetch(`${getApiUrl()}/${table}`, {
    method: 'POST',
    headers: adminHeaders({ Prefer: 'return=representation' }),
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    throw new Error(`INSERT /${table}: HTTP ${res.status} — ${await res.text()}`)
  }
  const rows = await res.json()
  return (Array.isArray(rows) ? rows[0] : rows) as T
}

async function pgPatch(
  table: string,
  filters: Record<string, string>,
  data: Record<string, unknown>
): Promise<void> {
  const url = new URL(`${getApiUrl()}/${table}`)
  for (const [k, v] of Object.entries(filters)) url.searchParams.set(k, v)
  const res = await fetch(url.toString(), {
    method: 'PATCH',
    headers: adminHeaders({ Prefer: 'return=representation' }),
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    throw new Error(`PATCH /${table}: HTTP ${res.status} — ${await res.text()}`)
  }
}

async function pgDelete(table: string, filters: Record<string, string>): Promise<void> {
  const url = new URL(`${getApiUrl()}/${table}`)
  for (const [k, v] of Object.entries(filters)) url.searchParams.set(k, v)
  const res = await fetch(url.toString(), {
    method: 'DELETE',
    headers: adminHeaders(),
  })
  if (!res.ok) {
    throw new Error(`DELETE /${table}: HTTP ${res.status} — ${await res.text()}`)
  }
}

// ── State column maps ────────────────────────────────────────────────────────

export function stateColumns(state: State): Record<string, unknown> {
  const now = new Date().toISOString()
  const in14d = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
  const minus15d = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const onboardedBase: Record<string, unknown> = {
    email_verified: true,
    onboarding_completed: true,
    onboarding_completed_at: now,
    fub_onboarding_completed: true,
    onboarding_step: 5,
  }

  switch (state) {
    case 'new':
      return {
        email_verified: true,
        onboarding_completed: false,
        onboarding_step: 0,
        plan_tier: 'trial',
        subscription_status: 'inactive',
        trial_start_date: now,
        trial_ends_at: in14d,
      }

    case 'onboarded':
      return {
        ...onboardedBase,
        plan_tier: 'trial',
        subscription_status: 'inactive',
        trial_start_date: now,
        trial_ends_at: in14d,
      }

    case 'trial-active':
      return {
        ...onboardedBase,
        plan_tier: 'trial',
        subscription_status: 'trial',
        trial_start_date: now,
        trial_ends_at: in14d,
      }

    case 'trial-expired':
      return {
        ...onboardedBase,
        plan_tier: 'trial',
        subscription_status: 'trial',
        trial_start_date: minus15d,
        trial_ends_at: yesterday,
      }

    case 'paid':
      return {
        ...onboardedBase,
        plan_tier: 'starter',
        subscription_status: 'active',
        trial_start_date: minus15d,
        trial_ends_at: null,
        subscription_start_date: now,
      }

    case 'admin':
      // Admin gate = admin_session cookie (HMAC of ADMIN_SECRET), not a DB column.
      // Provision as an onboarded user; ensureTestUser returns admin_session in result.
      return {
        ...onboardedBase,
        plan_tier: 'trial',
        subscription_status: 'inactive',
        trial_start_date: now,
        trial_ends_at: in14d,
      }

    default: {
      const _exhaustive: never = state
      throw new Error(`Unknown state: ${String(_exhaustive)}`)
    }
  }
}

// ── Admin session ─────────────────────────────────────────────────────────────

export function generateAdminSession(secret?: string): string {
  const adminSecret = secret ?? process.env.ADMIN_SECRET ?? ''
  if (!adminSecret || adminSecret.length < 16) {
    throw new Error(
      'ADMIN_SECRET is not set or too short (must be ≥16 chars). ' +
        'Check .env.local in the dashboard directory.'
    )
  }
  const issuedAt = Date.now().toString()
  const sig = crypto.createHmac('sha256', adminSecret).update(issuedAt).digest('hex')
  return `${issuedAt}.${sig}`
}

// ── Lead management ───────────────────────────────────────────────────────────

async function ensureLeadPopulated(agentId: string): Promise<void> {
  const existing = await pgGet<{ id: string }>('leads', {
    agent_id: `eq.${agentId}`,
    source: 'eq.genome_fixture',
    select: 'id',
    limit: '1',
  })
  if (existing.length > 0) {
    console.log('[ensure-test-user] Sample lead already exists — skipping seed')
    return
  }
  const now = new Date().toISOString()
  await pgInsert('leads', {
    agent_id: agentId,
    name: 'Alex Genome Test',
    email: 'genome-lead@test.leadflow.internal',
    phone: '+16045550001',
    source: 'genome_fixture',
    status: 'new',
    market: 'ca-ontario',
    consent_sms: true,
    is_sample: true,
    sample_type: 'genome_qa',
    created_at: now,
    updated_at: now,
  })
  console.log('[ensure-test-user] Sample lead seeded')
}

async function ensureLeadEmpty(agentId: string): Promise<void> {
  const existing = await pgGet<{ id: string }>('leads', {
    agent_id: `eq.${agentId}`,
    source: 'eq.genome_fixture',
    select: 'id',
    limit: '1',
  })
  if (existing.length === 0) {
    console.log('[ensure-test-user] No genome_fixture leads to remove')
    return
  }
  await pgDelete('leads', {
    agent_id: `eq.${agentId}`,
    source: 'eq.genome_fixture',
  })
  console.log('[ensure-test-user] Removed genome_fixture leads (data=empty)')
}

// ── Core ──────────────────────────────────────────────────────────────────────

export async function ensureTestUser(opts: TestUserOptions): Promise<TestUserResult> {
  const { email, password, state, data = 'populated' } = opts

  if (!VALID_STATES.includes(state)) {
    throw new Error(`Invalid state "${state}". Valid: ${VALID_STATES.join(', ')}`)
  }
  const apiUrl = getApiUrl()
  const apiKey = getApiKey()
  if (!apiUrl || !apiKey) {
    throw new Error('NEXT_PUBLIC_API_URL and API_SECRET_KEY must be set in environment')
  }

  const lowerEmail = email.toLowerCase()

  // 1. Idempotency: check if user exists
  const existing = await pgGet<{ id: string }>('real_estate_agents', {
    email: `eq.${lowerEmail}`,
    select: 'id',
    limit: '1',
  })

  let agentId: string

  if (existing.length > 0) {
    agentId = existing[0].id
    console.log(`[ensure-test-user] Reusing existing user ${lowerEmail} (${agentId})`)
  } else {
    // 2. Create user — replicates trial-signup logic without requiring the HTTP server
    const passwordHash = await bcrypt.hash(password, 10)
    const now = new Date().toISOString()
    const in14d = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()

    const agent = await pgInsert<{ id: string }>('real_estate_agents', {
      email: lowerEmail,
      first_name: 'Genome',
      last_name: `Test-${state}`,
      password_hash: passwordHash,
      email_verified: true,
      plan_tier: 'trial',
      subscription_status: 'inactive',
      trial_start_date: now,
      trial_ends_at: in14d,
      mrr: 0,
      source: 'genome_fixture',
      onboarding_completed: false,
      onboarding_step: 0,
      created_at: now,
      updated_at: now,
    })

    if (!agent?.id) {
      throw new Error('INSERT real_estate_agents returned no id — check PostgREST response')
    }
    agentId = agent.id
    console.log(`[ensure-test-user] Created user ${lowerEmail} (${agentId})`)
  }

  // 3. Apply state-specific column patch
  const cols = stateColumns(state)
  await pgPatch('real_estate_agents', { id: `eq.${agentId}` }, {
    ...cols,
    updated_at: new Date().toISOString(),
  })
  console.log(`[ensure-test-user] State '${state}' applied`)

  // 4. Reconcile lead data
  if (data === 'populated') {
    await ensureLeadPopulated(agentId)
  } else {
    await ensureLeadEmpty(agentId)
  }

  // 5. Build result
  const result: TestUserResult = { email: lowerEmail, password, state, agent_id: agentId }
  if (state === 'admin') {
    result.admin_session = generateAdminSession()
    console.log('[ensure-test-user] Admin session generated (valid 24h)')
  }

  return result
}

// ── CLI ───────────────────────────────────────────────────────────────────────

function parseCliArgs(): TestUserOptions {
  const args = process.argv.slice(2)
  const flag = (name: string): string | undefined => {
    const i = args.indexOf(name)
    return i >= 0 && i + 1 < args.length ? args[i + 1] : undefined
  }

  const state = (flag('--state') ?? 'new') as State
  const data = (flag('--data') ?? 'populated') as DataMode
  const email = flag('--email') ?? `genome-${state}@test.leadflow.internal`
  const password = flag('--password') ?? 'GenomeTest123!'

  if (!VALID_STATES.includes(state)) {
    console.error(`[ensure-test-user] Invalid --state "${state}". Valid: ${VALID_STATES.join(', ')}`)
    process.exit(1)
  }
  if (data !== 'populated' && data !== 'empty') {
    console.error(`[ensure-test-user] Invalid --data "${data}". Valid: populated, empty`)
    process.exit(1)
  }

  return { email, password, state, data }
}

if (require.main === module) {
  const opts = parseCliArgs()
  ensureTestUser(opts)
    .then(result => {
      // Contract: last line MUST be parseable JSON — capture-screenshots reads this
      console.log(JSON.stringify(result))
      process.exit(0)
    })
    .catch((err: Error) => {
      console.error('[ensure-test-user] FAILED:', err.message ?? String(err))
      process.exit(1)
    })
}
