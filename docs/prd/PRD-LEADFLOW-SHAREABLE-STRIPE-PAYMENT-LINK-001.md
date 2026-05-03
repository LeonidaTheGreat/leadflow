# PRD: Shareable Stripe Payment Link — Admin Generates Per-Agent Checkout URL

**Document ID:** PRD-LEADFLOW-SHAREABLE-STRIPE-PAYMENT-LINK-001  
**Status:** Ready for Development  
**Date:** 2026-05-03  
**Author:** Product Manager  
**Priority:** P0 — Revenue Critical  
**Use Case:** feat-shareable-stripe-payment-link-admin

---

## 1. Problem Statement

Self-serve checkout requires agents to log in and navigate to billing. The upgrade-offer email tool is blocked by an unverified sending domain. There is **no way for Stojan to generate a direct payment link** and share it via iMessage, WhatsApp, LinkedIn, or any channel — bypassing the broken email infrastructure entirely.

With 11 days to the first-payment target and 11 pilot agents, the fastest path to revenue is a shareable Stripe Checkout URL that Stojan can copy and send manually through any channel.

### Why This Matters Now

| Metric | Current | Target |
|--------|---------|--------|
| Paying customers | 0 | 1 |
| MRR | $0 | $49+ |
| Days remaining | 11 | — |
| Pilot agents | 11 | — |

Every hour without this feature is a missed opportunity to close pilot agents who have already expressed interest but can't navigate self-serve checkout.

---

## 2. Solution Overview

Three components, in priority order:

1. **Admin API endpoint** — `POST /api/admin/generate-payment-link` creates a Stripe Checkout Session for any agent, returns a shareable URL.
2. **Webhook handler fix** — `checkout.session.completed` handler adds `metadata.agent_id` fallback so payment links work even when the agent is not logged in.
3. **Admin UI** — Payment Links tab on an existing admin page with agent list, link generation, and status tracking.

### Architecture Diagram

```
Stojan → Admin UI → POST /api/admin/generate-payment-link
                         │
                         ▼
                    Stripe Checkout Session
                    (client_reference_id: agentId)
                    (metadata: { agent_id, source: 'admin_payment_link' })
                         │
                         ▼
                    Returns { url, sessionId, expiresAt }
                         │
                    Stojan copies URL → sends via iMessage/WhatsApp/LinkedIn
                         │
                    Agent opens URL → Stripe-hosted checkout
                         │
                         ▼
                    checkout.session.completed webhook
                         │
                    Resolves agent via client_reference_id
                    (fallback: metadata.agent_id)
                         │
                         ▼
                    Agent upgraded: subscription_status='active', plan_tier set
```

---

## 3. Component Specifications

### 3.1 Admin API Endpoint

**Location:** `product/lead-response/dashboard/app/api/admin/generate-payment-link/route.ts`

**Method:** `POST`

**Authentication:** `ADMIN_EMAIL`-based auth via existing `AuthService.isAdminUser()` — consistent with all other Next.js admin routes (`/api/admin/pilots`, `/api/admin/invite-pilot`, etc.). Do NOT introduce a new auth mechanism.

**Request Body:**
```json
{
  "agentId": "uuid",
  "tier": "starter_monthly" | "pro_monthly" | "team_monthly",
  "discountPercent": 0-100  // optional, default: 0
}
```

**Validation:**
- `agentId`: valid UUID, must exist in `real_estate_agents`
- `tier`: must be a key in `PRICING_TIERS` (reuse from `create-checkout/route.ts`)
- `discountPercent`: integer 0-100, optional

