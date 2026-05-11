# PRD-LEADFLOW-AGENT-SCHEMA-UNIFICATION-001
## Agent Schema Unification: Add fub_id and calcom_username to real_estate_agents

**Status:** Ready for Dev  
**Priority:** P0 — FUB lead assignment is silently broken  
**UC:** uc-buyer-journey-agent-schema-unification  
**Task ID:** f89b03da-2559-47df-8e0d-fbfd8acc2c14

---

## Problem

The `Agent` TS interface declares `fub_id` and `calcom_username` fields, but `real_estate_agents` has neither column. The mapper (`lib/agent-mapper.ts`) hardcodes both as `null`.

**Silent production breakage:** `handleLeadAssigned()` in `fub-webhook-service.ts:366` queries:
```ts
.eq('fub_id', fubLead.agentId)
```
on `real_estate_agents`. Since the column doesn't exist, PostgREST returns no rows. Every FUB lead assignment silently returns `{ success: true, sms_sent: false, reason: 'no_agent_found' }`. No SMS is sent. The AI never responds to leads routed via FUB.

**Already done — do NOT redo:**
- `realEstateAgentRowToAgent` mapper exists at `lib/agent-mapper.ts` ✅
- Mapper is imported and applied at all read sites ✅
- `getDefaultAgent()` in both services uses `.eq('status', 'active')` (correct DB column) ✅
- `resolveAgent()` in `inbound-sms-service.ts` uses the mapper ✅

---

## What needs to be built

### 1. Migration — add columns to real_estate_agents

File: `~/.openclaw/genome/migrations/0XX_add_fub_id_calcom_username_to_agents.sql`

```sql
ALTER TABLE real_estate_agents
  ADD COLUMN IF NOT EXISTS fub_id TEXT,
  ADD COLUMN IF NOT EXISTS calcom_username TEXT;

CREATE INDEX IF NOT EXISTS idx_real_estate_agents_fub_id
  ON real_estate_agents(fub_id)
  WHERE fub_id IS NOT NULL;
```

Run locally: `psql openclaw -f <migration_file>`

### 2. Update RealEstateAgentRow interface

File: `product/lead-response/dashboard/lib/agent-mapper.ts`

Add to `RealEstateAgentRow` interface (after line 11, before `satisfaction_ping_enabled`):
```ts
fub_id?: string | null
calcom_username?: string | null
```

### 3. Update realEstateAgentRowToAgent mapper

File: `product/lead-response/dashboard/lib/agent-mapper.ts`

Change lines 43–44 from:
```ts
fub_id: null,
calcom_username: null,
```
to:
```ts
fub_id: row.fub_id ?? null,
calcom_username: row.calcom_username ?? null,
```

---

## Files to change

| File | Change |
|------|--------|
| `~/.openclaw/genome/migrations/0XX_add_fub_id_calcom_username_to_agents.sql` | New migration (add 2 columns + index) |
| `product/lead-response/dashboard/lib/agent-mapper.ts` | Update `RealEstateAgentRow` + mapper (4 lines) |

**Do NOT change:**
- `inbound-sms-service.ts` — already correct
- `fub-webhook-service.ts` — already uses mapper correctly; will work once column exists
- `lib/types/index.ts` — Agent interface is already correct
- Any other files

---

## Acceptance Criteria

```bash
# 1. Column exists in DB
psql openclaw -c "\d real_estate_agents" | grep fub_id
# Expected: fub_id | text | ...

# 2. No hardcoded null for fub_id in mapper
grep "fub_id: null" product/lead-response/dashboard/lib/agent-mapper.ts | wc -l
# Expected: 0

# 3. Mapper passes through fub_id from row
grep "fub_id: row.fub_id" product/lead-response/dashboard/lib/agent-mapper.ts | wc -l
# Expected: 1

# 4. No is_active=true filter anywhere in inbound-sms-service
grep "is_active.*true\|is_active.*1" product/lead-response/dashboard/lib/services/inbound-sms-service.ts | wc -l
# Expected: 0

# 5. Dashboard build passes
cd product/lead-response/dashboard && npm run build
# Expected: exit 0

# 6. Tests pass
npm test
# Expected: 0 failures
```

---

## Risk

**Low.** The mapper change is additive — passing `row.fub_id ?? null` has identical behavior to `null` until an agent row has `fub_id` populated. The migration uses `ADD COLUMN IF NOT EXISTS` and is non-destructive. No existing queries break.

**Onboarding note:** Agents will need their FUB user ID set in the dashboard (or via a backfill script) before `handleLeadAssigned` can match them. That's a separate data-entry task, not part of this PRD.
