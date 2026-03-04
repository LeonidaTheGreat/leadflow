#!/usr/bin/env node

/**
 * Self-Test Runner v2 - Acceptance Criteria Verification
 * 
 * Features:
 * 1. Links tests to acceptance criteria from task
 * 2. E2E verification for user-facing features
 * 3. Production deploy checks
 * 4. Structured test output for failure recovery
 * 
 * Usage:
 *   node self-test-v2.js --task-id <id>
 *   node self-test-v2.js --spawn-config .spawn-config.json
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

// Configuration
const TEST_TIMEOUT = 300000 // 5 min max
const E2E_TIMEOUT = 60000 // 1 min for E2E tests
const MAX_RETRIES = 3
const TEST_LOG = path.join(process.cwd(), 'test-log.jsonl')

// Load TaskStore for database access
const { TaskStore } = require('./task-store')

// Test categories
const TEST_CATEGORIES = {
  UNIT: 'unit',
  INTEGRATION: 'integration',
  E2E: 'e2e',
  ACCEPTANCE: 'acceptance',
  DEPLOY: 'deploy'
}

class AcceptanceCriteriaTester {
  constructor(task) {
    this.task = task
    this.criteria = task.acceptance_criteria || []
    this.results = []
  }

  /**
   * Parse acceptance criteria and generate specific tests
   * Examples:
   *   "User can log in with email/password" -> auth E2E test
   *   "API returns 200 for GET /users" -> API integration test
   *   "Dashboard shows 5 metrics" -> UI component test
   */
  generateTestsFromCriteria() {
    const tests = []
    
    for (const criterion of this.criteria) {
      const lower = criterion.toLowerCase()
      
      // Pattern matching for test generation
      if (lower.includes('user can') || lower.includes('user sees') || lower.includes('button')) {
        // E2E test for user interactions
        tests.push({
          type: TEST_CATEGORIES.E2E,
          name: `e2e: ${criterion.substring(0, 50)}`,
          criterion,
          fn: () => this.runE2ETest(criterion)
        })
      }
      else if (lower.includes('api') || lower.includes('endpoint') || lower.includes('returns')) {
        // API integration test
        tests.push({
          type: TEST_CATEGORIES.INTEGRATION,
          name: `api: ${criterion.substring(0, 50)}`,
          criterion,
          fn: () => this.runAPITest(criterion)
        })
      }
      else if (lower.includes('build') || lower.includes('compiles') || lower.includes('lint')) {
        // Build/quality test
        tests.push({
          type: TEST_CATEGORIES.UNIT,
          name: `build: ${criterion.substring(0, 50)}`,
          criterion,
          fn: () => this.runBuildTest(criterion)
        })
      }
      else {
        // Generic acceptance test
        tests.push({
          type: TEST_CATEGORIES.ACCEPTANCE,
          name: `acceptance: ${criterion.substring(0, 50)}`,
          criterion,
          fn: () => this.runGenericAcceptanceTest(criterion)
        })
      }
    }
    
    return tests
  }

  async runE2ETest(criterion) {
    // Extract key elements from criterion
    const actions = this.extractActions(criterion)
    const expected = this.extractExpected(criterion)
    
    console.log(`    🎭 E2E Test: ${criterion.substring(0, 60)}...`)
    
    // Check for E2E test files
    const e2eFiles = this.findE2EFiles()
    if (e2eFiles.length === 0) {
      return {
        success: false,
        error: 'No E2E test files found. Expected: e2e/*.spec.js or cypress/e2e/*.cy.js',
        suggestion: 'Create E2E tests for user-facing features'
      }
    }
    
    // Run E2E tests
    try {
      const cmd = this.detectE2ECommand()
      const result = execSync(cmd, { 
        timeout: E2E_TIMEOUT,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe']
      })
      
      return {
        success: true,
        output: result.substring(0, 500),
        filesTested: e2eFiles.length
      }
    } catch (error) {
      return {
        success: false,
        error: error.message.substring(0, 500),
        code: error.status,
        suggestion: 'E2E tests failed. Check screenshots/videos in test output.'
      }
    }
  }

  async runAPITest(criterion) {
    console.log(`    🔌 API Test: ${criterion.substring(0, 60)}...`)
    
    // Extract endpoint from criterion
    const endpoint = this.extractEndpoint(criterion)
    
    if (!endpoint) {
      return {
        success: false,
        error: 'Could not extract API endpoint from acceptance criterion',
        criterion
      }
    }
    
    // Check if API test exists
    const apiTestFile = this.findAPITestFile(endpoint)
    
    if (apiTestFile) {
      try {
        const result = execSync(`node ${apiTestFile}`, {
          timeout: TEST_TIMEOUT,
          encoding: 'utf-8'
        })
        return { success: true, output: result.substring(0, 500) }
      } catch (error) {
        return {
          success: false,
          error: error.message.substring(0, 500),
          suggestion: 'API test failed. Check endpoint implementation.'
        }
      }
    }
    
    // Fallback: try to ping the endpoint if server is running
    try {
      const url = this.getLocalServerUrl() + endpoint
      const result = execSync(`curl -s -o /dev/null -w "%{http_code}" ${url}`, {
        timeout: 10000,
        encoding: 'utf-8'
      })
      
      const statusCode = parseInt(result.trim())
      const success = statusCode >= 200 && statusCode < 400
      
      return {
        success,
        statusCode,
        endpoint: url,
        error: success ? null : `HTTP ${statusCode} from ${endpoint}`
      }
    } catch (error) {
      return {
        success: false,
        error: `API endpoint check failed: ${error.message}`,
        suggestion: 'Ensure server is running or create API test file'
      }
    }
  }

  async runBuildTest(criterion) {
    console.log(`    🔨 Build Test: ${criterion.substring(0, 60)}...`)
    
    const buildCommands = [
      'npm run build',
      'npm run compile',
      'npx tsc --noEmit'
    ]
    
    for (const cmd of buildCommands) {
      try {
        execSync(cmd, { timeout: 120000, encoding: 'utf-8' })
        return { 
          success: true, 
          command: cmd,
          output: 'Build succeeded'
        }
      } catch (error) {
        // Try next command
      }
    }
    
    return {
      success: false,
      error: 'All build commands failed',
      suggestion: 'Check package.json for build scripts'
    }
  }

  async runGenericAcceptanceTest(criterion) {
    console.log(`    ✅ Acceptance: ${criterion.substring(0, 60)}...`)
    
    // Check if files mentioned in criterion exist
    const filePatterns = this.extractFilePatterns(criterion)
    const foundFiles = []
    const missingFiles = []
    
    for (const pattern of filePatterns) {
      try {
        const files = execSync(`find . -name "${pattern}" -type f 2>/dev/null | head -5`, {
          encoding: 'utf-8'
        }).trim().split('\n').filter(f => f)
        
        if (files.length > 0) {
          foundFiles.push(...files)
        } else {
          missingFiles.push(pattern)
        }
      } catch (e) {
        missingFiles.push(pattern)
      }
    }
    
    if (missingFiles.length > 0 && foundFiles.length === 0) {
      return {
        success: false,
        error: `Expected files not found: ${missingFiles.join(', ')}`,
        suggestion: 'Create deliverable files mentioned in acceptance criteria'
      }
    }
    
    return {
      success: true,
      foundFiles,
      criterion: criterion.substring(0, 100)
    }
  }

  // Helper methods
  extractActions(criterion) {
    const actionPatterns = [
      /user can (\w+)/gi,
      /click (\w+)/gi,
      /enter (\w+)/gi,
      /submit (\w+)/gi
    ]
    const actions = []
    for (const pattern of actionPatterns) {
      const matches = criterion.matchAll(pattern)
      for (const match of matches) {
        actions.push(match[1])
      }
    }
    return actions
  }

  extractExpected(criterion) {
    const match = criterion.match(/(?:see|get|receive|show[s]?|display[s]?) (.+)/i)
    return match ? match[1] : null
  }

  extractEndpoint(criterion) {
    const match = criterion.match(/(GET|POST|PUT|DELETE|PATCH)?\s*(\/\S+)/i)
    return match ? match[2] : null
  }

  extractFilePatterns(criterion) {
    const patterns = []
    const matches = criterion.matchAll(/(\*?\.\w+|\w+\.\w{2,4})/g)
    for (const match of matches) {
      patterns.push(match[1])
    }
    return patterns.length > 0 ? patterns : ['*.js', '*.ts']
  }

  findE2EFiles() {
    const dirs = ['e2e', 'tests/e2e', 'cypress/e2e', 'playwright/tests']
    const files = []
    
    for (const dir of dirs) {
      if (fs.existsSync(dir)) {
        try {
          const dirFiles = fs.readdirSync(dir)
            .filter(f => f.endsWith('.spec.js') || f.endsWith('.cy.js') || f.endsWith('.test.js'))
            .map(f => path.join(dir, f))
          files.push(...dirFiles)
        } catch (e) {}
      }
    }
    
    return files
  }

  detectE2ECommand() {
    if (fs.existsSync('playwright.config.js')) return 'npx playwright test'
    if (fs.existsSync('cypress.config.js')) return 'npx cypress run'
    if (fs.existsSync('wdio.conf.js')) return 'npx wdio run wdio.conf.js'
    return 'npm run test:e2e'
  }

  findAPITestFile(endpoint) {
    // Look for test files matching endpoint
    const testDirs = ['tests/api', 'tests/integration', '__tests__']
    const normalizedEndpoint = endpoint.replace(/\//g, '_').replace(/^_/, '')
    
    for (const dir of testDirs) {
      if (!fs.existsSync(dir)) continue
      
      const files = fs.readdirSync(dir)
      const matching = files.find(f => 
        f.includes(normalizedEndpoint) || 
        f.includes(endpoint.replace(/\//g, '-'))
      )
      
      if (matching) return path.join(dir, matching)
    }
    
    return null
  }

  getLocalServerUrl() {
    // Try to detect local server URL
    const urls = ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:8080']
    
    for (const url of urls) {
      try {
        execSync(`curl -s -o /dev/null ${url}`, { timeout: 2000 })
        return url
      } catch (e) {}
    }
    
    return urls[0] // Default fallback
  }
}

class ProductionDeployChecker {
  constructor(task) {
    this.task = task
  }

  async runChecks() {
    const checks = []
    
    console.log('\n  🚀 Production Deploy Checks')
    console.log('  ' + '─'.repeat(40))
    
    // Check 1: Build artifacts exist
    checks.push(await this.checkBuildArtifacts())
    
    // Check 2: Environment variables configured
    checks.push(await this.checkEnvironmentConfig())
    
    // Check 3: Dependencies installed
    checks.push(await this.checkDependencies())
    
    // Check 4: No secrets in code
    checks.push(await this.checkSecrets())
    
    // Check 5: Health check endpoint (if applicable)
    checks.push(await this.checkHealthEndpoint())
    
    return checks
  }

  async checkBuildArtifacts() {
    console.log('    📦 Build artifacts...')
    
    const buildDirs = ['dist', 'build', '.next', 'out']
    const foundBuild = buildDirs.find(dir => fs.existsSync(dir))
    
    if (foundBuild) {
      try {
        const size = execSync(`du -sh ${foundBuild} 2>/dev/null`, { encoding: 'utf-8' }).split('\t')[0]
        return {
          name: 'build-artifacts',
          success: true,
          message: `Build dir: ${foundBuild} (${size})`
        }
      } catch (e) {
        return {
          name: 'build-artifacts',
          success: true,
          message: `Build dir: ${foundBuild}`
        }
      }
    }
    
    return {
      name: 'build-artifacts',
      success: false,
      error: 'No build artifacts found',
      suggestion: 'Run npm run build before deploying'
    }
  }

  async checkEnvironmentConfig() {
    console.log('    🔧 Environment config...')
    
    const envFiles = ['.env', '.env.production', '.env.local']
    const foundEnv = envFiles.find(f => fs.existsSync(f))
    
    if (foundEnv) {
      const content = fs.readFileSync(foundEnv, 'utf-8')
      const requiredVars = ['DATABASE_URL', 'API_KEY', 'NEXT_PUBLIC', 'SUPABASE']
      const foundVars = requiredVars.filter(v => content.includes(v))
      
      return {
        name: 'environment-config',
        success: foundVars.length > 0,
        message: `Found ${foundVars.length} config variables in ${foundEnv}`,
        foundVars,
        warning: foundVars.length === 0 ? 'No standard env vars found' : null
      }
    }
    
    return {
      name: 'environment-config',
      success: false,
      error: 'No .env files found',
      suggestion: 'Create .env.production with required variables'
    }
  }

  async checkDependencies() {
    console.log('    📚 Dependencies...')
    
    if (!fs.existsSync('package.json')) {
      return {
        name: 'dependencies',
        success: true,
        message: 'No package.json (not a Node project)'
      }
    }
    
    if (!fs.existsSync('node_modules')) {
      return {
        name: 'dependencies',
        success: false,
        error: 'node_modules not found',
        suggestion: 'Run npm install'
      }
    }
    
    // Check for lock file
    const hasLock = fs.existsSync('package-lock.json') || fs.existsSync('yarn.lock')
    
    return {
      name: 'dependencies',
      success: true,
      message: 'Dependencies installed',
      hasLockFile: hasLock
    }
  }

  async checkSecrets() {
    console.log('    🔒 Secrets scan...')
    
    const patterns = [
      /['"]sk-[a-zA-Z0-9]{20,}['"]/, // OpenAI keys
      /['"]AKIA[0-9A-Z]{16}['"]/, // AWS keys
      /['"][0-9a-f]{32}['"]/, // Generic API keys
      /password\s*=\s*['"][^'"]+['"]/i,
      /api[_-]?key\s*=\s*['"][^'"]+['"]/i
    ]
    
    const suspiciousFiles = []
    
    // Scan common source files
    try {
      const files = execSync('find . -type f -name "*.js" -o -name "*.ts" 2>/dev/null | grep -v node_modules | grep -v ".git" | head -50', {
        encoding: 'utf-8'
      }).trim().split('\n').filter(f => f)
      
      for (const file of files.slice(0, 20)) {
        try {
          const content = fs.readFileSync(file, 'utf-8')
          for (const pattern of patterns) {
            if (pattern.test(content)) {
              suspiciousFiles.push(file)
              break
            }
          }
        } catch (e) {}
      }
    } catch (e) {}
    
    return {
      name: 'secrets-scan',
      success: suspiciousFiles.length === 0,
      message: suspiciousFiles.length === 0 
        ? 'No secrets detected in source files'
        : `Potential secrets in: ${suspiciousFiles.join(', ')}`,
      suspiciousFiles
    }
  }

  async notifyOrchestrator() {
    // Notify orchestrator bridge of test results
    if (!this.taskId || this.taskId === 'unknown') return
    
    try {
      console.log('\n📤 Notifying orchestrator...')
      const { execSync } = require('child_process')
      execSync(
        `node orchestrator-bridge.js --handle-failure ${this.taskId} --results test-results.json`,
        { stdio: 'inherit', timeout: 30000 }
      )
    } catch (error) {
      // Orchestrator handles failures, so this might "fail" if it triggers retry
      console.log('   Orchestrator notified (may trigger retry)')
    }
  }

  async checkHealthEndpoint() {
    console.log('    ❤️  Health check...')
    
    // Check if there's a health endpoint defined
    const healthPaths = ['/health', '/api/health', '/status']
    
    // Look for health endpoint in code
    try {
      const grepResult = execSync('grep -r "health" --include="*.js" --include="*.ts" . 2>/dev/null | head -5', {
        encoding: 'utf-8'
      })
      
      if (grepResult.includes('health') || grepResult.includes('/status')) {
        return {
          name: 'health-endpoint',
          success: true,
          message: 'Health endpoint found in code'
        }
      }
    } catch (e) {}
    
    return {
      name: 'health-endpoint',
      success: false,
      warning: 'No health endpoint detected',
      suggestion: 'Add /health endpoint for monitoring'
    }
  }
}

class SelfTestRunner {
  constructor(options = {}) {
    this.taskId = options.taskId
    this.spawnConfigPath = options.spawnConfigPath
    this.store = new TaskStore()
    this.results = {
      taskId: null,
      taskTitle: null,
      timestamp: new Date().toISOString(),
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        warnings: 0
      },
      categories: {},
      allPassed: false
    }
  }

  async loadTask() {
    // Try to get task from database
    if (this.taskId) {
      this.task = await this.store.getTask(this.taskId)
    } else if (this.spawnConfigPath && fs.existsSync(this.spawnConfigPath)) {
      const config = JSON.parse(fs.readFileSync(this.spawnConfigPath, 'utf-8'))
      this.taskId = config.task
      this.task = await this.store.getTask(this.taskId)
    }
    
    if (!this.task) {
      // Fallback: create minimal task structure
      console.log('⚠️  Task not found in database, using fallback')
      this.task = {
        id: this.taskId || 'unknown',
        title: 'Unknown Task',
        acceptance_criteria: [],
        agent_id: 'default'
      }
    }
    
    this.results.taskId = this.task.id
    this.results.taskTitle = this.task.title
  }

  async runTests() {
    console.log('\n' + '═'.repeat(60))
    console.log('🧪 Self-Test Runner v2 - Acceptance Criteria Verification')
    console.log('═'.repeat(60))
    console.log(`\nTask: ${this.task.title}`)
    console.log(`ID: ${this.task.id}`)
    console.log(`Agent: ${this.task.agent_id || 'default'}`)
    console.log(`Acceptance Criteria: ${(this.task.acceptance_criteria || []).length}`)
    
    const allTests = []
    
    // 1. Acceptance Criteria Tests
    if (this.task.acceptance_criteria && this.task.acceptance_criteria.length > 0) {
      console.log('\n📋 Phase 1: Acceptance Criteria Tests')
      console.log('─'.repeat(40))
      
      const acTester = new AcceptanceCriteriaTester(this.task)
      const acTests = acTester.generateTestsFromCriteria()
      
      for (const test of acTests) {
        const result = await test.fn()
        allTests.push({
          category: TEST_CATEGORIES.ACCEPTANCE,
          name: test.name,
          criterion: test.criterion,
          ...result
        })
      }
    } else {
      console.log('\n⚠️  No acceptance criteria defined for this task')
      console.log('   Running generic agent tests...')
      
      // Run generic tests based on agent type
      const genericTests = this.runGenericAgentTests(this.task.agent_id || 'default')
      for (const test of genericTests) {
        allTests.push(test)
      }
    }
    
    // 2. Production Deploy Checks
    console.log('\n🚀 Phase 2: Production Deploy Checks')
    const deployChecker = new ProductionDeployChecker(this.task)
    const deployChecks = await deployChecker.runChecks()
    
    for (const check of deployChecks) {
      allTests.push({
        category: TEST_CATEGORIES.DEPLOY,
        ...check
      })
    }
    
    // 3. Agent-Specific Tests
    console.log('\n🔧 Phase 3: Agent-Specific Tests')
    const agentTests = await this.runAgentSpecificTests(this.task.agent_id || 'default')
    for (const test of agentTests) {
      allTests.push({
        category: TEST_CATEGORIES.UNIT,
        ...test
      })
    }
    
    // Compile results
    this.results.tests = allTests
    this.results.summary.total = allTests.length
    this.results.summary.passed = allTests.filter(t => t.success).length
    this.results.summary.failed = allTests.filter(t => !t.success && !t.warning).length
    this.results.summary.warnings = allTests.filter(t => t.warning).length
    this.results.allPassed = this.results.summary.failed === 0
    
    // Categorize
    for (const test of allTests) {
      const cat = test.category || 'other'
      if (!this.results.categories[cat]) {
        this.results.categories[cat] = { total: 0, passed: 0, failed: 0 }
      }
      this.results.categories[cat].total++
      if (test.success) {
        this.results.categories[cat].passed++
      } else {
        this.results.categories[cat].failed++
      }
    }
  }

  runGenericAgentTests(agentId) {
    // Fallback when no acceptance criteria
    const tests = []
    
    // Check deliverables exist
    tests.push({
      name: 'deliverables-exist',
      success: fs.existsSync('src') || fs.existsSync('dist') || fs.existsSync('README.md'),
      message: 'Project structure exists'
    })
    
    return tests
  }

  async runAgentSpecificTests(agentId) {
    const tests = []
    const { execSync } = require('child_process')
    
    // Build check for dev
    if (agentId === 'dev' || fs.existsSync('package.json')) {
      try {
        execSync('npm run build', { timeout: 120000, stdio: 'pipe' })
        tests.push({ name: 'build', success: true, message: 'Build succeeded' })
      } catch (e) {
        tests.push({ name: 'build', success: false, error: 'Build failed' })
      }
    }
    
    // Lint check
    try {
      execSync('npm run lint', { timeout: 60000, stdio: 'pipe' })
      tests.push({ name: 'lint', success: true, message: 'Lint passed' })
    } catch (e) {
      tests.push({ name: 'lint', success: false, error: 'Lint failed', warning: true })
    }
    
    return tests
  }

  saveResults() {
    // Save to JSON file
    fs.writeFileSync('test-results.json', JSON.stringify(this.results, null, 2))
    
    // Append to log
    const logEntry = {
      timestamp: new Date().toISOString(),
      ...this.results
    }
    fs.appendFileSync('test-log.jsonl', JSON.stringify(logEntry) + '\n')
    
    // Update spawn config if exists
    if (this.spawnConfigPath && fs.existsSync(this.spawnConfigPath)) {
      const config = JSON.parse(fs.readFileSync(this.spawnConfigPath, 'utf-8'))
      config.testResults = this.results
      config.testPassed = this.results.allPassed
      fs.writeFileSync(this.spawnConfigPath, JSON.stringify(config, null, 2))
    }
  }

  printReport() {
    console.log('\n' + '═'.repeat(60))
    console.log('📊 Test Results Summary')
    console.log('═'.repeat(60))
    
    // Category breakdown
    for (const [category, stats] of Object.entries(this.results.categories)) {
      const icon = stats.failed === 0 ? '✅' : '❌'
      console.log(`${icon} ${category.toUpperCase()}: ${stats.passed}/${stats.total} passed`)
    }
    
    console.log('\n' + '─'.repeat(40))
    console.log(`Total: ${this.results.summary.total} tests`)
    console.log(`Passed: ${this.results.summary.passed} ✅`)
    console.log(`Failed: ${this.results.summary.failed} ❌`)
    console.log(`Warnings: ${this.results.summary.warnings} ⚠️`)
    
    // Failed tests detail
    const failedTests = this.results.tests.filter(t => !t.success && !t.warning)
    if (failedTests.length > 0) {
      console.log('\n❌ Failed Tests:')
      for (const test of failedTests) {
        console.log(`\n  ${test.name}`)
        console.log(`     ${test.error || 'Unknown error'}`)
        if (test.suggestion) {
          console.log(`     💡 ${test.suggestion}`)
        }
      }
    }
    
    // Final verdict
    console.log('\n' + '═'.repeat(60))
    if (this.results.allPassed) {
      console.log('✅ ALL TESTS PASSED - Ready for deployment')
    } else {
      console.log('❌ TESTS FAILED - Fix issues before deployment')
    }
    console.log('═'.repeat(60))
    
    console.log('\n📁 Results saved to: test-results.json')
  }

  async run() {
    try {
      await this.loadTask()
      await this.runTests()
      this.saveResults()
      this.printReport()
      
      // Notify orchestrator on failure
      if (!this.results.allPassed) {
        await this.notifyOrchestrator()
      }
      
      process.exit(this.results.allPassed ? 0 : 1)
    } catch (error) {
      console.error('\n❌ Self-test error:', error.message)
      console.error(error.stack)
      process.exit(1)
    }
  }
}

// CLI
async function main() {
  const args = process.argv.slice(2)
  
  const options = {
    taskId: args.includes('--task-id') ? args[args.indexOf('--task-id') + 1] : null,
    spawnConfigPath: args.includes('--spawn-config') ? args[args.indexOf('--spawn-config') + 1] : '.spawn-config.json'
  }
  
  const runner = new SelfTestRunner(options)
  await runner.run()
}

main()