**Behavior:**
1. Validate admin auth (401 if not admin)
2. Validate request body (400 if invalid)
3. Look up agent in `real_estate_agents` — need `id`, `email`, `first_name`, `status`, `subscription_status`
4. Guard: reject if agent already has `subscription_status = 'active'` (409 Conflict)
5. Resolve Stripe price ID from env vars (reuse `PRICE_ID_ENV_MAP` pattern from `create-checkout`)
6. If `discountPercent > 0`: create a one-time Stripe Coupon (`percent_off`, `max_redemptions: 1`, `duration: 'once'`)
7. Create or retrieve Stripe customer by email (reuse pattern from `create-checkout`)
8. Create Stripe Checkout Session:
   - `customer`: Stripe customer ID
   - `client_reference_id`: agentId (ensures existing webhook handler works without modification)
   - `line_items`: [{ price: priceId, quantity: 1 }]
   - `mode`: 'subscription'
   - `subscription_data.trial_period_days`: 14 (match existing flow)
   - `subscription_data.metadata`: `{ agent_id: agentId, tier, source: 'admin_payment_link' }`
   - `discounts`: [{ coupon: couponId }] (only if discount applies)
   - `success_url`: `${baseUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}`
   - `cancel_url`: `${baseUrl}/pricing?cancelled=true`
   - `expires_at`: Math.floor(Date.now() / 1000) + 86400 (24 hours)
   - `automatic_tax`: { enabled: true }
9. Log to `checkout_sessions` table: `user_id`, `tier`, `interval`, `stripe_session_id`, `status: 'pending'`, `url`, `expires_at`, `created_at`
10. Return response

**Response (200):**
```json
{
  "url": "https://checkout.stripe.com/c/pay/cs_live_...",
  "sessionId": "cs_live_...",
  "expiresAt": "2026-05-04T12:00:00.000Z",
  "agent": {
    "id": "uuid",
    "email": "agent@example.com",
    "name": "Jane Smith"
  }
}
```

**Error Responses:**
| Code | Condition |
|------|-----------|
| 401 | Not admin |
| 400 | Missing/invalid fields |
| 404 | Agent not found |
| 409 | Agent already has active subscription |
| 503 | Stripe not configured / price ID missing |

**Security:**
- Admin-only via `isAdminUser()` — no public access
- No sensitive data in URL (Stripe handles the checkout page)
- Coupon is single-use and tied to one session
- Rate limit: inherit existing admin route patterns (no special rate limit — admin-only endpoint)

### 3.2 Webhook Handler Fix

**Location:** `product/lead-response/dashboard/app/api/webhooks/stripe/route.ts`

**Current behavior (line 62-65):**
```typescript
const userId = session.client_reference_id
const subscriptionId = session.subscription as string
if (!userId || !subscriptionId) return
```

If `client_reference_id` is null (which can happen if the checkout session was created externally or the field was omitted), the webhook silently returns without processing. This is a silent failure mode.

**Required change:**
```typescript
const userId = session.client_reference_id
  || (session.metadata as Record<string, string>)?.agent_id
  || null
const subscriptionId = session.subscription as string
if (!userId || !subscriptionId) {
  log('warn', 'checkout.session.completed missing userId or subscriptionId', {
    clientRefId: session.client_reference_id,
    metadataAgentId: (session.metadata as Record<string, string>)?.agent_id,
    subscriptionId: session.subscription
  })
  return
}
```

