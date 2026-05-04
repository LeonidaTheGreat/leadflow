'use strict'

const path = require('path')

const collectorPath = path.join(process.env.HOME, '.openclaw', 'genome', 'core', 'mission-metric-collector.js')
const { MissionMetricCollector } = require(collectorPath)

function recentTS(minutesAgo) {
  return new Date(Date.now() - minutesAgo * 60 * 1000).toISOString()
}

function makeStore(smokeRuns) {
  const values = {}
  return {
    getMissionMetrics: jest.fn().mockResolvedValue([
      { name: 'Uptime', collection_method: 'smoke_tests' }
    ]),
    getMetrics: jest.fn().mockResolvedValue(smokeRuns),
    updateMetricValue: jest.fn().mockImplementation(async (_pid, name, val) => {
      values[name] = val
    }),
    getValue: (name) => values[name],
    query: () => ({
      select: function () { return this },
      eq: function () { return this },
      gte: function () { return this },
      order: function () { return this },
      limit: function () { return this },
      in: function () { return this },
      then: (resolve) => resolve({ data: [], error: null })
    })
  }
}

function makeRun(minutesAgo, { criticalFails = 0, warningFails = 0, passCount = 3 } = {}) {
  const failed = []
  for (let i = 0; i < criticalFails; i++) {
    failed.push({ id: `crit-${i}`, severity: 'critical' })
  }
  for (let i = 0; i < warningFails; i++) {
    failed.push({ id: `warn-${i}`, severity: 'warning' })
  }
  const passed = Array.from({ length: passCount }, (_, i) => ({ id: `pass-${i}` }))
  return { data: { passed, failed }, timestamp: recentTS(minutesAgo) }
}

describe('_collectSmokeTestMetrics — rolling 24h window', () => {
  test('multi-row window: 1 critical failure in 10 runs → 90% uptime', async () => {
    const runs = []
    for (let i = 0; i < 10; i++) {
      runs.push(makeRun(i * 5, { criticalFails: i === 0 ? 1 : 0 }))
    }
    const store = makeStore(runs)
    const collector = new MissionMetricCollector(store)
    await collector.collect('leadflow')
    expect(store.getValue('Uptime')).toBe(90)
  })

  test('20-min outage in 24h → ~98.6% (not 42.9%)', async () => {
    const runs = []
    for (let i = 0; i < 288; i++) {
      const isOutage = i >= 140 && i <= 143
      runs.push(makeRun(i * 5, { criticalFails: isOutage ? 2 : 0 }))
    }
    const store = makeStore(runs)
    const collector = new MissionMetricCollector(store)
    await collector.collect('leadflow')
    const uptime = store.getValue('Uptime')
    expect(uptime).toBeGreaterThan(98)
    expect(uptime).toBeLessThan(100)
  })

  test('single row in window → uses that row', async () => {
    const runs = [makeRun(5, { criticalFails: 0 })]
    const store = makeStore(runs)
    const collector = new MissionMetricCollector(store)
    await collector.collect('leadflow')
    expect(store.getValue('Uptime')).toBe(100)
  })

  test('single failing row → 0% uptime', async () => {
    const runs = [makeRun(5, { criticalFails: 1 })]
    const store = makeStore(runs)
    const collector = new MissionMetricCollector(store)
    await collector.collect('leadflow')
    expect(store.getValue('Uptime')).toBe(0)
  })

  test('empty window (no rows) → null', async () => {
    const store = makeStore([])
    const collector = new MissionMetricCollector(store)
    await collector.collect('leadflow')
    expect(store.getValue('Uptime')).toBeUndefined()
  })

  test('rows older than 24h are excluded', async () => {
    const runs = [
      makeRun(5, { criticalFails: 0 }),
      { data: { passed: [{ id: 'old' }], failed: [{ id: 'f', severity: 'critical' }] }, timestamp: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString() }
    ]
    const store = makeStore(runs)
    const collector = new MissionMetricCollector(store)
    await collector.collect('leadflow')
    expect(store.getValue('Uptime')).toBe(100)
  })

  test('warning-only failures do NOT count against uptime', async () => {
    const runs = []
    for (let i = 0; i < 5; i++) {
      runs.push(makeRun(i * 5, { warningFails: 2, criticalFails: 0 }))
    }
    const store = makeStore(runs)
    const collector = new MissionMetricCollector(store)
    await collector.collect('leadflow')
    expect(store.getValue('Uptime')).toBe(100)
  })

  test('mixed critical + warning: only critical counts', async () => {
    const runs = [
      makeRun(5, { criticalFails: 1, warningFails: 3 }),
      makeRun(10, { criticalFails: 0, warningFails: 5 }),
      makeRun(15, { criticalFails: 0, warningFails: 0 })
    ]
    const store = makeStore(runs)
    const collector = new MissionMetricCollector(store)
    await collector.collect('leadflow')
    const uptime = store.getValue('Uptime')
    expect(uptime).toBeCloseTo(66.7, 0)
  })

  test('getMetrics called with limit 288 and domain smoke_tests', async () => {
    const store = makeStore([makeRun(5)])
    const collector = new MissionMetricCollector(store)
    await collector.collect('leadflow')
    expect(store.getMetrics).toHaveBeenCalledWith('leadflow', expect.objectContaining({
      domain: 'smoke_tests',
      limit: 288
    }))
  })
})
