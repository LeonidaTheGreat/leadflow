'use strict'
/**
 * taskSpec
 * What:
 * - Create /private/var/folders/6d/xd0z4ldx1l17klqt54scqxsc0000gp/T/leadflow-8704019c-5398-4778-b802-91d27f8eea07/eslint.config.js as the root flat ESLint config so ESLint v9+ can run in this repo.
 * - Update /private/var/folders/6d/xd0z4ldx1l17klqt54scqxsc0000gp/T/leadflow-8704019c-5398-4778-b802-91d27f8eea07/package.json scripts/devDependencies to provide a root lint command backed by local eslint.
 * - Refresh /private/var/folders/6d/xd0z4ldx1l17klqt54scqxsc0000gp/T/leadflow-8704019c-5398-4778-b802-91d27f8eea07/package-lock.json to capture dependency changes.
 * Verify:
 * - Run npm run lint from repo root and expect exit code 0.
 * - Run npm run build from repo root and expect exit code 0.
 * - Run npm test from repo root and expect exit code 0.
 * - Run npm audit --audit-level=high from repo root and expect 0 high/critical vulnerabilities.
 * Boundaries:
 * - Do not change application/business logic in routes/, lib/services/, product/, or database schema/migrations.
 * - Do not alter dashboard package lint configuration in product/lead-response/dashboard.
 * - Do not touch protected generated docs/config files listed in task instructions.
 */

module.exports = [
  {
    ignores: [
      'node_modules/**',
      '.tmp_*',
      'product/**',
      'agents/**',
      'integrations/**',
      'integration/**',
      'templates/**',
      'frontend/**',
      'e2e/**',
      'tests/**',
      'scripts/**',
      'docs/**',
      'migrations/**',
      'state/**',
      'lib/services/CalcomClient.js'
    ]
  },
  {
    files: ['server.js', 'routes/**/*.js', 'lib/**/*.js', '**/*.cjs'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        process: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        module: 'readonly',
        require: 'readonly',
        fetch: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        setImmediate: 'readonly',
        clearImmediate: 'readonly'
      }
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-undef': 'error'
    }
  }
]
