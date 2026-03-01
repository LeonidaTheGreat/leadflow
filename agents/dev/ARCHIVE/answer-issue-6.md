# GitHub Issue #6: Tech Stack Research - Development Agent Response

**Date**: February 14, 2026  
**Agent**: Development & Engineering  
**Status**: Complete - Ready for Review

---

## Executive Summary

This document provides detailed technical recommendations for the 5 business opportunity categories identified by the Product Executive. Each recommendation balances speed-to-market (critical for 60-day $20k MRR goal) with scalability and maintainability.

**Key Principles Applied:**
- Default to "buy" over "build" for infrastructure (auth, hosting, AI gateway)
- Use proven, pre-integrated stacks that minimize boilerplate
- Plan for migration paths as products mature
- Optimize for developer/agent velocity over technical elegance

---

## Question 1: Optimal Tech Stack by Category

### Category 1: AI Automation Micro-Agency

**Business Model**: Done-for-you automation services for SMBs using n8n/Zapier/Make + custom integrations

#### Recommended Stack: The "Automation Architect"

| Layer | Primary Choice | Alternative | Justification |
|-------|---------------|-------------|---------------|
| **Workflow Engine** | **n8n** (self-hosted) | Make (Integromat) | n8n offers the best balance of AI integration capabilities, self-hosting for client data isolation, and cost control at scale. 200+ native integrations. |
| **Client Dashboard** | Next.js 15 + shadcn/ui | Bubble (no-code) | Professional client portal for workflow monitoring, approvals, and reporting. |
| **Database** | Supabase (Postgres) | PlanetScale | Track client workflows, logs, and configurations. Row-level security for multi-tenant client isolation. |
| **AI Integration** | Vercel AI Gateway | Direct API calls | Unified access to OpenAI, Anthropic, Google. Built-in caching reduces costs 20-40%. |
| **Hosting** | Railway / Render | Coolify (self-hosted) | Easy deployment of n8n + custom components. Auto-scaling as client base grows. |
| **File Storage** | Cloudflare R2 | AWS S3 | Zero egress fees—critical when handling client files and exports. |
| **Monitoring** | n8n native logs + Inngest | LogRocket | Workflow execution tracking and client-facing status pages. |

**Code vs No-Code Balance**: 70% no-code (n8n workflows) + 30% custom (dashboards, specialized integrations)

**Why This Stack:**
- n8n's AI nodes (released late 2024) enable sophisticated AI workflows without code
- Self-hosted option keeps client data segregated (trust factor for SMBs)
- $0 marginal cost per workflow execution with self-hosting
- Faster iteration than custom Python automation frameworks

---

### Category 2: AI Content Repurposing Studio

**Business Model**: Service transforming long-form content (podcasts, videos) into short-form assets

#### Recommended Stack: The "Content Pipeline"

| Layer | Primary Choice | Alternative | Justification |
|-------|---------------|-------------|---------------|
| **Media Processing** | **FFmpeg + Python** (FastAPI) | Cloudinary | Heavy media processing requires compute. FFmpeg is the gold standard. |
| **AI Transcription** | **Whisper API** (OpenAI) | AssemblyAI | Best-in-class accuracy. Speaker diarization available. |
| **Clip Detection** | **Python + OpenAI GPT-4o** | Claude 3.5 Sonnet | Analyze transcripts for viral moments, hooks, and segment boundaries. |
| **Frontend** | Next.js 15 + React | Webflow | Client upload portal, review interface, and content library. |
| **Queue System** | **Inngest** | BullMQ + Redis | Handle long-running video processing jobs with retries and progress tracking. |
| **Storage** | Cloudflare R2 | AWS S3 | Store original + processed media. R2's zero egress saves significant costs at scale. |
| **CDN** | Cloudflare | Bunny.net | Global delivery of video content to clients. |
| **Database** | Supabase | MongoDB | Project metadata, processing queues, client preferences. |

