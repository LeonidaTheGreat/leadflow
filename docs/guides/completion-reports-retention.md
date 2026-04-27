<!--
TaskSpec
What:
- Document the completion report retention remediation for task bf9448cd-b110-4049-8641-df5e8c2cd032.
- Record verification commands and outcomes proving completion_reports gate passes.
Verify:
- find completion-reports/ -name "COMPLETION-*" -mtime +7 -delete
- find completion-reports/ -name "COMPLETION-*" | wc -l
- npm run completion_reports
- node ~/.openclaw/genome/scripts/quality-audit.js /Users/clawdbot/projects/leadflow --json
- npm run build
- npm run lint
- npm test
- npm audit --audit-level=high
Boundaries:
- No changes to routes/, lib/services/, or schema.
- No dashboard/Tailscale/launchd config changes.
- No deletions outside completion-reports retention scope.
-->

# Completion Reports Retention

## Purpose
Keep the `completion_reports` quality gate below the hard limit of 500 files.

## Standard Remediation
1. Delete old reports:
   - `find completion-reports/ -name "COMPLETION-*" -mtime +7 -delete`
2. Verify total:
   - `find completion-reports/ -name "COMPLETION-*" | wc -l`
3. Run retention script:
   - `npm run completion_reports`
4. Confirm via quality audit:
   - `node ~/.openclaw/genome/scripts/quality-audit.js /Users/clawdbot/projects/leadflow --json`

## Verification Example (task bf9448cd)
- completion report count after remediation: `480`
- quality audit gate `completion_reports`: `passed: true`
- required gates:
  - `npm run build` passed
  - `npm run lint` passed
  - `npm test` passed
  - `npm audit --audit-level=high` passed

## Notes
Quality audit may still fail overall due unrelated gates (for example `clean_worktree`) even when `completion_reports` passes.
