'use strict';

/**
 * Spec:
 *   What:    tests/genome/structured-logger.test.js — Jest tests for
 *            /Users/clawdbot/.openclaw/genome/core/structured-logger.js
 *            Covers: createLogger(), info(), warn(), error(), debug(),
 *            file append, log rotation, silent failure on I/O error.
 *   Verify:  npx jest tests/genome/structured-logger.test.js --no-coverage → all pass, exit 0
 *   Boundaries: structured-logger.js and project-config-loader.js are read-only.
 *               Only this test file is created.
 */

const STRUCTURED_LOGGER_PATH = '/Users/clawdbot/.openclaw/genome/core/structured-logger';
const CONFIG_LOADER_PATH = '/Users/clawdbot/.openclaw/genome/core/project-config-loader';
const FAKE_LOG_PATH = '/tmp/test-genome-structured.log';

describe('structured-logger — createLogger', () => {
  let fsMock;
  let consoleSpy;

  beforeEach(() => {
    jest.resetModules();

    fsMock = {
      statSync: jest.fn().mockReturnValue({ size: 0 }),
      renameSync: jest.fn(),
      appendFileSync: jest.fn(),
    };

    jest.doMock('fs', () => fsMock);
    jest.doMock(CONFIG_LOADER_PATH, () => ({
      resolveStatePath: () => FAKE_LOG_PATH,
    }));

    consoleSpy = {
      log: jest.spyOn(console, 'log').mockImplementation(() => {}),
      error: jest.spyOn(console, 'error').mockImplementation(() => {}),
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete process.env.GENOME_DEBUG;
  });

  function load() {
    return require(STRUCTURED_LOGGER_PATH);
  }

  function parseConsoleLog(idx = 0) {
    return JSON.parse(consoleSpy.log.mock.calls[idx][0]);
  }

  function parseConsoleError(idx = 0) {
    return JSON.parse(consoleSpy.error.mock.calls[idx][0]);
  }

  // ── createLogger shape ────────────────────────────────────────────────────────

  describe('createLogger shape', () => {
    test('exports createLogger function', () => {
      const mod = load();
      expect(typeof mod.createLogger).toBe('function');
    });

    test('returns object with info, warn, error, debug methods', () => {
      const { createLogger } = load();
      const log = createLogger('test-module');
      expect(typeof log.info).toBe('function');
      expect(typeof log.warn).toBe('function');
      expect(typeof log.error).toBe('function');
      expect(typeof log.debug).toBe('function');
    });

    test('returns exactly four methods (no extras)', () => {
      const { createLogger } = load();
      const log = createLogger('test-module');
      expect(Object.keys(log).sort()).toEqual(['debug', 'error', 'info', 'warn']);
    });
  });

  // ── log entry structure ───────────────────────────────────────────────────────

  describe('log entry structure', () => {
    test('info entry includes ts, level, module, msg', () => {
      const { createLogger } = load();
      createLogger('my-service').info('something happened');
      const entry = parseConsoleLog();
      expect(entry.ts).toBeDefined();
      expect(entry.level).toBe('info');
      expect(entry.module).toBe('my-service');
      expect(entry.msg).toBe('something happened');
    });

    test('ts is a valid ISO date string', () => {
      const { createLogger } = load();
      createLogger('ts-test').info('ts check');
      const { ts } = parseConsoleLog();
      expect(new Date(ts).getTime()).not.toBeNaN();
      expect(ts).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    test('output written to console is valid JSON', () => {
      const { createLogger } = load();
      createLogger('json-test').info('check json');
      expect(() => JSON.parse(consoleSpy.log.mock.calls[0][0])).not.toThrow();
    });

    test('module name from createLogger appears in every entry', () => {
      const { createLogger } = load();
      const log = createLogger('spawn-consumer');
      log.info('a');
      log.warn('b');
      expect(parseConsoleLog(0).module).toBe('spawn-consumer');
      expect(parseConsoleLog(1).module).toBe('spawn-consumer');
    });

    test('meta fields are spread at top level (not nested)', () => {
      const { createLogger } = load();
      createLogger('meta-test').info('spread check', { taskId: 'abc', model: 'sonnet' });
      const entry = parseConsoleLog();
      expect(entry.taskId).toBe('abc');
      expect(entry.model).toBe('sonnet');
      expect(entry.meta).toBeUndefined();
    });

    test('info with no meta argument produces valid entry', () => {
      const { createLogger } = load();
      expect(() => createLogger('no-meta').info('bare message')).not.toThrow();
      const entry = parseConsoleLog();
      expect(entry.msg).toBe('bare message');
    });
  });

  // ── log levels ────────────────────────────────────────────────────────────────

  describe('log levels', () => {
    test('info writes level=info to console.log', () => {
      const { createLogger } = load();
      createLogger('level-test').info('info msg');
      expect(consoleSpy.log).toHaveBeenCalledTimes(1);
      expect(consoleSpy.error).not.toHaveBeenCalled();
      expect(parseConsoleLog().level).toBe('info');
    });

    test('warn writes level=warn to console.log', () => {
      const { createLogger } = load();
      createLogger('level-test').warn('warn msg', { remaining: 2.5 });
      expect(consoleSpy.log).toHaveBeenCalledTimes(1);
      expect(consoleSpy.error).not.toHaveBeenCalled();
      expect(parseConsoleLog().level).toBe('warn');
    });

    test('error writes level=error to console.error (not console.log)', () => {
      const { createLogger } = load();
      createLogger('level-test').error('error msg', { error: 'boom' });
      expect(consoleSpy.error).toHaveBeenCalledTimes(1);
      expect(consoleSpy.log).not.toHaveBeenCalled();
      expect(parseConsoleError().level).toBe('error');
    });

    test('error entry has correct msg and meta', () => {
      const { createLogger } = load();
      createLogger('err-module').error('spawn failed', { error: 'timeout' });
      const entry = parseConsoleError();
      expect(entry.msg).toBe('spawn failed');
      expect(entry.error).toBe('timeout');
      expect(entry.module).toBe('err-module');
    });

    test('warn entry includes meta fields', () => {
      const { createLogger } = load();
      createLogger('budget').warn('Budget low', { remaining: 2.50 });
      const entry = parseConsoleLog();
      expect(entry.level).toBe('warn');
      expect(entry.remaining).toBe(2.50);
    });
  });

  // ── debug suppression ─────────────────────────────────────────────────────────

  describe('debug level', () => {
    test('debug is suppressed when GENOME_DEBUG is not set', () => {
      delete process.env.GENOME_DEBUG;
      const { createLogger } = load();
      createLogger('dbg-test').debug('silent debug');
      expect(consoleSpy.log).not.toHaveBeenCalled();
      expect(consoleSpy.error).not.toHaveBeenCalled();
    });

    test('debug is suppressed when GENOME_DEBUG=false', () => {
      process.env.GENOME_DEBUG = 'false';
      const { createLogger } = load();
      createLogger('dbg-test').debug('still silent');
      expect(consoleSpy.log).not.toHaveBeenCalled();
    });

    test('debug emits when GENOME_DEBUG=true', () => {
      process.env.GENOME_DEBUG = 'true';
      const { createLogger } = load();
      createLogger('dbg-module').debug('verbose detail', { x: 1 });
      expect(consoleSpy.log).toHaveBeenCalledTimes(1);
      const entry = parseConsoleLog();
      expect(entry.level).toBe('debug');
      expect(entry.msg).toBe('verbose detail');
      expect(entry.x).toBe(1);
    });

    test('debug entry includes module and ts when emitted', () => {
      process.env.GENOME_DEBUG = 'true';
      const { createLogger } = load();
      createLogger('debug-mod').debug('check fields');
      const entry = parseConsoleLog();
      expect(entry.module).toBe('debug-mod');
      expect(entry.ts).toBeDefined();
    });
  });

  // ── file append ───────────────────────────────────────────────────────────────

  describe('file append', () => {
    test('info appends JSON line to log file', () => {
      const { createLogger } = load();
      createLogger('file-test').info('written to file');
      expect(fsMock.appendFileSync).toHaveBeenCalledTimes(1);
      const [path, content] = fsMock.appendFileSync.mock.calls[0];
      expect(path).toBe(FAKE_LOG_PATH);
      const entry = JSON.parse(content.trim());
      expect(entry.msg).toBe('written to file');
    });

    test('appended line ends with newline', () => {
      const { createLogger } = load();
      createLogger('newline-test').info('newline check');
      const content = fsMock.appendFileSync.mock.calls[0][1];
      expect(content).toMatch(/\n$/);
    });

    test('error also appends to log file', () => {
      const { createLogger } = load();
      createLogger('file-err').error('file error append', { code: 42 });
      expect(fsMock.appendFileSync).toHaveBeenCalledTimes(1);
      const [, content] = fsMock.appendFileSync.mock.calls[0];
      const entry = JSON.parse(content.trim());
      expect(entry.level).toBe('error');
      expect(entry.code).toBe(42);
    });
  });

  // ── log rotation ──────────────────────────────────────────────────────────────

  describe('log rotation', () => {
    test('renames log file when size exceeds 20 MB', () => {
      fsMock.statSync.mockReturnValue({ size: 21 * 1024 * 1024 });
      const { createLogger } = load();
      createLogger('rotate-test').info('triggers rotation');
      expect(fsMock.renameSync).toHaveBeenCalledTimes(1);
      const [src, dst] = fsMock.renameSync.mock.calls[0];
      expect(src).toBe(FAKE_LOG_PATH);
      expect(dst).toBe(FAKE_LOG_PATH + '.prev');
    });

    test('does not rename when file is under 20 MB', () => {
      fsMock.statSync.mockReturnValue({ size: 10 * 1024 * 1024 });
      const { createLogger } = load();
      createLogger('no-rotate').info('small file');
      expect(fsMock.renameSync).not.toHaveBeenCalled();
    });

    test('still appends after rotation', () => {
      fsMock.statSync.mockReturnValue({ size: 25 * 1024 * 1024 });
      const { createLogger } = load();
      createLogger('rotate-append').info('after rotate');
      expect(fsMock.appendFileSync).toHaveBeenCalledTimes(1);
    });
  });

  // ── silent failure on I/O errors ──────────────────────────────────────────────

  describe('silent I/O failure', () => {
    test('does not throw when appendFileSync fails', () => {
      fsMock.appendFileSync.mockImplementation(() => { throw new Error('disk full'); });
      const { createLogger } = load();
      expect(() => createLogger('silent-fail').info('should not throw')).not.toThrow();
    });

    test('still logs to console even when file append fails', () => {
      fsMock.appendFileSync.mockImplementation(() => { throw new Error('disk full'); });
      const { createLogger } = load();
      createLogger('console-fallback').info('console still works');
      expect(consoleSpy.log).toHaveBeenCalledTimes(1);
      expect(parseConsoleLog().msg).toBe('console still works');
    });

    test('does not throw when statSync fails (first run, no file yet)', () => {
      fsMock.statSync.mockImplementation(() => { throw new Error('ENOENT'); });
      const { createLogger } = load();
      expect(() => createLogger('first-run').info('no stat file')).not.toThrow();
    });

    test('still appends after statSync failure', () => {
      fsMock.statSync.mockImplementation(() => { throw new Error('ENOENT'); });
      const { createLogger } = load();
      createLogger('stat-fail').info('append after stat fail');
      expect(fsMock.appendFileSync).toHaveBeenCalledTimes(1);
    });
  });

  // ── multiple loggers ──────────────────────────────────────────────────────────

  describe('multiple loggers', () => {
    test('two loggers with different module names produce distinct entries', () => {
      const { createLogger } = load();
      const logA = createLogger('module-a');
      const logB = createLogger('module-b');
      logA.info('from a');
      logB.info('from b');
      expect(parseConsoleLog(0).module).toBe('module-a');
      expect(parseConsoleLog(1).module).toBe('module-b');
    });

    test('each call produces exactly one console line', () => {
      const { createLogger } = load();
      const log = createLogger('count-test');
      log.info('one');
      log.info('two');
      log.warn('three');
      expect(consoleSpy.log).toHaveBeenCalledTimes(3);
    });
  });
});
