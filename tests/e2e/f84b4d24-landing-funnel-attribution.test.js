'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const DASHBOARD_ROOT = path.join(__dirname, '../../product/lead-response/dashboard');
const trialSignupFormPath = path.join(DASHBOARD_ROOT, 'components/trial-signup-form.tsx');
const trialSignupRoutePath = path.join(DASHBOARD_ROOT, 'app/api/auth/trial-signup/route.ts');
const eventsTrackRoutePath = path.join(DASHBOARD_ROOT, 'app/api/events/track/route.ts');
const landingPagePath = path.join(DASHBOARD_ROOT, 'app/page.tsx');

const trialSignupFormSource = fs.readFileSync(trialSignupFormPath, 'utf8');
const trialSignupRouteSource = fs.readFileSync(trialSignupRoutePath, 'utf8');
const eventsTrackRouteSource = fs.readFileSync(eventsTrackRoutePath, 'utf8');
const landingPageSource = fs.readFileSync(landingPagePath, 'utf8');

test('trial signup form forwards explicit source attribution in POST body', () => {
  assert.ok(
    trialSignupFormSource.includes("const signupSource = searchParams.get('source') || 'landing_page'"),
    'Expected signup source derivation from query param with landing_page fallback'
  );

  assert.ok(
    trialSignupFormSource.includes('source: signupSource'),
    'Expected signup request body to include source: signupSource'
  );
});

test('trial signup form emits diagnostics events for failures', () => {
  assert.ok(
    trialSignupFormSource.includes("trackFunnelEvent('trial_signup_validation_failed'"),
    'Expected validation failure event tracking'
  );

  assert.ok(
    trialSignupFormSource.includes("trackFunnelEvent('trial_signup_api_failed'"),
    'Expected API failure event tracking'
  );
});

test('trial signup API stores and logs dynamic signup source', () => {
  assert.ok(
    trialSignupRouteSource.includes('const signupSource = typeof source === \'string\''),
    'Expected route to derive normalized signupSource from request payload'
  );

  assert.ok(
    trialSignupRouteSource.includes('source: signupSource'),
    'Expected real_estate_agents insert/event payload to use signupSource'
  );
});

test('events track allowlist includes new landing funnel events', () => {
  const expectedEvents = [
    'landing_page_viewed',
    'trial_signup_validation_failed',
    'trial_signup_api_failed',
  ];

  expectedEvents.forEach((eventName) => {
    assert.ok(
      eventsTrackRouteSource.includes(`'${eventName}'`),
      `Expected ${eventName} in /api/events/track allowlist`
    );
  });
});

test('landing page emits landing_page_viewed analytics event on mount', () => {
  assert.ok(
    landingPageSource.includes("event: 'landing_page_viewed'"),
    'Expected landing page to track landing_page_viewed event'
  );
});
