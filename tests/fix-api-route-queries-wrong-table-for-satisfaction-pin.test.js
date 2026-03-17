/**
 * Tests for fix: API route queries wrong table for satisfaction_ping_enabled
 * Task: 907d1165-9565-4603-b2d1-3cacfd8ca414
 *
 * Verifies that /api/agents/satisfaction-ping uses the `agents` table (not `real_estate_agents`)
 * for both GET and PATCH handlers, as satisfaction_ping_enabled lives on the agents table
 * per migration 008.
 */

const fs = require('fs');
const path = require('path');

const ROUTE_FILE = path.join(
  __dirname,
  '../product/lead-response/dashboard/app/api/agents/satisfaction-ping/route.ts'
);

describe('fix-api-route-queries-wrong-table-for-satisfaction-ping', () => {
  let routeSource;

  beforeAll(() => {
    routeSource = fs.readFileSync(ROUTE_FILE, 'utf8');
  });

  test('route file exists', () => {
    expect(fs.existsSync(ROUTE_FILE)).toBe(true);
  });

  test('does NOT reference real_estate_agents table', () => {
    expect(routeSource).not.toContain("from('real_estate_agents')");
    expect(routeSource).not.toContain('from("real_estate_agents")');
  });

  test('PATCH handler uses agents table', () => {
    // Find PATCH function block and confirm it references agents
    const patchIdx = routeSource.indexOf('export async function PATCH');
    const patchBlock = routeSource.slice(patchIdx, patchIdx + 800);
    expect(patchBlock).toContain(".from('agents')");
  });

  test('GET handler uses agents table', () => {
    const getIdx = routeSource.indexOf('export async function GET');
    const getBlock = routeSource.slice(getIdx, getIdx + 600);
    expect(getBlock).toContain(".from('agents')");
  });

  test('both handlers select satisfaction_ping_enabled', () => {
    const occurrences = (routeSource.match(/satisfaction_ping_enabled/g) || []).length;
    // Should appear in PATCH update, PATCH select, GET select, GET response, PATCH response = at least 4
    expect(occurrences).toBeGreaterThanOrEqual(4);
  });
});
