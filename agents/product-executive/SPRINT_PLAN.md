# Phase 1 MVP Sprint Plan — BO2026

**Product:** InstantLead AI (AI Lead Response System)  
**Sprint:** Phase 1 MVP (Weeks 1-2)  
**Dates:** February 17 – February 27, 2026  
**Target:** Working MVP with 6 core features  
**Status:** 🟡 In Progress

---

## 🎯 Sprint Objectives

Deliver a functional MVP that can:
1. Receive leads via Follow Up Boss (FUB) webhook
2. AI-qualify leads using Claude 3.5 (intent, budget, timeline, urgency)
3. Send instant SMS responses via Twilio (< 30 seconds)
4. Display leads in an agent dashboard (Next.js + shadcn/ui)
5. Sync data back to FUB CRM
6. Include Cal.com booking links for qualified leads

---

## 👥 Team Assignments

| Agent Role | Owner | Responsibilities |
|------------|-------|------------------|
| **Product Executive** | @Leonida (You) | Sprint coordination, blocker resolution, daily reports |
| **Development** | @DevAgent | Backend APIs, integrations, AI engine, database |
| **Design** | @DesignAgent | Dashboard UI refinement, component implementation |
| **Marketing** | @MarketingAgent | Landing page deployment, pilot recruitment |
| **Analytics** | @AnalyticsAgent | Tracking setup, metrics dashboards, PostHog config |
| **QC/Compliance** | @QCAgent | Compliance review, ToS/Privacy updates, consent flows |

---

## 📅 Day-by-Day Breakdown

### Week 1: Foundation & Core Pipeline

#### **Day 1 — Monday, Feb 17**
**Theme:** Environment Setup & Architecture

| Time | Task | Owner | Deliverable | Dependencies |
|------|------|-------|-------------|--------------|
| 09:00 | Sprint kickoff meeting | Product | Agenda, goals, communication plan | - |
| 10:00 | Supabase project setup | Dev | Database project, initial schema | - |
| 10:00 | Vercel project setup | Dev | Next.js 15 project, CI/CD pipeline | - |
| 11:00 | Environment variables config | Dev | `.env.local` template, secrets mgmt | Supabase, Vercel setup |
| 12:00 | Lunch break | - | - | - |
| 13:00 | Twilio account verification | Dev | Twilio SID, Auth Token, phone number | ⏳ A2P pending |
| 14:00 | FUB API key request | Product | API key request submitted | - |
| 14:00 | n8n Railway deployment | Dev | Self-hosted n8n instance | Railway account |
| 16:00 | Database schema design | Dev | `schema.sql` with tables: Lead, Message, Agent | Supabase ready |
| 17:00 | EOD Standup (15 min) | Product | Blocker report, Day 2 plan | - |

**End of Day 1 Success Criteria:**
- [ ] Supabase project created with RLS policies
- [ ] Vercel project deployed (hello world)
- [ ] n8n instance running on Railway
- [ ] Environment variables documented in 1Password/Vault

---

#### **Day 2 — Tuesday, Feb 18**
**Theme:** Lead Intake Pipeline

| Time | Task | Owner | Deliverable | Dependencies |
|------|------|-------|-------------|--------------|
| 09:00 | FUB webhook listener | Dev | `POST /api/webhooks/fub` endpoint | FUB API key |
| 10:00 | Lead parsing & validation | Dev | Parse FUB payload, validate required fields | Webhook endpoint |
| 11:00 | Market detection (US/CA) | Dev | Auto-detect market from phone/location | Lead parsing |
| 12:00 | Lunch break | - | - | - |
| 13:00 | Lead deduplication logic | Dev | Check existing leads by phone/email | Database schema |
| 14:00 | Consent validation | Dev | Check opt-in status before processing | DNC/compliance list |
| 15:00 | Lead creation in DB | Dev | `createLead()` service function | All above |
| 16:00 | Webhook logging | Dev | Webhook event log table for debugging | - |
| 17:00 | EOD Standup | Product | Blocker report, Day 3 plan | - |

**End of Day 2 Success Criteria:**
- [ ] Webhook endpoint receives and logs FUB events
- [ ] Leads are parsed, validated, and stored in Supabase
- [ ] Duplicate detection working
- [ ] Consent validation prevents processing DNC leads

---

#### **Day 3 — Wednesday, Feb 19**
**Theme:** AI Qualification Engine

