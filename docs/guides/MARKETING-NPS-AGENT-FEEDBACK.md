# Marketing Copy & Content Strategy: NPS & Feedback Survey for Agents
**Feature ID:** feat-nps-agent-feedback  
**Date:** 2026-03-08  
**Author:** Marketing Agent  
**Status:** Draft (for Design & Dev handoff)  

---

## Executive Summary

This document defines all customer-facing copy, tone, and messaging for the NPS & Feedback Survey feature. It covers:
- **Email survey copy** (subject + body)
- **In-app prompt messaging**
- **Feedback button & form copy**
- **Admin view microcopy**
- **Tone guidelines**

**Target audience:** Real estate agents (pilot + paying customers)  
**Goal:** Maximize response rate (≥40% in 7 days), while maintaining trust and making feedback collection feel effortless.

---

## 1. Email Survey Copy

### 1.1 Subject Line (40 chars max)

**Primary option:**
```
Quick question — how are we doing?
```

**Rationale:** 
- Conversational, not salesy
- "Quick" sets expectation (takes <2 min)
- Lowers barrier to click

**Backup option:**
```
We'd love your feedback on LeadFlow
```

**A/B testing note:** Test primary first; backup if open rate <30%.

---

### 1.2 Email Body (Plain Text)

```
Hi [AGENT_FIRST_NAME],

We just want to know: how likely are you to recommend LeadFlow AI to another real estate agent?

Click below and give us a score (0–10):

[SURVEY_LINK_WITH_JWT]

This takes about 60 seconds, and your feedback helps us build what agents actually need.

Questions? Hit reply — we read everything.

— The LeadFlow Team
```

**Design notes for Dev:**
- Plain text only (no HTML). Use Resend's simple text template.
- Replace `[AGENT_FIRST_NAME]` with agent's first name from DB.
- `[SURVEY_LINK_WITH_JWT]` is a button-style link (clickable text link):
  ```
  https://leadflow-ai-five.vercel.app/survey/nps?token=<JWT>
  ```
- Include unsubscribe link at bottom (legal requirement).
- Footer: "© LeadFlow AI | [Privacy Link] | [Unsubscribe Link]"

**Tone guidelines:**
- ✅ Friendly, approachable, human
- ✅ Transparent about intent (we want feedback)
- ✅ Short. No paragraphs >2 sentences.
- ❌ Don't oversell or thank them profusely
- ❌ Don't make it feel mandatory or guilt-trippy

---

### 1.3 Follow-up (Optional, not v1 but plan for v2)

If response rate <30% after 3 days:
```
One more quick thing?

We sent a short survey earlier and wanted to follow up in case it got buried.

Your feedback helps us get better — even if it's just "not now":

[SURVEY_LINK]

Thanks!
— LeadFlow
```

**Decision:** Include in code comments for future, but don't implement in v1. Test without follow-up first.

---

## 2. In-App Prompt Copy

### 2.1 Overlay / Modal Heading
```
Quick feedback?
```

### 2.2 Body Text
```
We'd love to know how we're doing. Takes about 60 seconds.
```

### 2.3 Button Labels

| Button | Text | Style |
|--------|------|-------|
| CTA | "Give feedback" | Primary (blue) |
| Dismiss | "Not now" | Secondary (gray) |

**Design notes:**
- Modal appears once on dashboard login **if** survey trigger fired and no response in last 7 days.
- Dismissal recorded; prompt does not re-appear for 30 days.
- Dismissal is NOT a negative signal — many agents intend to respond later.
- Modal should NOT block core dashboard features (dismissible overlay, not modal dialog that freezes page).

**Tone:** Light, non-intrusive. Same conversational tone as email.

---

## 3. Feedback Button & Form Copy

### 3.1 Button Label
```
Give Feedback
```

**Placement:** Footer or sidebar (low prominence — this is optional, not core flow)

**Design notes:** Use a small icon + text. Icon suggestions:
- 💬 Speech bubble (generic)
- 📝 Memo (form-like)
- 💡 Lightbulb (idea-forward)

Choose one that fits dashboard design language.

---

### 3.2 Feedback Form Copy

**Modal / Form Heading:**
```
Tell us what's on your mind
```

**Feedback Type Labels:**

| Type | Label | Icon |
|------|-------|------|
| Works great | "Works great! 👍" | 👍 |
| Bug | "Found a bug 🐛" | 🐛 |
| Idea | "Have an idea 💡" | 💡 |
| Frustration | "Something's bugging me 😤" | 😤 |

**Rationale:** Emojis make form feel light and less formal. Agents can express emotion without feeling like they're complaining.

**Text Field Label:**
```
Tell us more (max 500 characters)
```

