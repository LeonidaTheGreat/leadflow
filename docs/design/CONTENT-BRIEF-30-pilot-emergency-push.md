# Content Brief: 30-Pilot Emergency Campaign Push
**Task:** fix-30-pilot-campaign-stalled-at-day-8  
**Date:** 2026-04-27 (Day 22 of 30)  
**Author:** Marketing Agent  
**For:** Stojan (immediate action) + Dev team  
**Status:** EMERGENCY — 8 days to May 5 deadline with 0 contacts made

---

## Situation Assessment

**What stalled the campaign:**

The April 18 email blast brief was complete but never fired. Two hard blockers remain:

1. `uc-marketing-campaign-launch` stuck in `needs_merge` — admin blast UI not deployed
2. Resend domain not verified — outbound email from `@leadflowai.com` not delivering

**The correct response is not to wait for email to be fixed.** We are at day 22. Waiting for infra
means missing the window entirely.

**The pivot:** Shift from a "send a blast and wait" model to a "Stojan personally contacts
people today" model. The 20 targets we have are warm — we know their names, their pain, their
CRMs. Personal outreach from the founder closes pilots faster than any email blast.

**Target gap:** 20 identified targets vs. 30 goal. Expansion strategy in Section 4.

---

## Section 1: Stojan's Personal Outreach Protocol (TODAY, no code needed)

This is the highest-leverage move available right now. A founder DM converts at 3-5x the rate
of a marketing email. These people are warm. Do this before anything else.

### Channel Priority Order

1. **LinkedIn DM** — most of the targets are active agents, findable by name + brokerage
2. **Text/iMessage** (if you have their number from a prior interaction)
3. **Facebook Messenger** (if connected or in shared groups)

### DM Script — LinkedIn (Segment A: Solo Agents)

---

Hi {first_name},

You came up on my radar because of something you said about {pain_point_condensed} — that's
exactly the problem LeadFlow was built to solve.

LeadFlow responds to your incoming leads via SMS in under 30 seconds — while you're in a
showing, driving, or just off for the night. It connects directly to Follow Up Boss. When a
lead comes in, it greets them, qualifies them, and books a call to your calendar. You just
show up.

I'm running a small pilot this month — free access, no contract, no pitch call required. If
it doesn't improve your response rate in 14 days, you walk away with nothing lost.

Would you be open to a quick look? I can get you set up in about 15 minutes.

— Stojan

---

**{pain_point_condensed} values** (use these exactly — they map to the notes in the DB):

| Name | pain_point_condensed |
|------|---------------------|
| Amanda Foster | missing leads when you couldn't respond fast enough |
| Brandon White | missing leads while you were in showings |
| Christopher Davis | needing a better system to catch leads between appointments |
| Emily Thompson | needing backup for lead response during your maternity leave |
| James Wilson | wanting to be the first agent to respond to every inquiry |
| Jennifer Rodriguez | running Facebook ads and losing leads to faster responders |
| Jessica Martinez | wanting to respond to every lead the moment it comes in |
| Kevin O'Brien | needing a more consistent response system |
| Marcus Chen | wanting the automated follow-up you had in your Salesforce days |
| Michael Brown | wanting to systematize your lead response so nothing falls through |
| Michelle Garcia | running Google Ads and wanting better lead response for your spend |
| Nicole Anderson | wanting to be first to respond to every lead inquiry |
| Robert Taylor | wanting to apply your tech background to your process |
| Sarah Mitchell | wanting to clone yourself for lead response |
| Stephanie Lee | buying Zillow leads and losing them to faster agents |

### DM Script — LinkedIn (Segment B: Team Leads)

Same opener, replace the middle paragraph with:

---

LeadFlow responds to leads via SMS in under 30 seconds — while your agents are in showings,
on calls, or closed for the night. It routes to the right agent in FUB automatically. When a
lead comes in, it greets them, qualifies them, and books appointments. Your team just shows up.

---

| Name | pain_point_condensed |
|------|---------------------|
| Daniel Jackson | looking for automation tools to scale your team's lead handling |
| David Park | wanting to build out the systems side of your growing team |
| Lisa Wong | wanting AI tools that match the quality of your Compass brand |
| Rachel Kim | wanting to automate more of your process |
| Ryan Patel | wanting to modernize the systems in your family business |

