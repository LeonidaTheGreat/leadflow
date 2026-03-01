#!/usr/bin/env node
/**
 * Orchestrator Decision Tracker - Phase 1 Implementation
 * 
 * Tracks the orchestrator's own decisions and their outcomes
 * to enable self-improvement and accuracy measurement.
 * 
 * Commands:
 *   node orchestrator-decision-tracker.js --record-decision <json>
 *   node orchestrator-decision-tracker.js --analyze [date]
 *   node orchestrator-decision-tracker.js --accuracy
 *   node orchestrator-decision-tracker.js --recommend <task-id>
 */

const fs = require('fs');
const path = require('path');

const DECISION_LOG = path.join(process.cwd(), '.orchestrator-decisions.jsonl');
const ACCURACY_CONFIG = path.join(process.cwd(), '.orchestrator-accuracy.json');
const DAILY_REPORT = path.join(process.cwd(), '.orchestrator-daily-report.json');

// Default accuracy threshold (can be changed via !accuracy command)
const DEFAULT_ACCURACY_THRESHOLD = 70;

// Decision types we track
const DECISION_TYPES = {
  MODEL_SELECTION: 'model_selection',
  DECOMPOSITION_TIMING: 'decomposition_timing',
  SPAWN_TIMING: 'spawn_timing',
  BUDGET_ALLOCATION: 'budget_allocation',
  ESCALATION_DECISION: 'escalation_decision'
};

/**
 * Load accuracy configuration
 */
function loadAccuracyConfig() {
  try {
    if (fs.existsSync(ACCURACY_CONFIG)) {
      return JSON.parse(fs.readFileSync(ACCURACY_CONFIG, 'utf-8'));
    }
  } catch (e) {
    console.error('Error loading accuracy config:', e.message);
  }
  return {
    threshold: DEFAULT_ACCURACY_THRESHOLD,
    updated_at: new Date().toISOString(),
    updated_by: 'system'
  };
}

/**
 * Save accuracy configuration
 */
function saveAccuracyConfig(config) {
  fs.writeFileSync(ACCURACY_CONFIG, JSON.stringify(config, null, 2));
}

/**
 * Record a decision made by the orchestrator
 */
function recordDecision(decision) {
  const entry = {
    timestamp: new Date().toISOString(),
    ...decision,
    outcome_recorded: false
  };
  
  fs.appendFileSync(DECISION_LOG, JSON.stringify(entry) + '\n');
  return entry;
}

/**
 * Record the outcome of a previous decision
 */
function recordOutcome(taskId, outcome) {
  if (!fs.existsSync(DECISION_LOG)) {
    return false;
  }
  
  const lines = fs.readFileSync(DECISION_LOG, 'utf-8')
    .trim()
    .split('\n')
    .filter(line => line.trim());
  
  let updated = false;
  const updatedLines = lines.map(line => {
    const entry = JSON.parse(line);
    if (entry.task_id === taskId && !entry.outcome_recorded) {
      entry.outcome = outcome;
      entry.outcome_recorded = true;
      entry.outcome_timestamp = new Date().toISOString();
      updated = true;
    }
    return JSON.stringify(entry);
  });
  
  if (updated) {
    fs.writeFileSync(DECISION_LOG, updatedLines.join('\n') + '\n');
  }
  
  return updated;
}

/**
 * Calculate decision accuracy for a given period
 */
function calculateAccuracy(since = null) {
  if (!fs.existsSync(DECISION_LOG)) {
    return {
      total: 0,
      correct: 0,
      incorrect: 0,
      accuracy: 0,
      by_type: {}
    };
  }
  
  const lines = fs.readFileSync(DECISION_LOG, 'utf-8')
    .trim()
    .split('\n')
    .filter(line => line.trim())
    .map(line => JSON.parse(line));
  
  const cutoff = since ? new Date(since) : null;
  
  const decisions = lines.filter(d => {
    if (!d.outcome_recorded) return false;
    if (cutoff && new Date(d.timestamp) < cutoff) return false;
    return true;
  });
  
  const correct = decisions.filter(d => d.outcome === 'correct');
  const incorrect = decisions.filter(d => d.outcome === 'incorrect');
  
  // Group by decision type
  const byType = {};
  decisions.forEach(d => {
    const type = d.decision_type || 'unknown';
    if (!byType[type]) {
      byType[type] = { total: 0, correct: 0, incorrect: 0 };
    }
    byType[type].total++;
    if (d.outcome === 'correct') {
      byType[type].correct++;
    } else {
      byType[type].incorrect++;
    }
  });
  
  // Calculate accuracy per type
  Object.keys(byType).forEach(type => {
    const t = byType[type];
    t.accuracy = t.total > 0 ? Math.round((t.correct / t.total) * 100) : 0;
  });
  
  return {
    total: decisions.length,
    correct: correct.length,
    incorrect: incorrect.length,
    accuracy: decisions.length > 0 ? Math.round((correct.length / decisions.length) * 100) : 0,
    by_type: byType,
    period_start: since || 'all time',
    period_end: new Date().toISOString()
  };
}

