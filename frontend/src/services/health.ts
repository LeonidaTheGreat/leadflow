import { logger } from '@/lib/logger'

export type ComponentStatus = 'healthy' | 'warning' | 'error' | 'unknown'

export interface SystemComponent {
  id: string
  name: string
  category: 'infrastructure' | 'integration' | 'service' | 'database' | 'external'
  status: ComponentStatus
  lastChecked: Date
  responseTimeMs?: number
  uptimePercent?: number
  details?: string
  errorMessage?: string
  url?: string
  healthCheckEndpoint?: string
}

export interface HealthCheckResult {
  component: SystemComponent
  isHealthy: boolean
  responseTimeMs: number
  timestamp: Date
  error?: string
}

// Major system components configuration
export const DEFAULT_COMPONENTS: Omit<SystemComponent, 'status' | 'lastChecked'>[] = [
  {
    id: 'supabase-db',
    name: 'Supabase Database',
    category: 'database',
    url: 'https://fptrokacdwzlmflyczdz.supabase.co',
    healthCheckEndpoint: '/rest/v1/',
    details: 'Primary PostgreSQL database'
  },
  {
    id: 'supabase-auth',
    name: 'Supabase Auth',
    category: 'service',
    url: 'https://fptrokacdwzlmflyczdz.supabase.co',
    healthCheckEndpoint: '/auth/v1/health',
    details: 'Authentication service'
  },
  {
    id: 'posthog',
    name: 'PostHog Analytics',
    category: 'external',
    url: 'https://app.posthog.com',
    details: 'Product analytics'
  },
  {
    id: 'calcom',
    name: 'Cal.com Integration',
    category: 'integration',
    url: 'https://api.cal.com',
    details: 'Calendar scheduling'
  },
  {
    id: 'fub',
    name: 'Follow Up Boss',
    category: 'integration',
    url: 'https://api.followupboss.com',
    details: 'CRM integration'
  },
  {
    id: 'stripe',
    name: 'Stripe Payments',
    category: 'external',
    url: 'https://api.stripe.com',
    details: 'Payment processing'
  },
  {
    id: 'openai',
    name: 'OpenAI API',
    category: 'external',
    url: 'https://api.openai.com',
    details: 'AI model provider'
  },
  {
    id: 'telegram',
    name: 'Telegram Bot',
    category: 'integration',
    url: 'https://api.telegram.org',
    details: 'Messaging integration'
  },
  {
    id: 'orchestrator',
    name: 'LeadFlow Orchestrator',
    category: 'service',
    details: 'Core orchestration agent'
  },
  {
    id: 'dispatcher',
    name: 'Task Dispatcher',
    category: 'service',
    details: 'Task distribution service'
  },
  {
    id: 'frontend',
    name: 'React Frontend',
    category: 'infrastructure',
    details: 'Dashboard UI'
  },
  {
    id: 'vercel',
    name: 'Vercel Hosting',
    category: 'infrastructure',
    url: 'https://vercel.com',
    details: 'Deployment platform'
  }
]

class HealthCheckService {
  private components: SystemComponent[] = []
  private checkInterval: number | null = null
  private listeners: ((components: SystemComponent[]) => void)[] = []

  constructor() {
    this.initializeComponents()
  }

  private initializeComponents() {
    this.components = DEFAULT_COMPONENTS.map(comp => ({
      ...comp,
      status: 'unknown' as ComponentStatus,
      lastChecked: new Date()
    }))
  }

