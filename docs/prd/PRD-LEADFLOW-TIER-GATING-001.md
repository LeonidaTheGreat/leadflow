# PRD-LEADFLOW-TIER-GATING-001

**Title:** Tier Feature Gating — Enforce Pricing Claims in Code  
**Status:** Ready for Dev  
**Priority:** P1  
**Use Case:** uc-buyer-journey-tier-gating-or-remove  
**Author:** PM Agent  
**Date:** 2026-05-10  

---

## Problem

The pricing page promises tier-restricted features (Cal.com booking, API access, lead routing, white-label) but zero enforcement exists in code. Any user on any plan — including `trial` and `starter` — can access Pro+ and Team+ endpoints today. This creates two commercial risks:

1. **Revenue leakage:** Starter users get Pro features for free.
2. **Trust erosion:** When we do enforce tiers, users who expected permanent access will churn.

Additionally, `docs/design/pricing-data.ts` had two bugs (now fixed by this PM task):
- `calCom: true` for Starter — contradicts PMF.md (Cal.com is Pro+)
- FEATURE_CATEGORIES included `sla`, `complianceReporting`, `customContracts` — contractual/human promises with no code backing; removed from the comparison table

---

## Decision

**Build feature gates. Do not remove tier promises from the pricing page.**

Rationale: The tier promises are correct (per PMF.md). The gap is enforcement. Removing promises would weaken the pricing page and harm conversion. Feature gates also enable "upgrade to unlock" prompts — a conversion mechanism.

---

## Tier Matrix (canonical — matches PMF.md)

| Feature | Trial | Starter | Pro | Team | Brokerage |
|---------|-------|---------|-----|------|-----------|
| Cal.com booking | ✗ | ✗ | ✓ | ✓ | ✓ |
| API access / webhooks | ✗ | ✗ | ✓ | ✓ | ✓ |
| Lead routing | ✗ | ✗ | ✗ | ✓ | ✓ |
| White-label | ✗ | ✗ | ✗ | ✗ | ✓ |

Tier rank order: `trial` (0) < `starter` (1) < `pro` (2) < `team` (3) < `brokerage` (4)

---

## Implementation Status

### Already Implemented (committed with this PR)

**`lib/plans.ts`** — single source of truth ✅  
Uses an allow-list pattern: each feature maps to an array of permitted tiers.

Key design choice: `trial` and `pilot` tiers receive Pro-level access so users can fully evaluate the product before upgrading. This is correct product behavior.

```
calcom:        ['trial', 'pilot', 'pro', 'team', 'brokerage']  // Starter excluded
leadRouting:   ['team', 'brokerage']
apiAccess:     ['trial', 'pilot', 'pro', 'team', 'brokerage']  // Starter excluded
whiteLabel:    ['brokerage']
```

**`lib/feature-gates.ts`** — pure gate functions ✅  
Exports: `canUseCalcom`, `canUseLeadRouting`, `canUseApi`, `canUseWhiteLabel`, `canUseTeamAnalytics`, `canUseUnlimitedSms`, `tierGateError`.  
No DB calls — pass `plan_tier` from DB before calling.

`tierGateError(feature, requiredPlan)` returns a standardized 403 payload.

### Still Required

### Shared helper: `getAgentTier(agentId: string): Promise<PlanTier | null>`

Add to `lib/feature-gates.ts`:

```typescript
import { supabaseAdmin } from '@/lib/db'
import type { PlanTier } from './plans'

export async function getAgentTier(agentId: string): Promise<PlanTier | null> {
  const { data } = await supabaseAdmin
    .from('real_estate_agents')
    .select('plan_tier')
    .eq('id', agentId)
    .single()
  return (data?.plan_tier as PlanTier) ?? null
}
```

### Enforcement at ≥4 route sites

For each gated route: validate session → get tier → check gate → 403 if denied.

**Response format for 403:**
```json
{
  "error": "Feature not available on your plan",
  "feature": "<feature-key>",
  "requiredTier": "<tier>",
  "upgradePath": "/dashboard/upgrade"
}
```

#### Site 1: `app/api/integrations/cal-com/connect/route.ts`

