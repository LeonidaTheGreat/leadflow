import * as fs from 'fs';
import * as path from 'path';

const DASHBOARD_ROOT = path.resolve(__dirname, '..', '..');
const REPO_ROOT = path.resolve(DASHBOARD_ROOT, '..', '..', '..');

describe('Vercel deployment configuration guard', () => {
  test('dashboard vercel.json must not reference server.js', () => {
    const configPath = path.join(DASHBOARD_ROOT, 'vercel.json');
    expect(fs.existsSync(configPath)).toBe(true);

    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const builds = config.builds || [];
    const serverBuilds = builds.filter((b: { src?: string }) => b.src && b.src.includes('server.js'));
    expect(serverBuilds).toHaveLength(0);
  });

  test('dashboard .vercel/project.json must be linked to leadflow-ai', () => {
    const projectPath = path.join(DASHBOARD_ROOT, '.vercel', 'project.json');
    expect(fs.existsSync(projectPath)).toBe(true);

    const project = JSON.parse(fs.readFileSync(projectPath, 'utf-8'));
    expect(project.projectName).toBe('leadflow-ai');
  });

  test('root vercel.json must be linked to fub-inbound-webhook (not dashboard)', () => {
    const projectPath = path.join(REPO_ROOT, '.vercel', 'project.json');
    if (!fs.existsSync(projectPath)) return;

    const project = JSON.parse(fs.readFileSync(projectPath, 'utf-8'));
    expect(project.projectName).toBe('fub-inbound-webhook');
  });

  test('dashboard package.json has next build script', () => {
    const pkgPath = path.join(DASHBOARD_ROOT, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    expect(pkg.scripts.build).toBe('next build');
  });

  test('validate-env.js contains wrong-project guard', () => {
    const envScriptPath = path.join(DASHBOARD_ROOT, 'scripts', 'validate-env.js');
    const content = fs.readFileSync(envScriptPath, 'utf-8');
    expect(content).toContain('WRONG_PROJECT');
    expect(content).toContain('leadflow-ai');
  });

  test('validate-env.js contains build-context directory guard', () => {
    const envScriptPath = path.join(DASHBOARD_ROOT, 'scripts', 'validate-env.js');
    const content = fs.readFileSync(envScriptPath, 'utf-8');
    expect(content).toContain('BUILD CONTEXT ERROR');
    expect(content).toContain('next.config');
    expect(content).toContain('server.js');
  });
});
