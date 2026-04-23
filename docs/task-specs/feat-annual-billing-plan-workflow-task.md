<!--
SPEC: feat-annual-billing-plan first workflow task
What:
- Change docs/task-specs/feat-annual-billing-plan-workflow-task.md to record the implementation scope for this gap fix.
- Change .local-tasks.json to append the first workflow task for use case feat-annual-billing-plan.
- The new task will be product-owned and will define the PRD / implementation brief needed to start the PM > Dev > QC workflow for annual billing.

Verify:
- Run: python3 - <<'PY'
import json, pathlib
p = pathlib.Path('.local-tasks.json')
data = json.loads(p.read_text())
match = [t for t in data if t['title'] == 'Annual Billing Plan PRD']
print(len(match))
print(match[0]['agent_id'] if match else 'missing')
print(match[0]['metadata'].get('use_case_id') if match else 'missing')
PY
  Expected:
  - prints 1
  - prints product
  - prints feat-annual-billing-plan
- Run: grep -n "Annual Billing Plan PRD" .local-tasks.json
  Expected: exactly one matching task entry.

Boundaries:
- Do not modify application billing, checkout, pricing, Stripe, or database code.
- Do not rewrite other use cases or regenerate project graph artifacts.
- Do not edit unrelated existing tasks beyond appending this new workflow kickoff task.
-->

# Annual Billing Plan workflow task spec

This note documents the minimal repo change needed to fix the `uc_no_tasks` gap for `feat-annual-billing-plan`: add the first actionable workflow task to the local task registry so the PM > Dev > QC flow can begin.
