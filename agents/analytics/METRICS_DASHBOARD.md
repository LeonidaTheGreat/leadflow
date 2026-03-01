# 📈 Metrics Dashboard — AI Lead Response System

**Version:** 1.0  
**Last Updated:** 2026-02-16  
**Owner:** Analytics Agent  
**Refresh:** Real-time (PostHog) + Daily (Supabase)

---

## 🎯 Dashboard Overview

This document defines all KPIs, their calculation methods, targets, and alert thresholds for the AI Lead Response System.

---

## 📊 Primary Dashboard: Product Performance

### Response Performance

| Metric | Definition | Target | Alert Threshold | Data Source |
|--------|------------|--------|-----------------|-------------|
| **Avg Response Time** | Time from lead received to SMS sent | <30 sec | >60 sec | PostHog: `lead_received` → `response_sent` |
| **P95 Response Time** | 95th percentile response time | <45 sec | >90 sec | PostHog: percentile calculation |
| **Lead Capture Rate** | % of leads with AI response sent | ≥95% | <90% | PostHog: `response_sent` / `lead_received` |
| **AI Processing Time** | Time for AI to qualify + generate | <2 sec | >5 sec | PostHog: `ai_qualification_completed.processing_time_ms` |

### Delivery & Engagement

| Metric | Definition | Target | Alert Threshold | Data Source |
|--------|------------|--------|-----------------|-------------|
| **SMS Delivery Rate** | % of SMS successfully delivered | ≥98% | <95% | PostHog: `response_delivered` / `response_sent` |
| **Lead Reply Rate** | % of leads who reply to AI | ≥40% | <30% | PostHog: `lead_replied` / `response_sent` |
| **Opt-out Rate** | % of leads who reply STOP | <2% | >5% | PostHog: `opt_out_received` / `lead_received` |
| **Spam Complaint Rate** | % marked as spam by carriers | <0.1% | >0.5% | Twilio logs |

### Conversion Funnel

| Metric | Definition | Target | Alert Threshold | Data Source |
|--------|------------|--------|-----------------|-------------|
| **Booking Conversion Rate** | % of leads who book appointment | ≥15% | <10% | PostHog: `appointment_booked` / `lead_received` |
| **Qualified Lead Rate** | % leads marked qualified by AI | ≥60% | <50% | PostHog: `lead_qualified` with result=qualified |
| **Time to Booking** | Avg days from lead to appointment | <3 days | >7 days | PostHog: `appointment_booked.days_to_booking` |
| **Handoff Rate** | % leads escalated to human | <10% | >20% | PostHog: `dashboard_message_sent` with manual=true |

### AI Quality Metrics

| Metric | Definition | Target | Alert Threshold | Data Source |
|--------|------------|--------|-----------------|-------------|
| **Avg AI Confidence** | Mean confidence score (0-1) | ≥0.85 | <0.75 | PostHog: `ai_qualification_completed.confidence_score` |
| **Low Confidence Rate** | % responses below 0.70 threshold | <5% | >15% | PostHog: `ai_low_confidence_triggered` count |
| **AI Error Rate** | % AI calls that fail | <1% | >5% | PostHog: `ai_error_occurred` / AI calls |
| **Template Acceptance Rate** | % AI suggestions accepted by agents | ≥80% | <70% | PostHog: `dashboard_ai_suggestion_accepted` / total suggestions |

---

## 💰 Secondary Dashboard: Business Metrics

### Revenue Metrics

| Metric | Definition | Target | Calculation | Data Source |
|--------|------------|--------|-------------|-------------|
| **MRR** | Monthly Recurring Revenue | $20,000 | SUM(active subscriptions × plan price) | Supabase: `subscriptions` table |
| **New MRR** | MRR from new customers this month | $5,000 | SUM(new subscriptions × plan price) | Supabase + PostHog: `subscription_created` |
| **Expansion MRR** | MRR from upgrades | $1,000 | SUM(upgrade price differences) | PostHog: `subscription_upgraded` |
| **Churned MRR** | MRR lost to cancellations | <$500 | SUM(cancelled subscriptions × plan price) | PostHog: `subscription_cancelled` |
| **Net MRR Growth** | New + Expansion - Churned | +$5,500 | Calculated | Derived |

