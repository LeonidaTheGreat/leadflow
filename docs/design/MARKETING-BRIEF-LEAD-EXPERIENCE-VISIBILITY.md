# Marketing Brief: Lead Experience Visibility

**Feature:** Lead Experience Visibility — Founder Demo Tool
**Date:** May 2026
**Prepared for:** Design, Dev, and Stojan (founder use)
**Status:** Ready for implementation

---

## Executive Summary

LeadFlow's Lead Experience Visibility page is Stojan's proof weapon in every sales call. It gives him one reliable path to show prospects — live or from curated samples — exactly what their leads experience: AI that responds in under 30 seconds and books appointments automatically. Marketing's job is to make sure every word on this page reinforces the business outcome, not the technology.

---

## Positioning & Strategy

**Positioning:** LeadFlow's live demo tool that turns any sales call into a proof moment — show real AI conversations happening in real-time, in under 2 minutes.

**Core message to land with every prospect:**
> *LeadFlow responds to real estate leads in under 30 seconds and books appointments automatically — let me show you exactly what your leads experience.*

**Value props the UI copy reinforces:**
- AI responds to leads in under 30 seconds — faster than any human team
- Every lead gets followed up, automatically — no more lost deals
- Appointments book themselves — your calendar fills while you focus on closings
- Real conversations, real outcomes — see exactly what your leads experience

**Tone:** Confident, direct, outcome-focused

**Copy pitfalls to avoid:**
- Saying "simulator" or "test" in a way that undermines reality — use "live preview" or "see it in action"
- Focusing on tech specs instead of business outcomes (bookings, speed, revenue)
- Overexplaining the AI — agents care about results, not how it works
- Using passive or tentative language ("might help", "could improve") — be declarative
- Cluttering the UI with too many options — keep it two paths, maximum

---

## UI Copy — All Surfaces

### Page Header
| Surface | Copy |
|---|---|
| Page title | **Lead Experience** |
| Page subtitle | See exactly what your leads experience — live or from real conversations. |

### Simulator Path
| Surface | Copy |
|---|---|
| Primary CTA button | **Run Live Preview** |
| CTA sublabel | See the AI respond to a real lead scenario |
| Running state | AI is responding to your lead... |
| Success header | **Your lead got a response in under 30 seconds.** |
| Success subtext | Here's the full conversation — exactly what they would have seen. |
| Failed header | Preview didn't load in time. |
| Failed subtext | No problem — see a real conversation below instead. |
| Failed fallback CTA | **See a Real Conversation** |
| Timeout header | That took longer than expected. |
| Timeout fallback CTA | **Skip to Real Conversations** |

### Sample Conversation Viewer
| Surface | Copy |
|---|---|
| Tab label | **Real Conversations** |
| Section header | Real conversations. Real outcomes. |
| Section subtext | These are actual lead interactions — see how LeadFlow handles different scenarios. |
| Empty state | No conversations available yet. Run a live preview above to generate your first. |

### Outcome Badges
| Outcome key | Display Label |
|---|---|
| booked | **Appointment Booked** |
| in_progress | **Conversation Active** |
| opted_out | **Lead Opted Out** |
| unqualified | **Not a Fit** |

### Share & Privacy
| Surface | Copy |
|---|---|
| Share CTA | **Share this conversation** |
| Expiry note | Link expires in 24 hours |
| Success message | Link copied — expires in 24 hours. No login required. |
| Privacy badge | Contact info protected |
| Demo safe badge | Demo safe |

---

## Demo Script for Stojan

*Designed to be scanned quickly during a live call. Each section is labeled by moment.*

### Opening (10–15 seconds)
> *"Let me show you exactly what happens when one of your leads texts in right now. This is the actual AI — I'm going to trigger a live conversation and you can watch it respond in real-time. No scripts, no delays on my end."*

### While the Simulator Runs (20–40 seconds)
> *"While this runs — what you're seeing is the AI picking up the lead, qualifying them, and working toward booking a showing. This happens automatically, 24/7. It doesn't matter if it's 2am on a Sunday — every lead gets a response within 30 seconds."*

### Transcript Reveal (30–60 seconds)
> *"Here's the full conversation. See how it opens — personal, not robotic. It asks the right questions to qualify the lead, then moves straight to booking. That appointment would have hit your calendar automatically. No back-and-forth, no follow-up emails. Done."*

