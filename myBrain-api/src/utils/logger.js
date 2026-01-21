/**
 * =============================================================================
 * LOGGER.JS - Wide Event Logging System
 * =============================================================================
 *
 * This file implements a comprehensive logging system that records important
 * events happening in the application. Think of it as a "flight recorder"
 * that keeps track of:
 *
 * - Every API request made to the server
 * - Errors that occur
 * - How long operations take
 * - Who made the request (user info)
 * - What action was performed
 *
 * WHY LOGGING MATTERS:
 * - Debugging: Find out what went wrong when there's a bug
 * - Analytics: Understand how users use the application
 * - Security: Detect suspicious activity
 * - Performance: Find slow operations that need optimization
 *
 * WIDE EVENTS PATTERN:
 * This logger uses the "wide events" pattern, which means each log entry
 * contains ALL relevant context about a request in a single record.
 * This makes it easy to understand what happened without joining data.
 *
 * TAIL SAMPLING:
 * To avoid filling up the database with logs, we use "tail sampling":
 * - 100% of errors are logged (important to track)
 * - 100% of slow requests are logged (need to optimize)
 * - 100% of admin actions are logged (security)
 * - Only X% of normal requests are logged randomly
 *
 * =============================================================================
 */

// =============================================================================
// IMPORTS
// =============================================================================

/**
 * Import the Log model which defines the structure of log entries
 * in the MongoDB database.
 */
import Log from '../models/Log.js';

// =============================================================================
// CONFIGURATION
// =============================================================================

/**
 * LOG_SAMPLE_RATE: What percentage of normal requests to log (0.1 = 10%)
 * - 1.0 would log everything (100%)
 * - 0.1 logs 10% of normal requests
 * - This can be configured via environment variable
 */
const LOG_SAMPLE_RATE = parseFloat(process.env.LOG_SAMPLE_RATE) || 0.1;

/**
 * LOG_SLOW_MS: How long (in milliseconds) before a request is considered "slow"
 * - Default is 1000ms (1 second)
 * - Slow requests are always logged for performance analysis
 */
const LOG_SLOW_MS = parseInt(process.env.LOG_SLOW_MS) || 1000;

// =============================================================================
// SAMPLING LOGIC
// =============================================================================

/**
 * Determine Whether a Log Entry Should Be Saved
 * ---------------------------------------------
 * This function decides if a particular request/event should be logged.
 * We don't log everything to avoid database bloat, but we ALWAYS log
 * important events like errors, admin actions, and slow requests.
 *
 * @param {Object} logData - Information about the request/event
 * @returns {Object} - { shouldLog: boolean, reason: string|null }
 *
 * PRIORITY ORDER (highest to lowest):
 * 1. Errors (4xx and 5xx status codes) - Always logged
 * 2. Admin endpoints - Always logged for audit trail
 * 3. Mutations (POST, PUT, DELETE) - Always logged for activity tracking
 * 4. Auth events (login/logout) - Always logged for security
 * 5. Slow requests - Always logged for performance monitoring
 * 6. Debug-flagged users - Always logged for troubleshooting
 * 7. Random sampling - Only logged if selected randomly
 */
