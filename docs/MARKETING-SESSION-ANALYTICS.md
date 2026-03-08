# Session Analytics — Pilot Agent Usage Tracking
## Marketing Content Strategy & Copy Deliverables

**Use Case:** feat-session-analytics-pilot  
**Task ID:** e216ab89-78fc-4183-89cc-c8f246f855c0  
**Date:** 2026-03-10  
**Status:** Complete

---

## 1. Executive Summary

This document provides content strategy, messaging frameworks, and copy for the Session Analytics pilot feature. The goal is to enable proactive pilot agent engagement through clear, actionable communication.

**Target Audiences:**
- **Primary:** Stojan (founder) — receives inactivity alerts, views internal analytics
- **Secondary:** Product Manager — reviews engagement data, makes prioritization decisions
- **Tertiary:** Pilot agents (future) — may see their own activity data in v2

---

## 2. Inactivity Alert Messaging (Telegram)

### Alert Format Specification

**Trigger:** Pilot agent inactive for >72 hours  
**Frequency:** Max once per 24h per agent  
**Channel:** Telegram (LeadFlow channel)

### Alert Templates

#### Template A: First Inactivity Alert (72h)
```
⚠️ Pilot Agent Inactivity Alert

[Agent Name] hasn't logged into LeadFlow for 3 days.

📊 Last seen: [Date/Time]
📧 Email: [agent@example.com]
📈 Sessions (7d): [X]
🔥 Most visited: [Page]

💡 Suggested action: Send check-in message
```

#### Template B: Extended Inactivity (7 days)
```
🚨 Pilot Agent At Risk

[Agent Name] — no activity for 7 days.

📊 Last login: [Date]
📉 Total sessions: [X]
⏰ Inactive for: [X] days

⚡ Risk level: HIGH
💡 Recommended: Personal outreach call
```

#### Template C: Reactivation (agent returns after alert)
```
✅ Pilot Agent Reactivated

[Agent Name] is back! Logged in after [X] days.

📊 Sessions today: [X]
🎯 Current page: [Page]

💡 Good time to check in: "How's everything going?"
```

---

## 3. Internal Analytics Dashboard — Content Brief

### Purpose
Provide Stojan with at-a-glance visibility into pilot agent engagement without requiring technical expertise or database queries.

### Content Requirements for Design/Dev

#### Section 1: Overview Header
**Copy:**
- Title: "Pilot Agent Engagement"
- Subtitle: "Real-time usage tracking for pilot program participants"
- Last updated: "Data refreshed [X] minutes ago"

#### Section 2: Key Metrics Bar
**Metrics to display:**
| Metric | Label | Tooltip Copy |
|--------|-------|--------------|
| X of Y | Active Pilots | "Agents with ≥1 session in last 7 days" |
| X% | Engagement Rate | "% of pilots active this week" |
| Xh | Avg Time Since Login | "Average hours since last activity" |
| X | Alerts (24h) | "Inactivity alerts triggered" |

#### Section 3: Pilot Agent Table
**Column Headers:**
| Column | Description |
|--------|-------------|
| Agent | Name + email |
| Last Login | Timestamp (relative: "2 hours ago") |
| Sessions (7d) | Count with trend indicator (↑↓) |
| Top Feature | Most visited page/feature |
| Status | Badge: Active / Idle / At Risk |
| Actions | Quick links: View details / Send message |

**Status Badge Definitions:**
- 🟢 **Active** — Session within 24h
- 🟡 **Idle** — Last session 24-72h ago
- 🔴 **At Risk** — No session >72h

#### Section 4: Feature Usage Breakdown
**Chart Title:** "Feature Adoption"
**Subtitle:** "Which dashboard features pilots use most"
**Empty State:** "No data yet — pilots haven't explored the dashboard"

#### Section 5: Activity Timeline
**Section Title:** "Recent Activity"
**Item Format:**
```
[Time] — [Agent Name] — [Action]
Example: "2 min ago — Jane Smith — Viewed Conversations"
```

---

## 4. API Response Messaging (for /api/internal/pilot-usage)

### Response Field Labels (for UI mapping)

```json
{
  "field_mapping": {
    "agentId": "Internal ID (not displayed)",
    "name": "Agent Name",
    "email": "Email Address",
    "lastLogin": "Last Login",
    "sessionsLast7d": "Sessions (7 days)",
    "topPage": "Most Used Feature",
    "inactiveHours": "Hours Since Activity",
    "status": "Engagement Status"
  }
}
```

