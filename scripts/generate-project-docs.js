#!/usr/bin/env node
/**
 * Generate Project Docs from Supabase
 *
 * Auto-generates USE_CASES.md, E2E_MAPPINGS.md, and PRD_INDEX.md
 * from the Supabase tables (use_cases, e2e_test_specs, prds).
 *
 * Called every heartbeat by heartbeat-executor.js.
 * Can also be run standalone: node scripts/generate-project-docs.js
 */

const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

// Load env from project root
require('dotenv').config({ path: path.join(__dirname, '..', '.env') })

const PROJECT_DIR = path.join(__dirname, '..')
const HEADER = '<!-- AUTO-GENERATED — DO NOT EDIT. Regenerated every heartbeat from Supabase. -->'

function getSupabase() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

// ── USE_CASES.md ──────────────────────────────────────────────

async function generateUseCases(sb) {
  const { data: ucs, error: ucErr } = await sb
    .from('use_cases').select('*, prds(title)')
    .order('priority', { ascending: true })
  if (ucErr) throw ucErr

  const AGENT_LABELS = { product: 'PM', dev: 'Dev', design: 'Design', qc: 'QC', analytics: 'Analytics', marketing: 'Marketing' }
  const total = ucs.length
  const complete = ucs.filter(u => u.implementation_status === 'complete').length

  let md = `${HEADER}\n`
  md += `# Use Cases\n\n`
  md += `> Generated: ${new Date().toISOString()} | Source: \`use_cases\` + \`prds\` tables\n\n`
  md += `**Progress: ${complete}/${total} complete**\n\n`

  // Summary table
  md += `| UC | Name | Phase | Status | Priority | E2E | Workflow |\n`
  md += `|----|------|-------|--------|----------|-----|----------|\n`
  for (const uc of ucs) {
    const e2e = uc.e2e_tests_passing ? 'pass' : uc.e2e_tests_defined ? 'defined' : '-'
    const workflow = (uc.workflow || []).map(a => AGENT_LABELS[a] || a).join(' > ')
    md += `| ${uc.id} | ${uc.name} | ${uc.phase || '-'} | ${uc.implementation_status} | ${uc.priority} | ${e2e} | ${workflow} |\n`
  }

  // Group by phase
  const phases = {}
  for (const uc of ucs) {
    const phase = uc.phase || 'Unassigned'
    if (!phases[phase]) phases[phase] = []
    phases[phase].push(uc)
  }

  for (const [phase, items] of Object.entries(phases)) {
    md += `\n## Phase: ${phase}\n\n`
    for (const uc of items) {
      md += `### ${uc.id} — ${uc.name}\n\n`
      md += `- **PRD:** ${uc.prds?.title || uc.prd_id || '-'}\n`
      md += `- **Status:** ${uc.implementation_status}\n`
      md += `- **Priority:** ${uc.priority}\n`
      if (uc.description) md += `- **Description:** ${uc.description}\n`
      if (uc.acceptance_criteria && Object.keys(uc.acceptance_criteria).length > 0) {
        md += `- **Acceptance Criteria:**\n`
        const criteria = Array.isArray(uc.acceptance_criteria) ? uc.acceptance_criteria : [uc.acceptance_criteria]
        for (const c of criteria) {
          md += `  - ${typeof c === 'string' ? c : JSON.stringify(c)}\n`
        }
      }
      if (uc.depends_on && uc.depends_on.length > 0) {
        md += `- **Depends on:** ${uc.depends_on.join(', ')}\n`
      }
      const workflow = (uc.workflow || []).map(a => AGENT_LABELS[a] || a).join(' > ')
      md += `- **Workflow:** ${workflow}\n`
      md += `\n`
    }
  }

  fs.writeFileSync(path.join(PROJECT_DIR, 'USE_CASES.md'), md)
  console.log(`   ✅ USE_CASES.md generated (${total} use cases)`)
}

// ── E2E_MAPPINGS.md ───────────────────────────────────────────

