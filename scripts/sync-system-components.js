#!/usr/bin/env node
/**
 * Auto-sync Deployed Pages to System Components for LeadFlow AI
 * 
 * This module automatically syncs deployed pages from project.config.json
 * to the system_components table during heartbeat.
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

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
      
      const componentId = test.id
      try {
        await this.upsertComponent({
          id: componentId,
          name: test.name,
          type: 'health_check',
          url: test.url,
          status: 'live',
          metadata: {
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
    const { data, error } = await this.supabase
      .from('system_components')
      .upsert({
        id: component.id,
        name: component.name,
        type: component.type,
        url: component.url,
        status: component.status,
        metadata: component.metadata,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id'
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
