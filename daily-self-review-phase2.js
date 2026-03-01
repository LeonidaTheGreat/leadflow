#!/usr/bin/env node
/**
 * Daily Self-Review - Phase 2 Enhanced
 * 
 * Includes predictive metrics and forecasting
 */

const { 
  calculateAccuracy, 
  generateDailyReport,
  getAccuracyThreshold 
} = require('./orchestrator-decision-tracker.js');

const { generateForecast } = require('./forecast.js');
const fs = require('fs');
const path = require('path');

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
 * Update dashboard stats file
 */
function updateDashboardStats(report, forecast) {
  const stats = {
    last_updated: new Date().toISOString(),
    
    // Phase 1: Decision tracking
    accuracy_24h: report.last_24h.accuracy,
    accuracy_7d: report.last_7d.accuracy,
    accuracy_all_time: report.all_time.accuracy,
    total_decisions: report.all_time.total,
    threshold: getAccuracyThreshold(),
    
    // Phase 2: Predictive metrics
    forecast: {
      queue_status: forecast.queue.willEmptySoon ? 'critical' : 'healthy',
      queue_empty_time: forecast.queue.estimatedEmptyTime,
      budget_status: forecast.budget.willExhaustToday ? 'warning' : 'healthy',
      budget_remaining: forecast.budget.remaining,
      velocity_trend: forecast.velocity.velocityTrend,
      tasks_per_day: forecast.velocity.tasksPerDay
    },
    
    recommendations: [
      ...report.recommendations,
      ...forecast.recommendations
    ],
    needs_attention: report.recommendations.some(r => r.priority === 'high') ||
                    forecast.recommendations.some(r => r.priority === 'high')
  };
  
  fs.writeFileSync(DASHBOARD_INJECT_FILE, JSON.stringify(stats, null, 2));
  return stats;
}

/**
 * Format enhanced report for Telegram/Discord
 */
function formatAlertMessage(report, forecast) {
  const threshold = getAccuracyThreshold();
  const accuracy24h = report.last_24h.accuracy;
  
  let message = '🤖 Daily Self-Review - Phase 2\n';
  message += '================================\n\n';
  
  // Decision accuracy
  if (accuracy24h < threshold) {
    message += `⚠️ ACCURACY: ${accuracy24h}% (below ${threshold}%)\n\n`;
  } else {
    message += `✅ ACCURACY: ${accuracy24h}%\n\n`;
  }
  
  // Forecast
  message += `📊 FORECAST:\n`;
  message += `  Queue: ${forecast.queue.willEmptySoon ? '⚠️ Empty in ' + forecast.queue.estimatedEmptyTime : '✅ Healthy'}\n`;
  message += `  Budget: ${forecast.budget.willExhaustToday ? '⚠️ Exhausts in ' + forecast.budget.estimatedExhaustion : '✅ $' + forecast.budget.remaining.toFixed(2) + ' remaining'}\n`;
  message += `  Velocity: ${forecast.velocity.tasksPerDay} tasks/day (${forecast.velocity.velocityTrend})\n\n`;
  
  // Recommendations
  const allRecs = [...report.recommendations, ...forecast.recommendations];
  if (allRecs.length > 0) {
    message += `💡 RECOMMENDATIONS:\n`;
    allRecs.slice(0, 3).forEach(rec => {
      const emoji = rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : 'ℹ️';
      message += `  ${emoji} ${rec.message}\n`;
    });
  }
  
  return message;
}

/**
 * Main review process - Phase 2 Enhanced
 */
async function runDailyReview() {
  console.log('🔍 Running Phase 2 Daily Self-Review...\n');
  
  // Phase 1: Decision accuracy
  const report = generateDailyReport();
  console.log('✅ Decision report generated');
  
  // Phase 2: Forecasting
  const forecast = await generateForecast();
  console.log('✅ Forecast generated');
  
  // Update dashboard
  const stats = updateDashboardStats(report, forecast);
  console.log('📊 Dashboard stats updated');
  
  // Check if alert needed
  const alertMessage = formatAlertMessage(report, forecast);
  const needsAlert = report.last_24h.accuracy < getAccuracyThreshold() ||
                     forecast.recommendations.some(r => r.priority === 'high');
  
  if (needsAlert) {
    console.log('\n🚨 ALERT:\n' + alertMessage);
    logAlert({
      type: 'daily_review_alert',
      message: alertMessage,
      accuracy: report.last_24h.accuracy,
      threshold: getAccuracyThreshold(),
      forecast_critical: forecast.recommendations.filter(r => r.priority === 'high').map(r => r.type)
    });
  } else {
    console.log('\n✅ All metrics within thresholds');
    console.log(alertMessage);
  }
  
  console.log('\n✅ Phase 2 Daily Self-Review complete');
  console.log(`Report: .orchestrator-daily-report.json`);
  console.log(`Stats: .dashboard-orchestrator-stats.json`);
  console.log(`Forecast: .latest-forecast.json`);
  
  return {
    report,
    forecast,
    stats,
    alert: needsAlert ? alertMessage : null
  };
}

// Run if called directly
if (require.main === module) {
  runDailyReview().catch(console.error);
}

module.exports = { runDailyReview, updateDashboardStats };
