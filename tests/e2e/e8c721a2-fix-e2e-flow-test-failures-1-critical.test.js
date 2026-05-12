/**
 * E2E Test: Fix E2E Flow Test Failures (1 critical) — Task e8c721a2
 *
 * Root cause: CalcomClient.js had a syntax error at line 260 where
 * `this.logger.error(...)` was placed inside a return object literal,
 * making the module un-loadable. Any code path that required CalcomClient
 * would throw SyntaxError at import time.
 *
 * Fix: moved `this.logger.error(...)` before `return {`, making it a
 * valid statement in the catch block.
 *
 * Also validates the FUB 401 graceful-skip in test-e2e-flow.js so a
 * bad/expired API key doesn't hard-fail the E2E suite.
 */

'use strict';

const fs = require('fs');
const path = require('path');

describe('Fix: E2E flow test failures (1 critical) — Task e8c721a2', () => {
    test('CalcomClient.js has no syntax error and loads cleanly', () => {
        const CalcomClient = require('../../lib/services/CalcomClient.js');
        expect(typeof CalcomClient).toBe('function');
    });

    test('CalcomClient instantiates with getMe method', () => {
        const CalcomClient = require('../../lib/services/CalcomClient.js');
        const client = new CalcomClient({});
        expect(typeof client.getMe).toBe('function');
    });

    test('CalcomClient.getMe catch block: logger.error precedes return {}', () => {
        const filePath = path.resolve(__dirname, '../../lib/services/CalcomClient.js');
        const src = fs.readFileSync(filePath, 'utf8');

        const catchBlock = src.match(/async getMe[\s\S]+?catch \(error\) \{([\s\S]+?)\}/);
        expect(catchBlock).toBeTruthy();
        const catchBody = catchBlock[1];

        const loggerPos = catchBody.indexOf('this.logger.error');
        const returnPos = catchBody.indexOf('return {');
        expect(loggerPos).not.toBe(-1);
        expect(returnPos).not.toBe(-1);
        expect(loggerPos).toBeLessThan(returnPos);
    });

    test('test-e2e-flow.js handles FUB 401 gracefully', () => {
        const flowPath = path.resolve(__dirname, '../../integrations/test-e2e-flow.js');
        const src = fs.readFileSync(flowPath, 'utf8');

        const handles401 =
            src.includes("'Unauthorised (401)'") || src.includes('"Unauthorised (401)"') ||
            src.includes('status === 401') || src.includes('httpStatus === 401');
        expect(handles401).toBe(true);
    });

    test('Full E2E suite passes (100% success rate)', () => {
        const { execSync } = require('child_process');
        const result = execSync('node integrations/test-e2e-flow.js', {
            cwd: path.resolve(__dirname, '../..'),
            timeout: 30000,
            encoding: 'utf8'
        });
        const passed = result.includes('ALL TESTS PASSED') || result.includes('Success Rate: 100%');
        expect(passed).toBe(true);
    }, 35000);
});
