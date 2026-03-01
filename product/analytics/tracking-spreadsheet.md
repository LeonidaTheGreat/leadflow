# Daily Tracking Spreadsheet Template
## AI Lead Response System — Daily Metrics Input

---

## Overview

**Purpose**: Daily input sheet for core metrics  
**Update Frequency**: Daily (by 10 AM EST)  
**Owner**: Operations Lead  
**Audience**: Leadership, Sales, Product

---

## Sheet Structure

### Tab 1: Daily Input (Primary Entry Point)

#### Instructions Row (Row 1)
```
Enter daily data below. All automated cells will update. 
Save time: Use copy-paste from previous day and adjust.
```

#### Input Section (Rows 3-50)

| Column | Header | Input Type | Formula/Notes |
|--------|--------|------------|---------------|
| A | Date | Date picker | Format: YYYY-MM-DD |
| B | Day of Week | Auto | `=TEXT(A4,"dddd")` |
| C | Leads Received | Manual | Count from PostHog dashboard |
| D | AI Responses Sent | Manual | Should match or be close to Col C |
| E | Failed Responses | Manual | Errors/undelivered |
| F | Avg Response Time (sec) | Manual | From PostHog median |
| G | Leads Qualified | Manual | Score >= 60 |
| H | Appointments Booked | Manual | Calendar confirmations |
| I | Trial Signups | Manual | New trial starts |
| J | New Customers | Manual | First payment received |
| K | Churned Customers | Manual | Cancellations |
| L | Marketing Spend | Manual | Total daily ad spend |
| M | Notes | Free text | Campaigns, issues, wins |

#### Sample Data (Row 4-6)

| Date | Day | Leads | Responses | Failed | Avg RT | Qualified | Bookings | Trials | New Cust | Churn | Spend | Notes |
|------|-----|-------|-----------|--------|--------|-----------|----------|--------|----------|-------|-------|-------|
| 2026-02-14 | Friday | 12 | 12 | 0 | 8.5 | 5 | 2 | 1 | 0 | 0 | $150 | Launch day! |
| 2026-02-15 | Saturday | 8 | 8 | 0 | 12.3 | 3 | 1 | 2 | 1 | 0 | $100 | Weekend dip normal |
| 2026-02-16 | Sunday | 6 | 6 | 0 | 9.2 | 2 | 0 | 0 | 0 | 0 | $75 | -- |

---

### Tab 2: Calculated Metrics (Auto-Generated)

Pulls from Daily Input, calculates rates and trends.

| Column | Metric | Formula Example |
|--------|--------|-----------------|
| A | Date | `='Daily Input'!A4` |
| B | Response Rate % | `=D4/C4` |
| C | Qualification Rate % | `=G4/C4` |
| D | Booking Rate % | `=H4/C4` |
| E | Qualified→Book % | `=H4/G4` |
| F | Trial Conv Rate (7-day lag) | `=J11/I4` |
| G | Daily MRR Change | `=(J4-K4)*800` |
| H | CAC (trailing 7d) | `=AVERAGE(L4:L10)/AVERAGE(I4:I10)` |
| I | WoW Leads Trend % | `=(C4-C11)/C11` |

---

### Tab 3: Weekly Summary

Rolls up daily data into weekly buckets.

| Week | Leads Total | Avg Response | Qual Rate | Book Rate | Trials | New Cust | Churn | MRR Start | MRR End | Net MRR |
|------|-------------|--------------|-----------|-----------|--------|----------|-------|-----------|---------|---------|
| W1 | 150 | 10.2s | 40% | 15% | 12 | 5 | 0 | $0 | $4,000 | +$4,000 |
| W2 | 230 | 11.5s | 38% | 17% | 18 | 8 | 1 | $4,000 | $9,600 | +$5,600 |
| W3 | 280 | 9.8s | 42% | 19% | 22 | 7 | 0 | $9,600 | $15,200 | +$5,600 |
| W4 | 310 | 8.9s | 41% | 21% | 25 | 6 | 1 | $15,200 | $19,200 | +$4,000 |

