#!/usr/bin/env node
/**
 * Daily Self-Review - Orchestrator Self-Improvement
 * 
 * Runs daily (cron) to:
 * 1. Calculate decision accuracy
 * 2. Generate recommendations
 * 3. Alert if accuracy below threshold
 * 4. Update dashboard
 * 
 * Cron: 0 0 * * * cd /path && node daily-self-review.js
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const {
  calculateAccuracy,
  generateDailyReport,
  getAccuracyThreshold
} = require('./orchestrator-decision-tracker.js');

const ALERT_LOG = path.join(process.cwd(), '.orchestrator-alerts.jsonl');
const DASHBOARD_INJECT_FILE = path.join(process.cwd(), '.dashboard-orchestrator-stats.json');

/**
 * Log an alert
 */
function logAlert(alert) {
  const entry = {
    timestamp: new Date().toISOString(),
    ...alert
  };
  fs.appendFileSync(ALERT_LOG, JSON.stringify(entry) + '\n');
  return entry;
}

/**
 * Update dashboard stats file (for injection into dashboard.html)
 */
function updateDashboardStats(report) {
  const stats = {
    last_updated: new Date().toISOString(),
    accuracy_24h: report.last_24h.accuracy,
    accuracy_7d: report.last_7d.accuracy,
    accuracy_all_time: report.all_time.accuracy,
    total_decisions: report.all_time.total,
    threshold: getAccuracyThreshold(),
    recommendations: report.recommendations,
    needs_attention: report.recommendations.some(r => r.priority === 'high')
  };
  
  fs.writeFileSync(DASHBOARD_INJECT_FILE, JSON.stringify(stats, null, 2));
  return stats;
}

/**
 * Format alert message for Telegram/Discord
 */
function formatAlertMessage(report) {
  const threshold = getAccuracyThreshold();
  const accuracy24h = report.last_24h.accuracy;
  
  if (accuracy24h >= threshold && !report.recommendations.some(r => r.priority === 'high')) {
    return null; // No alert needed
  }
  
  let message = '🤖 Orchestrator Daily Self-Review\n';
  message += '========================\n\n';
  
  if (accuracy24h < threshold) {
    message += `⚠️ ACCURACY ALERT\n`;
    message += `24h Accuracy: ${accuracy24h}% (below ${threshold}% threshold)\n\n`;
  } else {
    message += `✅ Accuracy: ${accuracy24h}% (above threshold)\n\n`;
  }
  
  message += `📊 Stats:\n`;
  message += `  • 24h: ${accuracy24h}% (${report.last_24h.correct}/${report.last_24h.total})\n`;
  message += `  • 7d: ${report.last_7d.accuracy}% (${report.last_7d.correct}/${report.last_7d.total})\n`;
  message += `  • All time: ${report.all_time.accuracy}% (${report.all_time.correct}/${report.all_time.total})\n\n`;
  
  if (report.recommendations.length > 0) {
    message += `💡 Recommendations:\n`;
    report.recommendations.forEach(rec => {
      const emoji = rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : 'ℹ️';
      message += `  ${emoji} ${rec.message}\n`;
    });
  }
  
  return message;
}

/**
 * Main review process
 */
async function runDailyReview() {
  console.log('🔍 Running daily self-review...\n');
  
  // Generate report
  const report = generateDailyReport();
  
  // Update dashboard
  const stats = updateDashboardStats(report);
  console.log('📊 Dashboard stats updated');
  
  // Check if alert needed
  const alertMessage = formatAlertMessage(report);
  if (alertMessage) {
    console.log('\n🚨 ALERT:\n' + alertMessage);
    logAlert({
      type: 'accuracy_below_threshold',
      message: alertMessage,
      accuracy: report.last_24h.accuracy,
      threshold: getAccuracyThreshold()
    });
  } else {
    console.log('\n✅ All metrics within thresholds');
  }
  
  // Write to metrics table for dashboard
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (supabaseUrl && supabaseKey) {
      const { createClient } = require('@supabase/supabase-js');
      const sb = createClient(supabaseUrl, supabaseKey, { auth: { autoRefreshToken: false, persistSession: false } });
      await sb.from('metrics').insert({
        project_id: 'bo2026', domain: 'orchestrator', metric_type: 'daily_summary',
        data: stats
      });
      console.log('📊 Metrics table updated');
    }
  } catch (err) {
    console.warn('⚠️ Failed to write to metrics table:', err.message);
  }

  // Log completion
  console.log('\n✅ Daily self-review complete');
  console.log(`Report saved: .orchestrator-daily-report.json`);
  console.log(`Dashboard stats: .dashboard-orchestrator-stats.json`);

  return {
    report,
    stats,
    alert: alertMessage
  };
}

// Run if called directly
if (require.main === module) {
  runDailyReview().catch(err => {
    console.error('Daily review failed:', err);
    process.exit(1);
  });
}

module.exports = { runDailyReview, formatAlertMessage, updateDashboardStats };
