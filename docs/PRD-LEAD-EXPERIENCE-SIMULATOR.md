# PRD: Lead Experience Simulator & Conversation Viewer

**PRD ID:** PRD-LEAD-EXPERIENCE-SIMULATOR  
**Status:** draft  
**Author:** Product Manager  
**Use Case:** feat-lead-experience-simulator  
**Priority:** High — Pilot Confidence  
**Workflow:** PM → Design → Dev → QC

---

## Problem Statement

Stojan (the founder) cannot currently experience LeadFlow from the lead's perspective. When a new lead is created in FUB and an SMS is sent, Stojan has no way to:

1. **Trigger a test lead** without using real FUB data
2. **See the AI conversation** that the lead would experience
3. **Verify the AI tone, accuracy, and booking flow** before showing it to pilot agents

This creates a confidence gap. Before recruiting agents and pitching the product, Stojan needs to be able to demo the lead experience in real-time — both to himself and to prospective pilot agents.

---

## Goal

Give Stojan an internal tool in the admin/dashboard area that allows him to:

1. **Simulate a lead interaction** — fire a test SMS conversation and see how the AI responds
2. **View recent real conversations** — see actual lead ↔ AI conversation threads stored in Supabase

---

## User Stories

### US-1: Test Lead Simulator (MVP)
**As Stojan**, I want to enter a fake lead name + phone number and click "Run Simulation" so I can see the full AI SMS conversation play out in the dashboard — without creating real FUB data or sending a live SMS to anyone.

**Acceptance Criteria:**
- Input form: lead name, lead phone (or "simulate" without real phone), property interest (optional)
- On submit: system runs the AI response pipeline in "dry-run" mode (no actual SMS sent)
- Display: show the simulated conversation thread (incoming message → AI response → follow-up turns) in a chat-style UI
- The simulation covers: welcome message, lead reply simulation (pre-defined scripts), AI follow-up, booking prompt
- No real Twilio SMS is sent during simulation
- Results persist in a `lead_simulations` table (not in the main `leads` table)

### US-2: Sample Conversation Viewer (MVP)
**As Stojan**, I want to see a curated list of recent real lead conversations (anonymized) so I can review how the AI is performing without looking at raw database tables.

**Acceptance Criteria:**
- Show last 10 real conversations from the `lead_conversations` or `sms_logs` table
- Each conversation shows: lead name (first name only), date, number of messages, outcome (booked/opted-out/in-progress)
- Click to expand: show full message thread in chronological order
- Phone numbers masked: show only last 4 digits
- Filter by outcome (all / booked / in-progress / opted-out)

### US-3: Demo Mode for Pilot Agent Pitches
**As Stojan**, I want to show the lead simulator during a pitch call with a prospective pilot agent so they can see exactly what their leads will experience — live and unscripted.

**Acceptance Criteria:**
- The simulator is accessible at a stable internal URL (e.g., `/admin/simulator`)
- No login required for demo — accessible via a short token/link (e.g., `?demo=<token>`)
- The demo token is single-use or time-limited (24 hours)
- The page is clean and presentable (not a raw JSON dump)

---

## Scope

### In Scope (MVP)
- `/admin/simulator` page in the Next.js dashboard
- Dry-run simulation pipeline: AI response generation without SMS send
- Conversation viewer (last 10 real convos)
- Basic chat-style UI for simulation output
- Demo share link (token-based, 24h expiry)

### Out of Scope
- Real SMS sending to test numbers (use Twilio test credentials separately)
- Multi-agent simulation
- Lead persona configuration
- Analytics on simulation usage

---

## Technical Notes

### Dry-Run Simulation Pipeline
The simulator should call the existing AI response generation code but with:
- `dryRun: true` flag to skip Twilio send
- A scripted "lead reply" sequence (3 turns): initial inquiry → clarification → booking intent
- Store results in `lead_simulations` table

### Schema: `lead_simulations`
```sql
CREATE TABLE lead_simulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  lead_name TEXT,
  lead_phone TEXT,  -- fake/masked
  property_interest TEXT,
  conversation JSONB,  -- array of {role: 'lead'|'ai', message: TEXT, timestamp}
  outcome TEXT,  -- 'completed' | 'error'
  triggered_by TEXT DEFAULT 'stojan'
);
```

### API Endpoints
- `POST /api/admin/simulate-lead` — runs dry-run simulation, returns conversation JSON
- `GET /api/admin/conversations` — returns last 10 real conversations (anonymized)
- `POST /api/admin/demo-link` — generates a time-limited demo share token

### Demo Token
- Store demo tokens in Supabase `demo_tokens` table: `{token, expires_at, used}`
- Middleware: `/admin/simulator?demo=<token>` skips auth check if token is valid + unexpired

---

## UI / UX Requirements

### Simulator Page (`/admin/simulator`)
- **Layout:** Two-panel: left = input form, right = conversation output
- **Input form:** Lead Name, Property Interest (optional), [Run Simulation] button
- **Output:** Chat bubble UI — lead messages (grey, left) / AI messages (blue, right)
- **Status:** Loading spinner while AI is generating; "Simulation complete" badge when done
- **Share button:** "Generate demo link" → copies URL to clipboard

### Conversation Viewer (tab on same page)
- **Layout:** List of conversations with expand/collapse
- **Row:** Avatar initial, Lead first name, Date, Outcome badge, Message count
- **Expanded:** Full thread in chat bubble UI, same style as simulator

### Design Tokens
- Use existing dashboard design system (Tailwind, existing color palette)
- Outcome badges: booked=green, in-progress=yellow, opted-out=red

---

## Acceptance Criteria Summary

| # | Criteria | How to Test |
|---|----------|------------|
| AC-1 | Simulation runs without sending real SMS | Check Twilio logs — no outbound message after simulation |
| AC-2 | Conversation displays in chat UI | Run simulation → verify bubbles render correctly |
| AC-3 | Real conversations appear in viewer | Check viewer tab → 10 most recent conversations listed |
| AC-4 | Phone numbers masked | Open conversation → confirm only last 4 digits visible |
| AC-5 | Demo link works without login | Generate link → open in incognito → simulator loads |
| AC-6 | Demo link expires after 24h | Generate link → wait 25h (or manually expire) → confirm 401 |
| AC-7 | Simulation data stored in `lead_simulations` | Run simulation → check Supabase table for new row |

---

## KPIs

- **Primary:** Stojan can run a live demo in < 2 minutes from `/admin/simulator`
- **Secondary:** Pilot agent demos using share links — track `demo_tokens` usage
- **Quality:** 0 real SMS sent during simulations (Twilio logs confirm)

---

## Dependencies

- Existing AI SMS response generation code (`lib/ai-responder.js` or similar)
- Existing `sms_logs` / `lead_conversations` table for real conversation data
- Next.js dashboard (`product/lead-response/dashboard/`)
- Supabase for storing simulations and demo tokens

---

## Definition of Done

- [ ] `/admin/simulator` page accessible (with auth)
- [ ] Simulation runs and displays full conversation in chat UI
- [ ] Real conversation viewer shows last 10 conversations
- [ ] Demo link generation and time-expiry work correctly
- [ ] No real SMS sent during simulation (verified via Twilio logs)
- [ ] All AC above pass QC review
- [ ] Stojan has manually tested and signed off

---

*This PRD is the source of truth for the Lead Experience Simulator feature. Dev and Design agents should reference this document.*
