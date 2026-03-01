import React, { Component, ErrorInfo, ReactNode } from 'react'
import { logger } from '@/lib/logger'
import { LeadFlowError } from '@/lib/errors'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  context?: string
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

/**
 * Error Boundary Component
 * 
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI instead of crashing.
 * 
 * Usage:
 * ```tsx
 * <ErrorBoundary fallback={<ErrorPage />} context="Dashboard">
 *   <Dashboard />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo })

    const context = this.props.context || 'ErrorBoundary'
    
    // Log the error with structured logging
    logger.error(
      `React error caught in ${context}`,
      error,
      context,
      {
        componentStack: errorInfo.componentStack,
        isLeadFlowError: error instanceof LeadFlowError,
        errorName: error.name,
      }
    )

    // Call optional error handler
    this.props.onError?.(error, errorInfo)
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // Custom fallback UI provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default error UI
      return <DefaultErrorView error={this.state.error} onRetry={this.handleRetry} />
    }

    return this.props.children
  }
}

/**
 * Default error view component
 */
interface DefaultErrorViewProps {
  error: Error | null
  onRetry: () => void
}

function DefaultErrorView({ error, onRetry }: DefaultErrorViewProps): JSX.Element {
  const isOperationalError = error instanceof LeadFlowError && error.isOperational
  
  return (
    <div className="min-h-[400px] flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg
            className="w-10 h-10 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        
        <h2 className="text-2xl font-bold text-gray-900 mb-3">
          Something went wrong
        </h2>
        
        <p className="text-gray-600 mb-6">
          {isOperationalError 
            ? error?.message 
            : "We're sorry, but something unexpected happened. Our team has been notified."}
        </p>

        {process.env.NODE_ENV === 'development' && error && (
          <div className="mb-6 p-4 bg-gray-100 rounded-lg text-left overflow-auto">
            <p className="text-sm font-mono text-red-600 mb-2">{error.name}: {error.message}</p>
            <pre className="text-xs text-gray-700 whitespace-pre-wrap">
              {error.stack}
            </pre>
          </div>
        )}

        <div className="flex gap-3 justify-center">
          <button
            onClick={onRetry}
            className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            Try Again
          </button>
          <button
            onClick={() => window.location.href = '/'}
            className="px-6 py-2.5 bg-background border border-border rounded-lg font-medium hover:bg-muted transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Section Error Boundary - for wrapping specific sections of the app
 */
interface SectionErrorBoundaryProps {
  children: ReactNode
  sectionName: string
  fallback?: ReactNode
}

export function SectionErrorBoundary({ 
  children, 
  sectionName, 
  fallback 
}: SectionErrorBoundaryProps): JSX.Element {
  return (
    <ErrorBoundary 
      context={sectionName}
      fallback={fallback || <SectionErrorFallback sectionName={sectionName} />}
    >
      {children}
    </ErrorBoundary>
  )
}

/**
 * Section-specific error fallback
 */
function SectionErrorFallback({ sectionName }: { sectionName: string }): JSX.Element {
  return (
    <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
      <h3 className="text-lg font-semibold text-red-800 mb-2">
        {sectionName} Unavailable
      </h3>
      <p className="text-sm text-red-700">
        This section encountered an error. Please refresh the page or try again later.
      </p>
    </div>
  )
}

/**
 * Async Error Boundary - for handling async errors in components
 */
export function useAsyncError() {
  const [, setError] = React.useState<Error | null>(null)
  
  return React.useCallback((error: Error) => {
    setError(() => {
      throw error
    })
  }, [])
}

/**
 * HOC to wrap components with error boundary
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
): React.ComponentType<P> {
  const displayName = Component.displayName || Component.name || 'Component'
  
  const WrappedComponent: React.FC<P> = (props) => (
    <ErrorBoundary {...errorBoundaryProps} context={errorBoundaryProps?.context || displayName}>
      <Component {...props} />
    </ErrorBoundary>
  )
  
  WrappedComponent.displayName = `withErrorBoundary(${displayName})`
  
  return WrappedComponent
}
