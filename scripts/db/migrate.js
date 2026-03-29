#!/usr/bin/env node
/**
 * Database Migration Runner
 *
 * Design decisions documented:
 *
 * 1. WHY a migration framework?
 *    80% of bugs in the March 27-28 session were column mismatches.
 *    Agents wrote code referencing columns that didn't exist because
 *    schema changes were ad-hoc ALTER TABLE commands with no tracking.
 *
 * 2. WHY this approach (not Prisma/Drizzle/Knex)?
 *    - We use raw PostgreSQL via PostgREST, not an ORM
 *    - Agents need to create migration files, not configure ORMs
 *    - Simple SQL up/down files are model-agnostic and agent-friendly
 *    - No dependencies beyond 'pg' (already installed)
 *
 * 3. WHY up/down?
 *    Without rollback, a bad migration requires manual SQL to fix.
 *    Down migrations let the genome auto-revert a bad schema change.
 *
 * 4. WHY sequential numbering?
 *    Timestamps (20260329_...) cause merge conflicts when 2 agents
 *    create migrations concurrently. Sequential numbers (001, 002...)
 *    force serialization — agents must check the latest number.
 *
 * Usage:
 *   node scripts/db/migrate.js                    # Run pending migrations
 *   node scripts/db/migrate.js --status           # Show migration status
 *   node scripts/db/migrate.js --rollback         # Rollback last migration
 *   node scripts/db/migrate.js --rollback-to 003  # Rollback to version 003
 *   node scripts/db/migrate.js --create "add_utm_columns"  # Create new migration
 *   node scripts/db/migrate.js --verify           # Verify schema matches code
 */

const { Pool } = require('pg')
const fs = require('fs')
const path = require('path')

const PG_URL = process.env.LOCAL_PG_URL || 'postgresql://clawdbot@localhost/openclaw'
const MIGRATIONS_DIR = path.join(__dirname, '..', '..', 'migrations')
const pool = new Pool({ connectionString: PG_URL, max: 1 })

async function ensureTrackingTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TIMESTAMPTZ DEFAULT NOW(),
      rolled_back_at TIMESTAMPTZ,
      checksum TEXT
    )
  `)
}

function getMigrationFiles() {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    fs.mkdirSync(MIGRATIONS_DIR, { recursive: true })
    return []
  }

  return fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.match(/^\d{3}_.*\.sql$/))
    .sort()
    .map(f => {
      const version = f.slice(0, 3)
      const name = f.slice(4).replace('.sql', '')
      const content = fs.readFileSync(path.join(MIGRATIONS_DIR, f), 'utf-8')

      // Split into UP and DOWN sections
      const downMarker = content.indexOf('-- DOWN')
      const up = downMarker >= 0 ? content.slice(0, downMarker).trim() : content.trim()
      const down = downMarker >= 0 ? content.slice(downMarker + '-- DOWN'.length).trim() : ''

      // Simple checksum for drift detection
      const checksum = require('crypto').createHash('md5').update(up).digest('hex').slice(0, 8)

      return { version, name, file: f, up, down, checksum }
    })
}

async function getAppliedMigrations() {
  const { rows } = await pool.query(
    `SELECT version, name, applied_at, checksum FROM schema_migrations
     WHERE rolled_back_at IS NULL ORDER BY version`
  )
  return rows
}

async function runPending() {
  await ensureTrackingTable()
  const files = getMigrationFiles()
  const applied = await getAppliedMigrations()
  const appliedVersions = new Set(applied.map(m => m.version))

  const pending = files.filter(f => !appliedVersions.has(f.version))

  if (pending.length === 0) {
    console.log('✅ All migrations applied. Nothing to do.')
    return
  }

  console.log(`📦 ${pending.length} pending migration(s):\n`)

  for (const migration of pending) {
    console.log(`  Applying ${migration.version}: ${migration.name}...`)
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      await client.query(migration.up)
      await client.query(
        `INSERT INTO schema_migrations (version, name, checksum) VALUES ($1, $2, $3)`,
        [migration.version, migration.name, migration.checksum]
      )
      await client.query('COMMIT')
      console.log(`  ✅ ${migration.version}: ${migration.name}`)
    } catch (err) {
      await client.query('ROLLBACK')
      console.error(`  ❌ ${migration.version} FAILED: ${err.message}`)
      console.error(`  Stopping. Fix the migration and retry.`)
      process.exit(1)
    } finally {
      client.release()
    }
  }

  console.log(`\n✅ Applied ${pending.length} migration(s).`)
}

async function rollback(targetVersion) {
  await ensureTrackingTable()
  const applied = await getAppliedMigrations()
  const files = getMigrationFiles()

  if (applied.length === 0) {
    console.log('Nothing to rollback.')
    return
  }

  // Determine which migrations to rollback
  const toRollback = targetVersion
    ? applied.filter(m => m.version > targetVersion).reverse()
    : [applied[applied.length - 1]]  // Just the last one

  for (const migration of toRollback) {
    const file = files.find(f => f.version === migration.version)
    if (!file?.down) {
      console.error(`❌ No DOWN migration for ${migration.version}: ${migration.name}`)
      console.error(`Cannot rollback without a DOWN section.`)
      process.exit(1)
    }

    console.log(`  Rolling back ${migration.version}: ${migration.name}...`)
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      await client.query(file.down)
      await client.query(
        `UPDATE schema_migrations SET rolled_back_at = NOW() WHERE version = $1`,
        [migration.version]
      )
      await client.query('COMMIT')
      console.log(`  ⏪ Rolled back ${migration.version}`)
    } catch (err) {
      await client.query('ROLLBACK')
      console.error(`  ❌ Rollback of ${migration.version} FAILED: ${err.message}`)
      process.exit(1)
    } finally {
      client.release()
    }
  }

  console.log(`\n✅ Rolled back ${toRollback.length} migration(s).`)
}

async function showStatus() {
  await ensureTrackingTable()
  const files = getMigrationFiles()
  const applied = await getAppliedMigrations()
  const appliedMap = new Map(applied.map(m => [m.version, m]))

  console.log('Migration Status:\n')
  for (const file of files) {
    const app = appliedMap.get(file.version)
    if (app) {
      const drift = app.checksum !== file.checksum ? ' ⚠️ CHECKSUM DRIFT' : ''
      console.log(`  ✅ ${file.version}: ${file.name} (applied ${app.applied_at.toISOString().slice(0, 10)})${drift}`)
    } else {
      console.log(`  ⏳ ${file.version}: ${file.name} (PENDING)`)
    }
  }

  const pending = files.filter(f => !appliedMap.has(f.version))
  console.log(`\nApplied: ${applied.length} | Pending: ${pending.length} | Total: ${files.length}`)
}

function createMigration(name) {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    fs.mkdirSync(MIGRATIONS_DIR, { recursive: true })
  }

  const existing = getMigrationFiles()
  const nextVersion = String(existing.length + 1).padStart(3, '0')
  const safeName = name.replace(/[^a-z0-9_]/gi, '_').toLowerCase()
  const fileName = `${nextVersion}_${safeName}.sql`
  const filePath = path.join(MIGRATIONS_DIR, fileName)

  const template = `-- Migration ${nextVersion}: ${name}
