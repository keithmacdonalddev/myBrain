import { Component } from 'react';
import { AlertTriangle } from 'lucide-react';

/**
 * Widget-level Error Boundary
 *
 * Compact error UI for dashboard widgets - doesn't crash other widgets.
 * Designed to be less intrusive than feature-level error boundaries.
 *
 * Props:
 * - name: Identifier for debugging (shown in console)
 * - children: The widget content to wrap
 *
 * Usage:
 * <WidgetErrorBoundary name="tasks-widget">
 *   <TasksWidget ... />
 * </WidgetErrorBoundary>
 */
export default class WidgetErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log to console for debugging - widgets don't report to backend to avoid noise
    console.error(`Widget error in ${this.props.name || 'unknown'}:`, error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full min-h-[120px] p-4 text-center">
          <AlertTriangle className="w-6 h-6 text-warning mb-2" />
          <p className="text-sm text-muted mb-2">Widget unavailable</p>
          <button
            onClick={this.handleRetry}
            className="text-xs text-primary hover:underline"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
