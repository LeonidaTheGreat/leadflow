'use client'

import React from 'react'
import { PostHogEvents } from './posthog-config'

// Use window.posthog (loaded via PostHogProvider) instead of importing posthog-js directly.
// This avoids a build error when posthog-js isn't in package.json and matches
// the SSR-safe pattern used in lib/analytics/index.ts.
function captureEvent(event: string, properties?: Record<string, any>) {
  if (typeof window !== 'undefined' && (window as any).posthog) {
    (window as any).posthog.capture(event, properties)
  }
}

interface Props {
  children: React.ReactNode
  fallback?: React.ReactNode
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: React.ErrorInfo
}

/**
 * PostHog Error Boundary
 * 
 * Catches React errors and reports them to PostHog analytics.
 * Usage: Wrap your app or specific components with this boundary.
 * 
 * ```tsx
 * <PostHogErrorBoundary fallback={<ErrorFallback />}>
 *   <YourComponent />
 * </PostHogErrorBoundary>
 * ```
 */
export class PostHogErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to console
    console.error('[PostHog Error Boundary] Caught error:', error, errorInfo)

    // Report to PostHog
    try {
      captureEvent(PostHogEvents.ERROR_BOUNDARY_CAUGHT, {
        error_message: error.message,
        error_stack: error.stack,
        error_name: error.name,
        component_stack: errorInfo.componentStack,
        url: typeof window !== 'undefined' ? window.location.href : '',
        timestamp: new Date().toISOString(),
      })
    } catch (analyticsError) {
      console.error('[PostHog Error Boundary] Failed to report error:', analyticsError)
    }
  }

  render() {
    if (this.state.hasError) {
      // Return custom fallback UI if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
          <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 text-center">
            <div className="text-6xl mb-4">😕</div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
              Something went wrong
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              We&apos;ve been notified and are working to fix the issue.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-md transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

/**
 * Error Boundary with Reset Functionality
 * 
 * Allows users to try recovering from errors without reloading the page.
 */
export class RecoverableErrorBoundary extends React.Component<
  Props & { onReset?: () => void },
  State
> {
  constructor(props: Props & { onReset?: () => void }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[Recoverable Error Boundary] Caught error:', error, errorInfo)

    try {
      captureEvent(PostHogEvents.ERROR_BOUNDARY_CAUGHT, {
        error_message: error.message,
        error_stack: error.stack,
        error_name: error.name,
        component_stack: errorInfo.componentStack,
        url: typeof window !== 'undefined' ? window.location.href : '',
        recoverable: true,
        timestamp: new Date().toISOString(),
      })
    } catch (analyticsError) {
      console.error('[Recoverable Error Boundary] Failed to report error:', analyticsError)
    }

    this.setState({ errorInfo })
  }

  handleReset = () => {
    this.props.onReset?.()
    this.setState({ hasError: false, error: undefined, errorInfo: undefined })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
          <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 text-center">
            <div className="text-6xl mb-4">🔧</div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
              Oops! Something broke
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              An error occurred in this component. You can try to recover or reload the page.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleReset}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-md transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-900 dark:text-white font-medium rounded-md transition-colors"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
