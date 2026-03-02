#!/usr/bin/env node
/**
 * smoke-tests.js — Lightweight production smoke tests
 *
 * Runs fast HTTP checks against known endpoints every heartbeat cycle.
 * When a check fails, the heartbeat spawns a QC agent to investigate.
 *
 * Usage:
 *   const { runAll } = require('./smoke-tests')
 *   const results = await runAll()
 *   // results: { passed: [...], failed: [...] }
 *
 * Standalone:
 *   node -e "require('./smoke-tests').runAll().then(r => console.log(JSON.stringify(r, null, 2)))"
 */

const fs = require('fs')
const path = require('path')
const { getConfig } = require('./project-config-loader')

const STATE_PATH = path.join(__dirname, '.smoke-test-state.json')

// ── Shared reject patterns ──────────────────────────────────────────────────
// If any of these appear in a response body, the test fails even on HTTP 200.
// This catches the whole class of "page loads but app is broken" issues:
// missing env vars, failed SSR, error boundaries, etc.
const COMMON_REJECT_PATTERNS = [
  'is required',              // missing config: "supabaseKey is required"
  'Missing or invalid',       // env var errors
  'APPLICATION_ERROR',        // Vercel/Next.js error page
  'Internal Server Error',    // generic server error in HTML
  'NEXT_REDIRECT',            // Next.js redirect error leaked to client
  'Cannot read properties of undefined',  // runtime crash in SSR
  'Module not found',         // build error
]

// ── Generic check functions (driven by check_type in config) ────────────────

const CHECK_FUNCTIONS = {
  json_status_ok(response, body) {
    if (response.status !== 200) {
      return { pass: false, detail: `HTTP ${response.status} (expected 200)` }
    }
    try {
      const json = JSON.parse(body)
      if (json.status === 'ok') {
        return { pass: true, detail: 'status: ok' }
      }
      // Health endpoint with errors array
      const errors = json.errors || []
      return { pass: false, detail: `status: ${json.status || 'missing'} (expected "ok")${errors.length ? ': ' + errors.join('; ') : ''}` }
    } catch {
      // Fallback: if response is HTML (e.g. dashboard page), check for basic markers
      if (body && (body.includes('<title>') || body.includes('__next'))) {
        return { pass: true, detail: 'HTML loaded (health endpoint not deployed yet)' }
      }
      return { pass: false, detail: 'Response is not valid JSON' }
    }
  },

  http_200(response) {
    if (response.status === 200) {
      return { pass: true, detail: 'HTTP 200' }
    }
    return { pass: false, detail: `HTTP ${response.status} (expected 200)` }
  },

  html_contains(response, body, testDef) {
    if (response.status !== 200) {
      return { pass: false, detail: `HTTP ${response.status} (expected 200)` }
    }
    const expect = testDef.expect || testDef.name
    if (body && body.includes('<title>') && body.includes(expect)) {
      return { pass: true, detail: `HTML loaded (contains "${expect}")` }
    }
    return { pass: false, detail: 'Response missing expected content' }
  },

  supabase_read(response, body) {
    if (response.status !== 200) {
      return { pass: false, detail: `HTTP ${response.status} (expected 200)` }
    }
    try {
      const data = JSON.parse(body)
      if (Array.isArray(data) && data.length > 0) {
        return { pass: true, detail: `Got ${data.length} row(s)` }
      }
      if (Array.isArray(data) && data.length === 0) {
        return { pass: false, detail: 'Query returned 0 rows (table may be empty or auth failed silently)' }
      }
      if (data.message || data.error) {
        return { pass: false, detail: `API error: ${data.message || data.error}` }
      }
      return { pass: false, detail: 'Unexpected response shape' }
    } catch {
      return { pass: false, detail: 'Response is not valid JSON' }
    }
  }
}

// ── Build test definitions from project config ──────────────────────────────