/**
 * Generate daily report
 */
function generateDailyReport() {
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  const report = {
    date: today,
    generated_at: new Date().toISOString(),
    last_24h: calculateAccuracy(yesterday),
    last_7d: calculateAccuracy(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
    all_time: calculateAccuracy(),
    recommendations: generateRecommendations()
  };
  
  fs.writeFileSync(DAILY_REPORT, JSON.stringify(report, null, 2));
  return report;
}

/**
 * Generate recommendations based on accuracy patterns
 */
function generateRecommendations() {
  const accuracy = calculateAccuracy();
  const config = loadAccuracyConfig();
  const recommendations = [];
  
  if (accuracy.accuracy < config.threshold) {
    recommendations.push({
      type: 'alert',
      priority: 'high',
      message: `Decision accuracy (${accuracy.accuracy}%) below threshold (${config.threshold}%)`,
      action: 'Review recent decisions and consider more conservative model selection'
    });
  }
  
  // Check by type
  Object.entries(accuracy.by_type).forEach(([type, stats]) => {
    if (stats.accuracy < 60) {
      recommendations.push({
        type: 'improvement',
        priority: 'medium',
        message: `${type} decisions have ${stats.accuracy}% accuracy`,
        action: `Consider reviewing ${type} decision logic`
      });
    }
  });
  
  return recommendations;
}

/**
 * Format accuracy for display
 */
function formatAccuracy(accuracy) {
  const config = loadAccuracyConfig();
  const status = accuracy.accuracy >= config.threshold ? '✅' : '⚠️';
  
  let output = `
${status} Orchestrator Decision Accuracy
================================
Period: ${accuracy.period_start}
Total Decisions: ${accuracy.total}
Correct: ${accuracy.correct}
Incorrect: ${accuracy.incorrect}
Accuracy: ${accuracy.accuracy}% (threshold: ${config.threshold}%)

By Decision Type:
`;
  
  Object.entries(accuracy.by_type).forEach(([type, stats]) => {
    const typeStatus = stats.accuracy >= config.threshold ? '✓' : '✗';
    output += `  ${typeStatus} ${type}: ${stats.accuracy}% (${stats.correct}/${stats.total})\n`;
  });
  
  return output;
}

/**
 * Set accuracy threshold
 */
function setAccuracyThreshold(percent, updatedBy = 'user') {
  const config = loadAccuracyConfig();
  config.threshold = parseInt(percent, 10);
  config.updated_at = new Date().toISOString();
  config.updated_by = updatedBy;
  saveAccuracyConfig(config);
  return config;
}

/**
 * Get current accuracy threshold
 */
function getAccuracyThreshold() {
  return loadAccuracyConfig().threshold;
}

// CLI
const command = process.argv[2];

switch (command) {
  case '--record-decision':
    const decision = JSON.parse(process.argv[3]);
    recordDecision(decision);
    console.log('Decision recorded:', decision.decision_type);
    break;
    
  case '--record-outcome':
    const taskId = process.argv[3];
    const outcome = process.argv[4]; // 'correct' or 'incorrect'
    if (recordOutcome(taskId, outcome)) {
      console.log(`Outcome recorded for ${taskId}: ${outcome}`);
    } else {
      console.log(`No pending decision found for ${taskId}`);
    }
    break;
    
  case '--analyze':
    const since = process.argv[3];
    const accuracy = calculateAccuracy(since);
    console.log(formatAccuracy(accuracy));
    break;
    
  case '--accuracy':
    console.log(`Current accuracy threshold: ${getAccuracyThreshold()}%`);
    break;
    
  case '--set-threshold':
    const percent = process.argv[3];
    const newConfig = setAccuracyThreshold(percent, 'cli');
    console.log(`Accuracy threshold set to ${newConfig.threshold}%`);
    break;
    
  case '--daily-report':
    const report = generateDailyReport();
    console.log('Daily report generated:', DAILY_REPORT);
    console.log(JSON.stringify(report, null, 2));
    break;
    
  case '--recommend':
    const recs = generateRecommendations();
    console.log('Recommendations:', recs);
    break;
    
  default:
    console.log(`
Orchestrator Decision Tracker

Commands:
  --record-decision '<json>'   Record a decision
  --record-outcome <task-id> <correct|incorrect>
  --analyze [since-date]       Show accuracy stats
  --accuracy                   Show current threshold
  --set-threshold <percent>    Set accuracy threshold
  --daily-report               Generate daily report
  --recommend                  Get recommendations

Examples:
  node orchestrator-decision-tracker.js --record-decision '{"decision_type":"model_selection","task_id":"abc123","chosen_model":"kimi","recommended_model":"sonnet","task_type":"integration"}'
  
  node orchestrator-decision-tracker.js --record-outcome abc123 incorrect
  
  node orchestrator-decision-tracker.js --set-threshold 75
`);
}

// Export for use as module
module.exports = {
  recordDecision,
  recordOutcome,
  calculateAccuracy,
  generateDailyReport,
  setAccuracyThreshold,
  getAccuracyThreshold,
  generateRecommendations,
  DECISION_TYPES
};
