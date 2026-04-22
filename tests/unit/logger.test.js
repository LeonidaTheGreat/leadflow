/**
 * Unit tests for lib/logger.js
 *
 * SPEC:
 *   What:      Test all exported symbols (logger, requestLogger) in lib/logger.js
 *              Files changed: tests/unit/logger.test.js (new, no prod files touched)
 *   Verify:    node tests/unit/logger.test.js exits 0
 *   Boundaries: Do NOT modify lib/logger.js or lib/request-context.js
 */

'use strict'

const assert = require('assert')
const EventEmitter = require('events')
const path = require('path')

const { logger, requestLogger } = require(path.join(__dirname, '../../lib/logger'))

// ─── Test harness ────────────────────────────────────────────────────────────

const results = { passed: 0, failed: 0 }

function test(name, fn) {
  try {
    fn()
    results.passed++
    console.log(`✅ PASS: ${name}`)
  } catch (err) {
    results.failed++
    console.log(`❌ FAIL: ${name}`)
    console.log(`   ${err.message}`)
  }
}

async function testAsync(name, fn) {
  try {
    await fn()
    results.passed++
    console.log(`✅ PASS: ${name}`)
  } catch (err) {
    results.failed++
    console.log(`❌ FAIL: ${name}`)
    console.log(`   ${err.message}`)
  }
}

// Capture all calls to console[method] during fn(), return array of parsed entries
function captureEntries(method, fn) {
  const entries = []
  const original = console[method]
  console[method] = (msg) => { try { entries.push(JSON.parse(msg)) } catch { entries.push(msg) } }
  try { fn() } finally { console[method] = original }
  return entries
}

async function captureEntriesAsync(method, fn) {
  const entries = []
  const original = console[method]
  console[method] = (msg) => { try { entries.push(JSON.parse(msg)) } catch { entries.push(msg) } }
  try { await fn() } finally { console[method] = original }
  return entries
}

// Suppress console output during fn (no assertions on output)
function silent(fn) {
  const origInfo = console.info
  const origWarn = console.warn
  const origError = console.error
  const origDebug = console.debug
  console.info = console.warn = console.error = console.debug = () => {}
  try { fn() } finally {
    console.info = origInfo
    console.warn = origWarn
    console.error = origError
    console.debug = origDebug
  }
}

// ─── Module exports ───────────────────────────────────────────────────────────

test('exports logger object and requestLogger function', () => {
  assert.strictEqual(typeof logger, 'object')
  assert.strictEqual(typeof requestLogger, 'function')
})

test('logger has all log methods', () => {
  for (const m of ['debug', 'info', 'warn', 'error', 'fatal', 'child', 'withLogging']) {
    assert.strictEqual(typeof logger[m], 'function', `logger.${m} should be a function`)
  }
})

// ─── logger.info ─────────────────────────────────────────────────────────────

test('logger.info writes JSON to console.info with correct fields', () => {
  const [entry] = captureEntries('info', () => {
    logger.info('hello', 'TestCtx', { key: 'value' })
  })
  assert.ok(entry, 'Should produce output')
  assert.strictEqual(entry.level, 'info')
  assert.strictEqual(entry.message, 'hello')
  assert.strictEqual(entry.context, 'TestCtx')
  assert.deepStrictEqual(entry.metadata, { key: 'value' })
  assert.strictEqual(entry.service, 'leadflow-api')
  assert.ok(entry.timestamp, 'Should have ISO timestamp')
})

test('logger.info handles missing metadata without throwing', () => {
  assert.doesNotThrow(() => {
    silent(() => logger.info('no-meta', 'ctx'))
  })
})

test('logger.info handles null metadata without throwing', () => {
  assert.doesNotThrow(() => {
    silent(() => logger.info('null-meta', 'ctx', null))
  })
})

// ─── logger.debug (suppressed at default info level) ─────────────────────────

test('logger.debug produces no output at default LOG_LEVEL=info', () => {
  let called = false
  const orig = console.debug
  console.debug = () => { called = true }
  try { logger.debug('debug msg', 'ctx', {}) } finally { console.debug = orig }
  assert.strictEqual(called, false, 'debug should be suppressed at info level')
})

// ─── logger.warn ─────────────────────────────────────────────────────────────

test('logger.warn writes JSON to console.warn', () => {
  const [entry] = captureEntries('warn', () => {
    logger.warn('warning', 'WarnCtx', { detail: 'x' })
  })
  assert.strictEqual(entry.level, 'warn')
  assert.strictEqual(entry.message, 'warning')
  assert.strictEqual(entry.context, 'WarnCtx')
})

