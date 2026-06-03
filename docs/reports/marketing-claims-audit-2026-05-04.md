# Marketing Claims Audit — 2026-05-04

**Auditor:** Leonida (this Claude Code session)
**Scope:** Every testimonial + upsell/feature claim from public-facing pages and email templates, mapped to the feature backing it.
**Method:** Extract verbatim claims → grep code for backing logic → query DB for cited people/numbers.

---

## ⚠️ Critical: Fabricated Testimonial

**Claim (week1_checkin email, line 60-63):**
> "In my first week, I imported 200 old leads from a spreadsheet I'd ignored for months. LeadFlow's AI scored them and I found 12 hot prospects I'd completely forgotten about. Closed one of them for $890K last month!"
> — Michael R., Compass, San Diego

**Reality:**
- No "Michael R." from Compass in San Diego exists in `pilot_recruitment_targets`, `pilot_signups`, or any other DB table.
- Closest matches: **Lisa Wong** (Compass, Los Angeles, status=identified, never contacted) and **Michael Brown** (Independent, Atlanta, status=identified). Different people, different cities, different brokerages, never customers.
- 0 paying customers exist (per audit-2026-05-03), so a "$890K closed deal" via LeadFlow is physically impossible.

**Risk:** FTC truth-in-advertising (16 CFR 255 — testimonials must be from real customers describing real outcomes). Twilio A2P compliance review may flag. Trust collapse on first prospect who Googles or asks "where's the case study."

**Same email also says:** "One agent recovered a $2.1M listing from a lead they hadn't contacted in 8 months!" — anonymous, unverifiable, again impossible given 0 paying customers.

---

## False Product Claim (Live Site)

| Claim | Reality | File |
|-------|---------|------|
| "Claude 3.5 Sonnet analyzes leads to extract intent, budget, timeline, and property preferences." (home, line 188) | Default model is `qwen3.5-14b` (local Ollama). Anthropic fallback is `claude-3-haiku-20240307` (Claude 3 Haiku, **not Claude 3.5 Sonnet**). Claude 3.5 Sonnet is never used. | `product/lead-response/dashboard/lib/ai.ts:46,59` |

**Risk:** Brand-name false claim on the marketing page; testable in seconds by anyone reading the source or asking the AI which model it is.

---

## Fictional Tier Differentiation

The pricing page (`app/pricing/page.tsx:119-125`) shows a tier comparison table claiming:

| Feature | Starter | Pro | Team | Brokerage |
|---------|---------|-----|------|-----------|
| FUB CRM | ✓ | ✓ | ✓ | ✓ |
| Cal.com Booking | ✗ | ✓ | ✓ | ✓ |
| Lead Routing | ✗ | ✗ | ✓ | ✓ |
| API Access | ✗ | ✓ | ✓ | ✓ |
| Response Time | <60s | <30s | <30s | <15s |
| Custom AI training | ✗ | ✗ | ✗ | ✓ |
| White-label | ✗ | ✗ | ✗ | ✓ |
| 99.9% uptime SLA | ✗ | ✗ | ✗ | ✓ |
| Dedicated account manager | ✗ | ✗ | ✗ | ✓ |
| Compliance reporting | ✗ | ✗ | ✗ | ✓ |

**Reality:** No tier-based feature gating exists in the code. Searched all of `product/lead-response/dashboard/`, `lib/`, `routes/` for `plan_tier ===` checks gating Cal.com, lead routing, API access, white-label, etc. The only `plan_tier` checks are:
1. Trial expiration (`middleware.ts:182`)
2. Pilot status filtering (admin pages, `lib/pilot-status.ts`)
3. Outreach candidate filtering (admin only)

A Starter customer paying $49 gets the same code paths as a Brokerage customer paying $999. SMS volume (claimed 100/mo for Starter, unlimited for Pro+) is also not enforced in code I could find — Twilio rate limits / billing would be the only natural cap.

**Response time tier claims** (`<60s` / `<30s` / `<30s` / `<15s`) are pure marketing — the SMS pipeline doesn't change based on tier.

**Risk:** Customer who pays Pro for Cal.com booking and discovers Starter customers get it too. Reverse: Starter customer using Cal.com / API / lead routing without paying for it (no enforcement = revenue leak).

---

## False Compliance Claim

**FAQ on home page (line 519-520):**
> Q: "Is SMS messaging compliant (A2P 10DLC)?"
> A: "Yes. LeadFlow is registered for A2P 10DLC compliance. All SMS is opt-in and includes compliant opt-out language."

**Reality:** A2P 10DLC campaign was submitted tonight (per user, 2026-05-03), pending carrier review (1-3 business days). LeadFlow is **not yet registered**. The site says "registered." Live site is wrong as of right now.

