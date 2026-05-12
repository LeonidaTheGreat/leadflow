<!--
TASK SPEC (f64b631f-db0d-4387-945e-56e9a35c2034)
What:
- Create docs/reports/f64b631f-pm-completion-chain-investigation.md to document verified runtime behavior, exact failure point, and minimal corrective change location in Genome dispatcher/completion path.
- No production code changes in this repo because Genome runtime sources are external at ~/.openclaw/genome and are not present in this checkout.

Verify:
- Reproduce with SQL against local Postgres: PM/product tasks in status='done' missing metadata.completion_processed and with no chained child tasks.
- Confirm dispatcher logs contain repeated "Rate limited — skipping done event for <task-id>" during the same windows.
- Confirm chain code path is never reached for affected tasks (absence of chain log + no child task creation).

Boundaries:
- Do not modify product routes/services in this repo.
- Do not modify generated/protected files.
- Do not patch ~/.openclaw/genome in this task checkout; this task is investigation-only evidence in assigned branch.
-->

# Investigation: PM completion not chaining to dev / UC status not advancing

## Scope
Investigated why PM/product task completion does not reliably chain to dev or update `use_cases.implementation_status`.

## Reproduction and verification

1. DB evidence of unprocessed PM completions:
- Recent PM/product tasks were in `status='done'` with `metadata->>'completion_processed' IS NULL`.
- Same tasks had `child_count=0` (no chained dev task).

2. Dispatcher log evidence:
- During the same time windows, dispatcher repeatedly logged `Rate limited — skipping done event for <task-id>`.
- Completion handler logs (`Task <id> actual cost ...`, `Chained: ...`) were absent for those PM tasks.

3. Code-path verification:
- `CompletionHandler.process()` returns immediately when rate-limited:
  - `if (this._isRateLimited()) { ... return }`
- Both event-triggered and poll-triggered done handling call the same rate-limited `process()` path, so done events are repeatedly dropped under sustained load.
- Because `completion_processed` is only set at the end of `process()`, dropped tasks remain permanently eligible but can continue starving when rate-limited.

## Root cause
The completion pipeline applies a shared global rate limiter to `done` events. Under heavy ready/done traffic, PM `done` events are skipped before chaining and before `completion_processed` is written. This prevents:
- `chainTask()` execution (no PM->dev chaining), and
- UC status progression updates inside chaining flow.

## Minimal correct fix location (Genome runtime)
Outside this repo checkout, in `~/.openclaw/genome`:
- `intelligence/completion-handler.js`: do not hard-drop done events under rate-limit; defer or prioritize completion processing.
- Optionally differentiate limiter buckets for `ready` vs `done` so completion cannot starve behind spawn traffic.

## Notes
- The issue is real and reproducible.
- No in-repo production code change was possible here because the affected runtime source modules are not present in this task checkout.
