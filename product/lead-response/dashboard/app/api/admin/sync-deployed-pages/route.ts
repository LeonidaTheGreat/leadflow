import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Admin API: Sync Deployed Pages to System Components
 * 
 * POST /api/admin/sync-deployed-pages
 * Headers: Authorization: Bearer {admin_token} (optional, checks service role key)
 * 
 * Per PRD-DEPLOYED-PAGES-SYNC v1.1 - FR-4: Manual Sync API
 */

// Initialize Supabase with service role for admin operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Component name mapping
const COMPONENT_NAME_MAP: Record<string, string> = {
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

// URL mapping per PRD requirements
const URL_MAP: Record<string, string> = {
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

interface Product {
  id: string
  name: string
  type: string
  url?: string
  test_url?: string
  local_path?: string
  uc_id?: string | null
  description?: string
  smoke_test_id?: string | null
}

interface ProjectConfig {
  products: Product[]
}

async function loadConfig(): Promise<ProjectConfig> {
  // In production, this would read from project.config.json
  // For now, we hardcode the products array to match project.config.json
  return {
    products: [
      {
        id: 'customer-dashboard',
        name: 'Customer Dashboard',
        type: 'web',
        url: 'https://leadflow-ai-five.vercel.app',
        test_url: 'https://leadflow-ai-five.vercel.app/api/health',
        uc_id: 'UC-9',
        description: 'Next.js customer-facing dashboard',
        smoke_test_id: 'vercel-dashboard'
      },
      {
        id: 'fub-webhook',
        name: 'FUB Webhook API',
        type: 'api',
        url: 'https://fub-inbound-webhook.vercel.app',
        test_url: 'https://fub-inbound-webhook.vercel.app/health',
        uc_id: 'UC-1',
        description: 'Follow Up Boss inbound webhook processor',
        smoke_test_id: 'vercel-health'
      },
      {
        id: 'landing-page',
        name: 'Landing Page',
        type: 'web',
        url: 'https://leadflow-ai-five.vercel.app',
        local_path: 'product/lead-response/dashboard/',
        uc_id: 'gtm-landing-page',
        description: 'Marketing landing page (integrated into Next.js dashboard root route)',
        smoke_test_id: 'vercel-dashboard'
      },
      {
        id: 'internal-dashboard',
        name: 'Internal Dashboard',
        type: 'web',
        url: 'http://127.0.0.1:8787/dashboard.html',
        uc_id: null,
        description: 'Orchestration dashboard (local, Tailscale accessible)',
        smoke_test_id: 'dashboard-local'
      },
      {
        id: 'billing-flow',
        name: 'Billing Flow',
        type: 'web',
        url: 'https://leadflow-ai-five.vercel.app/settings',
        uc_id: 'UC-10',
        description: 'Stripe billing integration (part of customer dashboard)',
        smoke_test_id: 'vercel-dashboard'
      }
    ]
  }
}

function getComponentName(productName: string): string {
  return COMPONENT_NAME_MAP[productName] || productName
}

function getComponentUrl(product: Product): string {
  return URL_MAP[product.id] || URL_MAP[product.name] || product.url || ''
}

async function upsertComponent(component: {
  component_name: string
  category: string
  url: string
  status: string
  status_emoji: string
  details: string
  metadata: Record<string, unknown>
}) {
  const now = new Date().toISOString()
  
  // Check if component exists
  const { data: existing } = await supabase
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

  if (existing) {
    const { error } = await supabase
      .from('system_components')
      .update(componentData)
      .eq('id', existing.id)
    if (error) throw error
  } else {
    const { error } = await supabase
      .from('system_components')
      .insert(componentData)
    if (error) throw error
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify authorization (optional - can be extended for admin tokens)
    const authHeader = request.headers.get('authorization')
    const adminToken = process.env.ADMIN_API_TOKEN
    
    if (adminToken && authHeader !== `Bearer ${adminToken}`) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Load config
    const config = await loadConfig()
    const products = config.products || []
    
    const synced: Array<{ name: string; url: string }> = []
    const errors: Array<{ name: string; error: string }> = []

    // Sync each product
    for (const product of products) {
      if (!product.url && !product.id) continue
      
      const componentName = getComponentName(product.name)
      const correctUrl = getComponentUrl(product)
      
      try {
        await upsertComponent({
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
        synced.push({ name: componentName, url: correctUrl })
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        errors.push({ name: componentName, error: errorMessage })
      }
    }

    return NextResponse.json({
      success: true,
      synced: synced.length,
      components: synced,
      errors: errors.length > 0 ? errors : undefined
    })

  } catch (error) {
    console.error('Sync error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    )
  }
}

// Also support GET for simple status check
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/admin/sync-deployed-pages',
    methods: ['POST'],
    description: 'Manual sync of deployed pages to system_components table'
  })
}