| Time | Task | Owner | Deliverable | Dependencies |
|------|------|-------|-------------|--------------|
| 09:00 | Vercel AI SDK setup | Dev | Install `@ai-sdk/anthropic`, configure Claude | - |
| 10:00 | Qualification prompt v1 | Dev | Claude prompt for intent/budget/timeline/urgency | - |
| 11:00 | AI qualification service | Dev | `qualifyLead()` function with Claude API | Prompt ready |
| 12:00 | Lunch break | - | - | - |
| 13:00 | Response generation | Dev | Generate personalized SMS from qualification | AI qualification |
| 14:00 | Qualification result storage | Dev | Store AI analysis in Lead table | DB schema |
| 15:00 | Confidence scoring | Dev | AI confidence score (0-100) for human handoff | - |
| 16:00 | Qualification tests | Dev | Unit tests for 5 lead scenarios | Jest/vitest |
| 17:00 | EOD Standup | Product | Blocker report, Day 4 plan | - |

**End of Day 3 Success Criteria:**
- [ ] Claude qualification working end-to-end
- [ ] AI extracts: intent, budget, timeline, location, urgency
- [ ] Personalized SMS generated for each lead
- [ ] Confidence scores assigned
- [ ] Unit tests passing

---

#### **Day 4 — Thursday, Feb 20**
**Theme:** SMS Response System

| Time | Task | Owner | Deliverable | Dependencies |
|------|------|-------|-------------|--------------|
| 09:00 | Twilio SDK integration | Dev | Twilio client setup, SMS send function | Twilio credentials |
| 10:00 | SMS template selection | Dev | Logic to select template based on qualification | SMS templates |
| 11:00 | Message personalization | Dev | Inject lead name, agent name, Cal.com link | Qualification data |
| 12:00 | Lunch break | - | - | - |
| 13:00 | SMS sending endpoint | Dev | `POST /api/sms/send` with Twilio | All above |
| 14:00 | Delivery status tracking | Dev | Webhook for Twilio delivery receipts | - |
| 15:00 | Message history logging | Dev | Store all sent messages in Message table | DB schema |
| 16:00 | Compliance: STOP handling | Dev | Auto-unsubscribe on STOP keyword | Compliance review |
| 17:00 | EOD Standup | Product | Blocker report, Day 5 plan | - |

**End of Day 4 Success Criteria:**
- [ ] SMS sent via Twilio within 30 seconds of lead creation
- [ ] Delivery tracking working (sent/delivered/failed)
- [ ] All messages logged with timestamps
- [ ] STOP keyword handling implemented

---

#### **Day 5 — Friday, Feb 21**
**Theme:** FUB CRM Integration & Week 1 Wrap

| Time | Task | Owner | Deliverable | Dependencies |
|------|------|-------|-------------|--------------|
| 09:00 | FUB API client setup | Dev | FUB API wrapper with auth | FUB API key |
| 10:00 | Lead sync to FUB | Dev | Update FUB lead with AI qualification data | FUB client |
| 11:00 | Event logging in FUB | Dev | Log "AI Response Sent" events in FUB | - |
| 12:00 | Lunch break | - | - | - |
| 13:00 | Status update sync | Dev | Sync lead status changes back to FUB | - |
| 14:00 | Error handling & retries | Dev | Retry logic for failed FUB API calls | - |
| 15:00 | Week 1 integration testing | Dev | E2E test: Lead → AI → SMS → FUB sync | All features |
| 16:00 | Week 1 demo prep | Product | Demo script, test leads ready | - |
| 17:00 | Week 1 Review | All | Demo, blocker discussion, Week 2 planning | - |

**End of Week 1 Success Criteria:**
- [ ] Complete pipeline: FUB webhook → AI → SMS → FUB sync
- [ ] E2E test passes with sample leads
- [ ] All data properly synced between systems
- [ ] Week 1 demo completed successfully

---

### Week 2: Dashboard, Booking & Polish

#### **Day 6 — Monday, Feb 24**
**Theme:** Agent Dashboard — Lead Feed

| Time | Task | Owner | Deliverable | Dependencies |
|------|------|-------|-------------|--------------|
| 09:00 | Next.js dashboard layout | Design + Dev | Dashboard shell with navigation | - |
| 10:00 | Lead Feed component | Design + Dev | List view with lead cards | Supabase data |
| 11:00 | Priority badges | Design + Dev | Visual indicators for lead urgency | Qualification data |
| 12:00 | Lunch break | - | - | - |
| 13:00 | Quick actions (buttons) | Design + Dev | Call, SMS, Mark Qualified buttons | - |
| 14:00 | Real-time lead updates | Dev | Supabase realtime subscriptions | - |
| 15:00 | Lead detail view | Design + Dev | Modal/drawer with full lead info | - |
| 16:00 | Responsive mobile view | Design + Dev | Mobile-optimized lead feed | - |
| 17:00 | EOD Standup | Product | Blocker report, Day 7 plan | - |

