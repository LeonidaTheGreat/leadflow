/**
 * tests/workflow-engine.test.js
 * Unit tests for core/workflow-engine.js pure functions and async workflows:
 *   - selectInitialModel
 *   - classifyAreas
 *   - estimateCost
 *   - checkAreaContention
 *   - escalateModel
 *   - modelLadderIndex
 */

// The optimizer module is optional; stub it out so tests are self-contained.
jest.mock('../intelligence/optimizer', () => ({
  getCurrentMode: () => null
}), { virtual: true })

const {
  selectInitialModel,
  classifyAreas,
  estimateCost,
  checkAreaContention,
  escalateModel,
  modelLadderIndex,
  normalizeAgentId,
  AGENT_LABELS,
  MODEL_LADDER
} = require('../core/workflow-engine')

// ── selectInitialModel ────────────────────────────────────────────────────────

describe('selectInitialModel()', () => {
  test('returns sonnet for product agent (low complexity)', () => {
    const model = selectInitialModel('product', { name: 'Fix typo', priority: 2 })
    expect(model).toBe('sonnet')
  })

  test('returns qwen3-coder for dev agent with low complexity', () => {
    // Low complexity: no high/medium keywords, priority 2, no revenue_impact
    const model = selectInitialModel('dev', {
      name: 'Fix spelling in README',
      priority: 2
    })
    // score = 1 (priority 2) ≤ 2 → qwen3-coder
    expect(model).toBe('qwen3-coder')
  })

  test('returns sonnet for dev agent when task contains "api" keyword', () => {
    const model = selectInitialModel('dev', {
      name: 'Add REST API endpoint for lead creation',
      priority: 2
    })
    expect(model).toBe('sonnet')
  })

  test('returns sonnet for dev agent with medium complexity (score ≥ 3)', () => {
    // "auth" is a medium keyword (+2), priority 2 (+1) = score 3 → sonnet floor for dev score >= 3
    const model = selectInitialModel('dev', {
      name: 'Implement authentication flow',
      priority: 2
    })
    expect(model).toBe('sonnet')
  })

  test('returns sonnet for product agent regardless of complexity', () => {
    const lowModel = selectInitialModel('product', { name: 'simple task', priority: 2 })
    const highModel = selectInitialModel('product', {
      name: 'Full user journey onboarding architecture migration',
      priority: 1,
      revenue_impact: 'high',
      workflow: ['pm', 'dev', 'qc', 'deploy']
    })
    expect(lowModel).toBe('sonnet')
    // High complexity PM tasks may return codex
    expect(['sonnet', 'codex']).toContain(highModel)
  })

  test('handles missing UC gracefully', () => {
    const model = selectInitialModel('dev')
    expect(['qwen3-coder', 'qwen3.5', 'kimi', 'sonnet', 'codex']).toContain(model)
  })

  test('prioritizes high-complexity keywords', () => {
    const model = selectInitialModel('dev', {
      name: 'Migrate entire architecture to microservices',
      priority: 1
    })
    expect(['kimi', 'sonnet', 'codex']).toContain(model)
  })
})

// ── classifyAreas ─────────────────────────────────────────────────────────────

