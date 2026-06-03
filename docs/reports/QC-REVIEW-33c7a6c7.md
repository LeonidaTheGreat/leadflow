# QC Review: Guided FUB Connection Wizard
**Task ID:** 33c7a6c7-a3fc-45a1-abae-963f3ab879fe  
**Branch:** Already merged to main via PR #884 (commit bfc8043)  
**Reviewed:** 2026-04-05  
**Verdict:** FAIL

---

## Automated Gates

| Gate | Result |
|------|--------|
| `npm run build` (Next.js) | PASS |
| `npm test` (integration) | PASS — 15/15 (pre-existing FUB/Twilio env failures are env-only) |
| Junk files in diff | PASS |
| Root .md files in diff | PASS |
| E2E test written + run | FAIL — 1/18 tests fail (security violation) |

---

## Security Findings

### CRITICAL: Raw FUB API Key Stored in Database

**File:** `product/lead-response/dashboard/app/api/onboarding/fub/validate-key/route.ts` lines 80-91

```ts
await supabase
  .from('agent_onboarding_wizard')
  .upsert(
    {
      agent_id: agentId,
      fub_api_key: apiKey, // raw key needed for webhook registration
      ...
    },
    { onConflict: 'agent_id' }
  )
```

The raw, unencrypted FUB API key is stored in the `agent_onboarding_wizard.fub_api_key` column. The commit message and inline code both claim "SHA-256 hash stored for audit" — but the hash (`hashedKey`) is computed and then discarded. It is never actually stored anywhere. The raw key is what gets persisted.

**Impact:** Any database breach exposes all agents' FUB API keys in plaintext, giving full access to their FUB CRM accounts (read/write contacts, leads, assignments).

**Required fix:** Either (a) store only the SHA-256 hash and remove `fub_api_key` from the upsert, or (b) encrypt the key before storage if it's needed for later use. The dev comment says "raw key needed for webhook registration" — if the key is truly needed for later API calls, it must be encrypted at rest using a server-side secret, not stored plaintext.

**PRD Note:** PRD line 116 says "`agents.fub_api_key` column already exists and is used to store the validated key." and PRD line 168 says "FUB API key stored encrypted at rest using existing key storage pattern." The implementation does not follow this requirement.

---

## Non-Blocking Gaps

### Rate Limiting Missing on validate-key
PRD line 169 requires: "Rate-limit the validate-key endpoint (max 10 attempts per agent per hour) to prevent API abuse." Not implemented. Each verification call hits the external FUB API — no throttle guard.

### Migration Targets Wrong Table
`migrations/010_fub_onboarding_wizard.sql` adds `fub_onboarding_completed` and `fub_onboarding_step` to `real_estate_agents`. PRD specifies the `agents` table. The migration does not create the `agent_onboarding_wizard` table referenced by two of the API routes — if that table doesn't exist in production, those upserts will fail silently (no error check on the upsert result).

### Webhook URL Auth Redirect Logic Broken
`FubWizardPage` calls `fetch('/api/onboarding/fub/webhook-url')` on mount and redirects on catch (network error), but does NOT check the response status. A 401 Unauthorized will resolve successfully (no throw), so unauthenticated users will reach the wizard UI before the API calls fail individually.

---

## Acceptance Criteria Assessment

| ID | Status | Note |
|----|--------|------|
| `validate-key-valid` | PASS | Route exists, validates format and live FUB API |
| `validate-key-invalid` | PASS | Returns 400 + `{valid: false}` |
| `webhook-url-endpoint` | PASS | Returns correct URL format |
| `test-status-polling` | PASS | Returns `{received: false}` by default |
| `wizard-complete` | PASS | Sets `fub_onboarding_completed = true` |
| `wizard-hidden-after-complete` | NOT VERIFIED | Wizard page has no server-side redirect guard; relies on client-side check not shown in the diff |

---

## Code Quality

- No loose equality (`==`) — PASS
- Error handling with try/catch on all external calls — PASS
- All 4 routes gated by `getAuthUserId` with 401 — PASS
- Build passes — PASS
- No hardcoded secrets — PASS
- Strict TypeScript types — PASS

---

## Verdict: FAIL

One blocking issue: **plaintext API key storage**. This is a security violation per QC checklist ("Tokens/secrets stored hashed (sha256), never plaintext"). The commit message claims the key is hashed — it is not. The hash is computed but the raw key is what is upserted into the database.

The PR was already merged to main (#884). A fix PR must be created immediately.

**Required action:** Create fix task to store FUB API key encrypted or hashed-only. The `agent_onboarding_wizard.fub_api_key` column must not contain plaintext credentials.