**End of Day 6 Success Criteria:**
- [ ] Dashboard displays leads in real-time
- [ ] Priority badges show AI urgency assessment
- [ ] Quick actions work (call/SMS open native apps)
- [ ] Mobile view functional

---

#### **Day 7 — Tuesday, Feb 25**
**Theme:** Response History & Analytics

| Time | Task | Owner | Deliverable | Dependencies |
|------|------|-------|-------------|--------------|
| 09:00 | Response history component | Design + Dev | Conversation thread view | Message table |
| 10:00 | Conversation search/filter | Dev | Search by lead name, phone, date | - |
| 11:00 | Basic analytics widgets | Analytics + Dev | Response time, lead volume charts | PostHog setup |
| 12:00 | Lunch break | - | - | - |
| 13:00 | Analytics dashboard screen | Design + Dev | Performance metrics display | Analytics data |
| 14:00 | Export functionality | Dev | CSV export for lead data | - |
| 15:00 | Dashboard settings | Dev | User preferences, timezone, etc. | - |
| 16:00 | Dark mode polish | Design | Final dark mode styling pass | - |
| 17:00 | EOD Standup | Product | Blocker report, Day 8 plan | - |

**End of Day 7 Success Criteria:**
- [ ] Response history shows all AI and agent messages
- [ ] Analytics show: avg response time, leads/day, conversion rate
- [ ] CSV export working
- [ ] Dark mode consistent across all screens

---

#### **Day 8 — Wednesday, Feb 26**
**Theme:** Cal.com Booking Integration

| Time | Task | Owner | Deliverable | Dependencies |
|------|------|-------|-------------|--------------|
| 09:00 | Cal.com self-hosted setup | Dev | Cal.com instance deployed | Server/Vercel |
| 10:00 | Booking link generation | Dev | Dynamic Cal.com links per agent | Cal.com API |
| 11:00 | Booking link in SMS | Dev | Include booking URL in qualified responses | SMS templates |
| 12:00 | Lunch break | - | - | - |
| 13:00 | Booking webhook handler | Dev | Receive booking events from Cal.com | - |
| 14:00 | Update lead on booking | Dev | Mark lead as "appointment" when booked | - |
| 15:00 | Booking confirmation SMS | Dev | Send confirmation with details | - |
| 16:00 | Agent calendar view | Dev | Show upcoming bookings in dashboard | - |
| 17:00 | EOD Standup | Product | Blocker report, Day 9 plan | - |

**End of Day 8 Success Criteria:**
- [ ] Cal.com instance running
- [ ] Booking links included in qualified lead SMS
- [ ] Bookings update lead status automatically
- [ ] Agents see upcoming appointments in dashboard

---

#### **Day 9 — Thursday, Feb 27**
**Theme:** Testing, QA & Pilot Prep

| Time | Task | Owner | Deliverable | Dependencies |
|------|------|-------|-------------|--------------|
| 09:00 | Full E2E test suite | QC + Dev | All 9 E2E tests passing | All features |
| 10:00 | Security audit | QC | Check for exposed keys, SQL injection | - |
| 11:00 | Compliance review | QC | TCPA, CASL, CCPA compliance check | - |
| 12:00 | Lunch break | - | - | - |
| 13:00 | Performance testing | Dev | Load test webhook handling | - |
| 14:00 | Error scenarios testing | QC | Test failure modes, error messages | - |
| 15:00 | Pilot onboarding flow | Marketing | Signup form, welcome email | Landing page |
| 16:00 | Documentation | Product | API docs, setup guide for pilots | - |
| 17:00 | EOD Standup | Product | Blocker report, Day 10 plan | - |

**End of Day 9 Success Criteria:**
- [ ] All 9 E2E tests passing
- [ ] Security audit complete (no critical issues)
- [ ] Compliance check passed
- [ ] Pilot onboarding ready

---

#### **Day 10 — Friday, Feb 28**
**Theme:** MVP Launch & Sprint Review

