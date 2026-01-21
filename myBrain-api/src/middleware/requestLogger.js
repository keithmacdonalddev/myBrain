/**
 * =============================================================================
 * REQUESTLOGGER.JS - API Request Logging Middleware
 * =============================================================================
 *
 * This file provides middleware for logging all API requests with detailed
 * information for debugging, analytics, and audit purposes.
 *
 * WHAT IS REQUEST LOGGING?
 * ------------------------
 * Request logging records information about every API request:
 * - What was requested (method, URL, body)
 * - Who requested it (user ID, email, role)
 * - What happened (status code, duration, errors)
 * - Context (IP address, user agent, request ID)
 *
 * WHY LOG REQUESTS?
 * -----------------
 * 1. DEBUGGING: Track down issues with specific requests
 * 2. MONITORING: See API usage patterns and performance
 * 3. SECURITY: Detect suspicious activity or abuse
 * 4. AUDIT: Track who did what and when
 * 5. SUPPORT: Help users by finding their specific requests
 *
 * REQUEST ID:
 * -----------
 * Every request gets a unique ID (e.g., "req_abc123xyz").
 * This ID:
 * - Appears in error responses (for support tickets)
 * - Is included in log entries
 * - Is sent in response headers (X-Request-Id)
 * - Links all related log entries together
 *
 * LOG DATA CAPTURED:
 * ------------------
 * - requestId: Unique identifier for this request
 * - method: HTTP method (GET, POST, PUT, DELETE)
 * - route: URL path requested
 * - statusCode: HTTP response status
 * - durationMs: How long the request took
 * - userId: Who made the request (if authenticated)
 * - error: Any error that occurred
 * - clientInfo: IP, user agent, origin
 *
 * =============================================================================
 */

// =============================================================================
// IMPORTS
// =============================================================================

/**
 * nanoid generates short, unique, URL-friendly IDs.
 * Used to create request IDs like "req_V1StGXR8_Z5jdHi"
 */
import { nanoid } from 'nanoid';

/**
 * logWideEvent is our custom logging function that stores logs
 * in MongoDB with tail sampling (not every log is stored).
 */
import { logWideEvent } from '../utils/logger.js';

// =============================================================================
// REQUEST LOGGER MIDDLEWARE
// =============================================================================

/**
 * requestLogger(req, res, next)
 * -----------------------------
 * Main middleware function that adds request ID and logs request details.
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {Function} next - Express next function
 *
 * HOW IT WORKS:
 * 1. Generate unique request ID
 * 2. Capture start time
 * 3. Override res.end to capture when response finishes
 * 4. When response ends, calculate duration and log everything
 *
 * ATTACHES TO REQUEST:
 * - req.requestId: Unique ID for this request
 * - req.entityIds: Object to collect entity IDs (notes, tasks, etc.)
 */