**Risk:** Twilio reviewers, future regulators, or customers reading this are misled. Claim is correctable to "Yes — registered with the carriers via A2P 10DLC. All SMS is opt-in…" once approval lands; until then, soften to "Yes — A2P 10DLC compliant: registered campaign, opt-in, opt-out language."

---

## Unsubstantiated Stats (no source citation)

These appear in the home stats bar (`app/page.tsx:157-170`) and are presented as facts, not benchmarks:

| Stat | Source | Status |
|------|--------|--------|
| "<30s Average Response Time" | none | Implies LeadFlow's average; unmeasured |
| "78% Deals Go to First Responder" | none | Industry stat — needs citation (likely MIT/InsideSales study from 2007) |
| "35% Leads Never Get a Response" | none | Industry stat — needs citation |
| "24/7 Always On" | self | Trivially true for a 24/7 service |

**Pilot/outcome bar (`app/page.tsx:295-309`):**
| Claim | Status |
|-------|--------|
| "3x More Appointments Booked — Pilot agents report…" | 0 paying customers, no measured baseline. Caveat "individual outcomes vary" exists nearby. |
| "<30s Response Time" | unmeasured |
| "24/7 Always-On Coverage" | trivially true |

**Email-only stats (also unsupported):**
- "5 hours/week saved on manual data entry" (day3_tips.html:45) — no measurement
- "73% of pilot agents who completed these 3 steps renewed" (day3_tips.html:59) — 0 pilots have actually paid

**Risk:** All survive a casual reader; collapse the moment a sophisticated buyer asks "where's the data?" Industry stats (78%, 35%) are likely accurate in spirit but need source links.

---

## Mostly Accurate (backed by real code)

| Claim | Evidence |
|-------|----------|
| "AI books appointments via Cal.com" | `lib/services/CalcomClient.js`, `BookingLinkService.js` — real Cal.com v2 API integration |
| "Connect Follow Up Boss in <5 minutes via OAuth" | FUB OAuth flow exists — UX timing claim, hard to refute |
| "14-day free trial, no credit card required" | Trial-status routes + signup form match this |
| "AI pauses on that lead the moment you respond" | **Partial** — `sequences.ts:14` has a `paused` state explicitly described as "Lead responded, sequence paused." That pauses on LEAD reply. Did not find code that pauses when the AGENT (human) replies — the FAQ wording suggests this should also pause, worth verifying with a manual SMS reply test. |
| "Take over any conversation at any time from the dashboard" | Inbox UI exists — manual reply path is wired |
| "Personalized SMS using their name, property of interest, inquiry context" | AI prompt construction exists in `ai.ts` |

---

## Falsified Customization Promise (FAQ)

**FAQ on home page (`app/page.tsx:511-512`):**
> Q: "Does the AI sound like a robot?"
> A: "No. The AI is trained to sound like a professional agent — warm, helpful, and specific to the lead's inquiry. **You can customize the tone and templates.**"

### Half 1 — "trained to sound warm/helpful/specific" → PARTIAL
- The system prompt in `lib/ai.ts:385` (`buildSmsPrompt`) does push warmth: "texting a friend," "warm, not robotic," "acknowledge what they just said," one-question-at-a-time, no email-style signatures. Trigger guidelines (line 449-454) repeat the warmth instruction across `initial`, `agent_intro`, `inbound_reply`.
- "Trained" is misleading. There is no fine-tune, no SMS-specific dataset, no reinforcement loop. It is a **general-purpose LLM with a well-written prompt**: default model `qwen3.5-14b` (local Ollama) or fallback `claude-3-haiku-20240307`. Marketing implies bespoke training; reality is prompt engineering on a stock model.

### Half 2 — "you can customize the tone and templates" → FALSE

**Tone customization:**
- `agent_settings` table contains 3 boolean toggles only: `auto_response_enabled`, `sms_enabled`, `email_notifications`. **No tone/persona/style field.**
- `agent_profiles.bio` exists and IS editable on `/profile` page. But `buildSmsPrompt` never reads it. Bio is stored, never consumed by the AI.
- No tone slider, no "casual vs formal" picker, no custom-instruction textarea anywhere in `/settings` or `/profile`.

**Template customization:**
- `templates` table exists with proper schema: categories `initial / followup / nurture / booking / handoff / reengagement`, market-aware (`ca-ontario` / `us-national`), variables JSONB.
- Table has **0 rows** — never seeded. No default templates, no custom templates.
- **No settings UI exists** for templates. `app/settings/` contains only `page.tsx` and `billing/`. No template list, editor, or import flow.
- **No API routes** at `app/api/templates/`, `app/api/settings/templates/`, or anywhere else for managing templates.
- **The AI prompt does not consult the templates table.** `buildSmsPrompt` (`lib/ai.ts:358-431`) hardcodes the system prompt and reads only `agent.name` + `agent.market`. `getTemplates()` exists in `lib/supabase.ts:294` but has zero callers in the SMS generation path.

