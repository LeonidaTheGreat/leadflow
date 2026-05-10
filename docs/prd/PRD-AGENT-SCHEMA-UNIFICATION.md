# PRD: Agent Schema Unification — realEstateAgentRowToAgent Mapper

**PRD ID:** PRD-LEADFLOW-AGENT-SCHEMA-UNIFICATION-001  
**Use Case:** `uc-buyer-journey-agent-schema-unification`  
**Task:** 6d1a48c0-74e5-481c-9e43-0582150477ea  
**Priority:** P1 — Inbound SMS is broken in production  
**Status:** Ready for dev

---

## Problem

The TypeScript `Agent` interface (`lib/types/index.ts:59`) promises fields that do not exist as columns on the `real_estate_agents` table. Every place the raw DB row is cast as `Agent` returns `undefined` for critical fields.

### Production Bug: Inbound SMS Always Fails

`inbound-sms-service.ts:58` queries:
```ts
.eq('is_active', true)
```
`is_active` is not a column in `real_estate_agents`. PostgREST silently filters against a non-existent column → returns 0 rows → `getDefaultAgent()` returns `null` → every inbound SMS webhook exits without an AI response.

---

## Verified Gap: Interface vs. DB

| Agent interface field | DB column | Status |
|---|---|---|
| `id` | `id` | ✓ Match |
| `email` | `email` | ✓ Match |
| `timezone` | `timezone` | ✓ Match |
| `created_at` | `created_at` | ✓ Match |
| `updated_at` | `updated_at` | ✓ Match |
| `name: string` | _(none)_ | ✗ DB has `first_name` + `last_name` |
| `phone: string \| null` | _(none)_ | ✗ DB has `phone_number` |
| `is_active: boolean` | _(none)_ | ✗ DB has `status: text` |
| `market: Market` | _(none)_ | ✗ DB has `state: text` |
| `fub_id: string \| null` | _(none)_ | ✗ No column in real_estate_agents |
| `calcom_username: string \| null` | _(none)_ | ✗ agent_integrations has cal_com_link URL (empty table) |
| `settings: AgentSettings` | _(none)_ | ✗ Separate agent_settings table |

---

## What to Build

### 1. Create `lib/services/agent-mapper.ts`

New file. One exported function that converts a raw `real_estate_agents` DB row to a canonical `Agent` object.

```ts
import type { Agent, AgentSettings } from '@/lib/types'

const DEFAULT_SETTINGS: AgentSettings = {
  auto_respond: true,
  response_delay_seconds: 0,
  human_handoff_threshold: 0.5,
  booking_enabled: false,
}

export function realEstateAgentRowToAgent(row: Record<string, any>): Agent {
  return {
    id: row.id,
    email: row.email,
    name: `${row.first_name ?? ''} ${row.last_name ?? ''}`.trim() || row.email,
    phone: row.phone_number ?? null,
    fub_id: null,           // no fub_id column in real_estate_agents
    calcom_username: null,  // agent_integrations.cal_com_link is empty; defer
    timezone: row.timezone ?? 'America/New_York',
    market: row.state ?? null,
    is_active: row.status === 'active',
    settings: DEFAULT_SETTINGS,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}
```

No class needed — this is a pure transform. No DB calls, no side effects.

### 2. Update `Agent` interface in `lib/types/index.ts`

The `market` field is free text from `state`, not an enum. Update to reflect reality:

```ts
export interface Agent {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  fub_id: string | null;
  calcom_username: string | null;
  timezone: string;
  market: string | null;  // was: Market (enum) — DB stores as state text
  settings: AgentSettings;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
```

Check if `Market` enum is still used elsewhere before removing it — if not, remove it.

### 3. Fix all `getDefaultAgent()` read sites

**5 broken implementations** must be fixed — each must:
1. Query with `.eq('status', 'active')` (not `.eq('is_active', true)`)
2. Apply `realEstateAgentRowToAgent()` to the result

#### `lib/services/inbound-sms-service.ts:56-64`

```ts
import { realEstateAgentRowToAgent } from '@/lib/services/agent-mapper'

export async function getDefaultAgent(): Promise<Agent | null> {
  const { data: agents } = await supabaseAdmin
    .from('real_estate_agents')
    .select('*')
    .eq('status', 'active')
    .limit(1)
  return agents?.[0] ? realEstateAgentRowToAgent(agents[0]) : null
}
```

#### `lib/services/fub-webhook-service.ts:24-32`

Same fix — the filter was already `.eq('status', 'active')` (correct), but the raw row must go through the mapper:

```ts
import { realEstateAgentRowToAgent } from '@/lib/services/agent-mapper'

export async function getDefaultAgent(): Promise<Agent | null> {
  const { data: agents } = await supabaseAdmin
    .from('real_estate_agents')
    .select('*')
    .eq('status', 'active')
    .limit(1)
  return agents?.[0] ? realEstateAgentRowToAgent(agents[0]) : null
}
```

#### `app/api/debug/test-full-flow/route.ts:8-15`

```ts
import { realEstateAgentRowToAgent } from '@/lib/services/agent-mapper'

async function getDefaultAgent(): Promise<Agent | null> {
  const { data: agents } = await supabaseAdmin
    .from('real_estate_agents')
    .select('*')
    .eq('status', 'active')
    .limit(1)
  return agents?.[0] ? realEstateAgentRowToAgent(agents[0]) : null
}
```

