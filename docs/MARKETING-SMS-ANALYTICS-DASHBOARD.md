# SMS Analytics Dashboard — Marketing Content Strategy & Copy

**Use Case:** feat-sms-analytics-dashboard  
**Task ID:** 5c0aa239-b851-4ea2-99f5-cb35f4dde36c  
**Date:** 2026-03-08  
**Owner:** Marketing (Content Strategy)

---

## 1. Positioning Statement

### Primary Positioning
**For** real estate agents using AI-driven SMS outreach  
**Who** need to understand if their lead engagement is actually working  
**LeadFlow's SMS Analytics Dashboard** is a performance visibility tool  
**That** shows delivery rates, reply rates, and booking conversions in one glance  
**Unlike** guessing or digging through message logs  
**Our solution** gives agents the confidence that their AI investment is generating real business results.

### Value Proposition (Short)
> "See exactly how your AI SMS performs — delivery, replies, and bookings. No more guessing if your outreach is working."

### Value Proposition (Long)
> "Your AI is texting leads 24/7. But are messages getting through? Are leads responding? Are those responses turning into appointments? The SMS Analytics Dashboard answers all three questions at a glance — so you know your LeadFlow investment is actually driving business."

---

## 2. Key Messaging Framework

### Core Message Pillars

| Pillar | Headline | Supporting Copy |
|--------|----------|-----------------|
| **Reliability** | "Know Your Messages Land" | See delivery rates in real-time. Catch carrier issues before they cost you leads. |
| **Engagement** | "See Who's Actually Responding" | Track reply rates to know if your AI conversations are hitting the mark. |
| **ROI** | "Track Leads to Appointments" | Booking conversion rate shows the real business impact of every SMS sent. |

### Feature-Specific Messaging

#### Delivery Rate Card
- **Label:** Delivery Rate
- **Value Format:** XX%
- **Subtitle:** "{N} messages sent"
- **Empty State:** "No messages sent yet"
- **Tooltip:** "Percentage of SMS successfully delivered to lead phones. Low rates may indicate carrier or compliance issues."
- **Color Logic:** ≥80% green, 60-79% amber, <60% red

#### Reply Rate Card
- **Label:** Reply Rate
- **Value Format:** XX%
- **Subtitle:** "{N} leads replied"
- **Empty State:** "—"
- **Tooltip:** "Percentage of leads who responded to your AI SMS. Excludes opt-outs (STOP/UNSUBSCRIBE)."
- **Context Note:** "Industry average: 20-30% for cold outreach"

#### Booking Conversion Card
- **Label:** Booking Conversion
- **Value Format:** XX%
- **Subtitle:** "{N} appointments booked"
- **Empty State:** "—"
- **Tooltip:** "Of leads who replied to SMS, the percentage who booked an appointment."
- **Context Note:** "This is your true conversion metric — replies that became meetings."

---

## 3. Time Window Selector Copy

### Control Label
"Time Period"

### Options
| Value | Label | Use Case |
|-------|-------|----------|
| 7d | "Last 7 Days" | Recent performance, quick pulse check |
| 30d | "Last 30 Days" | Monthly trend, default view |
| all | "All Time" | Lifetime performance since signup |

### Loading State
"Loading metrics..."

---

## 4. Dashboard Integration Copy

### Section Header (if grouped)
"SMS Performance"

### Section Subheader
"How your AI outreach is performing across delivery, engagement, and conversions."

### Stats Bar Integration
The three cards should appear alongside existing stats (Lead Count, SMS Sent) in the existing dashboard stats bar. Maintain visual consistency with current stat cards.

---

## 5. Empty & Zero States

### New Agent (No Data)
**Headline:** "Your SMS analytics will appear here"
**Body:** "Once your AI starts sending messages to leads, you'll see delivery rates, reply rates, and booking conversions in real-time."
**CTA:** "Add your first lead to get started →"

### Time Window with No Activity
**Display:** "—" (em dash, not 0%)
**Rationale:** Avoids alarming new agents with 0% metrics when they simply haven't sent messages in that window.

---

## 6. Upsell & Upgrade Messaging (Future Use)

### Pro Tier Teaser (for Starter agents)
**Context:** Show when Starter agents hit SMS limits  
**Copy:** "You're approaching your 100 SMS limit. Upgrade to Pro for unlimited SMS and detailed analytics."
**CTA:** "Compare Plans"

### Benchmark Comparison (Pro/Team Tier)
**Context:** Show how agent compares to plan average  
**Copy:** "Your reply rate is {X}% higher than the Pro plan average."
**Rationale:** Reinforces value and encourages sharing.

---

## 7. Email & Notification Copy

### Weekly Stats Email (Future Feature)
**Subject:** "Your LeadFlow stats this week: {reply_rate}% reply rate"

**Body:**
```
Hi {first_name},

Your AI was busy this week. Here's how your SMS outreach performed:

📬 Delivery Rate: {delivery_rate}%
💬 Reply Rate: {reply_rate}%
📅 Booking Conversion: {booking_conversion}%

{conditional: if reply_rate > 30%}
🎉 Your reply rate is above average! Your AI conversations are resonating with leads.
{/conditional}

{conditional: if delivery_rate < 80%}
⚠️ Your delivery rate is lower than expected. Check your phone number configuration in Settings.
{/conditional}

View your full dashboard →
```

### Low Delivery Rate Alert (Future Feature)
**Trigger:** Delivery rate drops below 60%  
**Subject:** "Action needed: Your SMS delivery rate is low"  
**Body:** "Your recent SMS messages are failing to deliver. This usually indicates a carrier compliance issue or invalid phone number configuration. Check your settings or contact support."

---

## 8. Social Proof & Sharing Copy

### Shareable Stats (for agent screenshots)
Agents will screenshot these stats to share with colleagues. Design for this use case.

