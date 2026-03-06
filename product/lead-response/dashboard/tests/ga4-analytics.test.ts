/**
 * GA4 Analytics Utility Tests
 *
 * Tests for GA4 event tracking, UTM capture, and scroll-depth helpers.
 */

import {
  trackEvent,
  trackJoinPilotClick,
  trackSeeHowItWorksClick,
  trackFormOpen,
  trackFormSubmission,
  trackScrollDepth,
  captureUTMParams,
  persistUTMParams,
  retrieveUTMParams,
} from '../lib/analytics/ga4';

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

const mockGtag = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  // Inject a mock gtag on window
  (window as unknown as Record<string, unknown>).gtag = mockGtag;
});

afterEach(() => {
  delete (window as unknown as Record<string, unknown>).gtag;
  sessionStorage.clear();
});

// --------------------------------------------------------------------------
// trackEvent
// --------------------------------------------------------------------------

describe('trackEvent', () => {
  it('calls window.gtag with the event name and params', () => {
    trackEvent('test_event', { foo: 'bar' });
    expect(mockGtag).toHaveBeenCalledWith('event', 'test_event', { foo: 'bar' });
  });

  it('calls window.gtag with an empty params object when none provided', () => {
    trackEvent('test_event');
    expect(mockGtag).toHaveBeenCalledWith('event', 'test_event', {});
  });

  it('does not throw when window.gtag is not defined', () => {
    delete (window as unknown as Record<string, unknown>).gtag;
    expect(() => trackEvent('test_event')).not.toThrow();
  });
});

// --------------------------------------------------------------------------
// CTA tracking helpers
// --------------------------------------------------------------------------

describe('trackJoinPilotClick', () => {
  it('fires join_pilot event with cta_location', () => {
    trackJoinPilotClick('hero');
    expect(mockGtag).toHaveBeenCalledWith('event', 'join_pilot', { cta_location: 'hero' });
  });
});

describe('trackSeeHowItWorksClick', () => {
  it('fires see_how_it_works event with cta_location=hero', () => {
    trackSeeHowItWorksClick();
    expect(mockGtag).toHaveBeenCalledWith('event', 'see_how_it_works', { cta_location: 'hero' });
  });
});

// --------------------------------------------------------------------------
// Form tracking helpers
// --------------------------------------------------------------------------

describe('trackFormOpen', () => {
  it('fires form_open event with form_id=pilot_signup', () => {
    trackFormOpen();
    expect(mockGtag).toHaveBeenCalledWith('event', 'form_open', { form_id: 'pilot_signup' });
  });
});

describe('trackFormSubmission', () => {
  it('fires form_submission event with form_id and utm params', () => {
    const utmParams = { utm_source: 'google', utm_medium: 'cpc', utm_campaign: 'pilot-launch' };
    trackFormSubmission(utmParams);
    expect(mockGtag).toHaveBeenCalledWith('event', 'form_submission', {
      form_id: 'pilot_signup',
      ...utmParams,
    });
  });

  it('fires form_submission with only form_id when no UTM params', () => {
    trackFormSubmission({});
    expect(mockGtag).toHaveBeenCalledWith('event', 'form_submission', { form_id: 'pilot_signup' });
  });
});

// --------------------------------------------------------------------------
// Scroll depth tracking
// --------------------------------------------------------------------------

describe('trackScrollDepth', () => {
  it('fires scroll_depth event with depth_percent', () => {
    trackScrollDepth(50);
    expect(mockGtag).toHaveBeenCalledWith('event', 'scroll_depth', { depth_percent: 50 });
  });
});

// --------------------------------------------------------------------------
// UTM helpers
// --------------------------------------------------------------------------

describe('captureUTMParams', () => {
  it('extracts all UTM params from search string', () => {
    const search = '?utm_source=google&utm_medium=cpc&utm_campaign=pilot&utm_content=ad1&utm_term=real+estate';
    const result = captureUTMParams(search);
    expect(result).toEqual({
      utm_source: 'google',
      utm_medium: 'cpc',
      utm_campaign: 'pilot',
      utm_content: 'ad1',
      utm_term: 'real estate',
    });
  });

  it('returns only present UTM params (ignores missing ones)', () => {
    const result = captureUTMParams('?utm_source=facebook');
    expect(result).toEqual({ utm_source: 'facebook' });
    expect(result).not.toHaveProperty('utm_medium');
  });

  it('returns empty object when no UTM params present', () => {
    const result = captureUTMParams('?foo=bar');
    expect(result).toEqual({});
  });

  it('returns empty object for empty search string', () => {
    const result = captureUTMParams('');
    expect(result).toEqual({});
  });
});

describe('persistUTMParams / retrieveUTMParams', () => {
  it('persists and retrieves UTM params via sessionStorage', () => {
    const utmParams = { utm_source: 'email', utm_campaign: 'onboarding' };
    persistUTMParams(utmParams);
    const retrieved = retrieveUTMParams();
    expect(retrieved).toEqual(utmParams);
  });

  it('returns empty object when nothing persisted', () => {
    sessionStorage.clear();
    const result = retrieveUTMParams();
    expect(result).toEqual({});
  });

  it('overwrites existing persisted params', () => {
    persistUTMParams({ utm_source: 'old' });
    persistUTMParams({ utm_source: 'new', utm_medium: 'cpc' });
    const result = retrieveUTMParams();
    expect(result).toEqual({ utm_source: 'new', utm_medium: 'cpc' });
  });
});
