# Marketing Content Strategy: Session Analytics — Pilot Usage Tracking

**Use Case:** feat-session-analytics-pilot  
**Date:** 2026-03-10  
**Status:** Complete  

---

## Overview

This is an **internal analytics feature** — not customer-facing. Marketing's role is to define the messaging and content for:
1. Inactivity alerts (Telegram notifications to Stojan/PM)
2. Internal usage report presentation
3. Future customer-facing activity features (content brief)

---

## 1. Inactivity Alert Copy (Telegram)

### Primary Alert (72h inactive)
```
⚠️ *Pilot Alert: [Agent Name]*

Hasn't logged into LeadFlow for *3 days*.

📊 *Last Activity:* [Date] at [Time]
📧 *Email:* [agent@email.com]
📱 *Sessions (7d):* [N]

💡 *Suggested Action:* Quick check-in — see if they need help with setup or have questions.
```

### Escalation Alert (7 days inactive)
```
🚨 *Pilot At Risk: [Agent Name]*

No login activity for *7 days*. Consider this pilot at risk of churning.

📊 *Last Activity:* [Date] at [Time]
📧 *Email:* [agent@email.com]
📱 *Total Sessions:* [N]
🔥 *Most Used Feature:* [Feature Name]

💡 *Suggested Action:* Personal outreach call. Understand blockers.
```

### Re-engagement Success Alert (optional)
```
✅ *Pilot Re-engaged: [Agent Name]*

Back in the dashboard after [X] days away!

📊 *New Session Started:* [Date] at [Time]
🎉 *Welcome them back with a quick check-in.*
```

### Alert Tone Guidelines
- **Urgent but not panicked** — 72h is a warning, not a crisis
- **Action-oriented** — always include a "Suggested Action"
- **Data-rich** — give Stojan context to act intelligently
- **Professional** — this is internal ops, not marketing fluff

---

## 2. Internal Usage Report Content Structure

### Daily Digest Format (Telegram or Email)

**Subject/Header:** `📊 LeadFlow Pilot Activity — [Date]`

```
📊 *LeadFlow Pilot Activity — Monday, March 10*

*Active Pilots (24h):* [N] of [Total]
*At Risk (>72h inactive):* [N]
*New Sessions Today:* [N]

━━━

*🔥 Most Active:*
1. [Agent Name] — [N] sessions, last active [time]
2. [Agent Name] — [N] sessions, last active [time]
3. [Agent Name] — [N] sessions, last active [time]

*⚠️ Needs Attention:*
• [Agent Name] — last seen [days] ago
• [Agent Name] — last seen [days] ago

*📈 Feature Usage (7d):*
• Dashboard Overview: [N] views
• SMS Conversations: [N] views
• Settings: [N] views
• Billing: [N] views

━━━

*💡 Today's Insight:*
[Dynamic insight based on data — e.g., "3 pilots haven't checked their SMS conversations yet. Consider a 'how to respond to leads' tutorial."]
```

### Weekly Summary Format

**Header:** `📈 LeadFlow Pilot Week in Review — [Date Range]`

```
📈 *Pilot Week in Review — Mar 3-9*

*Engagement Metrics:*
• Active Pilots (≥1 session): [N] of [Total] ([%]%)
• Total Sessions: [N]
• Avg Sessions per Pilot: [N]
• At-Risk Alerts Sent: [N]

*Feature Adoption:*
• Viewed Conversations: [%]%
• Updated Settings: [%]%
• Viewed Billing: [%]%

*Churn Risk:*
🟢 Low (active within 48h): [N] pilots
🟡 Medium (3-7 days): [N] pilots
🔴 High (>7 days): [N] pilots

*Action Items for Next Week:*
1. [Specific action based on data]
2. [Specific action based on data]
3. [Specific action based on data]
```

---

## 3. Content Brief: Future Customer-Facing Activity Feature

**Hypothesis:** Agents may want to see their own activity and performance over time.

### Content Requirements for "My Activity" Page

**Page Title:** My Activity  
**URL:** `/dashboard/activity`  
**Audience:** Pilot agents (future: all agents)

#### Section 1: Activity Overview Card
```
*Headline:* Your Activity This Week
*Subhead:* Track how you're engaging with your leads

*Metrics to Display:*
• Sessions this week: [N]
• Total time in dashboard: [N] minutes
• Last login: [Date/Time]
• Most visited section: [Feature Name]

*Empty State (new agent):*
"Welcome! Your activity will appear here once you start using the dashboard."
```

