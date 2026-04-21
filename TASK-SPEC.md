# Task Spec: Revenue Funnel Dashboard

## What: Files and Functions to Change

### 1. Revenue Snapshot Service
- **File:** `lib/services/RevenueMetricsService.js` (NEW)
- **Methods:**
  - `captureSnapshot(projectId = 'leadflow')` - Captures daily metrics
  - `calculateFunnelMetrics()` - Calculates all funnel metrics (signups, FUB, aha, paid)
  - `getMetricsForRange(days)` - Returns historical data for sparklines
  - `checkThresholds()` - Checks if metrics fall below thresholds

### 2. Heartbeat Integration
- **File:** `~/.openclaw/genome/core/heartbeat-executor.js` (MODIFY)
- **Add:** Daily revenue snapshot check (runs once per day)
- **Behavior:** Calls `RevenueMetricsService.captureSnapshot()` if not yet run today

### 3. Admin API Endpoint
- **File:** `product/lead-response/dashboard/app/api/admin/revenue/route.ts` (NEW)
- **Methods:** `GET /api/admin/revenue?days=7` - Returns revenue metrics for frontend

### 4. Admin Dashboard Page
- **File:** `product/lead-response/dashboard/app/admin/revenue/page.tsx` (NEW)
- **Display:**
  - Funnel with 4+ steps: Signups → FUB Connected → Aha Moment → Paid
  - Conversion % at each step
  - 7-day sparklines for each metric
  - Today vs yesterday deltas
  - Color-coded alerts for threshold violations

### 5. Telegram Alert
- **File:** `~/.openclaw/genome/core/heartbeat-executor.js` (MODIFY)
- **Behavior:** After snapshot, call alert function if any threshold crossed
- **Thresholds:** FUB activation < 20%, aha rate < 30%

## Verify: How to Confirm It Works

### Test 1: Snapshot Creation
```bash
node -e "require('./lib/services/RevenueMetricsService').captureSnapshot().then(() => console.log('OK'))"
psql -U clawdbot -d openclaw -c "SELECT * FROM revenue_metrics ORDER BY created_at DESC LIMIT 1;"
# Should see a row with today's date, non-zero metrics
```

### Test 2: API Endpoint
```bash
curl -X GET http://localhost:3000/api/admin/revenue?days=7
# Should return JSON with revenue_metrics array
```

### Test 3: Admin Page
- Navigate to `http://localhost:3000/admin/revenue`
- Should show funnel visualization
- Should show sparklines and deltas
- No errors in console

### Test 4: Alert Logic
- Manually set FUB activation to <20% in test
- Call `RevenueMetricsService.checkThresholds()`
- Verify alert is sent (check logs or mock)

### Test 5: npm test
- All existing tests pass
- New service tests pass

## Boundaries: What NOT to Touch

- ❌ Do NOT modify subscription table or payment logic
- ❌ Do NOT touch Stripe webhooks
- ❌ Do NOT modify real_estate_agents table structure
- ❌ Do NOT change pilot_recruitment_targets schema
- ❌ Do NOT modify heartbeat core loop structure (only add to step)
- ❌ Do NOT create new database tables (revenue_metrics exists)
- ❌ Do NOT modify existing admin pages (funnel, pilots, etc)

## Data Source Truth

### Subscription Metrics (from subscriptions table)
- Active: `status = 'active'` AND `canceled_at IS NULL`
- MRR: Sum of tier prices where active

### Trial Metrics (from real_estate_agents table)
- Trial users: `subscription_status = 'inactive'` AND `trial_ends_at > now()`
- Conversion: `active_subscribers / (active_subscribers + trial_users)`

### FUB Activation (from agent_integrations + real_estate_agents)
- Connected: COUNT(agent_integrations) / COUNT(real_estate_agents)

### Aha Moment (from real_estate_agents)
- Completed: COUNT(aha_completed = true) / COUNT(real_estate_agents)

### Paid (from subscriptions)
- Active subscribers: COUNT(status = 'active')

## Schema: revenue_metrics Table
```
id              | bigint (PK)
project_id      | text
date            | date (UNIQUE with project_id)
mrr_cents       | integer
active_subscribers | integer
trial_users     | integer
churned_count   | integer
new_subscribers | integer
conversion_rate | numeric(5,4)
arpu_cents      | integer
data            | jsonb (extended metrics)
created_at      | timestamp
```

## Funnel Steps Definition
1. **Signups** - real_estate_agents count
2. **FUB Connected** - agent_integrations count
3. **Aha Moment** - COUNT(aha_completed=true)
4. **Paid** - active_subscribers from subscriptions
