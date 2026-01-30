import { Component } from 'react';
import { AlertTriangle } from 'lucide-react';

/**
 * Feature-level Error Boundary
 *
 * A lighter-weight error boundary for individual features/routes.
 * Unlike the app-level ErrorBoundary, this:
 * - Doesn't report to backend (to avoid noise from isolated crashes)
 * - Provides a simpler UI focused on the specific feature
 * - Allows other features to continue working
 *
 * Usage:
 * <FeatureErrorBoundary name="notes">
 *   <NotesPage />
 * </FeatureErrorBoundary>
 */
export default class FeatureErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log to console for debugging
    console.error(`Feature error in ${this.props.name || 'unknown'}:`, error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
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
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <div className="p-3 rounded-full bg-warning/10 mb-4">
            <AlertTriangle className="w-12 h-12 text-warning" />
          </div>

          <h2 className="text-lg font-semibold text-text mb-2">
            Something went wrong
          </h2>

          <p className="text-muted mb-4 max-w-md">
            {this.props.message || 'This section encountered an error. Try refreshing the page.'}
          </p>

          {/* Show error details in development */}
          {import.meta.env.DEV && this.state.error && (
            <details className="w-full max-w-lg mb-4 text-left">
              <summary className="text-xs text-muted cursor-pointer hover:text-text">
                Error details
              </summary>
              <pre className="mt-2 p-3 bg-surface rounded text-xs text-red-400 overflow-x-auto whitespace-pre-wrap">
                {this.state.error.toString()}
              </pre>
            </details>
          )}

          <div className="flex gap-3">
            <button
              onClick={this.handleReset}
              className="px-4 py-2 text-sm rounded-lg border border-border hover:border-primary/50 text-text transition-colors"
            >
              Try again
            </button>

            <button
              onClick={this.handleReload}
              className="px-4 py-2 text-sm rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