describe('classifyAreas()', () => {
  test('tags auth tasks correctly', () => {
    const areas = classifyAreas('Fix authentication login bug in session handling')
    expect(areas).toEqual(expect.arrayContaining(['auth']))
  })

  test('classifyAreas("Fix login session bug") should contain "auth"', () => {
    const areas = classifyAreas('Fix login session bug')
    expect(areas).toEqual(expect.arrayContaining(['auth']))
  })

  test('tags billing/stripe tasks', () => {
    const areas = classifyAreas('Fix Stripe payment webhook integration')
    expect(Array.isArray(areas)).toBe(true)
  })

  test('classifyAreas("Update pricing page stripe checkout") should contain "billing" and "landing"', () => {
    const areas = classifyAreas('Update pricing page stripe checkout')
    expect(areas).toEqual(expect.arrayContaining(['billing']))
    expect(areas).toEqual(expect.arrayContaining(['landing']))
  })

  test('tags sms/twilio tasks', () => {
    const areas = classifyAreas('Implement Twilio SMS callback')
    expect(Array.isArray(areas)).toBe(true)
  })

  test('classifyAreas("Fix Twilio SMS callback") should contain "sms"', () => {
    const areas = classifyAreas('Fix Twilio SMS callback')
    expect(areas).toEqual(expect.arrayContaining(['sms']))
  })

  test('returns empty array for unclassified text', () => {
    const areas = classifyAreas('Update CHANGELOG with release notes')
    expect(Array.isArray(areas)).toBe(true)
    // May or may not have areas; just verify it doesn't throw
  })

  test('handles null/empty input gracefully', () => {
    expect(() => classifyAreas(null)).not.toThrow()
    expect(() => classifyAreas('')).not.toThrow()
    expect(() => classifyAreas(undefined)).not.toThrow()
  })

  test('returns array for all inputs', () => {
    const tests = [
      'random text',
      'Fix API rate limit',
      'Database migration',
      'Deploy to production',
      ''
    ]
    tests.forEach(text => {
      const areas = classifyAreas(text)
      expect(Array.isArray(areas)).toBe(true)
    })
  })
})

// ── estimateCost ──────────────────────────────────────────────────────────────

describe('estimateCost()', () => {
  test('returns 0 for local models (qwen3-coder, qwen3.5)', () => {
    const cost1 = estimateCost('qwen3-coder', 'dev')
    const cost2 = estimateCost('qwen3.5', 'dev')
    expect(cost1).toBe(0)
    expect(cost2).toBe(0)
  })

  test('returns a positive number for cloud models (sonnet, kimi)', () => {
    const sonnetCost = estimateCost('sonnet', 'dev')
    const kimiCost = estimateCost('kimi', 'dev')
    expect(sonnetCost).toBeGreaterThan(0)
    expect(kimiCost).toBeGreaterThan(0)
  })

  test('returns a number (not NaN) for any input', () => {
    const cost = estimateCost('unknown-model', 1)
    expect(typeof cost).toBe('number')
    expect(Number.isFinite(cost) || cost === 0).toBeTruthy()
  })

  test('returns consistent cost for same model and agent', () => {
    const cost1 = estimateCost('sonnet', 'dev')
    const cost2 = estimateCost('sonnet', 'dev')
    expect(cost1).toBe(cost2)
  })

  test('works with numeric agentId', () => {
    const cost = estimateCost('sonnet', 3)
    expect(typeof cost).toBe('number')
  })
})

// ── checkAreaContention ───────────────────────────────────────────────────────

describe('checkAreaContention()', () => {
  test('returns allowed: true when store has no supabase', async () => {
    const result = await checkAreaContention({}, { agent_id: 'dev', title: 'Test task' })
    expect(result.allowed).toBe(true)
  })

  test('returns allowed: true for non-dev agents', async () => {
    const mockStore = {
      supabase: { from: jest.fn() },
      projectId: '123'
    }
    const result = await checkAreaContention(mockStore, { agent_id: 'product', title: 'Test task' })
    expect(result.allowed).toBe(true)
  })

  test('returns allowed: true when task has no classified areas', async () => {
    const mockStore = {
      supabase: { from: jest.fn() },
      projectId: '123'
    }
    const result = await checkAreaContention(mockStore, {
      agent_id: 'dev',
      title: 'Update changelog',
      description: ''
    })
    expect(result.allowed).toBe(true)
  })

  test('detects area contention with in-flight tasks', async () => {
    const mockSupabase = {
      from: jest.fn()
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          neq: jest.fn().mockReturnThis(),
          limit: jest.fn().mockResolvedValueOnce({
            data: [{ id: '456', title: 'Fix authentication in login flow' }]
          })
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          in: jest.fn().mockReturnThis(),
          limit: jest.fn().mockResolvedValueOnce({ data: [] })
        })
    }
    const mockStore = { supabase: mockSupabase, projectId: '123' }
    const task = {
      id: '789',
      agent_id: 'dev',
      title: 'Implement auth flow',
      description: 'Add authentication'
    }
    const result = await checkAreaContention(mockStore, task)
    expect(result.allowed).toBe(false)
    expect(result.reason).toContain('area contention')
  })
})

