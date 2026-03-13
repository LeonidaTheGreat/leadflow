# LeadFlow First Lead Simulation Test

## Overview

This end-to-end simulation test validates the complete lead flow from initial contact through booking. It simulates a real lead entering the system, triggering AI SMS responses, and booking a Cal.com appointment.

## What This Test Validates

### 1. Lead Webhook Reception (FUB)
- Simulates a lead being created in Follow Up Boss
- Sends webhook payload to the LeadFlow system
- Verifies webhook signature validation

### 2. Supabase Lead Storage
- Confirms lead is stored in the database
- Validates all lead fields are correctly mapped
- Checks lead status is set to 'new'

### 3. AI SMS Response
- Verifies AI generates an appropriate response
- Checks for compliance footer (STOP instructions)
- Validates personalization with lead's name
- Confirms message is saved to database

### 4. Cal.com Booking Integration
- Tests booking link generation
- Validates Cal.com API connectivity
- Simulates booking completion webhook
- Verifies booking is stored in Supabase

### 5. PostHog Event Tracking
- Confirms all expected events are tracked
- Validates event data structure
- Checks event coverage across the flow

### 6. SMS Delivery
- Verifies SMS message is processed
- Checks Twilio SID assignment
- Validates message status tracking

## Prerequisites

1. Node.js 18+ installed
2. All environment variables configured (see `.env.simulation.example`)
3. LeadFlow system deployed and accessible
4. Test environment with isolated data

## Installation

```bash
# Copy the environment template
cp .env.simulation.example .env.simulation

# Edit with your actual values
vim .env.simulation

# Install dependencies (if not already installed)
npm install dotenv
```

## Usage

### Basic Run
```bash
node first-lead-simulation.js
```

### With Verbose Logging
```bash
node first-lead-simulation.js --verbose
```

### Specify Environment
```bash
node first-lead-simulation.js --env=staging
```

### Full Options
```bash
node first-lead-simulation.js --verbose --env=production
```

## Test Output

### Console Output
The test outputs a detailed report to the console:
- Summary of all test results
- Pass/fail status for each test
- Duration for each test
- Any errors encountered
- Event tracking summary

### Report Files
Two files are generated in the project directory:

1. **JSON Report**: `first-lead-simulation-report-{timestamp}.json`
   - Complete test data
   - All logs
   - Event details
   - Raw API responses

2. **Markdown Report**: `first-lead-simulation-report-{timestamp}.md`
   - Human-readable summary
   - Integration issues found
   - Next steps

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | All tests passed |
| 1 | Partial success (1-2 tests failed) |
| 2 | Critical failure (3+ tests failed) |

## Test Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    SIMULATION TEST FLOW                          │
└─────────────────────────────────────────────────────────────────┘

1. ENVIRONMENT CHECK
   └─ Verify all required environment variables are set

2. LEAD WEBHOOK SIMULATION
   └─ Create test lead payload
   └─ Send to /api/webhook/fub
   └─ Verify 200 OK response

3. SUPABASE VALIDATION
   └─ Query leads table for test lead
   └─ Validate all fields
   └─ Confirm lead status = 'new'

4. AI SMS RESPONSE
   └─ Wait for AI processing
   └─ Query messages table
   └─ Verify outbound AI-generated message
   └─ Check compliance footer

5. CAL.COM BOOKING LINK
   └─ Test Cal.com API connectivity
   └─ Verify agent has calcom_username
   └─ Validate event types exist

6. BOOKING COMPLETION
   └─ Simulate Cal.com webhook
   └─ Send to /api/webhook/calcom
   └─ Verify booking stored in Supabase
   └─ Confirm lead status updated

7. POSTHOG EVENTS
   └─ Query events table
   └─ Validate expected event types
   └─ Calculate coverage percentage

8. SMS DELIVERY
   └─ Check message delivery status
   └─ Verify Twilio integration
   └─ Confirm message tracking
```

## Integration Issues Template

If the test finds issues, use this format to document them:

```markdown
## Issue: [Brief Description]

**Severity**: [Critical/High/Medium/Low]
**Component**: [FUB/Supabase/AI SMS/Cal.com/PostHog/Twilio]
**Test Failed**: [Test name]

### Expected Behavior
[What should happen]

### Actual Behavior
[What actually happened]

### Error Message
```
[Error details from logs]
```

### Steps to Reproduce
1. [Step 1]
2. [Step 2]
3. [Step 3]

### Impact
[How this affects the lead flow]

### Suggested Fix
[Your recommendation]

### Related Logs
[Relevant log entries]
```

## Troubleshooting

### "Lead not found in Supabase"
- Check webhook was received (verify URL is accessible)
- Verify Supabase credentials
- Check for errors in webhook processing
- Increase wait time between webhook and query

### "No AI SMS generated"
- Verify agent settings have auto_respond enabled
- Check AI service is configured
- Review AI generation logs
- Ensure lead has consent_sms = true

### "Cal.com API error"
- Verify CALCOM_API_KEY is valid
- Check Cal.com event types exist
- Ensure agent has calcom_username configured
- Verify webhook secret matches

### "SMS not sent"
- Check Twilio credentials
- Verify phone number format (E.164)
- Ensure lead is not on DNC list
- Review Twilio console for delivery status

## CI/CD Integration

Add to your pipeline:

```yaml
# GitHub Actions example
- name: Run First Lead Simulation
  run: node first-lead-simulation.js --verbose
  env:
    FUB_API_KEY: ${{ secrets.FUB_API_KEY }}
    SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
    # ... other env vars
```

## Maintenance

- Run this test after any significant deployment
- Update test data if lead schema changes
- Review and update expected events list
- Monitor test duration for performance regressions

## Support

For issues or questions:
1. Check the generated report files
2. Review logs with --verbose flag
3. Verify environment configuration
4. Check component-specific documentation
