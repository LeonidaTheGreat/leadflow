<!--
SPEC: NPS Metric Auto-Collection via nps_collector first workflow task
What:
- Create docs/task-specs/nps-metric-auto-collection-via-nps-collector-workflow-task.md to record the implementation-planning scope for this uc_no_tasks gap fix.
- Change .local-tasks.json to append the first workflow task for use case uc-c740b281-2c54-4f6d-8bd2-e2d346c28e98.
- The new task will be product-owned and will define the PRD / implementation brief needed to start the PM > Dev > QC workflow for automatic NPS collection via the nps_collector worker.

Verify:
- Run: python3 - <<'PY'
import json, pathlib
p = pathlib.Path('.local-tasks.json')
data = json.loads(p.read_text())
match = [t for t in data if t['title'] == 'NPS Metric Auto-Collection PRD']
print(len(match))
print(match[0]['agent_id'] if match else 'missing')
print(match[0]['metadata'].get('use_case_id') if match else 'missing')
PY
  Expected:
  - prints 1
  - prints product
  - prints uc-c740b281-2c54-4f6d-8bd2-e2d346c28e98
- Run: grep -n "NPS Metric Auto-Collection PRD" .local-tasks.json
  Expected: exactly one matching task entry.

Boundaries:
- Do not modify application NPS collection, cron, survey, worker, API, or database implementation code.
- Do not rewrite other use cases or regenerate project graph artifacts.
- Do not edit unrelated existing tasks beyond appending this new workflow kickoff task.
-->

# NPS Metric Auto-Collection workflow task spec

This note documents the minimal repo change needed to fix the `uc_no_tasks` gap for `uc-c740b281-2c54-4f6d-8bd2-e2d346c28e98`: add the first actionable workflow task to the local task registry so the PM > Dev > QC flow can begin.
