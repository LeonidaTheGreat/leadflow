<!--
SPEC: verify and document feat-lapsed-trial-reactivation workflow kickoff
What:
- Update docs/task-specs/feat-lapsed-trial-reactivation-workflow-task.md to record that the first workflow task for this use case already exists in `.local-tasks.json` and that this follow-up change is documentation only.
- Append a discovery entry in DISCOVERIES.md describing the stale `uc_no_tasks` signal and the canonical task record (`Lapsed Trial Reactivation PRD`, `local-1776912298717-bb4a52ee`).

Verify:
- Run: python3 - <<'PY'
import json, pathlib
p = pathlib.Path('.local-tasks.json')
data = json.loads(p.read_text())
match = [t for t in data if t['title'] == 'Lapsed Trial Reactivation PRD']
print(len(match))
print(match[0]['id'] if match else 'missing')
print(match[0]['metadata'].get('use_case_id') if match else 'missing')
PY
  Expected:
  - prints 1
  - prints local-1776912298717-bb4a52ee
  - prints feat-lapsed-trial-reactivation
- Run: grep -n "stale uc_no_tasks" DISCOVERIES.md
  Expected: one appended discovery entry for this use case.

Boundaries:
- Do not modify `.local-tasks.json`; the task already exists.
- Do not touch application code, database schema, admin flows, or email implementation.
- Do not edit unrelated use-case specs or task records.
-->

# Lapsed Trial Reactivation workflow task spec

This use case is already seeded with its first workflow task in `.local-tasks.json` (`Lapsed Trial Reactivation PRD`, `local-1776912298717-bb4a52ee`).

This document now serves as the canonical handoff spec for that task and as a record that the follow-up `uc_no_tasks` assignment was stale rather than indicating a missing workflow kickoff.
