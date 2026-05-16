# PM Re-Spec: fix-create-subscriptions-table-supabase-for-stripe

**Date:** 2026-05-16  
**Task ID:** 407139c4-e3a3-44d2-a882-2e6e36856618  
**UC:** fix-create-subscriptions-table-supabase-for-stripe  
**Diagnosis:** already_complete — UC describes solved problem

## Why Previous Attempts Failed

Five agent cycles (2 dev tasks, escalating through codex → opus, plus a rescue attempt) all failed because there was **no real gap to close**.

**What the UC says:** "webhook handler at routes/stripe-webhook.js currently has no table to write to"  
**What exists:** The `subscriptions` table is live in Supabase with 3 rows. The webhook handler at `product/lead-response/dashboard/app/api/webhooks/stripe/route.ts` already does `supabase.from('subscriptions').upsert(...)` on `checkout.session.completed` with all required fields.

The failure mode:
- Dev agent `542469b7`: Couldn't find the gap. Got parked as stale after 24h.
- Rescue agent `a84a023e`: Detected the table existed, wrote utility check scripts and unit tests instead of core work. PR 1618 was merged-then-closed because it contained zero webhook or migration changes. Orchestrator marked it failed for `awaiting_merge requires pr_number` — the state machine saw a PR but no meaningful change to the stated acceptance criteria.

Root cause of repeated failure: **the UC was written when the problem existed but was solved by subsequent work** (UC `fix-subscriptions-table-never-populated`, now `complete`, addressed the same webhook gap). No amount of retrying will produce a different outcome because the underlying condition is gone.

## Evidence

| Signal | Value |
|--------|-------|
| `subscriptions` rows in Supabase | 3 (SCHEMA.md) |
| Migration 018 | `ALTER TABLE subscriptions` — table existed before this migration |
| `handleCheckoutComplete` in webhook route | `supabase.from('subscriptions').upsert({...})` — fully implemented |
| Related UC `fix-subscriptions-table-never-populated` | `complete` |
| PR 1618 files | Only scripts + tests — no migration, no webhook change |

## Alternative Approach

**Mark UC `fix-create-subscriptions-table-supabase-for-stripe` as `complete`.**

No new dev task needed. The system is working as intended:
- Table exists ✓
- Webhook writes to it on checkout ✓
- Related payments/subscription_events also populated ✓

If a future audit finds subscription data isn't persisting to Supabase production, that would be a new UC with reproduction steps from real webhook logs — not a retry of this UC.
