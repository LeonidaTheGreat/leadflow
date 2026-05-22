'use strict'

/**
 * Spec:
 *   What:   ~/.openclaw/genome/core/structured-logger.js
 *           createLogger(moduleName) → { info, warn, error, debug }
 *           emit() → console.log/console.error + fs.appendFileSync with rotation
 *   Verify: npx jest tests/genome/structured-logger.test.js --no-coverage → all pass
 *   Boundaries: structured-logger.js is read-only. Only this test file is created.
 */

const fs = require('fs')

const STRUCTURED_LOGGER_PATH = require('path').join(require('os').homedir(), '.openclaw', 'genome', 'core', 'structured-logger')
const PROJECT_CONFIG_LOADER_PATH = require('path').join(require('os').homedir(), '.openclaw', 'genome', 'core', 'project-config-loader')
const FAKE_LOG_PATH = '/tmp/genome-test-structured.log'

// LOG_PATH is resolved at module load time, so project-config-loader must be
// mocked before each require() of structured-logger.
function loadStructuredLogger() {
  jest.resetModules()
  jest.doMock(PROJECT_CONFIG_LOADER_PATH, () => ({
    resolveStatePath: () => FAKE_LOG_PATH,
    getConfig: () => ({ project_id: 'leadflow' }),
  }))
  return require(STRUCTURED_LOGGER_PATH)
}

