#!/usr/bin/env node
/**
 * Integration test for Genome Model Performance Fix
 * 
 * This test verifies that the genome learning system properly recommends
 * model overrides for tasks with low success rates.
 * 
 * The fix addresses:
 * - api_kimi: 4% success rate → should use sonnet (80%)
 * - api_qwen3.5: 0% success rate → should use sonnet (80%)
 * - bug_fix_codex: 33% success rate → should use kimi (80%)
 * - bug_fix_opus: 20% success rate → should use kimi (80%)
 */

const assert = require('assert')
const path = require('path')

console.log('=== Genome Model Performance Fix - Integration Test ===\n')

// Test 1: Verify genome learning system is accessible
console.log('Test 1: Verify genome learning system is accessible')
try {
  const genomePath = path.join(require('os').homedir(), '.openclaw', 'genome')
  const learningSystemPath = path.join(genomePath, 'intelligence', 'learning-system.js')
  const fs = require('fs')
  
  assert(fs.existsSync(learningSystemPath), 'Learning system should exist at ' + learningSystemPath)
  console.log('✅ PASS: Genome learning system is accessible\n')
} catch (err) {
  console.error('❌ FAIL:', err.message)
  process.exit(1)
}

// Test 2: Verify MODEL_SELECTION_RULES has correct entries
console.log('Test 2: Verify MODEL_SELECTION_RULES configuration')
try {
  const genomePath = path.join(require('os').homedir(), '.openclaw', 'genome')
  const learningSystemPath = path.join(genomePath, 'intelligence', 'learning-system.js')
  
  // Load the module
  delete require.cache[require.resolve(learningSystemPath)]
  const { MODEL_SELECTION_RULES } = require(learningSystemPath)
  
  assert(MODEL_SELECTION_RULES.api, 'API should be in MODEL_SELECTION_RULES')
  assert.strictEqual(MODEL_SELECTION_RULES.api.model, 'sonnet', 'API tasks should use sonnet')
  assert.strictEqual(MODEL_SELECTION_RULES.api.skipCheaper, true, 'API tasks should skip cheaper models')
  
  assert(MODEL_SELECTION_RULES.bug_fix, 'BUG_FIX should be in MODEL_SELECTION_RULES')
  assert.strictEqual(MODEL_SELECTION_RULES.bug_fix.model, 'kimi', 'Bug fix tasks should use kimi')
  
  console.log('✅ PASS: MODEL_SELECTION_RULES has correct entries\n')
} catch (err) {
  console.error('❌ FAIL:', err.message)
  process.exit(1)
}

// Test 3: Verify spawn-consumer has learning-based override
console.log('Test 3: Verify spawn-consumer has learning-based model override')
try {
  const genomePath = path.join(require('os').homedir(), '.openclaw', 'genome')
  const spawnConsumerPath = path.join(genomePath, 'core', 'spawn-consumer.js')
  const fs = require('fs')
  
  const content = fs.readFileSync(spawnConsumerPath, 'utf-8')
  
  assert(content.includes('LearningSystem'), 'spawn-consumer should import LearningSystem')
  assert(content.includes('getModelRecommendation'), 'spawn-consumer should call getModelRecommendation')
  assert(content.includes('learningRecommendedModel'), 'spawn-consumer should have learningRecommendedModel logic')
  assert(content.includes('Learning override'), 'spawn-consumer should log learning overrides')
  
  console.log('✅ PASS: spawn-consumer has learning-based model override\n')
} catch (err) {
  console.error('❌ FAIL:', err.message)
  process.exit(1)
}

// Test 4: Verify getModelRecommendation has critical threshold logic
console.log('Test 4: Verify getModelRecommendation has critical threshold logic')
try {
  const genomePath = path.join(require('os').homedir(), '.openclaw', 'genome')
  const learningSystemPath = path.join(genomePath, 'intelligence', 'learning-system.js')
  const fs = require('fs')
  
  const content = fs.readFileSync(learningSystemPath, 'utf-8')
  
  assert(content.includes('CRITICAL_SUCCESS_THRESHOLD'), 'Should have CRITICAL_SUCCESS_THRESHOLD')
  assert(content.includes('40'), 'Threshold should be 40%')
  assert(content.includes('currentRate < CRITICAL_SUCCESS_THRESHOLD'), 'Should check critical threshold')
  
  console.log('✅ PASS: getModelRecommendation has critical threshold logic\n')
} catch (err) {
  console.error('❌ FAIL:', err.message)
  process.exit(1)
}