**Suggested shareable format:**
```
My AI lead response stats this month:
📬 94% delivery rate
💬 31% reply rate  
📅 18% booking conversion

Powered by LeadFlow AI
```

### Testimonial Prompts (for high performers)
When agents hit milestones, prompt for testimonials:
- "You've booked 10 appointments via AI SMS! Would you recommend LeadFlow to other agents?"
- "Your reply rate is in the top 10% of agents. Share what's working for you?"

---

## 9. Tooltip & Help Copy

### Metric Definitions (for ? icons)

**Delivery Rate:**
"The percentage of SMS messages successfully delivered to lead phone numbers. Calculated from Twilio delivery confirmations. Low rates may indicate invalid phone numbers, carrier filtering, or compliance issues."

**Reply Rate:**
"The percentage of unique leads who responded to your AI-sent SMS. Only counts leads who received at least one outbound message. Opt-out replies (STOP, UNSUBSCRIBE) are excluded."

**Booking Conversion:**
"The percentage of engaged leads (those who replied) who converted into booked appointments via Cal.com. This measures the true business impact of your SMS conversations."

### Time Window Help
"Change the time period to see how your SMS performance trends over different windows. 'Last 7 Days' shows recent activity, 'Last 30 Days' shows monthly trends, and 'All Time' shows lifetime performance."

---

## 10. SEO & Documentation Copy

### Help Center Article Title
"Understanding Your SMS Analytics Dashboard"

### Meta Description
"Learn how to interpret delivery rate, reply rate, and booking conversion metrics in your LeadFlow dashboard."

### Help Article Outline
1. What is the SMS Analytics Dashboard?
2. Understanding Delivery Rate
3. Understanding Reply Rate
4. Understanding Booking Conversion
5. How to Change the Time Window
6. Troubleshooting Low Metrics
7. FAQ

---

## 11. Content Requirements for Design/Dev

### Design Requirements

| Element | Specification |
|---------|---------------|
| **Card Layout** | 3-column grid on desktop, stacks to 1-column on mobile (<640px) |
| **Card Anatomy** | Label (small, muted) → Percentage (large, bold) → Subtitle (small, muted) → Optional trend arrow |
| **Color Coding** | Delivery rate only: green (≥80%), amber (60-79%), red (<60%). Reply/booking: neutral (needs baseline data first). |
| **Time Selector** | Segmented control (pill buttons) above stats bar. Active state: filled. Inactive: outline. |
| **Loading State** | Skeleton cards with pulsing gray backgrounds |
| **Empty State** | Em dash (—) for missing data, friendly message for new agents |
| **Tooltip Trigger** | Question mark icon (?) next to each metric label |

### Copy Requirements for Dev

1. **All user-facing strings must be in a constants file** for easy localization later
2. **Percentage formatting:** No decimal places (31%, not 31.4%)
3. **Number formatting:** Use comma separators for thousands (1,234)
4. **Time window parameter:** Support 7d, 30d, all
5. **Accessibility:** All percentages read by screen readers with context (e.g., "Delivery rate: 94 percent")

### Responsive Behavior

| Breakpoint | Layout |
|------------|--------|
| ≥1024px (desktop) | 3 cards horizontal, equal width |
| 768px–1023px (tablet) | 3 cards horizontal, narrower |
| <768px (mobile) | Cards stack vertically, full width |
| <375px (small mobile) | Cards stack, reduced padding |

---

## 12. A/B Testing Opportunities

### Test 1: Metric Labels
- **Variant A:** "Delivery Rate" / "Reply Rate" / "Booking Conversion"
- **Variant B:** "Messages Delivered" / "Leads Replied" / "Meetings Booked"
- **Hypothesis:** Action-oriented labels increase engagement

### Test 2: Time Window Default
- **Variant A:** Default to 30 days
- **Variant B:** Default to 7 days for new agents, 30 days for established
- **Hypothesis:** New agents prefer recent data, established agents want trends

### Test 3: Empty State Messaging
- **Variant A:** "No data yet" (minimal)
- **Variant B:** "Your SMS analytics will appear here" + explanation (descriptive)
- **Hypothesis:** Descriptive empty states reduce support tickets

---

## 13. Success Metrics to Track

| Metric | Target | Measurement |
|--------|--------|-------------|
| Dashboard view rate | >80% of active agents view SMS stats within 30 days | Page view analytics |
| Time window interaction | >50% of viewers change the time window | Click tracking |
| Tooltip engagement | >20% of viewers click tooltip icons | Click tracking |
| Support ticket reduction | Zero "are my messages being sent?" tickets within 60 days | Support system |
| Upgrade correlation | Agents with visible metrics renew at higher rates | Retention analysis |

---

## 14. Content Deliverables Checklist

- [x] Positioning statement
- [x] Value propositions (short & long)
- [x] Key messaging framework (3 pillars)
- [x] Feature-specific copy for all 3 stat cards
- [x] Time window selector copy
- [x] Dashboard integration copy
- [x] Empty & zero state messaging
- [x] Upsell messaging (future use)
- [x] Email/notification copy templates
- [x] Social proof & sharing copy
- [x] Tooltip & help copy
- [x] SEO/documentation copy
- [x] Design requirements specification
- [x] Dev copy requirements
- [x] Responsive behavior spec
- [x] A/B testing opportunities
- [x] Success metrics

---

## Next Steps

1. **Design Handoff:** Share this document with Design team for UI/UX creation
2. **Dev Handoff:** Copy strings marked for localization should be extracted to constants
3. **QC Review:** Ensure all copy appears correctly in implementation
4. **Post-Launch:** Monitor engagement metrics and iterate on messaging

---

*This content strategy document is ready for Design and Dev implementation.*