### Customer Metrics

| Metric | Definition | Target | Calculation | Data Source |
|--------|------------|--------|-------------|-------------|
| **Active Customers** | Paying agents with activity | 50 | COUNT(active subscriptions) | Supabase: `subscriptions` table |
| **New Customers (MTD)** | New signups this month | 10 | COUNT(`subscription_created`) | PostHog |
| **Churned Customers** | Cancellations this month | <3 | COUNT(`subscription_cancelled`) | PostHog |
| **Logo Churn Rate** | % customers lost monthly | <5% | Churned / Total at start of month | Derived |
| **NPS Score** | Net Promoter Score | >50 | Survey responses | PostHog surveys |

### Unit Economics

| Metric | Definition | Target | Calculation | Data Source |
|--------|------------|--------|-------------|-------------|
| **ARPU** | Average Revenue Per User | $150 | MRR / Active Customers | Derived |
| **CAC** | Customer Acquisition Cost | <$300 | Marketing spend / New customers | Marketing data |
| **LTV** | Lifetime Value | >$1,800 | ARPU × Gross Margin / Churn Rate | Derived |
| **LTV:CAC Ratio** | LTV divided by CAC | >3:1 | LTV / CAC | Derived |
| **Payback Period** | Months to recover CAC | <6 months | CAC / (ARPU × Gross Margin) | Derived |
| **Gross Margin** | Revenue minus direct costs | >75% | (Revenue - COGS) / Revenue | Finance data |

---

## 📱 Dashboard Layouts

### Executive Dashboard (CEO/Investors)
```
┌─────────────────────────────────────────────────────────────┐
│  EXECUTIVE SUMMARY                    [Date Range: MTD]    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  MRR: $18,420 ▲12%    Active: 42 ▲8%    Churn: 4% ▼2%      │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  REVENUE TREND (6 months)                           │   │
│  │  ═══════════════════════════════════════════════    │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Lead Capture: 96% ✓    Booking Conv: 14% ⚠️    NPS: 52 ✓   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Product Dashboard (PM/Engineering)
```
┌─────────────────────────────────────────────────────────────┐
│  PRODUCT PERFORMANCE                  [Real-time]          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Response Time (avg): 18s ✓      P95: 32s ✓                │
│  Delivery Rate: 98.7% ✓          Opt-out: 1.2% ✓           │
│                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌────────────┐  │
│  │ FUNNEL          │  │ AI CONFIDENCE   │  │ ERRORS     │  │
│  │ Leads: 245      │  │ Avg: 0.87 ✓     │  │ Today: 3   │  │
│  │ Qualified: 168  │  │ Low: 4% ✓       │  │ Rate: 0.8% │  │
│  │ Replied: 112    │  │ Errors: 2% ✓    │  │            │  │
│  │ Booked: 37      │  │                 │  │            │  │
│  │ Conv: 15.1% ✓   │  │                 │  │            │  │
│  └─────────────────┘  └─────────────────┘  └────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Operations Dashboard (Support/CS)
```
┌─────────────────────────────────────────────────────────────┐
│  OPERATIONS CENTER                    [Last 24 hours]      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ⚠️ ALERTS (2)                                              │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  • Delivery rate dropped to 94% (Team: Acme Realty)        │
│  • Opt-out spike: 8% (Source: Facebook Ads)                │
│                                                             │
│  LEADS REQUIRING ATTENTION (5)                              │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  • John S. - Low AI confidence (0.45) - 2 hours ago        │
│  • Sarah M. - Multiple opt-outs - 4 hours ago              │
│  • Mike R. - Failed delivery (3x) - 6 hours ago            │
│                                                             │
│  AI ERRORS (Last 24h): 12 total                            │
│  • Timeout: 7    • Rate limit: 3    • API error: 2         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚨 Alert Configuration

### Critical Alerts (Page/SMS)

| Alert | Condition | Recipients | Action |
|-------|-----------|------------|--------|
| **Delivery Rate Drop** | <95% for 15 min | Engineering, Ops | Check Twilio status, carrier issues |
| **Opt-out Spike** | >5% in 1 hour | Compliance, Product | Pause campaigns, review messaging |
| **AI System Down** | Error rate >10% for 5 min | Engineering | Check Anthropic API, failover |
| **Response Time Spike** | Avg >60s for 10 min | Engineering | Check queue depth, scale workers |

### Warning Alerts (Email/Slack)

| Alert | Condition | Recipients | Action |
|-------|-----------|------------|--------|
| **Booking Conversion Drop** | <12% for 3 days | Product, Growth | Review AI prompts, A/B test |
| **Low AI Confidence Trend** | >10% low confidence for 1 day | AI Team | Review training data, tune threshold |
| **Churn Spike** | >5 customers in 1 day | CS, Product | Outreach, exit interviews |
| **Integration Failures** | FUB sync failures >5/hour | Engineering | Check API keys, rate limits |

### Anomaly Detection

```javascript
// PostHog Alert Configuration
{
  "alerts": [
    {
      "name": "Delivery Rate Anomaly",
      "trend": "delivery_rate",
      "condition": "below_baseline",
      "threshold": "2_standard_deviations",
      "window": "15_minutes",
      "action": "page_on_call"
    },
    {
      "name": "Lead Volume Spike",
      "trend": "leads_received",
      "condition": "above_baseline",
      "threshold": "3x_average",
      "window": "1_hour",
      "action": "slack_notify"
    }
  ]
}
```

---

## 📐 Funnel Analysis

### Core Conversion Funnel

```
Lead Received (100%)
    │
    ▼ (96% ✓)
