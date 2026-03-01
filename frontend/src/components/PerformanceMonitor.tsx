import { useEffect, useState } from 'react'

interface PerformanceMetrics {
  lcp: number | null
  fid: number | null
  cls: number | null
  ttfb: number | null
  fcp: number | null
}

interface PerformanceMonitorProps {
  enabled?: boolean
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
  threshold?: {
    lcp: number
    fid: number
    cls: number
  }
}

export function PerformanceMonitor({
  enabled = process.env.NODE_ENV === 'development',
  position = 'bottom-right',
  threshold = { lcp: 2500, fid: 100, cls: 0.1 }
}: PerformanceMonitorProps) {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    lcp: null,
    fid: null,
    cls: null,
    ttfb: null,
    fcp: null
  })
  const [isVisible, setIsVisible] = useState(enabled)

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return

    // Track LCP (Largest Contentful Paint)
    const observeLCP = () => {
      if (!('PerformanceObserver' in window)) return
      
      try {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries()
          const lastEntry = entries[entries.length - 1] as PerformanceEntry
          setMetrics(prev => ({ ...prev, lcp: lastEntry.startTime }))
        })
        observer.observe({ entryTypes: ['largest-contentful-paint'] as any })
      } catch (e) {
        console.log('LCP observation not supported')
      }
    }

    // Track FID (First Input Delay)
    const observeFID = () => {
      if (!('PerformanceObserver' in window)) return
      
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const fid = (entry as any).processingStart - entry.startTime
            setMetrics(prev => ({ ...prev, fid }))
          }
        })
        observer.observe({ entryTypes: ['first-input'] as any })
      } catch (e) {
        console.log('FID observation not supported')
      }
    }

    // Track CLS (Cumulative Layout Shift)
    const observeCLS = () => {
      if (!('PerformanceObserver' in window)) return
      
      let clsValue = 0
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              clsValue += (entry as any).value
            }
          }
          setMetrics(prev => ({ ...prev, cls: clsValue }))
        })
        observer.observe({ entryTypes: ['layout-shift'] as any })
      } catch (e) {
        console.log('CLS observation not supported')
      }
    }

    // Track TTFB and FCP from navigation timing
    const observeNavigation = () => {
      if (document.readyState === 'complete') {
        calculateNavigationMetrics()
      } else {
        window.addEventListener('load', calculateNavigationMetrics)
      }
    }

    const calculateNavigationMetrics = () => {
      const timing = performance.timing
      const ttfb = timing.responseStart - timing.navigationStart
      const fcp = timing.domContentLoadedEventStart - timing.navigationStart
      
      setMetrics(prev => ({ ...prev, ttfb, fcp }))
    }

    // Initialize all observers
    observeLCP()
    observeFID()
    observeCLS()
    observeNavigation()

    // Keyboard shortcut to toggle visibility (Ctrl+Shift+P)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        e.preventDefault()
        setIsVisible(prev => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('load', calculateNavigationMetrics)
    }
  }, [enabled])

  if (!isVisible) return null

  const positionStyles = {
    'bottom-right': { bottom: '16px', right: '16px' },
    'bottom-left': { bottom: '16px', left: '16px' },
    'top-right': { top: '16px', right: '16px' },
    'top-left': { top: '16px', left: '16px' }
  }

  const getMetricColor = (value: number | null, type: 'lcp' | 'fid' | 'cls') => {
    if (value === null) return 'text-gray-400'
    const limit = threshold[type]
    if (value <= limit) return 'text-green-500'
    if (value <= limit * 2) return 'text-yellow-500'
    return 'text-red-500'
  }

  const formatMetric = (value: number | null, unit = 'ms') => {
    if (value === null) return '-'
    if (unit === 'ms') return `${Math.round(value)}ms`
    return value.toFixed(3)
  }

  return (
    <div
      className="fixed z-50 bg-slate-900 border border-slate-700 rounded-lg p-3 shadow-lg text-xs font-mono"
      style={positionStyles[position]}
    >
      <div className="flex justify-between items-center mb-2 border-b border-slate-700 pb-1">
        <span className="font-bold text-slate-200">Performance</span>
        <button
          onClick={() => setIsVisible(false)}
          className="text-slate-400 hover:text-slate-200 ml-2"
        >
          ×
        </button>
      </div>
      <div className="space-y-1">
        <div className="flex justify-between gap-4">
          <span className="text-slate-400">LCP:</span>
          <span className={getMetricColor(metrics.lcp, 'lcp')}>
            {formatMetric(metrics.lcp)}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-400">FID:</span>
          <span className={getMetricColor(metrics.fid, 'fid')}>
            {formatMetric(metrics.fid)}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-400">CLS:</span>
          <span className={getMetricColor(metrics.cls, 'cls')}>
            {formatMetric(metrics.cls, '')}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-400">TTFB:</span>
          <span className="text-slate-300">
            {formatMetric(metrics.ttfb)}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-400">FCP:</span>
          <span className="text-slate-300">
            {formatMetric(metrics.fcp)}
          </span>
        </div>
      </div>
      <div className="mt-2 text-[10px] text-slate-500">
        Press Ctrl+Shift+P to toggle
      </div>
    </div>
  )
}

export default PerformanceMonitor
