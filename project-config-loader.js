/**
 * project-config-loader.js — Single source of truth for project configuration
 *
 * Replaces all hardcoded project-specific values (project ID, Telegram IDs,
 * budget constants, smoke test URLs, deploy commands, etc.) with a single
 * config file: project.config.json
 *
 * Usage:
 *   const { getConfig } = require('./project-config-loader')
 *   const config = getConfig()
 *   // config.project_id, config.telegram.chat_id, etc.
 */

const fs = require('fs')
const path = require('path')

let _cached = null

/**
 * Load and cache the project config.
 * Resolution order:
 *   1. Explicit configPath argument
 *   2. PROJECT_CONFIG env var
 *   3. project.config.json in same directory as this file
 *
 * @param {string} [configPath] - Optional explicit path to config file
 * @returns {object} Parsed project config
 */
function loadProjectConfig(configPath) {
  const p = configPath ||
    process.env.PROJECT_CONFIG ||
    path.join(__dirname, 'project.config.json')

  if (!fs.existsSync(p)) {
    throw new Error(`Project config not found: ${p}`)
  }

  return JSON.parse(fs.readFileSync(p, 'utf-8'))
}

/**
 * Get the project config (cached after first load).
 * @param {string} [configPath] - Optional explicit path
 * @returns {object}
 */
function getConfig(configPath) {
  if (!_cached) {
    _cached = loadProjectConfig(configPath)
  }
  return _cached
}

/**
 * Clear the cached config (useful for testing or reloading).
 */
function clearCache() {
  _cached = null
}

/**
 * Calculate the current project day number.
 * @param {object} [config] - Config object (uses cached if not provided)
 * @returns {number} Current day number (1-based)
 */
function getDayNumber(config) {
  const cfg = config || getConfig()
  const dayZero = new Date(cfg.reporting.day_zero)
  return Math.ceil((new Date() - dayZero) / (1000 * 60 * 60 * 24))
}

/**
 * Resolve the absolute dashboard directory path.
 * @param {object} [config] - Config object (uses cached if not provided)
 * @returns {string} Absolute path to dashboard directory
 */
function getDashboardDir(config) {
  const cfg = config || getConfig()
  return path.join(__dirname, cfg.deployment.dashboard_dir)
}

/**
 * Build a project context object suitable for injection into tasks and spawn messages.
 * Resolves reference_docs relative paths to absolute paths.
 * @param {object} [config] - Config object (uses cached if not provided)
 * @returns {{ project_id: string, project_name: string, project_dir: string, reference_docs: Object<string, string> }}
 */
function buildProjectContext(config) {
  const cfg = config || getConfig()
  const referenceDocs = {}
  if (cfg.reference_docs) {
    for (const [key, rel] of Object.entries(cfg.reference_docs)) {
      referenceDocs[key] = path.join(cfg.project_dir, rel)
    }
  }
  return {
    project_id: cfg.project_id,
    project_name: cfg.project_name,
    project_dir: cfg.project_dir,
    reference_docs: referenceDocs
  }
}

module.exports = { loadProjectConfig, getConfig, clearCache, getDayNumber, getDashboardDir, buildProjectContext }
