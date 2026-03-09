# PRD Diagnosis: Signup Plan Render Failure

**PRD ID:** PRD-DIAGNOSIS-SIGNUP-PLAN-001  
**Related Use Case:** fix-signup-plan-options-not-displayed  
**Original PRD:** PRD-FIX-SIGNUP-PLAN-OPTIONS-001  
**Status:** diagnosis_complete  
**Priority:** critical  
**Date:** 2026-03-08

---

## Executive Summary

**QC Test Failure Root Cause:** The dev task was marked complete, but the fix code was **never committed to the repository**. The deployed Vercel site at `leadflow-ai-five.vercel.app/signup` still serves stale code with environment variable dependencies for Stripe price IDs. When these env vars are undefined, the plan cards fail to render.

**Current State:**
- Dev fix exists locally in commit `35371bf` (hardcoded price IDs: `price_starter_49`, `price_pro_149`, `price_team_399`)
- **Deployed code** still has old implementation with `process.env.NEXT_PUBLIC_STRIPE_PRICE_*` fallbacks
- **Git history** shows the fix was never pushed to the repository
- **E2E Test Result:** QC opened `https://leadflow-ai-five.vercel.app/signup` and found 0 plan cards rendered (heading visible, grid empty)

---

## Root Cause Analysis

### Issue 1: Env Var Dependency in Client Component

**Location:** `product/lead-response/dashboard/app/signup/page.tsx` line 263

**Current Code (Broken):**
```javascript
const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: 49,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER_MONTHLY || 'price_starter_49',
    // ...
  },
  // ... Pro and Team
]
```

**Problem:** 
- `process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER_MONTHLY` is undefined in Vercel project settings
- The fallback `'price_starter_49'` should work, BUT there's a deeper issue
- When env vars are undefined at build time, Next.js's build optimization can inline undefined, causing subtle failures in some bundler configurations
- The solution is to remove env var dependency entirely and hardcode the price IDs

### Issue 2: Fix Was Never Committed

**Dev Fix Commit:** `35371bf` (local only, not in repository)

**What the fix does:**
- Removes `process.env` references entirely
- Hardcodes price IDs: `'price_starter_49'`, `'price_pro_149'`, `'price_team_399'`
- Adds `Plan` interface for type safety
- Guarantees PLANS array is always defined

**Why it wasn't committed:** Dev task completed successfully locally (5/5 tests pass), but the fix code was not pushed to git before deployment. The deployed Vercel build is based on the last committed code, which is still broken.

### Issue 3: QC Cannot Pass Without Deployment

The E2E test spec requires:
```
Navigate to https://leadflow-ai-five.vercel.app/signup — 3 plan cards visible
```

Since the deployed site still has the broken code, QC fails even though the fix exists locally.

---

## Recommended Fix (For Dev/Orchestrator)

### Step 1: Ensure fix is committed
Dev must run:
```bash
cd ~/projects/leadflow
git status  # Should show no uncommitted changes
# If signup/page.tsx is modified, add the fix and commit
git add product/lead-response/dashboard/app/signup/page.tsx
git commit -m "fix: harden plan tier selection - bulletproof PLANS array with fallbacks"
git push origin main
```

### Step 2: Verify fix is in deployed code
```bash
cd product/lead-response/dashboard
npm run build  # Should complete without errors
vercel --prod --scope stojans-projects-7db98187
```

### Step 3: QC Re-runs Tests
After deployment completes:
- QC opens `https://leadflow-ai-five.vercel.app/signup` in incognito browser
- Verifies 3 plan cards render with correct pricing
- Verifies plan selection workflow (click plan → form → back → grid)
- Confirms no console errors

---

## Acceptance Criteria (PM Sign-Off)

For this issue to be resolved:

