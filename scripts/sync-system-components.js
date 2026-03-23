#!/usr/bin/env node
/**
 * Auto-sync Deployed Pages to System Components for LeadFlow AI
 * 
 * This module automatically syncs deployed pages from project.config.json
 * to the system_components table during heartbeat.
 */

const { createClient } = require('@supabase/supabase-js')
const crypto = require('crypto')
const fs = require('fs')
const path = require('path')

/**
 * Generate a deterministic UUID from a string ID (for consistent upserts)
 */
function deterministicUUID(str) {
  const hash = crypto.createHash('md5').update('leadflow-component-' + str).digest('hex')
  return `${hash.slice(0,8)}-${hash.slice(8,12)}-4${hash.slice(13,16)}-${hash.slice(16,20)}-${hash.slice(20,32)}`
}

// Load config from project.config.json
function loadConfig() {
  const configPath = path.join(__dirname, '..', 'project.config.json')
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
  return config
}

class SystemComponentsSync {
  constructor() {
    this.config = loadConfig()
    this.supabase = createClient(
      process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
  }

  /**
   * Sync all deployed products from project.config.json to system_components
   */
  async syncDeployedPages() {
    console.log('\n🔄 Syncing deployed pages to system_components...')
    
    const smokeTests = this.config.smoke_tests || []
    const synced = []
    const errors = []

    for (const test of smokeTests) {
      if (!test.url) continue
      
      const componentId = deterministicUUID(test.id)
      try {
        await this.upsertComponent({
          id: componentId,
          component_name: test.name,
          category: 'health_check',
          status: 'live',
          status_emoji: '🟢',
          metadata: {
            url: test.url,
            test_id: test.id,
            check_type: test.check_type,
            severity: test.severity,
            description: `Smoke test endpoint for ${test.name}`
          }
        })
        console.log(`   ✅ Synced ${test.id} → ${test.url}`)
        synced.push(componentId)
      } catch (err) {
        console.error(`   ❌ Failed to sync ${test.id}:`, err.message)
        errors.push({ id: componentId, error: err.message })
      }
    }

    console.log(`   📊 Synced ${synced.length} components, ${errors.length} errors`)
    
    return {
      synced,
      errors,
      count: synced.length
    }
  }

  /**
   * Upsert a component into the system_components table
   */
  async upsertComponent(component) {
    const statusEmojiMap = {
      live: '🟢',
      building: '🟡',
      error: '🔴',
      deprecated: '⚪'
    }

    const { data, error } = await this.supabase
      .from('system_components')
      .upsert({
        project_id: this.config.project_id || 'leadflow',
        component_name: component.component_name,
        category: component.category,
        status: component.status,
        status_emoji: component.status_emoji || statusEmojiMap[component.status] || '⚪',
        metadata: component.metadata,
        last_checked: new Date().toISOString()
      }, {
        onConflict: 'project_id,component_name'
      })

    if (error) {
      throw new Error(`Supabase error: ${error.message}`)
    }

    return data
  }

  /**
   * Get all registered components from the database
   */
  async getRegisteredComponents() {
    const { data, error } = await this.supabase
      .from('system_components')
      .select('*')
      .order('updated_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch components: ${error.message}`)
    }

    return data || []
  }
}

// Run if called directly
if (require.main === module) {
  const syncer = new SystemComponentsSync()
  syncer.syncDeployedPages()
    .then(result => {
      console.log('\n✅ Sync complete:', result)
      process.exit(0)
    })
    .catch(err => {
      console.error('\n❌ Sync failed:', err)
      process.exit(1)
    })
}

module.exports = { SystemComponentsSync }