**Formulas:**
```excel
// Leads Total
=SUMIFS('Daily Input'!$C:$C, 'Daily Input'!$A:$A, ">="&A2, 'Daily Input'!$A:$A, "<"&A2+7)

// Avg Response Time
=AVERAGEIFS('Daily Input'!$F:$F, 'Daily Input'!$A:$A, ">="&A2, 'Daily Input'!$A:$A, "<"&A2+7)

// Qual Rate
=SUMIFS('Daily Input'!$G:$G, 'Daily Input'!$A:$A, ">="&A2, 'Daily Input'!$A:$A, "<"&A2+7) / 
 SUMIFS('Daily Input'!$C:$C, 'Daily Input'!$A:$A, ">="&A2, 'Daily Input'!$A:$A, "<"&A2+7)
```

---

### Tab 4: Goal Tracker

#### Day 0-60 Sprint Goals

| Goal | Target | Current | Progress % | Status | Days Left |
|------|--------|---------|------------|--------|-----------|
| MRR | $20,000 | $4,985 | 25% | 🟡 On Track | 46 |
| Customers | 25 | 8 | 32% | 🟡 On Track | 46 |
| Avg Response | < 30s | 10.2s | 100% | 🟢 Exceeding | -- |
| Qual Rate | > 35% | 40% | 114% | 🟢 Exceeding | -- |
| Book Rate | > 15% | 17% | 113% | 🟢 Exceeding | -- |
| CAC | $150-300 | $218 | 100% | 🟢 Good | -- |
| Churn | < 5% | 0% | 100% | 🟢 Good | -- |

**Progress Chart**: Bar chart showing % to goal for each metric

#### Milestone Tracker

| Milestone | Target Date | Actual Date | Status |
|-----------|-------------|-------------|--------|
| First customer | Feb 14 | Feb 15 | ✅ Complete |
| $5K MRR | Feb 28 | -- | 🟡 In Progress |
| 10 customers | Mar 1 | -- | 🟡 In Progress |
| $10K MRR | Mar 15 | -- | ⚪ Pending |
| 20 customers | Mar 30 | -- | ⚪ Pending |
| $20K MRR | Apr 15 | -- | ⚪ Pending |
| 25 customers | Apr 15 | -- | ⚪ Pending |

---

### Tab 5: Charts & Visualizations

#### Chart 1: Daily Lead Volume + Response Time
- Type: Combo chart (bar + line)
- X-axis: Date
- Left Y: Lead count (bars)
- Right Y: Response time in seconds (line)
- Target line: 30s response time

#### Chart 2: Conversion Funnel Trend
- Type: 100% stacked area
- X-axis: Week
- Series: Qualified %, Not Qualified %
- Shows qualification rate over time

#### Chart 3: MRR Growth
- Type: Waterfall chart
- X-axis: Week
- Positive: New MRR
- Negative: Churned MRR
- Running total line

#### Chart 4: CAC by Channel (Pie)
- Only updates when channel breakdown entered

#### Chart 5: Weekly KPI Dashboard
- Sparklines for each metric
- Conditional formatting

---

### Tab 6: Raw Data Export

For connecting to other tools (PostHog, Stripe, etc.)

| Timestamp | Event | Value | Source |
|-----------|-------|-------|--------|
| 2026-02-14 00:00 | leads_received | 12 | PostHog API |
| 2026-02-14 00:00 | mrr | 4985 | Stripe API |
| 2026-02-14 00:00 | trial_signups | 2 | Database |

---

## Quick Entry Guide

### Morning Routine (5 minutes)

1. **Copy previous row** (Ctrl+D or Cmd+D)
2. **Update Date** to today
3. **Pull metrics**:
   - Open PostHog → copy lead count
   - Open dashboard → copy response time
   - Check Stripe → new customers
   - Check calendar → bookings
4. **Add notes** for anything unusual
5. **Verify formulas** calculated correctly

### Weekly Review (15 minutes)

1. **Review Weekly Summary tab**
2. **Check Goal Tracker progress**
3. **Update milestone dates** if needed
4. **Screenshot charts** for team update
5. **Identify trends** and action items

---

## Conditional Formatting Rules

### Daily Input Tab