### If Simulator Fails — Fallback Pivot
> *"The live preview is taking a moment — let me show you something actually better. These are real conversations from agents already using LeadFlow. Same AI, same speed — you can see exactly how it handled different scenarios: buyers, renters, people who weren't ready. Every one of these got a response in under 30 seconds."*

### Closing Line
> *"This is running for your leads right now — or it can be by tomorrow. Every lead, every day, responded to in under 30 seconds. How many leads are you getting each week that you're not following up on fast enough?"*

---

## Design Content Brief

**Brief title:** Content Brief: Lead Experience Visibility Page
**Primary audience:** Stojan (founder) screen-sharing during live sales calls; secondary: the prospect watching
**Use context:** High-stakes sales demo context. Every second of confusion costs conversion. The page must work as a presentation tool, not just a dashboard feature.
**Visual tone:** Confident, clean, outcome-forward. No decorative clutter. Business professional with a modern edge — think Bloomberg Terminal meets Calendly.

### Information Hierarchy (top to bottom)
1. Page header: 'Lead Experience' title + one-line value statement
2. Primary action block: 'Run Live Preview' CTA — dominant, above fold
3. Simulator state area: status indicator + real-time transcript render
4. Failure/timeout recovery: fallback CTA visible immediately on failure, no scroll required
5. Tab divider: separator between simulator and sample viewer sections
6. Sample Conversations header + subtext
7. Conversation list: scenario label, outcome badge, message count, date
8. Expanded thread view: chronological transcript with role labels and timestamps
9. Share link generator: compact CTA at bottom of any open conversation

### Must Be Above the Fold (always visible without scrolling)
- Page title and one-line value statement
- 'Run Live Preview' primary CTA button
- Simulator status area (idle/running/success/failed states)
- Fallback CTA on failure — must appear in same viewport, no scroll

### Copy Rules
- Never use 'test', 'simulation', or 'fake' — use 'live preview', 'real conversation', 'demo-safe'
- All outcome language is business-facing: 'Appointment Booked' not 'booked'
- Loading states use active language: 'AI is responding...' not 'Loading...'
- Error states lead with reassurance, not failure: 'No problem — see a real conversation instead'
- Share link copy emphasizes recipient ease: 'No login required'
- Timestamps should be human-readable: '28 seconds' not '00:00:28'

### Accessibility Notes
- Outcome badges must not rely on color alone — include text label
- Simulator status must be announced to screen readers on state change
- Transcript role labels ('AI', 'Lead') must be programmatically determinable
- Share link expiry time must be conveyed in text, not just visually
- Tab/keyboard navigation must reach all interactive elements without mouse

### Do Not
- Do not show raw technical state names ('idle', 'timed_out') to the user — translate to human copy
- Do not require page reload for any state transition — this breaks demo flow
- Do not expose phone numbers, emails, or addresses in any conversation view
- Do not use passive loading spinners without copy explaining what's happening
- Do not bury the fallback CTA below fold on failure — must be immediately visible
- Do not use 'test lead' or 'simulated lead' in presenter-facing copy

**Success metric for copy:** Stojan can complete a full demo (simulator or fallback) in under 2 minutes without explaining what any button or label means to the prospect.

---

## Sample Conversations

5 curated demo-safe conversations are seeded in `docs/design/sample-conversations-lead-experience.json`. Summary:

| # | Scenario | Outcome | Messages | Source |
|---|---|---|---|---|
| 1 | Zillow Inquiry — First-Time Buyer | Appointment Booked | 8 | Zillow |
| 2 | Facebook Ad — Rental Inquiry | Conversation Active | 6 | Facebook |
| 3 | Website Form — Seller Inquiry | Appointment Booked | 10 | Website |
| 4 | Referral — Luxury Condo Buyer | Lead Opted Out | 7 | Referral |
| 5 | Google Ad — Investor Inquiry | Not a Fit | 6 | Google |

All conversations have PII masked. Phone and email fields use last-4 / first-letter+domain format. Use these directly as seed data for the Sample Conversation Viewer.

---

*This brief covers marketing copy and content only. For API design, event spec, and acceptance criteria, see PRD-LEADFLOW-LEAD-EXPERIENCE-VISIBILITY-001.md.*
