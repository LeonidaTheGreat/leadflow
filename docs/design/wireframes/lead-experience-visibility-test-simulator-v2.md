# Lead Experience Visibility - Test Simulator / Sample Viewer v2

- Task ID: `ef5c68e8-4521-45b7-8fa2-177a80e2c957`
- Use Case: `improve-lead-experience-visibility-test-lead-simul`
- Linked PRD: `docs/prd/PRD-LEADFLOW-LEAD-EXPERIENCE-VISIBILITY-001.md`
- Date: `2026-05-29`
- Designer: `Design Agent`

## Deliverable Scope
This v2 package is design-only and implementation-ready for Stojan's live demo flow.

Included assets:
- `docs/design/mockups/lead-experience-visibility-v2.svg` (annotated visual layout)
- This wireframe/spec handoff document

## Layout Spec
Single page with fixed IA:
1. Header: title, value proposition, `Generate Demo Link` CTA.
2. Left control rail: simulator scenario + run state + fallback CTA block.
3. Right pane: active transcript viewer with metadata and chronological turns.
4. Inline sample panel in same pane (no route change).
5. Mobile mode: tabbed `Simulator | Samples` with sticky fallback actions.

## Component Contract
- `LeadVisibilityHeader`
  - Displays title, subtitle, last-success timestamp, share CTA.
- `SimulatorControlCard`
  - Scenario selector, primary run button, immutable demo safety line.
- `LeadVisibilityStateBanner`
  - State enum: `idle | running | success | failed | timed_out`.
  - In `failed|timed_out`, `Open Sample Conversation` becomes primary.
- `TranscriptViewer`
  - Timeline rows: timestamp, role, content.
  - Always shows `Demo Safe (PII Masked)` status.
- `SampleConversationInlinePanel`
  - Minimum 10 records; shows scenario, outcome, message count, date/time.
  - Selection hydrates transcript in place.
- `DemoLinkModal`
  - Source type + TTL default 24h + revoke control.

## State and Interaction Rules
1. `idle`: no transcript, clear dual-path CTA.
2. `running`: disable rerun, keep fallback visible.
3. `success`: render transcript and outcome metrics.
4. `failed|timed_out`: show warning, surface one-click fallback above fold.
5. Sample fallback never navigates away and preserves presenter context.

## Copy and Labels
- Page title: `Lead Experience Visibility`
- Primary action: `Run Test Lead Simulator`
- Fallback action: `Open Sample Conversation`
- Timeout helper: `Simulator did not finish in time. Continue with a demo-safe sample now.`
- Empty transcript helper: `Run simulator or open a sample to load transcript.`

## Acceptance Mapping (PRD)
- FR-1: one labeled entry with two explicit actions.
- FR-2: explicit simulator state model + transcript timeline.
- FR-3: sample viewer metadata schema + >=10 conversation requirement.
- FR-4: fallback CTA promoted on failure/timeout without navigation.
- FR-5: demo link UX with TTL and revoke.
- UX: transcript-first readability on desktop/mobile.

## Asset Notes for Dev
- Use the SVG as spacing and hierarchy reference, not pixel-perfect final UI.
- Preserve existing design system components where possible.
- Keep this flow in the existing admin simulator surface to reduce implementation risk.
