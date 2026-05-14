<!--
SPEC
What:
- Verify `collection_method=nps_collector` resolves from `agent_nps_responses` in Genome MissionMetricCollector each collect cycle.
- Execute orphan cleanup in `agent_survey_schedule` against `real_estate_agents` using provided SQL.
- Capture execution evidence only; no product/runtime code changes.

Verify:
- `cd ~/.openclaw/genome && npm test -- tests/mission-metric-collector.test.js tests/mission-metric-collector.regression.test.js`
- Runtime check: MissionMetricCollector `collect('genome')` queries `agent_nps_responses` and updates `NPS Score`.
- `psql $LOCAL_PG_URL` orphan counts before/after DELETE query.

Boundaries:
- Do not modify LeadFlow routes/services/UI/migrations.
- Do not modify Genome collector implementation in this task.
- Do not edit protected auto-generated docs/config.
-->

# Dev Rescue Execution: 9008c39d-f1be-439a-abb6-a95774d7fa29

## Root Cause Analysis
- Failure point: rescue task required operational verification and DB cleanup; previous attempt stalled without execution.
- Why: stale schedule records existed without parent agents, and verification evidence for the new collector path was not produced.
- Fix: executed focused verification in Genome and performed the orphan-row cleanup transaction.

## Results
- Genome collector verification:
  - `tests/mission-metric-collector.test.js`: PASS
  - `tests/mission-metric-collector.regression.test.js`: PASS
  - Total: 50/50
  - Runtime smoke check confirmed query table `agent_nps_responses` and metric update `NPS Score`.
- DB cleanup:
  - Orphans before: 97
  - Deleted: 97
  - Orphans after: 0
- LeadFlow gates in this workspace:
  - `npm run build`: PASS
  - `npm test`: FAIL (env missing `FUB_API_KEY` for connectivity test harness)
