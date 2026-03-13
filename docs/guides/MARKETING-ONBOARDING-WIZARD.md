# Marketing: Post-Login Onboarding Wizard — Content Strategy & Copy

**Use Case:** feat-post-login-onboarding-wizard  
**PRD Ref:** PRD-ONBOARDING-WIZARD-001  
**Author:** Marketing Agent  
**Status:** Complete

---

## 1. Positioning & Messaging Framework

### Core Message
> "You're 5 minutes from responding to every lead in under 30 seconds — automatically."

### Value Ladder (Wizard Context)
The wizard is the moment a new agent goes from *paying customer* to *active user*. Every piece of copy must accelerate that transition by making the setup feel fast, safe, and high-stakes.

**Tension:** Every minute without setup = leads going cold.  
**Resolution:** Each wizard step is a lock that clicks into place — progress feels tangible and rewarding.

### Tone
- Direct, not fluffy
- Time-conscious (agents are busy; this is quick)
- Concrete outcomes over feature descriptions
- Low jargon ("connect your CRM" not "authenticate via API key")

---

## 2. Wizard UI Copy

### Page Title / Header
```
Set up LeadFlow in 3 steps
You're almost there — let's get your AI responding to leads.
```

### Progress Bar Labels
```
Step 1: Connect FUB  →  Step 2: Add Phone  →  Step 3: Test It
```

---

### Step 1: Connect Follow Up Boss

**Step Label:** Connect FUB  
**Heading:** Connect your Follow Up Boss account

**Body:**
```
LeadFlow monitors your FUB inbox for new leads and responds within 30 seconds. 
To get started, you'll need your FUB API key.
```

**How-to helper link text:** `Where do I find my API key? →`

**Input label:** Follow Up Boss API Key  
**Input placeholder:** `Paste your API key here`

**Primary CTA:** `Connect FUB`  
**Loading state:** `Connecting…`  
**Skip link:** `Skip for now — I'll set this up later`

**Success state:**
```
✅ FUB connected!
LeadFlow is now watching for new leads in your Follow Up Boss account.
```

**Error states:**
- Invalid key: `That API key didn't work. Double-check it in your FUB account settings and try again.`
- Network error: `Couldn't reach Follow Up Boss right now. Check your connection and retry.`
- No API access on plan: `Your Follow Up Boss plan may not include API access. Contact FUB support or your brokerage admin.`

---

### Step 2: Add Your Phone Number

**Step Label:** Add Phone  
**Heading:** Set up your SMS number

**Body:**
```
LeadFlow will text your leads from this number. 
You can get a fresh number or use one you already have in Twilio.
```

**Option A — New Number:**
```
Get a new number
We'll assign you a local number. Just enter your area code.
```
- Input label: `Area code (US or Canada)`
- Input placeholder: `e.g. 416`
- CTA: `Get My Number`
- Cost disclosure: `Twilio phone numbers cost ~$1/month, billed directly to your Twilio account.`
- Success: `✅ Your number: +1 (XXX) XXX-XXXX — ready to send SMS.`

**Option B — Existing Number:**
```
Use a number I already have
Enter a Twilio number you own. Must be in international format (+1...).
```
- Input label: `Your Twilio phone number`
- Input placeholder: `+1 416 555 0100`
- CTA: `Add This Number`

**Primary CTA (page level):** `Continue →`  
**Skip link:** `Skip for now — I can't send SMS without this`

**Error states:**
- Invalid area code: `We couldn't find available numbers for that area code. Try a nearby area code.`
- Invalid format: `Enter the number in international format, e.g. +1 416 555 0100.`
- Provisioning failed: `Something went wrong. Try again or contact support.`

---

### Step 3: Verify SMS

**Step Label:** Test It  
**Heading:** Send a test SMS to yourself

**Body:**
```
Make sure everything's working. Enter your mobile number and we'll send 
a real text — the same way LeadFlow will text your leads.
```

**Input label:** Your mobile number  
**Input placeholder:** `+1 416 555 0100`

**Primary CTA:** `Send Test SMS`  
**Loading state:** `Sending…`

