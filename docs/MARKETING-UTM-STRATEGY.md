# LeadFlow AI — UTM Naming Convention & Marketing Attribution Strategy

**Document ID:** MARKETING-UTM-STRATEGY  
**Version:** 1.0  
**Date:** 2026-03-07  
**Status:** Approved  
**Owner:** Marketing  
**Related PRD:** PRD-UTM-CAPTURE-ATTRIBUTION

---

## 1. Purpose

This document defines the canonical UTM taxonomy for all LeadFlow AI marketing campaigns. Every campaign, ad, email, post, or link that points to the LeadFlow landing page MUST follow these conventions. Consistent naming is what makes the attribution dashboard actionable.

Dev and QC teams: this is your reference for what values will appear in the `agents` table UTM columns.

---

## 2. UTM Parameter Taxonomy

### 2.1 `utm_source` — Where is the traffic coming from?

The source identifies the platform, publication, or site sending the visitor.

| Source Value | Use When |
|-------------|----------|
| `google` | Google Ads (Search or Display) |
| `facebook` | Facebook / Instagram Ads (Meta) |
| `linkedin` | LinkedIn Ads or organic posts |
| `email` | Email campaigns (newsletters, sequences, cold outreach) |
| `youtube` | YouTube Ads or video descriptions |
| `reddit` | Reddit posts or ads (r/realtors, r/RealEstate) |
| `podcast` | Podcast ads with unique URLs |
| `partner` | Partner referral links (mortgage brokers, title companies) |
| `referral` | Agent-to-agent referral program |
| `fub-marketplace` | Follow Up Boss integration marketplace listing |
| `biggerpockets` | BiggerPockets content/ads |
| `twitter` | X / Twitter organic or promoted |
| `direct-mail` | Physical mail with QR code / short URL |
| `webinar` | In-webinar CTA links |
| `stojan` | Stojan personal outreach / DMs (for founder-led recruiting) |

**Rule:** All lowercase, no spaces, hyphens for multi-word. Never use platform display names with capitals.

---

### 2.2 `utm_medium` — How did they get here?

The medium describes the marketing channel type.

| Medium Value | Use When |
|-------------|----------|
| `cpc` | Cost-per-click paid ads (Google Ads, Meta Ads) |
| `email` | Any email — cold, newsletter, drip, sequence |
| `social` | Organic social media posts |
| `paid-social` | Paid social ads (Facebook, LinkedIn, Twitter promoted) |
| `video` | Video content (YouTube, Reels, TikTok) |
| `referral` | Referral program links |
| `partner` | Partner co-marketing, affiliate |
| `organic` | SEO, unpaid search, organic discovery |
| `direct` | Direct contact / DM / personal message |
| `content` | Blog posts, articles, guest content |
| `podcast` | Audio ad or podcast episode link |
| `qr` | QR codes (physical materials, events) |
| `webinar` | Webinar registration or CTA links |
| `community` | Forum posts, Facebook groups, Slack communities |

**Rule:** Lowercase, hyphens for multi-word. `cpc` is always the medium for paid clicks.

---

### 2.3 `utm_campaign` — Which campaign?

Campaigns are time-bound initiatives or always-on programs. Use a consistent naming pattern:

**Format:** `[audience]-[intent/offer]-[period]`

#### Pilot Recruitment Campaigns (Phase 1 — current)
| Campaign Value | Description |
|---------------|-------------|
| `pilot-free-q1-2026` | Free pilot offer — primary recruitment campaign |
| `pilot-fub-agents` | Specifically targeting FUB CRM users |
| `pilot-zillow-agents` | Targeting Zillow Premier Agent users |
| `pilot-founder-outreach` | Stojan's personal founder-led outreach |
| `pilot-facebook-group` | Targeting real estate Facebook groups |
| `pilot-reddit-outreach` | Reddit r/realtors organic |
| `pilot-biggerpockets` | BiggerPockets community outreach |

