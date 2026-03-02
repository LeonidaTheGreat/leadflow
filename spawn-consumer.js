#!/usr/bin/env node
/**
 * spawn-consumer.js - Agent Spawn Consumer (4-Loop Architecture)
 *
 * Architecture docs: docs/4-LOOP-ARCHITECTURE.md
 *
 * Reads spawn-queue.json, fires off OpenClaw agent sessions (detached),
 * updates Supabase task status, and clears processed items.
 *
 * 4-Loop additions:
 * - Creates feature branches for dev/design agents (Loop 2: QC)
 * - Injects rich context: UC, chain history, retry info (Loop 1: Execution)
 * - QC agents receive PR review checklist (Loop 2: QC)
 */

require('dotenv').config({ path: require('path').join(__dirname, '.env') })
const { spawn, execSync } = require('child_process')
const fs = require('fs')
const path = require('path')
const { TaskStore } = require('./task-store')

const QUEUE_PATH = path.join(__dirname, 'spawn-queue.json')
const SPAWN_LOGS_DIR = path.join(__dirname, 'spawn-logs')
const store = new TaskStore()

// Map task agent_id values to OpenClaw agent names.
// Workflows use short names ('product', 'dev', 'qc') but OpenClaw may use
// different identifiers. This mapping lives at the spawn boundary so we don't
// need to change every workflow array or seed data row.
const AGENT_ID_MAP = {
  'product': 'product-manager'
  // All others (dev, qc, design, analytics, marketing) match exactly
}

function resolveAgentId(taskAgentId) {
  return AGENT_ID_MAP[taskAgentId] || taskAgentId
}

// Ensure spawn-logs directory exists
if (!fs.existsSync(SPAWN_LOGS_DIR)) {
  fs.mkdirSync(SPAWN_LOGS_DIR, { recursive: true })
}

function fireAndForget(agentId, message, sessionId) {
  return new Promise((resolve, reject) => {
    const args = ['agent', '--agent', agentId, '--message', message]
    if (sessionId) {
      args.push('--session-id', sessionId)
    }

    // Create log files for stdout/stderr capture
    const logPrefix = path.join(SPAWN_LOGS_DIR, `${agentId}-${sessionId}`)
    const stdoutPath = `${logPrefix}.stdout.log`
    const stderrPath = `${logPrefix}.stderr.log`

    const header = `# Agent: ${agentId} | Session: ${sessionId} | Started: ${new Date().toISOString()}\n`
    fs.writeFileSync(stdoutPath, header)
    fs.writeFileSync(stderrPath, header)

    const stdoutFd = fs.openSync(stdoutPath, 'a')
    const stderrFd = fs.openSync(stderrPath, 'a')

    const child = spawn('openclaw', args, {
      detached: true,
      stdio: ['ignore', stdoutFd, stderrFd]
    })
    child.unref()

    const pid = child.pid

    // Close FDs in parent — child inherits them
    fs.closeSync(stdoutFd)
    fs.closeSync(stderrFd)

    // Give it 2 seconds to start without error
    const timer = setTimeout(() => resolve({ pid, logPrefix }), 2000)

    child.on('error', (err) => {
      clearTimeout(timer)
      reject(err)
    })
  })
}