  // Subscribe to health updates
  subscribe(listener: (components: SystemComponent[]) => void): () => void {
    this.listeners.push(listener)
    // Immediately call with current state
    listener(this.components)
    
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener)
    }
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener([...this.components]))
  }

  // Perform health check on a single component
  async checkComponent(component: SystemComponent): Promise<HealthCheckResult> {
    const startTime = performance.now()
    
    try {
      // Simulate health check for components without endpoints
      if (!component.healthCheckEndpoint && !component.url) {
        // For internal services, check if they're running via heuristic
        const isRunning = this.checkInternalService(component.id)
        return {
          component,
          isHealthy: isRunning,
          responseTimeMs: performance.now() - startTime,
          timestamp: new Date()
        }
      }

      // For external services, we check if they respond
      // Note: In production, this would be done via a backend proxy to avoid CORS
      if (component.url) {
        // Simulate check (in real implementation, use backend proxy)
        const simulatedLatency = Math.random() * 200 + 50
        await new Promise(resolve => setTimeout(resolve, simulatedLatency))
        
        return {
          component,
          isHealthy: true,
          responseTimeMs: simulatedLatency,
          timestamp: new Date()
        }
      }

      return {
        component,
        isHealthy: false,
        responseTimeMs: performance.now() - startTime,
        timestamp: new Date(),
        error: 'No health endpoint configured'
      }
    } catch (error) {
      logger.error(`Health check failed for ${component.name}`, 'HealthCheck', { 
        componentId: component.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      
      return {
        component,
        isHealthy: false,
        responseTimeMs: performance.now() - startTime,
        timestamp: new Date(),
        error: error instanceof Error ? error.message : 'Health check failed'
      }
    }
  }

  // Check internal service status (simulated)
  private checkInternalService(serviceId: string): boolean {
    // In production, this would check actual service status
    // For now, simulate based on service ID
    const healthyServices = ['orchestrator', 'frontend']
    return healthyServices.includes(serviceId) || Math.random() > 0.1
  }

  // Run health checks on all components
  async runAllChecks(): Promise<void> {
    logger.info('Running health checks on all components', 'HealthCheck')
    
    const results = await Promise.allSettled(
      this.components.map(comp => this.checkComponent(comp))
    )

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const checkResult = result.value
        this.components[index] = {
          ...checkResult.component,
          status: this.determineStatus(checkResult),
          lastChecked: checkResult.timestamp,
          responseTimeMs: checkResult.responseTimeMs,
          errorMessage: checkResult.error
        }
      } else {
        this.components[index] = {
          ...this.components[index],
          status: 'error',
          lastChecked: new Date(),
          errorMessage: result.reason
        }
      }
    })

    this.notifyListeners()
    logger.info('Health checks completed', 'HealthCheck', {
      healthy: this.components.filter(c => c.status === 'healthy').length,
      warning: this.components.filter(c => c.status === 'warning').length,
      error: this.components.filter(c => c.status === 'error').length
    })
  }

  // Determine status based on health check result
  private determineStatus(result: HealthCheckResult): ComponentStatus {
    if (!result.isHealthy) return 'error'
    if (result.responseTimeMs > 1000) return 'warning'
    if (result.responseTimeMs > 500) return 'warning'
    return 'healthy'
  }

  // Start periodic health checks
  startPeriodicChecks(intervalMs: number = 30000): void {
    if (this.checkInterval) {
      window.clearInterval(this.checkInterval)
    }
    
    // Run immediately
    this.runAllChecks()
    
    // Then schedule periodic checks
    this.checkInterval = window.setInterval(() => {
      this.runAllChecks()
    }, intervalMs)
    
    logger.info('Started periodic health checks', 'HealthCheck', { intervalMs })
  }

  // Stop periodic health checks
  stopPeriodicChecks(): void {
    if (this.checkInterval) {
      window.clearInterval(this.checkInterval)
      this.checkInterval = null
      logger.info('Stopped periodic health checks', 'HealthCheck')
    }
  }

  // Get current component status
  getComponents(): SystemComponent[] {
    return [...this.components]
  }

  // Get overall system health
  getOverallHealth(): { status: ComponentStatus; healthy: number; total: number } {
    const healthy = this.components.filter(c => c.status === 'healthy').length
    const warning = this.components.filter(c => c.status === 'warning').length
    const error = this.components.filter(c => c.status === 'error').length
    
    let status: ComponentStatus = 'healthy'
    if (error > 0) status = 'error'
    else if (warning > 0) status = 'warning'
    
    return { status, healthy, total: this.components.length }
  }
}

// Export singleton instance
export const healthCheckService = new HealthCheckService()
