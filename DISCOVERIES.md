# Agent Discoveries

> Append-only knowledge base. **Never auto-generated, never overwritten.**
> Agents append entries here when they discover architectural patterns, gotchas, or constraints.
> Read this file before starting any task for accumulated project wisdom.

<!-- Entries are appended below by the genome's discovery extractor. Do not delete entries. -->

## 2026-04-11 — leads SMS consent canonical field
- `leads.consent_sms` is the canonical SMS consent flag used by current runtime code (Twilio/FUB webhooks, send routes, follow-up automation, dashboard UI/tests).
- `leads.sms_opt_out` still exists from `supabase/migrations/011_twilio_sms_integration.sql` but is not read or written by current application logic.
- For opt-out enforcement and new features, use `consent_sms = false` and typically `dnc = true`; do not add new logic against `sms_opt_out` unless the schema is intentionally migrated.

## 2026-02-23 - SMS consent canonical field

- `leads.consent_sms` is the canonical application-level SMS consent flag.
- `leads.sms_opt_out` exists in schema history from `011_twilio_sms_integration.sql`, but current app code does not read or write it.
- For outbound SMS eligibility and STOP handling, follow the existing pattern: check `lead.dnc || !lead.consent_sms`, and set `dnc = true` plus `consent_sms = false` on opt-out.

## 2025-02-14 - GA4 instrumentation is present but orphaned

- `frontend/src/lib/ga4.ts` defines the GA4 helper functions, but there are no imports or usage sites elsewhere in `frontend/src`.
- In the current repo snapshot, the frontend source tree only exposes `frontend/src/lib/ga4.ts` plus an unrelated component test, with no visible app entrypoint initializing analytics.
- Treat current GA4 sessions / bounce / time-on-page conclusions as unreliable until the GA4 helper is actually wired into the production app.

## 2026-04-24 — stale uc_no_tasks signal for lapsed trial reactivation

- The use case `feat-lapsed-trial-reactivation` already has a kickoff workflow task in `.local-tasks.json`: `Lapsed Trial Reactivation PRD` (`local-1776912298717-bb4a52ee`), assigned to `agent_id: product`.
- If genome/project-graph reports `uc_no_tasks` for this use case again, verify the existing task record before appending a duplicate; the gap signal can lag behind task creation.
- The canonical handoff spec for that kickoff task is `docs/task-specs/feat-lapsed-trial-reactivation-workflow-task.md`.