#### Scale Campaigns (Phase 2 — weeks 5-8)
| Campaign Value | Description |
|---------------|-------------|
| `scale-pro-tier` | Pro tier ($149/mo) paid campaigns |
| `scale-team-offer` | Team tier promotion |
| `referral-100` | $100 referral bonus campaign |
| `webinar-5x-leads` | "5X Your Lead Response" webinar |

#### Retention / Expansion (Phase 3+)
| Campaign Value | Description |
|---------------|-------------|
| `upgrade-starter-to-pro` | Upgrade email sequence |
| `expand-team-seats` | Upsell to team plan |
| `brokerage-outreach` | Brokerage-tier outreach |

---

### 2.4 `utm_content` — Which creative/placement drove the click?

Content distinguishes A/B test variants, ad creatives, or link positions.

| Content Value | Use When |
|--------------|----------|
| `hero-cta` | Landing page hero CTA button (if linking back from retargeting) |
| `headline-v1`, `headline-v2` | A/B test headline variants in ads |
| `email-cta-top` | CTA in top of email |
| `email-cta-bottom` | CTA at bottom of email |
| `email-ps` | CTA in email P.S. line |
| `sidebar-banner` | Banner ad in sidebar |
| `feed-video` | Video ad in social feed |
| `story-swipe` | Instagram/Facebook Story swipe-up |
| `pod-mid-roll` | Podcast mid-roll ad |
| `pod-end-roll` | Podcast end-roll ad |
| `community-post` | Link in community/forum post body |
| `dm-link` | Link sent via direct message |
| `bio-link` | Link in social media bio |
| `signature-link` | Email signature link |

**Rule:** Optional. Use when running A/B tests or multi-placement campaigns.

---

### 2.5 `utm_term` — What keyword or audience segment?

Use for paid search keywords or audience segment targeting identifiers.

| Term Value | Use When |
|-----------|----------|
| `real-estate-crm` | Ad triggered by "real estate CRM" keyword |
| `lead-response-ai` | Ad triggered by "lead response AI" keyword |
| `fub-users` | Retargeting FUB users |
| `zillow-agents` | Targeting Zillow Premier Agents |
| `solo-agent` | Solo agent audience segment |
| `team-leader` | Team leader audience segment |

**Rule:** Optional. Use primarily for paid search (Google Ads) and audience-targeted paid social.

---

## 3. Full Example UTM URLs

### Example 1: Google Ads — Pilot Campaign
```
https://leadflow-ai-five.vercel.app/?utm_source=google&utm_medium=cpc&utm_campaign=pilot-free-q1-2026&utm_content=headline-v1&utm_term=real-estate-crm
```

### Example 2: Cold Email — Founder Outreach
```
https://leadflow-ai-five.vercel.app/?utm_source=stojan&utm_medium=email&utm_campaign=pilot-founder-outreach&utm_content=email-cta-bottom
```

### Example 3: Facebook Group Post
```
https://leadflow-ai-five.vercel.app/?utm_source=facebook&utm_medium=community&utm_campaign=pilot-facebook-group
```

### Example 4: Reddit r/realtors
```
https://leadflow-ai-five.vercel.app/?utm_source=reddit&utm_medium=community&utm_campaign=pilot-reddit-outreach
```

### Example 5: Partner Referral (Mortgage Broker)
```
https://leadflow-ai-five.vercel.app/?utm_source=partner&utm_medium=referral&utm_campaign=pilot-free-q1-2026
```

### Example 6: Agent-to-Agent Referral
```
https://leadflow-ai-five.vercel.app/?utm_source=referral&utm_medium=referral&utm_campaign=referral-100
```

### Example 7: Podcast Mid-Roll
```
https://leadflow-ai-five.vercel.app/?utm_source=biggerpockets&utm_medium=podcast&utm_campaign=pilot-free-q1-2026&utm_content=pod-mid-roll
```

---

## 4. UTM Link Generation Guide