**Code vs No-Code Balance**: 80% custom code (media processing) + 20% no-code (client portal, billing)

**AI Pipeline Architecture:**
```
Upload → Transcribe (Whisper) → Analyze (GPT-4o) → 
Generate Clips (FFmpeg) → Create Titles/Descriptions (Claude) → 
Queue for Review → Client Approval → Deliver
```

**Why This Stack:**
- Content repurposing is compute-intensive—requires custom processing pipelines
- Whisper + GPT-4o combination beats off-the-shelf solutions for clip quality
- Inngest handles unpredictable processing times gracefully
- R2 storage costs are 80% lower than S3 for high-bandwidth video workloads

---

### Category 3: AI Lead Response System

**Business Model**: 24/7 AI response and qualification for inbound leads

#### Recommended Stack: The "Instant Responder"

| Layer | Primary Choice | Alternative | Justification |
|-------|---------------|-------------|---------------|
| **Conversational AI** | **VAPI** or **Bland AI** | Retell AI | Voice AI platforms purpose-built for phone conversations. Sub-1-second latency. |
| **Text/Chat AI** | **Vercel AI SDK** + Claude 3.5 | OpenAI Assistants API | For SMS, WhatsApp, web chat channels. |
| **CRM Integration** | **n8n** workflows | Direct API integrations | HubSpot, Salesforce, Pipedrive connectors. Visual workflow builder. |
| **Calendar Booking** | **Cal.com** (self-hosted) | SavvyCal | Open-source scheduling with enterprise features. White-label friendly. |
| **Database** | Supabase | PlanetScale | Lead data, conversation history, analytics. |
| **Frontend** | Next.js + shadcn/ui | Retool | Admin dashboard for conversation monitoring and lead management. |
| **Deployment** | Vercel + Railway | Render | Separate voice processing from web dashboard. |

**Code vs No-Code Balance**: 50% no-code (integrations, scheduling) + 50% custom (conversation logic, dashboard)

**Integration Map:**
```
Lead Source (Form/Phone) → AI Qualification (VAPI/Claude) → 
CRM Update (n8n → HubSpot/Salesforce) → If Qualified → Calendar Booking (Cal.com) → 
Notifications (Email/SMS) → Handoff to Human
```

**Why This Stack:**
- VAPI/Bland specialize in voice AI—better than building from scratch
- n8n handles CRM integrations without custom code per platform
- Cal.com self-hosted eliminates per-booking fees at scale
- Sub-second response times critical for lead conversion

---

### Category 4: Vertical AI SaaS

**Business Model**: Industry-specific AI tools (dental, HVAC, legal, etc.)

#### Recommended Stack: The "Vertical SaaS Foundation"

| Layer | Primary Choice | Alternative | Justification |
|-------|---------------|-------------|---------------|
| **Framework** | **Next.js 15** + React | Remix | Full-stack React with RSC, ideal for data-heavy SaaS. |
| **AI SDK** | **Vercel AI SDK v4** | LangChain | Streaming, multi-provider support, agent capabilities built-in. |
| **Database** | **Supabase** (Postgres) | Neon | Auth, real-time subscriptions, vector search (pgvector) in one. |
| **Backend Logic** | **Next.js API Routes** + Edge Functions | FastAPI | Keep stack unified. Edge functions for AI calls. |
| **Background Jobs** | **Inngest** | Trigger.dev | Workflow orchestration, retries, scheduling. |
| **Auth** | **Clerk** | Supabase Auth | Multi-tenant SSO, organization support, enterprise features. |
| **Payments** | **Stripe** | Paddle | Subscription management, usage-based billing. |
| **AI Gateway** | **Vercel AI Gateway** | OpenRouter | Caching, analytics, fallback between providers. |
| **Deployment** | **Vercel** | Railway | Preview environments, analytics, edge network. |

**Code vs No-Code Balance**: 90% custom code + 10% no-code (Stripe billing portal, some integrations)