test('logger.warn attaches error object when provided', () => {
  const err = new Error('something bad')
  const [entry] = captureEntries('warn', () => {
    logger.warn('warn with err', 'ctx', {}, err)
  })
  assert.ok(entry.error, 'Should include error field')
  assert.strictEqual(entry.error.message, 'something bad')
  assert.strictEqual(entry.error.name, 'Error')
})

test('logger.warn without error has no error field', () => {
  const [entry] = captureEntries('warn', () => {
    logger.warn('plain warn', 'ctx', {})
  })
  assert.strictEqual(entry.error, undefined)
})

// ─── logger.error ─────────────────────────────────────────────────────────────

test('logger.error writes JSON to console.error', () => {
  const [entry] = captureEntries('error', () => {
    logger.error('something failed', null, 'ErrCtx', { code: 42 })
  })
  assert.strictEqual(entry.level, 'error')
  assert.strictEqual(entry.message, 'something failed')
  assert.strictEqual(entry.context, 'ErrCtx')
  assert.deepStrictEqual(entry.metadata, { code: 42 })
})

test('logger.error attaches error details including code', () => {
  const err = new Error('db connection failed')
  err.code = 'ECONNREFUSED'
  const [entry] = captureEntries('error', () => {
    logger.error('database error', err, 'DB', {})
  })
  assert.ok(entry.error, 'Should have error field')
  assert.strictEqual(entry.error.message, 'db connection failed')
  assert.strictEqual(entry.error.code, 'ECONNREFUSED')
  assert.strictEqual(entry.error.name, 'Error')
})

// ─── logger.fatal ─────────────────────────────────────────────────────────────

test('logger.fatal always logs (no level check) and uses console.error', () => {
  // outputLog maps 'fatal' → console.error
  const [entry] = captureEntries('error', () => {
    logger.fatal('catastrophe', null, 'FatalCtx', { impact: 'high' })
  })
  assert.ok(entry, 'Should produce output')
  assert.strictEqual(entry.level, 'fatal')
  assert.strictEqual(entry.message, 'catastrophe')
  assert.strictEqual(entry.context, 'FatalCtx')
})

test('logger.fatal attaches error when provided', () => {
  const err = new Error('disk full')
  const [entry] = captureEntries('error', () => {
    logger.fatal('storage failure', err, 'Storage', {})
  })
  assert.ok(entry.error, 'Should include error field')
  assert.strictEqual(entry.error.message, 'disk full')
})

// ─── Sensitive field redaction ────────────────────────────────────────────────

const SENSITIVE_FIELDS = ['password', 'token', 'apiKey', 'secret', 'authorization', 'cookie', 'credit_card']

for (const field of SENSITIVE_FIELDS) {
  test(`redacts sensitive field: ${field}`, () => {
    const metadata = { [field]: 'should-be-hidden', safe: 'visible' }
    const [entry] = captureEntries('info', () => {
      logger.info('redact test', 'ctx', metadata)
    })
    assert.strictEqual(entry.metadata[field], '[REDACTED]', `${field} should be redacted`)
    assert.strictEqual(entry.metadata.safe, 'visible', 'Non-sensitive field should pass through')
  })
}

test('redacts sensitive fields in nested objects', () => {
  const [entry] = captureEntries('info', () => {
    logger.info('nested redact', 'ctx', { nested: { secret: 'hidden', visible: 'ok' } })
  })
  assert.strictEqual(entry.metadata.nested.secret, '[REDACTED]')
  assert.strictEqual(entry.metadata.nested.visible, 'ok')
})

test('non-sensitive fields pass through unmodified', () => {
  const [entry] = captureEntries('info', () => {
    logger.info('safe', 'ctx', { userId: 'u123', action: 'login', count: 5 })
  })
  assert.strictEqual(entry.metadata.userId, 'u123')
  assert.strictEqual(entry.metadata.action, 'login')
  assert.strictEqual(entry.metadata.count, 5)
})

test('null metadata returns null (no crash)', () => {
  assert.doesNotThrow(() => silent(() => logger.info('test', 'ctx', null)))
})

// ─── logger.child ─────────────────────────────────────────────────────────────

test('logger.child returns object with all log methods', () => {
  const child = logger.child('ChildCtx')
  for (const m of ['debug', 'info', 'warn', 'error', 'fatal']) {
    assert.strictEqual(typeof child[m], 'function', `child.${m} should be a function`)
  }
})

test('logger.child.info passes predefined context through', () => {
  const child = logger.child('MyService')
  const [entry] = captureEntries('info', () => {
    child.info('child log', { extra: 1 })
  })
  assert.strictEqual(entry.context, 'MyService')
  assert.deepStrictEqual(entry.metadata, { extra: 1 })
})