Use this quick-reference when creating campaign links. Bookmark the UTM builder:
> [https://ga-dev-tools.google.com/campaign-url-builder/](https://ga-dev-tools.google.com/campaign-url-builder/)

**Before publishing any campaign link:**
1. Build URL using the taxonomy above
2. Test the link in incognito browser (verify no sessionStorage leakage)
3. Confirm the `utm_source` maps to a row you expect to see in the attribution dashboard

---

## 5. Campaign Messaging Matrix

Each source/medium pairing has a slightly different message that maps to where the audience is in the funnel.

### 5.1 Cold Email (utm_medium=email)

**Subject lines to test:**
- `"Your Zillow leads are going cold. Here's why."` *(pain-first)*
- `"3 agents in [City] are responding to leads in 10 seconds. Are you?"` *(FOMO)*
- `"Free pilot: AI handles your leads while you sleep"` *(offer-first)*
- `"Question about your lead response time"` *(curiosity, personal feel)*

**Email body angle:** Speed-to-lead proof. Lead with the stat: *78% of deals go to the first responder.* CTA: Free pilot, no card, no commitment.

**CTA copy:** `"Apply for free pilot →"`

---

### 5.2 Facebook Groups (utm_medium=community)

Real estate agent communities don't want ads — they want value. Approach:

**Post format:** Value post first, link in comment.

**Value post hook options:**
- `"I built an AI that responds to Zillow leads in under 30 seconds. Happy to share what I learned — DM me or drop your email below."`
- `"We tested 5 different lead response scripts. The one that actually booked appointments (results inside)."`
- `"My agent's lead response rate went from 18% to 61% in 3 weeks. Here's the exact system."`

**Comment CTA:** `"If you want early access to try the tool — link in bio / DM me"`

**Rule:** Never drop a raw link in the first post. Always provide value, then offer.

---

### 5.3 Reddit (utm_source=reddit, utm_medium=community)

**Subreddits:** r/realtors, r/RealEstate, r/Entrepreneur

**Tone:** Peer-to-peer, non-promotional. Reddit users are allergic to marketing.

**Post angle:**
- Share data or insight (e.g., "Here's what I learned about lead response after building an AI tool for agents")
- Case study framing: "Before/After" without naming the product upfront
- AMA post: "I built an AI lead response tool for real estate agents — AMA"

**Link strategy:** Share in comments only when directly asked or when it adds value.

---

### 5.4 LinkedIn (utm_source=linkedin)

**Audience:** Team leaders, broker-owners, tech-forward agents

**Content pillars:**
1. Speed-to-lead data + implications
2. How AI is changing real estate lead conversion
3. Founder story: why we built LeadFlow

**Hook formulas:**
- Contrarian: `"Your CRM is lying to you about lead response time."`
- Proof: `"We tracked 500 leads. This is what separated agents who booked appointments from those who didn't."`
- Offer: `"We're giving 3 real estate agents free access to our AI lead response tool. Here's how to apply."`

---

### 5.5 Paid Ads (utm_medium=cpc / utm_medium=paid-social)

**Primary value prop:** Speed. Certainty. No lead left behind.

**Headline variants to A/B test:**
1. `"Never Lose a Lead to a Slow Response Again"` *(pain removal)*
2. `"AI Responds to Your Leads in <30 Seconds"` *(feature-forward)*
3. `"First Responder Wins. Now You Always Win."` *(competitive)*
4. `"Free Pilot: AI Lead Response for Real Estate Agents"` *(offer-forward)*

**Ad copy body:**
> 78% of real estate deals go to the agent who responds first.
> LeadFlow AI responds to every lead in under 30 seconds — via SMS — while you're on a showing, at dinner, or asleep.
> No scripts to set up. Works with Follow Up Boss.
> **Apply for the free pilot. No credit card.**

**CTA button:** `"Get Free Access"` or `"Apply Now"`

---

### 5.6 Referral Program Messaging (utm_medium=referral)

**Referral CTA (agent-facing):**
> "Know another agent who'd love this? Send them your link. You get $100 when they activate."

**Referral landing page headline:**
> `"[Agent Name] thinks you should try this"`
> *Below:* "AI that responds to your leads in under 30 seconds. Free pilot. No card needed."

---

## 6. Content Briefs for Design & Dev

### 6.1 Landing Page — No Dev Changes Needed for UTM
UTM capture is silent (no user-facing change). Dev implements per FR-1 in the PRD.

**However, Marketing recommends these copy improvements be bundled with this release:**

**Headline:** `"The First Agent to Respond Wins. Now That's Always You."`

**Sub-headline:** `"LeadFlow AI responds to every lead in under 30 seconds via SMS — while you're showing homes, in meetings, or asleep."`

**Social proof bar (above fold):** Add 3 stat chips:
- `<30 sec avg response time`
- `78% of deals go to first responder`
- `Responds while you sleep`

**Primary CTA:** `"Apply for Free Pilot"` (keep current form)

**Trust line below CTA:** `"No credit card. No commitment. 3 spots available."`

---

### 6.2 Attribution Dashboard Content Requirements

The dashboard section "Marketing Attribution" should display:

**Section header:** `Marketing Attribution`

**Subheader:** `Signups by channel — first-touch attribution`

**Table columns:**
| Column | Header Label | Notes |
|--------|-------------|-------|
| `utm_source` | Source | Show "Direct" if NULL |
| `utm_medium` | Medium | Show "—" if NULL |
| `utm_campaign` | Campaign | Show "—" if NULL |
| COUNT(*) | Signups | Number |
| % of Total | Share | Percentage, 1 decimal |

**Empty state copy:** `"No attributed signups yet. Start a campaign using the UTM guide."`

**Design note to Design Agent:** Keep styling consistent with existing dashboard tables. No special chart needed — table is sufficient for now.

---

## 7. UTM Governance Rules

### The Law of UTM Hygiene
1. **Never use free-form values.** Every `utm_source`, `utm_medium`, and `utm_campaign` value must be in this document. If you need a new one, add it here first.
2. **All lowercase.** `Google` and `google` will appear as two separate rows in the dashboard.
3. **Test before publishing.** Always click your own UTM link and verify the session.
4. **Don't recycle campaign names.** Use date suffixes (e.g., `pilot-email-q1-2026`) so you can compare periods.
5. **Document every campaign.** When you launch a new campaign, add its UTM values to the campaign registry below.

---

## 8. Campaign Registry

_Update this table when launching new campaigns._

| Launch Date | Campaign | Source | Medium | UTM URL | Status |
|------------|----------|--------|--------|---------|--------|
| 2026-03-07 | Pilot — Founder Outreach | stojan | email | `/?utm_source=stojan&utm_medium=email&utm_campaign=pilot-founder-outreach` | Planning |
| 2026-03-07 | Pilot — Facebook Groups | facebook | community | `/?utm_source=facebook&utm_medium=community&utm_campaign=pilot-facebook-group` | Planning |
| 2026-03-07 | Pilot — Reddit | reddit | community | `/?utm_source=reddit&utm_medium=community&utm_campaign=pilot-reddit-outreach` | Planning |
| — | — | — | — | — | — |

---

## 9. Attribution Dashboard KPIs to Monitor

Once UTM capture is live, Marketing will monitor these weekly:

| KPI | Formula | Target |
|-----|---------|--------|
| Attribution Rate | Attributed signups / Total signups | >80% |
| Best-Performing Source | Highest signups by `utm_source` | Track weekly |
| Conversion Rate by Channel | Signups / Clicks per channel | >5% |
| Top Campaign | Highest signup count | Track weekly |
| Direct / Unknown | Unattributed signups | <20% |

---

## 10. Open Questions for Stojan

1. **Referral program:** Should the $100 referral bonus launch with Phase 1 or Phase 2? Affects whether `referral-100` campaign is active now.
2. **Stojan personal outreach:** Using `utm_source=stojan` to track founder-led DMs — is this the right approach, or do we want a more formal attribution for this?
3. **Short link service:** Should we use bit.ly or a custom domain (e.g., `go.leadflow.ai`) to shorten UTM URLs for social posts and DMs? Recommend yes for community posts where raw URLs look spammy.

---

_Document authored by Marketing Agent. Related: PRD-UTM-CAPTURE-ATTRIBUTION. Questions → Stojan._
