# PRD: Canonical Wizard Component Swap — /setup Route

**Project:** LeadFlow AI  
**Feature:** Onboarding Wizard (Setup Flow)  
**Decision ID:** 3e5981d8-b96a-4c58-98b1-c2a5d26f0856  
**Approved Option:** A — Swap old components for correct ones in setup/page.tsx  
**Status:** Ready for Implementation  
**Created:** 2026-04-01  

---

## Executive Summary

The `/setup` onboarding route currently imports and uses older component variants (`fub.tsx`, `sms.tsx`, `simulator.tsx`, `complete.tsx`) that have inconsistent prop interfaces. The codebase contains canonical `-step` versions of these components (`fub-step.tsx`, `sms-verify-step.tsx`, etc.) with standardized interfaces.

This PRD specifies the **component swap** to use the canonical versions throughout `setup/page.tsx`, improving code consistency, maintainability, and alignment with the onboarding architecture.

---

## Problem Statement

### Current State
- `app/setup/page.tsx` imports 4 step components with mixed interfaces:
  - `SetupFUB` (from `fub.tsx`) — uses `setupData` state object
  - `SetupSMS` (from `sms.tsx`) — uses `setupData` state object
  - `SetupSimulator` (from `simulator.tsx`) — uses `setupData` state object
  - `SetupComplete` (from `complete.tsx`) — uses `setupData` state object
- All accept `onNext()` / `onBack()` callbacks
- All accept `setupData` and `setSetupData` props

### Component Variants Exist
The `app/setup/steps/` directory contains duplicate/alternate implementations:
- `fub.tsx` (228 LOC) vs. `fub-step.tsx` (197 LOC)
- `sms.tsx` (232 LOC) vs. `sms-verify.tsx` (200 LOC) vs. `sms-verify-step.tsx` (223 LOC)
- `complete.tsx` (4.9 KB) vs. `completion-step.tsx` (4.3 KB)
- Unused: `phone-step.tsx`, `twilio.tsx`

### Root Cause
During earlier onboarding refactoring, multiple versions of step components were created. The canonical `-step` versions use a more consistent interface:
- `onComplete()` callback (not `onNext`/`onBack`)
- Stateless by design (component manages its own state transitions)
- Requires `token` (auth context)
- Cleaner separation of concerns

### Impact on Code Quality
1. **Inconsistent interfaces** — future steps/components will follow the canonical `-step` pattern
2. **Maintenance burden** — two sets of similar code create confusion and bugs
3. **Feature parity** — some variants may have bug fixes not in others
4. **Test coverage** — both versions need tests, doubling QC work

---

## Requirements

### Functional Requirements

**FR-1: Swap Setup Components**  
Replace imports in `app/setup/page.tsx`:
```
OLD → NEW
SetupFUB (fub.tsx) → FubStep (fub-step.tsx)
SetupSMS (sms.tsx) → SmsVerifyStep (sms-verify-step.tsx)
SetupSimulator (simulator.tsx) → [No change — no -step variant]
SetupComplete (complete.tsx) → CompletionStep (completion-step.tsx)
```

**FR-2: Update page.tsx Setup Logic**  
Refactor `setup/page.tsx` to:
- Remove `setupData` state (components manage their own state)
- Replace `onNext()` / `onBack()` callbacks with `onComplete()` callbacks
- Pass `token` (auth context) to each step component
- Manage step progression differently (components notify when done, not wizard)
- Preserve: auth status fetching, progress saving, analytics tracking

**FR-3: Preserve User Experience**  
- Step progression remains 4 steps: FUB → SMS → Simulator → Complete
- Progress bar shows current step (no change)
- Navigation buttons (Back/Skip) remain accessible
- Error states remain clear
- Redirect to `/dashboard` on completion unchanged

**FR-4: Handle Step Transitions**  
Each step component will call `onComplete()` when ready to move forward:
```typescript
// Old pattern (current)
<SetupFUB onNext={nextStep} setupData={setupData} setSetupData={setSetupData} />

// New pattern
<FubStep token={agentId} onComplete={() => setCurrentStep('sms')} />
```

