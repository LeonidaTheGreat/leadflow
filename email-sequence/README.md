# LeadFlow Pilot Onboarding Email Sequence

A complete 5-email automated sequence for onboarding real estate agents to the LeadFlow pilot program.

## 📧 Email Sequence Overview

| # | Email | Timing | Purpose |
|---|-------|--------|---------|
| 1 | **Welcome** | Immediate | Set expectations, provide dashboard access |
| 2 | **Day-3 Tips** | 72 hours | Share best practices from successful pilots |
| 3 | **Week-1 Check-in** | 7 days | Progress tracking, motivation, milestone review |
| 4 | **Mid-Pilot Feedback** | 15 days | Collect NPS and feature feedback |
| 5 | **Completion** | 30 days | Celebrate, offer discount, next steps |

## 🎯 Personalization Tokens

All emails support dynamic personalization:

| Token | Description | Example |
|-------|-------------|---------|
| `{{firstName}}` | Agent's first name | "Sarah" |
| `{{fullName}}` | Agent's full name | "Sarah Johnson" |
| `{{brokerage}}` | Agent's brokerage | "Keller Williams" |
| `{{startDate}}` | Pilot start date | "March 1, 2026" |
| `{{dashboardUrl}}` | Personalized dashboard | `https://app.leadflow.ai/d/...` |
| `{{calendarLink}}` | Onboarding call booking | `https://cal.com/leadflow/...` |

## 🧪 A/B Testing

Each email has 2 subject line variants:
- **Variant A**: Emotional/enthusiastic tone
- **Variant B**: Direct/informational tone

Variant assignment is deterministic based on agent ID hash (50/50 split).

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install resend
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your Resend API key
```

### 3. Run Self-Test
```bash
node self-test.js
```

### 4. Send Test Emails
```bash
# Set your API key
export RESEND_API_KEY=re_your_key_here

# Run the self-test (includes test email sending)
node self-test.js
```

## 📁 File Structure

```
email-sequence/
├── sequence-config.json       # Email sequence configuration
├── automation-triggers.md     # Trigger documentation
├── resend-integration.js      # API integration code
├── self-test.js              # Validation & testing script
├── .env.example              # Environment template
├── README.md                 # This file
└── templates/
    ├── welcome.html          # Welcome email (HTML)
    ├── welcome.txt           # Welcome email (plain text)
    ├── day3_tips.html        # Day-3 tips (HTML)
    ├── day3_tips.txt         # Day-3 tips (plain text)
    ├── week1_checkin.html    # Week-1 check-in (HTML)
    ├── week1_checkin.txt     # Week-1 check-in (plain text)
    ├── mid_pilot_feedback.html # Mid-pilot feedback (HTML)
    ├── mid_pilot_feedback.txt  # Mid-pilot feedback (plain text)
    ├── completion.html       # Completion email (HTML)
    └── completion.txt        # Completion email (plain text)
```

## 🔧 Integration

### Basic Usage
```javascript
import { sendPilotEmail, getVariantForAgent } from './resend-integration.js';

const agent = {
  id: 'agent-123',
  firstName: 'Sarah',
  email: 'sarah@example.com',
  brokerage: 'Keller Williams',
  pilotStartDate: '2026-03-01',
  dashboardUrl: 'https://app.leadflow.ai/d/agent-123'
};

const variant = getVariantForAgent(agent.id);
await sendPilotEmail(agent, 'welcome', variant);
```

### Webhook Handling
```javascript
// Handle Resend webhooks for analytics
app.post('/webhooks/email/delivered', (req, res) => {
  const { email_id, to } = req.body;
  // Log delivery, update agent record
});
```

## 📊 Analytics Tags

All emails include metadata tags for tracking:
- `campaign`: "pilot-onboarding"
- `email_id`: (welcome|day3_tips|week1_checkin|mid_pilot_feedback|completion)
- `variant`: (A|B)
- `agent_id`: Agent's unique ID

## 🔄 Automation Triggers

| Trigger | Condition | Action |
|---------|-----------|--------|
| `pilot.enrolled` | Agent signs up | Send Welcome (immediate) |
| `pilot.day3_reminder` | 72h elapsed | Send Day-3 Tips |
| `pilot.week1_checkin` | 7d elapsed | Send Week-1 Check-in |
| `pilot.mid_feedback` | 15d elapsed | Send Feedback Request |
| `pilot.complete` | 30d elapsed | Send Completion |

## ✅ Acceptance Criteria Status

- [x] 5-email sequence written
- [x] Personalization tokens configured
- [x] Resend integration with API setup
- [x] A/B test subject lines (2 variants per email)
- [x] Email templates in HTML + plain text
- [x] Automation triggers documented
- [x] Self-test validation script

## 📝 License

© 2026 LeadFlow AI, Inc. All rights reserved.