**Scalability Architecture:**
```
Web App (Next.js/Vercel) → API Routes → AI Gateway → LLM Provider
                     ↓
              Supabase (Auth + DB + Realtime)
                     ↓
              Inngest (Background Workflows)
```

**Why This Stack:**
- Unified Next.js stack reduces cognitive load—one language (TypeScript) throughout
- Supabase replaces Firebase + Auth0 + PubSub with one service
- Vercel AI SDK handles streaming, tool calling, and multi-model support
- Clerk's organization features support multi-tenant B2B requirements

---

### Category 5: AI Training/Enablement

**Business Model**: Training programs and ongoing support for AI upskilling

#### Recommended Stack: The "Learning Platform"

| Layer | Primary Choice | Alternative | Justification |
|-------|---------------|-------------|---------------|
| **LMS Core** | **Canvas LMS** (open source) | Teachable | Self-hosted learning management with API access. |
| **Custom Platform** | **Next.js 15** + Payload CMS | Webflow + MemberStack | Course content, assessments, progress tracking. |
| **AI Practice Environment** | **OpenAI Assistants API** | Custom LangChain | Sandboxed AI practice with thread persistence. |
| **Video Hosting** | **Mux** | Cloudflare Stream | Video lessons with excellent API and analytics. |
| **Assessment Engine** | **Python + FastAPI** | TypeScript | Custom AI-evaluated assessments and simulations. |
| **Database** | Supabase | PlanetScale | User progress, assessment results, content library. |
| **Community** | **Circle.so** | Discord | Course community and Q&A (embedded via API). |
| **Scheduling** | Cal.com | SavvyCal | 1:1 coaching session booking. |

**Code vs No-Code Balance**: 60% custom code (learning experience) + 40% no-code (community, scheduling, payments)

**Why This Stack:**
- Canvas LMS provides proven learning infrastructure without building from scratch
- OpenAI Assistants API manages practice conversation threads automatically
- Mux handles video delivery better than generic storage
- Hybrid approach leverages best-of-breed platforms where they excel

---

## Question 2: Integration Requirements

### CRM Integrations by Category

| Category | Primary CRMs | Integration Method | Priority |
|----------|--------------|-------------------|----------|
| **AI Automation Agency** | HubSpot, Pipedrive, Salesforce, Zoho | n8n native connectors | High |
| **Content Repurposing** | Not applicable | Direct client portal | Low |
| **Lead Response System** | HubSpot, Salesforce, Pipedrive, GoHighLevel | n8n + direct APIs | Critical |
| **Vertical AI SaaS** | Industry-specific | REST API + webhooks | High |
| **AI Training** | Not applicable | Manual enrollment | Low |

**CRM Integration Specifications:**

```yaml
HubSpot:
  Methods: ["OAuth 2.0", "API Key"]
  Data: ["Contacts", "Companies", "Deals", "Tasks", "Notes"]
  Rate Limit: 100 requests/10 seconds
  
Salesforce:
  Methods: ["OAuth 2.0", "Connected App"]
  Data: ["Leads", "Contacts", "Accounts", "Opportunities", "Activities"]
  Rate Limit: API-dependent, typically 1000/day base
  
Pipedrive:
  Methods: ["OAuth 2.0", "API Token"]
  Data: ["Persons", "Organizations", "Deals", "Activities", "Notes"]
  Rate Limit: 200 requests/hour (can be increased)
  
GoHighLevel:
  Methods: ["API Key"]
  Data: ["Contacts", "Opportunities", "Appointments", "Conversations"]
  Rate Limit: 100 requests/minute
```

### Calendar Integrations

| Platform | Integration Method | Use Case |
|----------|-------------------|----------|
| **Google Calendar** | OAuth 2.0, Calendar API | Booking appointments, availability checking |
| **Microsoft Outlook** | Microsoft Graph API | Enterprise calendar integration |
| **Cal.com** | Webhooks + API | Self-hosted scheduling infrastructure |
| **Calendly** | Webhooks (limited API) | Popular third-party scheduling |