#### `app/api/debug/test-formdata/route.ts:8-15`

Same fix as above.

### 4. Fix `resolveAgent()` in `lib/services/inbound-sms-service.ts:297-311`

```ts
export async function resolveAgent(lead: Lead): Promise<Agent | null> {
  let agent: Agent | null = (lead.agent as Agent) || null
  if (!agent && lead.agent_id) {
    const { data: agentData } = await supabaseAdmin
      .from('real_estate_agents')
      .select('*')
      .eq('id', lead.agent_id)
      .single()
    agent = agentData ? realEstateAgentRowToAgent(agentData) : null
  }
  if (!agent) {
    agent = await getDefaultAgent()
  }
  return agent
}
```

Note: `lead.agent` (from join via `agent:real_estate_agents(*)`) also returns a raw row — apply the mapper there too if it's a plain object (check if it already went through the mapper or not at the join site).

### 5. Fix join result in `lib/services/inbound-sms-service.ts:80-87`

The query at line 82 fetches `agent:real_estate_agents(*)` as a join. When the result is used as `Agent`, apply the mapper:

```ts
const rawAgent = existingLead?.agent as Record<string, any> | null
if (!leadError && existingLead) {
  return {
    lead: {
      ...existingLead,
      agent: rawAgent ? realEstateAgentRowToAgent(rawAgent) : undefined,
    } as Lead
  }
}
```

---

## What NOT to Touch

- Do NOT add a `fub_id` column to `real_estate_agents`. The mapper returns `null` — that's correct for now.
- Do NOT touch `agent_integrations` or `agent_settings` tables.
- Do NOT modify any migration files.
- Do NOT change `AgentSettings` interface shape.
- Do NOT rename the `state` column in `real_estate_agents`.
- Do NOT modify `handleLeadAssigned` in fub-webhook-service.ts (the `.eq('fub_id', ...)` query there is a separate issue; the column doesn't exist but fixing it is out of scope for this UC).

---

## Acceptance Criteria

### Verifiable by command

```bash
# 1. No is_active=true filters remain in inbound-sms-service
grep -n "is_active" product/lead-response/dashboard/lib/services/inbound-sms-service.ts
# Expected: 0 matches

# 2. No is_active filters in any of the 4 files
grep -rn "is_active" \
  product/lead-response/dashboard/lib/services/inbound-sms-service.ts \
  product/lead-response/dashboard/lib/services/fub-webhook-service.ts \
  product/lead-response/dashboard/app/api/debug/test-full-flow/route.ts \
  product/lead-response/dashboard/app/api/debug/test-formdata/route.ts
# Expected: 0 matches

# 3. Mapper file exists
ls product/lead-response/dashboard/lib/services/agent-mapper.ts
# Expected: file found

# 4. All 5 getDefaultAgent implementations use .eq('status', 'active')
grep -n "eq('status', 'active')" \
  product/lead-response/dashboard/lib/services/inbound-sms-service.ts \
  product/lead-response/dashboard/lib/services/fub-webhook-service.ts \
  product/lead-response/dashboard/app/api/debug/test-full-flow/route.ts \
  product/lead-response/dashboard/app/api/debug/test-formdata/route.ts
# Expected: 4 matches (one per file)
```

### Functional test

After the fix, calling the signed Twilio inbound webhook endpoint (from the existing debug/test-formdata or test-full-flow routes) with a valid agent in `status='active'` should produce `hasRequiredAgent: true` in the response (or equivalent — the agent object is non-null and has a non-empty `name`).

```bash
# Verify at least one 'active' agent exists:
psql openclaw -c "SELECT id, first_name, last_name, status FROM real_estate_agents WHERE status='active' LIMIT 1"
# If 0 rows: INSERT a test agent first (status='active', first_name='Test', last_name='Agent')
```

### Build gate
```bash
cd product/lead-response/dashboard && npx next build
# Expected: exit 0, no type errors
```

---

## Test to Write (QC will verify)

Add unit test `tests/unit/agent-mapper.test.ts`:

```ts
describe('realEstateAgentRowToAgent', () => {
  it('maps first_name + last_name to name', ...)
  it('maps phone_number to phone', ...)
  it('maps status=active to is_active=true', ...)
  it('maps status=onboarding to is_active=false', ...)
  it('maps state to market', ...)
  it('returns null for fub_id', ...)
  it('uses email as name fallback when first_name and last_name are empty', ...)
})
```

---

## Files Changed

| File | Change |
|---|---|
| `lib/services/agent-mapper.ts` | **New** — realEstateAgentRowToAgent function |
| `lib/types/index.ts` | Update `Agent.market` from `Market` enum to `string \| null` |
| `lib/services/inbound-sms-service.ts` | Fix getDefaultAgent filter + apply mapper in getDefaultAgent, resolveAgent, and join result |
| `lib/services/fub-webhook-service.ts` | Apply mapper in getDefaultAgent |
| `app/api/debug/test-full-flow/route.ts` | Fix getDefaultAgent filter + apply mapper |
| `app/api/debug/test-formdata/route.ts` | Fix getDefaultAgent filter + apply mapper |
| `tests/unit/agent-mapper.test.ts` | **New** — unit tests for mapper |
