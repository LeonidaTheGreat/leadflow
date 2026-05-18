'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

describe('feat-subscription-funnel-tracking workflow task registration', () => {
  const tasksPath = path.join(root, '.local-tasks.json');
  const specPath = path.join(root, 'docs/task-specs/feat-subscription-funnel-tracking-workflow-task.md');

  let tasks;

  beforeAll(() => {
    const raw = fs.readFileSync(tasksPath, 'utf8');
    tasks = JSON.parse(raw);
  });

  test('`.local-tasks.json` is valid JSON', () => {
    expect(Array.isArray(tasks)).toBe(true);
  });

  test('Exactly one task with id `feat-subscription-funnel-tracking-workflow-task`', () => {
    const matches = tasks.filter(t => t.id === 'feat-subscription-funnel-tracking-workflow-task');
    expect(matches.length).toBe(1);
  });

  test('Task `spec_path` points to correct file', () => {
    const task = tasks.find(t => t.id === 'feat-subscription-funnel-tracking-workflow-task');
    expect(task.spec_path).toBe('docs/task-specs/feat-subscription-funnel-tracking-workflow-task.md');
  });

  test('Task `status` is `pending`', () => {
    const task = tasks.find(t => t.id === 'feat-subscription-funnel-tracking-workflow-task');
    expect(task.status).toBe('pending');
  });

  test('Task `owner` is `dev`', () => {
    const task = tasks.find(t => t.id === 'feat-subscription-funnel-tracking-workflow-task');
    expect(task.owner).toBe('dev');
  });

  test('Task `use_case_id` is `feat-subscription-funnel-tracking`', () => {
    const task = tasks.find(t => t.id === 'feat-subscription-funnel-tracking-workflow-task');
    expect(task.use_case_id).toBe('feat-subscription-funnel-tracking');
  });

  test('Spec file exists on disk', () => {
    expect(fs.existsSync(specPath)).toBe(true);
  });

  test('Spec file has non-trivial content (>= 500 bytes)', () => {
    const stat = fs.statSync(specPath);
    expect(stat.size).toBeGreaterThanOrEqual(500);
  });

  test('Spec file references checkout abandonment recovery', () => {
    const content = fs.readFileSync(specPath, 'utf8');
    expect(content.toLowerCase()).toContain('abandonment');
  });

  test('No runtime JS files reference the task id', () => {
    function walkDir(dir, ext) {
      if (!fs.existsSync(dir)) return [];
      const results = [];
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) results.push(...walkDir(full, ext));
        else if (entry.name.endsWith(ext)) results.push(full);
      }
      return results;
    }

    const jsFiles = [
      path.join(root, 'server.js'),
      ...walkDir(path.join(root, 'routes'), '.js'),
      ...walkDir(path.join(root, 'lib'), '.js'),
    ].filter(f => fs.existsSync(f));

    for (const f of jsFiles) {
      const content = fs.readFileSync(f, 'utf8');
      expect(content).not.toContain('feat-subscription-funnel-tracking-workflow-task');
    }
  });
});
