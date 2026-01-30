import { Component } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { logsApi } from '../../lib/api';

/**
 * Error Boundary Component
 *
 * Catches React rendering errors and reports them to the backend.
 * Displays a fallback UI when an error occurs.
 *
 * Props:
 * - name: Identifier for the boundary (used in error reporting)
 * - message: Custom error message to display
 * - fallback: Custom fallback UI (overrides default)
 * - size: 'full' | 'section' | 'widget' | 'inline' - controls min-height of fallback
 *
 * Size variants:
 * - full: min-h-screen - for app-level errors
 * - section: min-h-[300px] - for page sections (default)
 * - widget: min-h-[150px] - for dashboard widgets
 * - inline: no min-height - for inline components
 */

// Size variant classes for fallback container
const sizeClasses = {
  full: 'min-h-screen',
  section: 'min-h-[300px]',
  widget: 'min-h-[150px]',
  inline: '',
};

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });

    // Report to backend
    this.reportError(error, errorInfo);
  }

  async reportError(error, errorInfo) {
    try {
      await logsApi.reportClientError({
        errorType: 'react_boundary',
        message: error?.message || 'React component error',
        stack: error?.stack,
        componentStack: errorInfo?.componentStack,
        url: window.location.href,
        userAgent: navigator.userAgent,
        metadata: {
          boundaryName: this.props.name || 'unnamed',
          timestamp: new Date().toISOString()
        }
      });
    } catch (err) {
      console.warn('Failed to report error to server:', err.message);
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      // Get size class from props, default to 'section'
      const sizeClass = sizeClasses[this.props.size] || sizeClasses.section;

      return (
        <div className={`flex flex-col items-center justify-center p-8 bg-bg rounded-lg border border-border ${sizeClass}`}>
          <div className="p-3 rounded-full bg-red-500/10 mb-4">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>

          <h2 className="text-lg font-semibold text-text mb-2">
            Something went wrong
          </h2>

          <p className="text-sm text-muted text-center mb-4 max-w-md">
            {this.props.message || 'An unexpected error occurred. The error has been reported automatically.'}
          </p>

          {import.meta.env.DEV && this.state.error && (
            <details className="w-full max-w-lg mb-4">
              <summary className="text-xs text-muted cursor-pointer hover:text-text">
                Error details
              </summary>
              <pre className="mt-2 p-3 bg-surface rounded text-xs text-red-400 overflow-x-auto">
                {this.state.error.toString()}
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>
          )}

          <div className="flex gap-3">
            <button
              onClick={this.handleRetry}
              className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg border border-border hover:border-primary/50 text-text transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Try again
            </button>

            <button
              onClick={this.handleReload}
              className="px-4 py-2 text-sm rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors"
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
