# PRD-LEADFLOW-LEAD-EXPERIENCE-VISIBILITY-001

- Project: LeadFlow (`leadflow`)
- Use Case ID: `improve-lead-experience-visibility-test-lead-simul`
- Owner: Product
- Status: Draft
- Version: 1.0
- Last Updated: 2026-05-12

## KPI Context (Current Gaps)
- Mission: first paying customer and conversion scale-up.
- Top metric gaps to support: `NPS Score`, `Signup to Activated Rate`, `Trial to Paid Conversion`.
- Product bottleneck addressed by this PRD: founder and pilot prospects cannot reliably see a realistic lead conversation before onboarding/live setup.

## Problem Statement
Stojan needs a reliable, fast way to demonstrate and inspect the lead experience from the lead perspective. Today this is inconsistent and requires manual setup or backend inspection. That slows demos, weakens trust, and delays activation conversations that convert trials to paid.

## Goal
Provide one internal “Lead Experience Visibility” surface where Stojan can do either of the following within 2 minutes:
1. Run a test lead simulation (preferred).
2. If simulation is unavailable, open a curated sample conversation viewer (fallback path).

## Non-Goals
- No new external CRM integrations in this use case.
- No redesign of full onboarding wizard.
- No advanced analytics dashboards beyond minimal event logging for this feature.

## Target Users
- Primary: Stojan (founder/operator).
- Secondary: pilot real estate agents during demo calls.

## User Stories
1. As Stojan, I want to run a realistic lead simulation quickly so I can show the product value live.
2. As Stojan, I want a fallback sample conversation viewer so demos can continue if simulator execution fails.
3. As a pilot agent in a live call, I want to see a clear chat transcript so I understand what my leads will experience.
4. As PM, I want instrumentation around simulation/viewer usage so we can connect visibility usage to activation and conversion outcomes.

## Functional Requirements
### FR-1 Unified Entry Point
- Provide a single dashboard entry point labeled `Lead Experience Visibility`.
- Entry presents two options:
  - `Run Test Lead Simulator` (primary)
  - `Open Sample Conversation Viewer` (secondary/fallback)

### FR-2 Test Lead Simulator
- User can start a test scenario from a template list (e.g., new buyer, listing inquiry, urgent showing).
- Simulator renders full turn-by-turn transcript with timestamps and speaker labels.
- Clear state handling: `idle`, `running`, `success`, `failed`, `timed_out`.
- No real customer SMS is sent in simulator mode.

### FR-3 Sample Conversation Viewer
- Provide curated recent conversation samples safe for demo use.
- Display conversation metadata: scenario, outcome (`booked`, `in_progress`, `opted_out`, `unqualified`), message count, date.
- Mask sensitive data (phone/email/address), preserving conversation meaning.

### FR-4 Fallback Behavior
- If simulator fails or times out, UI prompts immediate fallback to sample viewer without leaving page.
- Fallback preserves demo flow continuity in under 1 click.

### FR-5 Shareability for Live Demos
- Generate a temporary demo link for read-only viewing of the selected simulator run or sample conversation.
- Demo links expire automatically (default 24h) and are revocable.

### FR-6 Minimal Instrumentation
- Capture events:
  - `lead_visibility_opened`
  - `lead_simulator_started`
  - `lead_simulator_succeeded`
  - `lead_simulator_failed`
  - `sample_viewer_opened`
  - `demo_link_generated`
- Event payload includes actor, timestamp, scenario id, and elapsed time where relevant.

## UX Requirements
- Page must be demo-ready: clean transcript view, readable on laptop and mobile.
- Simulation status and fallback CTA must be visible above fold.
- Copy must emphasize business outcome (speed-to-response and booking intent), not internal jargon.

## Data & Privacy Requirements
- Simulator mode must be isolated from live outbound messaging.
- Sample conversation data must be masked before render.
- Demo-link access must be read-only and auditable.

## Acceptance Criteria
1. From the main entry point, Stojan can reach either simulator or sample viewer in one click.
2. A test simulation can be run end-to-end and transcript displayed without sending real outbound SMS.
3. If simulator fails, user can open sample conversation viewer in one click from the failure state.
4. Sample viewer lists at least 10 usable conversation samples with masked sensitive data.
5. Demo link can be generated and opened in an incognito window without standard login, then expires after TTL.
6. Required events are emitted and queryable for PM analysis.
7. Median time from opening entry point to having a visible transcript (simulator success or sample fallback) is under 2 minutes for internal demos.

## Prioritization
- Priority: P1 (directly supports activation and trial-to-paid conversion narrative).
- Rationale: This use case creates immediate sales/demo leverage with low integration risk versus broader feature work.

## Risks and Mitigations
- Risk: simulator reliability during live calls.
  - Mitigation: forced one-click fallback to sample viewer.
- Risk: stale/poor samples reduce trust.
  - Mitigation: curated sample set with monthly refresh owner.
- Risk: privacy leakage in samples.
  - Mitigation: masking rules validated in QC acceptance tests.

## Dependencies
- Existing simulator backend or equivalent dry-run conversation generator.
- Conversation storage/query path for sample data.
- Dashboard route and auth/token middleware for demo links.

## Definition of Done
- All acceptance criteria pass in QC.
- Stojan completes one live dry run and one fallback demo using sample viewer.
- PRD linked to use case and tracked in `prds` metadata.