| Time | Task | Owner | Deliverable | Dependencies |
|------|------|-------|-------------|--------------|
| 09:00 | Final bug fixes | Dev | Critical issues resolved | QA feedback |
| 10:00 | Production deployment | Dev | Deploy to production Vercel | - |
| 11:00 | Monitoring setup | Dev + Analytics | Sentry + PostHog dashboards | - |
| 12:00 | Lunch break | - | - | - |
| 13:00 | Pilot recruitment | Marketing | 5 pilot agents signed up | Landing page live |
| 14:00 | MVP demo recording | Product | Loom demo of full flow | - |
| 15:00 | Sprint retrospective | All | What went well, improvements | - |
| 16:00 | Phase 2 planning | Product | Week 3-4 roadmap | - |
| 17:00 | Sprint Celebration | All | 🎉 | MVP complete! |

**End of Sprint Success Criteria:**
- [ ] MVP deployed to production
- [ ] 5 pilot agents recruited
- [ ] All monitoring active
- [ ] Phase 2 roadmap defined

---

## 🔗 Dependencies Matrix

| Dependency | Required By | Status | Mitigation if Blocked |
|------------|-------------|--------|----------------------|
| **Twilio A2P approval** | SMS sending (Day 4) | ⏳ Pending | Use toll-free numbers as temp; test with verified numbers only |
| **FUB API key** | FUB integration (Day 2, 5) | ⏳ Pending | Use webhook simulator; mock FUB responses |
| **Claude API credits** | AI qualification (Day 3) | ✅ Available | Fallback to OpenAI GPT-4o if needed |
| **Cal.com hosting** | Booking links (Day 8) | ⏳ Pending | Use Cal.com cloud free tier temporarily |
| **Railway account** | n8n hosting (Day 1) | ✅ Ready | Fallback to Render or Fly.io |

---

## 🚧 Risk Register & Mitigations

| Risk | Impact | Probability | Mitigation Strategy | Owner |
|------|--------|-------------|---------------------|-------|
| **Twilio A2P delays** | Can't send SMS to new numbers | High | Use toll-free verified numbers; limit pilot to verified numbers | Dev |
| **FUB API key delay** | Can't test real integration | Medium | Build with mock FUB; switch to real when available | Dev |
| **AI qualification accuracy** | Poor lead quality assessment | Medium | Start with simple rules; iterate prompts daily | Dev |
| **Database performance** | Slow dashboard at scale | Low | Implement pagination; add indexes early | Dev |
| **Third-party outages** | Twilio/Claude downtime | Low | Queue messages; retry with exponential backoff | Dev |
| **Compliance gaps** | Legal risk | Low | QC review on Day 9; conservative opt-in approach | QC |
| **Pilot recruitment slow** | No users to test | Medium | Marketing starts recruitment Day 1; offer 30-day free | Marketing |

---

## 📊 Success Metrics (Sprint Level)

| Metric | Target | Measurement |
|--------|--------|-------------|
| Feature completion | 100% (6/6) | Checklist tracking |
| E2E test pass rate | 100% (9/9) | Automated test suite |
| Response time | <30 seconds avg | PostHog tracking |
| Lead capture rate | 95%+ | % of leads with AI response |
| SMS delivery rate | 98%+ | Twilio delivery receipts |
| Pilot signups | 5 agents | Marketing tracking |
| Critical bugs | 0 | QA sign-off |

---

## 📝 Daily Standup Format

**Time:** 5:00 PM EST (17:00)  
**Duration:** 15 minutes max  
**Attendees:** All agents  

**Template:**
```
1. What I completed today:
2. What I'm working on tomorrow:
3. Blockers/I need help with:
```

**Product Executive reports to Leonida with:**
- Sprint burndown status
- Blockers requiring escalation
- Next day priorities
- Any scope changes needed

---

## 🔄 Change Control

**Scope Changes:** Any feature additions require Product Executive approval  
**Timeline Changes:** >1 day slippage requires team discussion and mitigation plan  
**Resource Changes:** Agent reallocation must be communicated same day  

---

## 📈 Post-Sprint Phase 2 Preview

| Week | Focus | Key Deliverables |
|------|-------|------------------|
| Week 3 | Pilot Feedback & Iteration | Dashboard improvements, prompt tuning, bug fixes |
| Week 4 | Voice AI (Inbound) | VAPI integration, inbound call handling |

---

**Last Updated:** February 16, 2026  
**Next Review:** Daily at 5 PM  
**Sprint Owner:** @Leonida (Product Executive Agent)
