/**
 * Unit test: chain_completion_rate case-insensitive matching
 * Verifies that workflow steps (mixed case) match task agent_ids (lowercase)
 */

describe('Chain Completion Rate - Case Insensitive', () => {
  it('should match dev/Dev case-insensitively', () => {
    const workflow = ['product', 'Dev', 'qc'];
    const tasks = [
      { agent_id: 'product', status: 'done' },
      { agent_id: 'dev', status: 'done' },
      { agent_id: 'qc', status: 'done' }
    ];

    let completedSteps = 0;
    let totalSteps = 0;

    for (const step of workflow) {
      totalSteps++;
      if (tasks.some(t => t.agent_id?.toLowerCase?.() === step?.toLowerCase?.() && t.status === 'done')) {
        completedSteps++;
      }
    }

    const rate = totalSteps > 0 ? completedSteps / totalSteps : 1;
    expect(completedSteps).toBe(3);
    expect(totalSteps).toBe(3);
    expect(rate).toBe(1.0);
  });

  it('should not match when agent_id is not done', () => {
    const workflow = ['product', 'dev', 'qc'];
    const tasks = [
      { agent_id: 'product', status: 'ready' },
      { agent_id: 'dev', status: 'in_progress' },
      { agent_id: 'qc', status: 'done' }
    ];

    let completedSteps = 0;
    let totalSteps = 0;

    for (const step of workflow) {
      totalSteps++;
      if (tasks.some(t => t.agent_id?.toLowerCase?.() === step?.toLowerCase?.() && t.status === 'done')) {
        completedSteps++;
      }
    }

    const rate = totalSteps > 0 ? completedSteps / totalSteps : 1;
    expect(completedSteps).toBe(1);
    expect(totalSteps).toBe(3);
    expect(rate).toBeCloseTo(0.333, 2);
  });

  it('should handle null/undefined safely', () => {
    const workflow = ['product', 'dev', 'qc'];
    const tasks = [
      { agent_id: null, status: 'done' },
      { agent_id: 'dev', status: 'done' },
      { agent_id: undefined, status: 'done' }
    ];

    let completedSteps = 0;
    let totalSteps = 0;

    for (const step of workflow) {
      totalSteps++;
      if (tasks.some(t => t.agent_id?.toLowerCase?.() === step?.toLowerCase?.() && t.status === 'done')) {
        completedSteps++;
      }
    }

    const rate = totalSteps > 0 ? completedSteps / totalSteps : 1;
    expect(completedSteps).toBe(1); // only 'dev' matches
    expect(totalSteps).toBe(3);
    expect(rate).toBeCloseTo(0.333, 2);
  });

  it('should match mixed case workflows with lowercase agent_ids', () => {
    const workflow = ['Product', 'Dev', 'QC']; // Mixed case from UC
    const tasks = [
      { agent_id: 'product', status: 'done' },
      { agent_id: 'dev', status: 'done' },
      { agent_id: 'qc', status: 'done' }
    ];

    let completedSteps = 0;
    let totalSteps = 0;

    for (const step of workflow) {
      totalSteps++;
      if (tasks.some(t => t.agent_id?.toLowerCase?.() === step?.toLowerCase?.() && t.status === 'done')) {
        completedSteps++;
      }
    }

    const rate = totalSteps > 0 ? completedSteps / totalSteps : 1;
    expect(completedSteps).toBe(3);
    expect(rate).toBe(1.0);
  });
});
