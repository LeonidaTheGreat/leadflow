<!-- AUTO-GENERATED — DO NOT EDIT. Regenerated every heartbeat from Supabase. -->
# Use Cases

> Generated: 2026-03-01T23:45:50.171Z | Source: `use_cases` + `prds` tables

**Progress: 12/12 complete**

| UC | Name | Phase | Status | Priority | E2E | Workflow |
|----|------|-------|--------|----------|-----|----------|
| UC-5 | Lead Opt-Out | Phase 1 | complete | 1 | pass | PM > Dev > QC |
| UC-1 | Lead-Initiated SMS | Phase 1 | complete | 1 | pass | PM > Dev > QC |
| UC-9 | Customer Sign-Up Flow | Phase 3 | complete | 1 | defined | PM > Design > Dev > QC |
| UC-2 | FUB New Lead Auto-SMS | Phase 1 | complete | 1 | defined | PM > Dev > QC |
| UC-3 | FUB Status Change | Phase 1 | complete | 1 | defined | PM > Dev > QC |
| UC-6 | Cal.com Booking | Phase 2 | complete | 2 | pass | PM > Dev > QC |
| UC-4 | FUB Agent Assignment | Phase 1 | complete | 2 | defined | PM > Dev > QC |
| UC-10 | Billing Portal | Phase 3 | complete | 2 | defined | PM > Design > Dev > QC |
| UC-11 | Subscription Lifecycle | Phase 3 | complete | 2 | defined | PM > Dev > QC |
| UC-8 | Follow-up Sequences | Phase 2 | complete | 2 | pass | PM > Dev > QC |
| UC-7 | Dashboard Manual SMS | Phase 2 | complete | 3 | pass | PM > Design > Dev > QC |
| UC-12 | MRR Reporting | Phase 3 | complete | 3 | defined | PM > Analytics |

## Phase: Phase 1

### UC-5 — Lead Opt-Out

- **PRD:** Core SMS Lead Response
- **Status:** complete
- **Priority:** 1
- **Description:** Process STOP/opt-out messages and update CRM
- **Workflow:** PM > Dev > QC

### UC-1 — Lead-Initiated SMS

- **PRD:** Core SMS Lead Response
- **Status:** complete
- **Priority:** 1
- **Description:** Respond to inbound lead SMS messages with AI-generated responses
- **Workflow:** PM > Dev > QC

### UC-2 — FUB New Lead Auto-SMS

- **PRD:** Core SMS Lead Response
- **Status:** complete
- **Priority:** 1
- **Description:** Automatically send SMS when new lead appears in FUB CRM
- **Workflow:** PM > Dev > QC

### UC-3 — FUB Status Change

- **PRD:** Core SMS Lead Response
- **Status:** complete
- **Priority:** 1
- **Description:** Trigger SMS workflows on FUB lead status changes
- **Workflow:** PM > Dev > QC

### UC-4 — FUB Agent Assignment

- **PRD:** Core SMS Lead Response
- **Status:** complete
- **Priority:** 2
- **Description:** Handle agent assignment changes in FUB CRM
- **Workflow:** PM > Dev > QC


## Phase: Phase 3

### UC-9 — Customer Sign-Up Flow

- **PRD:** Billing & Subscriptions
- **Status:** complete
- **Priority:** 1
- **Description:** Stripe checkout + onboarding for new customers
- **Workflow:** PM > Design > Dev > QC

### UC-10 — Billing Portal

- **PRD:** Billing & Subscriptions
- **Status:** complete
- **Priority:** 2
- **Description:** Customer self-serve billing management via Stripe portal
- **Depends on:** UC-9
- **Workflow:** PM > Design > Dev > QC

### UC-11 — Subscription Lifecycle

- **PRD:** Billing & Subscriptions
- **Status:** complete
- **Priority:** 2
- **Description:** Handle upgrades, downgrades, cancellations, renewals
- **Depends on:** UC-9
- **Workflow:** PM > Dev > QC

### UC-12 — MRR Reporting

- **PRD:** Billing & Subscriptions
- **Status:** complete
- **Priority:** 3
- **Description:** Monthly recurring revenue tracking and analytics dashboard
- **Depends on:** UC-11
- **Workflow:** PM > Analytics


## Phase: Phase 2

### UC-6 — Cal.com Booking

- **PRD:** CRM & Calendar Integrations
- **Status:** complete
- **Priority:** 2
- **Description:** Book appointments via Cal.com from SMS conversations
- **Workflow:** PM > Dev > QC

### UC-8 — Follow-up Sequences

- **PRD:** Core SMS Lead Response
- **Status:** complete
- **Priority:** 2
- **Description:** Automated multi-step follow-up SMS sequences
- **Workflow:** PM > Dev > QC

### UC-7 — Dashboard Manual SMS

- **PRD:** Core SMS Lead Response
- **Status:** complete
- **Priority:** 3
- **Description:** Send manual SMS from dashboard interface
- **Workflow:** PM > Design > Dev > QC