**Critical Considerations:**
- Request `calendar.events` scope minimum for read/write
- Implement webhook subscriptions for real-time updates
- Handle timezone conversion at application layer
- Cache availability queries to reduce API calls

### Email Integrations

| Service | Integration Method | Best For |
|---------|-------------------|----------|
| **Resend** | SMTP + API | Transactional emails, high deliverability |
| **SendGrid** | SMTP + API | Marketing emails, templates, analytics |
| **Postmark** | API | Transactional focus, excellent deliverability |
| **Nylas** | Unified API | Multi-provider email sync (Gmail, Outlook, etc.) |

**Email Architecture Recommendation:**
```
AI-generated content → Resend (transactional) 
                      → SendGrid (marketing sequences)
                      
Email sync/reply handling → Nylas (unified API for all providers)
```

### Additional Key Integrations

| Integration Type | Recommended Tools | Categories |
|-----------------|-------------------|------------|
| **Communication** | Twilio (SMS), WhatsApp Business API | Lead Response, Agency |
| **Document Storage** | Google Drive API, Dropbox API, OneDrive | Content Studio, Agency |
| **Video Conferencing** | Zoom API, Google Meet | Training, Agency |
| **Social Media** | Buffer API, Hootsuite, direct APIs (Twitter/X, LinkedIn) | Content Studio |
| **Analytics** | Segment, Mixpanel, Amplitude | Vertical SaaS |
| **File Processing** | CloudConvert API, Zamzar | Content Studio |
| **E-signature** | DocuSign API, PandaDoc | Agency, Vertical SaaS |

---

## Question 3: Custom Code vs. No-Code Balance

### Decision Framework

```
START: Does this component differentiate our product?
│
├── YES → Build custom
│   └── Examples: AI logic, proprietary algorithms, unique UX
│
└── NO → Use no-code/low-code
    │
    ├── Is it infrastructure? (auth, hosting, database)
    │   └── Use managed services (Supabase, Vercel, etc.)
    │
    ├── Is it a common workflow? (CRM sync, notifications)
    │   └── Use n8n/Zapier/Make
    │
    └── Is it UI? (dashboards, forms)
        └── Use shadcn/ui, v0.dev, or Retool
```

### Category-Specific Recommendations

| Category | Custom Code % | No-Code % | Rationale |
|----------|---------------|-----------|-----------|
| **AI Automation Agency** | 30% | 70% | n8n handles most workflows; custom code for client portals and specialized connectors |
| **Content Repurposing** | 80% | 20% | Media processing requires custom pipelines; no-code for client management |
| **Lead Response** | 50% | 50% | Voice AI platforms (VAPI) handle conversations; custom for routing logic and dashboard |
| **Vertical AI SaaS** | 90% | 10% | Product differentiation requires custom code; use SaaS for auth, payments, hosting |
| **AI Training** | 60% | 40% | Leverage Canvas LMS + Circle; custom for AI practice environment and assessments |

### Migration Strategy

**Phase 1 (MVP - Days 1-14):** Maximum no-code
- Use n8n for all integrations
- Retool or Bubble for admin dashboards
- Ship fast to validate demand

**Phase 2 (Product-Market Fit - Days 15-45):** Replace proven components
- Migrate critical workflows to custom code
- Build proprietary features that differentiate
- Keep no-code for standard operations

**Phase 3 (Scale - Days 46-60+):** Optimize for cost and performance
- Move high-volume workflows from n8n to custom Python
- Optimize AI costs through caching and model tiering
- Build internal tools for operations

### When to Migrate from No-Code

| Trigger | Action | Timeline |
|---------|--------|----------|
| n8n workflow > 100 executions/day | Evaluate custom code | Week 3-4 |
| Zapier/Make costs > $200/month | Build custom integration | Week 4-6 |
| Retool dashboard > 10 users | Build Next.js admin panel | Week 4-6 |
| Bubble performance issues | Migrate to Next.js | Week 6-8 |
| AI costs > $1,000/month | Implement caching, model tiering | Ongoing |

