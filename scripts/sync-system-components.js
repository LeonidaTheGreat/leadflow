#!/usr/bin/env node
/**
 * Auto-sync Deployed Pages to System Components for LeadFlow AI
 * 
 * This module automatically syncs deployed pages from project.config.json
 * to the system_components table during heartbeat.
 * 
 * Updated per PRD-DEPLOYED-PAGES-SYNC v1.1:
 * - Syncs from products array with correct URLs
 * - Properly maps component names to URLs
 * - Sets status_emoji and verified_date correctly
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
   * Map product config to component name
   */
  getComponentName(productName) {
    const nameMap = {
      'customer-dashboard': 'Customer Dashboard',
      'Customer Dashboard': 'Customer Dashboard',
      'fub-webhook': 'FUB Webhook API',
      'FUB Webhook API': 'FUB Webhook API',
      'landing-page': 'Landing Page',
      'Landing Page': 'Landing Page',
      'billing-flow': 'Billing Flow',
      'Billing Flow': 'Billing Flow',
      'internal-dashboard': 'Internal Dashboard',
      'Internal Dashboard': 'Internal Dashboard'
    }
    return nameMap[productName] || productName
  }

  /**
   * Get the correct URL for a component based on PRD requirements
   */
  getComponentUrl(product) {
    // Per PRD-DEPLOYED-PAGES-SYNC, these are the correct URLs:
    const urlMap = {
      'customer-dashboard': 'https://leadflow-ai-five.vercel.app/dashboard',
      'Customer Dashboard': 'https://leadflow-ai-five.vercel.app/dashboard',
      'landing-page': 'https://leadflow-ai-five.vercel.app/',
      'Landing Page': 'https://leadflow-ai-five.vercel.app/',
      'billing-flow': 'https://leadflow-ai-five.vercel.app/settings',
      'Billing Flow': 'https://leadflow-ai-five.vercel.app/settings',
      'fub-webhook': 'https://fub-inbound-webhook.vercel.app',
      'FUB Webhook API': 'https://fub-inbound-webhook.vercel.app',
      'internal-dashboard': 'http://127.0.0.1:8787/dashboard.html',
      'Internal Dashboard': 'http://127.0.0.1:8787/dashboard.html'
    }
    
    // Return mapped URL or fall back to product's configured URL
    return urlMap[product.id] || urlMap[product.name] || product.url
  }

  /**
   * Sync all deployed products from project.config.json to system_components
   */
  async syncDeployedPages() {
    console.log('\n🔄 Syncing deployed pages to system_components...')
    
    const products = this.config.products || []
    const synced = []
    const errors = []

    for (const product of products) {
      if (!product.url && !product.id) continue
      
      const componentName = this.getComponentName(product.name)
      const correctUrl = this.getComponentUrl(product)
      
      try {
        await this.upsertComponent({
          component_name: componentName,
          category: 'product',
          url: correctUrl,
          status: 'LIVE',
          status_emoji: '🟢',
          details: product.description || `${product.name} - ${product.type}`,
          metadata: {
            url: correctUrl,
            type: product.type,
            uc_id: product.uc_id,
            test_url: product.test_url || null,
            local_path: product.local_path || null,
            product_id: product.id,
            smoke_test_id: product.smoke_test_id || null
          }
        })
        console.log(`   ✅ Synced ${componentName} → ${correctUrl}`)
        synced.push({ name: componentName, url: correctUrl })
      } catch (err) {
        console.error(`   ❌ Failed to sync ${componentName}:`, err.message)
        errors.push({ name: componentName, error: err.message })
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
    const now = new Date().toISOString()
    
    // Check if component exists by name
    const { data: existing } = await this.supabase
      .from('system_components')
      .select('id')
      .eq('component_name', component.component_name)
      .eq('project_id', 'leadflow')
      .maybeSingle()

    const componentData = {
      project_id: 'leadflow',
      component_name: component.component_name,
      category: component.category,
      status: component.status,
      status_emoji: component.status_emoji,
      details: component.details,
      verified_date: now,
      last_checked: now,
      metadata: component.metadata
    }

    let result
    if (existing) {
      // Update existing
      result = await this.supabase
        .from('system_components')
        .update(componentData)
        .eq('id', existing.id)
    } else {
      // Insert new
      result = await this.supabase
        .from('system_components')
        .insert(componentData)
    }

    if (result.error) {
      throw new Error(`Supabase error: ${result.error.message}`)
    }

    return result.data
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