**Placeholder Text:**
```
What happened? What would help? Any details help us improve.
```

**Submit Button:**
```
Send Feedback
```

**Success Message (shown after submit):**
```
Thanks! We read every submission.
```

**Design notes:**
- Form should be dismissible (X button or "Cancel").
- Character counter visible (e.g., "240 / 500").
- Submit button disabled until at least 10 characters entered.
- No email field required — agent is authenticated.

---

## 4. Admin NPS View Copy

### 4.1 Page Heading
```
Agent Feedback
```

### 4.2 Section Headings & Labels

| Section | Label |
|---------|-------|
| Current NPS | "NPS Score (Last 90 Days)" |
| Breakdown | "Score Distribution" |
| Recent Feedback | "Recent Responses" |
| Response Stats | "Survey Performance" |

### 4.3 Metric Labels & Descriptions

**NPS Score:**
```
NPS: <NUMBER>
Calculated from <X> responses in the last 90 days.
```

**Breakdown:**
```
Promoters (9–10):  XX% (<N> responses)
Passives (7–8):    XX% (<N> responses)
Detractors (0–6):  XX% (<N> responses)
```

**Response List Column Headers:**

| Column | Content |
|--------|---------|
| Agent | Agent first name + email |
| Score | 0–10 numeric |
| Type | "auto_14d", "auto_90d", or "manual" |
| Feedback | First 100 chars of open_text (ellipsis if longer) |
| Date | ISO date (YYYY-MM-DD) |
| Status | "Promoter" / "Passive" / "Detractor" (color-coded) |

**Color Coding:**
- 🟢 Promoter (9–10) — Green
- 🟡 Passive (7–8) — Yellow
- 🔴 Detractor (0–6) — Red

### 4.4 Empty States

**If no responses yet:**
```
No responses yet. Surveys will be sent starting 14 days after agent signup.
```

**If NPS data stale (>90 days):**
```
No recent responses. Check back after the next survey cycle.
```

---

## 5. Tone & Voice Guidelines

### 5.1 Brand Voice for NPS Feature

**Attributes:**
- **Conversational** — Talk like a real person, not a bot
- **Curious** — We genuinely want to understand the agent's experience
- **Respectful** — Their time is valuable; keep surveys short
- **Non-judgmental** — Bad feedback is useful, not punishment
- **Action-oriented** — We care because we use this to improve

### 5.2 Tone Examples

✅ **DO:** "We'd love to hear how we're doing."  
❌ **DON'T:** "Please participate in our customer satisfaction survey."

✅ **DO:** "What's the #1 thing we could improve?"  
❌ **DON'T:** "In which area of our product do you believe we need the most improvement?"

✅ **DO:** "Takes about 60 seconds."  
❌ **DON'T:** "This brief survey will take approximately one minute of your time."

✅ **DO:** "Thanks! We read every submission."  
❌ **DON'T:** "Your feedback has been received and will be reviewed by our team."

### 5.3 Language Rules

- **First person plural:** "We want…" not "LeadFlow wants…"
- **Short sentences:** Max 15 words per sentence
- **Active voice:** "Give us feedback" not "Feedback can be provided"
- **Avoid jargon:** No "NPS," "survey," "sentiment," or "feedback mechanism" in customer-facing copy
- **Real contractions:** Use "we'd," "we're," etc.
- **Emoji sparingly:** Only in form labels and admin status indicators

---

## 6. Content Requirements for Design & Dev

### 6.1 For Design Team

**Assets to create:**
1. Email template (plain text layout in Resend, or as .txt file for review)
2. In-app modal wireframe with copy integrated
3. Feedback button placement mockup (footer + sidebar options)
4. Feedback form layout (mobile + desktop)
5. Admin NPS view layout (dashboard mockup)
6. Color palette for Promoter/Passive/Detractor status badges

**Tone/feel to convey:**
- Lightweight, not heavy
- Approachable, not corporate
- Fast/simple, not complicated

---

### 6.2 For Dev Team

**Implementation checklist:**

| Requirement | Details | Note |
|------------|---------|------|
| Email template | Plain text, use Resend integration (existing) | JWT token in URL |
| Email subject | "Quick question — how are we doing?" | Max 40 chars |
| In-app prompt | Modal on dashboard login, dismissible, 30-day cooldown | Use analytics event to track view + dismiss |
| Feedback button | "Give Feedback" label, low-prominence placement | Footer or sidebar |
| Feedback form | 4 type options, 500-char text field, success message | Form shown in modal/overlay |
| Admin view | NPS score, breakdown, recent responses list, color-coded status | Route: `/admin/nps`, auth required |
| Success message | "Thanks! We read every submission." | Shown after feedback form submit |
| Unsubscribe link | Include in all emails (legal) | Link to unsubscribe from marketing emails |

