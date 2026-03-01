# 📊 Analytics Dashboard - Quick Start Guide

## ✅ What's Ready

Your KPI dashboard is **fully built and ready to use** with real data.

### 5 Core Metrics (Live from Database)

1. **Messages Sent** - Total outbound SMS/emails
2. **Delivery Rate** - % successfully sent
3. **Response Rate** - % of leads that replied
4. **Sequence Completion** - % that completed multi-message sequences
5. **Lead Conversion** - % that booked calls

Plus:
- **Response Time** - Average minutes to first reply

## 🚀 Access Dashboard

```
→ http://localhost:3000/dashboard/analytics
```

## 🔧 Setup (Choose One)

### Option A: Use Real Pilot Data (Recommended)

If you have pilot data in the database:

```bash
# Just navigate to the dashboard - it will query real data
# Update happens every 5 minutes automatically
```

### Option B: Generate Test Data

```bash
cd dashboard
npx ts-node scripts/seed-analytics-data.ts
```

This creates:
- 150 leads (30-day history)
- 300+ messages (realistic patterns)
- ~20 bookings (15% conversion)

## 📊 Features

✅ **Real-Time** - Updates every 5 minutes
✅ **Time Ranges** - View last 7, 30, or 90 days
✅ **Charts** - Line chart (trends), pie chart (delivery), funnel (conversion)
✅ **Mobile Responsive** - Works on phone/tablet/desktop
✅ **Dark Mode** - Matches your dashboard theme
✅ **Performance** - Cached queries (5 min TTL)

## 🔌 API Endpoint

```bash
GET /api/analytics/dashboard?days=30
```

Returns:
```json
{
  "success": true,
  "data": {
    "messagesPerDay": [...],
    "deliveryStats": { "sent": 150, "delivered": 145, ... },
    "responseRate": { "totalSent": 100, "totalResponded": 18, ... },
    "sequenceCompletion": { "started": 50, "completed": 12, ... },
    "leadConversion": { "totalLeads": 200, "convertedLeads": 15, ... },
    "responseTime": { "avgResponseTime": 45, "medianResponseTime": 28 }
  }
}
```

## 📁 Files Created

```
components/dashboard/
└── AnalyticsKpiDashboard.tsx        # Main dashboard component

lib/
└── analytics-queries.ts              # All database queries

app/api/analytics/
└── dashboard/route.ts                # API endpoint

app/dashboard/analytics/
└── page.tsx                          # Dashboard page

supabase/migrations/
└── 20260225_analytics_kpi_queries.sql # SQL views & indexes

scripts/
└── seed-analytics-data.ts            # Sample data generator

docs/
├── ANALYTICS_KPI_SETUP.md            # Complete documentation
└── ANALYTICS_QUICK_START.md          # This file
```

## ⚡ How It Works

1. **Query** → Supabase fetches data from your real database
2. **Calculate** → Metrics computed on the fly (no pre-computed summaries)
3. **Display** → React component renders charts & KPI cards
4. **Refresh** → Auto-updates every 5 minutes
5. **Cache** → API response cached for 5 minutes

## 🎨 Styling

- Tailwind CSS (dark theme built-in)
- Responsive grid (1 col mobile → 3 cols desktop)
- Color-coded KPI cards
- Professional charts with tooltips

## 🔐 Security

✅ Server-side Supabase queries (admin client)
✅ No sensitive data exposed to client
✅ Parameter validation on API
✅ Error handling throughout

## 📈 Example Queries

```typescript
// Get last 30 days of messages
const { data } = await getMessagesPerDay(30)
// Returns: [{ date: "2026-02-25", count: 42 }, ...]

// Get delivery stats
const stats = await getDeliveryStats(30)
// Returns: { sent: 150, delivered: 145, failed: 5, pending: 0 }

// Get response rate (% of leads that replied)
const response = await getResponseRate(30)
// Returns: { totalSent: 100, totalResponded: 18, responseRate: 18.0 }

// Get conversion rate (% that booked)
const conversion = await getLeadConversion(30)
// Returns: { totalLeads: 200, convertedLeads: 15, conversionRate: 7.5 }
```

## 🧪 Testing

```bash
# Run tests
npm test analytics

# Seed sample data
npx ts-node scripts/seed-analytics-data.ts

# Build for production
npm run build

# Start server
npm start
```

## 🐛 Troubleshooting

### No data showing?

1. Check env vars are set: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
2. Verify database tables exist: `leads`, `messages`, `bookings`
3. Generate sample data: `npx ts-node scripts/seed-analytics-data.ts`
4. Check browser console for errors

### Slow loading?

1. Check API response time: DevTools → Network tab
2. Try smaller time range (7d instead of 90d)
3. Verify database indexes exist (created in migration)

### Chart not showing?

1. Verify Recharts is installed: `npm list recharts`
2. Check data format in browser DevTools
3. Rebuild: `npm run build && npm start`

## 📚 Documentation

- **Full Setup**: See `ANALYTICS_KPI_SETUP.md`
- **Database Schema**: See `lib/types/index.ts`
- **SQL Views**: See `supabase/migrations/20260225_analytics_kpi_queries.sql`
- **Component Code**: See `components/dashboard/AnalyticsKpiDashboard.tsx`

## 🎯 Next Steps (Optional)

### Add PostHog Integration
```typescript
// In your API routes
posthog.capture('message_sent', { lead_id, status })

// Dashboard will show advanced funnels
```

### Add Custom Dashboards
```typescript
// Per-agent analytics
// Per-campaign metrics
// Custom date ranges
// Export to PDF/CSV
```

### Add Alerts
```typescript
// Email if delivery rate drops below 80%
// Slack if response rate is unusual
// Weekly digest
```

## ✨ Summary

Your analytics dashboard is **production-ready** and will automatically:
- Query your real database
- Display live metrics
- Update every 5 minutes
- Work on mobile
- Cache efficiently
- Handle errors gracefully

**Just navigate to `/dashboard/analytics` to start monitoring your lead response system.**

---

**Questions?** Check `ANALYTICS_KPI_SETUP.md` for detailed documentation.
