const { describe, it, expect, beforeAll, afterAll } = require('@jest/globals');
const { Pool } = require('pg');

// Test database connection - create new pool for each describe block
function createPool() {
  return new Pool({
    connectionString: process.env.LOCAL_PG_URL || process.env.DATABASE_URL
  });
}

describe('enroll-pilot script', () => {
  let testAgentId;
  let pool;
  const testEmail = `test-pilot-${Date.now()}@example.com`;

  beforeAll(() => {
    pool = createPool();
  });

  beforeAll(async () => {
    // Create a test agent
    const result = await pool.query(
      `INSERT INTO real_estate_agents (email, password_hash, first_name, last_name, status)
       VALUES ($1, 'test_hash', 'Test', 'Pilot', 'onboarding')
       RETURNING id`,
      [testEmail]
    );
    testAgentId = result.rows[0].id;
  });

  afterAll(async () => {
    // Cleanup: delete test pilot_progress and agent
    await pool.query('DELETE FROM pilot_progress WHERE agent_id = $1', [testAgentId]);
    await pool.query('DELETE FROM real_estate_agents WHERE id = $1', [testAgentId]);
    await pool.end();
  });

  it('should create pilot_progress record for existing agent', async () => {
    // Verify no pilot_progress exists yet
    const beforeResult = await pool.query(
      'SELECT * FROM pilot_progress WHERE agent_id = $1',
      [testAgentId]
    );
    expect(beforeResult.rows.length).toBe(0);

    // Insert pilot_progress record (simulating what the script does)
    const insertResult = await pool.query(
      `INSERT INTO pilot_progress (agent_id, stage, pilot_cohort, stage_entered_at, created_at, updated_at)
       VALUES ($1, 'signed_up', 'cohort-1', NOW(), NOW(), NOW())
       RETURNING *`,
      [testAgentId]
    );

    expect(insertResult.rows.length).toBe(1);
    expect(insertResult.rows[0].agent_id).toBe(testAgentId);
    expect(insertResult.rows[0].stage).toBe('signed_up');
    expect(insertResult.rows[0].pilot_cohort).toBe('cohort-1');
    expect(insertResult.rows[0].trial_cta_sent).toBe(false);

    // Verify record exists after insert
    const afterResult = await pool.query(
      'SELECT * FROM pilot_progress WHERE agent_id = $1',
      [testAgentId]
    );
    expect(afterResult.rows.length).toBe(1);
  });

  it('should prevent duplicate pilot_progress records for same agent', async () => {
    // Try to insert another record for the same agent
    await expect(
      pool.query(
        `INSERT INTO pilot_progress (agent_id, stage, pilot_cohort)
         VALUES ($1, 'trial_started', 'cohort-1')`,
        [testAgentId]
      )
    ).rejects.toThrow(/duplicate key value violates unique constraint/);
  });

  it('should support all valid pilot stages', async () => {
    const validStages = [
      'signed_up',
      'email_verified',
      'fub_connected',
      'first_lead_responded',
      'aha_moment',
      'trial_started',
      'paid'
    ];

    // Create a second test agent
    const email2 = `test-pilot-2-${Date.now()}@example.com`;
    const agent2Result = await pool.query(
      `INSERT INTO real_estate_agents (email, password_hash, first_name, last_name, status)
       VALUES ($1, 'test_hash', 'Test', 'Pilot2', 'onboarding')
       RETURNING id`,
      [email2]
    );
    const agent2Id = agent2Result.rows[0].id;

    try {
      for (const stage of validStages) {
        // Create record with each stage
        await pool.query(
          `UPDATE pilot_progress SET stage = $1 WHERE agent_id = $2`,
          [stage, testAgentId]
        );

        const result = await pool.query(
          'SELECT stage FROM pilot_progress WHERE agent_id = $1',
          [testAgentId]
        );
        expect(result.rows[0].stage).toBe(stage);
      }
    } finally {
      // Cleanup second agent
      await pool.query('DELETE FROM pilot_progress WHERE agent_id = $1', [agent2Id]);
      await pool.query('DELETE FROM real_estate_agents WHERE id = $1', [agent2Id]);
    }
  });
});

describe('pilot_progress schema', () => {
  let pool;

  beforeAll(() => {
    pool = createPool();
  });

  afterAll(async () => {
    await pool.end();
  });

  it('should have required columns', async () => {
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'pilot_progress'
      ORDER BY ordinal_position
    `);

    const columns = result.rows.map(r => r.column_name);
    expect(columns).toContain('id');
    expect(columns).toContain('agent_id');
    expect(columns).toContain('stage');
    expect(columns).toContain('stage_entered_at');
    expect(columns).toContain('pilot_cohort');
    expect(columns).toContain('trial_cta_sent');
  });

  it('should have unique constraint on agent_id', async () => {
    const result = await pool.query(`
      SELECT constraint_name, constraint_type
      FROM information_schema.table_constraints
      WHERE table_name = 'pilot_progress'
      AND constraint_type = 'UNIQUE'
    `);

    const constraints = result.rows.map(r => r.constraint_name);
    expect(constraints.some(c => c.includes('agent_id'))).toBe(true);
  });
});
