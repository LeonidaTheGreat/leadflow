# PM Action Items: Admin Pilot Invite Flow Review
**Review ID:** 23e73750-ca67-45c2-921f-95187bdcc17c  
**Task ID:** 3bfa3e96-a1f6-4e9c-86cf-edc840ab1e02  
**Date:** 2026-07-24  
**Verdict:** pass_with_issues (score: 65/100)

---

## Summary

The admin pilot invite flow is implemented and correct for the happy path. The orchestration dashboard, landing page, login, signup, and lead simulator all pass. Critical issue: the feature has never been used to invite real agents (all 27 pilot_invites are test data). The re-invite refresh path has a bug that discards the raw token. Auto-authentication after password set is missing.

---

## Action Items

### P1: Send pilot invites to the 35 pilot signups NOW
**Type:** ACTION  
No code change needed. Navigate to `/admin/invite` on Vercel and send invites to the agents in the pilot_signups table today. The 2026-07-31 first paying customer deadline is 7 days away.

### P1: Fix re-invite refresh — raw token is discarded
**Type:** DECISION  
File: `product/lead-response/dashboard/app/api/admin/invite-pilot/route.ts` lines 84–98  
When admin re-invites a pending email with a valid token: code generates new rawToken + tokenHash, updates DB, but returns no inviteUrl and sends no email. Raw token is permanently lost.  
**Recommended fix:** Resend email with new raw token AND include inviteUrl in response (option C).

### P1: Always include inviteUrl in invite response
**Type:** RECOMMENDATION  
Currently inviteUrl is only returned when emailSent=false (lines 185-193). Admin needs the URL to share via WhatsApp/SMS as backup. Low-risk one-line change: always include inviteUrl in response.

### P2: Auto-authenticate agent after password set
**Type:** RECOMMENDATION  
File: `product/lead-response/dashboard/app/accept-invite/page.tsx` line 103  
After set-password succeeds, redirect to `/login`. PRD says agents should land at `/dashboard/onboarding`. The trial-activation JWT path already creates a session correctly. Apply same pattern to pilot invite path.

### P2: Clean up expired duplicate invite records on re-invite
**Type:** RECOMMENDATION  
File: `product/lead-response/dashboard/app/api/admin/invite-pilot/route.ts` line 99  
When expired invite found, mark it expired before creating new record. Currently 27 pending records (all expired) clutter the invite list.

---

## UX Assessment

| Page | Status | Notes |
|------|--------|-------|
| Landing `/` | ✅ Pass | Professional, clear value prop, trust signals, pricing |
| Signup `/signup` | ✅ Pass | Clean 3-step plan flow |
| Login `/login` | ✅ Pass | Clear, standard, professional |
| Dashboard `/dashboard` | ⚠️ Partial | Auth-walled, can't screenshot |
| Lead Simulator `/admin/simulator` | ✅ Pass | Admin tool, clearly labeled |
| Admin Invite `/admin/invite` | ✅ Pass | Form + invite list, correct auth flow |
| Accept Invite `/accept-invite` | ✅ Pass | Set-password UX clean, error states handled |

---

## DB State at Review Time
- pilot_invites total: 28 (27 pending, 1 accepted)
- Real agent invites: 0 (all test/example.com addresses)
- Valid pending tokens: 0 (all expired)
