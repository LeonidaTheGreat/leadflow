# LeadFlow Onboarding UI - E2E Test Suite

Comprehensive end-to-end test suite for the Agent Onboarding UI flow.

## Overview

This test suite covers all critical paths of the Agent Onboarding experience:
- Multi-step wizard navigation
- Form validation (field-level, step-level, submission)
- API integration (auto-save, email check, Cal.com, Twilio)
- Error handling (network failures, server errors, timeouts)
- Success flow completion
- Mobile responsive behavior

## Test Statistics

| Category | Test Count | Coverage |
|----------|------------|----------|
| Navigation | 10 tests | Step progression, progress bar, indicators |
| Validation | 18 tests | All field types, real-time feedback |
| API Integration | 13 tests | Email check, auto-save, retry logic, integrations |
| Error Handling | 20 tests | Network, server, timeout, validation errors |
| Success Flow | 16 tests | Complete flow, dashboard redirect, analytics |
| Mobile Responsive | 19 tests | Layout, touch targets, navigation, performance |
| **Total** | **96 tests** | **Comprehensive coverage** |

## Quick Start

### Prerequisites
```bash
# Install dependencies
cd e2e
npm install

# Install Playwright browsers
npx playwright install chromium firefox webkit
```

### Run All Tests
```bash
# Run all tests
npm test

# Or use the runner script
node run-e2e-tests.js
```

### Run Specific Test Categories
```bash
# Navigation tests only
node run-e2e-tests.js --navigation

# Validation tests only
node run-e2e-tests.js --validation

# API integration tests only
node run-e2e-tests.js --api

# Error handling tests only
node run-e2e-tests.js --error

# Success flow tests only
node run-e2e-tests.js --success

# Mobile/responsive tests only
node run-e2e-tests.js --mobile
```

### Run Against Different Environments
```bash
# Run against staging
node run-e2e-tests.js --env=https://staging.leadflow.ai

# Run against local dev server
node run-e2e-tests.js --env=http://localhost:5173
```

### Debug Mode
```bash
# Run in headed mode (see the browser)
node run-e2e-tests.js --headed

# Run with UI mode
npx playwright test --ui

# Run with debug mode
npx playwright test --debug
```

## Test Structure

```
e2e/
├── tests/
│   ├── fixtures.ts                    # Test utilities & page objects
│   ├── onboarding-navigation.spec.ts  # Multi-step wizard tests
│   ├── onboarding-validation.spec.ts  # Form validation tests
│   ├── onboarding-api.spec.ts         # API integration tests
│   ├── onboarding-error-handling.spec.ts  # Error handling tests
│   ├── onboarding-success.spec.ts     # Success flow tests
│   └── onboarding-mobile.spec.ts      # Mobile responsive tests
├── playwright.config.ts               # Playwright configuration
├── package.json                       # Dependencies
└── run-e2e-tests.js                   # Test runner script
```

## Test Tags

Use tags to filter tests:

| Tag | Description |
|-----|-------------|
| `@happy-path` | Happy path scenarios |
| `@error` | Error scenarios |
| `@validation` | Validation tests |
| `@api` | API integration tests |
| `@navigation` | Navigation tests |
| `@mobile` | Mobile responsive tests |
| `@e2e` | End-to-end flow tests |
| `@ui` | UI/UX tests |
| `@performance` | Performance tests |
| `@accessibility` | Accessibility tests |

### Run Tests by Tag
```bash
# Run all happy path tests
npx playwright test --grep "@happy-path"

# Run all error handling tests
npx playwright test --grep "@error"

# Run all API tests
npx playwright test --grep "@api"
```

## Test Environments

Tests run against multiple browsers:
- Chromium (Desktop Chrome)
- Firefox (Desktop Firefox)
- WebKit (Desktop Safari)
- Mobile Chrome (Pixel 5)
- Mobile Safari (iPhone 12)
- Tablet (iPad)

## Configuration

### Environment Variables

Create a `.env` file in the `e2e/` directory:

```env
TEST_BASE_URL=https://leadflow-ai-five.vercel.app
TEST_AGENT_EMAIL=test-agent@example.com
TEST_AGENT_PASSWORD=TestPass123!
```

### Playwright Config

Key settings in `playwright.config.ts`:
- Base URL: Points to deployed environment
- Retries: 2 retries on CI, 1 locally
- Workers: Sequential execution for onboarding flow
- Screenshots: Captured on failure
- Videos: Retained on failure
- Traces: Collected on first retry

## Reporting

### HTML Report
```bash
# Generate and open HTML report
node run-e2e-tests.js --report

# Or manually
npx playwright test --reporter=html
npx playwright show-report
```

### JSON Report
```bash
npx playwright test --reporter=json
```

### View Trace
```bash
# Traces are saved for failed tests
npx playwright show-trace trace.zip
```

## CI/CD Integration

```yaml
# GitHub Actions example
- name: Run E2E Tests
  run: |
    cd e2e
    npm ci
    npx playwright install --with-deps
    npm test
  env:
    TEST_BASE_URL: ${{ vars.TEST_BASE_URL }}
```

## Known Issues & Limitations

1. **Email Availability Tests**: May require test data seeding for duplicate email scenarios
2. **Twilio SMS Tests**: Requires valid Twilio credentials in the test environment
3. **Cal.com Verification**: May fail if Cal.com is down or rate-limiting
4. **Auto-save Tests**: Relies on 2-second interval; timing may vary

## Debugging

### View Test Output
```bash
# Run with verbose output
npx playwright test --reporter=line --verbose
```

### Run Single Test
```bash
npx playwright test --grep "should complete full onboarding"
```

### Debug Specific Test
```bash
npx playwright test --debug --grep "should complete full onboarding"
```

## Maintenance

### Adding New Tests
1. Add tests to appropriate spec file
2. Use descriptive test names
3. Add relevant tags
4. Update this README with new test count

### Updating Selectors
If UI changes break tests:
1. Update selectors in `tests/fixtures.ts`
2. Re-run full test suite
3. Verify all tests pass

## Test Results Summary

### Acceptance Criteria Coverage

| Requirement | Tests | Status |
|-------------|-------|--------|
| Multi-step wizard navigation | 10 | ✅ Complete |
| Form validation flows | 18 | ✅ Complete |
| API integration tests | 13 | ✅ Complete |
| Error handling | 20 | ✅ Complete |
| Success flow completion | 16 | ✅ Complete |
| Mobile responsive behavior | 19 | ✅ Complete |

**Total: 96 E2E Tests**

### Target Metrics

| Metric | Target | Current |
|--------|--------|---------|
| Minimum Tests | 15 | 96 ✅ |
| Pass Rate | 90%+ | TBD |
| Coverage | Critical paths | Complete ✅ |

## Support

For issues or questions about the E2E test suite, contact the QA team or check the Playwright documentation at https://playwright.dev
