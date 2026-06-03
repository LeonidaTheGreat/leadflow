# Home-Buyer Journey — As Code, As Marketing, As Reality

**Auditor:** Leonida (this Claude Code session)
**Date:** 2026-05-05
**Companion to:** audit-2026-05-03.md (structural), marketing-claims-audit-2026-05-04.md (claims).

A walk-through of the system from the home buyer's POV — what code runs at each step, what marketing promises, and where the wiring is wrong today. Each stage references file:line so the genome can act on it.

---

## Stage 0 — Buyer expresses interest

**Real-world trigger:** buyer fills out a form on Zillow / Realtor.com / the agent's website / Facebook ad / a property's "request info" widget. Or texts a number off a yard sign.

**Marketing setup:** "AI responds in <30 seconds, 24/7, even during showings." (`app/page.tsx:268`)

**Code touchpoints:** none yet — buyer is upstream of LeadFlow.

---

## Stage 1 — Lead enters the system

Two possible paths from here.

### Path A — Lead arrives via FUB
Buyer's form submission lands in Follow Up Boss. FUB fires its `peopleCreated` webhook to:

`POST https://fub-inbound-webhook.vercel.app/webhook/fub`

→ `integration/fub-webhook-listener.js:13` verifies HMAC signature.
→ `lib/services/FUBService.js:84` `handleWebhookPayload` emits `lead.created` event.
→ `FUBService.handleLeadCreated` (line 102) checks `consents.sms`, DNC list, then…

### Path B — Lead texts the Twilio number directly
Twilio webhook posts to:

`POST https://leadflow-ai-five.vercel.app/api/webhook/twilio`

→ `product/lead-response/dashboard/app/api/webhook/twilio/route.ts:38` verifies signature.
→ `findOrCreateLeadByPhone(phone)` creates a new FUB lead (`inbound-sms-service.ts:73`) and stores locally.
→ `resolveAgent(lead)` picks the agent.

---

## Stage 2 — Initial outbound SMS

**Marketing:** "AI generates a personalized SMS using their name, property of interest, and inquiry context. Sent in <30 seconds." (FAQ, `app/page.tsx:503-504`)

**Reality (Path A — FUB lead):** **NOT AI.** `FUBService.generateAiSmsResponse` (`lib/services/FUBService.js:351`) is a hardcoded template:

```js
const templates = {
  initial_response: `Hi ${lead.firstName}, I'm ${process.env.AGENT_NAME}.
    I have properties matching your interests. Reply YES to see options.`,
  // …
};
return { message: templates[trigger] || templates.initial_response, ... };
```

