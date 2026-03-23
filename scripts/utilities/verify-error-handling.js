#!/usr/bin/env node

/**
 * Error Handling & Logging Standardization Verification
 * 
 * This script verifies that all error handling and logging
 * components have been properly implemented.
 */

const fs = require('fs')
const path = require('path')

const CHECKS = {
  passed: 0,
  failed: 0,
  tests: [],
}

function check(name, condition, details = '') {
  if (condition) {
    CHECKS.passed++
    CHECKS.tests.push({ name, status: 'PASSED', details })
    console.log(`✅ ${name}`)
  } else {
    CHECKS.failed++
    CHECKS.tests.push({ name, status: 'FAILED', details })
    console.log(`❌ ${name}${details ? `: ${details}` : ''}`)
  }
}

console.log('═══════════════════════════════════════════════════════════════')
console.log('Error Handling & Logging Standardization - Verification Report')
console.log('═══════════════════════════════════════════════════════════════\n')

// 1. Check Frontend Error Classes
console.log('📦 Frontend Error Classes')
console.log('─────────────────────────────────────────────────────────────')
const errorsFile = path.join(__dirname, 'frontend/src/lib/errors.ts')
check('errors.ts exists', fs.existsSync(errorsFile))
if (fs.existsSync(errorsFile)) {
  const content = fs.readFileSync(errorsFile, 'utf-8')
  check('LeadFlowError base class', content.includes('export class LeadFlowError'))
  check('ValidationError class', content.includes('export class ValidationError'))
  check('AuthenticationError class', content.includes('export class AuthenticationError'))
  check('AuthorizationError class', content.includes('export class AuthorizationError'))
  check('NotFoundError class', content.includes('export class NotFoundError'))
  check('ConflictError class', content.includes('export class ConflictError'))
  check('RateLimitError class', content.includes('export class RateLimitError'))
  check('isLeadFlowError type guard', content.includes('export function isLeadFlowError'))
  check('normalizeError function', content.includes('export function normalizeError'))
}

// 2. Check Frontend Logger
console.log('\n📦 Frontend Logger')
console.log('─────────────────────────────────────────────────────────────')
const loggerFile = path.join(__dirname, 'frontend/src/lib/logger.ts')
check('logger.ts exists', fs.existsSync(loggerFile))
if (fs.existsSync(loggerFile)) {
  const content = fs.readFileSync(loggerFile, 'utf-8')
  check('Logger class', content.includes('class Logger'))
  check('logger singleton', content.includes('export const logger'))
  check('Log levels (debug/info/warn/error/fatal)', 
    ['debug', 'info', 'warn', 'error', 'fatal'].every(l => content.includes(`'${l}'`)))
  check('useLogger hook', content.includes('export function useLogger'))
  check('withLogging helper', content.includes('export async function withLogging'))
  check('Sensitive data redaction', content.includes('redactSensitiveData'))
}

// 3. Check API Client
console.log('\n📦 API Client')
console.log('─────────────────────────────────────────────────────────────')
const apiClientFile = path.join(__dirname, 'frontend/src/lib/api-client.ts')
check('api-client.ts exists', fs.existsSync(apiClientFile))
if (fs.existsSync(apiClientFile)) {
  const content = fs.readFileSync(apiClientFile, 'utf-8')
  check('createApiClient function', content.includes('export function createApiClient'))
  check('handleApiResponse function', content.includes('export async function handleApiResponse'))
  check('formatApiError function', content.includes('export function formatApiError'))
  check('apiClient singleton', content.includes('export const apiClient'))
  check('Retry logic', content.includes('retryFetch'))
  check('Timeout handling', content.includes('fetchWithTimeout'))
}

// 4. Check Error Boundaries
console.log('\n📦 Error Boundaries')
console.log('─────────────────────────────────────────────────────────────')
const errorBoundaryFile = path.join(__dirname, 'frontend/src/components/ErrorBoundary.tsx')
check('ErrorBoundary.tsx exists', fs.existsSync(errorBoundaryFile))
if (fs.existsSync(errorBoundaryFile)) {
  const content = fs.readFileSync(errorBoundaryFile, 'utf-8')
  check('ErrorBoundary class component', content.includes('class ErrorBoundary extends Component'))
  check('componentDidCatch lifecycle', content.includes('componentDidCatch'))
  check('Default error view', content.includes('DefaultErrorView'))
  check('SectionErrorBoundary', content.includes('SectionErrorBoundary'))
  check('withErrorBoundary HOC', content.includes('export function withErrorBoundary'))
}

