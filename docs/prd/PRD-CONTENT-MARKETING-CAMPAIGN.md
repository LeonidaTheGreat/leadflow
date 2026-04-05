# PRD: Content Marketing Campaign

**ID:** prd-content-marketing-campaign  
**Use Case:** gtm-content — Content Marketing Campaign  
**Status:** draft  
**Priority:** 2  
**Phase:** GTM  
**Author:** PM Agent  
**Date:** 2026-04-04  

---

## Problem

LeadFlow AI has zero organic traffic. No content marketing presence means no top-of-funnel awareness among real estate agents. The product is ready; the audience doesn't know it exists.

**Target:** Generate qualified inbound traffic from real estate agents who care about lead response speed.

---

## ICP Reminder

- **Solo real estate agents** — 12-24 transactions/year, use FUB CRM, lose leads to faster competitors
- **Pain:** 78% of deals go to the first responder; 35% of leads never get a response
- **Channels they trust:** LinkedIn, real estate Facebook groups, Google search, ActiveRain/Inman
- **What they read:** Tactical content — "how to respond to leads faster," "best CRM integrations"

---

## Goals

1. Drive ≥500 qualified visits/month to leadflow-ai-five.vercel.app within 60 days
2. Capture ≥50 leads via lead magnet (email + name)
3. Establish LeadFlow as a credible voice on real estate lead conversion
4. Support pilot agent recruitment (3 free pilot agents)

---

## Scope

### In Scope
- Content strategy (topic clusters, channels, cadence)
- Blog post briefs (3 minimum, SEO-optimized)
- Social media posts (LinkedIn + Twitter/X)
- Email newsletter draft (to existing trial signups)
- Lead magnet creation (PDF guide or checklist)
- SEO keyword targeting
- UTM tracking setup for all content links
- Distribution plan with scheduled execution

### Out of Scope
- Paid advertising (separate UC)
- Website redesign (see UC-LANDING-MARKETING-001)
- A2P SMS outreach (blocked by compliance)

---

## Content Strategy

### Topic Cluster: Real Estate Lead Response
Pillar: **"How to Never Lose a Real Estate Lead Again"**

Supporting posts:
1. **"Why 35% of Real Estate Leads Go Unanswered (And How to Fix It)"**
   - Target keyword: "real estate lead response time"
   - CTA: Try LeadFlow free
   
2. **"The 5-Minute Rule: How AI Changes Real Estate Lead Follow-Up"**
   - Target keyword: "AI for real estate agents"
   - CTA: Live demo (aha moment simulator)
   
3. **"Follow Up Boss + AI: The Setup That Closes More Deals"**
   - Target keyword: "Follow Up Boss automation"
   - CTA: FUB integration setup guide

### Distribution Channels (Priority Order)
1. **LinkedIn** — agent professionals, team leaders, brokerage owners
2. **Twitter/X** — real estate Twitter community (#RealEstate #Proptech)
3. **Email** — existing trial signups on list
4. **Real estate Facebook groups** — manual posts by Stojan
5. **Google** — organic SEO via blog posts

### Cadence
- Blog: 1 post/week for 4 weeks
- LinkedIn: 3 posts/week (mix of original + repurposed blog)
- Twitter: 5 posts/week (short-form, engagement-focused)
- Email: 1 newsletter bi-weekly

---

## Lead Magnet

**"The Real Estate Agent's AI Response Playbook"** (PDF, 8-10 pages)

Contents:
1. Why response time kills deals (with stats)
2. The 5-step lead response framework
3. How to set up FUB for AI handoff
4. Scripts for AI-drafted SMS responses
5. LeadFlow setup checklist

**Capture mechanism:** Existing lead magnet form at `/lead-magnet` (UC: feat-lead-magnet already implemented)

---

## SEO Keywords

| Keyword | Monthly Volume | Difficulty | Page Target |
|---------|---------------|------------|-------------|
| real estate lead response time | 880 | Medium | Blog post 1 |
| AI for real estate agents | 2,400 | High | Blog post 2 |
| Follow Up Boss automation | 720 | Medium | Blog post 3 |
| real estate lead management | 1,900 | High | Landing page |
| automate real estate follow up | 390 | Low | Blog post 2 |

---

## Acceptance Criteria

### Machine-Verifiable
1. Content strategy document exists at `docs/design/CONTENT-STRATEGY.md`
2. At least 3 blog post briefs created in `docs/design/`
3. Lead magnet PDF brief created at `docs/design/LEAD-MAGNET-PLAYBOOK.md`
4. UTM parameter convention documented
5. Social media post schedule (CSV or MD) created in `docs/design/`

### Human-Verifiable (Stojan signs off)
- Blog post topics resonate with real estate agent pain points
- Lead magnet feels genuinely useful (not a sales pitch)
- LinkedIn posts sound human, not AI-generated
- Email draft is concise and links to value (not just self-promotion)

### Traffic Metrics (30-day post-execution)
- ≥100 unique visitors from content channels (UTM-tracked)
- ≥10 lead magnet downloads
- ≥3 demo sessions from content-originated traffic

---

## Analytics & Tracking

All content links must include UTM parameters:
- `utm_source`: linkedin / twitter / email / facebook
- `utm_medium`: social / email / organic
- `utm_campaign`: content-marketing-q2-2026
- `utm_content`: [post-slug or asset-name]

Verification: GA4 event tracking on `/api/lead-capture` already implemented (fix-ga4-script-tag is complete).

---

## Implementation Notes for Marketing Agent

- Do NOT create actual blog posts as code files — create **briefs** (audience, hook, outline, CTA, keywords)
- Social posts: write 10 LinkedIn posts + 15 Twitter posts as copy in a single MD file
- Email: draft 2 newsletter editions in `docs/design/NEWSLETTER-DRAFT.md`
- Lead magnet: write the full content outline (not the designed PDF — that's for design agent)
- All files go in `docs/design/` — this is content/marketing territory, not `product/`

---

## Workflow

PM (spec) → Marketing (content creation) → QC (review)

- **PM deliverable:** This PRD + acceptance criteria
- **Marketing deliverable:** Blog briefs, social post copy, email drafts, lead magnet outline, content strategy doc
- **QC deliverable:** Verify all acceptance criteria met, no self-promotional fluff, actionable content for ICPs

---

## Success Definition

A real estate agent who finds post #1 via Google search should:
1. Read it and feel understood ("this is my exact problem")
2. Click the CTA and see the live demo simulator
3. Sign up for a free trial without needing to talk to sales

That's the funnel this content supports.
