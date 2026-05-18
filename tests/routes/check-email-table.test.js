'use strict';

/**
 * Regression guard: check-email routes must query real_estate_agents, not agents
 *
 * Verifies that the email duplicate-check routes query real_estate_agents
 * (not the orchestration `agents` table) so that registrations are
 * correctly detected and duplicate accounts are prevented.
 *
 * Task: 694e69a0 — fix signup/onboarding email check routes
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const DASHBOARD_DIR = path.join(__dirname, '..', '..', 'product', 'lead-response', 'dashboard');
const ONBOARDING_CHECK = path.join(DASHBOARD_DIR, 'app', 'api', 'onboarding', 'check-email', 'route.ts');
const AGENTS_CHECK = path.join(DASHBOARD_DIR, 'app', 'api', 'agents', 'check-email', 'route.ts');

let passed = 0;
let failed = 0;

function check(name, fn) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (e) {
    console.log(`  ❌ ${name}: ${e.message}`);
    failed++;
  }
}

console.log('\n=== check-email routes: table reference regression guard ===\n');

// 1. Files exist
check('onboarding/check-email/route.ts exists', () => {
  assert(fs.existsSync(ONBOARDING_CHECK), `File not found: ${ONBOARDING_CHECK}`);
});

check('agents/check-email/route.ts exists', () => {
  assert(fs.existsSync(AGENTS_CHECK), `File not found: ${AGENTS_CHECK}`);
});

const onboardingContent = fs.existsSync(ONBOARDING_CHECK) ? fs.readFileSync(ONBOARDING_CHECK, 'utf8') : '';
const agentsContent = fs.existsSync(AGENTS_CHECK) ? fs.readFileSync(AGENTS_CHECK, 'utf8') : '';

// 2. Both routes use real_estate_agents
check('onboarding/check-email uses real_estate_agents table', () => {
  assert(
    onboardingContent.includes(".from('real_estate_agents')") ||
    onboardingContent.includes('.from("real_estate_agents")'),
    'onboarding/check-email/route.ts must query real_estate_agents table'
  );
});

check('agents/check-email uses real_estate_agents table', () => {
  assert(
    agentsContent.includes(".from('real_estate_agents')") ||
    agentsContent.includes('.from("real_estate_agents")'),
    'agents/check-email/route.ts must query real_estate_agents table'
  );
});

// 3. Neither route references the wrong agents table
check('onboarding/check-email does NOT query .from("agents")', () => {
  const hasBadRef =
    onboardingContent.includes(".from('agents')") ||
    onboardingContent.includes('.from("agents")');
  assert(!hasBadRef, 'onboarding/check-email/route.ts still references wrong .from("agents")');
});

check('agents/check-email does NOT query .from("agents")', () => {
  const hasBadRef =
    agentsContent.includes(".from('agents')") ||
    agentsContent.includes('.from("agents")');
  assert(!hasBadRef, 'agents/check-email/route.ts still references wrong .from("agents")');
});

// 4. Correct availability logic
check('onboarding/check-email returns available:false when email is taken', () => {
  assert(onboardingContent.includes('available: false'), 'Route must return available:false when email is taken');
  assert(onboardingContent.includes('available: true'), 'Route must also return available:true when email is free');
});

check('agents/check-email derives availability from database result', () => {
  assert(
    agentsContent.includes('available: !data') ||
    agentsContent.includes('available: false') ||
    agentsContent.includes('exists'),
    'Route must derive availability from database result, not hardcode true'
  );
});

// 5. Parameterized queries (no SQL injection risk)
check('Queries use parameterized .eq() — no string interpolation', () => {
  for (const [label, content] of [['onboarding check-email', onboardingContent], ['agents check-email', agentsContent]]) {
    assert(content.includes('.eq('), `${label}: must use .eq() parameterized filter`);
    assert(
      !content.match(/`[^`]*\$\{email\}[^`]*`/),
      `${label}: possible SQL injection via template literal`
    );
  }
});

// 6. No hardcoded secrets
check('No hardcoded secrets in check-email routes', () => {
  const secretPatterns = [/sk_live_/, /re_[a-zA-Z0-9]{20,}/, /SUPABASE_SERVICE_ROLE_KEY\s*=\s*["'][^"']+/];
  for (const [label, content] of [['onboarding check-email', onboardingContent], ['agents check-email', agentsContent]]) {
    for (const pat of secretPatterns) {
      assert(!pat.test(content), `Potential hardcoded secret in ${label}: ${pat}`);
    }
  }
});

// Summary
console.log(`\nResults: ${passed} passed, ${failed} failed\n`);

if (failed > 0) {
  process.exit(1);
}

console.log('All acceptance criteria met:');
console.log('   1. onboarding/check-email queries real_estate_agents (not agents)');
console.log('   2. agents/check-email queries real_estate_agents (not agents)');
console.log('   3. Availability derived from DB result — duplicates correctly detected');
console.log('   4. Parameterized queries — no SQL injection risk');
console.log('   5. No hardcoded secrets');
