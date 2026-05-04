'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../../');

describe('Vercel project.json config', () => {
  it('root .vercel/project.json exists and points to fub-inbound-webhook', () => {
    const file = path.join(ROOT, '.vercel/project.json');
    expect(fs.existsSync(file)).toBe(true);
    const config = JSON.parse(fs.readFileSync(file, 'utf8'));
    expect(config.projectName).toBe('fub-inbound-webhook');
    expect(config.projectId).toBe('prj_W7P97ggE1vbIAZujq8CxSyCBwcIe');
    expect(config.orgId).toBeTruthy();
  });

  it('dashboard .vercel/project.json exists and points to leadflow-ai', () => {
    const file = path.join(ROOT, 'product/lead-response/dashboard/.vercel/project.json');
    expect(fs.existsSync(file)).toBe(true);
    const config = JSON.parse(fs.readFileSync(file, 'utf8'));
    expect(config.projectName).toBe('leadflow-ai');
    expect(config.projectId).toBe('prj_p9ZX952UhE1cl1PYZAgVW53FqVm9');
    expect(config.orgId).toBeTruthy();
  });

  it('root .vercel/project.json does not point to deleted project prj_4KZAAPgTAWfhpEFJXO9zhJIZZfmh', () => {
    const file = path.join(ROOT, '.vercel/project.json');
    const config = JSON.parse(fs.readFileSync(file, 'utf8'));
    expect(config.projectId).not.toBe('prj_4KZAAPgTAWfhpEFJXO9zhJIZZfmh');
    expect(config.projectName).not.toBe('leadflow');
  });
});