export function requestLogger(req, res, next) {
  // =========================================================================
  // SETUP
  // =========================================================================

  // Generate unique request ID (16 characters, prefixed with "req_")
  // Example: "req_V1StGXR8_Z5jdHi6E"
  req.requestId = `req_${nanoid(16)}`;

  // Add request ID to response headers for client-side debugging
  res.setHeader('X-Request-Id', req.requestId);

  // Capture start time for duration calculation
  const startTime = Date.now();

  // Store original res.end function (we'll override it)
  const originalEnd = res.end;

  // Initialize object to collect entity IDs during the request
  // Routes can add IDs like: req.entityIds.noteId = note._id
  req.entityIds = {};

  // =========================================================================
  // OVERRIDE res.end TO LOG ON RESPONSE
  // =========================================================================

  /**
   * We override res.end to capture when the response is actually sent.
   * This lets us log the final status code and duration.
   */
  res.end = function(chunk, encoding) {
    // Restore original end function immediately
    res.end = originalEnd;

    // Call original end to actually send the response
    res.end(chunk, encoding);

    // Calculate how long the request took
    const durationMs = Date.now() - startTime;

    // =========================================================================
    // SKIP LOGGING FOR CERTAIN PATHS
    // =========================================================================

    // Don't log health checks, favicon, or Next.js internals
    // These are high-frequency and not useful for debugging
    const skipPaths = ['/health', '/favicon.ico', '/_next'];
    if (skipPaths.some(path => req.path.startsWith(path))) {
      return;
    }

    // =========================================================================
    // SANITIZE REQUEST BODY
    // =========================================================================

    /**
     * Remove sensitive fields from request body before logging.
     * We want to log request details for debugging, but NOT passwords!
     */
    const sanitizeBody = (body) => {
      if (!body || typeof body !== 'object') return null;

      // Create a copy to avoid modifying the original
      const sanitized = { ...body };

      // List of sensitive fields to redact
      const sensitiveFields = [
        'password',
        'newPassword',
        'currentPassword',
        'token',
        'secret',
        'apiKey'
      ];

      // Replace sensitive values with [REDACTED]
      sensitiveFields.forEach(field => {
        if (field in sanitized) sanitized[field] = '[REDACTED]';
      });

      return sanitized;
    };

    // =========================================================================
    // BUILD LOG DATA
    // =========================================================================

    const logData = {
      // Request identification
      requestId: req.requestId,
      method: req.method,                          // GET, POST, PUT, DELETE
      route: req.originalUrl || req.url,           // Full URL path

      // Response info
      statusCode: res.statusCode,                  // 200, 404, 500, etc.
      durationMs,                                  // How long it took

      // User info (if authenticated)
      userId: req.user?._id || null,
      userRole: req.user?.role || null,
      userEmail: req.user?.email || null,
      featureFlags: req.user?.flags ? Object.fromEntries(req.user.flags) : {},

      // Entity IDs collected during the request
      entityIds: req.entityIds || {},

      // Error info (if any error occurred)
      error: req.error || null,

      // Custom event name (routes can set this for analytics)
      eventName: req.eventName || null,

      // Client information
      clientInfo: {
        ip: req.ip || req.connection?.remoteAddress || null,
        userAgent: req.get('User-Agent') || null,
        origin: req.get('Origin') || null
      },

      // Additional metadata
      metadata: {
        // Query parameters (if any)
        query: Object.keys(req.query).length > 0 ? req.query : undefined,

        // Response size
        contentLength: res.get('Content-Length') || null,

        // Request body for mutations (sanitized)
        // Only log body for POST, PUT, PATCH, DELETE - not GET
        requestBody: ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)
          ? sanitizeBody(req.body)
          : undefined,

        // Mutation context (before/after state) if route provided it
        mutation: req.mutation || undefined
      }
    };

    // =========================================================================
    // LOG ASYNCHRONOUSLY
    // =========================================================================

    // Don't wait for logging to complete - fire and forget
    // This prevents logging from slowing down responses
    logWideEvent(logData).catch(err => {
      console.error('Logging error:', err.message);
    });
  };

  // Continue to the next middleware/route
  next();
}

// =============================================================================
// HELPER: ATTACH ENTITY ID
// =============================================================================

/**
 * attachEntityId(req, type, id)
 * -----------------------------
 * Helper function to attach entity IDs to the request for logging.
 * Call this in route handlers when you work with specific entities.
 *
 * @param {Request} req - Express request object
 * @param {string} type - Type of entity (e.g., 'noteId', 'taskId', 'userId')
 * @param {string|ObjectId} id - The entity's ID
 *
 * EXAMPLE:
 * // In a route handler:
 * const note = await Note.findById(noteId);
 * attachEntityId(req, 'noteId', note._id);
 * attachEntityId(req, 'userId', note.userId);
 *
 * // These will appear in logs as:
 * // entityIds: { noteId: '507f1f77bcf86cd799439011', userId: '507f1f77bcf86cd799439012' }
 *
 * WHY USE THIS?
 * When debugging, you can search logs by entity ID:
 * "Show me all requests that touched note 507f1f77bcf86cd799439011"
 */
export function attachEntityId(req, type, id) {
  // Initialize entityIds if not already present
  if (!req.entityIds) {
    req.entityIds = {};
  }

  // Convert ObjectId to string if needed
  req.entityIds[type] = id?.toString();
}

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

/**
 * Export the request logger middleware.
 *
 * USAGE IN EXPRESS APP:
 *
 * import requestLogger from './middleware/requestLogger.js';
 *
 * // Apply to all routes (early in middleware chain)
 * app.use(requestLogger);
 */
export default requestLogger;
