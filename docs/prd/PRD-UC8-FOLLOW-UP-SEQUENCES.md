# PRD-UC8-FOLLOW-UP-SEQUENCES

**Status:** complete  
**Review date:** 2026-07-24  
**Review verdict:** pass_with_issues (score 72)

## What It Is

Automated multi-step follow-up for real estate leads via SMS, plus email outreach for pilot signups.

Two separate subsystems:

1. **SMS Follow-up Sequences** — `SequenceService` + `/api/cron/follow-up` cron endpoint. Enrolls leads into timed SMS sequences triggered by FUB webhook events.
2. **Pilot Signup Email Outreach** — `PilotSignupOutreachService`. Sends 3-step email sequence (welcome, day 3, day 7) to `pilot_signups` table entries.

## Sequence Types (SMS)

| Type | Trigger | Delay |
|------|---------|-------|
| no_response | New lead, no reply | 24h |
| post_viewing | After Cal.com booking | 4h |
| no_show | Missed appointment | 30m |
| nurture | General follow-up | 7d |

Max 3 messages per sequence. TCPA footer appended to every message. DNC and SMS consent checked before send. Quiet hours: 9 PM – 9 AM.

## What Is Working

- `PilotSignupOutreachService`: 23 emails sent to all 21 pilot signups. All `follow_up_sent = true`. ✅
- `SequenceService`: Correct implementation with idempotency guard (`hasActiveSequence`). ✅
- Cron endpoint (`/api/cron/follow-up`): Auth, dry-run, TCPA compliance, DNC/consent checks, frequency capping all implemented. ✅
- `lead_sequences` table exists with correct schema. ✅

## Known Issues (as of 2026-07-24)

### P1 — SMS sequences never activated
`lead_sequences` has 0 rows. All 36 leads have `fub_id = NULL`. `FUBService.handleLeadCreated()` calls `findLeadByFubId()` which always returns null and skips enrollment. The SMS pipeline has never fired in production. Blocked on first paying FUB-connected agent.

**Required before launch:** Insert a test lead with a real `fub_id`, verify `handleLeadCreated()` creates a row in `lead_sequences`, verify cron picks it up and sends.

### P1 — no_show sequence broken by cron schedule
`no_show` fires 30 minutes after a missed appointment. The cron (`vercel.json`) runs once daily at 10am UTC (`0 10 * * *`). The code comment says "Runs every hour" but the config is daily. A 30-min window will never be caught.

**Fix:** Change cron schedule to `0 * * * *` (hourly) in `product/lead-response/dashboard/vercel.json`.

### P2 — Quiet hours use UTC, not agent timezone
`isQuietHours()` in `route.ts` calls `new Date().getHours()` which is UTC on Vercel. Eastern US agents (UTC-4) would receive messages from 5am local time.

**Fix:** Store agent timezone in `real_estate_agents.settings`, convert before quiet-hours check.

### P2 — Brokerage tier missing from signup wizard
Landing page shows 4 tiers; signup shows 3. Brokerage prospects have no path to sign up.

### P2 — Day-7 discount not backed by Stripe coupon
Day 7 email promises 50% off first month but signup URL has no coupon code. Either create a Stripe coupon and append `?coupon=CODE` to the URL, or remove the discount copy.

## Acceptance Criteria

- [ ] Test lead with `fub_id` triggers `lead_sequences` enrollment
- [ ] Cron runs hourly (fixes no_show sequences)
- [ ] Quiet hours check passes at 5am Eastern (agent timezone used)
- [ ] Brokerage tier or Contact Sales visible on signup page
- [ ] Day-7 email discount honored via Stripe coupon code
