# 📊 Analytics KPI Dashboard Setup

The Analytics KPI Dashboard provides real-time insights into your lead response system performance.

## 🚀 Quick Start

### 1. Dashboard Metrics (All Implemented)

The dashboard displays **6 key metrics** with 30-day trends:

| Metric | Description | Source |
|--------|-------------|--------|
| **Messages Sent** | Total outbound messages | `messages` table |
| **Delivery Rate** | % of messages successfully delivered | `messages.status = 'delivered'` |
| **Response Rate** | % of leads that replied to messages | `messages` (inbound/outbound) |
| **Sequence Completion** | % of multi-message sequences finished | Message count per lead |
| **Lead Conversion** | % of leads that booked a call | `bookings` linked to `leads` |
| **Response Time** | Average minutes to first response | Time delta between outbound/inbound |

### 2. Access the Dashboard

```
URL: /dashboard/analytics
```

Features:
- ✅ Real-time data (updates every 5 minutes)
- ✅ Time range selector (7d, 30d, 90d)
- ✅ Multiple chart types (line, pie, funnel)
- ✅ Mobile responsive
- ✅ Dark mode support

## 📊 Data Sources

### Primary Tables

```
leads
├── id (UUID)
├── phone (string)
├── status (new|qualified|nurturing|appointment|responded|closed)
├── created_at (timestamp)
├── responded_at (timestamp, nullable)
└── agent_id (UUID, nullable)

messages
├── id (UUID)
├── lead_id (UUID, FK)
├── direction (inbound|outbound)
├── channel (sms|email|voice|web)
├── status (pending|sent|delivered|failed)
├── created_at (timestamp)
└── metadata (JSONB)

bookings
├── id (UUID)
├── lead_id (UUID, FK)
├── status (pending|confirmed|completed|cancelled)
├── start_time (timestamp)
├── created_at (timestamp)
└── ...
```

## 🔍 Query Architecture

### API Route

**GET** `/api/analytics/dashboard?days=30`

Returns all metrics in one response:
```json
{
  "success": true,
  "data": {
    "messagesPerDay": [
      { "date": "2026-02-25", "count": 42 }
    ],
    "deliveryStats": {
      "sent": 150,
      "delivered": 145,
      "failed": 5,
      "pending": 0
    },
    "responseRate": {
      "totalSent": 100,
      "totalResponded": 18,
      "responseRate": 18.0
    },
    "sequenceCompletion": {
      "started": 50,
      "completed": 12,
      "completionRate": 24.0
    },
    "leadConversion": {
      "totalLeads": 200,
      "convertedLeads": 15,
      "conversionRate": 7.5
    },
    "responseTime": {
      "avgResponseTime": 45,
      "medianResponseTime": 28
    }
  },
  "timestamp": "2026-02-25T16:30:00Z"
}
```

### Query Functions

All queries are in `/lib/analytics-queries.ts`:

```typescript
// Get messages per day (line chart data)
await getMessagesPerDay(daysBack: number)

// Get delivery success rate
await getDeliveryStats(daysBack: number)

// Get response rate (leads that replied)
await getResponseRate(daysBack: number)

// Get sequence completion rate
await getSequenceCompletion(daysBack: number)

// Get lead conversion rate
await getLeadConversion(daysBack: number)

// Get average response time
await getAvgResponseTime(daysBack: number)

// Get all metrics at once
await getAnalyticsDashboard(daysBack: number)
```

## 🔧 Testing with Sample Data

### Generate Sample Data

```bash
cd dashboard
npx ts-node scripts/seed-analytics-data.ts
```

This creates:
- 150 leads (30 days × 5 leads/day)
- 300-450 messages (3 messages/lead with variations)
- ~22 bookings (15% conversion)
- Natural response patterns (30% reply rate)

### Options (Edit `scripts/seed-analytics-data.ts`)

```typescript
{
  daysBack: 30,           // How many days of history to create
  leadsPerDay: 5,         // Leads created per day
  messagesPerLead: 3,     // Average messages per lead
  conversionRate: 0.15,   // 15% conversion to bookings
}
```

## 🎨 Component Structure

### Files

```
components/dashboard/
└── AnalyticsKpiDashboard.tsx
    ├── KPI Cards (6 metrics)
    ├── Line Chart (messages over time)
    ├── Pie Chart (delivery status)
    ├── Funnel Chart (conversion)
    └── Summary Table

app/dashboard/
└── analytics/
    └── page.tsx  (uses AnalyticsKpiDashboard)

lib/
├── analytics-queries.ts  (all SQL/Supabase queries)
└── types/index.ts       (TypeScript types)

app/api/
└── analytics/
    └── dashboard/
        └── route.ts     (API endpoint)
```

