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
const crypto = require('crypto')

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
    // Use project_id as namespace for UUID generation
    this.NAMESPACE = this.config.project_id || '550e8400-e29b-41d4-a716-446655440000'
  }

  /**
   * Generate a deterministic UUID v5-like from a string ID
   * This ensures the same string ID always maps to the same UUID
   */
  generateComponentUUID(componentId) {
    // Create a deterministic UUID using SHA-1 hash
    const hash = crypto
      .createHash('sha1')
      .update(`${this.NAMESPACE}:${componentId}`)
      .digest('hex')
    
    // Format as UUID: 8-4-4-4-12 (with version 5 and variant bits)
    const uuid = [
      hash.slice(0, 8),
      hash.slice(8, 12),
      '5' + hash.slice(13, 16), // version 5
      ((parseInt(hash.slice(16, 18), 16) & 0x3f) | 0x80).toString(16).padStart(2, '0') + hash.slice(18, 20), // variant 10
      hash.slice(20, 32)
    ].join('-')
    
    return uuid
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
      
      // Generate a deterministic UUID from the string ID
      const componentUUID = this.generateComponentUUID(test.id)
      
      try {
        await this.upsertComponent({
          id: componentUUID,
          component_name: test.name,
          category: 'health_check',
          status: 'live',
          metadata: {
            url: test.url,
            test_id: test.id,
            check_type: test.check_type,
            severity: test.severity,
            description: `Smoke test endpoint for ${test.name}`
          }
        })
        console.log(`   ✅ Synced ${test.id} → ${test.url}`)
        synced.push({ id: test.id, uuid: componentUUID })
      } catch (err) {
        console.error(`   ❌ Failed to sync ${test.id}:`, err.message)
        errors.push({ id: test.id, error: err.message })
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
   * Get status emoji based on status
   */
  getStatusEmoji(status) {
    const emojiMap = {
      'live': '🟢',
      'building': '🟡',
      'error': '🔴',
      'deprecated': '⚪'
    }
    return emojiMap[status] || '⚪'
  }

  /**
   * Upsert a component into the system_components table
   */
  async upsertComponent(component) {
    const { data, error } = await this.supabase
      .from('system_components')
      .upsert({
        id: component.id,
        project_id: 'leadflow', // Use string id matching config
        component_name: component.component_name,
        category: component.category,
        status: component.status,
        status_emoji: this.getStatusEmoji(component.status),
        metadata: component.metadata,
        last_checked: new Date().toISOString()
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
      .order('last_checked', { ascending: false })

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
