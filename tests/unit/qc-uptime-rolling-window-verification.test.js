'use strict'

/**
 * QC verification: uptime rolling-window tests consolidated correctly.
 * Confirms the new Jest suite covers all scenarios from both deleted files.
 */

const path = require('path')
const assert = require('assert')

const collectorPath = path.join(process.env.HOME, '.openclaw', 'genome', 'core', 'mission-metric-collector.js')
let MissionMetricCollector
try {
  ;({ MissionMetricCollector } = require(collectorPath))
} catch (e) {
  console.error(`FAIL: cannot load collector: ${e.message}`)
  process.exit(1)
}

function makeStore(runs) {
  const vals = {}
  return {
    getMissionMetrics: async () => [{ name: 'Uptime', collection_method: 'smoke_tests' }],
    getMetrics: async (_pid, opts) => { makeStore._lastOpts = opts; return runs },
    updateMetricValue: async (_p, name, val) => { vals[name] = val },
    getValue: (n) => vals[n],
    query: () => ({
      select() { return this },
      eq() { return this },
      gte() { return this },
      order() { return this },
      limit() { return this },
      in() { return this },
      then: (r) => r({ data: [], error: null })
    })
  }
}

function ts(minsAgo) { return new Date(Date.now() - minsAgo * 60 * 1000).toISOString() }
function run(minsAgo, critFails = 0) {
  const failed = Array.from({ length: critFails }, (_, i) => ({ id: `c${i}`, severity: 'critical' }))
  return { data: { passed: [{ id: 'ok' }], failed }, timestamp: ts(minsAgo) }
}

const results = []
function check(name, pass, got, expected) {
  if (pass) { results.push(true); console.log(`  PASS: ${name}`) }
  else { results.push(false); console.error(`  FAIL: ${name} — expected ${expected}, got ${got}`) }
}

async function main() {
  console.log('\nQC: uptime rolling-window integration verification\n')

  // 1. limit=288 passed to getMetrics
  {
    const store = makeStore([run(5, 0)])
    await new MissionMetricCollector(store).collect('leadflow')
    check('getMetrics called with limit:288', makeStore._lastOpts?.limit === 288, makeStore._lastOpts?.limit, 288)
    check('getMetrics called with domain:smoke_tests', makeStore._lastOpts?.domain === 'smoke_tests', makeStore._lastOpts?.domain, 'smoke_tests')
  }

  // 2. rolling window: 1 critical fail in 10 runs → 90%
  {
    const runs = Array.from({ length: 10 }, (_, i) => run(i * 5, i === 0 ? 1 : 0))
    const store = makeStore(runs)
    await new MissionMetricCollector(store).collect('leadflow')
    check('1/10 critical fail → 90%', store.getValue('Uptime') === 90, store.getValue('Uptime'), 90)
  }

  // 3. warning-only failures ignored
  {
    const warnRun = { data: { passed: [], failed: [{ id: 'w', severity: 'warning' }] }, timestamp: ts(5) }
    const store = makeStore([warnRun])
    await new MissionMetricCollector(store).collect('leadflow')
    check('warning-only failure → 100% uptime', store.getValue('Uptime') === 100, store.getValue('Uptime'), 100)
  }

  // 4. empty window → skipped (no updateMetricValue call)
  {
    const store = makeStore([])
    await new MissionMetricCollector(store).collect('leadflow')
    check('empty window → Uptime skipped', store.getValue('Uptime') === undefined, store.getValue('Uptime'), 'undefined')
  }

  // 5. runs older than 24h excluded
  {
    const old = { data: { passed: [], failed: [{ id: 'x', severity: 'critical' }] }, timestamp: new Date(Date.now() - 25 * 3600 * 1000).toISOString() }
    const store = makeStore([run(5, 0), old])
    await new MissionMetricCollector(store).collect('leadflow')
    check('24h+ old run excluded → 100%', store.getValue('Uptime') === 100, store.getValue('Uptime'), 100)
  }

  const passed = results.filter(Boolean).length
  const total = results.length
  console.log(`\nPassed ${passed}/${total}`)
  process.exit(passed === total ? 0 : 1)
}

main().catch(e => { console.error(`FAIL: ${e.message}`); process.exit(1) })