---

## Question 4: Scalability Considerations

### Scalability by Category

#### AI Automation Micro-Agency

**Scaling Challenges:**
- Workflow execution volume grows with client count
- Each client may need 10-100+ active workflows
- n8n self-hosted requires infrastructure management

**Scaling Strategy:**
| Stage | Client Count | Infrastructure | n8n Setup |
|-------|--------------|----------------|-----------|
| MVP | 1-5 | Single Railway instance | 1 container, SQLite |
| Growth | 5-20 | Railway with Postgres | 1 container, external DB |
| Scale | 20-50 | Kubernetes or ECS | Multiple workers, Redis queue |
| Enterprise | 50+ | Dedicated n8n cluster | Sharded by client segment |

**Cost Projections:**
- 10 clients: ~$150/month (Railway + AI API costs)
- 50 clients: ~$500/month (upgraded compute)
- 100 clients: ~$1,200/month (dedicated infrastructure)

---

#### AI Content Repurposing Studio

**Scaling Challenges:**
- Video processing is compute-intensive and bursty
- Storage costs grow linearly with client content volume
- AI transcription and analysis costs scale with minutes processed

**Scaling Strategy:**
| Component | MVP | Scale |
|-----------|-----|-------|
| Processing | Single worker | Queue-based horizontal scaling |
| Storage | R2 1TB | R2 unlimited + lifecycle policies |
| Transcription | Whisper API | AssemblyAI Enterprise (volume discounts) |
| AI Analysis | GPT-4o | GPT-4o-mini for first pass, 4o for final |

**Cost Projections (per 100 hours of content):**
- Transcription: ~$60 (Whisper)
- AI Analysis: ~$120 (GPT-4o)
- Storage: ~$5 (R2)
- Processing: ~$20 (compute)
- **Total: ~$205 per 100 hours** → Client pricing should be $500-1000 per 100 hours

---

#### AI Lead Response System

**Scaling Challenges:**
- Voice AI costs are usage-based and can spike
- Sub-second latency requirements limit caching
- CRM API rate limits can throttle operations

**Scaling Strategy:**
| Component | Strategy |
|-----------|----------|
| Voice AI | Start with VAPI pay-per-minute; negotiate enterprise rates at $5k+/mo |
| CRM Sync | Implement exponential backoff and queue (Inngest) |
| Conversation History | Archive to S3 after 90 days; keep recent in hot storage |
| Concurrent Calls | VAPI handles scaling; ensure backend can match |

**Cost Projections:**
- Voice AI: ~$0.05-0.10/minute (VAPI/Bland)
- 1000 minutes/day: ~$150-300/day = $4,500-9,000/month
- Text/SMS: ~$0.01-0.05/message
- Target: $2000/client/month average to maintain 60%+ margins

---

#### Vertical AI SaaS

**Scaling Challenges:**
- Multi-tenant data isolation
- AI costs grow with user activity
- Enterprise features (SSO, audit logs) add complexity

**Scaling Strategy:**
```
Database: Supabase → Read replicas → Connection pooling → Caching (Redis)
AI: Direct calls → Vercel AI Gateway (caching) → Model tiering (cheap for drafts, premium for final)
Frontend: Vercel edge → CDN optimization → Code splitting
```

**Technical Scaling Checkpoints:**
| Users | Database | AI Strategy | Infrastructure |
|-------|----------|-------------|----------------|
| 0-100 | Supabase free tier | Direct API calls | Vercel hobby |
| 100-500 | Supabase Pro | AI Gateway + caching | Vercel Pro |
| 500-2000 | Supabase + read replica | Model tiering | Vercel Enterprise |
| 2000+ | Dedicated Postgres | Batch processing, fine-tuning | Multi-region |

**Cost Projections:**
- 100 users: ~$200/month
- 500 users: ~$800/month  
- 2000 users: ~$3,000/month

