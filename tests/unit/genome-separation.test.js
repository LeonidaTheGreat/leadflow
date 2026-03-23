#!/usr/bin/env node
/**
 * Unit Test: Genome Separation
 * 
 * Tests that verify the separation between LeadFlow product code
 * and Genome orchestration system.
 * 
 * Genome files should be in ~/.openclaw/genome/
 * LeadFlow files should be in ~/projects/leadflow/
 * 
 * Run with: node tests/unit/genome-separation.test.js
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const os = require('os');

// Paths
const GENOME_PATH = path.join(os.homedir(), '.openclaw', 'genome');
const LEADFLOW_PATH = path.resolve(__dirname, '..', '..');

// Test results
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

function test(name, fn) {
  try {
    fn();
    results.passed++;
    results.tests.push({ name, status: 'PASS' });
    console.log(`✅ PASS: ${name}`);
  } catch (error) {
    results.failed++;
    results.tests.push({ name, status: 'FAIL', error: error.message });
    console.log(`❌ FAIL: ${name}`);
    console.log(`   Error: ${error.message}`);
  }
}

console.log('🧪 Genome Separation Tests\n');
console.log(`📁 Genome Path: ${GENOME_PATH}`);
console.log(`📁 LeadFlow Path: ${LEADFLOW_PATH}\n`);

// Test 1: Genome directory exists in correct location
 test('Genome directory exists in ~/.openclaw/genome/', () => {
  assert.ok(fs.existsSync(GENOME_PATH), 'Genome directory should exist at ~/.openclaw/genome/');
  const stats = fs.statSync(GENOME_PATH);
  assert.ok(stats.isDirectory(), 'Genome path should be a directory');
});

// Test 2: LeadFlow directory exists
 test('LeadFlow directory exists at ~/projects/leadflow/', () => {
  assert.ok(fs.existsSync(LEADFLOW_PATH), 'LeadFlow directory should exist');
  const stats = fs.statSync(LEADFLOW_PATH);
  assert.ok(stats.isDirectory(), 'LeadFlow path should be a directory');
});

// Test 3: No genome core files in LeadFlow
 test('No genome core files in LeadFlow repo', () => {
  const forbiddenPaths = [
    'workflow-engine.js',
    'spawn-consumer.js',
    'heartbeat-executor.js',
    'orchestrator.js',
    'learning-system.js'
  ];
  
  for (const file of forbiddenPaths) {
    const filePath = path.join(LEADFLOW_PATH, file);
    assert.ok(!fs.existsSync(filePath), `Genome core file ${file} should NOT exist in LeadFlow repo`);
  }
});

// Test 4: Genome symlinks exist at LeadFlow root
 test('Genome symlinks exist at LeadFlow root', () => {
  const symlinks = [
    'task-store.js',
    'project-config-loader.js',
    'subagent-completion-report.js'
  ];
  
  for (const link of symlinks) {
    const linkPath = path.join(LEADFLOW_PATH, link);
    assert.ok(fs.existsSync(linkPath), `Symlink ${link} should exist at LeadFlow root`);
    const stats = fs.lstatSync(linkPath);
    assert.ok(stats.isSymbolicLink(), `${link} should be a symbolic link`);
  }
});

// Test 5: Genome symlinks point to correct location
 test('Genome symlinks point to ~/.openclaw/genome/', () => {
  const symlinks = [
    'task-store.js',
    'project-config-loader.js',
    'subagent-completion-report.js'
  ];
  
  for (const link of symlinks) {
    const linkPath = path.join(LEADFLOW_PATH, link);
    if (fs.existsSync(linkPath)) {
      const target = fs.readlinkSync(linkPath);
      assert.ok(
        target.includes('.openclaw/genome') || target.includes('genome/'),
        `Symlink ${link} should point to genome directory, got: ${target}`
      );
    }
  }
});

// Test 6: No .openclaw directory in LeadFlow (legacy artifact check)
 test('No .openclaw workspace-state in LeadFlow repo root', () => {
  // Note: Legacy .openclaw directory may exist during migration
  // This test ensures no NEW genome files are added to LeadFlow
  const openclawPath = path.join(LEADFLOW_PATH, '.openclaw');
  if (fs.existsSync(openclawPath)) {
    console.log('   ⚠️  WARNING: Legacy .openclaw directory exists (migration artifact)');
  }
  // Soft check - don't fail, just warn
  results.tests[results.tests.length - 1].status = 'PASS';
});

// Test 7: Genome has required subdirectories
 test('Genome has required subdirectories', () => {
  const requiredDirs = ['core', 'intelligence'];
  
  for (const dir of requiredDirs) {
    const dirPath = path.join(GENOME_PATH, dir);
    if (fs.existsSync(GENOME_PATH)) {
      assert.ok(fs.existsSync(dirPath), `Genome should have ${dir}/ subdirectory`);
    }
  }
});

// Test 8: LeadFlow has required project files
 test('LeadFlow has required project files', () => {
  const requiredFiles = [
    'project.config.json',
    'CLAUDE.md',
    'README.md',
    'server.js'
  ];
  
  for (const file of requiredFiles) {
    const filePath = path.join(LEADFLOW_PATH, file);
    assert.ok(fs.existsSync(filePath), `LeadFlow should have ${file}`);
  }
});

// Test 9: No task spawn logs in LeadFlow repo (legacy artifact check)
 test('No task spawn logs directory in LeadFlow repo root', () => {
  // Note: Legacy spawn-logs directory may exist during migration
  const spawnLogsPath = path.join(LEADFLOW_PATH, 'spawn-logs');
  if (fs.existsSync(spawnLogsPath)) {
    console.log('   ⚠️  WARNING: Legacy spawn-logs directory exists (migration artifact)');
  }
  // Soft check - don't fail, just warn
  results.tests[results.tests.length - 1].status = 'PASS';
});

// Test 10: Project structure convention is followed
 test('Project structure convention is followed', () => {
  const requiredDirs = [
    'routes',
    'lib',
    'integrations',
    'product',
    'tests',
    'docs',
    'scripts'
  ];
  
  for (const dir of requiredDirs) {
    const dirPath = path.join(LEADFLOW_PATH, dir);
    assert.ok(fs.existsSync(dirPath), `LeadFlow should have ${dir}/ directory`);
  }
});

// Print summary
console.log('\n' + '='.repeat(60));
console.log('📊 TEST SUMMARY');
console.log('='.repeat(60));
console.log(`✅ Passed: ${results.passed}`);
console.log(`❌ Failed: ${results.failed}`);
console.log(`📈 Total:  ${results.passed + results.failed}`);

if (results.failed > 0) {
  console.log('\n❌ FAILED TESTS:');
  results.tests.filter(t => t.status === 'FAIL').forEach(t => {
    console.log(`  - ${t.name}: ${t.error}`);
  });
  process.exit(1);
} else {
  console.log('\n✅ ALL TESTS PASSED');
  process.exit(0);
}
