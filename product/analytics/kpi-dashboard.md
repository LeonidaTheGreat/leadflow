# KPI Dashboard Specification
## AI Lead Response System — Metrics & Goals

---

## Dashboard Overview

**Tool**: Google Sheets (with potential Data Studio upgrade)  
**Update Frequency**: Real-time via API + Daily manual check-in  
**Audience**: Leadership, Sales, Product, Engineering  
**Time Horizon**: Day 0-60 launch tracking

---

## Sheet Structure

### Tab 1: Executive Summary

| Metric | Current | Target | Status | 7-Day Trend |
|--------|---------|--------|--------|-------------|
| MRR | $0 | $20,000 | 🟡 | ↗️ |
| Active Customers | 0 | 25 | 🟡 | → |
| Daily Leads Processed | 0 | 200 | 🟡 | ↗️ |
| Avg Response Time | -- | < 30s | 🟢 | -- |
| Booking Conversion | -- | 20% | 🟡 | -- |

**Visual**: Scorecard with conditional formatting + sparklines

---

### Tab 2: Lead Performance Metrics

#### Daily Lead Volume

| Date | Leads Received | AI Responses | Response Rate | Avg Response Time | Qualified | Qualification Rate |
|------|---------------|--------------|---------------|-------------------|-----------|-------------------|
| Formula | COUNTIF | COUNTIF | B/C | AVERAGEIF | COUNTIF | F/B |
| 2026-02-14 | 12 | 12 | 100% | 8.5s | 5 | 42% |
| 2026-02-15 | 18 | 18 | 100% | 12.3s | 7 | 39% |

**Chart**: Line chart (dual axis: volume + response time)

#### Conversion Funnel (Weekly)

| Week | Leads | Qualified | Appointments | Booking Rate | Revenue Impact |
|------|-------|-----------|--------------|--------------|----------------|
| W1 | 150 | 60 (40%) | 25 (17%) | 42% qualified→book | Est. $50K deals |
| W2 | 230 | 92 (40%) | 38 (17%) | 41% qualified→book | Est. $76K deals |

**Chart**: Funnel visualization (Google Sheets custom chart)

---

### Tab 3: Financial Metrics

#### MRR Tracking

| Month | Starting MRR | New MRR | Expansion | Churned | Ending MRR | Net Growth |
|-------|-------------|---------|-----------|---------|-----------|------------|
| Feb | $0 | $4,985 | $0 | $0 | $4,985 | +∞ |
| Mar | $4,985 | $8,970 | $497 | $0 | $14,452 | +190% |
| Apr | $14,452 | $7,976 | $994 | $497 | $22,925 | +59% |

**Formulas**:
```
New MRR = SUMIF(signups, "within month") * avg_plan_value
Expansion = SUMIF(upgrades, "within month")
Churned = SUMIF(cancellations, "within month") * their_mrr
Net Growth % = (Ending - Starting) / Starting
```

#### Customer Cohorts

| Cohort | Month 0 | Month 1 | Month 2 | Month 3 | Retention |
|--------|---------|---------|---------|---------|-----------|
| Feb 2026 | 5 | 5 (100%) | 4 (80%) | -- | TBD |
| Mar 2026 | 12 | -- | -- | -- | TBD |

---

### Tab 4: Customer Acquisition

#### CAC by Channel

| Channel | Spend | Signups | CAC | LTV | LTV/CAC |
|---------|-------|---------|-----|-----|---------|
| Facebook Ads | $2,500 | 8 | $313 | $2,400 | 7.7x |
| Google Ads | $1,800 | 6 | $300 | $2,400 | 8.0x |
| Organic/SEO | $500 | 4 | $125 | $2,400 | 19.2x |
| Referrals | $0 | 3 | $0 | $2,880 | ∞ |
| **Total** | **$4,800** | **21** | **$229** | **$2,457** | **10.7x** |

**Target CAC**: $150-300  
**Target LTV/CAC**: > 3x

#### Funnel: Visitor → Customer

| Stage | Count | Conversion | Drop-off |
|-------|-------|------------|----------|
| Website Visitors | 5,000 | -- | -- |
| Trial Started | 250 | 5.0% | 95% |
| Activated (connected CRM) | 180 | 72% | 28% |
| First Lead Processed | 150 | 83% | 17% |
| First Booking | 100 | 67% | 33% |
| Paid Conversion | 25 | 25% | 75% |

---

### Tab 5: Operational Health

#### System Performance