### What to send when they respond yes

Reply immediately with a direct signup link:

> "Here's your direct link: {personal_link} — takes about 3 minutes to connect your FUB
> account. I'll be around if you get stuck anywhere."

Do not send them to the homepage. Do not send a calendly first. Get them in the product.

### Follow-up if no response in 3 days

---

Hi {first_name}, following up on my note from {day}. I know this is a busy time. If the
timing isn't right, no problem — just let me know and I won't bother you again. If you are
still dealing with {pain_point_condensed}, I'd still love to give you a free trial.

— Stojan

---

---

## Section 2: Facebook Real Estate Group Strategy (This Week)

This drives inbound signups from agents we haven't identified yet. Complements direct outreach.

**Target groups:**
- "Follow Up Boss Users Community" (FUB's official FB group — direct ICP hit)
- "Real Estate Agents — Tips, Strategies & Success" (300K+ members)
- "Real Estate Marketing Tips" (active, tech-forward agents)
- Local/regional agent groups in high-volume markets (Phoenix, Dallas, Tampa, Charlotte)

### Post Copy — Value Post (not promotional, most engagement)

**Option A — Pain Acknowledgment Post:**

---

Quick question for anyone using FUB with Zillow or paid leads:

How do you handle lead response when you're in a showing?

I've been talking to a lot of agents about this and the answers range from "I miss them and
hope for the best" to "I hired an ISA." Both have obvious problems.

Curious what you're actually doing — drop it in the comments.

(I built a tool that handles this automatically. Happy to share more if anyone wants to see
it, but mostly just curious about the workflow here.)

---

**Option B — Direct Pilot Announcement:**

---

If you use Follow Up Boss and hate missing leads while you're in showings — I'm running a
free pilot this month.

LeadFlow responds to your incoming leads via SMS in under 30 seconds while you're unavailable.
It connects to FUB and books appointments on your Cal.com calendar. You don't change anything
about how you work — it just handles the gap.

Free for 30 days. No credit card. No pitch call.

DM me "pilot" or drop your email below if you want in.

---

**Posting strategy:**
- Post Option A in FUB Users Community first (high-trust group, no hard sell)
- Post Option B in the broader agent groups
- Post Tuesday–Thursday, 8–10am or 6–8pm local time (peak agent engagement)
- Stojan must respond to every comment within the first 2 hours — algorithm boost + trust

---

## Section 3: Interim Signup Path (No Email Required)

**The problem with the current invite flow:**

The existing pilot invite flow requires:
1. Admin to identify target → insert to DB → generate invite token → send email
2. Resend to deliver the email (broken)
3. Agent to click through and set password

This cannot be the only path when email is broken and we're doing live DM outreach.

**What dev needs to build (brief):**

A `/join` page that lets an agent sign up directly with just email + name, without a
pre-existing invite. This is NOT a public signup page — it's a direct-link-only page, no
SEO, no nav link. Stojan sends the URL in DMs.

### Copy for `/join` page

**Page headline:** Start Your Free LeadFlow Pilot

**Subheadline:** 30-second lead response for real estate agents. Connects to Follow Up Boss. Free for 14 days.

**Form fields:** First Name | Last Name | Email | Brokerage (optional)

**CTA button:** Get Started Free →

**Below button:** No credit card required. No contract. Takes 3 minutes to connect your FUB account.

**After form submission:**

Heading: You're in. Check your email.  
Body: We've sent your login link to {email}. Check your inbox (and spam folder just in case).
If you don't see it in 5 minutes, reply to this page or email stojan@leadflowai.com directly.

**Note to dev:** The `/join` route should:
- Accept GET with optional `?ref={name}` param (Stojan adds this when sending links so we can
  track which DM channel converted)
- On submit: create `pilot_signups` record + trigger invite email + optionally send Slack/TG
  notification to Stojan that a signup came in
- No invite token prerequisite — direct account creation
- Existing duplicate check: if email already exists in `pilot_invites`, redirect to login

### Copy for `/join` page meta (no-index)

```html
<meta name="robots" content="noindex, nofollow">
<title>Join LeadFlow Pilot</title>
```

---

## Section 4: Target Expansion (Identify 10 More)

We need 30 pilots but have 20 targets. Finding 10 more in 8 days is achievable through these
channels:

### Source 1: FUB Users Facebook Group

Search the group for posts containing: "lead response," "miss leads," "first to respond,"
"showing," "ISA," "Zillow leads." These are agents publicly documenting the exact pain.
Expected yield: 5–8 qualified agents.

**Insertion criteria:**
- Uses FUB (stated or inferable from group membership)
- Has posted about lead response issues OR is asking about ISA/automation
- Has an identifiable public profile (name, brokerage, location)
- Does not already appear in `pilot_recruitment_targets`

### Source 2: LinkedIn Sales Navigator (free 30-day trial)

Search: Title = "Real Estate Agent" OR "Realtor" | Location = Phoenix, Dallas, Tampa,
Charlotte, Atlanta | Keywords = "Follow Up Boss" OR "FUB" in About section.

Filter for: Profile activity (posted in last 30 days), no prior connection.

Expected yield: 10–15 with filtering.

### Source 3: Inbound from Facebook Posts (Section 2)

Every comment on the Facebook posts above is a warm lead. Any agent who comments "how does
this work?" or "DM me more" gets added to `pilot_recruitment_targets` with status `responded`.

---

## Section 5: Email Copy (For When Resend Is Fixed)

The existing content brief (`CONTENT-BRIEF-pilot-outreach-email-blast.md`) has the correct
email copy. **Do not rewrite it.** When email delivery is unblocked, use that brief as-is.

One addition: the subject line for Segment A should be sent as **Option A** (`{First_Name},
you mentioned this`) — this variant should be tested first. Use Option B as the re-engagement
subject after 4 days of no open.

---

## Section 6: Tracking State Updates

As Stojan contacts people via DM, the admin page (when live) or a manual DB update should
reflect progress. Dev note: `pilot_recruitment_targets.status` should move from
`identified` → `contacted` when Stojan sends a DM (manual update OK for now), then
`responded` when they reply, then `signed_up` when they create an account.

Interim workaround for Stojan: maintain a simple running tally in a notes doc or Telegram
message thread. The admin page in the blast brief shows exactly these four states once built.

---

## Section 7: Revised Campaign Success Criteria

Given we're at day 22 with 8 days left:

| Metric | Original Goal | Revised Goal (8 days) | Channel |
|--------|--------------|----------------------|---------|
| Contacts made | 30 | 20 (all existing targets) | LinkedIn DM / Text |
| Responses | — | ≥ 8 of 20 | — |
| Signups | — | ≥ 5 | Direct `/join` link |
| Active pilots | 30 | ≥ 5 active, 15 contacted | — |

The "30 pilot signups" goal by May 5 is not achievable with 8 days and no email. **Reframe
the goal:** the campaign succeeds if Stojan has personally contacted every identified target
and ≥5 have signed up. That is a real foundation for conversion, not a vanity number.

---

## Prioritized Action Checklist for Stojan

**Today:**
- [ ] Send LinkedIn DMs to all 15 Segment A targets using the script above
- [ ] Send LinkedIn DMs to all 5 Segment B targets

**Tomorrow:**
- [ ] Post Facebook group content (Option A in FUB group, Option B in broader groups)
- [ ] Follow up on any responses from DMs

**Dev sprint (48-hour):**
- [ ] Build `/join` direct signup page (brief in Section 3)
- [ ] Fix Resend domain verification (separate task `fix-email-delivery-resend-from-domain-not-verified`)

**Days 3–8:**
- [ ] Follow up with non-responders using the 3-day follow-up DM
- [ ] Add new targets from Facebook group responses
- [ ] Monitor signups via Telegram notifications from `/join` route

---

*The fastest path to 30 pilots is Stojan in a browser with 20 LinkedIn tabs open — not
waiting for a blast button to be built. This brief exists to support that human action,
not replace it.*