---

### 6.3 Copy Validation Checklist

Before launch, verify:

- [ ] Email copy fits in plain text without formatting issues
- [ ] Email subject line is ≤40 characters
- [ ] In-app prompt text fits on mobile (iPhone SE, 375px width) without truncation
- [ ] Form labels are unambiguous (test with non-native English speakers if possible)
- [ ] Admin view labels match DB column names and are consistent with rest of dashboard
- [ ] No product jargon in customer-facing copy (agents shouldn't need glossary)
- [ ] Tone is consistent across all copy (email, in-app, form, admin)
- [ ] All CTA buttons use active verbs (e.g., "Give Feedback" not "Submit")

---

## 7. Success Metrics & Analytics

### 7.1 Metrics to Track

| Metric | Target | Where to Measure |
|--------|--------|------------------|
| Email open rate | ≥50% | Resend analytics |
| Survey link click rate | ≥40% | Resend + app logs |
| Survey completion rate | ≥90% (of clicks) | NPS response count |
| In-app prompt view rate | ≥70% of agents | Dashboard analytics |
| In-app prompt dismiss rate | ≤30% (goal: <20%) | Analytics event |
| Feedback button clicks | ≥2 per agent/month | Analytics event |
| NPS score (pilot phase) | ≥30 | Admin NPS view |

### 7.2 Analytics Events to Implement

| Event | Trigger | Parameters |
|-------|---------|-----------|
| `nps_email_sent` | Email dispatch | agent_id, survey_trigger (auto_14d, auto_90d) |
| `nps_email_opened` | Email open | agent_id (from Resend webhook) |
| `nps_link_clicked` | Survey link clicked | agent_id, source (email) |
| `nps_prompt_viewed` | In-app modal shown | agent_id, source (in_app) |
| `nps_prompt_dismissed` | "Not now" clicked | agent_id, days_until_re_show (30) |
| `nps_response_submitted` | Score submitted | agent_id, score, responded_via (email/in_app), survey_trigger |
| `feedback_button_clicked` | Button click | agent_id, location (footer/sidebar) |
| `feedback_form_opened` | Form modal opened | agent_id |
| `feedback_submitted` | Feedback sent | agent_id, feedback_type (works_great/bug/idea/frustration), char_count |

**Why:** These events help us understand conversion funnel, response bottlenecks, and optimize copy/timing in future iterations.

---

## 8. Localization Notes (Future)

**v1:** English only.

**v2 (future): Consider these if expanding to Canadian agents:**
- Email subject: "Quick question — how are we doing?" works in English & French (use "Une petite question — comment allons-nous?" for French)
- Feedback types should be localized (e.g., "Ça marche super 👍" for French)
- Admin labels translated

---

## 9. Appendix: Email Copy Variants for A/B Testing (v2)

**Variant A (current):**
```
Subject: Quick question — how are we doing?
Body: "We just want to know..." (as above)
```

**Variant B (benefit-focused):**
```
Subject: Your voice shapes LeadFlow
Body: "We're building LeadFlow based on what works for agents like you. 
Give us your honest score (0–10) and help us improve.
[Survey link]
Takes 60 seconds. Thanks!"
```

**Variant C (curiosity-driven):**
```
Subject: 1 quick question
Body: "If you were recommending LeadFlow to a friend, what would you say?
We'd love to know (0–10 scale, takes 60 seconds):
[Survey link]
— The LeadFlow Team"
```

**Test plan:** Run Variant A for first 50 responses, then randomize Variants A/B/C for next 50 each. Pick winner by open rate + completion rate.

---

## 10. Definition of Done for Marketing

Marketing work is complete when:

1. ✅ All copy above is reviewed and approved by PM/Product
2. ✅ Email template is integrated into Resend with JWT token logic (Dev)
3. ✅ In-app prompt, feedback form, and admin labels are designed (Design)
4. ✅ Analytics events are implemented (Dev)
5. ✅ Copy is exported to translation/localization doc for future use
6. ✅ Feature passes E2E test: 
   - Stojan receives NPS email, clicks link, submits score
   - In-app prompt appears on next login
   - Feedback button works and stores submission
   - Admin NPS view shows all responses

---

## 11. Sign-Off

- **Product Manager:** ___________________ (date)
- **Marketing Lead:** ___________________ (date)
- **Design Lead:** ___________________ (date)
- **Dev Lead:** ___________________ (date)

---

**Next steps:** 
1. Share this with Design team for UI wireframes
2. Share with Dev team for implementation spec
3. QC will validate against acceptance criteria in PRD