async function run() {
  if (!fs.existsSync(QUEUE_PATH)) {
    return { spawned: [], errors: [] }
  }

  let queue = []
  try {
    queue = JSON.parse(fs.readFileSync(QUEUE_PATH, 'utf-8'))
  } catch (err) {
    console.error('⚠️  Could not parse spawn-queue.json:', err.message)
    return { spawned: [], errors: [err.message] }
  }

  if (queue.length === 0) {
    return { spawned: [], errors: [] }
  }

  // Dedup by taskId
  const seen = new Set()
  const unique = queue.filter(item => {
    if (seen.has(item.taskId)) return false
    seen.add(item.taskId)
    return true
  })

  const spawned = []
  const errors = []
  const processed = new Set()

  for (const item of unique) {
    const { taskId, title, agentId, model } = item

    if (!agentId) {
      console.error(`⚠️  Skipping "${title}" — no agentId`)
      errors.push(`No agentId for task: ${title}`)
      processed.add(taskId)
      continue
    }

    try {
      console.log(`🚀 Spawning ${agentId} for: ${title}`)

      // Fetch full task details for richer context
      let taskDetail = null
      try { taskDetail = await store.getTask(taskId) } catch {}

      // UC status guard: skip if the use case is already complete
      if (taskDetail?.use_case_id && store.supabase) {
        try {
          const { data: uc } = await store.supabase
            .from('use_cases').select('implementation_status')
            .eq('id', taskDetail.use_case_id).single()
          if (uc?.implementation_status === 'complete') {
            console.log(`⏭️  Skipping "${title}" — ${taskDetail.use_case_id} already complete`)
            await store.updateTask(taskId, {
              status: 'done', completed_at: new Date().toISOString(),
              last_error: 'UC already complete at spawn time'
            })
            processed.add(taskId)
            continue
          }
        } catch {}
      }

      const sessionId = `lf-${taskId.slice(0, 8)}-${Date.now()}`

      // Build context-rich message
      let message = `You have been assigned a task.\n\nTask: ${title}\nTask ID: ${taskId}`
      if (taskDetail?.use_case_id) message += `\nUse Case: ${taskDetail.use_case_id}`
      // Inject dependency status so agents know what's already shipped
      if (taskDetail?.use_case_id && store.supabase) {
        try {
          const { data: uc } = await store.supabase
            .from('use_cases').select('depends_on').eq('id', taskDetail.use_case_id).single()
          if (uc?.depends_on?.length > 0) {
            const { data: deps } = await store.supabase
              .from('use_cases').select('id, name, implementation_status')
              .in('id', uc.depends_on)
            if (deps?.length > 0) {
              message += `\n\n## Dependency Status`
              for (const d of deps) {
                const icon = d.implementation_status === 'complete' ? '✅' : '⏳'
                message += `\n${icon} ${d.id} (${d.name}): ${d.implementation_status.toUpperCase()}`
              }
              const allDone = deps.every(d => d.implementation_status === 'complete')
              if (allDone) message += `\nAll dependencies are COMPLETE. You may proceed without blockers.`
            }
          }
        } catch (depErr) {
          console.warn(`   ⚠️ Dependency context injection failed (non-fatal): ${depErr.message}`)
        }
      }
      if (taskDetail?.description) message += `\n\nDescription:\n${taskDetail.description}`
      if (taskDetail?.metadata?.chain_from) message += `\n\nThis continues from prior task ${taskDetail.metadata.chain_from}.`
      if (taskDetail?.metadata?.workflow_step != null) message += `\nWorkflow step: ${taskDetail.metadata.workflow_step + 1}/${taskDetail.metadata.workflow_total || '?'}`
      if (taskDetail?.retry_count > 0) message += `\n\n⚠️ This is retry #${taskDetail.retry_count}. Previous error: ${taskDetail.last_error || 'unknown'}`

      // Inject failure patterns from learning system so agents avoid repeating mistakes
      try {
        const { LearningSystem } = require('./learning-system')
        const learning = new LearningSystem()
        const recs = learning.getRecommendations(taskDetail || { title, id: taskId })

        // Also scan recent failures for tasks with similar titles or types
        const taskType = learning.classifyTaskType(taskDetail || { title })
        const recentFailures = (learning.learnings.taskOutcomes || [])
          .filter(o => !o.success && o.taskType === taskType)
          .slice(-5)

        if (recentFailures.length > 0 || recs.length > 0) {
          message += `\n\n## ⚠️ FAILURE PATTERNS — READ BEFORE STARTING`
          message += `\nThe learning system has recorded these issues for similar tasks:`
          for (const f of recentFailures) {
            message += `\n- **${f.failureReason || 'unknown'}**: ${f.title} (${f.timestamp?.slice(0, 10) || 'recent'})`
          }
          for (const r of recs) {
            message += `\n- **${r.type}**: ${r.reason}`
          }
          message += `\n\n**CRITICAL RULES based on past failures:**`
          message += `\n- You MUST execute commands directly — do NOT create scripts and leave them unrun`
          message += `\n- You MUST verify your work actually took effect (check output, hit URLs, read logs)`
          message += `\n- If a previous attempt failed, explain what you are doing differently this time`
        }
      } catch (learnErr) {
        // Non-fatal: learning context is advisory
        console.warn(`   ⚠️ Learning context injection failed (non-fatal): ${learnErr.message}`)
      }

      // Inject completed work context so agent knows what to skip
      if (taskDetail?.use_case_id) {
        try {
          const relatedWork = await store.getRelatedCompletedWork(
            taskDetail.use_case_id, taskDetail.tags || []
          )
          if (relatedWork.length > 0) {
            message += `\n\n## ALREADY COMPLETED WORK — DO NOT RE-IMPLEMENT`
            message += `\nThe following is already done for ${taskDetail.use_case_id}:`
            for (const item of relatedWork.slice(0, 15)) {
              message += `\n- **${item.name}**`
              if (item.description) message += `: ${item.description.slice(0, 120)}`
            }
            message += `\n\nFocus ONLY on genuinely new work not covered above.`
            message += `\nIf ALL work is already done, report success immediately.`
          }
        } catch (cwErr) {
          console.warn(`   ⚠️ Completed work context injection failed (non-fatal): ${cwErr.message}`)
        }
      }

      message += `\n\nCheck the project task store for full details. Execute the task, update status when done.`
      message += `\n\nWhen finished, write a completion report:\n  const { reportSuccess, reportFailure } = require('./subagent-completion-report');\n  reportSuccess('${taskId}', testResults, filesCreated, filesModified, reportPath);`

      // Branch-based dev workflow: create feature branch for dev/design agents
      const projectDir = path.join(__dirname)
      if (['dev', 'design'].includes(agentId)) {
        try {
          const sanitizedTitle = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)
          const branchName = `${agentId}/${taskId.slice(0, 8)}-${sanitizedTitle}`
          try {
            execSync(`git checkout -b ${branchName}`, { cwd: projectDir, stdio: 'pipe' })
            console.log(`   🌿 Created branch: ${branchName}`)
          } catch {
            // Branch already exists (re-spawn) — check it out instead
            execSync(`git checkout ${branchName}`, { cwd: projectDir, stdio: 'pipe' })
            console.log(`   🌿 Checked out existing branch: ${branchName}`)
          }
          await store.updateTask(taskId, { branch_name: branchName })
          message += `\n\n## Git Workflow`
          message += `\nYou are working on branch: \`${branchName}\``
          message += `\n- Work ONLY on this branch — never checkout main or create new branches`
          message += `\n- Commit often with descriptive messages (feat:, fix:, test:, docs: prefixes)`
          message += `\n- When done: \`git push -u origin ${branchName}\``
          message += `\n- Do NOT create PRs — the orchestrator handles that after you push`
          message += `\n- Do NOT merge anything — PRs are merged automatically after QC approval`
        } catch (branchErr) {
          console.warn(`   ⚠️ Branch creation failed: ${branchErr.message}`)
        }
      }

      // QC agent: include PR context if available
      if (agentId === 'qc' && taskDetail?.pr_number) {
        message += `\nReview PR #${taskDetail.pr_number} on branch ${taskDetail.branch_name || 'unknown'}.`
        message += `\nYour review checklist:`
        message += `\n1. Run \`npm test\` — all tests must pass`
        message += `\n2. Run \`npx eslint . --max-warnings 0\` — no errors`
        message += `\n3. Check for security issues (no hardcoded secrets, no SQL injection, no XSS)`
        message += `\n4. Verify acceptance criteria are met`
        message += `\n5. Use \`gh pr review ${taskDetail.pr_number} --approve\` or \`--request-changes\``
        message += `\nReport results as structured JSON in your completion.`
      }

      const openclawAgentId = resolveAgentId(agentId)
      const result = await fireAndForget(openclawAgentId, message, sessionId)
      const pid = result.pid
      const logPrefix = result.logPrefix

      // Mark in_progress in Supabase with spawn metadata
      const spawnConfig = {
        pid: pid || null,
        session_key: sessionId,
        spawned_at: new Date().toISOString(),
        agent_id: agentId,
        model: model || 'qwen3.5',
        log_prefix: logPrefix || null,
        spawn_status: 'spawned'
      }

      try {
        await store.updateTask(taskId, {
          status: 'in_progress',
          started_at: new Date().toISOString(),
          spawn_config: spawnConfig,
          session_key: sessionId
        })
      } catch (dbErr) {
        // Non-fatal: heartbeat-executor already set in_progress before queuing
        console.warn(`   ⚠️  Status update skipped (already in_progress): ${dbErr.message}`)
      }

      console.log(`   ✓ Fired ${agentId} for: ${title} (PID: ${pid || 'unknown'})`)
      spawned.push({ taskId, title, agentId, model, pid })
      processed.add(taskId)

    } catch (err) {
      console.error(`   ✗ Failed to spawn ${agentId} for "${title}": ${err.message}`)
      errors.push(`Spawn failed for "${title}": ${err.message}`)
      processed.add(taskId)
    }
  }

  // Remove processed items from queue
  const remaining = queue.filter(item => !processed.has(item.taskId))
  fs.writeFileSync(QUEUE_PATH, JSON.stringify(remaining, null, 2))

  // Rotate spawn logs older than 7 days
  try {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000
    const logFiles = fs.readdirSync(SPAWN_LOGS_DIR)
    for (const file of logFiles) {
      const filePath = path.join(SPAWN_LOGS_DIR, file)
      const stat = fs.statSync(filePath)
      if (stat.mtimeMs < cutoff) {
        fs.unlinkSync(filePath)
      }
    }
  } catch (rotErr) {
    // Non-fatal: log rotation failure shouldn't block spawning
    console.warn('⚠️  Log rotation error:', rotErr.message)
  }

  return { spawned, errors }
}

if (require.main === module) {
  run().then(result => {
    console.log(`\nSpawn consumer done: ${result.spawned.length} spawned, ${result.errors.length} errors`)
    process.exit(0)
  })
} else {
  module.exports = { run }
}