### Theme

- ✅ Matches existing dark dashboard theme
- ✅ Tailwind CSS + Recharts
- ✅ Color-coded metrics
- ✅ Responsive grid layout

## 📈 SQL Views (Optional)

See `/supabase/migrations/20260225_analytics_kpi_queries.sql` for optimized views:

```sql
-- Examples (can be used for materialized views later)
SELECT * FROM analytics_messages_per_day;
SELECT * FROM analytics_delivery_status;
SELECT * FROM analytics_response_rate;
SELECT * FROM analytics_daily_summary;
SELECT * FROM analytics_agent_performance;
```

## 🔌 PostHog Integration (Future)

When PostHog is connected, you can track:

1. **User Behavior Events**
   ```typescript
   posthog.capture('message_sent', {
     lead_id,
     delivery_status,
     response_time_ms,
   })
   ```

2. **Funnel Analysis**
   ```
   lead_created → message_sent → response_received → booking_made
   ```

3. **Custom Metrics**
   - AI accuracy over time
   - Agent performance comparison
   - Channel effectiveness (SMS vs Email vs Web)

## 🚀 Performance Notes

### Caching Strategy

- **API Cache**: 5 minutes (stale-while-revalidate 10 minutes)
- **Component Refresh**: 5 minute auto-refresh
- **Database Indexes**: Created on `created_at`, `status`, `lead_id`, `direction`

### For High Volume

If > 1M messages:

1. **Use Materialized Views**
   ```sql
   CREATE MATERIALIZED VIEW analytics_daily_summary_mv AS
   SELECT * FROM analytics_daily_summary;
   
   CREATE INDEX ON analytics_daily_summary_mv (summary_date DESC);
   
   REFRESH MATERIALIZED VIEW CONCURRENTLY analytics_daily_summary_mv;
   ```

2. **Add Partitioning**
   ```sql
   CREATE TABLE messages_2026_02 PARTITION OF messages
   FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
   ```

3. **Use Time-Series Columns**
   ```sql
   ALTER TABLE messages SET (fillfactor = 70);
   ```

## 🧪 Testing Checklist

- [ ] Dashboard loads without errors
- [ ] All 6 KPI cards display metrics
- [ ] Time range selector works (7d/30d/90d)
- [ ] Charts render correctly
- [ ] Mobile view is responsive
- [ ] Auto-refresh works (check network tab every 5 min)
- [ ] Sample data seeder creates realistic data
- [ ] API endpoint returns correct format
- [ ] Dark mode styling is consistent
- [ ] Loading skeleton appears during fetch

## 📱 Mobile Responsive

Breakpoints implemented:
- **Mobile**: 1 column grid (< 640px)
- **Tablet**: 2 column grid (≥ 640px)
- **Desktop**: 3 column grid (≥ 1024px)
- **Charts**: Stack vertically on mobile

## 🔐 Security

- ✅ Uses Supabase admin client (server-side queries)
- ✅ No sensitive data in client components
- ✅ API route has error handling
- ✅ Parameter validation (days: 1-365)

## 🎯 Next Steps

### Phase 1: MVP (✅ Complete)
- [x] Core metrics implementation
- [x] React dashboard component
- [x] API endpoint
- [x] Sample data generator

### Phase 2: Enhanced (Ready)
- [ ] PostHog event integration
- [ ] Custom date range selector
- [ ] Export to CSV/PDF
- [ ] Email reports (daily/weekly)
- [ ] Agent-specific dashboards

### Phase 3: Advanced (Future)
- [ ] Predictive analytics
- [ ] Anomaly detection
- [ ] A/B test tracking
- [ ] Real-time webhooks

## 🐛 Troubleshooting

### No data showing?

1. Check database connection in `.env.local`
2. Run sample data seeder: `npx ts-node scripts/seed-analytics-data.ts`
3. Verify tables exist: `messages`, `leads`, `bookings`
4. Check browser console for errors

### Slow queries?

1. Verify indexes are created (see SQL migration)
2. Reduce time range (use 7d instead of 365d)
3. Check network tab for API response time
4. Consider materialized views for heavy loads

### Charts not rendering?

1. Verify Recharts is installed: `npm list recharts`
2. Check data format in browser DevTools
3. Clear cache and rebuild: `npm run build`
4. Verify `messagesPerDay` data is an array of objects

## 📚 References

- **Supabase Docs**: https://supabase.com/docs
- **Recharts Docs**: https://recharts.org/
- **Next.js Data Fetching**: https://nextjs.org/docs/app/building-your-application/data-fetching
- **Tailwind CSS**: https://tailwindcss.com/

---

**Last Updated**: 2026-02-25
**Status**: ✅ Ready for pilot data
