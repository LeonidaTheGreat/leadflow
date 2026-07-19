'use strict';

/**
 * Unit tests for lib/services/StageEventsService
 *
 * Spec:
 *   What:   StageEventsService — recordEvent, getUCStageTimeline,
 *           getPipelineStageBreakdown, backfillFromTasks
 *   Verify: Run with Jest (from live checkout dashboard node_modules):
 *           /Users/clawdbot/projects/leadflow/product/lead-response/dashboard/node_modules/.bin/jest \
 *             tests/unit/StageEventsService.test.js --rootDir .
 *   Boundaries: No real DB. Pool is mocked inline. Does not touch genome.
 */

const { StageEventsService } = require('../../lib/services/StageEventsService');

// ── Mock pool factory ──────────────────────────────────────────────────────────
// Captures queries for assertion and returns configurable row sets.

function makePool(queryResponses = {}) {
  const calls = [];

  const pool = {
    _calls: calls,
    query: jest.fn(async (sql, params) => {
      calls.push({ sql, params });
      const key = Object.keys(queryResponses).find(k => sql.includes(k));
      if (key) {
        const resp = queryResponses[key];
        return typeof resp === 'function' ? resp(sql, params) : resp;
      }
      return { rows: [], rowCount: 0 };
    })
  };

  return pool;
}

// ── VALID_STAGES / PIPELINE_SEGMENTS ──────────────────────────────────────────

describe('StageEventsService static constants', () => {
  it('exports 6 VALID_STAGES in pipeline order', () => {
    expect(StageEventsService.VALID_STAGES).toEqual([
      'feedback_ingested', 'dev_spawned', 'dev_completed',
      'qc_spawned', 'qc_completed', 'merged'
    ]);
  });

  it('exports 5 PIPELINE_SEGMENTS connecting consecutive stages', () => {
    expect(StageEventsService.PIPELINE_SEGMENTS).toHaveLength(5);
    expect(StageEventsService.PIPELINE_SEGMENTS[0].from).toBe('feedback_ingested');
    expect(StageEventsService.PIPELINE_SEGMENTS[0].to).toBe('dev_spawned');
    expect(StageEventsService.PIPELINE_SEGMENTS[4].to).toBe('merged');
  });
});

// ── recordEvent ───────────────────────────────────────────────────────────────

describe('StageEventsService.recordEvent()', () => {
  it('inserts a valid stage with an explicit timestamp', async () => {
    const pool = makePool();
    const svc = new StageEventsService(pool);
    const ts = new Date('2026-07-18T10:00:00Z');

    await svc.recordEvent('uc-1', 'leadflow', 'dev_spawned', ts);

    expect(pool.query).toHaveBeenCalledTimes(1);
    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toMatch(/INSERT INTO uc_stage_events/);
    expect(sql).toMatch(/ON CONFLICT/);
    expect(params[0]).toBe('uc-1');
    expect(params[1]).toBe('leadflow');
    expect(params[2]).toBe('dev_spawned');
    expect(params[3]).toEqual(ts);
  });

  it('defaults occurred_at to now when no timestamp given', async () => {
    const pool = makePool();
    const svc = new StageEventsService(pool);
    const before = Date.now();

    await svc.recordEvent('uc-2', 'leadflow', 'merged');

    const ts = pool.query.mock.calls[0][1][3];
    expect(ts.getTime()).toBeGreaterThanOrEqual(before);
    expect(ts.getTime()).toBeLessThanOrEqual(Date.now());
  });

  it('throws for an invalid stage name', async () => {
    const pool = makePool();
    const svc = new StageEventsService(pool);

    await expect(svc.recordEvent('uc-3', 'leadflow', 'invalid_stage'))
      .rejects.toThrow(/Invalid stage/);

    expect(pool.query).not.toHaveBeenCalled();
  });

  it('accepts all six valid stages without throwing', async () => {
    const pool = makePool();
    const svc = new StageEventsService(pool);

    for (const stage of StageEventsService.VALID_STAGES) {
      await expect(svc.recordEvent('uc-x', 'leadflow', stage)).resolves.not.toThrow();
    }

    expect(pool.query).toHaveBeenCalledTimes(StageEventsService.VALID_STAGES.length);
  });
});

