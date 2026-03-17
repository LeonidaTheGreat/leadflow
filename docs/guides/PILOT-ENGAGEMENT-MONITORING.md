# Pilot Engagement Monitoring Guide

**Feature:** Pilot Engagement Metrics Dashboard Component  
**Status:** ✅ Complete  
**Implementation Date:** 2026-03-17

## Overview

The Pilot Engagement Metrics component provides real-time visibility into pilot agent activity and engagement within the LeadFlow dashboard. This feature resolves the gap where session analytics tables existed but lacked UI integration.

## What's New

### Dashboard Component: `PilotEngagementMetrics`
- **Location:** `product/lead-response/dashboard/components/dashboard/PilotEngagementMetrics.tsx`
- **Integrated into:** `/dashboard/analytics` page
- **Data Source:** `/api/internal/pilot-usage` endpoint

### Key Features

1. **Summary Statistics**
   - Total number of pilots
   - Count of active pilots (this week)
   - Count of at-risk pilots (inactive >72h)
   - Total sessions in past 7 days

2. **Per-Pilot Metrics**
   - Agent name and email
   - Plan tier
   - Last login timestamp
   - Number of sessions in past 7 days
   - Most frequently visited page
   - Hours inactive
   - At-risk status indicator

3. **Status Indicators**
   - Green checkmark (✓) for active pilots
   - Amber "At Risk" badge for inactive pilots (>72h)
   - Plan tier labels

4. **Auto-Refresh**
   - Component refreshes every 5 minutes
   - Manual refresh available
   - Shows timestamp of last update

## How to Use

### Accessing the Metrics

1. **In Dashboard UI:**
   - Navigate to `/dashboard/analytics`
   - Scroll to "Pilot Engagement" section
   - View real-time metrics and status

2. **Via CLI/API:**
   ```bash
   # Fetch raw data via curl
   curl -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
     https://leadflow-ai-five.vercel.app/api/internal/pilot-usage
   ```

### Interpreting the Metrics

**At-Risk Indicator:**
- Pilots inactive for more than 72 hours are flagged as "At Risk"
- Use this to identify engagement issues early

**Sessions (7d):**
- Count of distinct sessions in the past 7 days
- Indicator of pilot engagement level
- 0 sessions = inactive pilot

**Top Page:**
- Most frequently visited page by the pilot
- Useful for understanding feature usage patterns

**Last Login:**
- "Today" = logged in within 24 hours
- "Yesterday" = logged in 24-48 hours ago
- "Xd ago" = X days since last login
- "Never" = pilot account created but never logged in

## API Endpoint Reference

### GET `/api/internal/pilot-usage`

**Authorization Required:**
- Header: `Authorization: Bearer {SUPABASE_SERVICE_ROLE_KEY}`

**Response Format:**
```json
{
  "pilots": [
    {
      "agentId": "uuid-string",
      "name": "Full Name",
      "email": "pilot@example.com",
      "planTier": "starter",
      "lastLogin": "2026-03-17T14:30:00Z",
      "sessionsLast7d": 5,
      "topPage": "/dashboard/leads",
      "inactiveHours": 24,
      "atRisk": false
    }
  ],
  "generatedAt": "2026-03-17T18:25:39.123Z"
}
```

**Error Response (401 Unauthorized):**
```json
{
  "error": "Unauthorized. Provide a valid SUPABASE_SERVICE_ROLE_KEY bearer token."
}
```

## Implementation Details

### Component Architecture

- **Type:** Client component (`'use client'`)
- **State Management:** React hooks (useState, useEffect)
- **Data Fetching:** Fetch API with bearer token authorization
- **UI Framework:** Tailwind CSS + Lucide React icons

### Data Flow

1. Component mounts on analytics page
2. Fetches data from `/api/internal/pilot-usage` with auth token
3. Parses response and displays in card/grid layout
4. Auto-refreshes every 5 minutes
5. Shows loading skeleton while fetching
6. Displays error banner if fetch fails

### Database Tables Used

The component displays aggregated data from:
- `real_estate_agents` — pilot agent accounts
- `agent_sessions` — session records
- `agent_page_views` — page navigation tracking

## Testing

### Running Tests

```bash
# Run pilot engagement metrics tests
node tests/feat-pilot-engagement-metrics.test.js
```

**Test Coverage:**
- ✅ API endpoint accessibility
- ✅ Authorization validation
- ✅ Data structure correctness
- ✅ Risk calculation accuracy
- ✅ Dashboard integration

## Troubleshooting

### Issue: "Unable to Load Pilot Metrics"

**Cause:** `SUPABASE_SERVICE_ROLE_KEY` not set in environment

**Solution:**
- Ensure `SUPABASE_SERVICE_ROLE_KEY` is in `.env.local` or environment
- Verify the key is valid (starts with `eyJ...`)

### Issue: No pilots displayed

**Cause:** No pilot agents in database

**Solution:**
- Invite pilot agents first
- Check `real_estate_agents` table for records
- Verify agents have `plan_tier` set

### Issue: "Always showing as at-risk"

**Cause:** Session tracking not working or agents haven't visited dashboard

**Solution:**
- Verify `agent_sessions` table has recent records
- Check that pilots are actually logging in to dashboard
- Review session creation logic in middleware/auth

## Future Enhancements

Potential improvements for v2:
- Export pilot engagement data to CSV
- Custom date range picker
- Engagement trend charts
- Activity heatmap by day/hour
- Email alerts for at-risk pilots
- Detailed session timeline per pilot

## Related Files

- **Component:** `product/lead-response/dashboard/components/dashboard/PilotEngagementMetrics.tsx`
- **Analytics Page:** `product/lead-response/dashboard/app/dashboard/analytics/page.tsx`
- **API Route:** `product/lead-response/dashboard/app/api/internal/pilot-usage/route.ts`
- **Tests:** `tests/feat-pilot-engagement-metrics.test.js`
- **Database:** `real_estate_agents`, `agent_sessions`, `agent_page_views` tables

## References

- **Feature Requirement:** Session analytics tables exist but lack integration points in dashboard UI
- **Use Case:** FR-4 — Pilot engagement monitoring
- **Product Context:** See `CLAUDE.md` and `USE_CASES.md`