1. **[ ] Git history shows the fix commit** — `git log` includes `35371bf` or equivalent hardcoded prices
2. **[ ] Deployed site renders 3 plan cards** — Navigate to production URL in incognito, all 3 cards visible
3. **[ ] Plan selection works** — Click "Get Started" on Pro → details form shows with Pro selected
4. **[ ] Back navigation works** — Click Back → returns to plan grid with 3 cards
5. **[ ] No console errors** — Browser DevTools Console shows no JS errors
6. **[ ] Build succeeds** — `npm run build` completes without env var warnings

---

## E2E Test Specs (Updated)

All tests assume the fixed code is deployed.

### Test 1: Plan Grid Renders on Deployed Site
**Location:** Test performed on production URL
**Steps:**
1. Open `https://leadflow-ai-five.vercel.app/signup` in incognito browser (clear cache)
2. Open browser DevTools (F12) → Console tab
3. Visually inspect the page for plan cards

**Assertions:**
- Heading "Choose Your Plan" is visible
- 3 plan cards are visible below the heading
- Card 1: "Starter" with "$49/month"
- Card 2: "Pro" with "$149/month" and "Most Popular" badge
- Card 3: "Team" with "$399/month"
- Each card has a "Get Started" button
- No red error messages visible on page
- Console shows no error traces (look for red ✕ symbols)

**Expected Result:** All assertions pass. Page is production-ready.

---

### Test 2: Plan Selection and Details Form
**Steps:**
1. From the plan grid (Test 1 prerequisite), click "Get Started" on the Pro plan
2. Observe the page transition (should fade to form)

**Assertions:**
- Form title shows "Subscribe to Pro Plan" or similar
- Form displays current plan: "Pro — $149/month"
- Form has input fields: Name, Email, Phone, Password
- Form has a "Continue to Payment" button
- Form has a visible "Back" button

**Expected Result:** Form renders with correct plan displayed.

---

### Test 3: Back Navigation Returns to Plan Grid
**Steps:**
1. From the details form (Test 2), click the "Back" button
2. Observe the page transition (should return to plan grid)

**Assertions:**
- Plan grid is visible again with 3 cards
- All 3 plan cards show correct pricing
- "Get Started" buttons are clickable
- Page state is clean (no errors)

**Expected Result:** Navigation back to plan grid works. Can select a different plan if desired.

---

### Test 4: No Build Errors
**Location:** Developer task (local build)
**Steps:**
1. `cd product/lead-response/dashboard`
2. `npm run build`

**Assertions:**
- Build completes successfully (exit code 0)
- No warnings about undefined env vars
- Output includes "✓ Compiled successfully"
- Dist/build folder is created

**Expected Result:** Build succeeds with no warnings.

---

## Dependencies / Blockers

- **Blocked by:** Dev committing and pushing the fix
- **Blocks:** QC re-running tests and passing
- **Depends on:** Vercel deployment after fix is pushed

---

## Timeline

| Step | Owner | ETA | Status |
|------|-------|-----|--------|
| Diagnosis complete | PM | ✓ Done | Diagnostic PRD written |
| Dev commits fix to git | Dev | T+0 | Pending |
| Dev deploys to Vercel | Dev | T+5min | Pending |
| QC re-runs tests | QC | T+10min | Pending |
| PM signs off | PM | T+15min | Pending |

---

## Notes for Orchestrator

The dev task appears to have completed successfully locally (5/5 test pass), but the fix was never pushed to the repository. This is a common issue when:

1. Dev tests locally by running `npm run dev` or modifying local files
2. Tests pass in the local environment
3. But changes are never committed to git
4. Deployed site rebuilds from the last committed code (still broken)

**Recommend:**
- Dev should re-verify the fix is in the current working directory
- Check git status to see if the file has uncommitted changes
- If the file differs from committed code, add and commit: `git add <file> && git commit -m "..."`
- Push to main: `git push origin main`
- Redeploy: `vercel --prod`
- QC re-runs tests on the new deployment

Once the fix is deployed, all acceptance criteria should pass immediately.