---

#### AI Training/Enablement

**Scaling Challenges:**
- Video content delivery at scale
- AI practice environment costs
- Assessment evaluation volume

**Scaling Strategy:**
- Use Mux for video (handles all scaling)
- Implement tiered practice limits (free tier: 50 AI calls/month)
- Cache assessment results; pre-compute common scenarios

**Cost Projections:**
- 100 active learners: ~$300/month (video + AI)
- 500 active learners: ~$1,200/month
- Enterprise training (1000+): Negotiate custom pricing

---

### Universal Scaling Principles

1. **Implement usage tracking from Day 1**
   - Tag all AI API calls with user/client ID
   - Set up billing alerts at 50%, 80%, 100% of thresholds
   - Use Vercel AI Gateway or OpenRouter for unified cost visibility

2. **Design for horizontal scaling**
   - Stateless API design
   - Queue-based background processing (Inngest)
   - Separate read/write database operations

3. **Caching strategy**
   - AI responses: Cache identical prompts (24-hour TTL)
   - User sessions: Redis or Upstash
   - Static assets: Cloudflare or Vercel Edge Network

4. **Database scaling path**
   ```
   Supabase free → Supabase Pro → Read replicas → 
   Connection pooling (PgBouncer) → Sharding (if needed)
   ```

---

## Question 5: Existing APIs and Platforms to Build On

### AI/LLM Platforms

| Platform | Best For | Pricing Model | Integration Complexity |
|----------|----------|---------------|----------------------|
| **OpenAI** | General purpose, GPT-4o, Assistants API | Per-token | Low |
| **Anthropic Claude** | Long context, reasoning, instruction following | Per-token | Low |
| **VAPI** | Voice AI, phone conversations | Per-minute | Medium |
| **Bland AI** | Voice AI, low latency | Per-minute | Medium |
| **OpenRouter** | Multi-provider fallback, cost optimization | Per-token + 20% | Low |
| **Vercel AI Gateway** | Unified access, caching, analytics | Free tier, then usage | Low |
| **Together AI** | Open-source models, fine-tuning | Per-token | Medium |
| **Replicate** | Image/video generation, model hosting | Per-second compute | Medium |

**Recommendation**: Start with Vercel AI Gateway → OpenAI/Anthropic. Add OpenRouter for fallback. Use VAPI/Bland for voice-specific products.

### Workflow Automation Platforms

| Platform | Best For | Pricing | Self-Hosted? |
|----------|----------|---------|--------------|
| **n8n** | Complex workflows, AI integration, agency model | Free self-hosted, $20-50 cloud | Yes |
| **Make (Integromat)** | Visual builders, non-technical teams | $9-16/month | No |
| **Zapier** | Simple integrations, 5000+ apps | $19-69/month | No |
| **Activepieces** | Open-source alternative to Zapier | Free | Yes |
| **Trigger.dev** | Code-based workflows for developers | $0-25/month | No |
| **Inngest** | Event-driven, long-running workflows | $0-50/month | No |

**Recommendation**: n8n for agency and lead response (self-hosted for cost control). Inngest for application workflows. Zapier only for simple client-specific integrations.

### Database & Backend Platforms

| Platform | Best For | Pricing | Key Features |
|----------|----------|---------|--------------|
| **Supabase** | Full-stack apps, real-time, auth | Free tier, $25 Pro | Postgres, auth, storage, edge functions |
| **Neon** | Serverless Postgres | Free tier, $19 Pro | Branching, scale-to-zero |
| **PlanetScale** | MySQL-compatible, scaling | $29 Pro | Deploy requests, branching |
| **Convex** | Real-time sync, React Native | $25 Pro | Optimistic updates, subscriptions |
| **Firebase** | Mobile apps, rapid prototyping | Pay-as-you-go | Auth, Firestore, hosting |

**Recommendation**: Supabase as default. Convex for real-time heavy apps. PlanetScale if team prefers MySQL.

