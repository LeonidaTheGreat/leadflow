# PRD: Fix Checkout — Replace subscription_attempts with checkout_sessions

**PRD ID:** `PRD-FIX-CHECKOUT-SUBSCRIPTION-ATTEMPTS`  
**Status:** approved  
**Date:** 2026-03-15  
**Linked UC:** `fix-subscription-attempts-table-does-not-exist-in-supa`  
**Severity:** High — every checkout attempt returns HTTP 500

---

## Problem

`app/api/billing/create-checkout/route.ts` inserts into `subscription_attempts` after creating a Stripe checkout session. This table **does not exist** in Supabase (error: `PGRST205`). The result is a 500 error on every checkout attempt, blocking 100% of paid conversions.

### Why previous fixes failed
Previous tasks attempted to create a `subscription_attempts` table via SQL migrations, but the migration either was not applied to production or the table was never created. This PRD takes a different approach: **do not create the missing table — replace the insert with the existing `checkout_sessions` table**, which already exists and serves the same purpose.

---

## Solution

**One file change.** In `app/api/billing/create-checkout/route.ts`, replace the failing insert at the bottom of the `POST` handler:

### Remove (lines ~188–194):
```typescript
// Log subscription attempt
await supabase.from('subscription_attempts').insert({
  agent_id: agentId,
  tier,
  stripe_session_id: session.id,
  status: 'session_created',
  created_at: new Date().toISOString(),
})
```

### Replace with:
```typescript
// Log checkout session using existing checkout_sessions table
await supabase.from('checkout_sessions').insert({
  user_id: agentId,
  stripe_session_id: session.id,
  tier: tier.split('_')[0],  // 'starter' | 'professional' | 'enterprise'
  interval: tier.includes('annual') ? 'year' : 'month',
  status: 'pending',
  url: session.url,
  expires_at: session.expires_at
    ? new Date(session.expires_at * 1000).toISOString()
    : null,
})
```

### Column mapping justification
| Old (`subscription_attempts`) | New (`checkout_sessions`) | Notes |
|---|---|---|
| `agent_id` | `user_id` | `checkout_sessions` uses `user_id` (FK to `agents.id`) |
| `tier` | `tier` + `interval` | Split `"starter_monthly"` → tier=`"starter"`, interval=`"month"` |
| `stripe_session_id` | `stripe_session_id` | Same |
| `status: 'session_created'` | `status: 'pending'` | `checkout_sessions` CHECK constraint: `pending|completed|expired|abandoned` |
| `created_at` | (auto) | `created_at` defaults to `CURRENT_TIMESTAMP` |
| (missing) | `url` | Store the Stripe Checkout URL for recovery/debugging |
| (missing) | `expires_at` | Stripe sessions expire; useful for cleanup |

---

## Acceptance Criteria

1. **AC-1 — No 500 on checkout:** POST to `/api/billing/create-checkout` with valid `{ tier, agentId, email }` returns HTTP 200 with `{ sessionId, url }` — no 500.
2. **AC-2 — Record persisted:** After a successful POST, a row appears in `checkout_sessions` with `status='pending'` and the correct `user_id`, `tier`, `interval`, `stripe_session_id`.
3. **AC-3 — Stripe session live:** The returned `url` is a valid `https://checkout.stripe.com/...` URL that loads without error.
4. **AC-4 — Build passes:** No TypeScript compilation errors introduced.
5. **AC-5 — Error path unchanged:** Requests with missing/invalid fields still return 400/404/503 as before.

---

## Scope

| In scope | Out of scope |
|---|---|
| Replace `subscription_attempts` insert with `checkout_sessions` | Creating a `subscription_attempts` table |
| Correct column mapping | Changes to webhook handler |
| TypeScript types (no new imports needed) | Changes to Stripe session creation logic |
| Verify `checkout_sessions` constraint compliance | Backfilling old data |

---

## Test Spec

### Manual test (Stojan):
1. Log in as a real estate agent with a valid UUID
2. Go to `/pricing` and click an upgrade button
3. Verify the checkout page redirects to Stripe (not a 500 error page)
4. Check Supabase `checkout_sessions` table: confirm a new row with `status='pending'`

### Automated (E2E):
- POST `/api/billing/create-checkout` with `{ tier: "starter_monthly", agentId: <valid-uuid>, email: "test@example.com" }` → expect 200
- Verify `checkout_sessions` row created with `tier='starter'`, `interval='month'`, `status='pending'`

---

## File to Change

```
product/lead-response/dashboard/app/api/billing/create-checkout/route.ts
```

**Only this file needs to change.** No database migrations, no new tables, no new dependencies.
