<!--
SPEC: feat-lapsed-trial-reactivation first workflow task
What:
- Create docs/task-specs/feat-lapsed-trial-reactivation-workflow-task.md to capture the implementation-planning scope for this uc_no_tasks gap fix.
- Change .local-tasks.json to append the first workflow task for use case feat-lapsed-trial-reactivation.
- The new task will be product-owned and will define the PRD / implementation brief needed to start the PM > Dev > QC workflow for the lapsed trial reactivation campaign.

Verify:
- Run: python3 - <<'PY'
import json, pathlib
p = pathlib.Path('.local-tasks.json')
data = json.loads(p.read_text())
match = [t for t in data if t['title'] == 'Lapsed Trial Reactivation PRD']
print(len(match))
print(match[0]['agent_id'] if match else 'missing')
print(match[0]['metadata'].get('use_case_id') if match else 'missing')
PY
  Expected:
  - prints 1
  - prints product
  - prints feat-lapsed-trial-reactivation
- Run: grep -n "Lapsed Trial Reactivation PRD" .local-tasks.json
  Expected: exactly one matching task entry.

Boundaries:
- Do not modify application email delivery, admin endpoint, dashboard, or database implementation code.
- Do not rewrite other use cases or regenerate project graph artifacts.
- Do not edit unrelated existing tasks beyond appending this new workflow kickoff task.
-->

# Lapsed Trial Reactivation workflow task spec

This note documents the minimal repo change needed to fix the `uc_no_tasks` gap for `feat-lapsed-trial-reactivation`: add the first actionable workflow task to the local task registry so the PM > Dev > QC flow can begin.