### Status Calculation Logic (for dev reference)
```
if inactiveHours < 24: status = "Active"
if 24 ≤ inactiveHours < 72: status = "Idle"
if inactiveHours ≥ 72: status = "At Risk"
```

---

## 5. Email Outreach Templates (for Stojan's use)

### Email A: Gentle Check-in (3 days inactive)
**Subject:** Quick check-in — how's LeadFlow working for you?

```
Hi [Agent Name],

Hope you're doing well! I noticed you haven't logged into LeadFlow for a few days and wanted to check in.

Is everything working smoothly? Any questions about the dashboard or SMS features?

I'm here to help if you need anything at all.

Best,
Stojan
```

### Email B: Reactivation Offer (7 days inactive)
**Subject:** Let's get you back on track — 5-min setup call?

```
Hi [Agent Name],

I see it's been a week since you last used LeadFlow. I want to make sure you're getting value from the pilot.

Would a quick 5-minute call help? I can walk through any features or answer questions.

[Book a time here] or just reply to this email.

Looking forward to hearing from you!

Stojan
```

### Email C: Feedback Request (upon pilot completion)
**Subject:** Your LeadFlow pilot experience — 2-min feedback?

```
Hi [Agent Name],

As your pilot period wraps up, I'd love your honest feedback.

What worked? What didn't? Would you recommend LeadFlow to other agents?

[2-minute feedback form]

Your input shapes what we build next.

Thanks,
Stojan
```

---

## 6. Content Brief for Future Agent-Facing Activity Page (v2)

**Note:** Out of scope for v1, but content prepared for future iteration.

### Page Title: "My Activity"
### Purpose: Let agents see their own usage patterns

**Sections:**
1. **Overview Card**
   - "You've logged in [X] times this week"
   - "Last active: [time]"

2. **Usage Stats**
   - "Conversations viewed: [X]"
   - "Messages sent: [X]"
   - "Time in dashboard: [X] hours"

3. **Feature Discovery**
   - "Features you've tried: [X] of [Y]"
   - "Try next: [Feature name] — [One-line description]"

---

## 7. Messaging Framework: Why Session Analytics Matters

### Internal Positioning (for Stojan/PM)
**Key Message:** "Know before they churn"

**Talking Points:**
1. **Early Warning System** — Identify disengagement before it becomes churn
2. **Product-Market Fit Signals** — See which features resonate with pilots
3. **Data-Driven Prioritization** — Build what pilots actually use
4. **Proactive Support** — Reach out when help is needed, not after they've left

### External Positioning (future, if agents see their data)
**Key Message:** "Your productivity, visualized"

**Talking Points:**
1. Track your lead response performance
2. See which activities drive results
3. Identify opportunities to improve

---

## 8. Design Content Requirements

### Icons Needed
| Icon | Usage |
|------|-------|
| Activity/Chart | Session analytics section |
| Clock | Last login timestamps |
| Alert/Triangle | At-risk status indicator |
| Checkmark | Active status indicator |
| Pause | Idle status indicator |
| Eye | Page view tracking |
| User | Agent identification |

### Color Coding
| Status | Color | Hex (suggested) |
|--------|-------|-----------------|
| Active | Green | #10B981 |
| Idle | Yellow | #F59E0B |
| At Risk | Red | #EF4444 |
| Neutral | Gray | #6B7280 |

---

## 9. Acceptance Criteria (Marketing)

- [x] Inactivity alert templates defined for Telegram
- [x] Internal analytics dashboard content brief complete
- [x] Status badge definitions and logic documented
- [x] Email outreach templates provided
- [x] API response field labels specified
- [x] Future agent-facing page content brief prepared
- [x] Messaging framework documented
- [x] Design content requirements listed

---

## 10. Files Created

| File | Path | Description |
|------|------|-------------|
| Marketing Deliverables | `/Users/clawdbot/projects/leadflow/docs/MARKETING-SESSION-ANALYTICS.md` | This document |

---

**Next Steps:**
1. Design team uses Section 3 (Internal Analytics Dashboard) for UI mockups
2. Dev team implements Telegram alerts using Section 2 templates
3. Stojan uses Section 5 email templates for pilot outreach
4. PM references Section 7 for product prioritization rationale

**Delivered by:** Marketing Agent  
**Ready for:** Design → Dev → QC