**Net:** the FAQ promises a feature with 0% implementation. A Settings → Templates page is implied by the copy; it doesn't exist. Same failure pattern as `pilot_signups` (schema exists, no UI, no consumer code).

**Risk:** Customer who tries to customize tone or write templates discovers there's no surface. Either churns silently or files a support ticket the team can't answer ("you said I could customize templates — where?").

---

## Pricing-Tier Bullet Inconsistency

The Starter / Pro / Team bullets differ between **home page** (`app/page.tsx:363-424`) and **pricing page** (`app/pricing/page.tsx:27-98`). E.g.:

- **Home Pro:** "Custom templates"
- **Pricing Pro:** "Priority chat + email"

Two pages selling the same plan listing different features. Whichever a prospect reads first becomes the implicit promise.

**Risk:** Lower than the others, but a prospect who notices it loses confidence.

---

## 🚨 Inbound SMS Auto-Response Probably Broken (Schema/Type Mismatch)

Discovered while answering "can I test by texting the Twilio number?" The full inbound auto-response path likely silently drops, because the TypeScript `Agent` interface and the actual `real_estate_agents` table have diverged.

**The mismatch:**
| `Agent` interface (`lib/types/index.ts:59`) | `real_estate_agents` table (DB) |
|---|---|
| `name: string` | `first_name`, `last_name` (no `name`) |
| `phone: string \| null` | `phone_number` (different name) |
| `fub_id: string \| null` | not present |
| `calcom_username: string \| null` | not present |
| `market: Market` | not present |
| `settings: AgentSettings` | separate `agent_settings` table, not joined |
| `is_active: boolean` | uses `status='active'` instead |

**Consequence chain (inbound SMS path):**
1. `getDefaultAgent()` (`product/lead-response/dashboard/lib/services/inbound-sms-service.ts:56`) runs `.eq('is_active', true)` against `real_estate_agents`. Column doesn't exist → PostgREST returns null/error → returns null.
2. `resolveAgent()` (line 297) falls back to `getDefaultAgent()` → returns null.
3. Even if a non-null agent record were returned (e.g. via `lead.agent_id`), the row has no `market` and no joined `settings`. So `agent.market` and `agent.settings` are `undefined`.
4. Auto-respond gate at `app/api/webhook/twilio/route.ts:122`:
   ```js
   const hasRequiredAgent = agent && agent.market && agent.settings
   const shouldAutoRespond = hasRequiredAgent && agent.settings.auto_respond !== false
   ```
   `hasRequiredAgent` is **always false** in production. AI never runs. No SMS reply.

**DB state confirms this is the live state:**
- 1 agent with `status='active'` (id `4d833633-06b1-4f16-b048-043611509989`), but `first_name` and `last_name` are blank.
- 1 row in `phone_inventory`, status=`available` (no agent linked).
- The TS type lying makes this invisible at compile time.

**The codebase already knows the right pattern** — `lib/nps-service.ts:185` does:
```js
name: `${row.real_estate_agents.first_name || ''} ${row.real_estate_agents.last_name || ''}`.trim()
```
That mapper exists for NPS but isn't applied in the inbound SMS path.

**Risk:** The core marketing promise ("AI responds in <30 seconds") cannot fire for any inbound SMS today. Every cold text the Twilio number receives is silently discarded. If the FUB webhook path goes through the same `getDefaultAgent` fallback (it does — `fub-webhook-service.ts:24`), outbound new-lead SMS is similarly broken when the lead has no `agent_id`.

**Recommended fix:**
- Single source-of-truth Agent shape: a DB-row → Agent mapper applied at every read site (or a Postgres view that exposes `name`, `is_active`, joined `settings`).
- Update the `Agent` TS interface to match what the mapper returns.
- Replace `getDefaultAgent`'s filter with `status='active'` and join `agent_settings` explicitly.
- Add an E2E test: POST to `/api/webhook/twilio` (signed), assert AI response is generated (or at least that `hasRequiredAgent` evaluates true). This would have caught it.

**Genome miss-mode:** TS type lying about DB shape is a class. The codebase rule "no Supabase imports" is enforced; "TS types match DB schema" isn't. Detection candidate: a heartbeat job that diffs each `interface X` with named DB fields against `information_schema.columns` for the canonical table. If `Agent.market` doesn't appear as a column on `real_estate_agents` and there's no view exposing it, flag.

---

## Genome Miss-Mode (Why Marketing Drift Wasn't Caught)

