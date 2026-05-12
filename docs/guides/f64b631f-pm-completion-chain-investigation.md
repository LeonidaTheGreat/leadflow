<!--
TASK SPEC (f64b631f-db0d-4387-945e-56e9a35c2034)
What:
- Update docs/guides/f64b631f-pm-completion-chain-investigation.md with verified 2026-05-12 runtime evidence from local DB + dispatcher logs.
- Correct stale assumptions (`tasks.child_count`, missing `task_events`) and document exact failure path in `intelligence/completion-handler.js`.
- Keep this task as investigation-only in leadflow repo; no runtime patch in this branch.

Verify:
- SQL: show PM/product `done` tasks with `metadata->>'completion_processed' IS NULL` and relational child count via `COUNT(*) FROM tasks c WHERE c.parent_task_id=t.id`.
- SQL: verify schema (`tasks` has no `child_count`; there is no `task_events` table in this environment).
- Logs: confirm `onTaskCompleted error ... Connection terminated due to connection timeout` and `Rate limited — skipping done event ...` exist in realtime dispatcher logs.
- Code: verify `CompletionHandler.process()` returns early on rate limit and only sets `completion_processed` at the end of the method.

Boundaries:
- Do not modify product routes/services or generated/protected files.
- Do not patch `~/.openclaw/genome` runtime sources in this task branch.
-->

# Investigation: PM completion not chaining to dev / UC status not advancing

## Scope
Investigated why PM/product task completion does not reliably chain to dev or update `use_cases.implementation_status`.

## Reproduction and verification

1. DB evidence of incomplete completion processing (local PostgreSQL `openclaw`):
- `tasks` has no `child_count` column in this schema; child chain evidence must be computed from `tasks.parent_task_id`.
- As of 2026-05-12, PM/product done-task totals:
  - `total_pm_done`: 919
  - `pm_done_unprocessed` (`completion_processed` null): 735
  - `unprocessed_with_uc`: 215
  - `unprocessed_with_uc_no_children`: 198
  - `unprocessed_with_uc_has_children`: 17
- This proves a large backlog of PM completions that never reached final completion-marking.

2. Dispatcher log evidence:
- Repeated hard failures in completion handler:
  - `onTaskCompleted error for <task-id>: Connection terminated due to connection timeout`
  - Multiple occurrences on 2026-05-12 in `state/leadflow/.realtime-dispatcher.log`.
- Repeated done-event drops also present:
  - `Rate limited — skipping done event for <task-id>`
  - Same log stream shows bursts of skipped done events under high activity.

3. Code-path verification:
- `CompletionHandler.process()` can fail before chaining and before marking completion:
  - Outer `try/catch` wraps entire method.
  - Any DB timeout inside the flow logs `onTaskCompleted error...` and exits without writing `metadata.completion_processed`.
- `CompletionHandler.process()` also returns immediately when rate-limited:
  - `if (this._isRateLimited()) { ... return }`
- Both NOTIFY-triggered and polling-triggered done handling call this same `process()` path.
- `completion_processed` is written only at the end of `process()`. Any early return (rate limit) or fatal error (timeout) prevents that write.

## Root cause
Primary:
- `onTaskCompleted` DB connection timeouts terminate completion processing before chain + final completion marker write.

Secondary (amplifier):
- Shared global dispatcher rate limiting drops some `done` events before processing.

Combined effect:
- `chainTask()` execution (no PM->dev chaining), and
- UC workflow progression / status updates that depend on successful completion handling.

## Minimal correct fix location (Genome runtime)
Outside this repo checkout, in `~/.openclaw/genome`:
- `intelligence/completion-handler.js`:
  - Add retry/defer behavior for transient DB timeout failures in `process()` so completion work is not dropped on first timeout.
  - Ensure completion-marker write (`metadata.completion_processed`) is resilient after successful chain path.
- `core/actuators/realtime-dispatcher.js`:
  - Separate or prioritize `done` event budget from `ready` event rate limiting.
  - Prevent starvation of completion handling during high ready-event bursts.

## Notes
- The issue is real and reproducible.
- Two stale assumptions were invalid in current schema/runtime evidence:
  - `tasks.child_count` does not exist.
  - `task_events` table does not exist in this local DB.
- No in-repo production code change was made in this branch because the executable runtime module is in `~/.openclaw/genome`.
