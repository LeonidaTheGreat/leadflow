import React, { Suspense, lazy } from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import { PostHogProvider } from '@/components/PostHogProvider'
import { LandingPage } from '@/components/LandingPage'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { logger } from '@/lib/logger'
import { injectGA4Script } from '@/lib/ga4'

// Inject GA4 script as early as possible (non-blocking, async)
injectGA4Script()

// Lazy load heavy components for code splitting
const AgentOnboardingWizard = lazy(() => import('@/components/onboarding/AgentOnboardingWizard'))
const ExperimentDashboard = lazy(() => import('@/components/ExperimentDashboard'))
const HealthDashboard = lazy(() => import('@/components/HealthDashboard'))

// Loading fallback component
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  )
}

// Simple router based on URL hash
function App() {
  const [route, setRoute] = React.useState(window.location.hash.slice(1) || 'landing')
  const [pageLoadTime, setPageLoadTime] = React.useState<number | null>(null)

  // Track initial page load performance
  React.useEffect(() => {
    if (typeof window !== 'undefined' && 'performance' in window) {
      const timing = performance.timing
      const loadTime = timing.loadEventEnd - timing.navigationStart
      setPageLoadTime(loadTime)
      
      // Log performance using structured logger
      logger.info('Initial page load completed', 'Performance', { loadTimeMs: loadTime })
      
      // Mark dashboard load time for monitoring
      if (loadTime > 2000) {
        logger.warn('Slow initial load detected', 'Performance', { loadTimeMs: loadTime })
      }
    }
  }, [])

  React.useEffect(() => {
    const handleHashChange = () => {
      const startTime = performance.now()
      setRoute(window.location.hash.slice(1) || 'landing')
      
      // Track route change timing
      requestAnimationFrame(() => {
        const duration = performance.now() - startTime
        logger.debug('Route change completed', 'Router', { 
          route: window.location.hash.slice(1),
          durationMs: Math.round(duration)
        })
      })
    }
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  const navigateTo = (path: string) => {
    window.location.hash = path
  }

  // Track page views with performance data
  React.useEffect(() => {
    logger.info('Page view', 'Analytics', { 
      route,
      initialLoadMs: pageLoadTime 
    })
  }, [route, pageLoadTime])

  switch (route) {
    case 'onboarding':
      return (
        <Suspense fallback={<PageLoader />}>
          <ErrorBoundary context="Onboarding">
            <AgentOnboardingWizard />
          </ErrorBoundary>
        </Suspense>
      )
    case 'experiments':
      return (
        <Suspense fallback={<PageLoader />}>
          <ErrorBoundary context="Experiments">
            <ExperimentDashboard />
          </ErrorBoundary>
        </Suspense>
      )
    case 'health':
      return (
        <Suspense fallback={<PageLoader />}>
          <ErrorBoundary context="HealthDashboard">
            <HealthDashboard onBack={() => navigateTo('landing')} />
          </ErrorBoundary>
        </Suspense>
      )
    case 'landing':
    default:
      return (
        <ErrorBoundary context="Landing">
          <LandingPage 
            onGetStarted={() => navigateTo('onboarding')} 
          />
        </ErrorBoundary>
      )
  }
}

// Performance monitoring component
function PerformanceMonitor({ children }: { children: React.ReactNode }) {
  React.useEffect(() => {
    // Core Web Vitals monitoring
    if ('web-vitals' in window || typeof window !== 'undefined') {
      // LCP (Largest Contentful Paint)
      const observeLCP = () => {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries()
          const lastEntry = entries[entries.length - 1]
          const lcp = Math.round(lastEntry.startTime)
          
          logger.debug('LCP measured', 'Performance', { lcpMs: lcp })
          
          // Send to analytics if > 2.5s (poor LCP)
          if (lastEntry.startTime > 2500) {
            logger.warn('Poor LCP detected', 'Performance', { lcpMs: lcp })
          }
        })
        observer.observe({ entryTypes: ['largest-contentful-paint'] as any })
      }
      
      // FID (First Input Delay)
      const observeFID = () => {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const fid = Math.round((entry as any).processingStart - entry.startTime)
            logger.debug('FID measured', 'Performance', { fidMs: fid })
          }
        })
        observer.observe({ entryTypes: ['first-input'] as any })
      }
      
      // CLS (Cumulative Layout Shift)
      let clsValue = 0
      const observeCLS = () => {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              clsValue += (entry as any).value
            }
          }
          logger.debug('CLS updated', 'Performance', { cls: Number(clsValue.toFixed(4)) })
        })
        observer.observe({ entryTypes: ['layout-shift'] as any })
      }
      
      // Initialize observers
      try {
        observeLCP()
        observeFID()
        observeCLS()
      } catch (e) {
        logger.debug('Web Vitals API not fully supported', 'Performance')
      }
    }
    
    // Monitor long tasks
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            logger.warn('Long task detected', 'Performance', { 
              durationMs: Math.round(entry.duration) 
            })
          }
        })
        observer.observe({ entryTypes: ['longtask'] as any })
      } catch (e) {
        // Long task observer not supported
      }
    }
  }, [])
  
  return <>{children}</>
}

// Global error handlers
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    logger.fatal('Unhandled error', event.error, 'Global', {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    })
  })

  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason instanceof Error 
      ? event.reason 
      : new Error(String(event.reason))
    logger.fatal('Unhandled promise rejection', error, 'Global')
  })
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary context="AppRoot">
      <PerformanceMonitor>
        <PostHogProvider>
          <App />
        </PostHogProvider>
      </PerformanceMonitor>
    </ErrorBoundary>
  </React.StrictMode>,
)