| Column | Green 🟢 | Yellow 🟡 | Red 🔴 |
|--------|----------|-----------|--------|
| F (Response Time) | < 15 | 15-30 | > 30 |
| H (Bookings) | > target | 80-100% | < 80% |

### Calculated Metrics Tab

| Column | Green 🟢 | Yellow 🟡 | Red 🔴 |
|--------|----------|-----------|--------|
| B (Response Rate) | > 98% | 95-98% | < 95% |
| C (Qual Rate) | > 40% | 30-40% | < 30% |
| D (Book Rate) | > 15% | 10-15% | < 10% |
| F (Trial Conv) | > 25% | 15-25% | < 15% |

---

## Data Validation

### Dropdown Lists

| Column | Values | Purpose |
|--------|--------|---------|
| B (Day) | Monday-Sunday | Prevent typos |
| M (Notes tags) | [Campaign], [Issue], [Win], [Competitor] | Categorization |

### Number Validation

| Column | Min | Max | Alert if outside |
|--------|-----|-----|------------------|
| C (Leads) | 0 | 1000 | "Check this number" |
| F (Response) | 0 | 300 | "Should be < 30s" |
| J (New Cust) | 0 | 50 | "Unusually high" |

---

## Automation Setup

### Google Apps Script (Optional)

```javascript
// Auto-sort by date
function onEdit(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Daily Input");
  const range = sheet.getRange("A4:M100");
  range.sort({column: 1, ascending: true});
}

// Daily email summary (trigger at 9 AM)
function sendDailySummary() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet();
  const yesterday = sheet.getRange("Daily Input!A4:C4").getValues();
  
  MailApp.sendEmail({
    to: "team@leadresponse.ai",
    subject: "Daily Metrics: " + yesterday[0][0],
    body: `Yesterday: ${yesterday[0][2]} leads, ${yesterday[0][1]} response time`
  });
}
```

### Zapier Integrations

| Trigger | Action | Frequency |
|---------|--------|-----------|
| New row in Daily Input | Post to Slack #metrics | Real-time |
| Weekly Summary updated | Email to leadership | Weekly |
| Goal < 80% | Send alert to team | Daily check |

---

## Mobile Access

### Google Sheets App Setup

1. Download Google Sheets app (iOS/Android)
2. Star the spreadsheet for quick access
3. Enable offline editing
4. Set up widgets for key metrics

### Mobile-Friendly View

Create a "Mobile" tab with large font, key metrics only:

| Today | Value | vs Yesterday |
|-------|-------|--------------|
| Leads | 12 | +4 ↗️ |
| Response | 8.5s | -2.1s 🟢 |
| Bookings | 2 | +1 ↗️ |
| New Customers | 1 | +1 🎉 |
| MRR | $5,976 | +$497 ↗️ |

---

## Backup & Version Control

### Automatic Backup

1. **File → Version history → See version history**
2. **Set auto-save**: Every change saved
3. **Weekly named version**: "Week 3 - Feb 14-20"

### Export Schedule

| Frequency | Format | Destination |
|-----------|--------|-------------|
| Daily | CSV | S3 bucket /analytics/daily/ |
| Weekly | PDF | Shared drive /reports/ |
| Monthly | XLSX | Archive folder |

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Formula showing #REF! | Check if source cell exists |
| Date formatting wrong | Format → Number → Date |
| Charts not updating | Check data range includes new rows |
| Slow loading | Archive old data to separate sheet |
| Mobile display broken | Use "Mobile" tab, not main sheet |

---

## Template Access

**Master Template**: [Google Sheets Link - TBD]  
**Make a Copy**: File → Make a copy  
**Share with team**: Share button → Add emails  
**Set permissions**: Commenter for most, Editor for ops lead

---

## Summary Checklist

- [ ] Create copy of template
- [ ] Add team members
- [ ] Set up conditional formatting
- [ ] Configure data validation
- [ ] Connect PostHog/Stripe APIs (optional)
- [ ] Set up daily reminder (Slack/Calendar)
- [ ] Schedule weekly review meeting
- [ ] Export first week of data as backup
- [ ] Train team on data entry
- [ ] Celebrate first milestone! 🎉