**SMS message copy (delivered to agent's phone):**
```
Hi [Agent First Name]! 👋 Your LeadFlow setup is complete. You're all set to 
auto-respond to leads in under 30 seconds. — LeadFlow AI
```

**Success state:**
```
✅ SMS sent! Check your phone.
You're ready. LeadFlow will now respond to your leads automatically.
```

**Error states:**
- Send failure: `Couldn't send the SMS. Check your phone number and try again. If this keeps happening, contact support.`
- Step 2 skipped (greyed): `Add a phone number in Step 2 to enable this.`

**Retry CTA:** `Try again`  
**Support link text:** `Contact support →`

---

### Completion Screen

**Heading:** You're all set 🎉

**Subheading:**
```
Here's your setup summary. Anything incomplete can be finished anytime 
in Settings → Integrations.
```

**Status Cards:**
| Status | Copy |
|--------|------|
| ✅ FUB Connected | `Follow Up Boss is linked. LeadFlow is watching for new leads.` |
| ⚠️ FUB Not Connected | `No CRM connected yet. Go to Settings → Integrations to complete.` |
| ✅ Phone Configured | `Your number: +1 (XXX) XXX-XXXX` |
| ⚠️ Phone Not Set Up | `No SMS number configured. You won't be able to text leads yet.` |
| ✅ SMS Verified | `Test message delivered. You're live.` |
| ⚠️ SMS Not Verified | `Skipped. Verify anytime in Settings → Integrations.` |

**Primary CTA:** `Go to Dashboard →`

**Footer note (if any steps skipped):**
```
You can complete setup anytime in Settings → Integrations. 
Until then, LeadFlow won't be able to respond to leads for unconfigured steps.
```

---

## 3. Email Sequence

### Email 1 — Immediate (on signup)

**Subject:** You're in — set up LeadFlow in 5 minutes  
**Preview text:** Your AI is ready. One thing left to do.

---

**Body:**

Hi [First Name],

Welcome to LeadFlow. Your account is active.

Here's the thing: right now, no leads are getting auto-responded to. That changes the moment you connect your Follow Up Boss account and set up your SMS number — which takes about 5 minutes.

**[Complete Your Setup →]** *(link to /onboarding)*

What you're setting up:

1. **Connect Follow Up Boss** — LeadFlow watches your FUB inbox for new leads
2. **Add your SMS number** — Leads get a response in <30 seconds from your number
3. **Send a test text** — See it work before your first real lead comes in

Once these 3 steps are done, LeadFlow is live. Every new lead in FUB gets a response while you're showing houses, in a meeting, or asleep.

**[Set Up Now — Takes 5 Minutes →]** *(link to /onboarding)*

Talk soon,  
The LeadFlow Team

*P.S. If you run into any issues during setup, reply to this email — we'll help you get live today.*

---

### Email 2 — +24h (if wizard not completed)

**Trigger condition:** `agents.onboarding_completed = false` at 24h post-signup  
**Subject:** You're missing leads right now  
**Preview text:** Your LeadFlow setup is incomplete — here's how to fix it in 3 minutes.

---

**Body:**

Hi [First Name],

You signed up for LeadFlow yesterday — but your setup isn't finished.

That means any new leads that came into your Follow Up Boss account in the last 24 hours? No response. They've been waiting.

The average lead stops engaging after **5 minutes** without a reply. LeadFlow can get you to <30 seconds — but only once you finish setup.

**[Finish Setup Now →]** *(link to /onboarding)*

It's 3 steps. Takes under 5 minutes. Here's where you left off:

[DYNAMIC CONTENT — based on onboarding_step]  
- Step 1 incomplete: → Start with connecting your FUB account  
- Step 2 incomplete: → Add your SMS phone number  
- Step 3 incomplete: → Send your test text and go live

**[Complete Setup →]** *(link to /onboarding)*

You paid to stop losing leads. Let's make sure that's actually happening.

— LeadFlow Team

---

### Email 3 — +48h (if still not completed)

**Trigger condition:** `agents.onboarding_completed = false` at 48h post-signup  
**Subject:** Want help getting set up? (free 15-min call)  
**Preview text:** Book a quick setup call — we'll get you live before you hang up.

---

**Body:**

Hi [First Name],

Your LeadFlow account has been sitting idle for 2 days.

We get it — getting a new tool set up takes time and mental energy. Sometimes it's easier to just have someone walk you through it.

**Book a free 15-minute setup call →** *(link to Calendly / Cal.com booking)*

On the call, we'll:
- Connect your Follow Up Boss account (takes 2 minutes with screen share)
- Set up your SMS number
- Send your first test lead response so you see it work live

Zero sales pitch. Just getting you live.

**[Book My Setup Call →]** *(link to booking)*

Or, if you'd rather do it yourself:  
**[Complete Setup on My Own →]** *(link to /onboarding)*

Either way, let's get you responding to leads today.

— LeadFlow Team

*If now isn't the right time, reply "pause" and we'll check back in next week.*

---

## 4. In-Product Micro-copy

### Dashboard Banner (if onboarding_completed = false)
```
⚠️ Your setup isn't complete — LeadFlow isn't responding to leads yet.
[Finish Setup →]
```

### Settings → Integrations page intro (re-entry context)
```
Manage your LeadFlow integrations. You can update your FUB connection, 
change your phone number, or re-verify SMS at any time.
```

---

## 5. Content Requirements for Design/Dev

### UI Copy Requirements
- All wizard step copy is in this document; dev should reference it directly
- Error messages must be inline (below input field), not toast/alert popups
- Skip links must be secondary/muted style — not primary CTA prominence
- Loading states required for: "Connect FUB", "Get My Number", "Send Test SMS"
- Progress bar labels must match exactly: "Connect FUB → Add Phone → Test It"

### Email Sequence Implementation Notes
- Email 1: Transactional, triggered by account creation webhook (immediate)
- Email 2: Triggered by cron job checking `onboarding_completed = false` at T+24h
- Email 3: Triggered by cron job checking `onboarding_completed = false` at T+48h
- Email 2 body should dynamically inject which step the user left off on (query `onboarding_step` column)
- All emails link to `/onboarding` (authenticated — redirect to login if session expired)
- Unsubscribe: these are transactional (setup-critical), but include a "pause" soft opt-out for Email 3

### SMS Test Message (US-4 final copy)
```
Hi [Agent First Name]! 👋 Your LeadFlow setup is complete. You're all set to auto-respond to leads in under 30 seconds. — LeadFlow AI
```
- Character count: ~130 chars — fits in 1 SMS segment ✅
- Personalization: `[Agent First Name]` pulled from `agents.name` or auth profile
- No links (not a phishing red flag on first contact)

---

## 6. Measurement & Success Signals

| Email | Primary Metric | Target |
|-------|----------------|--------|
| Email 1 | Click-through to /onboarding | ≥ 40% |
| Email 2 | Setup completion within 24h of send | ≥ 30% |
| Email 3 | Call bookings OR self-serve completion | ≥ 20% combined |

| Wizard | Primary Metric | Target |
|--------|----------------|--------|
| Step 1 completion | % who connect FUB | ≥ 85% |
| Step 2 completion | % who add phone | ≥ 80% |
| Step 3 completion | % who verify SMS | ≥ 80% |
| Full wizard completion | % who reach completion screen | ≥ 80% |

---

*This document is the source of truth for all onboarding wizard copy. Design and Dev should not write their own copy — pull directly from here.*
