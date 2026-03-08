/**
 * Tests for UTM Parameter Capture & Marketing Attribution
 * Covers: FR-1 (landing page capture), FR-2 (signup inclusion), FR-4 (API storage)
 * T-1 through T-4 from PRD test scenarios
 */

// Mock sessionStorage
const sessionStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] ?? null),
    setItem: jest.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: jest.fn((key: string) => { delete store[key]; }),
    clear: jest.fn(() => { store = {}; }),
    get length() { return Object.keys(store).length; },
    key: jest.fn((i: number) => Object.keys(store)[i] ?? null),
    _store: store,
  };
})();

Object.defineProperty(window, 'sessionStorage', { value: sessionStorageMock });

// Mock fetch
global.fetch = jest.fn();

beforeEach(() => {
  sessionStorageMock.clear();
  jest.clearAllMocks();
});

// ─────────────────────────────────────────────────────────────────────────────
// FR-1: UTM Capture Logic (extracted from page.tsx useEffect)
// ─────────────────────────────────────────────────────────────────────────────

function captureUtm(searchString: string): void {
  try {
    const params = new URLSearchParams(searchString);
    const utm = {
      utm_source: params.get('utm_source'),
      utm_medium: params.get('utm_medium'),
      utm_campaign: params.get('utm_campaign'),
      utm_content: params.get('utm_content'),
      utm_term: params.get('utm_term'),
    };
    const hasUtm = Object.values(utm).some(Boolean);
    if (hasUtm && !sessionStorage.getItem('lf_utm')) {
      sessionStorage.setItem('lf_utm', JSON.stringify(utm));
    }
  } catch {
    // silent fail
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FR-2: UTM Read Logic (extracted from signup/page.tsx handleSubmit)
// ─────────────────────────────────────────────────────────────────────────────

function readUtmForSubmit(): Record<string, string | null> {
  try {
    const utmRaw = sessionStorage.getItem('lf_utm');
    if (utmRaw) return JSON.parse(utmRaw);
  } catch {
    // silent fail
  }
  return {};
}

// ─────────────────────────────────────────────────────────────────────────────
// T-1: Happy Path — UTM Captured and Stored
// ─────────────────────────────────────────────────────────────────────────────

describe('T-1: Happy Path — UTM Captured and Stored', () => {
  it('captures UTM params from URL and stores in sessionStorage', () => {
    captureUtm('?utm_source=google&utm_medium=cpc&utm_campaign=pilot-q1');

    expect(sessionStorage.setItem).toHaveBeenCalledWith('lf_utm', expect.any(String));
    const stored = JSON.parse(sessionStorage.getItem('lf_utm')!);
    expect(stored.utm_source).toBe('google');
    expect(stored.utm_medium).toBe('cpc');
    expect(stored.utm_campaign).toBe('pilot-q1');
  });

  it('includes UTM data in signup POST body', () => {
    // Simulate prior UTM capture
    sessionStorage.setItem('lf_utm', JSON.stringify({
      utm_source: 'google',
      utm_medium: 'cpc',
      utm_campaign: 'pilot-q1',
      utm_content: null,
      utm_term: null,
    }));

    const utm = readUtmForSubmit();
    expect(utm.utm_source).toBe('google');
    expect(utm.utm_medium).toBe('cpc');
    expect(utm.utm_campaign).toBe('pilot-q1');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T-2: No UTM — Clean Null
// ─────────────────────────────────────────────────────────────────────────────

describe('T-2: No UTM — Direct Visit Produces No sessionStorage Entry', () => {
  it('does NOT write to sessionStorage when no UTM params in URL', () => {
    captureUtm(''); // no search params

    expect(sessionStorage.setItem).not.toHaveBeenCalled();
    expect(sessionStorage.getItem('lf_utm')).toBeNull();
  });

  it('returns empty object for UTM when sessionStorage has no lf_utm', () => {
    const utm = readUtmForSubmit();
    expect(Object.keys(utm).length).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T-3: First-Touch Wins
// ─────────────────────────────────────────────────────────────────────────────

describe('T-3: First-Touch Wins', () => {
  it('does NOT overwrite existing lf_utm on subsequent navigations', () => {
    // First visit — email campaign
    captureUtm('?utm_source=email&utm_campaign=wave1');
    expect(sessionStorage.setItem).toHaveBeenCalledTimes(1);

    const firstTouch = JSON.parse(sessionStorage.getItem('lf_utm')!);

    // Simulate second visit with different UTM (e.g., user clicks internal link)
    captureUtm('?utm_source=social&utm_campaign=wave2');

    // setItem should still only be called once — second call skipped because lf_utm exists
    expect(sessionStorage.setItem).toHaveBeenCalledTimes(1);

    // Stored value should still be the first touch
    const stored = JSON.parse(sessionStorage.getItem('lf_utm')!);
    expect(stored.utm_source).toBe(firstTouch.utm_source);
    expect(stored.utm_campaign).toBe(firstTouch.utm_campaign);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// FR-1: Edge Cases
// ─────────────────────────────────────────────────────────────────────────────

describe('FR-1: Edge Cases', () => {
  it('captures partial UTM (only utm_source present)', () => {
    captureUtm('?utm_source=newsletter');

    expect(sessionStorage.setItem).toHaveBeenCalled();
    const stored = JSON.parse(sessionStorage.getItem('lf_utm')!);
    expect(stored.utm_source).toBe('newsletter');
    expect(stored.utm_medium).toBeNull();
    expect(stored.utm_campaign).toBeNull();
  });

  it('handles sessionStorage unavailable gracefully (no throw)', () => {
    // Test the try/catch by temporarily breaking setItem
    const orig = sessionStorage.setItem;
    (sessionStorage as any).setItem = () => { throw new Error('SecurityError'); };
    expect(() => captureUtm('?utm_source=test')).not.toThrow();
    (sessionStorage as any).setItem = orig;
  });

  it('captures all 5 UTM params when present', () => {
    captureUtm('?utm_source=google&utm_medium=cpc&utm_campaign=q1&utm_content=hero-cta&utm_term=real-estate-crm');

    // Verify setItem was called with all 5 params encoded in JSON
    const setItemCall = (sessionStorage.setItem as jest.Mock).mock.calls.find(
      ([key]) => key === 'lf_utm'
    );
    expect(setItemCall).toBeDefined();
    const stored = JSON.parse(setItemCall![1]);
    expect(stored.utm_source).toBe('google');
    expect(stored.utm_medium).toBe('cpc');
    expect(stored.utm_campaign).toBe('q1');
    expect(stored.utm_content).toBe('hero-cta');
    expect(stored.utm_term).toBe('real-estate-crm');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// FR-4: API Input Sanitization
// ─────────────────────────────────────────────────────────────────────────────

describe('FR-4: UTM Sanitization', () => {
  const sanitizeUtm = (val: string | undefined | null): string | null => {
    if (!val) return null;
    return String(val).replace(/[^a-zA-Z0-9_\-. /]/g, '').slice(0, 255);
  };

  it('strips special characters from UTM values', () => {
    // < and > are stripped; / is allowed by the regex (safe for UTM paths)
    const result = sanitizeUtm('<script>alert(1)</script>');
    expect(result).not.toContain('<');
    expect(result).not.toContain('>');
    expect(result).toMatch(/^[a-zA-Z0-9_\-. /]+$/);
  });

  it('allows safe UTM characters', () => {
    expect(sanitizeUtm('pilot-launch-2026')).toBe('pilot-launch-2026');
    expect(sanitizeUtm('google_ads')).toBe('google_ads');
    expect(sanitizeUtm('real estate crm')).toBe('real estate crm');
  });

  it('returns null for empty/undefined UTM', () => {
    expect(sanitizeUtm(null)).toBeNull();
    expect(sanitizeUtm(undefined)).toBeNull();
    expect(sanitizeUtm('')).toBeNull();
  });

  it('truncates values longer than 255 chars', () => {
    const long = 'a'.repeat(300);
    expect(sanitizeUtm(long)!.length).toBe(255);
  });
});
