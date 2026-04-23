# LeadFlow AI — Product-Market Fit Analysis

**Product:** LeadFlow AI (formerly InstantLead AI)  
**Domain:** Real Estate — AI Lead Response  
**Near-Term Milestone:** First paying customer by Day 90 (2026-05-15)  
**Minimum Target:** $20,000 MRR by Day 180 (2026-08-13)  
**Stretch Target:** $50,000 MRR  
**Last Updated:** 2026-04-08  
**Status:** MVP Complete → Pilot Phase → Conversion Push

---

## 1. Ideal Customer Profile (ICP)

### Primary ICP: Solo Real Estate Agents
| Attribute | Definition |
|-----------|------------|
| **Annual Volume** | 12-24 transactions/year |
| **Lead Sources** | Zillow, Realtor.com, Facebook Ads, open houses |
| **Pain Intensity** | HIGH — losing leads to competitors who respond faster |
| **Tech Comfort** | Moderate — uses CRM (FUB), not technical |
| **Decision Speed** | Fast — individual decision maker |
| **Budget** | $500-1,500/month for lead gen tools |

### Secondary ICP: Small Teams (2-5 agents)
| Attribute | Definition |
|-----------|------------|
| **Structure** | Team leader + buyer agents |
| **Lead Volume** | 50-150 leads/month |
| **Pain** | Lead distribution, response consistency |
| **Budget** | $1,000-3,000/month |

### Tertiary ICP: Brokerages (Future)
| Attribute | Definition |
|-----------|------------|
| **Size** | 20+ agents |
| **Need** | White-label, admin dashboard, compliance |
| **Budget** | $5,000-20,000/month |

---

## 2. Market Validation Signals

### ✅ Positive Signals
- **Response time = conversion**: 78% of deals go to first responder (industry data)
- **35% of leads never get a response** — massive gap
- **FUB integration ready** — agents already use this CRM
- **SMS-first** — 98% open rate vs 20% email

### ⚠️ Risk Factors
- **A2P 10DLC registration** — SMS compliance barrier
- **Price sensitivity** — agents already pay for Zillow, FUB, etc.
- **Adoption friction** — must integrate with existing workflows

---

## 3. Pricing Strategy

### Current Model: Per-Agent SaaS

| Tier | Price | Features | Target |
|------|-------|----------|--------|
| **Starter** | $49/mo | 100 SMS, basic AI, dashboard | Testing/solo agents |
| **Pro** | $149/mo | Unlimited SMS, full AI, Cal.com, analytics | Core ICP |
| **Team** | $399/mo | 5 agents, team dashboard, lead routing | Small teams |
| **Brokerage** | $999+/mo | White-label, admin, compliance reporting | Future |

### Path to First Paying Customer (Day 90 Milestone)

| Action | Target | Deadline |
|--------|--------|----------|
| Convert 1 pilot agent to paid | 1 subscriber | 2026-05-15 |
| Offer first-month discount to top engaged pilot | Pro at $99 first month | Immediately |
| Personal outreach by Stojan to top 3 active pilots | Conversion call | Within 1 week |

### Path to $20K MRR (Day 180 Target — 2026-08-13)

| Scenario | Mix | MRR |
|----------|-----|-----|
| Conservative | 100 Pro + 20 Team | $22,860 |
| Balanced | 50 Pro + 40 Team + 5 Brokerage | $22,445 |
| Aggressive | 150 Pro | $22,350 |

### Path to $50K MRR (Stretch)

| Scenario | Mix | MRR |
|----------|-----|-----|
| Team-heavy | 100 Pro + 80 Team + 10 Brokerage | $44,890 |
| Volume | 300 Pro | $44,700 |
| Enterprise | 200 Pro + 50 Team + 5 Brokerage | $49,645 |

---

## 4. Go-to-Market Strategy

### Phase 1: Pilot (Days 1-90) — ACTIVE (Day 79 of 90)
**Goal:** First paying customer by Day 90

With 11 days remaining and 0 subscriptions active, $20K MRR is not achievable in this window. Goal reset: prove the payment pipeline works with at least 1 real transaction.

| Activity | Owner | Status |
|----------|-------|--------|
| Wire Stripe checkout E2E (trial-to-paid path) | Dev | In progress |
| Activate 208 verified-but-stuck agents | Marketing/Dev | Ready |
| White-glove pilot recruitment (5-10 agents) | Stojan | Pending approval |
| Trial-to-paid upgrade UI in dashboard | Dev | In progress |

### Phase 2: Revenue Foundation (Days 91-120)
**Goal:** $2K-5K MRR — 10-30 paying agents

