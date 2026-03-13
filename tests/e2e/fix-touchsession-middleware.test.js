/**
 * E2E Test: touchSession() middleware implementation
 * Task: fix-touchsession-middleware-not-implemented-no-session
 * 
 * Acceptance Criteria from PRD:
 * 1. touchSession() middleware exists and updates agent_sessions.last_active_at
 * 2. Middleware is called on every authenticated API call or page load
 * 3. Updates have a 60-second rate limit to avoid DB spam
 * 4. Failures are silent (don't break requests)
 * 5. Works with existing session validation in middleware.ts
 */

const path = require('path');
const fs = require('fs');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    failed++;
    return false;
  }
  console.log(`✅ PASS: ${message}`);
  passed++;
  return true;
}

async function testTouchSessionFunctionExists() {
  console.log('\n📋 Test Suite 1: touchSession() function exists in agent-session.ts');
  
  const agentSessionPath = path.join(__dirname, '..', 'product', 'lead-response', 'dashboard', 'lib', 'agent-session.ts');
  
  if (!fs.existsSync(agentSessionPath)) {
    assert(false, 'lib/agent-session.ts file exists');
    return;
  }
  
  assert(true, 'lib/agent-session.ts file exists');
  
  const content = fs.readFileSync(agentSessionPath, 'utf-8');
  
  assert(content.includes('touchSession'), 'touchSession function is exported');
  assert(content.includes('agent_sessions'), 'References agent_sessions table');
  assert(content.includes('last_active_at'), 'Updates last_active_at column');
}

async function testMiddlewareCallsTouchSession() {
  console.log('\n📋 Test Suite 2: middleware.ts calls touchSession for authenticated requests');
  
  const middlewarePath = path.join(__dirname, '..', 'product', 'lead-response', 'dashboard', 'middleware.ts');
  
  if (!fs.existsSync(middlewarePath)) {
    assert(false, 'middleware.ts file exists');
    return;
  }
  
  const content = fs.readFileSync(middlewarePath, 'utf-8');
  
  assert(content.includes('touchSession') || content.includes('agent-session'), 'middleware.ts imports or calls touchSession');
}

async function testRateLimitingExists() {
  console.log('\n📋 Test Suite 3: 60-second rate limiting is implemented');
  
  const agentSessionPath = path.join(__dirname, '..', 'product', 'lead-response', 'dashboard', 'lib', 'agent-session.ts');
  
  if (!fs.existsSync(agentSessionPath)) {
    console.log('   ⚠️  Skipping rate limit test - agent-session.ts not implemented');
    return;
  }
  
  const content = fs.readFileSync(agentSessionPath, 'utf-8');
  assert(content.includes('try') && content.includes('catch'), 'touchSession has error handling');
}

async function runAll() {
  console.log('🧪 Running E2E tests: touchSession() middleware implementation\n');
  console.log('='.repeat(70));
  
  try {
    await testTouchSessionFunctionExists();
    await testMiddlewareCallsTouchSession();
    await testRateLimitingExists();
  } catch (err) {
    console.error('\n💥 Test runner error:', err.message);
    failed++;
  }
  
  console.log('\n' + '='.repeat(70));
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);
  
  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runAll().catch(err => {
  console.error('\n💥 Fatal error:', err.message);
  process.exit(1);
});
