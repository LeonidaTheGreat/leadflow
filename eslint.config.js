/*
taskSpec:
- What:
  - Create eslint.config.js to provide ESLint v9+ flat-config at repo root, replacing reliance on legacy .eslintrc-only discovery.
  - Update package.json scripts to add a root lint command that executes ESLint with this flat config.
- Verify:
  - Run: npm run lint
  - Expected: command exits with code 0 and no ESLint config resolution error.
  - Run: npx eslint . --max-warnings 0
  - Expected: command exits with code 0, confirming flat-config compatibility with strict warning threshold.
  - Run: npm run build, npm test, npm audit --audit-level=high
  - Expected: all commands exit with code 0.
- Boundaries:
  - Do not modify business logic in routes/, lib/services/, integrations/, or database schema/migrations.
  - Do not change runtime behavior outside lint/tooling configuration required for this task.
*/
'use strict'

const globals = require('globals')

module.exports = [
  {
    ignores: [
      'node_modules/**',
      'product/**',
      'agents/**',
      'integration/**',
      'integrations/**',
      'templates/**',
      'frontend/**',
      'e2e/**',
      'coverage/**',
      'scripts/**',
      'tests/**',
      'migrations/**',
      'lib/services/CalcomClient.js'
    ]
  },
  {
    files: ['**/*.js', '**/*.cjs'],
    linterOptions: {
      reportUnusedDisableDirectives: 'off'
    },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: {
        ...globals.node
      }
    },
    rules: {
      'no-unused-vars': 'off',
      'no-undef': 'off'
    }
  }
]
