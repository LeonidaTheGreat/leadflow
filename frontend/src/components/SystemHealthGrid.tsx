import * as React from 'react'
import { 
  Activity, 
  AlertCircle, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Clock,
  Database,
  Cloud,
  Server,
  Plug,
  Globe,
  Cpu
} from 'lucide-react'
import { 
  healthCheckService, 
  SystemComponent, 
  ComponentStatus 
} from '@/services/health'
import { logger } from '@/lib/logger'

interface HealthGridProps {
  className?: string
  autoRefresh?: boolean
  refreshInterval?: number
}

const categoryIcons = {
  infrastructure: Server,
  integration: Plug,
  service: Cpu,
  database: Database,
  external: Cloud
}

const statusConfig: Record<ComponentStatus, { 
  icon: React.ElementType
  color: string 
  bgColor: string
  borderColor: string
  label: string
}> = {
  healthy: {
    icon: CheckCircle2,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    label: 'Healthy'
  },
  warning: {
    icon: AlertCircle,
    color: 'text-amber-500',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    label: 'Warning'
  },
  error: {
    icon: XCircle,
    color: 'text-red-500',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    label: 'Error'
  },
  unknown: {
    icon: Activity,
    color: 'text-slate-400',
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-200',
    label: 'Unknown'
  }
}

function ComponentCard({ component }: { component: SystemComponent }) {
  const config = statusConfig[component.status]
  const Icon = config.icon
  const CategoryIcon = categoryIcons[component.category]

  return (
    <div 
      className={`
        relative overflow-hidden rounded-lg border-2 p-4 transition-all duration-300
        hover:shadow-md hover:scale-[1.02]
        ${config.bgColor} ${config.borderColor}
      `}
    >
      {/* Status indicator pulse */}
      <div className={`
        absolute top-3 right-3 h-3 w-3 rounded-full
        ${component.status === 'healthy' ? 'animate-pulse bg-emerald-500' : ''}
        ${component.status === 'warning' ? 'bg-amber-500' : ''}
        ${component.status === 'error' ? 'bg-red-500' : ''}
        ${component.status === 'unknown' ? 'bg-slate-400' : ''}
      `} />

      <div className="flex items-start gap-3">
        <div className={`
          flex h-10 w-10 shrink-0 items-center justify-center rounded-lg
          ${config.bgColor.replace('50', '100')}
        `}>
          <CategoryIcon className={`h-5 w-5 ${config.color}`} />
        </div>
        
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-slate-900 truncate">{component.name}</h3>
          </div>
          
          <p className="mt-1 text-sm text-slate-600 truncate">
            {component.details}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <span className={`
              inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium
              ${config.bgColor.replace('50', '100')} ${config.color}
            `}>
              <Icon className="h-3 w-3" />
              {config.label}
            </span>
            
            {component.responseTimeMs !== undefined && (
              <span className={`
                inline-flex items-center gap-1 rounded-full px-2 py-0.5
                ${component.responseTimeMs > 500 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}
              `}>
                <Clock className="h-3 w-3" />
                {Math.round(component.responseTimeMs)}ms
              </span>
            )}
            
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-slate-600 capitalize">
              {component.category}
            </span>
          </div>

          {component.errorMessage && (
            <p className="mt-2 text-xs text-red-600 line-clamp-2">
              {component.errorMessage}
            </p>
          )}
        </div>
      </div>

      {/* Last checked timestamp */}
      <div className="mt-3 flex items-center justify-between border-t border-slate-200/50 pt-2">
        <span className="text-xs text-slate-500">
          Last checked: {component.lastChecked.toLocaleTimeString()}
        </span>
        
        {component.url && (
          <a 
            href={component.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
          >
            <Globe className="h-3 w-3" />
            Visit
          </a>
        )}
      </div>
    </div>
  )
}

function OverallHealthCard({ 
  healthy, 
  total, 
  status 
}: { 
  healthy: number
  total: number
  status: ComponentStatus 
}) {
  const percentage = Math.round((healthy / total) * 100)
  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <div className={`
      rounded-lg border-2 p-6
      ${config.bgColor} ${config.borderColor}
    `}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-600">System Health</p>
          <p className="mt-1 text-3xl font-bold text-slate-900">
            {percentage}%
          </p>
          <p className="mt-1 text-sm text-slate-600">
            {healthy} of {total} components healthy
          </p>
        </div>
        
        <div className={`
          flex h-16 w-16 items-center justify-center rounded-full
          ${config.bgColor.replace('50', '100')}
        `}>
          <Icon className={`h-8 w-8 ${config.color}`} />
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-4">
        <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
          <div 
            className={`
              h-full rounded-full transition-all duration-500
              ${status === 'healthy' ? 'bg-emerald-500' : ''}
              ${status === 'warning' ? 'bg-amber-500' : ''}
              ${status === 'error' ? 'bg-red-500' : ''}
              ${status === 'unknown' ? 'bg-slate-400' : ''}
            `}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </div>
  )
}