test('logger.child.warn passes predefined context through', () => {
  const child = logger.child('WarnSvc')
  const [entry] = captureEntries('warn', () => {
    child.warn('child warning', { x: 2 })
  })
  assert.strictEqual(entry.context, 'WarnSvc')
})

test('logger.child.error passes predefined context through', () => {
  const err = new Error('child error')
  const child = logger.child('ChildSvc')
  const [entry] = captureEntries('error', () => {
    child.error('child error msg', err, { meta: true })
  })
  assert.strictEqual(entry.context, 'ChildSvc')
  assert.strictEqual(entry.error.message, 'child error')
})

test('logger.child.fatal passes predefined context through', () => {
  const child = logger.child('FatalSvc')
  const [entry] = captureEntries('error', () => {
    child.fatal('fatal in child', null, {})
  })
  assert.strictEqual(entry.context, 'FatalSvc')
  assert.strictEqual(entry.level, 'fatal')
})

// ─── logger.withLogging ───────────────────────────────────────────────────────

async function runWithLoggingTests() {
  await testAsync('logger.withLogging returns the operation result', async () => {
    let result
    const origInfo = console.info
    console.info = () => {}
    try {
      result = await logger.withLogging(() => Promise.resolve(42), 'MyOp', 'ctx')
    } finally {
      console.info = origInfo
    }
    assert.strictEqual(result, 42)
  })

  await testAsync('logger.withLogging logs Starting and Completed messages', async () => {
    const infoEntries = await captureEntriesAsync('info', async () => {
      await logger.withLogging(() => Promise.resolve('ok'), 'TestOp', 'OpCtx')
    })
    const start = infoEntries.find(e => e.message && e.message.includes('Starting: TestOp'))
    const done = infoEntries.find(e => e.message && e.message.includes('Completed: TestOp'))
    assert.ok(start, 'Should log Starting message')
    assert.ok(done, 'Should log Completed message')
  })

  await testAsync('logger.withLogging Completed log includes durationMs', async () => {
    const infoEntries = await captureEntriesAsync('info', async () => {
      await logger.withLogging(() => Promise.resolve(), 'TimedOp', 'ctx')
    })
    const done = infoEntries.find(e => e.message && e.message.includes('Completed: TimedOp'))
    assert.ok(done, 'Should have Completed entry')
    assert.ok('durationMs' in (done.metadata || {}), 'Should include durationMs in metadata')
  })

  await testAsync('logger.withLogging rethrows operation error', async () => {
    const boom = new Error('op failed')
    let threw = null
    const origError = console.error
    console.error = () => {}
    const origInfo = console.info
    console.info = () => {}
    try {
      await logger.withLogging(() => { throw boom }, 'FailOp', 'ctx')
    } catch (err) {
      threw = err
    } finally {
      console.error = origError
      console.info = origInfo
    }
    assert.strictEqual(threw, boom, 'Should rethrow the original error')
  })

  await testAsync('logger.withLogging logs failure with error details', async () => {
    const boom = new Error('op failed')
    const errorEntries = []
    const origError = console.error
    const origInfo = console.info
    console.error = (msg) => { try { errorEntries.push(JSON.parse(msg)) } catch {} }
    console.info = () => {}
    try {
      await logger.withLogging(() => { throw boom }, 'FailOp', 'ctx')
    } catch { /* expected */ } finally {
      console.error = origError
      console.info = origInfo
    }
    const failEntry = errorEntries.find(e => e.message && e.message.includes('Failed: FailOp'))
    assert.ok(failEntry, 'Should log Failed message')
    assert.ok(failEntry.error, 'Should include error details')
    assert.strictEqual(failEntry.error.message, 'op failed')
  })

  await testAsync('logger.withLogging works without explicit context', async () => {
    let result
    const origInfo = console.info
    console.info = () => {}
    try {
      result = await logger.withLogging(() => Promise.resolve('noctx'), 'NoCtxOp')
    } finally {
      console.info = origInfo
    }
    assert.strictEqual(result, 'noctx')
  })
}

// ─── requestLogger middleware ─────────────────────────────────────────────────

function makeReqRes(headers = {}) {
  const req = {
    headers,
    method: 'GET',
    url: '/test',
    ip: '127.0.0.1',
    connection: { remoteAddress: '127.0.0.1' },
  }
  const res = Object.assign(new EventEmitter(), {
    setHeader: () => {},
    statusCode: 200,
  })
  return { req, res }
}

test('requestLogger attaches requestId to req', () => {
  const { req, res } = makeReqRes()
  silent(() => requestLogger(req, res, () => {}))
  assert.ok(req.requestId, 'Should set req.requestId')
  assert.ok(typeof req.requestId === 'string', 'requestId should be a string')
})

