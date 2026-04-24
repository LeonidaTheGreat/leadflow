<!--
SPEC: fix-pilot-outreach-has-not-happened-11-days-left first workflow task
What:
- Create docs/task-specs/fix-pilot-outreach-has-not-happened-11-days-left-workflow-task.md to document the minimal repo change for this uc_no_tasks gap.
- Change .local-tasks.json to append the first implementation workflow task for use case fix-pilot-outreach-has-not-happened-11-days-left.
- The new task will be dev-owned and will point implementation at docs/prd/PRD-PILOT-SIGNUP-FOLLOW-UP-SEQUENCE.md so the existing approved pilot follow-up PRD can move into build work.

Verify:
- Run: python3 - <<'PY'
import json, pathlib
p = pathlib.Path('.local-tasks.json')
data = json.loads(p.read_text())
match = [t for t in data if t['title'] == 'Implement Pilot Signup Follow-Up Sequence']
print(len(match))
print(match[0]['agent_id'] if match else 'missing')
print(match[0]['metadata'].get('use_case_id') if match else 'missing')
print(match[0]['metadata'].get('prd_path') if match else 'missing')
PY
  Expected:
  - prints 1
  - prints dev
  - prints fix-pilot-outreach-has-not-happened-11-days-left
  - prints docs/prd/PRD-PILOT-SIGNUP-FOLLOW-UP-SEQUENCE.md
- Run: grep -n "Implement Pilot Signup Follow-Up Sequence" .local-tasks.json
  Expected: exactly one matching task entry.

Boundaries:
- Do not modify workflow engine, cron jobs, email sending code, dashboard UI, or database schema in this task.
- Do not rewrite the pilot follow-up PRD; only reference the existing approved PRD.
- Do not edit unrelated existing tasks beyond appending this one workflow kickoff task.
-->

# Pilot outreach has not happened — 11 days left workflow task spec

This note documents the minimal repo change needed to fix the `uc_no_tasks` gap for `fix-pilot-outreach-has-not-happened-11-days-left`: add the first actionable implementation task to the local task registry so the approved pilot follow-up PRD can move into the PM > Dev > QC workflow.
