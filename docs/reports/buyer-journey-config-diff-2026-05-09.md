# project.config.json — proposed journey addition

**File:** `/Users/clawdbot/projects/leadflow/project.config.json`
**Existing journeys:** `new-agent-signup`, `lead-response`
**Adding:** `home-buyer-receives-ai-conversation`

The new journey is the buyer's POV — entry via FUB webhook (Path A) or cold text to Twilio number (Path B), through to booked meeting. The existing two journeys are agent-side; this is the missing third side.

## Patch

Add this object to `journeys[]` after `lead-response`:

```json
{
  "id": "home-buyer-receives-ai-conversation",
  "name": "Home Buyer Receives AI Conversation",
  "persona": "Real-estate buyer, mid-30s, just submitted a property inquiry online or texted a yard-sign number. Expects a quick human-feeling response.",
  "entry_point": "https://leadflow-ai-five.vercel.app  (Path A: FUB webhook)  OR  Twilio number (Path B: cold text)",
  "expected_outcome": "Buyer receives a personalized SMS within 30 seconds. Multi-turn AI conversation qualifies them. Cal.com link sent when ready. Booking confirmed via templated SMS.",
  "products_involved": [
    "fub-webhook",
    "twilio-inbound",
    "ai-sms-generator",
    "calcom-booking",
    "customer-dashboard"
  ],
  "steps": [
    {
      "action": "Path A: FUB receives form submission, fires peopleCreated webhook",
      "from": "external (Zillow / agent site / FB ad)",
      "to": "/webhook/fub",
      "expected": "Signature verified, FUBService.handleLeadCreated fires"
    },
    {
      "action": "Path B: Buyer texts the agent's Twilio number",
      "from": "external",
      "to": "/api/webhook/twilio",
      "expected": "Signature verified, lead created or matched"
    },
    {
      "action": "System resolves the assigned agent",
      "from": "lead",
      "to": "real_estate_agents row",
      "expected": "agent.name, market, settings populated (CURRENTLY BROKEN per UC-1)"
    },
    {
      "action": "AI generates personalized SMS using lead's name and inquiry context",
      "from": "buildSmsPrompt",
      "to": "Twilio outbound",
      "expected": "Outbound contains lead first name, agent first name, single specific question (CURRENTLY: Path A is hardcoded template, Path B silently drops)"
    },
    {
      "action": "Buyer replies; AI continues qualification (name → location → budget → timeline)",
      "from": "Twilio inbound",
      "to": "AI generates next message",
      "expected": "Each reply advances qualification by one step; lead row updates with extracted info"
    },
    {
      "action": "AI sends Cal.com booking link when qualification complete",
      "from": "lib/services/BookingLinkService",
      "to": "outbound SMS",
      "expected": "Link uses agent's calcom_username (CURRENTLY: field not on DB schema)"
    },
    {
      "action": "Buyer books a slot via Cal.com",
      "from": "Cal.com",
      "to": "/webhook/calcom",
      "expected": "BOOKING_CREATED event, signature verified"
    },
    {
      "action": "Confirmation SMS sent (templated)",
      "from": "lib/sms-templates.ts generateBookingConfirmationSMS",
      "to": "Twilio outbound",
      "expected": "Buyer receives 'Hi {name}! Your appointment with {agent.name} is confirmed for {date} at {time}…'"
    },
    {
      "action": "Buyer arrives (or no-shows); follow-up sequences fire",
      "from": "sequence runner",
      "to": "post_viewing or no_show sequence",
      "expected": "AI sends follow-up message via buildSmsPrompt"
    },
    {
      "action": "Buyer can opt out (STOP) or reactivate (START) at any point",
      "from": "Twilio inbound",
      "to": "isOptOutMessage / isOptInMessage handlers",
      "expected": "lead.status updated, confirmation reply sent"
    }
  ]
}
```

## Why this journey matters

Adding this entry has two effects:

1. **Journey reviews** — once the genome's journey-review pipeline is unstuck (per `audit-2026-05-03 §3.B`), the PM agent will walk this end-to-end against the live system every 14 days. That walk would catch the schema bug, the FUBService template, the unverified take-over claim — without anyone having to ask.

2. **Generated docs** — `JOURNEYS.md` regenerates from `project.config.json` on heartbeat. The new journey shows up there, and any agent reading docs sees it as a first-class concern.

## Caveats

- **Don't add this until the journey-review pipeline is fixed.** Adding it while broken just queues another stuck pending review. Either (a) fix the pipeline first, or (b) add the journey now and accept it'll review eventually.
- **The "expected" lines describe the desired state, not current.** When this journey reviews against today's code, most steps will fail — that's the point. Failure surface makes the audit tractable.
