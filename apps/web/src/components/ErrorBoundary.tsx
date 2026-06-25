"use client"

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    })

    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error Boundary caught an error:', error, errorInfo)
    }

    // TODO: Send error to error tracking service (e.g., Sentry)
    // Sentry.captureException(error, { contexts: { react: { componentStack: errorInfo.componentStack } } })
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
  }

  handleGoHome = () => {
    window.location.href = '/dashboard'
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback component
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-card border border-border rounded-2xl shadow-island-lg p-8">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-6">
                <AlertTriangle className="w-8 h-8 text-destructive" />
              </div>

              <h1 className="text-2xl font-bold text-foreground mb-2">
                Something went wrong
              </h1>

              <p className="text-muted-foreground mb-6">
                An unexpected error occurred. We've been notified and are working to fix it.
              </p>

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="w-full text-left mb-6">
                  <summary className="cursor-pointer text-sm font-semibold text-foreground mb-2 hover:text-primary transition-colors">
                    Error Details (Development Only)
                  </summary>
                  <div className="bg-muted p-4 rounded-lg text-xs font-mono text-muted-foreground overflow-auto max-h-48">
                    <div className="mb-2">
                      <span className="font-semibold text-foreground">Error:</span>
                      <pre className="mt-1 whitespace-pre-wrap break-all">{this.state.error.toString()}</pre>
                    </div>
                    {this.state.errorInfo && (
                      <div>
                        <span className="font-semibold text-foreground">Component Stack:</span>
                        <pre className="mt-1 whitespace-pre-wrap break-all">{this.state.errorInfo.componentStack}</pre>
                      </div>
                    )}
                  </div>
                </details>
              )}

              <div className="flex gap-3 w-full">
                <button
                  onClick={this.handleReset}
                  className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2.5 rounded-lg font-semibold transition-colors"
                >
                  <RefreshCw size={18} />
                  Try Again
                </button>
                <button
                  onClick={this.handleGoHome}
                  className="flex-1 flex items-center justify-center gap-2 bg-muted text-foreground hover:bg-muted/80 px-4 py-2.5 rounded-lg font-semibold transition-colors"
                >
                  <Home size={18} />
                  Go to Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
