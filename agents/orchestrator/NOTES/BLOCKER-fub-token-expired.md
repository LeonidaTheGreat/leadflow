---
title: BLOCKER - FUB API Token Expired
author: LeadFlow Orchestrator
date: 2026-02-23
severity: high
blocking: marketing-agent
---

# 🚨 BLOCKER: FUB API Token Expired

## Problem

FUB API key `fka_0GF88QEK0i53EfnxyoCHs95JeBPkIcB6zb` has expired.

**Error:** `Access token has expired. Renew using refresh token`

**Impact:** Marketing agent blocked (no working demo)

## Files Affected

- `.env.local` → `FUB_API_KEY` needs update
- Vercel deployment env vars → needs update
- FUB webhook integration → non-functional

## Resolution Required

### Step 1: Generate New FUB API Token

**Requires:** Stojan's FUB account (Pro+ tier)

1. Login to https://followupboss.com
2. Go to Settings → API Keys (or Admin → API)
3. Generate new Personal Access Token
4. Copy new token (starts with `fka_`)

### Step 2: Update Local Environment

```bash
cd /Users/clawdbot/.openclaw/workspace/business-opportunities-2026/product/lead-response/dashboard

# Update .env.local
# Replace: FUB_API_KEY=fka_0GF88QEK0i53EfnxyoCHs95JeBPkIcB6zb
# With:    FUB_API_KEY=[new-token]
```

### Step 3: Update Vercel Deployment

```bash
cd product/lead-response/dashboard
vercel env add FUB_API_KEY
# Enter new token when prompted
vercel --prod
```

Or via Vercel Dashboard:
1. https://vercel.com/stojans-projects/leadflow-ai/settings/environment-variables
2. Edit FUB_API_KEY
3. Redeploy

### Step 4: Verify Fix

```bash
# Test API access
curl -H "Authorization: Bearer [new-token]" \
  "https://api.followupboss.com/v1/people?limit=1"

# Should return: {"people": [...], "hasMore": true/false}
# Not: {"success": false, "errorMessage": "Access token has expired"}
```

### Step 5: Re-test Full Flow

1. Trigger test lead via FUB webhook
2. Verify lead appears in Supabase
3. Verify AI qualification runs
4. Verify SMS sends (if configured)
5. Update .project.json → Marketing unblocked

## Marketing Unblock Criteria

- [ ] New FUB API token generated
- [ ] Token tested and working
- [ ] Full FUB → AI → SMS flow verified
- [ ] Dashboard shows real lead (not just test data)

## Time Estimate

- Token generation: 5 min (with FUB access)
- Deployment update: 10 min
- Testing: 15 min
- **Total: ~30 minutes**

## Escalation

**Blocked on:** Stojan (FUB account access required)
**Cannot proceed without:** New API token
**Next action:** Generate new FUB API key

---

*Blocker logged: 2026-02-23*  
*Next update: After token refresh*