#### Section 2: Feature Discovery Checklist
```
*Headline:* Get the Most from LeadFlow
*Subhead:* Complete these steps to maximize your lead response

[ ] View your dashboard overview
[ ] Check your SMS conversations
[ ] Update your settings
[ ] Connect your calendar
[ ] Respond to your first lead

*Progress Messaging:*
• 0/5: "Let's get you set up!"
• 1-2/5: "Good start — keep exploring!"
• 3-4/5: "Almost there!"
• 5/5: "You're all set! 🎉"
```

#### Section 3: Quick Tips (Contextual)
```
*Headline:* Tips Based on Your Activity

*If low conversation check:*
"💡 You haven't checked your SMS conversations recently. New leads may be waiting!"

*If no settings configured:*
"⚙️ Take 2 minutes to customize your settings for better lead handling."

*If highly active:*
"🔥 You're crushing it! Consistent dashboard use = faster lead response."
```

---

## 4. Messaging Framework for Pilot Engagement

### Core Message
> "We notice when you're engaged — and when you might need help."

### Supporting Messages
- **Proactive support:** "Our team monitors pilot activity to ensure you get the most from LeadFlow."
- **Data-driven improvement:** "Your usage helps us build a better product for real estate agents like you."
- **No surveillance:** "This data is internal-only and helps us support you, not judge you."

### Privacy Note (for future customer-facing disclosure)
```
*Headline:* How We Use Your Activity Data

We track dashboard usage to:
✓ Identify when you might need support
✓ Improve features that matter most
✓ Ensure our AI is responding to your leads

We do NOT:
✗ Share this data with third parties
✗ Use it for marketing without permission
✗ Monitor personal communications

Questions? Contact Stojan directly.
```

---

## 5. Content Requirements for Design/Dev

### For Inactivity Alert System
| Element | Content | Format |
|---------|---------|--------|
| Alert icon | ⚠️ / 🚨 / ✅ | Unicode emoji |
| Agent name | Dynamic | Bold markdown |
| Last activity | Dynamic timestamp | Relative time ("3 days ago") |
| Suggested action | Pre-written copy | Italic markdown |
| CTA | Link to agent profile | Deep link |

### For Internal Dashboard (if built)
| Element | Content | Notes |
|---------|---------|-------|
| Page title | Pilot Usage Analytics | H1 |
| Empty state | "No pilot data yet. Agents will appear here after their first login." | Centered, friendly |
| Table headers | Agent, Last Login, Sessions (7d), Status, Actions | Clear, scannable |
| Status labels | Active (green), Idle (yellow), At Risk (red) | Color-coded |
| Filter labels | All, Active, Idle, At Risk | Tab-style |

### For Future "My Activity" Page
| Element | Content | Component |
|---------|---------|-----------|
| Page title | My Activity | H1 |
| Section headers | Activity This Week, Feature Checklist, Tips | H2 |
| Empty state illustrations | Friendly agent onboarding graphics | Illustration + text |
| Progress bar | Feature discovery completion | Visual progress |
| Tooltips | "Why this matters" explanations | Hover tooltip |

---

## 6. Acceptance Criteria for Marketing

- [x] Inactivity alert copy written (72h and 7-day variants)
- [x] Daily digest format defined
- [x] Weekly summary format defined
- [x] Future "My Activity" page content brief created
- [x] Messaging framework documented
- [x] Content requirements for design/dev specified

---

## Deliverables Summary

| Deliverable | Location | Status |
|-------------|----------|--------|
| Inactivity alert copy | This doc §1 | ✅ Complete |
| Internal report formats | This doc §2 | ✅ Complete |
| Customer-facing content brief | This doc §3 | ✅ Complete |
| Messaging framework | This doc §4 | ✅ Complete |
| Design/dev requirements | This doc §5 | ✅ Complete |

---

**Next Steps:**
1. Design team: Reference §5 for UI copy and layout requirements
2. Dev team: Implement Telegram alerts using copy from §1
3. PM: Review and approve messaging framework in §4
4. Future: When building "My Activity" page, use content brief in §3

**Marketing Role Complete** — No further marketing work required for this internal feature.