AI Response Sent ───► [Loss: 4% - AI errors, opt-outs]
    │
    ▼ (98% ✓)
SMS Delivered ──────► [Loss: 2% - Invalid numbers, carrier issues]
    │
    ▼ (45% ✓)
Lead Replied ───────► [Loss: 55% - Not interested, busy, no response]
    │
    ▼ (33% ✓)
Qualified by AI ────► [Loss: 12% - Low intent, out of area, no budget]
    │
    ▼ (15% ✓)
Appointment Booked ─► [CONVERSION ✓]
```

**Funnel Metrics:**
- **Overall Conversion:** 15% (Lead → Booking)
- **Biggest Drop-off:** Lead Replied (55% loss) — focus area for optimization
- **Second Drop-off:** Qualified by AI (12% loss) — review qualification criteria

### Lead Source Performance

| Source | Volume | Capture Rate | Reply Rate | Booking Conv | Quality Score |
|--------|--------|--------------|------------|--------------|---------------|
| Zillow | 45% | 97% | 48% | 18% | ⭐⭐⭐⭐⭐ |
| Realtor.com | 25% | 95% | 42% | 15% | ⭐⭐⭐⭐ |
| Facebook | 20% | 92% | 35% | 10% | ⭐⭐⭐ |
| Direct SMS | 8% | 98% | 55% | 22% | ⭐⭐⭐⭐⭐ |
| Website | 2% | 94% | 38% | 12% | ⭐⭐⭐ |

---

## 🔄 Retention Analysis

### Cohort Retention Table

| Cohort | Month 0 | Month 1 | Month 2 | Month 3 | Month 6 | Month 12 |
|--------|---------|---------|---------|---------|---------|----------|
| Jan 2026 | 100% | 92% | 88% | 85% | — | — |
| Dec 2025 | 100% | 90% | 86% | 82% | 75% | — |
| Nov 2025 | 100% | 88% | 84% | 80% | 72% | — |
| Oct 2025 | 100% | 85% | 82% | 78% | 70% | 60% |

**Key Insights:**
- **Month 1 Churn:** ~10% (trial conversion)
- **Month 3 Churn:** ~15% total (product-market fit validation)
- **Month 6 Churn:** ~25% total (long-term retention)
- **Target:** Improve Month 3 retention to >85%

### Retention by Segment

| Segment | Month 1 | Month 3 | Month 6 | LTV Estimate |
|---------|---------|---------|---------|--------------|
| High Volume (>50 leads/mo) | 95% | 90% | 85% | $2,400 |
| Medium Volume (20-50) | 88% | 80% | 70% | $1,800 |
| Low Volume (<20) | 80% | 65% | 50% | $900 |
| Team Plans | 96% | 92% | 88% | $4,500 |

---

## 🎛️ Metric Calculations (SQL Reference)

### Response Time (PostHog SQL)
```sql
-- Average response time by day
SELECT 
  toDate(timestamp) as date,
  AVG(response_time_seconds) as avg_response_time,
  quantile(0.95)(response_time_seconds) as p95_response_time