**Why both `client_reference_id` AND `metadata.agent_id`:**
- `client_reference_id` is the primary — it's already used by the existing `create-checkout` flow and all existing sessions.
- `metadata.agent_id` is the belt-and-suspenders fallback — ensures admin-generated links work even if `client_reference_id` gets dropped (Stripe doesn't guarantee it persists through all redirect flows).
- The admin endpoint MUST set both. This fallback protects against edge cases.

**Scope:** Only touch the `userId` resolution line. Do not modify any other webhook logic.

### 3.3 Admin UI — Payment Links Tab

**Location:** `product/lead-response/dashboard/app/admin/payment-links/page.tsx` (new page)

**Navigation:** Add to existing admin sidebar/nav.

**Layout:**

```
┌─────────────────────────────────────────────────────────┐
│  Payment Links                                          │
│─────────────────────────────────────────────────────────│
│                                                         │
│  ┌─ Agent List ───────────────────────────────────────┐ │
│  │ Name          │ Email          │ Status  │ Action  │ │
│  │───────────────┼────────────────┼─────────┼─────────│ │
│  │ Jane Smith    │ jane@re.com    │ trial   │ [Gen▾]  │ │
│  │ Bob Jones     │ bob@broker.com │ pilot   │ [Gen▾]  │ │
│  │ Amy Lee       │ amy@homes.com  │ active  │ (paid)  │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                         │
│  ┌─ Generate Link (expanded on click) ────────────────┐ │
│  │ Agent: Jane Smith (jane@re.com)                    │ │
│  │ Tier: [Starter ▾] [Pro ▾] [Team ▾]                │ │
│  │ Discount: [__]%  (optional)                        │ │
│  │ [Generate Link]                                    │ │
│  └────────────────────────────────────────────────────┘ │
│                                                         │
│  ┌─ Generated Links ─────────────────────────────────┐  │
│  │ Agent    │ Tier    │ Discount │ Status  │ Expires  │  │
│  │──────────┼─────────┼──────────┼─────────┼──────────│  │
│  │ Jane S.  │ Starter │ 20%      │ pending │ 23h left │  │
│  │          │ https://checkout.stripe.com/...  [Copy] │  │
│  └────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**Data Sources:**
- Agent list: `GET /api/admin/pilots` (existing endpoint — returns trial/pilot agents)
- Generated links: `checkout_sessions` table filtered by source or admin-created sessions
- Link status: query `checkout_sessions.status` — `pending` | `completed` | `expired`

**Interactions:**
1. Click "Gen" on an agent row → opens inline form with tier dropdown + optional discount
2. Click "Generate Link" → calls `POST /api/admin/generate-payment-link`
3. URL appears with copy-to-clipboard button (use `navigator.clipboard.writeText()`)
4. Expiry shown as countdown relative to `expiresAt`
5. Status auto-refreshes (poll every 30s or use optimistic UI after generation)

**Edge Cases:**
- Agent already has active subscription → "Gen" button replaced with "(paid)" badge
- Stripe not configured → show error banner, disable generation
- Link expired → show "expired" badge, allow regeneration

**Styling:** Tailwind CSS. Match existing admin page patterns (`/admin/pilots`, `/admin/funnel`).

---

## 4. Database Changes

**No new tables.** Reuse existing `checkout_sessions` table.

**Optional column addition** (if `source` column doesn't exist on `checkout_sessions`):
```sql
ALTER TABLE checkout_sessions ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'self_serve';
```

This lets us distinguish admin-generated links (`source = 'admin_payment_link'`) from self-serve checkouts. Check `SCHEMA.md` for current columns before adding.

If `checkout_sessions` already lacks an `expires_at` column, add:
```sql
ALTER TABLE checkout_sessions ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
```

**Verify before migrating:** Read `SCHEMA.md` for the `checkout_sessions` table definition. The `expires_at` column may already exist.

---

## 5. Acceptance Criteria

### AC-1: Admin endpoint returns valid Stripe Checkout URL
```bash
curl -X POST https://leadflow-ai-five.vercel.app/api/admin/generate-payment-link \
  -H "Content-Type: application/json" \
  -H "Cookie: auth-token=<admin-session>" \
  -d '{"agentId":"<pilot-agent-uuid>","tier":"starter_monthly"}'
# Returns: { url: "https://checkout.stripe.com/...", sessionId: "cs_...", expiresAt: "..." }
```

### AC-2: Checkout URL shows correct plan in Stripe
- Open the returned URL in an incognito browser
- Verify: correct plan name, correct price, agent's email prefilled
- If `discountPercent` was set: verify discounted price shown

### AC-3: Webhook processes payment from admin-generated link
- Simulate `checkout.session.completed` with `client_reference_id: agentId`
- Verify: `real_estate_agents.subscription_status` → `'active'`, `plan_tier` → requested tier
- Test fallback: simulate with `client_reference_id: null` but `metadata.agent_id: agentId` → same result

### AC-4: Admin UI generates and displays links
- Navigate to admin payment links page
- Select a trial/pilot agent, choose tier, generate link
- Verify: URL displayed with copy button, expiry countdown shown
- Verify: already-paid agents show "(paid)" instead of generate button

### AC-5: Duplicate prevention
- Agent with `subscription_status = 'active'` → endpoint returns 409
- Non-admin user → endpoint returns 401

### AC-6: Existing checkout flow unaffected
- Existing self-serve checkout (`/api/billing/create-checkout`) still works
- Existing webhook handling for self-serve sessions unchanged
- Existing `/api/stripe/upgrade-checkout` (authenticated pilot upgrade) still works

---

## 6. Security Considerations

| Risk | Mitigation |
|------|------------|
| Unauthorized link generation | Admin-only auth via `isAdminUser()` |
| URL leakage | Stripe URLs are single-use per customer; session expires in 24h |
| Discount abuse | Coupon is single-use (`max_redemptions: 1`) and tied to one session |
| Agent impersonation | `client_reference_id` + `metadata.agent_id` ensures correct agent is upgraded |
| Webhook replay | Existing idempotent upsert on `stripe_subscription_id` prevents double-processing |

---

## 7. Out of Scope

- Modifying existing self-serve checkout flow (`/api/billing/create-checkout`)
- Modifying existing authenticated upgrade flow (`/api/stripe/upgrade-checkout`)
- Bulk link generation (one at a time is sufficient for 11 pilots)
- Email delivery of links (Stojan sends manually — that's the point)
- Annual billing options (monthly only for initial implementation; annual can be added later)
- Custom trial periods per link (use the standard 14-day trial)
- Subscription pricing changes

---

## 8. Implementation Notes for Dev Agent

### Existing code to reuse (DO NOT duplicate):
- **Price ID resolution:** `PRICE_ID_ENV_MAP` and `isValidPriceId()` from `product/lead-response/dashboard/app/api/billing/create-checkout/route.ts`
- **Stripe customer create/retrieve:** same file, lines 193-204
- **Admin auth:** `isAdminUser()` from `product/lead-response/dashboard/lib/services/AuthService.ts`
- **Checkout session logging:** `checkout_sessions` table insert pattern from `create-checkout`

### Files to modify:
1. **New:** `product/lead-response/dashboard/app/api/admin/generate-payment-link/route.ts`
2. **Edit:** `product/lead-response/dashboard/app/api/webhooks/stripe/route.ts` (lines 62-65 only)
3. **New:** `product/lead-response/dashboard/app/admin/payment-links/page.tsx`
4. **Edit:** Admin navigation (add Payment Links link)
5. **New:** Migration for `checkout_sessions` columns (if needed after checking SCHEMA.md)
6. **New:** `tests/unit/generate-payment-link.test.js` or `.test.ts`

### Existing auth pattern (from `routes/admin/reactivation-campaign.js`):
The Express-side admin routes use `LEADFLOW_API_KEY` header via `ApiKeyAuthService`. The Next.js admin routes use `ADMIN_EMAIL` session auth. Since this endpoint lives in the Next.js dashboard, use the `ADMIN_EMAIL` pattern.

### Test plan:
1. Unit test: endpoint validation (missing fields, invalid tier, non-admin, active agent)
2. Unit test: webhook fallback (client_reference_id null, metadata.agent_id present)
3. Integration test: full flow with mocked Stripe (generate → webhook → agent upgraded)
4. Manual test: generate a real link for a test agent, open in browser, verify Stripe page

---

## 9. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Links generated → opened | >50% | `checkout_sessions` status transitions |
| Links opened → paid | >20% | `subscription_events` with source='admin_payment_link' |
| Time from link generation to payment | <24h | timestamp diff |
| First paying customer | 1 | `real_estate_agents` where `subscription_status='active'` |
