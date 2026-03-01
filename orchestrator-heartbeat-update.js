#!/usr/bin/env node

/**
 * orchestrator-heartbeat-update.js
 * 
 * Called by the orchestrator agent to update its heartbeat timestamp.
 * This allows the watchdog to verify the orchestrator is alive.
 * 
 * Usage (from orchestrator agent):
 *   node orchestrator-heartbeat-update.js
 * 
 * Or include in your heartbeat loop:
 *   execSync('node orchestrator-heartbeat-update.js')
 */

const fs = require('fs');
const path = require('path');

const HEARTBEAT_FILE = path.join(process.cwd(), '.orchestrator-heartbeat');
const LOG_FILE = path.join(process.cwd(), 'orchestrator.log');

// Update heartbeat timestamp
const timestamp = Math.floor(Date.now() / 1000);
fs.writeFileSync(HEARTBEAT_FILE, timestamp.toString());

// Also append to log
const logEntry = `[${new Date().toISOString()}] Heartbeat ${timestamp}\n`;
fs.appendFileSync(LOG_FILE, logEntry);

console.log(`💓 Heartbeat updated: ${new Date().toISOString()}`);
