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

const STATE_PATH = path.join(__dirname, '.smoke-test-state.json')

// ── Test Definitions ────────────────────────────────────────────────────────

const tests = [
  {
    id: 'vercel-health',
    name: 'Vercel /health endpoint',
    url: 'https://fub-inbound-webhook.vercel.app/health',
    severity: 'critical',
    check(response, body) {
      if (response.status !== 200) {
        return { pass: false, detail: `HTTP ${response.status} (expected 200)` }
      }
      try {
        const json = JSON.parse(body)
        if (json.status === 'ok') {
          return { pass: true, detail: 'status: ok' }
        }
        return { pass: false, detail: `status: ${json.status || 'missing'} (expected "ok")` }
      } catch {
        return { pass: false, detail: 'Response is not valid JSON' }
      }
    }
  },
  {
    id: 'vercel-root',
    name: 'Vercel root endpoint',
    url: 'https://fub-inbound-webhook.vercel.app/',
    severity: 'warning',
    check(response) {
      if (response.status === 200) {
        return { pass: true, detail: 'HTTP 200' }
      }
      return { pass: false, detail: `HTTP ${response.status} (expected 200)` }
    }
  },
  {
    id: 'dashboard-local',
    name: 'Local dashboard',
    url: 'http://127.0.0.1:8787/',
    severity: 'warning',
    check(response, body) {
      if (response.status !== 200) {
        return { pass: false, detail: `HTTP ${response.status} (expected 200)` }
      }
      if (body && body.includes('<title>')) {
        return { pass: true, detail: 'HTML with <title> tag' }
      }
      return { pass: false, detail: 'Response missing <title> tag' }
    }
  },
  {
    id: 'supabase-read',
    name: 'Supabase read access',
    url: null, // built dynamically from env
    severity: 'critical',
    check(response, body) {
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
        // Supabase error object
        if (data.message || data.error) {
          return { pass: false, detail: `API error: ${data.message || data.error}` }
        }
        return { pass: false, detail: 'Unexpected response shape' }
      } catch {
        return { pass: false, detail: 'Response is not valid JSON' }
      }
    }
  }
]

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

      const response = await fetch(url, fetchOpts)
      clearTimeout(timeout)

      const body = await response.text()
      const result = test.check(response, body)

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