1. **No claim-vs-code detection layer.** The genome has codebase rules for Supabase removal, auth-token cookies, and Stripe — none for marketing claims. A new detection: scan `app/page.tsx`, `app/pricing/page.tsx`, `app/demo/page.tsx`, `email-sequence/templates/*` for concrete claims (regex: `<\d+s`, `\d+%`, `\$[\d,]+M?`, brand model names like `Claude 3.5 Sonnet`, etc.) and require a corresponding "evidence" doc or test.

2. **Testimonials never verified against DB.** No detection that scans email templates / web pages for quoted persons and matches against real customer records (the audit needed three SQL queries). Easy to add.

3. **Marketing content shipped without PM journey review.** The `new-agent-signup` journey explicitly walks the landing page — it would have flagged "Claude 3.5 Sonnet" as wrong if the journey reviewer had access to `lib/ai.ts`. But journey reviews are stuck (see audit-2026-05-03 §3.B).

4. **Tier-feature drift not enforced.** No test asserts that pricing-page tier comparison rows correspond to actual `plan_tier` checks in the code. A simple unit test could parse the comparison table and verify each "Pro+" gate exists.

5. **PM doesn't reason about brand integrity.** Three pages calling the AI different things (Claude 3.5 Sonnet on home, generic "AI" on demo, qwen in code) wasn't flagged.

6. **No "promise has UI" cross-check.** The customization FAQ is a promise that requires both (a) a settings surface and (b) a consumer in the AI path. Neither exists, but the claim has been on the marketing site through multiple journey reviews. Detection: when a marketing claim mentions an action a user can take ("customize," "edit," "configure," "export"), require a corresponding route under `app/` and at least one API endpoint.

---

## Recommendations

### LeadFlow direct fixes (P0 — credibility/legal exposure)
- **Remove the Michael R. testimonial** from `email-sequence/templates/week1_checkin.html` until a real customer + real outcome is available. Same for the $2.1M anonymous claim in day3_tips.html.
- **Fix "Claude 3.5 Sonnet" claim** on home `app/page.tsx:188` — either (a) change to "modern LLMs" / "AI", (b) actually swap the Anthropic fallback to `claude-sonnet-4-6` or `claude-haiku-4-5` and update copy, or (c) cite the local qwen model honestly.
- **Fix A2P FAQ** — change "Yes. LeadFlow is registered" to "Yes. LeadFlow's A2P 10DLC campaign is registered with carriers" (after approval) or soften now to "Yes. LeadFlow runs A2P 10DLC compliant SMS — opt-in, opt-out language, registered campaign (in carrier review)."
- **Either build tier gating or remove tier-feature claims** from pricing page. Cheapest version: code-side feature flags `Features.canUseCalcom(tier)`, `Features.canUseLeadRouting(tier)`, `Features.canUseAPI(tier)` enforced in the API routes that touch those features. Plus rate-limit SMS volume by tier.
- **Reconcile Starter/Pro/Team bullets** between home and pricing page — single source of truth (probably `lib/plans.ts`).

### Genome systemic fixes (P1)
- **New codebase rule: marketing claims need evidence.** For every concrete claim (regex match) in `app/page.tsx`, `app/pricing/page.tsx`, `app/demo/page.tsx`, `email-sequence/templates/*`, require either a code reference (test asserting the claim) or a `marketing-evidence.md` entry.
- **New genome heartbeat check: testimonial verification.** Parse email templates / web pages for `— <Name>, <Company>` patterns; cross-reference to `pilot_recruitment_targets`, `pilot_signups`, and (when it exists) `agents`. Flag fabricated names.
- **New unit test: tier table → tier gating.** Parse pricing-page comparison table; for each row marked Pro+, verify a corresponding `requireTier('pro')` (or equivalent) check exists in the relevant API route.
- **PM agent prompt: brand-integrity review.** When PM reviews any UC that touches user-facing copy, require an explicit pass over: (a) model names, (b) numbers/percentages, (c) named entities — and verify each against code/DB.
- **Restart journey reviews** (already P0 in prior audit) — would have caught the Claude 3.5 Sonnet claim and the testimonial.

---

## Open Questions

1. **Are the industry stats (78% / 35%) sourced from a known study?** If yes, add citation. If made up, remove or replace.
2. **Is Claude 3.5 Sonnet the marketing aspiration or just stale copy?** Decision drives whether to fix copy or upgrade the model (and whether to charge accordingly).
3. **Should the pricing page be source-of-truth for tier features, or `lib/plans.ts`?** Pick one and make the other render from it.
4. **Is the pilot retention 73% real (with respect to 0 actual conversions)?** If it's "intent to renew" from a survey, say so. If it's nothing, remove.
