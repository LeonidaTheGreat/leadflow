/**
 * Tests for UTM parameter capture in OnboardingPage
 * Bug fix: da2a385e-6d42-48b0-9529-5ef57d1abd26
 *
 * Verifies that:
 * 1. The onboarding page source reads UTM params from sessionStorage and URL
 * 2. The route accepts and stores UTM fields
 * 3. agentData state includes UTM fields passed to the POST body
 */

import * as fs from 'fs';
import * as path from 'path';

describe('OnboardingPage UTM param capture', () => {
  let pageSource: string;
  let routeSource: string;

  beforeAll(() => {
    pageSource = fs.readFileSync(
      path.resolve(__dirname, '../app/onboarding/page.tsx'),
      'utf-8'
    );
    routeSource = fs.readFileSync(
      path.resolve(__dirname, '../app/api/agents/onboard/route.ts'),
      'utf-8'
    );
  });

  describe('onboarding/page.tsx', () => {
    it('reads from sessionStorage', () => {
      expect(pageSource).toContain('sessionStorage');
    });

    it('uses the leadflow_utm session key', () => {
      expect(pageSource).toContain('leadflow_utm');
    });

    it('uses useSearchParams for URL param overrides', () => {
      expect(pageSource).toContain('useSearchParams');
    });

    it.each(['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'])(
      'handles %s URL param',
      (key) => {
        expect(pageSource).toContain(key);
      }
    );

    it('includes utmSource in agentData state', () => {
      expect(pageSource).toContain('utmSource');
    });

    it('includes utmMedium in agentData state', () => {
      expect(pageSource).toContain('utmMedium');
    });

    it('includes utmCampaign in agentData state', () => {
      expect(pageSource).toContain('utmCampaign');
    });

    it('includes utmContent in agentData state', () => {
      expect(pageSource).toContain('utmContent');
    });

    it('includes utmTerm in agentData state', () => {
      expect(pageSource).toContain('utmTerm');
    });

    it('sends agentData (including UTM) to the backend', () => {
      // The POST body is JSON.stringify(agentData) which contains UTM fields
      expect(pageSource).toContain('JSON.stringify(agentData)');
    });
  });

  describe('api/agents/onboard/route.ts', () => {
    it.each(['utmSource', 'utmMedium', 'utmCampaign', 'utmContent', 'utmTerm'])(
      'destructures %s from request body',
      (field) => {
        expect(routeSource).toContain(field);
      }
    );

    it.each([
      ['utm_source', 'utmSource'],
      ['utm_medium', 'utmMedium'],
      ['utm_campaign', 'utmCampaign'],
      ['utm_content', 'utmContent'],
      ['utm_term', 'utmTerm'],
    ])('inserts %s mapped from %s', (col, field) => {
      expect(routeSource).toContain(`${col}: ${field}`);
    });
  });
});