---

## Acceptance Criteria

**AC-1: FubStep Integration**
- [ ] `fub-step.tsx` imported in `setup/page.tsx`
- [ ] Component receives `token` prop (agent auth token)
- [ ] Component receives `onComplete` callback
- [ ] No `setupData` state passed
- [ ] FUB API verification still works
- [ ] User can proceed to SMS step on success

**AC-2: SmsVerifyStep Integration**
- [ ] `sms-verify-step.tsx` imported in `setup/page.tsx`
- [ ] Component receives `token` prop
- [ ] Component receives `onComplete` callback
- [ ] Component receives `agentName` for SMS personalization
- [ ] No `setupData` state passed
- [ ] SMS verification still works
- [ ] User can proceed to Simulator step on success

**AC-3: Simulator Step (No Change)**
- [ ] `simulator.tsx` remains (no -step variant needed)
- [ ] All existing props/behavior preserved
- [ ] User can simulate lead response flow
- [ ] Proceeds to Complete step when done

**AC-4: CompletionStep Integration**
- [ ] `completion-step.tsx` imported in `setup/page.tsx`
- [ ] Component receives `token` prop
- [ ] Component receives `onComplete` callback
- [ ] No `setupData` state passed
- [ ] Final confirmation screen displays correctly
- [ ] On completion, redirects to `/dashboard`

**AC-5: Navigation Flow**
- [ ] Step navigation (1→2→3→4) works correctly
- [ ] Back button available on steps 2-4
- [ ] Skip button available at top (redirects to dashboard)
- [ ] Progress bar updates as user advances
- [ ] Progress persists across page refresh

**AC-6: Auth & Session**
- [ ] Auth guard redirects unauthenticated users to `/login`
- [ ] Token is fetched from `/api/auth/trial-status` on mount
- [ ] Token passed to all step components
- [ ] Session remains valid throughout wizard
- [ ] Expired session triggers re-login

**AC-7: Analytics & Telemetry**
- [ ] Step entry events logged when component renders
- [ ] Step completion events logged when `onComplete` called
- [ ] Error events logged for failed verification
- [ ] Completion flow logs final `onboarding_completed` event
- [ ] All events include step name and timestamp

**AC-8: Error States**
- [ ] Network errors display user-friendly messages
- [ ] Invalid input shows validation feedback
- [ ] FUB API failures show troubleshooting steps
- [ ] SMS delivery failures show retry option
- [ ] Expired sessions trigger re-authentication

**AC-9: Mobile Responsiveness**
- [ ] All step components render correctly on mobile (375px viewport)
- [ ] Buttons/inputs are touch-friendly (44px+ height)
- [ ] Progress bar visible on mobile
- [ ] No horizontal scroll required

**AC-10: Build & Tests**
- [ ] `npm run build` succeeds with no errors
- [ ] `npm test` passes with no new failures
- [ ] All e2e tests for /setup route pass
- [ ] No TypeScript errors
- [ ] No console warnings

---

## Implementation Plan

### Phase 1: Code Swap & Refactoring
1. **Backup current setup/page.tsx** (git history)
2. **Update imports** in setup/page.tsx:
   ```typescript
   import FubStep from './steps/fub-step'
   import SmsVerifyStep from './steps/sms-verify-step'
   // SetupSimulator unchanged
   import CompletionStep from './steps/completion-step'
   ```
3. **Refactor state management**:
   - Remove `setupData` state
   - Keep `currentStep` state (wizard controls flow)
   - Fetch and store `token` from `/api/auth/trial-status`
4. **Update step render logic**:
   - Replace all `setupData` prop passing with `token`
   - Replace `onNext()` callbacks with step-specific `onComplete()` handlers
   - Each `onComplete` calls `setCurrentStep(nextStep)`
5. **Verify build** — `npm run build` should pass
6. **Run tests** — `npm test` should pass

### Phase 2: Testing
1. **E2E test updates** — adapt existing tests to new component interfaces
2. **Manual testing walkthrough**:
   - Create test agent
   - Sign up and login
   - Navigate /setup wizard
   - Complete all 4 steps
   - Verify redirect to /dashboard
