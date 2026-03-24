# PRD: Fix Signup Page — Plan Options Not Displayed

**PRD ID:** PRD-FIX-SIGNUP-PLAN-OPTIONS-001  
**Status:** approved  
**Priority:** high  
**Use Case:** fix-signup-plan-options-not-displayed  
**Created:** 2026-03-06  

---

## Problem Statement

The signup page at `/signup` shows the heading "Choose Your Plan" but renders **no plan cards** beneath it. Users arrive at the signup flow and cannot proceed because there are no plan options to select. This is a conversion-blocking regression — the sign-up flow is entirely broken for self-serve customers.

## Root Cause Hypotheses

The source code in `app/signup/page.tsx` defines a `PLANS` array with hardcoded Starter/Pro/Team plan data and uses `{PLANS.map((plan) => (...))}` to render cards. The heading renders correctly, which means the `step === 'select-plan'` condition resolves to `true`, but the grid is empty. Likely causes:

1. **Missing or invalid Vercel env vars** — `NEXT_PUBLIC_STRIPE_PRICE_*` env vars are undefined in Vercel's project settings, and if this causes an early error in the module-level `PLANS` constant initialization, the entire `PLANS` array could be `undefined` or fail during map.
2. **Build-time `process.env` evaluation** — In Next.js Client Components, `process.env.NEXT_PUBLIC_*` is inlined at build time. If the var is missing, the fallback string is used (`'price_starter_49'`), which should be fine. But if there is a bundler error during this substitution, the PLANS array could be malformed.
3. **React hydration mismatch** — A server/client mismatch in the PLANS data could cause React to discard the server-rendered cards during hydration.
4. **JavaScript error in plan card render** — An uncaught error thrown while mapping over plans (e.g., due to a dependency not loading) could silently suppress the grid.
5. **Stale deployment** — The deployed Vercel build may be pointing to an older commit where the signup page had no plan grid.

## Requirements

### FR-1: Plan Grid Renders on Deployed Site
The three plan cards (Starter $49/mo, Pro $149/mo, Team $399/mo) MUST render visibly in the deployed production build at `https://leadflow-ai-five.vercel.app/signup`.

### FR-2: Env Var Audit and Fix
1. Verify which `NEXT_PUBLIC_STRIPE_PRICE_*` env vars are set in the Vercel `leadflow-ai` project
2. If missing, add them (even as placeholder values `price_starter_49`, `price_pro_149`, `price_team_399`) so the build does not fail
3. The PLANS array should use definitive fallbacks that work without env vars being set

### FR-3: Defensive PLANS Initialization
Refactor the `PLANS` array to avoid relying on `process.env` at module level in a Client Component. Move env var access inside the component function or use a server action/API to supply plan data. Alternatively, hardcode price IDs directly with comments noting they must match Stripe.

### FR-4: Signup Flow Remains Functional
- Plan selection → account details → Stripe Checkout flow works end-to-end
- Selecting a plan navigates to the details form
- Back button returns to plan selection correctly

### FR-5: Error Visibility
If the Stripe Checkout API call fails (e.g., due to invalid priceId), the error message is shown to the user rather than silently failing.

## Acceptance Criteria

1. **[ ] DEPLOYED plan grid visible** — Navigate to `https://leadflow-ai-five.vercel.app/signup` in an incognito browser; the Starter, Pro, and Team cards are visible with prices and features listed
2. **[ ] Plan selection works** — Clicking "Get Started" on any plan advances to the account details form showing the selected plan name and price
3. **[ ] Back navigation works** — Clicking "Back" on the details form returns to the plan selection grid
4. **[ ] No console errors** — Browser dev tools show no JS errors when loading the signup page
5. **[ ] Build succeeds** — `npm run build` in `product/lead-response/dashboard/` completes without errors or warnings about undefined env vars

## Implementation Notes

- The dashboard lives at `product/lead-response/dashboard/`
- Deploy with: `cd product/lead-response/dashboard && vercel --prod`
- Vercel env vars are separate from `.env.local` — changes in Vercel dashboard take effect on next deployment
- Do NOT run `vercel link` — the directory is already linked to the `leadflow-ai` project
- Check env vars in Vercel: `vercel env ls --scope stojans-projects-7db98187`

## Out of Scope

- Brokerage tier (Enterprise) — not needed for this fix
- Changing pricing or plan names
- Stripe webhook changes
- Any changes to the billing backend

## Testing

Human test (Stojan): Open `https://leadflow-ai-five.vercel.app/signup` → confirm 3 plan cards show → click Pro → confirm form appears with "Pro — $149/month" → click Back → confirm grid returns.
