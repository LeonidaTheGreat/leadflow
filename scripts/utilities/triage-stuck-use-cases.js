#!/usr/bin/env node
/**
 * triage-stuck-use-cases.js
 *
 * Analyzes use cases from the use_cases table in Supabase and generates
 * a disposition report for stuck (needs_merge, not_started, in_progress) use cases.
 *
 * This helps the PM determine which use cases are still needed vs. which
 * can be deprecated/archived.
 *
 * Usage:
 *   node scripts/utilities/triage-stuck-use-cases.js
 *   node scripts/utilities/triage-stuck-use-cases.js --format=json
 *   node scripts/utilities/triage-stuck-use-cases.js --status=needs_merge
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') })

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('[triage-stuck-use-cases] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// Statuses considered "stuck"
const STUCK_STATUSES = ['needs_merge', 'not_started', 'in_progress', 'stuck']

// Priority weights for sorting (higher = more important)
const PRIORITY_WEIGHTS = {
  'critical': 4,
  'high': 3,
  'medium': 2,
  'low': 1,
  '1': 4,
  '2': 3,
  '3': 2,
  '4': 1,
}

/**
 * Fetch all use cases from Supabase
 */
async function fetchUseCases() {
  const { data: useCases, error } = await supabase
    .from('use_cases')
    .select('*')
    .order('priority', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch use cases: ${error.message}`)
  }

  return useCases || []
}

/**
 * Categorize use cases by their status
 */
function categorizeUseCases(useCases) {
  const categories = {
    stuck: [],
    needs_merge: [],
    not_started: [],
    in_progress: [],
    complete: [],
    other: [],
  }

  for (const uc of useCases) {
    const status = (uc.implementation_status || 'unknown').toLowerCase()

    if (categories[status]) {
      categories[status].push(uc)
    } else {
      categories.other.push(uc)
    }
  }

  return categories
}

/**
 * Analyze a use case to determine if it's still needed
 */
function analyzeUseCase(uc) {
  const analysis = {
    id: uc.id,
    name: uc.name,
    status: uc.implementation_status,
    priority: uc.priority,
    phase: uc.phase,
    created_at: uc.created_at,
    updated_at: uc.updated_at,
    recommendation: null,
    reasoning: [],
    blockers: [],
  }

  // Check for age (use cases stuck for a long time)
  const updatedAt = new Date(uc.updated_at || uc.created_at)
  const daysSinceUpdate = Math.floor((Date.now() - updatedAt.getTime()) / (1000 * 60 * 60 * 24))

  if (daysSinceUpdate > 30) {
    analysis.reasoning.push(`Stale: No update in ${daysSinceUpdate} days`)
  }

  // Check for description quality
  const description = uc.description || ''
  if (description.length < 50) {
    analysis.reasoning.push('Poor spec: Description is too brief')
  }

  // Check for acceptance criteria
  const hasAC = description.toLowerCase().includes('acceptance criteria') ||
                description.toLowerCase().includes('ac-') ||
                (uc.acceptance_criteria && uc.acceptance_criteria.length > 0)

  if (!hasAC) {
    analysis.reasoning.push('No acceptance criteria defined')
  }

  // Determine recommendation
  if (analysis.status === 'needs_merge') {
    // Check if there's a branch that might have the fix
    analysis.recommendation = 'MERGE'
    analysis.reasoning.push('Code likely exists in a branch - verify and merge')
  } else if (analysis.status === 'in_progress') {
    if (daysSinceUpdate > 14) {
      analysis.recommendation = 'REVIEW'
      analysis.reasoning.push('In progress but stalled - needs review')
    } else {
      analysis.recommendation = 'CONTINUE'
      analysis.reasoning.push('Recently active - continue development')
    }
  } else if (analysis.status === 'not_started') {
    if (analysis.priority === 'critical' || analysis.priority === '1') {
      analysis.recommendation = 'START'
      analysis.reasoning.push('High priority - should be started')
    } else if (daysSinceUpdate > 60) {
      analysis.recommendation = 'DEPRECATE'
      analysis.reasoning.push('Low priority and stale - consider deprecating')
    } else {
      analysis.recommendation = 'BACKLOG'
      analysis.reasoning.push('Valid but not urgent - keep in backlog')
    }
  } else if (analysis.status === 'stuck') {
    analysis.recommendation = 'ESCALATE'
    analysis.reasoning.push('Blocked - needs PM/owner decision')
  }

  return analysis
}

/**
 * Generate a markdown report
 */
function generateMarkdownReport(categories, analyses) {
  const totalStuck = STUCK_STATUSES.reduce((sum, status) => sum + categories[status].length, 0)

  let report = `# Use Case Triage Report\n\n`
  report += `Generated: ${new Date().toISOString()}\n\n`
  report += `## Summary\n\n`
  report += `- **Total Use Cases:** ${Object.values(categories).flat().length}\n`
  report += `- **Stuck Use Cases:** ${totalStuck}\n`
  report += `  - needs_merge: ${categories.needs_merge.length}\n`
  report += `  - not_started: ${categories.not_started.length}\n`
  report += `  - in_progress: ${categories.in_progress.length}\n`
  report += `  - stuck: ${categories.stuck.length}\n`
  report += `- **Complete:** ${categories.complete.length}\n\n`

  // Recommendations summary
  const recommendationCounts = analyses.reduce((acc, a) => {
    acc[a.recommendation] = (acc[a.recommendation] || 0) + 1
    return acc
  }, {})

  report += `## Recommendations Summary\n\n`
  report += `| Recommendation | Count |\n`
  report += `|----------------|-------|\n`
  for (const [rec, count] of Object.entries(recommendationCounts).sort((a, b) => b[1] - a[1])) {
    report += `| ${rec} | ${count} |\n`
  }
  report += `\n`

  // Detailed analysis
  report += `## Detailed Analysis\n\n`

  const priorityOrder = ['START', 'MERGE', 'ESCALATE', 'REVIEW', 'CONTINUE', 'BACKLOG', 'DEPRECATE']

  for (const recommendation of priorityOrder) {
    const items = analyses.filter(a => a.recommendation === recommendation)
    if (items.length === 0) continue

    report += `### ${recommendation} (${items.length})\n\n`

    for (const item of items.sort((a, b) => (PRIORITY_WEIGHTS[b.priority] || 0) - (PRIORITY_WEIGHTS[a.priority] || 0))) {
      report += `#### ${item.name}\n`
      report += `- **ID:** ${item.id}\n`
      report += `- **Status:** ${item.status}\n`
      report += `- **Priority:** ${item.priority}\n`
      report += `- **Phase:** ${item.phase || 'N/A'}\n`
      report += `- **Reasoning:**\n`
      for (const reason of item.reasoning) {
        report += `  - ${reason}\n`
      }
      report += `\n`
    }
  }

  // Action items
  report += `## Recommended Actions\n\n`

  const startItems = analyses.filter(a => a.recommendation === 'START')
  if (startItems.length > 0) {
    report += `### Immediate Actions (START)\n\n`
    for (const item of startItems) {
      report += `- [ ] **${item.name}** (${item.priority} priority)\n`
    }
    report += `\n`
  }

  const mergeItems = analyses.filter(a => a.recommendation === 'MERGE')
  if (mergeItems.length > 0) {
    report += `### Merge Pending (MERGE)\n\n`
    for (const item of mergeItems) {
      report += `- [ ] **${item.name}** - Verify branch and merge to main\n`
    }
    report += `\n`
  }

  const escalateItems = analyses.filter(a => a.recommendation === 'ESCALATE')
  if (escalateItems.length > 0) {
    report += `### Needs PM Decision (ESCALATE)\n\n`
    for (const item of escalateItems) {
      report += `- [ ] **${item.name}** - ${item.reasoning[0]}\n`
    }
    report += `\n`
  }

  const deprecateItems = analyses.filter(a => a.recommendation === 'DEPRECATE')
  if (deprecateItems.length > 0) {
    report += `### Consider Deprecating\n\n`
    for (const item of deprecateItems) {
      report += `- [ ] **${item.name}** - Stale for >60 days, low priority\n`
    }
    report += `\n`
  }

  return report
}

/**
 * Main execution
 */
async function run() {
  const args = process.argv.slice(2)
  const format = args.find(a => a.startsWith('--format='))?.split('=')[1] || 'markdown'
  const filterStatus = args.find(a => a.startsWith('--status='))?.split('=')[1]

  console.log('[triage-stuck-use-cases] Fetching use cases from Supabase...')

  try {
    const useCases = await fetchUseCases()
    console.log(`[triage-stuck-use-cases] Found ${useCases.length} total use cases`)

    const categories = categorizeUseCases(useCases)
    const stuckUseCases = STUCK_STATUSES.flatMap(status => categories[status])

    console.log(`[triage-stuck-use-cases] Analyzing ${stuckUseCases.length} stuck use cases...`)

    let analyses = stuckUseCases.map(analyzeUseCase)

    if (filterStatus) {
      analyses = analyses.filter(a => a.status === filterStatus)
    }

    if (format === 'json') {
      console.log(JSON.stringify(analyses, null, 2))
    } else {
      const report = generateMarkdownReport(categories, analyses)

      // Write to file
      const reportPath = path.join(__dirname, '..', '..', 'docs', 'reports', 'USE_CASE_TRIAGE_REPORT.md')
      fs.writeFileSync(reportPath, report)
      console.log(`[triage-stuck-use-cases] Report written to ${reportPath}`)

      // Also print summary to console
      console.log('\n=== TRIAGE SUMMARY ===\n')
      console.log(`Total Use Cases: ${useCases.length}`)
      console.log(`Stuck Use Cases: ${stuckUseCases.length}`)
      console.log(`\nBreakdown:`)
      for (const status of STUCK_STATUSES) {
        console.log(`  ${status}: ${categories[status].length}`)
      }
      console.log(`\nRecommendations:`)
      const recCounts = analyses.reduce((acc, a) => {
        acc[a.recommendation] = (acc[a.recommendation] || 0) + 1
        return acc
      }, {})
      for (const [rec, count] of Object.entries(recCounts).sort((a, b) => b[1] - a[1])) {
        console.log(`  ${rec}: ${count}`)
      }
    }

    return { success: true, analyses }
  } catch (err) {
    console.error('[triage-stuck-use-cases] Error:', err.message)
    return { success: false, error: err.message }
  }
}

// Run standalone when executed directly
if (require.main === module) {
  run()
    .then((result) => {
      process.exit(result.success ? 0 : 1)
    })
    .catch((err) => {
      console.error('[triage-stuck-use-cases] Unexpected error:', err)
      process.exit(1)
    })
}

module.exports = { run, fetchUseCases, categorizeUseCases, analyzeUseCase }