function shouldSample(logData) {
  // -----------------------------------------
  // RULE 1: Always log errors (4xx and 5xx)
  // -----------------------------------------
  // Status codes 400-499 are client errors (bad request, unauthorized, etc.)
  // Status codes 500-599 are server errors (internal error, service unavailable)
  // These are crucial for debugging problems
  if (logData.statusCode >= 400) {
    return { shouldLog: true, reason: 'error' };
  }

  // -----------------------------------------
  // RULE 2: Always log admin endpoints
  // -----------------------------------------
  // Admin actions are sensitive and should always be recorded
  // for security auditing and compliance
  if (logData.route && (logData.route.startsWith('/api/admin') || logData.route.startsWith('/admin'))) {
    return { shouldLog: true, reason: 'admin' };
  }

  // -----------------------------------------
  // RULE 3: Always log mutations
  // -----------------------------------------
  // Mutations are actions that change data:
  // - POST: Creating new data
  // - PUT/PATCH: Updating existing data
  // - DELETE: Removing data
  // These are important user actions that should be tracked
  const mutationMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
  if (mutationMethods.includes(logData.method?.toUpperCase())) {
    return { shouldLog: true, reason: 'mutation' };
  }

  // -----------------------------------------
  // RULE 4: Always log authentication events
  // -----------------------------------------
  // Login and logout events are security-sensitive
  // and should always be recorded
  if (logData.eventName?.includes('auth') || logData.eventName?.includes('login') || logData.eventName?.includes('logout')) {
    return { shouldLog: true, reason: 'auth' };
  }

  // -----------------------------------------
  // RULE 5: Always log slow requests
  // -----------------------------------------
  // If a request takes longer than LOG_SLOW_MS (default 1 second),
  // it's logged so we can identify performance issues
  if (logData.durationMs >= LOG_SLOW_MS) {
    return { shouldLog: true, reason: 'slow' };
  }

  // -----------------------------------------
  // RULE 6: Always log debug-flagged users
  // -----------------------------------------
  // Some users may have a debug flag enabled in their feature flags
  // This allows detailed logging for specific users when troubleshooting
  if (logData.featureFlags && logData.featureFlags['debug.logging']) {
    return { shouldLog: true, reason: 'debug_user' };
  }

  // -----------------------------------------
  // RULE 7: Random sampling for everything else
  // -----------------------------------------
  // For normal successful GET requests, we only log a percentage
  // Math.random() returns a number between 0 and 1
  // If it's less than LOG_SAMPLE_RATE (0.1), we log it
  if (Math.random() < LOG_SAMPLE_RATE) {
    return { shouldLog: true, reason: 'random' };
  }

  // -----------------------------------------
  // DEFAULT: Don't log this request
  // -----------------------------------------
  return { shouldLog: false, reason: null };
}

// =============================================================================
// EVENT NAME GENERATION
// =============================================================================

/**
 * Generate a Descriptive Event Name from Request Details
 * -----------------------------------------------------
 * Creates a human-readable event name like "notes.create.success"
 * or "auth.login.failed" from the request details.
 *
 * @param {string} method - HTTP method (GET, POST, PUT, DELETE)
 * @param {string} route - The URL path (/notes/123)
 * @param {number} statusCode - HTTP response status (200, 404, 500)
 * @param {Error|null} error - Error object if an error occurred
 * @returns {string} - Event name like "notes.read.success"
 *
 * EVENT NAME FORMAT: {resource}.{action}.{result}
 * Examples:
 * - notes.create.success
 * - auth.login.failed
 * - tasks.update.error
 */
function generateEventName(method, route, statusCode, error) {
  // Normalize the route by replacing IDs with placeholders
  // This groups similar routes together in analytics
  // Example: "/notes/507f1f77bcf86cd799439011" becomes "/notes/:id"
  const normalizedRoute = route
    .replace(/\/[a-f0-9]{24}/gi, '/:id') // MongoDB ObjectId (24 hex characters)
    .replace(/\/[0-9]+/g, '/:id');        // Numeric IDs

  // Extract the resource name from the route
  // "/notes/search" -> "notes"
  // "/auth/login" -> "auth"
  const resource = normalizedRoute.split('/')[1] || 'root';

  // Get the action based on HTTP method
  const action = getActionFromMethod(method);

  // Determine the result based on error/status
  if (error) {
    return `${resource}.${action}.failed`;
  }

  if (statusCode >= 400) {
    return `${resource}.${action}.error`;
  }

  return `${resource}.${action}.success`;
}

/**
 * Convert HTTP Method to Action Name
 * ----------------------------------
 * Maps HTTP methods to semantic action names.
 *
 * @param {string} method - HTTP method
 * @returns {string} - Action name
 *
 * MAPPING:
 * - GET -> read (retrieving data)
 * - POST -> create (creating new data)
 * - PUT/PATCH -> update (modifying data)
 * - DELETE -> delete (removing data)
 */
function getActionFromMethod(method) {
  switch (method.toUpperCase()) {
    case 'GET': return 'read';
    case 'POST': return 'create';
    case 'PUT':
    case 'PATCH': return 'update';
    case 'DELETE': return 'delete';
    default: return 'request';
  }
}

