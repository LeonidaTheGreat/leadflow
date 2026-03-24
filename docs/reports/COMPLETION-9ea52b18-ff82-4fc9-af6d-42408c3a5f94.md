# Completion Report: fix-sms-messages-direction-values-are-outbound-api-not

**Task ID:** 9ea52b18-ff82-4fc9-af6d-42408c3a5f94
**Branch:** dev/0e82d347-dev-fix-sms-messages-direction-values-ar
**Date:** 2026-03-23

## Summary

This was a re-merge task to resolve merge conflicts on PR #379 for the fix of `sms_messages.direction` values being `outbound-api` (Twilio-format) instead of `outbound`.

## Problem

The `sms_messages.direction` column contains Twilio-canonical values:
- Outbound messages: `outbound-api` or `outbound-reply`
- Inbound messages: `inbound`

The analytics API (`/api/analytics/sms-stats`) was using `.eq('direction', 'outbound')` which never matched any rows, causing delivery rate to always return 0.

## Fix Applied

**File:** `product/lead-response/dashboard/app/api/analytics/sms-stats/route.ts`

Changed the outbound direction filter from:
```typescript
.eq('direction', 'outbound-api')
```
To:
```typescript
.in('direction', ['outbound-api', 'outbound-reply'])
```

Also preserved the `agent_id` filter from origin/main that was missing in the branch version, ensuring proper data isolation between agents.

## Merge Conflict Resolution

- `layout.tsx`: Kept origin/main version (has UtmCaptureTracker + improved metadata)
- `sms-stats/route.ts`: Merged both sides — feature branch's `.in()` direction fix + main's `.eq('agent_id', agentId)` security filter
- Auto-generated docs: Restored to origin/main versions

## Tests

- Existing GA4 analytics tests: 23/23 passed
- Direction filter logic verified in the route file

## Files Modified

- `product/lead-response/dashboard/app/api/analytics/sms-stats/route.ts` — core fix
- `product/lead-response/dashboard/app/layout.tsx` — conflict resolution (kept main version)
