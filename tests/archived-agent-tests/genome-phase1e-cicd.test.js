// tests/genome-phase1e-cicd.test.js
// E2E test for genome-phase1e-cicd: GitHub Actions CI/CD verification

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const GENOME_DIR = path.join(process.env.HOME, '.openclaw/genome');

console.log('Testing genome-phase1e-cicd CI/CD setup...\n');

// Test 1: Verify atomic-restart.sh runs tests before restart
console.log('Test 1: atomic-restart.sh test gate...');
const restartScript = fs.readFileSync(
  path.join(GENOME_DIR, 'scripts/atomic-restart.sh'), 
  'utf8'
);

assert(restartScript.includes('npx jest --silent'), 
  'atomic-restart.sh must run jest tests');
assert(restartScript.includes('TESTS FAILED — aborting restart'),
  'atomic-restart.sh must abort on test failure');
assert(restartScript.includes('test_exit=$?'),
  'atomic-restart.sh must capture test exit code');
console.log('  ✅ atomic-restart.sh correctly runs tests before restart\n');

// Test 2: Verify CI workflow runs tests
console.log('Test 2: CI workflow configuration...');
const ciWorkflow = fs.readFileSync(
  path.join(GENOME_DIR, '.github/workflows/ci.yml'),
  'utf8'
);
assert(ciWorkflow.includes('run: npm test'),
  'CI workflow must run npm test');
assert(ciWorkflow.includes('node -c'),
  'CI workflow must validate syntax');
assert(ciWorkflow.includes('pull_request'),
  'CI workflow must trigger on PRs');
assert(ciWorkflow.includes('branches: [ main ]'),
  'CI workflow must trigger on main branch');
console.log('  ✅ CI workflow configured correctly\n');

// Test 3: Verify Deploy workflow has SSH config
console.log('Test 3: Deploy workflow SSH configuration...');
const deployWorkflow = fs.readFileSync(
  path.join(GENOME_DIR, '.github/workflows/deploy.yml'),
  'utf8'
);
assert(deployWorkflow.includes('appleboy/ssh-action'),
  'Deploy workflow must use SSH action');
assert(deployWorkflow.includes('secrets.DEPLOY_SSH_KEY'),
  'Deploy workflow must use SSH key secret');
assert(deployWorkflow.includes('stojanadmins-mac-mini.tail3ca16c.ts.net'),
  'Deploy workflow must target correct host');
assert(deployWorkflow.includes('username: clawdbot'),
  'Deploy workflow must use correct username');
assert(deployWorkflow.includes('atomic-restart.sh'),
  'Deploy workflow must call atomic-restart.sh');
console.log('  ✅ Deploy workflow SSH config correct\n');

// Test 4: Verify package.json has test script
console.log('Test 4: package.json test script...');
const packageJson = JSON.parse(fs.readFileSync(
  path.join(GENOME_DIR, 'package.json'),
  'utf8'
));

// This will FAIL - the test script is missing
if (!packageJson.scripts.test) {
  console.log('  ❌ package.json missing "test" script - THIS WILL CAUSE CI TO FAIL');
  console.log('     Add: "test": "jest --passWithNoTests" to scripts\n');
  process.exit(1);
}
assert(packageJson.scripts.test.includes('jest'),
  'Test script must run jest');
console.log('  ✅ package.json has test script\n');

console.log('✅ All E2E tests passed');