// =============================================================================
// ERROR CATEGORIZATION
// =============================================================================

/**
 * Categorize an Error Based on HTTP Status Code
 * ---------------------------------------------
 * Assigns a category to errors for easier analysis and filtering.
 *
 * @param {number} statusCode - HTTP status code
 * @param {string} errorCode - Optional error code from the error object
 * @returns {string} - Error category
 *
 * CATEGORIES:
 * - validation: Bad request data (400)
 * - auth: Authentication failed (401)
 * - permission: Access denied (403)
 * - notFound: Resource doesn't exist (404)
 * - conflict: Conflicting data (409)
 * - rateLimit: Too many requests (429)
 * - server: Internal server error (500+)
 * - unknown: Other errors
 */
function categorizeError(statusCode, errorCode) {
  if (statusCode === 400) return 'validation';  // Bad request - invalid input
  if (statusCode === 401) return 'auth';        // Unauthorized - not logged in
  if (statusCode === 403) return 'permission';  // Forbidden - not allowed
  if (statusCode === 404) return 'notFound';    // Not found - doesn't exist
  if (statusCode === 409) return 'conflict';    // Conflict - duplicate data
  if (statusCode === 429) return 'rateLimit';   // Too many requests
  if (statusCode >= 500) return 'server';       // Server error - bug or outage
  return 'unknown';
}

// =============================================================================
// MAIN LOGGING FUNCTION
// =============================================================================

/**
 * Log a Wide Event (HTTP Request)
 * --------------------------------
 * This is the main logging function called after each HTTP request.
 * It creates a comprehensive log entry with all relevant context.
 *
 * @param {Object} eventData - All data about the request
 * @param {string} eventData.requestId - Unique ID for this request
 * @param {string} eventData.method - HTTP method (GET, POST, etc.)
 * @param {string} eventData.route - URL path
 * @param {number} eventData.statusCode - HTTP response status
 * @param {number} eventData.durationMs - How long the request took
 * @param {string} eventData.userId - ID of the logged-in user (if any)
 * @param {string} eventData.userRole - User's role (admin, user, etc.)
 * @param {string} eventData.userEmail - User's email
 * @param {Object} eventData.featureFlags - User's feature flags
 * @param {Object} eventData.entityIds - IDs of entities involved (noteId, taskId, etc.)
 * @param {Error} eventData.error - Error object if an error occurred
 * @param {Object} eventData.clientInfo - Browser/device information
 * @param {Object} eventData.metadata - Additional custom data
 * @param {string} eventData.eventName - Optional custom event name
 *
 * @returns {Object|null} - The saved log entry, or null if not logged
 */
export async function logWideEvent(eventData) {
  try {
    // Destructure all the data from the event
    const {
      requestId,      // Unique identifier for tracing this request
      method,         // HTTP method (GET, POST, etc.)
      route,          // URL path (/notes, /tasks/123)
      statusCode,     // Response status (200, 404, 500)
      durationMs,     // Time taken in milliseconds
      userId,         // Who made the request
      userRole,       // Their role (admin, user)
      userEmail,      // Their email for easy identification
      featureFlags,   // What features they have access to
      entityIds,      // IDs of resources involved
      error,          // Error details if something went wrong
      clientInfo,     // Browser, OS, device info
      metadata,       // Any extra data
      eventName: providedEventName  // Custom event name (optional)
    } = eventData;

    // -----------------------------------------
    // STEP 1: Determine if we should log this
    // -----------------------------------------
    const { shouldLog, reason } = shouldSample(eventData);

    if (!shouldLog) {
      return null; // Skip logging this request
    }

    // -----------------------------------------
    // STEP 2: Generate or use provided event name
    // -----------------------------------------
    const eventName = providedEventName || generateEventName(method, route, statusCode, error);

    // -----------------------------------------
    // STEP 3: Build the log entry
    // -----------------------------------------
    const logEntry = new Log({
      // Request identification
      requestId,
      timestamp: new Date(),

      // Request details
      route,
      method: method.toUpperCase(),
      statusCode,
      durationMs,

      // User information
      userId: userId || null,
      userRole: userRole || null,
      userEmail: userEmail || null,
      featureFlags: featureFlags || {},

      // Related entities (what was accessed/modified)
      entityIds: entityIds || {},

      // Error information (if any)
      error: error ? {
        category: categorizeError(statusCode, error.code),
        code: error.code || null,
        name: error.name || null,
        messageSafe: error.message || null,  // Safe to display message
        // Only include stack trace in development (not production)
        stack: process.env.NODE_ENV !== 'production' ? error.stack : null,
        context: error.context || null  // Additional debugging info
      } : null,

      // Client/browser information
      clientInfo: clientInfo || {},

      // Event classification
      eventName,
      sampled: true,           // This entry was selected for logging
      sampleReason: reason,    // Why it was logged (error, slow, random, etc.)

      // Additional metadata
      metadata: metadata || {}
    });

    // -----------------------------------------
    // STEP 4: Save to database asynchronously
    // -----------------------------------------
    // We don't wait for this to complete to avoid slowing down responses
    await logEntry.save();

    return logEntry;
  } catch (err) {
    // -----------------------------------------
    // ERROR HANDLING: Don't let logging break the app
    // -----------------------------------------
    // If logging fails, we just print to console and continue
    // The user's request should still succeed even if logging fails
    console.error('Failed to write log:', err.message);
    return null;
  }
}