Current auth: `x-agent-id` header (no session validation). Fix this too — the agent_id should come from a validated session, same as `booking/route.ts`.

Add after session validation:
```typescript
const tier = await getAgentTier(agentId)
if (!tier || !canUseCalcom(tier)) {
  return NextResponse.json(
    { error: 'Feature not available on your plan', feature: 'calCom', requiredTier: 'pro', upgradePath: '/dashboard/upgrade' },
    { status: 403 }
  )
}
```

Apply to both `POST` (connect) and `DELETE` (disconnect) handlers.

#### Site 2: `app/api/integrations/cal-com/verify/route.ts`

Currently has NO auth at all. Add session validation + tier check:
```typescript
const sessionToken = request.cookies.get('leadflow_session')?.value
if (!sessionToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
const session = await validateSession(sessionToken)
if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
const tier = await getAgentTier(session.userId)
if (!tier || !canUseCalcom(tier)) {
  return NextResponse.json(
    { error: 'Feature not available on your plan', feature: 'calCom', requiredTier: 'pro', upgradePath: '/dashboard/upgrade' },
    { status: 403 }
  )
}
```

#### Site 3: `app/api/booking/route.ts` — GET handler

Agent is already fetched via `getAgentById(agentId)`. Add tier check after agent fetch:
```typescript
if (!canUseCalcom(agent.plan_tier as PlanTier)) {
  return NextResponse.json(
    { error: 'Feature not available on your plan', feature: 'calCom', requiredTier: 'pro', upgradePath: '/dashboard/upgrade' },
    { status: 403 }
  )
}
```

#### Site 4: `app/api/booking/route.ts` — POST handler

Same pattern — add tier check after `getAgentById`:
```typescript
if (!canUseCalcom(agent.plan_tier as PlanTier)) {
  return NextResponse.json(
    { error: 'Feature not available on your plan', feature: 'calCom', requiredTier: 'pro', upgradePath: '/dashboard/upgrade' },
    { status: 403 }
  )
}
```

---

## Files to Change

| File | Change |
|------|--------|
| `lib/plans.ts` | EXISTS — committed with this PR; do not modify unless the feature matrix changes |
| `lib/feature-gates.ts` | EXISTS — add `getAgentTier()` helper |
| `app/api/integrations/cal-com/connect/route.ts` | Add session validation + canUseCalcom check to POST and DELETE |
| `app/api/integrations/cal-com/verify/route.ts` | Add session validation + canUseCalcom check |
| `app/api/booking/route.ts` | Add canUseCalcom check after agent fetch in GET and POST |

**Do NOT touch:**
- `docs/design/pricing-data.ts` — already fixed by PM task (calCom: false for Starter, fluff rows removed)
- `middleware.ts` — tier gating happens at the API route level, not middleware
- Any billing, Stripe, or onboarding routes

---

## Acceptance Criteria

1. `lib/plans.ts` exists; all tier comparisons import from it
2. `lib/feature-gates.ts` exports `canUseCalcom`, `canUseApi`, `canUseLeadRouting`, `canUseWhiteLabel`
3. ≥4 enforcement sites in production routes
4. A request to `POST /api/integrations/cal-com/connect` with a valid Starter session returns `403`
5. A request to `GET /api/booking` with a valid Pro session returns success (not 403)
6. `npm run build`, `npm run lint`, `npm test` all exit 0

---

## Tests Required

File: `tests/unit/feature-gates.test.ts`

Cover:
- `canUseCalcom('trial')` → false
- `canUseCalcom('starter')` → false
- `canUseCalcom('pro')` → true
- `canUseCalcom('team')` → true
- `canUseLeadRouting('pro')` → false
- `canUseLeadRouting('team')` → true
- `canUseWhiteLabel('team')` → false
- `canUseWhiteLabel('brokerage')` → true

---

## Out of Scope

- UI "upgrade to unlock" banners (separate UC)
- Lead routing endpoint gating (no lead routing endpoint exists yet; gate it when it's built)
- White-label enforcement (no white-label UI exists; gate it when built)
- Downgrade enforcement / grandfathering rules
- Stripe webhook → plan_tier sync (separate billing UC)