| Channel | Tactic | CAC Target |
|---------|--------|------------|
| Direct outreach to verified agents (208 warm leads) | Email sequence | $0 |
| Facebook Groups | "AI for realtors" content | $50-100 |
| Reddit (r/realtors) | Value posts, AMAs | $30-50 |
| FUB Marketplace | Integration listing | $0 (organic) |
| Referrals | $100/agent referral bonus | $100 |

### Phase 3: Scale (Days 121-180)
**Goal:** $20K MRR (original target, extended to Day 180) — 134 Pro agents

| Channel | Tactic |
|---------|--------|
| Podcast ads | BiggerPockets, Real Estate Rockstars |
| Webinars | "5X your lead response" |
| Partnerships | Mortgage brokers, title companies |

---

## 5. Key Metrics & Pivot Triggers

### North Star Metrics

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Response Time | <30 sec | TBD | ⏳ Pilot |
| Booking Conversion | 15%+ | TBD | ⏳ Pilot |
| Monthly Churn | <5% | TBD | ⏳ Pilot |
| NPS | >40 | TBD | ⏳ Pilot |

### Pivot Triggers

| Signal | Threshold | Action |
|--------|-----------|--------|
| Low activation | <50% complete onboarding | Simplify onboarding, add concierge |
| High churn | >10% monthly | Pricing too high or product-market mismatch |
| Low conversion | <10% book meetings | Improve AI qualification, better SMS copy |
| Price resistance | >30% say "too expensive" | Add Starter tier, payment plans |

---

## 6. Product Adjustments (If Needed)

### Scenario A: Solo agents resist price
→ Add Starter tier at $49, usage-based upsell

### Scenario B: Teams want more
→ Add Team tier features: lead routing, performance dashboard

### Scenario C: Brokerages bite early
→ Fast-track white-label, admin dashboard

### Scenario D: Voice matters
→ Prioritize VAPI integration (currently Phase 2)

### Scenario E: Different vertical
→ Expand to mortgage brokers, insurance agents (same pain)

---

## 7. Competitive Positioning

| Competitor | Their Price | Our Edge |
|------------|-------------|----------|
| **Structurely** | $299+/mo | Better FUB integration, faster setup |
| **LionDesk** | $25-99/mo | Better AI, true 2-way SMS |
| **Follow Up Boss** | $69-800/mo | Add-on, not replacement |
| **Kunversion** | $199+/mo | No lock-in, month-to-month |

**Positioning:** "The AI lead response that actually works with your FUB"

---

## 8. Current Status (Day 67 of 180 — 2026-04-23)

| Component | Status | Note |
|-----------|--------|------|
| MVP Features | ✅ Complete | None |
| Real Agents in DB | ⚠️ 3 | All owner test accounts — 0 real customers |
| Test/QA Accounts | 21 | Created 2026-04-21, polluting funnel metrics |
| Phantom Subscriptions | ⚠️ 3 | sub_test_schema_alignment_* (test data, must delete) |
| Paying Subscribers | ❌ 0 | Critical |
| MRR | ❌ $0 | Phantom $597 from test subs — real is $0 |
| $20K MRR Goal | ⚠️ Day 180 (2026-08-13) | 112 days remaining |
| **Near-term Milestone** | **First paying customer ASAP** | **Priority #1** |

**Reality check (2026-04-23):** DB shows 0 real customers. Earlier "363 agents" figure is stale/incorrect — the local PostgreSQL (production DB) has only 24 agents, 21 of which are test/QA data inserted 2026-04-21. No real humans have completed onboarding.

**Funnel state:** Acquisition = 0. Conversion optimization is irrelevant until there are real users.

**Next actions (priority order):**
1. Stojan: direct personal outreach to 5-10 real estate agent contacts this week (no code needed)
2. Merge `uc-marketing-campaign-launch` (needs_merge, P0) to activate traffic channels
3. Start `feat-conversion-call-booking` (P0) — add demo call CTA to pricing/billing pages
4. Execute `fix-phantom-mrr-test-data-polluting-metric` (P0, ready) — clean test subscriptions

**Priority changes (2026-04-23):**
- `feat-conversion-call-booking`: P1 → **P0** (fastest path to first paying customer)
- `fix-phantom-mrr-test-data-polluting-metric`: P1 → **P0** (metrics are corrupted)
- `feat-annual-billing-plan`: P1 → P2 (premature with 0 paying customers)
- `feat-lapsed-trial-reactivation`: P1 → P2 (premise invalid — no real lapsed users in DB)

---

*This document evolves based on pilot data. Adjust product, pricing, or ICP as needed to hit $20K+ MRR.*