-- Created: ${new Date().toISOString()}
--
-- UP: Apply this migration

-- Add your SQL here
-- Example: ALTER TABLE real_estate_agents ADD COLUMN utm_source TEXT;

-- DOWN
-- Rollback SQL (undo the UP)
-- Example: ALTER TABLE real_estate_agents DROP COLUMN IF EXISTS utm_source;
`

  fs.writeFileSync(filePath, template)
  console.log(`Created: migrations/${fileName}`)
  console.log(`Edit the file, then run: node scripts/db/migrate.js`)
}

async function verify() {
  console.log('Verifying schema matches applied migrations...\n')
  await ensureTrackingTable()
  const applied = await getAppliedMigrations()
  const files = getMigrationFiles()

  let issues = 0
  for (const app of applied) {
    const file = files.find(f => f.version === app.version)
    if (!file) {
      console.log(`  ⚠️ ${app.version}: applied but migration file missing!`)
      issues++
    } else if (file.checksum !== app.checksum) {
      console.log(`  ⚠️ ${file.version}: checksum drift (file changed after applying)`)
      issues++
    }
  }

  if (issues === 0) {
    console.log('  ✅ All checksums match. No drift detected.')
  } else {
    console.log(`\n⚠️ ${issues} issue(s) found.`)
  }
}

// CLI
async function main() {
  const args = process.argv.slice(2)

  try {
    if (args.includes('--status')) {
      await showStatus()
    } else if (args.includes('--rollback')) {
      const toIdx = args.indexOf('--rollback-to')
      const target = toIdx >= 0 ? args[toIdx + 1] : null
      await rollback(target)
    } else if (args.includes('--create')) {
      const nameIdx = args.indexOf('--create')
      const name = args[nameIdx + 1]
      if (!name) { console.error('Usage: --create "migration_name"'); process.exit(1) }
      createMigration(name)
    } else if (args.includes('--verify')) {
      await verify()
    } else {
      await runPending()
    }
  } finally {
    await pool.end()
  }
}

main().catch(err => {
  console.error('Migration error:', err.message)
  process.exit(1)
})
