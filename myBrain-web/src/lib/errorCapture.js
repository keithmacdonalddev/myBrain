import { logsApi } from './api';

/**
 * Frontend Error Capture Utility
 *
 * Captures and reports client-side errors to the backend for visibility.
 * This helps identify issues that don't generate server-side errors.
 */

// Generate a simple session ID for correlating errors
const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Track if already initialized to prevent double-setup
let initialized = false;

// Debounce repeated errors (same message within 5 seconds)
const recentErrors = new Map();
const ERROR_DEBOUNCE_MS = 5000;

function shouldReportError(errorKey) {
  const now = Date.now();
  const lastReport = recentErrors.get(errorKey);

  if (lastReport && now - lastReport < ERROR_DEBOUNCE_MS) {
    return false;
  }

  recentErrors.set(errorKey, now);

  // Clean up old entries
  if (recentErrors.size > 100) {
    const cutoff = now - ERROR_DEBOUNCE_MS;
    for (const [key, time] of recentErrors) {
      if (time < cutoff) recentErrors.delete(key);
    }
  }

  return true;
}

/**
 * Report an error to the backend
 */
async function reportError(errorType, message, details = {}) {
  const errorKey = `${errorType}:${message}`;

  if (!shouldReportError(errorKey)) {
    return; // Skip duplicate errors
  }

  try {
    await logsApi.reportClientError({
      errorType,
      message,
      stack: details.stack || null,
      componentStack: details.componentStack || null,
      url: window.location.href,
      userAgent: navigator.userAgent,
      sessionId,
      metadata: {
        timestamp: new Date().toISOString(),
        ...details.metadata
      }
    });
  } catch (err) {
    // Don't let error reporting break the app
    console.warn('Failed to report error to server:', err.message);
  }
}

/**
 * Initialize global error handlers
 */
export function initErrorCapture() {
  if (initialized) {
    return;
  }
  initialized = true;

  // Capture uncaught errors
  window.onerror = (message, source, lineno, colno, error) => {
    reportError('uncaught_error', String(message), {
      stack: error?.stack,
      metadata: {
        source,
        lineno,
        colno
      }
    });

    // Return false to let the error propagate to console
    return false;
  };

  // Capture unhandled promise rejections
  window.onunhandledrejection = (event) => {
    const error = event.reason;
    const message = error?.message || String(error) || 'Unhandled promise rejection';

    reportError('unhandled_rejection', message, {
      stack: error?.stack,
      metadata: {
        type: error?.name || 'Unknown'
      }
    });
  };

  // Capture React-specific errors via console.error override
  // This catches "Maximum update depth exceeded" and similar React warnings
  const originalConsoleError = console.error;
  console.error = (...args) => {
    // Call original first
    originalConsoleError.apply(console, args);

    // Check for React-specific error patterns
    const message = args.map(arg =>
      typeof arg === 'string' ? arg : (arg?.message || String(arg))
    ).join(' ');

    // Patterns that indicate serious React issues
    const reactErrorPatterns = [
      'Maximum update depth exceeded',
      'Too many re-renders',
      'Cannot update a component',
      'Each child in a list should have a unique',
      'Invalid hook call',
      'Rendered more hooks than during the previous render',
      'Objects are not valid as a React child'
    ];

    const isReactError = reactErrorPatterns.some(pattern =>
      message.includes(pattern)
    );

    if (isReactError) {
      reportError('react_error', message.substring(0, 500), {
        metadata: {
          fullMessage: message.length > 500 ? message : undefined
        }
      });
    }
  };

  console.log('[ErrorCapture] Initialized client-side error reporting');
}

/**
 * Manual error reporting (for use in catch blocks)
 */
export function captureError(error, context = {}) {
  const message = error?.message || String(error);

  reportError('caught_error', message, {
    stack: error?.stack,
    metadata: context
  });
}

/**
 * Report a custom event/warning
 */
export function captureWarning(message, context = {}) {
  reportError('warning', message, {
    metadata: context
  });
}

export default {
  initErrorCapture,
  captureError,
  captureWarning
};