// =============================================================================
// CUSTOM EVENT LOGGING
// =============================================================================

/**
 * Log a Custom Event (Not Tied to HTTP Request)
 * ---------------------------------------------
 * Use this to log events that aren't HTTP requests, such as:
 * - Background jobs completing
 * - Scheduled tasks running
 * - Internal system events
 * - Custom business events
 *
 * @param {string} eventName - Name of the event (e.g., "email.sent.success")
 * @param {Object} data - Additional data about the event
 * @param {string} data.requestId - Optional request ID for correlation
 * @param {string} data.route - Optional route (defaults to '/internal')
 * @param {number} data.durationMs - How long the operation took
 * @param {string} data.userId - User associated with the event
 * @param {string} data.userRole - User's role
 * @param {Error} data.error - Error if the event failed
 * @param {Object} data.metadata - Additional custom data
 *
 * @returns {Object|null} - The saved log entry, or null on error
 *
 * EXAMPLE USAGE:
 * ```
 * await logEvent('email.welcome.sent', {
 *   userId: user._id,
 *   metadata: { emailType: 'welcome', recipient: user.email }
 * });
 * ```
 */
export async function logEvent(eventName, data = {}) {
  try {
    // Build a log entry for the custom event
    const logEntry = new Log({
      // Generate a unique ID if not provided (prefixed with 'evt_')
      requestId: data.requestId || `evt_${Date.now()}`,
      timestamp: new Date(),

      // Use '/internal' as the route for non-HTTP events
      route: data.route || '/internal',
      method: 'POST',  // Custom events are treated as POST

      // Status: 500 if error, 200 if success
      statusCode: data.error ? 500 : 200,
      durationMs: data.durationMs || 0,

      // User info
      userId: data.userId || null,
      userRole: data.userRole || null,

      // Event classification
      eventName,
      sampled: true,
      sampleReason: 'always',  // Custom events are always logged

      // Error details if provided
      error: data.error ? {
        category: 'internal',
        code: data.error.code || 'INTERNAL_ERROR',
        messageSafe: data.error.message || 'Internal error',
        stack: process.env.NODE_ENV !== 'production' ? data.error.stack : null
      } : null,

      // Additional data
      metadata: data.metadata || {}
    });

    await logEntry.save();
    return logEntry;
  } catch (err) {
    // Don't let logging errors break the application
    console.error('Failed to log event:', err.message);
    return null;
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

/**
 * Export the logging functions and utilities.
 *
 * AVAILABLE FUNCTIONS:
 * - logWideEvent: Log HTTP requests with full context
 * - logEvent: Log custom internal events
 * - shouldSample: Check if a log should be saved (for testing)
 * - categorizeError: Get error category from status code (for testing)
 */
export default {
  logWideEvent,
  logEvent,
  shouldSample,
  categorizeError
};