FROM events
WHERE event = 'response_sent'
  AND timestamp >= now() - INTERVAL 30 DAY
GROUP BY date
ORDER BY date DESC
```

### Conversion Funnel (PostHog Funnels)
```javascript
// PostHog Funnel Definition
{
  "funnel": {
    "steps": [
      { "event": "lead_received" },
      { "event": "response_sent" },
      { "event": "response_delivered" },
      { "event": "appointment_booked" }
    ],
    "breakdown": "lead_source",
    "time_window": "7_days"
  }
}
```

### MRR Calculation (Supabase SQL)
```sql
-- Current MRR
SELECT 
  SUM(plan_price) as current_mrr,
  COUNT(*) as active_subscriptions
FROM subscriptions
WHERE status = 'active'
  AND canceled_at IS NULL
```

### Churn Rate (Supabase SQL)
```sql
-- Monthly churn rate
WITH monthly_customers AS (
  SELECT 
    DATE_TRUNC('month', created_at) as month,
    COUNT(*) as new_customers
  FROM subscriptions
  GROUP BY 1
),
churned_customers AS (
  SELECT 
    DATE_TRUNC('month', canceled_at) as month,
    COUNT(*) as churned
  FROM subscriptions
  WHERE canceled_at IS NOT NULL
  GROUP BY 1
)
SELECT 
  m.month,
  m.new_customers,
  c.churned,
  (c.churned::float / NULLIF(m.new_customers, 0)) * 100 as churn_rate
FROM monthly_customers m
LEFT JOIN churned_customers c ON m.month = c.month
ORDER BY m.month DESC
```

---

## 📊 Dashboard Implementation

### PostHog Dashboard URLs

| Dashboard | URL | Access |
|-----------|-----|--------|
| Executive Summary | `/dashboard/executive` | Executive team |
| Product Performance | `/dashboard/product` | Product, Eng |
| Operations Center | `/dashboard/ops` | Support, Ops |
| Revenue Analytics | `/dashboard/revenue` | Finance, Growth |
| AI Performance | `/dashboard/ai` | AI team, Eng |

### Embedding in App

```typescript
// React component for embedded analytics
import { PostHogProvider } from 'posthog-js/react'

function AnalyticsDashboard() {
  return (
    <PostHogProvider apiKey={process.env.POSTHOG_API_KEY}>
      <div className="dashboard-grid">
        <ResponseTimeWidget />
        <ConversionFunnelWidget />
        <AIConfidenceWidget />
        <RevenueChart />
      </div>
    </PostHogProvider>
  )
}
```

---

## 📝 Changelog

| Date | Version | Changes |
|------|---------|---------|
| 2026-02-16 | 1.0 | Initial metrics dashboard spec |

---

**Questions?** Contact @AnalyticsAgent