export function SystemHealthGrid({ 
  className = '',
  autoRefresh = true,
  refreshInterval = 30000
}: HealthGridProps) {
  const [components, setComponents] = React.useState<SystemComponent[]>([])
  const [isRefreshing, setIsRefreshing] = React.useState(false)
  const [lastRefresh, setLastRefresh] = React.useState<Date>(new Date())
  const [overallHealth, setOverallHealth] = React.useState({
    status: 'unknown' as ComponentStatus,
    healthy: 0,
    total: 0
  })

  // Subscribe to health updates
  React.useEffect(() => {
    const unsubscribe = healthCheckService.subscribe((updatedComponents) => {
      setComponents(updatedComponents)
      setOverallHealth(healthCheckService.getOverallHealth())
    })

    return () => unsubscribe()
  }, [])

  // Start periodic health checks
  React.useEffect(() => {
    if (autoRefresh) {
      healthCheckService.startPeriodicChecks(refreshInterval)
      logger.info('Started auto-refresh for health grid', 'SystemHealthGrid', {
        intervalMs: refreshInterval
      })
    }

    return () => {
      healthCheckService.stopPeriodicChecks()
    }
  }, [autoRefresh, refreshInterval])

  // Manual refresh handler
  const handleRefresh = async () => {
    setIsRefreshing(true)
    logger.info('Manual health check refresh triggered', 'SystemHealthGrid')
    
    try {
      await healthCheckService.runAllChecks()
      setLastRefresh(new Date())
    } catch (error) {
      logger.error('Failed to refresh health checks', 'SystemHealthGrid', { 
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setIsRefreshing(false)
    }
  }

  // Group components by category
  const groupedComponents = React.useMemo(() => {
    const groups: Record<string, SystemComponent[]> = {}
    components.forEach(comp => {
      if (!groups[comp.category]) {
        groups[comp.category] = []
      }
      groups[comp.category].push(comp)
    })
    return groups
  }, [components])

  const categories = Object.keys(groupedComponents).sort()

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">System Health</h2>
          <p className="text-sm text-slate-600 mt-1">
            Real-time status of all system components
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </span>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-4 border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Overall Health Summary */}
      <OverallHealthCard {...overallHealth} />

      {/* Component Grid by Category */}
      {categories.map(category => (
        <div key={category}>
          <h3 className="text-lg font-semibold text-slate-900 mb-3 capitalize flex items-center gap-2">
            {React.createElement(categoryIcons[category as keyof typeof categoryIcons], { 
              className: 'h-5 w-5 text-slate-500' 
            })}
            {category} Components
          </h3>
          
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {groupedComponents[category].map(component => (
              <ComponentCard key={component.id} component={component} />
            ))}
          </div>
        </div>
      ))}

      {components.length === 0 && (
        <div className="text-center py-12 bg-slate-50 rounded-lg border border-dashed border-slate-300">
          <Activity className="h-12 w-12 text-slate-400 mx-auto mb-3" />
          <p className="text-slate-600">Loading component status...</p>
        </div>
      )}

      {/* Legend */}
      <div className="rounded-lg border border-slate-200 p-4 bg-slate-50">
        <h4 className="text-sm font-medium text-slate-700 mb-3">Status Legend</h4>
        <div className="flex flex-wrap gap-4">
          {Object.entries(statusConfig).map(([status, config]) => {
            const Icon = config.icon
            return (
              <div key={status} className="flex items-center gap-2">
                <Icon className={`h-4 w-4 ${config.color}`} />
                <span className="text-sm text-slate-600">{config.label}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default SystemHealthGrid
