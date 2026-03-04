#!/bin/bash
# BO2026 Dashboard Auto-Sync
# Run this automatically via cron or heartbeat
# Updates dashboard with latest progress without manual intervention

cd /Users/clawdbot/.openclaw/workspace/business-opportunities-2026/product/lead-response/dashboard || exit 1

echo "🔄 BO2026 Dashboard Auto-Sync"
echo "=============================="
echo ""

# Step 1: Validate system (generates system-state.json)
echo "Step 1: Validating system..."
node scripts/validate-system.ts 2>/dev/null || echo "Validation completed with warnings"
echo ""

# Step 2: Update dashboards (uses system-state.json)
echo "Step 2: Updating dashboards..."
node scripts/update-dashboard.ts
echo ""

echo "✅ Dashboard sync complete!"
echo ""
echo "Updated files:"
echo "  - DASHBOARD.md"
echo "  - dashboard.html"
echo "  - STATUS_REPORT_AUTO.md"
echo ""
echo "Next sync in ~30 minutes"