describe('structured-logger', () => {
  let consoleSpy
  let fsAppendSpy
  let fsStatSpy
  let fsRenameSpy

  beforeEach(() => {
    consoleSpy = {
      log: jest.spyOn(console, 'log').mockImplementation(() => {}),
      error: jest.spyOn(console, 'error').mockImplementation(() => {}),
    }
    fsAppendSpy = jest.spyOn(fs, 'appendFileSync').mockImplementation(() => {})
    fsStatSpy = jest.spyOn(fs, 'statSync').mockReturnValue({ size: 0 })
    fsRenameSpy = jest.spyOn(fs, 'renameSync').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
    delete process.env.GENOME_DEBUG
  })

  // ── createLogger ─────────────────────────────────────────────────────────────

  describe('createLogger', () => {
    test('returns an object with info, warn, error, debug methods', () => {
      const { createLogger } = loadStructuredLogger()
      const log = createLogger('test-module')
      expect(typeof log.info).toBe('function')
      expect(typeof log.warn).toBe('function')
      expect(typeof log.error).toBe('function')
      expect(typeof log.debug).toBe('function')
    })

    test('accepts any module name string', () => {
      const { createLogger } = loadStructuredLogger()
      expect(() => createLogger('spawn-consumer')).not.toThrow()
      expect(() => createLogger('')).not.toThrow()
    })
  })

  // ── console routing ───────────────────────────────────────────────────────────

  describe('console routing', () => {
    test('info routes to console.log, not console.error', () => {
      const { createLogger } = loadStructuredLogger()
      createLogger('mod').info('hello')
      expect(consoleSpy.log).toHaveBeenCalledTimes(1)
      expect(consoleSpy.error).not.toHaveBeenCalled()
    })

    test('warn routes to console.log, not console.error', () => {
      const { createLogger } = loadStructuredLogger()
      createLogger('mod').warn('watch out')
      expect(consoleSpy.log).toHaveBeenCalledTimes(1)
      expect(consoleSpy.error).not.toHaveBeenCalled()
    })

    test('error routes to console.error, not console.log', () => {
      const { createLogger } = loadStructuredLogger()
      createLogger('mod').error('something broke')
      expect(consoleSpy.error).toHaveBeenCalledTimes(1)
      expect(consoleSpy.log).not.toHaveBeenCalled()
    })

    test('debug is silenced when GENOME_DEBUG is unset', () => {
      delete process.env.GENOME_DEBUG
      const { createLogger } = loadStructuredLogger()
      createLogger('mod').debug('verbose')
      expect(consoleSpy.log).not.toHaveBeenCalled()
      expect(consoleSpy.error).not.toHaveBeenCalled()
    })

    test('debug routes to console.log when GENOME_DEBUG=true', () => {
      process.env.GENOME_DEBUG = 'true'
      const { createLogger } = loadStructuredLogger()
      createLogger('mod').debug('verbose')
      expect(consoleSpy.log).toHaveBeenCalledTimes(1)
    })

    test('debug stays silent when GENOME_DEBUG=false', () => {
      process.env.GENOME_DEBUG = 'false'
      const { createLogger } = loadStructuredLogger()
      createLogger('mod').debug('suppressed')
      expect(consoleSpy.log).not.toHaveBeenCalled()
    })
  })

  // ── JSON output structure ─────────────────────────────────────────────────────

  describe('JSON output structure', () => {
    function getEntry(spy) {
      expect(spy).toHaveBeenCalled()
      return JSON.parse(spy.mock.calls[0][0])
    }

    test('output written to console is valid JSON', () => {
      const { createLogger } = loadStructuredLogger()
      createLogger('test').info('msg')
      expect(() => JSON.parse(consoleSpy.log.mock.calls[0][0])).not.toThrow()
    })

    test('entry has ts, level, module, msg fields', () => {
      const { createLogger } = loadStructuredLogger()
      createLogger('my-module').info('test message')
      const entry = getEntry(consoleSpy.log)
      expect(entry.ts).toBeDefined()
      expect(entry.level).toBe('info')
      expect(entry.module).toBe('my-module')
      expect(entry.msg).toBe('test message')
    })

    test('ts is a valid ISO date string', () => {
      const { createLogger } = loadStructuredLogger()
      createLogger('mod').info('ts test')
      const { ts } = getEntry(consoleSpy.log)
      expect(new Date(ts).getTime()).not.toBeNaN()
      expect(ts).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    })

    test('warn entry has level=warn', () => {
      const { createLogger } = loadStructuredLogger()
      createLogger('mod').warn('warning')
      expect(getEntry(consoleSpy.log).level).toBe('warn')
    })

    test('error entry has level=error', () => {
      const { createLogger } = loadStructuredLogger()
      createLogger('mod').error('error')
      expect(getEntry(consoleSpy.error).level).toBe('error')
    })

    test('debug entry has level=debug when GENOME_DEBUG=true', () => {
      process.env.GENOME_DEBUG = 'true'
      const { createLogger } = loadStructuredLogger()
      createLogger('mod').debug('debug msg')
      expect(getEntry(consoleSpy.log).level).toBe('debug')
    })

    test('module name is embedded in every entry', () => {
      const { createLogger } = loadStructuredLogger()
      const log = createLogger('spawn-consumer')
      log.info('a')
      log.warn('b')
      const entries = consoleSpy.log.mock.calls.map((c) => JSON.parse(c[0]))
      entries.forEach((e) => expect(e.module).toBe('spawn-consumer'))
    })

    test('metadata properties are spread into the entry', () => {
      const { createLogger } = loadStructuredLogger()
      createLogger('mod').info('with meta', { taskId: 'abc', model: 'codex' })
      const entry = getEntry(consoleSpy.log)
      expect(entry.taskId).toBe('abc')
      expect(entry.model).toBe('codex')
    })

    test('each call produces exactly one log line', () => {
      const { createLogger } = loadStructuredLogger()
      const log = createLogger('mod')
      log.info('a')
      log.info('b')
      log.info('c')
      expect(consoleSpy.log).toHaveBeenCalledTimes(3)
    })

    test('two loggers with different module names produce distinct entries', () => {
      const { createLogger } = loadStructuredLogger()
      createLogger('mod-a').info('from a')
      createLogger('mod-b').info('from b')
      const entries = consoleSpy.log.mock.calls.map((c) => JSON.parse(c[0]))
      expect(entries[0].module).toBe('mod-a')
      expect(entries[1].module).toBe('mod-b')
    })
  })

  // ── file output ───────────────────────────────────────────────────────────────

  describe('file output', () => {
    test('appendFileSync is called for each log entry', () => {
      const { createLogger } = loadStructuredLogger()
      createLogger('mod').info('written to file')
      expect(fsAppendSpy).toHaveBeenCalledTimes(1)
    })

    test('appendFileSync writes to the configured log path', () => {
      const { createLogger } = loadStructuredLogger()
      createLogger('mod').info('file path check')
      expect(fsAppendSpy).toHaveBeenCalledWith(FAKE_LOG_PATH, expect.any(String))
    })

    test('each appended line ends with a newline', () => {
      const { createLogger } = loadStructuredLogger()
      createLogger('mod').info('newline check')
      const written = fsAppendSpy.mock.calls[0][1]
      expect(written).toMatch(/\n$/)
    })

    test('appended content is valid JSON (before the newline)', () => {
      const { createLogger } = loadStructuredLogger()
      createLogger('mod').info('json file check')
      const written = fsAppendSpy.mock.calls[0][1].trimEnd()
      expect(() => JSON.parse(written)).not.toThrow()
    })

    test('file write failure does not throw (non-fatal best-effort)', () => {
      const { createLogger } = loadStructuredLogger()
      fsAppendSpy.mockImplementation(() => { throw new Error('ENOSPC') })
      expect(() => createLogger('mod').info('file fail')).not.toThrow()
    })

    test('stat failure does not throw (first run, no log file yet)', () => {
      const { createLogger } = loadStructuredLogger()
      fsStatSpy.mockImplementation(() => { throw new Error('ENOENT') })
      expect(() => createLogger('mod').info('no file yet')).not.toThrow()
    })

    test('renames file to .prev when size exceeds 20 MB', () => {
      const { createLogger } = loadStructuredLogger()
      fsStatSpy.mockReturnValue({ size: 21 * 1024 * 1024 })
      createLogger('mod').info('triggers rotation')
      expect(fsRenameSpy).toHaveBeenCalledWith(FAKE_LOG_PATH, FAKE_LOG_PATH + '.prev')
    })

    test('does not rename file when size is under 20 MB', () => {
      const { createLogger } = loadStructuredLogger()
      fsStatSpy.mockReturnValue({ size: 1 * 1024 * 1024 })
      createLogger('mod').info('no rotation')
      expect(fsRenameSpy).not.toHaveBeenCalled()
    })

    test('rename failure does not throw (non-fatal best-effort)', () => {
      const { createLogger } = loadStructuredLogger()
      fsStatSpy.mockReturnValue({ size: 21 * 1024 * 1024 })
      fsRenameSpy.mockImplementation(() => { throw new Error('EPERM') })
      expect(() => createLogger('mod').info('rename fail')).not.toThrow()
    })
  })

  // ── module exports ────────────────────────────────────────────────────────────

  describe('module exports', () => {
    test('exports createLogger as a named export', () => {
      const mod = loadStructuredLogger()
      expect(typeof mod.createLogger).toBe('function')
    })
  })
})
