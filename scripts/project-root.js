'use strict';

/*
TASK SPEC (21ffc900-74c9-48dd-ae66-ced71b8ccbe3)
What:
- Create scripts/project-root.js with canonical project root resolution utilities.
- Update executable script modules that hardcode PROJECT_ROOT paths:
  scripts/*.js, scripts/**/*.js, scripts/*.ts, scripts/**/*.ts, scripts/shell/*.sh, scripts/launchd/*.plist, scripts/ai.openclaw.*.plist, scripts/utilities/*.js.
- Replace absolute leadflow path references with computed project-root paths.

Verify:
- Run grep for stale absolute LeadFlow root path references in `scripts/` and expect zero matches.
- Run npm test and expect exit code 0.
- Run npm run build and expect exit code 0.

Boundaries:
- Do not modify docs/, completion-reports/, auto-generated artifacts, or protected files.
- Do not change business logic outside path resolution and imports for path-safe execution.
*/

const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');

function resolveFromProjectRoot(...segments) {
  return path.join(PROJECT_ROOT, ...segments);
}

module.exports = {
  PROJECT_ROOT,
  resolveFromProjectRoot,
};