3. **Mobile testing** — test on real mobile device or browser emulation

### Phase 3: Cleanup
1. **Remove unused components** (after PR merge):
   - Delete `fub.tsx` (replaced by fub-step.tsx)
   - Delete `sms.tsx` (replaced by sms-verify-step.tsx)
   - Delete `sms-verify.tsx` (deprecated, use sms-verify-step.tsx)
   - Delete `phone-step.tsx` (unused)
   - Delete `twilio.tsx` (unused)
   - Delete `complete.tsx` (replaced by completion-step.tsx)
2. **Update imports** in any other files referencing old components
3. **Re-run tests** to verify no orphaned references

---

## Testing Strategy

### Unit Tests
- Test each `-step` component in isolation
- Verify `onComplete` callback fires correctly
- Verify token is passed and used

### Integration Tests
- Test /setup route as a whole
- Mock auth endpoints
- Verify step progression through all 4 steps
- Verify redirect on completion

### E2E Tests
- Real browser walkthrough: signup → /setup → all 4 steps → /dashboard
- Test back button on each step
- Test skip button at top
- Verify data persistence across refresh

### Mobile Tests
- Test on iPhone 12 (375px) and iPad (768px) viewports
- Verify touch interactions work
- Verify layout doesn't break

---

## Rollout Plan

1. **PR**: Branch `feat/canonical-wizard-setup-swap`, implement, request review
2. **QC Review**: QC agent verifies all acceptance criteria
3. **Merge**: Merge to main once approved
4. **Deploy**: Run `cd product/lead-response/dashboard && vercel --prod`
5. **Smoke Test**: Verify /setup route works on production

---

## Rollback Plan

If issues arise post-deployment:
1. Revert commit (git revert)
2. Redeploy with previous version: `vercel --prod`
3. Post-mortem: document what failed and update this PRD

---

## Dependencies & Risks

### Dependencies
- No external API changes required
- No database schema changes
- No Stripe/Twilio changes

### Risks

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Component interfaces don't work as expected | High | Thorough testing before merge |
| Auth token not passed correctly | High | Unit test token passing logic |
| Step progression logic breaks | High | E2E tests for all paths |
| Mobile layout breaks | Medium | Mobile testing on real device |
| Unused components not fully deleted | Low | Grep for imports after cleanup |

---

## File Changes Summary

| File | Change | LOC |
|------|--------|-----|
| `app/setup/page.tsx` | Refactor (imports, state, callbacks) | ±100 |
| `steps/fub-step.tsx` | No change (currently unused) | 197 |
| `steps/sms-verify-step.tsx` | No change (currently unused) | 223 |
| `steps/simulator.tsx` | No change | 161 |
| `steps/completion-step.tsx` | No change (currently unused) | 4.3K |
| `steps/fub.tsx` | Delete (after merge) | 228 |
| `steps/sms.tsx` | Delete (after merge) | 232 |
| `steps/sms-verify.tsx` | Delete (after merge) | 200 |
| `steps/complete.tsx` | Delete (after merge) | 118 |
| `steps/phone-step.tsx` | Delete (cleanup) | 290 |
| `steps/twilio.tsx` | Delete (cleanup) | 234 |

---

## Success Metrics

- ✅ `/setup` route loads without errors
- ✅ All 4 onboarding steps render correctly
- ✅ Step progression works (1→2→3→4)
- ✅ Auth guard prevents unauthenticated access
- ✅ Completion redirects to `/dashboard`
- ✅ All e2e tests pass
- ✅ No TypeScript errors
- ✅ Mobile responsive on 375px+ viewports
- ✅ Analytics events logged for each step

---

## Notes for Development Team

- The `-step` components are the "source of truth" for this feature
- Old components (`fub.tsx`, `sms.tsx`, etc.) will be removed post-merge
- Future onboarding steps should follow the `-step` pattern
- Reach out if component interfaces don't match expectations

---

**PRD Owner:** Product Manager  
**Decision ID:** 3e5981d8-b96a-4c58-98b1-c2a5d26f0856  
**Last Updated:** 2026-04-01
