#!/usr/bin/env node
/**
 * Dashboard Auto-Sync
 * 
 * Keeps dashboard.html in sync with DASHBOARD.md
 * Runs via cron or heartbeat to ensure HTML always reflects current state
 * 
 * Usage:
 *   node scripts/sync-dashboard-html.js
 *   
 * Add to crontab:
 *   */5 * * * * cd ~/bo2026 && node scripts/sync-dashboard-html.js
 */

const fs = require('fs')
const path = require('path')

// Configuration
const CONFIG = {
  dashboardMdPath: path.join(process.cwd(), 'DASHBOARD.md'),
  dashboardHtmlPath: path.join(process.cwd(), 'dashboard.html'),
  backupDir: path.join(process.cwd(), '.backups'),
  maxBackups: 10,
}

// Parse DASHBOARD.md and extract key data
function parseDashboardMd(content) {
  const data = {
    lastUpdated: extractPattern(content, /\*\*Last Updated:\*\* (.+?)\n/),
    day: extractPattern(content, /\*\*Current Day:\*\* (\d+) of 60/),
    status: extractPattern(content, /\*\*Status:\*\* (.+?)\n/),
    mrr: extractPattern(content, /\| \*\*MRR\*\* \| (.+?) \|/),
    pilots: extractPattern(content, /\| \*\*Pilot Agents\*\* \| (.+?) \|/),
    blockers: extractPattern(content, /\| \*\*Blockers\*\* \| (.+?) \|/),
    systems: [],
    phases: [],
    milestones: [],
    features: [],
    nextSteps: [],
  }

  // Extract system status table
  const systemMatch = content.match(/\| Component \| Status \| Details \|[\s\S]*?(?=\n\n|\n##)/)
  if (systemMatch) {
    const lines = systemMatch[0].split('\n').slice(2) // Skip header
    data.systems = lines
      .filter(l => l.startsWith('|'))
      .map(l => {
        const parts = l.split('|').map(p => p.trim()).filter(p => p)
        return { name: parts[0], status: parts[1], details: parts[2] }
      })
      .filter(s => s.name && s.name !== '---')
  }

  // Extract milestones
  const milestoneMatch = content.match(/\| Milestone \| Date \| Criteria \| Status \|[\s\S]*?(?=\n\n|\n##)/)
  if (milestoneMatch) {
    const lines = milestoneMatch[0].split('\n').slice(2)
    data.milestones = lines
      .filter(l => l.startsWith('|'))
      .map(l => {
        const parts = l.split('|').map(p => p.trim()).filter(p => p)
        return { name: parts[0], date: parts[1], criteria: parts[2], status: parts[3] }
      })
      .filter(m => m.name && m.name !== '---')
  }

  // Extract phases
  const phaseMatches = content.matchAll(/### (Phase \d+:[^\n]+)\n\| Task \| Priority \| Status \| Owner \| Est\. Time \| Unblocks \|[\s\S]*?(?=\n### |\n## |$)/g)
  for (const match of phaseMatches) {
    const phaseName = match[1].trim()
    const phaseContent = match[0]
    
    const taskLines = phaseContent.split('\n').slice(2)
    const tasks = taskLines
      .filter(l => l.startsWith('|'))
      .map(l => {
        const parts = l.split('|').map(p => p.trim()).filter(p => p)
        return { 
          name: parts[0], 
          priority: parts[1], 
          status: parts[2], 
          owner: parts[3],
          time: parts[4],
          unblocks: parts[5]
        }
      })
      .filter(t => t.name && t.name !== '---' && !t.name.includes('Task'))

    data.phases.push({ name: phaseName, tasks })
  }

  return data
}

function extractPattern(content, pattern) {
  const match = content.match(pattern)
  return match ? match[1].trim() : null
}

// Generate updated HTML from parsed data
function generateHtml(data) {
  // Read the current HTML template
  let html = fs.readFileSync(CONFIG.dashboardHtmlPath, 'utf-8')
  
  // Update timestamp
  html = html.replace(
    /Last updated: .+? •/,
    `Last updated: ${data.lastUpdated || new Date().toLocaleString()} •`
  )
  
  // Update day counter
  if (data.day) {
    html = html.replace(
      /Day <span class="ok">\d+<\/span> of 60/,
      `Day <span class="ok">${data.day}</span> of 60`
    )
  }
  
  // Update status
  if (data.status) {
    const statusClass = data.status.includes('READY') ? 'ok' : 
                       data.status.includes('PROGRESS') ? 'warn' : 'bad'
    html = html.replace(
      /<span class="(ok|warn|bad)">● .+?<\/span>/,
      `<span class="${statusClass}">● ${data.status.replace('● ', '')}</span>`
    )
  }
  
  // Update KPI cards
  if (data.pilots) {
    html = html.replace(
      /<div class="kpi">0 \/ 5<\/div>/,
      `<div class="kpi">${data.pilots}</div>`
    )
  }
  
  if (data.blockers) {
    const blockerCount = data.blockers.match(/\d+/)?.[0] || '0'
    html = html.replace(
      /<div class="kpi ok">\d+<\/div>\s+<div class="muted">All cleared/,
      `<div class="kpi ${blockerCount === '0' ? 'ok' : 'bad'}">${blockerCount}</div>\n        <div class="muted">${blockerCount === '0' ? 'All cleared ✅' : 'Active blockers'}`
    )
  }
  
  // Update sync time in footer
  html = html.replace(
    /<span id="syncTime">.+?<\/span>/,
    `<span id="syncTime">Last sync: ${new Date().toLocaleString()}</span>`
  )
  
  return html
}

// Create backup before making changes
function createBackup() {
  if (!fs.existsSync(CONFIG.backupDir)) {
    fs.mkdirSync(CONFIG.backupDir, { recursive: true })
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupPath = path.join(CONFIG.backupDir, `dashboard-${timestamp}.html`)
  
  fs.copyFileSync(CONFIG.dashboardHtmlPath, backupPath)
  
  // Clean up old backups
  const backups = fs.readdirSync(CONFIG.backupDir)
    .filter(f => f.startsWith('dashboard-'))
    .map(f => ({
      name: f,
      path: path.join(CONFIG.backupDir, f),
      time: fs.statSync(path.join(CONFIG.backupDir, f)).mtime
    }))
    .sort((a, b) => b.time - a.time)
  
  if (backups.length > CONFIG.maxBackups) {
    backups.slice(CONFIG.maxBackups).forEach(b => {
      fs.unlinkSync(b.path)
    })
  }
  
  return backupPath
}

// Main sync function
function syncDashboard() {
  console.log('🔄 Dashboard Auto-Sync')
  console.log('=====================\n')
  
  // Check if DASHBOARD.md exists
  if (!fs.existsSync(CONFIG.dashboardMdPath)) {
    console.error('❌ DASHBOARD.md not found')
    process.exit(1)
  }
  
  // Check if dashboard.html exists
  if (!fs.existsSync(CONFIG.dashboardHtmlPath)) {
    console.error('❌ dashboard.html not found')
    process.exit(1)
  }
  
  // Read and parse DASHBOARD.md
  console.log('📄 Reading DASHBOARD.md...')
  const mdContent = fs.readFileSync(CONFIG.dashboardMdPath, 'utf-8')
  const data = parseDashboardMd(mdContent)
  
  console.log('✅ Parsed data:')
  console.log(`   - Day: ${data.day}`)
  console.log(`   - Status: ${data.status}`)
  console.log(`   - Systems: ${data.systems.length}`)
  console.log(`   - Phases: ${data.phases.length}`)
  console.log(`   - Milestones: ${data.milestones.length}`)
  
  // Create backup
  console.log('\n💾 Creating backup...')
  const backupPath = createBackup()
  console.log(`   Saved: ${path.basename(backupPath)}`)
  
  // Generate updated HTML
  console.log('\n📝 Generating updated HTML...')
  const updatedHtml = generateHtml(data)
  
  // Write updated HTML
  fs.writeFileSync(CONFIG.dashboardHtmlPath, updatedHtml)
  console.log('   ✅ dashboard.html updated')
  
  // Summary
  console.log('\n=====================')
  console.log('✅ Sync complete!')
  console.log(`   Updated: ${new Date().toLocaleString()}`)
  console.log(`   Backup: ${path.basename(backupPath)}`)
  console.log(`   Next: HTML will auto-refresh in browser`)
}

// Run sync
syncDashboard()
