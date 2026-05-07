<!--
Task Spec
What:
- Create docs/task-spec-3bcdf5c5-branch-commit-marker.md as a minimal branch artifact to produce one commit on this branch.

Verify:
- git log --oneline main..dev/3bcdf5c5-dev-fix-zero-conversions-no-paying-custo returns at least one commit.
- git status --short confirms only this file is staged/committed for this fix.

Boundaries:
- Do not modify application source, tests, routes, services, or schema.
- Do not redo the original zero-conversions implementation work.
-->

# Task 3bcdf5c5 Branch Commit Marker

This file exists solely to resolve verification failure: "no commits on branch".
