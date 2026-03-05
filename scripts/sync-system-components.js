#!/usr/bin/env node
/**
 * Auto-sync Deployed Pages to System Components for LeadFlow AI
 * 
 * Automatically detects deployed Vercel pages and syncs their URLs
 * to the system_components table during each heartbeat.
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

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
   * Get deployed URLs from Vercel
   */
  async getVercelDeployments() {
    try {
      // Try to get deployment info from Vercel CLI
      const result = execSync('vercel list --json 2>/dev/null || echo "[]"', {
        cwd: path.join(__dirname, '..', 'product', 'lead-response', 'dashboard'),
        encoding: 'utf8',
        timeout: 30000
      })
      const deployments = JSON.parse(result)
      return deployments
    } catch (err) {
      console.log('   ⚠️ Could not fetch Vercel deployments:', err.message)
      return []
    }
  }

  /**
   * Sync all deployed pages to system_components
   */
  async syncDeployedPages() {
    console.log('\n🔄 Syncing deployed pages to system_components...')
    
    const synced = []
    const errors = []

    // Sync from smoke_tests in project.config.json
    const smokeTests = this.config.smoke_tests || []
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
            description: `Smoke test endpoint for ${test.name}`,
            source: 'project.config.json'
          }
        })
        console.log(`   ✅ Synced ${test.id} → ${test.url}`)
        synced.push(componentId)
      } catch (err) {
        console.error(`   ❌ Failed to sync ${test.id}:`, err.message)
        errors.push({ id: componentId, error: err.message })
      }
    }

    // Try to get Vercel deployment URLs
    const deployments = await this.getVercelDeployments()
    for (const deployment of deployments.slice(0, 5)) { // Limit to 5 most recent
      if (!deployment.url) continue
      
      const componentId = `vercel-${deployment.name || 'deployment'}`
      try {
        await this.upsertComponent({
          id: componentId,
          name: deployment.name || 'Vercel Deployment',
          type: 'web',
          url: `https://${deployment.url}`,
          status: deployment.state === 'READY' ? 'live' : 'built',
          metadata: {
            deployment_id: deployment.uid,
            vercel_url: deployment.url,
            created_at: deployment.created,
            source: 'vercel'
          }
        })
        console.log(`   ✅ Synced Vercel deployment → https://${deployment.url}`)
        synced.push(componentId)
      } catch (err) {
        console.error(`   ❌ Failed to sync Vercel deployment:`, err.message)
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

  /**
   * Mark stale components (not updated in last 24 hours)
   */
  async markStaleComponents() {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    
    const { error } = await this.supabase
      .from('system_components')
      .update({
        status: 'stale',
        updated_at: new Date().toISOString()
      })
      .lt('updated_at', yesterday)
      .eq('status', 'live')

    if (error) {
      throw new Error(`Failed to mark stale components: ${error.message}`)
    }
  }
}

// Run if called directly
if (require.main === module) {
  const syncer = new SystemComponentsSync()
  syncer.syncDeployedPages()
    .then(async (result) => {
      // Mark stale components
      try {
        await syncer.markStaleComponents()
        console.log('   ✅ Marked stale components')
      } catch (err) {
        console.warn('   ⚠️ Failed to mark stale components:', err.message)
      }
      
      console.log('\n✅ Sync complete:', result)
      process.exit(0)
    })
    .catch(err => {
      console.error('\n❌ Sync failed:', err)
      process.exit(1)
    })
}

module.exports = { SystemComponentsSync }