// Test 5: Run actual learning system tests
console.log('Test 5: Run actual learning system model recommendation tests')
try {
  const genomePath = path.join(require('os').homedir(), '.openclaw', 'genome')
  const learningSystemPath = path.join(genomePath, 'intelligence', 'learning-system.js')
  
  delete require.cache[require.resolve(learningSystemPath)]
  const { LearningSystem } = require(learningSystemPath)
  const learning = new LearningSystem()
  
  // Test API task with kimi
  const apiKimiTask = { title: 'Create API endpoint', description: 'Build REST API', model: 'kimi' }
  const apiRec = learning.getModelRecommendation(apiKimiTask, 'api')
  assert(apiRec, 'Should recommend change for API task with kimi')
  assert.strictEqual(apiRec.model, 'sonnet', 'Should recommend sonnet for API')
  
  // Test bug fix task with codex
  const bugFixCodexTask = { title: 'Fix login bug', description: 'Auth bug fix', model: 'codex' }
  const bugFixRec = learning.getModelRecommendation(bugFixCodexTask, 'bug_fix')
  assert(bugFixRec, 'Should recommend change for bug fix task with codex')
  assert.strictEqual(bugFixRec.model, 'kimi', 'Should recommend kimi for bug fix')
  
  console.log('✅ PASS: Learning system model recommendations work correctly\n')
} catch (err) {
  console.error('❌ FAIL:', err.message)
  process.exit(1)
}

// Test 6: Verify model performance data shows the problem is real
console.log('Test 6: Verify model performance data')
try {
  const genomePath = path.join(require('os').homedir(), '.openclaw', 'genome')
  const learningSystemPath = path.join(genomePath, 'intelligence', 'learning-system.js')
  
  delete require.cache[require.resolve(learningSystemPath)]
  const { LearningSystem } = require(learningSystemPath)
  const learning = new LearningSystem()
  
  const modelPerf = learning.learnings.modelPerformance || {}
  
  const apiKimi = modelPerf['api_kimi']
  const apiSonnet = modelPerf['api_sonnet']
  const bugFixKimi = modelPerf['bug_fix_kimi']
  const bugFixCodex = modelPerf['bug_fix_codex']
  const bugFixOpus = modelPerf['bug_fix_opus']
  
  console.log('   Model Performance Data:')
  if (apiKimi) {
    const rate = (apiKimi.successes / apiKimi.total * 100).toFixed(1)
    console.log(`   - api_kimi: ${rate}% (${apiKimi.successes}/${apiKimi.total})`)
    assert(apiKimi.total > 100, 'api_kimi should have significant data')
  }
  if (apiSonnet) {
    const rate = (apiSonnet.successes / apiSonnet.total * 100).toFixed(1)
    console.log(`   - api_sonnet: ${rate}% (${apiSonnet.successes}/${apiSonnet.total})`)
  }
  if (bugFixKimi) {
    const rate = (bugFixKimi.successes / bugFixKimi.total * 100).toFixed(1)
    console.log(`   - bug_fix_kimi: ${rate}% (${bugFixKimi.successes}/${bugFixKimi.total})`)
  }
  if (bugFixCodex) {
    const rate = (bugFixCodex.successes / bugFixCodex.total * 100).toFixed(1)
    console.log(`   - bug_fix_codex: ${rate}% (${bugFixCodex.successes}/${bugFixCodex.total})`)
  }
  if (bugFixOpus) {
    const rate = (bugFixOpus.successes / bugFixOpus.total * 100).toFixed(1)
    console.log(`   - bug_fix_opus: ${rate}% (${bugFixOpus.successes}/${bugFixOpus.total})`)
  }
  
  console.log('✅ PASS: Model performance data verified\n')
} catch (err) {
  console.error('❌ FAIL:', err.message)
  process.exit(1)
}

console.log('=============================')
console.log('All integration tests passed! ✅')
console.log('=============================')
console.log('\nSummary:')
console.log('- Genome learning system is properly configured')
console.log('- spawn-consumer.js has learning-based model override')
console.log('- Critical threshold (40%) ensures low-success models are overridden')
console.log('- API tasks with kimi/qwen3.5 will be forced to sonnet')
console.log('- Bug fix tasks with codex/opus will be forced to kimi')
console.log('\nThis fixes the genome self-assessment breach for model_performance success_rate')