### Auth & Identity Platforms

| Platform | Best For | Pricing | Enterprise Features |
|----------|----------|---------|-------------------|
| **Clerk** | Modern SaaS, multi-tenant | Free tier, $25/month | SSO, SAML, organizations |
| **Supabase Auth** | Integrated with Supabase | Free | Basic SSO, MFA |
| **Auth0** | Enterprise, complex requirements | $23-240/month | Full enterprise feature set |
| **Lucia** | DIY auth, maximum control | Free (self-built) | None (build your own) |

**Recommendation**: Clerk for B2B SaaS with organization needs. Supabase Auth for simpler apps or tight Supabase integration.

### Communication Platforms

| Platform | Best For | Pricing | Integration |
|----------|----------|---------|-------------|
| **Twilio** | SMS, voice, email (SendGrid) | Pay-as-you-go | REST API, SDKs |
| **MessageBird** | Global SMS, WhatsApp | Pay-as-you-go | REST API |
| **Vonage (Nexmo)** | SMS, voice, verify | Pay-as-you-go | REST API |
| **Stream** | Chat, activity feeds | $29-499/month | SDKs, UI components |
| **Sendbird** | Chat, voice, video | Custom pricing | SDKs |

**Recommendation**: Twilio for reliability and breadth. Stream for in-app chat features.

### Scheduling Platforms

| Platform | Best For | Pricing | Self-Hosted? |
|----------|----------|---------|--------------|
| **Cal.com** | Full control, white-label | Free, $15-37/month | Yes (open source) |
| **Calendly** | Ease of use, market leader | Free, $10-20/month | No |
| **SavvyCal** | Modern UX, payer-friendly | $12-20/month | No |
| **Nylas** | Calendar sync (read/write) | Custom | No |

**Recommendation**: Cal.com for products where scheduling is core (lead response, training). Nylas if deep calendar integration needed.

### Payment Platforms

| Platform | Best For | Pricing | Global Tax? |
|----------|----------|---------|-------------|
| **Stripe** | Developer experience, flexibility | 2.9% + $0.30 | No (Stripe Tax available) |
| **Paddle** | SaaS, global tax handling | 5% + $0.50 | Yes |
| **Lemon Squeezy** | Digital products, simple SaaS | 5% + $0.50 | Yes |
| **Chargebee** | Enterprise subscription management | Custom | No |

**Recommendation**: Stripe for most cases. Paddle if global tax compliance is critical from day one.

### Infrastructure & Deployment

| Platform | Best For | Pricing | Key Features |
|----------|----------|---------|--------------|
| **Vercel** | Next.js, frontend, serverless | Free, $20 Pro | Edge network, previews, analytics |
| **Railway** | Containers, databases, easy deploy | $5+ | Simple scaling, good DX |
| **Render** | Full-stack, background workers | Free, $7+ | Good free tier, easy setup |
| **Fly.io** | Global distribution, close to users | Pay-as-you-go | Multi-region, custom domains |
| **AWS/GCP/Azure** | Enterprise, complex requirements | Pay-as-you-go | Full feature set, complex |

**Recommendation**: Vercel for Next.js apps. Railway for Python services. AWS only when specific services required.

### Monitoring & Observability

| Platform | Best For | Pricing | Key Features |
|----------|----------|---------|--------------|
| **LogRocket** | Session replay, frontend errors | $69-500/month | User session recordings |
| **Sentry** | Error tracking, performance | Free, $26+ | Exception tracking, APM |
| **Datadog** | Full observability (enterprise) | Custom | Logs, metrics, APM, RUM |
| **PostHog** | Product analytics, open source | Free tier, $0.00025/event | Analytics, session replay, feature flags |

**Recommendation**: Sentry for error tracking. PostHog for product analytics + replay. LogRocket if session replay is critical.

---

## Integration Architecture Map