test('requestLogger calls next()', () => {
  const { req, res } = makeReqRes()
  let nextCalled = false
  silent(() => requestLogger(req, res, () => { nextCalled = true }))
  assert.strictEqual(nextCalled, true, 'Should call next()')
})

test('requestLogger sets X-Request-ID response header', () => {
  const { req, res } = makeReqRes()
  let headerValue = null
  res.setHeader = (name, val) => { if (name === 'X-Request-ID') headerValue = val }
  silent(() => requestLogger(req, res, () => {}))
  assert.ok(headerValue, 'Should set X-Request-ID header')
})

test('requestLogger uses x-request-id header from request when present', () => {
  const { req, res } = makeReqRes({ 'x-request-id': 'fixed-id-123' })
  res.setHeader = () => {}
  silent(() => requestLogger(req, res, () => {}))
  assert.strictEqual(req.requestId, 'fixed-id-123')
})

test('requestLogger generates requestId when x-request-id header is absent', () => {
  const { req, res } = makeReqRes()
  silent(() => requestLogger(req, res, () => {}))
  assert.ok(req.requestId.startsWith('req-'), 'Generated requestId should start with req-')
})

test('requestLogger logs request start to console.info', () => {
  const { req, res } = makeReqRes()
  const infoEntries = captureEntries('info', () => {
    requestLogger(req, res, () => {})
  })
  const startEntry = infoEntries.find(e => e.message === 'Request started')
  assert.ok(startEntry, 'Should log Request started')
  assert.strictEqual(startEntry.metadata.method, 'GET')
  assert.strictEqual(startEntry.metadata.url, '/test')
})

test('requestLogger logs request completion on res finish (2xx → info)', () => {
  const { req, res } = makeReqRes()
  res.statusCode = 200
  const infoEntries = []
  const origInfo = console.info
  console.info = (msg) => { try { infoEntries.push(JSON.parse(msg)) } catch {} }
  try {
    requestLogger(req, res, () => {})
    res.emit('finish')
  } finally {
    console.info = origInfo
  }
  const finishEntry = infoEntries.find(e => e.message === 'Request completed')
  assert.ok(finishEntry, 'Should log Request completed')
  assert.strictEqual(finishEntry.metadata.statusCode, 200)
  assert.ok('durationMs' in finishEntry.metadata, 'Should include durationMs')
})

test('requestLogger logs 4xx responses as warn', () => {
  const { req, res } = makeReqRes()
  res.statusCode = 404
  const warnEntries = []
  const origWarn = console.warn
  const origInfo = console.info
  console.warn = (msg) => { try { warnEntries.push(JSON.parse(msg)) } catch {} }
  console.info = () => {}
  try {
    requestLogger(req, res, () => {})
    res.emit('finish')
  } finally {
    console.warn = origWarn
    console.info = origInfo
  }
  const warnEntry = warnEntries.find(e => e.message === 'Request completed')
  assert.ok(warnEntry, '4xx should produce a warn log for Request completed')
  assert.strictEqual(warnEntry.metadata.statusCode, 404)
})

test('requestLogger logs 5xx responses as warn', () => {
  const { req, res } = makeReqRes()
  res.statusCode = 500
  const warnEntries = []
  const origWarn = console.warn
  const origInfo = console.info
  console.warn = (msg) => { try { warnEntries.push(JSON.parse(msg)) } catch {} }
  console.info = () => {}
  try {
    requestLogger(req, res, () => {})
    res.emit('finish')
  } finally {
    console.warn = origWarn
    console.info = origInfo
  }
  const warnEntry = warnEntries.find(e => e.message === 'Request completed')
  assert.ok(warnEntry, '5xx should produce a warn log for Request completed')
  assert.strictEqual(warnEntry.metadata.statusCode, 500)
})

// ─── Run async tests then print summary ──────────────────────────────────────

async function main() {
  console.log('\n🧪 lib/logger.js Unit Tests\n')

  await runWithLoggingTests()

  console.log('\n' + '='.repeat(60))
  console.log('📊 TEST SUMMARY')
  console.log('='.repeat(60))
  console.log(`✅ Passed: ${results.passed}`)
  console.log(`❌ Failed: ${results.failed}`)
  const total = results.passed + results.failed
  console.log(`📈 Pass rate: ${total > 0 ? Math.round((results.passed / total) * 100) : 0}%`)
  console.log('='.repeat(60))

  process.exit(results.failed > 0 ? 1 : 0)
}

main().catch((err) => {
  console.error('Unexpected error:', err)
  process.exit(1)
})
