#!/usr/bin/env node
/**
 * Sync deployment config — ensures project.config.json has the correct
 * deployment section. Agent merges may overwrite it; this restores it.
 *
 * Called by heartbeat or manually: node scripts/sync-deploy-config.js
 */

const fs = require('fs')
const path = require('path')

const CONFIG_PATH = path.join(__dirname, '..', 'project.config.json')

const DEPLOYMENT_CONFIG = {
  platform: 'vercel',
  project_id: 'prj_p9ZX952UhE1cl1PYZAgVW53FqVm9',
  team_id: 'team_f6bohlhVY2mNroXiNqk1NUF5',
  root_directory: 'product/lead-response/dashboard',
  production_url: 'https://leadflow-ai-five.vercel.app',
  framework: 'nextjs',
  deploy_mode: 'github_integration',
  health_endpoint: '/api/health',
  build_command: 'npm run build',
  verify_command: 'bash scripts/e2e-flow-tests.sh --json',
  browser_test_command: 'npx playwright test tests/browser/pages.spec.js tests/browser/health.spec.js --reporter=json',
  preview_deploys: false,
  auto_rollback: true,
  rollback_threshold: 2,
  env_validation: {
    required: ['NEXT_PUBLIC_API_URL', 'NEXT_PUBLIC_API_KEY', 'API_SECRET_KEY', 'RESEND_API_KEY'],
    no_placeholders: true,
    trim_whitespace: true
  },
  auto_generated_files: ['DASHBOARD.md', 'E2E_MAPPINGS.md', 'JOURNEYS.md', 'ORCHESTRATOR-HEARTBEAT-LOG.md', 'PRD_INDEX.md', 'USE_CASES.md'],
  protected_files: ['next.config.ts', '.gitattributes', 'vercel.json', 'playwright.config.js'],
  protected_files_note: 'Changes to protected files require build verification before merge — not blocked, but gated.'
}

try {
  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'))
  const current = JSON.stringify(config.deployment)
  const target = JSON.stringify(DEPLOYMENT_CONFIG)

  if (current !== target) {
    config.deployment = DEPLOYMENT_CONFIG
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + '\n')
    console.log('[sync-deploy-config] Deployment config restored')
  }
} catch (err) {
  console.error('[sync-deploy-config] Error:', err.message)
}