### High-Level System Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                                │
├─────────────────────────────────────────────────────────────────────┤
│  Web (Next.js)  │  Mobile (Expo)  │  Voice (VAPI)  │  Chat (Widget) │
└─────────────────┴─────────────────┴────────────────┴────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      API GATEWAY LAYER                              │
├─────────────────────────────────────────────────────────────────────┤
│   Vercel AI Gateway  │  OpenRouter  │  n8n Webhooks  │  Direct APIs  │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER                                │
├─────────────────────────────────────────────────────────────────────┤
│  Next.js API Routes  │  FastAPI (Python)  │  Edge Functions        │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    WORKFLOW/QUEUE LAYER                             │
├─────────────────────────────────────────────────────────────────────┤
│  Inngest  │  n8n  │  Trigger.dev  │  BullMQ (if self-hosted)       │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    DATA & STORAGE LAYER                             │
├─────────────────────────────────────────────────────────────────────┤
│  Supabase (Postgres)  │  Redis (cache)  │  R2/S3 (files)  │  Vector  │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    THIRD-PARTY INTEGRATIONS                         │
├─────────────────────────────────────────────────────────────────────┤
│  CRM (HubSpot, Salesforce)  │  Calendar (Google, MS)  │  Email      │
│  Payments (Stripe)          │  Communication (Twilio) │  Voice      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Quick Reference: Stack Selection Matrix

| If Your Product Needs... | Use This Stack |
|-------------------------|----------------|
| Workflow automation for clients | n8n + Next.js + Supabase |
| Video/audio processing | Python + FFmpeg + Inngest + Next.js |
| Real-time voice conversations | VAPI/Bland + n8n + Cal.com |
| Multi-tenant B2B SaaS | Next.js + Clerk + Supabase + Vercel AI SDK |
| Training/LMS platform | Canvas LMS + Next.js + Mux + OpenAI Assistants |
| Fastest possible MVP | Bubble/Retool + n8n + Supabase |
| Maximum scalability | Next.js + Custom backend + Kubernetes |

---

## Cost Summary by Category

| Category | MVP Cost (Month 1) | Growth Cost (Month 6) | Primary Cost Drivers |
|----------|-------------------|----------------------|---------------------|
| AI Automation Agency | $150-300 | $500-1,000 | n8n hosting, AI API costs |
| Content Repurposing | $200-400 | $800-1,500 | AI transcription, video processing |
| Lead Response | $300-500 | $1,000-3,000 | Voice AI minutes, CRM APIs |
| Vertical AI SaaS | $100-200 | $500-1,200 | AI tokens, database, hosting |
| AI Training | $200-400 | $600-1,200 | Video hosting, AI practice environment |

---

## Action Items & Next Steps

1. **For Product Executive**: Review stack recommendations and flag any business model changes needed based on technical constraints

2. **For Development Team**:
   - Create starter templates for top 3 recommended stacks
   - Set up Vercel AI Gateway with caching rules
   - Configure n8n instance for automation agency testing

3. **For Quality Control**:
   - Review data residency implications of recommended platforms
   - Assess GDPR compliance for EU clients
   - Evaluate vendor lock-in risks

4. **Immediate Priorities** (Week 1):
   - [ ] Set up Supabase project with Row Level Security patterns
   - [ ] Deploy n8n to Railway for workflow testing
   - [ ] Configure Vercel AI Gateway with OpenAI and Anthropic providers
   - [ ] Create integration test accounts (HubSpot, Salesforce, Cal.com)

---

## Document References

- Technical Landscape & Feasibility: `/agents/dev/technical-landscape-feasibility.md`
- Product Executive Initial Research: `/agents/product-executive/Product Executive - Initial Research.md`
- Design UX Patterns: `/agents/design/Design_Agent_UX_Patterns_Direction.md`

---

**Document Owner**: Development & Engineering Agent  
**Last Updated**: February 14, 2026  
**Next Review**: Upon selection of specific product opportunity(ies)

---

*This document answers all questions in GitHub Issue #6. Ready for comment posting and issue closure.*