No LLM call. No prompt construction. No qualification analysis. Every Path-A lead gets the same string with first name + a single global `AGENT_NAME` env var (not even the actual assigned agent's name). "Properties matching your interests" is asserted regardless of whether any matching properties exist.

**Reality (Path B — Twilio inbound):** Should run `generateAndSaveAiResponse` → `buildSmsPrompt` (real LLM path). But the auto-respond gate at `app/api/webhook/twilio/route.ts:122` requires `agent.market` and `agent.settings`, neither of which exists on the actual `real_estate_agents` table (see audit-2026-05-04 §"Inbound SMS Auto-Response Probably Broken"). Net: silently no reply.

**Net for Stage 2:** Buyer either gets a generic templated SMS (Path A) or nothing (Path B). The marketing personalization promise — name, property, context, inquiry — is unfulfilled in both paths.

**SMS compliance footer:** "Reply STOP to opt out" gets appended automatically (per system prompt rules, `lib/ai.ts:417`, plus `inbound-sms-service.ts` enforces it).

---

## Stage 3 — Buyer replies

**Marketing:** AI carries a multi-turn conversation, qualifying the lead through name → location → budget → timeline → property type. (Examples in system prompt at `lib/ai.ts:425-442`.)

**Reality:** Only Path B (inbound webhook) reaches this. Same gate failure. Even if the gate passed:
- `buildSmsPrompt` builds a prompt assuming `agent.name`, `agent.market` exist — they don't on the DB row.
- TS types claim they exist; runtime they're `undefined`.
- `agent.name.split(' ')[0]` would throw, returning a 500 to Twilio.

If the schema bug were fixed:
- The system prompt is genuinely conversational and warm (verified yesterday).
- Conversation history is loaded from `messages` table (last 10) and injected into the prompt.
- Lead info (name, location, budget, property type, bedrooms, bathrooms, timeline) flows into the prompt; LLM is supposed to extract any new info from the buyer's reply.
- `extractInfo(inboundBody)` (`inbound-sms-service.ts:354`) tries to pattern-match new info into the `leads` table for next-turn use.

**Customization:** None. No template selection, no agent persona, no tone setting, no bio injection. Every buyer with every agent gets the same prompt voice. Per FAQ promise "you can customize the tone and templates" — UI doesn't exist (audit-2026-05-04 §"Falsified Customization Promise").

---

## Stage 4 — Qualification conversation continues

**Marketing:** "Automatic scoring based on urgency, budget, and timeline." (`app/page.tsx:208`)

**Reality (when AI runs):**
- `qualifyLead()` in `lib/ai.ts:131` is a separate qualification function — extracts intent/budget/timeline/property as structured output via `generateObject`. Stored on `lead_qualifications`.
- `latest_qualification` joined back into the lead object on next prompt build.
- Multi-turn flow is essentially the system prompt + history. No state machine.

**Customization:** None.

**Note:** The "qualification" is what the LLM generates from the conversation — there's no agent-defined criteria, no "must qualify by budget X for area Y." Score is whatever the LLM produces.

---

## Stage 5 — Booking

**Marketing:** "AI books appointments directly on your calendar — leads go from inquiry to meeting in minutes." (`app/page.tsx:203`)

**Reality:**
- `BookingLinkService.js:42` is real — generates Cal.com booking URL for the agent's calcom_username (which is in the TS type but not on the DB table — same schema lie).
- AI is supposed to send the link in conversation when it decides the lead is qualified. The trigger is in the system prompt: "When you have all info: 'Awesome, I've got a few places in mind! Want me to send some listings or would you prefer to see them in person?'"
- The actual Cal.com link insertion is not in `buildSmsPrompt` — it has to be triggered manually or by another path. I did not find a code path that automatically inserts a booking URL into an AI message based on qualification status. Worth verifying.

**Customization:** Cal.com username comes from `agent.calcom_username` (TS type) — DB column doesn't exist on `real_estate_agents`. Would need explicit join or schema fix.

---

## Stage 6 — Booking confirmation

**Marketing:** "Qualified leads get booked on your calendar automatically. You show up to the meeting — the AI did the work." (`app/page.tsx:275`)

**Reality (this part works):**
- Cal.com fires webhook to `/webhook/calcom` (`routes/calcom-webhook.js:31`), signature-verified.
- `BOOKING_CREATED` event → `lib/sms-templates.ts:9` `generateBookingConfirmationSMS`:
  ```
  Hi {lead.name}! Your appointment with {agent.name} is confirmed
  for {date} at {time}. Meeting link: {booking.meetingLink}
  Reply STOP to opt out.
  ```
- Templated, not AI. That's appropriate for a confirmation. ✓
- `BOOKING_RESCHEDULED` and `BOOKING_CANCELLED` handlers exist with similar templates.

This stage is the only stage that mostly works as advertised, **provided the buyer reaches it.**

---

## Stage 7 — Pre-meeting & meeting

**Marketing:** No specific claims about reminders.

**Reality:** No reminder SMS code path I found (24h-before, 1h-before). Could exist as a sequence type but `SequenceType` enum is `no_response / post_viewing / no_show / nurture` — no `pre_meeting`. Reminders would have to come from Cal.com itself, not LeadFlow.

The meeting itself is offline — agent and buyer meet, talk, see properties.

---

## Stage 8 — Post-meeting follow-up

**Reality:**
- `post_viewing` sequence type fires 4h after a booking ends (`lib/types/sequences.ts:8`).
- `nurture` sequence (7d) for general nurture.
- Sequence runner walks `lead_sequences` rows, calls AI to generate the message, sends via Twilio.
- **Same agent.market / agent.settings problem applies** — sequences likely fail the same gate the inbound webhook does, or run the templated `FUBService.generateAiSmsResponse` instead. Worth probing.

**Customization:** None — sequence content is hardcoded triggers + system prompt overlays at `lib/ai.ts:447-457`.

---

## Stage 9 — Edge cases

| Event | Handler | Status |
|---|---|---|
| Buyer replies "STOP" / "UNSUBSCRIBE" | `isOptOutMessage` → `handleOptOut` → lead `status='opted_out'`, confirmation TwiML | ✓ Works (templated) |
| Buyer replies "START" / "SUBSCRIBE" | `isOptInMessage` → `handleOptIn` → updates `consent_sms` | ✓ Works |
| Buyer no-shows the meeting | `no_show` sequence (30m post-meeting) | Same AI-gate caveat |
| Lead has been quiet 24h | `no_response` sequence | Same AI-gate caveat |
| AI sends a satisfaction ping | `handleSatisfactionReply` records 1-5 score | ✓ Works (CSAT path) |
| Agent (human) takes over the conversation | **Not verified.** `sequences.ts:14` defines `paused = "Lead responded, sequence paused"` — pauses on LEAD reply, not AGENT reply. The FAQ says "AI pauses the moment you respond" — couldn't find code that pauses sequences when the agent's user account sends an outbound message. Likely a gap. |

---

## Stage 10 — Privacy / Terms

Buyer never sees these unless they actively visit the marketing site. Privacy says "operated by Imagine Squared / landyourleads.com." Brand mismatch with home/login page is documented in audit-2026-05-04 §6.

---

## What the buyer experiences today (best guess, given the bugs)

**Path A (FUB-routed lead):** receives the templated `"Hi [first], I'm [AGENT_NAME env]. I have properties matching your interests. Reply YES to see options."` — not personalized, not AI, not under 30 seconds in any meaningful sense (still fast, just not for the marketed reason). If they reply, Path B applies and likely silently dies.

**Path B (cold text to Twilio number):** silently dropped. Lead is created in FUB, but the buyer hears nothing. Agent might see a new FUB lead notification but nothing further.

**If the schema bug is fixed,** Path B becomes a real conversational AI loop with reasonable warmth, decent qualification, and Cal.com booking handoff. That's the honest "happy path."

---

## Mapping to product / feature set

| Buyer-visible behavior | Code surface | Currently |
|---|---|---|
| First contact SMS (Path A) | `lib/services/FUBService.js:351` `generateAiSmsResponse` | hardcoded template, single global `AGENT_NAME` |
| First contact SMS (Path B) | `app/api/webhook/twilio/route.ts` → `inbound-sms-service.ts` → `lib/ai.ts buildSmsPrompt` | gated off (schema mismatch) |
| Tone / persona | `lib/ai.ts:385` system prompt + `:447-457` trigger guidelines | hardcoded, not user-customizable |
| Model selection | `lib/ai.ts:46-65` env vars `AI_PROVIDER`, `AI_MODEL` | platform-wide, no UI, no tier override |
| Qualification | `lib/ai.ts:131` `qualifyLead` (`generateObject`) | runs only when AI runs |
| Booking link | `lib/services/BookingLinkService.js`, agent's `calcom_username` | works in isolation; AI insertion path not auto |
| Booking confirmation | `lib/sms-templates.ts:9` | templated, works |
| Sequences (no_response, post_viewing, no_show, nurture) | `lib/sequences.ts`, sequence runner | likely same agent-gate problem |
| Opt-out / Opt-in | `inbound-sms-service.ts` `isOptOutMessage` | works |
| Satisfaction ping | `handleSatisfactionReply` | works |
| Take-over (AI pauses on agent reply) | unverified | likely missing |
| Bio / templates / tone settings | none | UI doesn't exist |

---

## Genome miss-mode (cumulative across this journey)

1. **No buyer-side journey review.** The genome's `journey_reviews` config defines `new-agent-signup` (agent's POV) and `lead-response` (FUB → AI → dashboard, abstract). Neither walks the actual SMS exchange end-to-end as a fake buyer. Adding a `buyer-receives-ai-conversation` journey with a real Twilio→AI→reply probe would catch most of this.
2. **No cross-path consistency check.** Path A and Path B should land at the same first-contact SMS. They don't (templated vs. AI). No detection asserts they converge.
3. **TS-type vs DB-shape drift.** Already noted — needs a heartbeat job that diffs interface fields against canonical table columns.
4. **Marketing claims about model behavior aren't tested.** "AI personalizes," "AI scores," "AI books" — no E2E test fires a webhook and asserts the resulting outbound SMS contains the buyer's name, location, etc. Would have caught the FUBService template bug.

---

## Recommended action sequence

If you're handing this to the genome, the order matters:

1. **Schema/type unification (P0).** Without this, no AI runs in production for inbound SMS. Single mapper from `real_estate_agents` row → `Agent` shape, applied at every read site. Update TS interface to match.
2. **Replace `FUBService.generateAiSmsResponse` with a real call to `buildSmsPrompt`.** First-contact SMS today is misleading.
3. **Audit sequences and Cal.com link insertion.** If the AI doesn't run on inbound, sequences likely don't either.
4. **Add buyer-POV journey review** to `project.config.json` and re-fire the journey-review pipeline (which is itself broken — see audit-2026-05-03 §3.B). That's the structural fix that prevents this class of regression.