// 5. Check Backend Error Classes
console.log('\n📦 Backend Error Classes')
console.log('─────────────────────────────────────────────────────────────')
const backendErrorsFile = path.join(__dirname, 'lib/errors.js')
check('lib/errors.js exists', fs.existsSync(backendErrorsFile))
if (fs.existsSync(backendErrorsFile)) {
  const content = fs.readFileSync(backendErrorsFile, 'utf-8')
  check('LeadFlowError class', content.includes('class LeadFlowError'))
  check('errorHandler middleware', content.includes('function errorHandler'))
  check('asyncHandler wrapper', content.includes('function asyncHandler'))
  check('validateRequest middleware', content.includes('function validateRequest'))
}

// 6. Check Backend Logger
console.log('\n📦 Backend Logger')
console.log('─────────────────────────────────────────────────────────────')
const backendLoggerFile = path.join(__dirname, 'lib/logger.js')
check('lib/logger.js exists', fs.existsSync(backendLoggerFile))
if (fs.existsSync(backendLoggerFile)) {
  const content = fs.readFileSync(backendLoggerFile, 'utf-8')
  check('logger object', content.includes('const logger'))
  check('requestLogger middleware', content.includes('function requestLogger'))
  check('JSON log formatting', content.includes('JSON.stringify'))
}

// 7. Check Documentation
console.log('\n📦 Documentation')
console.log('─────────────────────────────────────────────────────────────')
const docsFile = path.join(__dirname, 'docs/ERROR_HANDLING.md')
check('ERROR_HANDLING.md exists', fs.existsSync(docsFile))
if (fs.existsSync(docsFile)) {
  const content = fs.readFileSync(docsFile, 'utf-8')
  check('Error Classes section', content.includes('## Error Classes'))
  check('Logging section', content.includes('## Logging'))
  check('Error Boundaries section', content.includes('## Error Boundaries'))
  check('API Error Handling section', content.includes('## API Error Handling'))
  check('Best Practices section', content.includes('## Best Practices'))
  check('Usage Examples section', content.includes('## Usage Examples'))
}

// 8. Check Main.tsx Integration
console.log('\n📦 Integration')
console.log('─────────────────────────────────────────────────────────────')
const mainFile = path.join(__dirname, 'frontend/src/main.tsx')
check('main.tsx exists', fs.existsSync(mainFile))
if (fs.existsSync(mainFile)) {
  const content = fs.readFileSync(mainFile, 'utf-8')
  check('ErrorBoundary imported', content.includes('import { ErrorBoundary }'))
  check('logger imported', content.includes('import { logger }'))
  check('ErrorBoundary wrapping App', content.includes('<ErrorBoundary context="AppRoot">'))
  check('Global error handlers', content.includes("window.addEventListener('error'"))
  check('Unhandled rejection handler', content.includes("window.addEventListener('unhandledrejection'"))
}

// 9. Check Tests
console.log('\n📦 Tests')
console.log('─────────────────────────────────────────────────────────────')
const testFile = path.join(__dirname, 'frontend/__tests__/error-handling.test.tsx')
check('error-handling.test.tsx exists', fs.existsSync(testFile))
if (fs.existsSync(testFile)) {
  const content = fs.readFileSync(testFile, 'utf-8')
  check('Error Classes tests', content.includes("describe('Error Classes'"))
  check('Logger tests', content.includes("describe('Logger'"))
  check('API Error Formatting tests', content.includes("describe('API Error Formatting'"))
  check('withLogging tests', content.includes("describe('withLogging'"))
}

// 10. Check Build
console.log('\n📦 Build Status')
console.log('─────────────────────────────────────────────────────────────')
const distDir = path.join(__dirname, 'frontend/dist')
check('dist directory exists', fs.existsSync(distDir))
if (fs.existsSync(distDir)) {
  const files = fs.readdirSync(distDir)
  check('index.html exists', files.includes('index.html'))
  check('assets directory exists', fs.existsSync(path.join(distDir, 'assets')))
}

// Summary
console.log('\n═══════════════════════════════════════════════════════════════')
console.log('SUMMARY')
console.log('═══════════════════════════════════════════════════════════════')
console.log(`Total Checks: ${CHECKS.passed + CHECKS.failed}`)
console.log(`✅ Passed: ${CHECKS.passed}`)
console.log(`❌ Failed: ${CHECKS.failed}`)
console.log(`Success Rate: ${Math.round((CHECKS.passed / (CHECKS.passed + CHECKS.failed)) * 100)}%`)
console.log('═══════════════════════════════════════════════════════════════\n')

// Save results
const results = {
  timestamp: new Date().toISOString(),
  summary: {
    total: CHECKS.passed + CHECKS.failed,
    passed: CHECKS.passed,
    failed: CHECKS.failed,
    successRate: Math.round((CHECKS.passed / (CHECKS.passed + CHECKS.failed)) * 100),
  },
  tests: CHECKS.tests,
  allPassed: CHECKS.failed === 0,
}

fs.writeFileSync('error-handling-verification.json', JSON.stringify(results, null, 2))
console.log('📁 Results saved to: error-handling-verification.json\n')

// Exit code
process.exit(CHECKS.failed === 0 ? 0 : 1)