| Metric | Target | Current | Status | Notes |
|--------|--------|---------|--------|-------|
| AI Response Time (p50) | < 10s | 8.5s | 🟢 | Excellent |
| AI Response Time (p95) | < 30s | 22s | 🟢 | Good |
| AI Response Time (p99) | < 60s | 45s | 🟡 | Monitor |
| Uptime | 99.9% | 99.95% | 🟢 | On track |
| Error Rate | < 1% | 0.3% | 🟢 | Stable |
| Webhook Success | 99.5% | 99.8% | 🟢 | Good |

#### Support Metrics

| Metric | Target | Current |
|--------|--------|---------|
| Avg Response Time (Support) | < 4h | 2.5h |
| First Contact Resolution | > 70% | 68% |
| NPS Score | > 50 | 62 |
| CSAT | > 4.0/5 | 4.3/5 |

---

## Key Formulas (Google Sheets)

### Response Time Calculation
```excel
=AVERAGEIF(leads!C:C,"<="&NOW(),leads!D:D)
```

### Qualification Rate
```excel
=COUNTIF(leads!E:E,"qualified")/COUNTA(leads!A:A)
```

### Booking Conversion Rate
```excel
=COUNTIF(bookings!A:A,">"&EOMONTH(TODAY(),-1))/COUNTIF(leads!A:A,">"&EOMONTH(TODAY(),-1))
```

### MRR (Current)
```excel
=SUMPRODUCT((customers!B:B="active")*(customers!D:D))
```

### Churn Rate (Monthly)
```excel
=COUNTIF(churn!B:B,">"&EOMONTH(TODAY(),-1))/COUNTIF(customers!C:C,"<"&TODAY())
```

### CAC (Trailing 30 days)
```excel
=SUM(marketing_spend!B:B)/COUNTIF(signups!C:C,">"&TODAY()-30)
```

### LTV Estimate
```excel
=customers!D:D*(12/churn_rate_cell)*gross_margin
```

---

## Conditional Formatting Rules

| Metric | Green 🟢 | Yellow 🟡 | Red 🔴 |
|--------|----------|-----------|--------|
| Response Time | < 15s | 15-30s | > 30s |
| Qualification Rate | > 40% | 25-40% | < 25% |
| Booking Rate | > 15% | 10-15% | < 10% |
| MRR vs Target | > 90% | 70-90% | < 70% |
| Churn Rate | < 3% | 3-7% | > 7% |
| CAC | $150-300 | $300-500 | > $500 |
| Uptime | > 99.9% | 99-99.9% | < 99% |

---

## Data Sources & Automation

### Automated Data (via API)
- Lead volume (PostHog → Sheets API)
- Response times (System metrics → Sheets)
- MRR (Stripe → Sheets)
- Signup counts (Database → Sheets)

### Manual Entry (Daily)
- Marketing spend by channel
- Support ticket volumes
- Qualitative notes
- External factors (holidays, campaigns)

### Semi-Automated (Weekly)
- NPS/CSAT scores (survey export)
- Cohort retention (SQL query)
- Feature usage metrics

---

## Alert Thresholds

Send Slack/email alert when:

| Condition | Threshold | Recipients |
|-----------|-----------|------------|
| Response time spike | p95 > 45s for 1 hour | Engineering |
| Zero leads (business hours) | 0 for 30 min | Operations |
| Churn spike | > 2 in 24 hours | Customer Success |
| Payment failure cluster | > 3 in 1 hour | Finance |
| Trial conversion drop | < 15% weekly | Product |
| MRR miss | < 80% of weekly target | Leadership |

---

## Dashboard Access

| Role | Access Level | Tabs Visible |
|------|-------------|--------------|
| Leadership | Full | All tabs |
| Sales | View + Edit (CAC) | Exec Summary, CAC, Funnel |
| Product | View + Edit (features) | All except financial |
| Engineering | View + Edit (ops) | Operational Health, Performance |
| Customer Success | View + Edit (CS) | Exec Summary, Support Metrics |

---

## Google Sheets Setup Instructions

1. **Create Sheet**: "AI Lead Response — KPI Dashboard"
2. **Share**: Add team members with appropriate permissions
3. **Install Add-ons**: 
   - "SyncWith" for API connections
   - "ChartExpo" for advanced visualizations
4. **Connect Data**:
   - PostHog API key → Lead metrics
   - Stripe API key → MRR data
   - Database read replica → Customer data
5. **Set Refresh**: Hourly for automated data
6. **Mobile App**: Enable for on-the-go checking

---

## Export & Reporting

### Weekly Report (Auto-generated)
- Executive summary snapshot
- Week-over-week changes
- Key wins and concerns
- Action items for next week

### Monthly Board Report
- Full financial review
- Cohort analysis
- Channel performance deep-dive
- Forward projections
- Strategic recommendations

---

## Version History

| Date | Author | Changes |
|------|--------|---------|
| 2026-02-14 | Analytics Agent | Initial dashboard spec |