async function generateE2EMappings(sb) {
  const { data: specs, error: specErr } = await sb
    .from('e2e_test_specs').select('*, use_cases(id, name)')
    .order('use_case_id', { ascending: true })
  if (specErr) throw specErr

  const pass = specs.filter(s => s.last_result === 'pass').length
  const fail = specs.filter(s => s.last_result === 'fail').length
  const notRun = specs.filter(s => s.last_result === 'not_run' || !s.last_result).length
  const total = specs.length

  let md = `${HEADER}\n`
  md += `# E2E Test Mappings\n\n`
  md += `> Generated: ${new Date().toISOString()} | Source: \`e2e_test_specs\` + \`use_cases\` tables\n\n`
  md += `**Coverage: ${total} specs | ${pass} pass | ${fail} fail | ${notRun} not run**\n\n`

  // Summary table
  md += `| UC | Test Name | File | Last Run | Result |\n`
  md += `|----|-----------|------|----------|--------|\n`
  for (const spec of specs) {
    const ucId = spec.use_cases?.id || spec.use_case_id || '-'
    const lastRun = spec.last_run ? new Date(spec.last_run).toISOString().split('T')[0] : '-'
    const result = spec.last_result || 'not_run'
    md += `| ${ucId} | ${spec.test_name} | ${spec.test_file || '-'} | ${lastRun} | ${result} |\n`
  }

  // Group by UC
  const byUC = {}
  for (const spec of specs) {
    const ucId = spec.use_cases?.id || spec.use_case_id || 'unlinked'
    if (!byUC[ucId]) byUC[ucId] = { name: spec.use_cases?.name || ucId, specs: [] }
    byUC[ucId].specs.push(spec)
  }

  for (const [ucId, group] of Object.entries(byUC)) {
    md += `\n## ${ucId} — ${group.name}\n\n`
    for (const spec of group.specs) {
      md += `### ${spec.test_name}\n\n`
      if (spec.test_file) md += `- **File:** \`${spec.test_file}\`\n`
      md += `- **Result:** ${spec.last_result || 'not_run'}\n`
      if (spec.last_run) md += `- **Last run:** ${new Date(spec.last_run).toISOString()}\n`
      if (spec.assertions) {
        md += `- **Assertions:**\n\`\`\`json\n${JSON.stringify(spec.assertions, null, 2)}\n\`\`\`\n`
      }
      md += `\n`
    }
  }

  fs.writeFileSync(path.join(PROJECT_DIR, 'E2E_MAPPINGS.md'), md)
  console.log(`   ✅ E2E_MAPPINGS.md generated (${total} specs)`)
}

// ── PRD_INDEX.md ──────────────────────────────────────────────

async function generatePRDIndex(sb) {
  const { data: prds, error: prdErr } = await sb
    .from('prds').select('*')
    .order('id', { ascending: true })
  if (prdErr) throw prdErr

  let md = `${HEADER}\n`
  md += `# PRD Index\n\n`
  md += `> Generated: ${new Date().toISOString()} | Source: \`prds\` table\n\n`
  md += `| PRD ID | Title | Status | Version | File Path |\n`
  md += `|--------|-------|--------|---------|----------|\n`
  for (const prd of prds) {
    const filePath = prd.file_path ? `[${prd.file_path}](${prd.file_path})` : '-'
    md += `| ${prd.id} | ${prd.title} | ${prd.status} | ${prd.version || '-'} | ${filePath} |\n`
  }

  md += `\n> Full PRD documents (PRD-*.md) are agent-authored. Update the \`prds\` table when creating or modifying them.\n`

  fs.writeFileSync(path.join(PROJECT_DIR, 'PRD_INDEX.md'), md)
  console.log(`   ✅ PRD_INDEX.md generated (${prds.length} PRDs)`)
}

// ── Main entry point ──────────────────────────────────────────

async function generateProjectDocs() {
  const sb = getSupabase()
  await generateUseCases(sb)
  await generateE2EMappings(sb)
  await generatePRDIndex(sb)
}

// CLI mode
if (require.main === module) {
  generateProjectDocs()
    .then(() => console.log('Done.'))
    .catch(err => { console.error('Error:', err.message); process.exit(1) })
}

module.exports = { generateProjectDocs }