// ── getUCStageTimeline ────────────────────────────────────────────────────────

describe('StageEventsService.getUCStageTimeline()', () => {
  it('returns rows from uc_stage_events ordered chronologically', async () => {
    const mockRows = [
      { stage: 'feedback_ingested', occurred_at: new Date('2026-07-18T08:00:00Z') },
      { stage: 'dev_spawned',       occurred_at: new Date('2026-07-18T09:00:00Z') }
    ];
    const pool = makePool({ 'uc_stage_events': { rows: mockRows, rowCount: 2 } });
    const svc = new StageEventsService(pool);

    const result = await svc.getUCStageTimeline('uc-1');

    expect(result).toHaveLength(2);
    expect(result[0].stage).toBe('feedback_ingested');
    expect(result[1].stage).toBe('dev_spawned');
  });

  it('returns empty array when no events exist', async () => {
    const pool = makePool({ 'uc_stage_events': { rows: [], rowCount: 0 } });
    const svc = new StageEventsService(pool);

    const result = await svc.getUCStageTimeline('uc-unknown');
    expect(result).toEqual([]);
  });
});

// ── getPipelineStageBreakdown ─────────────────────────────────────────────────

describe('StageEventsService.getPipelineStageBreakdown()', () => {
  function makeRows(stageTimings) {
    // stageTimings: [{ucId, stage, hoursFromBase}]
    const base = new Date('2026-07-11T00:00:00Z').getTime();
    return stageTimings.map(({ ucId, stage, hoursFromBase }) => ({
      uc_id: ucId,
      stage,
      occurred_at: new Date(base + hoursFromBase * 3_600_000)
    }));
  }

  it('computes correct per-segment medians for a single UC', async () => {
    const rows = makeRows([
      { ucId: 'uc-1', stage: 'feedback_ingested', hoursFromBase: 0 },
      { ucId: 'uc-1', stage: 'dev_spawned',       hoursFromBase: 1 },
      { ucId: 'uc-1', stage: 'dev_completed',     hoursFromBase: 4 },
      { ucId: 'uc-1', stage: 'qc_spawned',        hoursFromBase: 4.5 },
      { ucId: 'uc-1', stage: 'qc_completed',      hoursFromBase: 6 },
      { ucId: 'uc-1', stage: 'merged',            hoursFromBase: 6.5 }
    ]);

    const pool = makePool({ 'uc_stage_events': { rows, rowCount: rows.length } });
    const svc = new StageEventsService(pool);

    const result = await svc.getPipelineStageBreakdown('leadflow', 7);

    expect(result.ucCount).toBe(1);
    expect(result.totalMedianHours).toBe(6.5);

    const devImpl = result.segments.find(s => s.label === 'Dev Implementation');
    expect(devImpl.medianHours).toBe(3);
    expect(devImpl.count).toBe(1);

    const qcReview = result.segments.find(s => s.label === 'QC Review');
    expect(qcReview.medianHours).toBe(1.5);
  });

  it('returns null totalMedianHours when no complete pipelines exist', async () => {
    // Only partial pipeline — no 'merged' event
    const rows = makeRows([
      { ucId: 'uc-2', stage: 'feedback_ingested', hoursFromBase: 0 },
      { ucId: 'uc-2', stage: 'dev_spawned',       hoursFromBase: 2 }
    ]);

    const pool = makePool({ 'uc_stage_events': { rows, rowCount: rows.length } });
    const svc = new StageEventsService(pool);

    const result = await svc.getPipelineStageBreakdown('leadflow', 7);

    expect(result.totalMedianHours).toBeNull();
  });

  it('excludes UCs with pipeline > 72h as outliers', async () => {
    const rows = makeRows([
      { ucId: 'uc-outlier', stage: 'feedback_ingested', hoursFromBase: 0 },
      { ucId: 'uc-outlier', stage: 'merged',            hoursFromBase: 80 }
    ]);

    const pool = makePool({ 'uc_stage_events': { rows, rowCount: rows.length } });
    const svc = new StageEventsService(pool);

    const result = await svc.getPipelineStageBreakdown('leadflow', 7);

    expect(result.totalMedianHours).toBeNull();
  });

  it('returns count=0 and null medians for segments with no data', async () => {
    const pool = makePool({ 'uc_stage_events': { rows: [], rowCount: 0 } });
    const svc = new StageEventsService(pool);

    const result = await svc.getPipelineStageBreakdown('leadflow', 7);

    for (const seg of result.segments) {
      expect(seg.count).toBe(0);
      expect(seg.medianHours).toBeNull();
    }
    expect(result.totalMedianHours).toBeNull();
  });

  it('computes correct median with even number of UCs', async () => {
    // Two UCs: dev impl takes 2h and 4h → median = 3h
    const rows = makeRows([
      { ucId: 'a', stage: 'dev_spawned',   hoursFromBase: 0 },
      { ucId: 'a', stage: 'dev_completed', hoursFromBase: 2 },
      { ucId: 'b', stage: 'dev_spawned',   hoursFromBase: 10 },
      { ucId: 'b', stage: 'dev_completed', hoursFromBase: 14 }
    ]);

    const pool = makePool({ 'uc_stage_events': { rows, rowCount: rows.length } });
    const svc = new StageEventsService(pool);

    const result = await svc.getPipelineStageBreakdown('leadflow', 7);
    const devImpl = result.segments.find(s => s.label === 'Dev Implementation');

    expect(devImpl.medianHours).toBe(3);
    expect(devImpl.count).toBe(2);
  });
});