function buildTests() {
  const config = getConfig()
  return config.smoke_tests.map(testDef => ({
    id: testDef.id,
    name: testDef.name || testDef.id,
    url: testDef.check_type === 'supabase_read' ? null : testDef.url,
    dashboardFallbackUrl: testDef.fallback_url || null,
    severity: testDef.severity || 'warning',
    rejectPatterns: testDef.check_type !== 'supabase_read' ? COMMON_REJECT_PATTERNS : null,
    check(response, body) {
      const fn = CHECK_FUNCTIONS[testDef.check_type]
      if (!fn) return { pass: false, detail: `Unknown check_type: ${testDef.check_type}` }
      return fn(response, body, testDef)
    }
  }))
}

const tests = buildTests()

// ── State Management ────────────────────────────────────────────────────────

function loadState() {
  try {
    if (fs.existsSync(STATE_PATH)) {
      return JSON.parse(fs.readFileSync(STATE_PATH, 'utf-8'))
    }
  } catch {}
  return { lastRun: null, results: {} }
}

function saveState(state) {
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2))
}

// ── Runner ──────────────────────────────────────────────────────────────────

/**
 * Run all smoke tests. Each test gets a 5s timeout.
 * @returns {{ passed: Array, failed: Array }}
 */
async function runAll() {
  const state = loadState()
  const now = new Date().toISOString()
  state.lastRun = now

  const passed = []
  const failed = []

  for (const test of tests) {
    let url = test.url

    // Build Supabase URL dynamically
    if (test.id === 'supabase-read' && !url) {
      const supabaseUrl = process.env.SUPABASE_URL
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY
      if (!supabaseUrl || !supabaseKey) {
        const result = {
          id: test.id, name: test.name, severity: test.severity,
          pass: false, detail: 'Missing SUPABASE_URL or SUPABASE_KEY env vars'
        }
        failed.push(result)
        state.results[test.id] = { ...state.results[test.id], lastFail: now }
        continue
      }
      url = `${supabaseUrl}/rest/v1/tasks?select=id&limit=1`
      // Will add auth headers below
    }

    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 5000)

      const fetchOpts = { signal: controller.signal }

      // Add Supabase auth headers
      if (test.id === 'supabase-read') {
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY
        fetchOpts.headers = {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      }

      let response = await fetch(url, fetchOpts)
      clearTimeout(timeout)

      // Fallback: if primary URL returns 404 and test has a fallback, try that
      if (response.status === 404 && test.dashboardFallbackUrl) {
        const controller2 = new AbortController()
        const timeout2 = setTimeout(() => controller2.abort(), 5000)
        response = await fetch(test.dashboardFallbackUrl, { signal: controller2.signal })
        clearTimeout(timeout2)
      }

      const body = await response.text()
      let result = test.check(response, body)

      // Reject pattern check: even if check() passed, fail if body contains error patterns
      if (result.pass && test.rejectPatterns && body) {
        const matched = test.rejectPatterns.find(p => body.includes(p))
        if (matched) {
          result = { pass: false, detail: `Body contains error pattern: "${matched}"` }
        }
      }

      const entry = {
        id: test.id, name: test.name, severity: test.severity,
        pass: result.pass, detail: result.detail
      }

      if (result.pass) {
        passed.push(entry)
        state.results[test.id] = { ...state.results[test.id], lastPass: now }
      } else {
        failed.push(entry)
        state.results[test.id] = { ...state.results[test.id], lastFail: now }
      }
    } catch (err) {
      const detail = err.name === 'AbortError'
        ? 'Timeout (5s)'
        : `Fetch error: ${err.message}`
      failed.push({
        id: test.id, name: test.name, severity: test.severity,
        pass: false, detail
      })
      state.results[test.id] = { ...state.results[test.id], lastFail: now }
    }
  }

  saveState(state)
  return { passed, failed }
}

module.exports = { tests, runAll, loadState, saveState, STATE_PATH }