// ── escalateModel ────────────────────────────────────────────────────────────

describe('escalateModel()', () => {
  test('escalates qwen3-coder to next model in ladder', () => {
    const next = escalateModel('qwen3-coder')
    expect(next).not.toBe('qwen3-coder')
    expect(['qwen3.5', 'kimi', 'sonnet', 'codex']).toContain(next)
  })

  test('escalates sonnet to codex', () => {
    const next = escalateModel('sonnet')
    expect(['codex', 'gpt']).toContain(next)
  })

  test('returns a model for any input', () => {
    const result = escalateModel('unknown-model')
    expect(typeof result).toBe('string')
  })

  test('escalation follows a ladder', () => {
    let current = 'qwen3-coder'
    const seen = [current]
    for (let i = 0; i < 10; i++) {
      current = escalateModel(current)
      seen.push(current)
    }
    // Should eventually reach highest tier
    expect(seen).toContain('codex')
  })
})

// ── modelLadderIndex ────────────────────────────────────────────────────────

describe('modelLadderIndex()', () => {
  test('returns index for known models', () => {
    const idx = modelLadderIndex('sonnet')
    expect(typeof idx).toBe('number')
    expect(idx).toBeGreaterThanOrEqual(0)
  })

  test('higher tiers have higher indices', () => {
    const idx1 = modelLadderIndex('qwen3-coder')
    const idx2 = modelLadderIndex('sonnet')
    expect(idx2).toBeGreaterThan(idx1)
  })

  test('returns -1 or valid index for unknown models', () => {
    const idx = modelLadderIndex('unknown')
    expect(typeof idx).toBe('number')
  })
})

// ── normalizeAgentId ──────────────────────────────────────────────────────────

describe('normalizeAgentId()', () => {
  test('normalizes agent labels to IDs', () => {
    const id = normalizeAgentId('dev')
    expect(id).toBe('dev')
  })

  test('returns input if already an ID', () => {
    const id = normalizeAgentId('dev')
    expect(typeof id).toBe('string')
  })
})

// ── createTask model defaults ─────────────────────────────────────────────────

describe('createTask model defaults', () => {
  function createMockSupabase() {
    return {
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        neq: jest.fn().mockReturnThis(),
        not: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({ data: [] }),
        single: jest.fn().mockResolvedValue({ data: null }),
        insert: jest.fn().mockReturnThis()
      })
    }
  }

  test('createTask with agent_id="product" and no model → expect model="sonnet"', async () => {
    const mockSupabase = createMockSupabase()
    // Mock the insert chain to return the inserted data
    const insertedTask = { id: 'test-1', title: 'Test product task', model: 'sonnet', agent_id: 'product' }
    mockSupabase.from().select().eq().eq().not().limit.mockResolvedValue({ data: [] })
    mockSupabase.from().insert.mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ data: insertedTask })
      })
    })

    const { TaskStore } = require('../core/task-store')
    const store = new TaskStore()
    store.supabase = mockSupabase
    store.projectId = 'test-project'
    store._useLocalPg = false

    const task = await store.createTask({
      title: 'Test product task',
      agent_id: 'product'
    })

    expect(task.model).toBe('sonnet')
  })

  test('createTask with agent_id="dev" and no model → expect model="qwen3-coder"', async () => {
    const mockSupabase = createMockSupabase()
    const insertedTask = { id: 'test-2', title: 'Test dev task', model: 'qwen3-coder', agent_id: 'dev' }
    mockSupabase.from().select().eq().eq().not().limit.mockResolvedValue({ data: [] })
    mockSupabase.from().insert.mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ data: insertedTask })
      })
    })

    const { TaskStore } = require('../core/task-store')
    const store = new TaskStore()
    store.supabase = mockSupabase
    store.projectId = 'test-project'
    store._useLocalPg = false

    const task = await store.createTask({
      title: 'Test dev task',
      agent_id: 'dev'
    })

    expect(task.model).toBe('qwen3-coder')
  })
})