// ── backfillFromTasks ─────────────────────────────────────────────────────────

describe('StageEventsService.backfillFromTasks()', () => {
  it('creates feedback_ingested, dev, qc and merged events for a complete UC', async () => {
    const ucRow = { id: 'uc-full', created_at: new Date('2026-07-10T08:00:00Z'), workflow: ['dev', 'qc'] };
    const devRow = { created_at: new Date('2026-07-10T09:00:00Z'), updated_at: new Date('2026-07-10T12:00:00Z') };
    const qcRow = { created_at: new Date('2026-07-10T12:30:00Z'), updated_at: new Date('2026-07-10T14:00:00Z') };
    const mrRow = { updated_at: new Date('2026-07-10T14:30:00Z') };

    let callIndex = 0;
    const responses = [ucRow, devRow, qcRow, mrRow];

    const pool = {
      _inserts: [],
      query: jest.fn(async (sql, params) => {
        if (sql.includes('ON CONFLICT (uc_id, stage) DO NOTHING')) {
          pool._inserts.push({ stage: params[2] });
          return { rowCount: 1 };
        }
        // Sequential responses for SELECT queries
        const row = responses[callIndex++];
        return { rows: row ? [row] : [], rowCount: row ? 1 : 0 };
      })
    };

    const svc = new StageEventsService(pool);
    const result = await svc.backfillFromTasks('leadflow');

    expect(result.ucsProcessed).toBe(1);
    expect(result.eventsCreated).toBe(6); // feedback + dev×2 + qc×2 + merged

    const stages = pool._inserts.map(r => r.stage);
    expect(stages).toContain('feedback_ingested');
    expect(stages).toContain('dev_spawned');
    expect(stages).toContain('dev_completed');
    expect(stages).toContain('qc_spawned');
    expect(stages).toContain('qc_completed');
    expect(stages).toContain('merged');
  });

  it('handles UC with no tasks gracefully (only feedback_ingested)', async () => {
    const ucRow = { id: 'uc-empty', created_at: new Date('2026-07-10T08:00:00Z'), workflow: [] };

    let callCount = 0;
    const pool = {
      _inserts: [],
      query: jest.fn(async (sql, _params) => {
        if (sql.includes('ON CONFLICT (uc_id, stage) DO NOTHING')) {
          pool._inserts.push(1);
          return { rowCount: 1 };
        }
        // First call → use_cases; rest → empty
        if (callCount++ === 0) return { rows: [ucRow], rowCount: 1 };
        return { rows: [], rowCount: 0 };
      })
    };

    const svc = new StageEventsService(pool);
    const result = await svc.backfillFromTasks('leadflow');

    expect(result.ucsProcessed).toBe(1);
    expect(result.eventsCreated).toBe(1); // only feedback_ingested
  });
});
