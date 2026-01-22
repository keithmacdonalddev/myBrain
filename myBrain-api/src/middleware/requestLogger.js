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
 * requestLogger(req, res, next) - Log All API Requests
 * ======================================================
 * This middleware logs comprehensive information about every API request
 * for debugging, analytics, and audit purposes.
 *
 * WHAT IS REQUEST LOGGING?
 * -----------------------
 * Request logging records what happened during each API call:
 * - Who made the request (user ID, email, role)
 * - What was requested (method, URL, body)
 * - What was the result (status code, duration, errors)
 * - Context info (IP address, user agent, request ID)
 *
 * WHY LOG REQUESTS?
 * ----------------
 * 1. DEBUGGING: "This user says they can't create notes" → Find their requests in logs
 * 2. PERFORMANCE: Track slow requests, identify bottlenecks
 * 3. SECURITY: Detect suspicious patterns (brute force, unauthorized access)
 * 4. AUDIT: Who deleted this content? When? From where?
 * 5. SUPPORT: Customer reports error → Find request in logs with exact details
 *
 * REQUEST ID:
 * -----------
 * Every request gets a unique ID (e.g., "req_abc123xyz").
 * This ID:
 * - Appears in error responses → Client can report it to support
 * - Appears in response headers (X-Request-Id) → Client can log it
 * - Appears in log entries → Links all related operations
 * - Makes finding your specific request among millions possible
 *
 * HOW IT WORKS:
 * 1. Generate unique request ID at start
 * 2. Capture start time (for duration)
 * 3. Override res.end() to capture when response is sent
 * 4. When response is sent, build comprehensive log data
 * 5. Send log data to logWideEvent() asynchronously
 *
 * LOG DATA CAPTURED:
 * - requestId: Unique identifier for this request
 * - method: HTTP method (GET, POST, PUT, DELETE)
 * - route: URL path requested
 * - statusCode: HTTP response status
 * - durationMs: How long request took (in milliseconds)
 * - userId: User who made request (if authenticated)
 * - userRole: User's role (admin, user, etc.)
 * - userEmail: User's email (if authenticated)
 * - entityIds: IDs of entities touched (notes, tasks, users, etc.)
 * - error: Error info (if any error occurred)
 * - eventName: Custom event name (for important operations)
 * - clientInfo: IP address, user agent, origin
 * - metadata: Query params, request body, response size, mutations
 *
 * ASYNCHRONOUS LOGGING:
 * --------------------
 * Logging happens asynchronously (fire-and-forget) so it doesn't slow
 * down responses. This means:
 * - Response sent immediately
 * - Logging happens in background
 * - If logging fails, it doesn't break the request
 *
 * @param {Request} req - Express request object
 *   - Will attach: req.requestId, req.entityIds
 * @param {Response} res - Express response object
 *   - Will modify: res.end to capture when response is sent
 * @param {Function} next - Express next function
 *
 * ATTACHES TO REQUEST:
 * - req.requestId: Unique ID like "req_V1StGXR8_Z5jdHi6E"
 * - req.entityIds: Object for collecting entity IDs: { noteId: '123', userId: '456' }
 *
 * EXAMPLE USAGE:
 * ```javascript
 * // In Express app setup (at the beginning, before routes):
 * app.use(requestLogger);  // All requests get logged
 *
 * // In a route handler, attach entity IDs:
 * router.post('/notes', requireAuth, async (req, res) => {
 *   const note = await Note.create({ userId: req.user._id, ...req.body });
 *
 *   // Attach entity IDs so they appear in logs
 *   req.entityIds.noteId = note._id;
 *   req.entityIds.userId = req.user._id;
 *
 *   // Log will include: { entityIds: { noteId: '123', userId: '456' } }
 *   res.json(note);
 * });
 * ```
 *
 * MATCHING LOG ENTRIES:
 * --------------------
 * To find a specific request in logs, client can provide the request ID:
 * Customer: "I got error with request ID req_abc123"
 * Admin: Searches logs for "req_abc123" → Finds exact request and error
 */
export function requestLogger(req, res, next) {
  // =========================================================================
  // STEP 1: GENERATE UNIQUE REQUEST ID
  // =========================================================================
  // Each request gets a unique ID for tracking through logs
  // Format: "req_" + 16 random characters
  // Example: "req_V1StGXR8_Z5jdHi6E"

  req.requestId = `req_${nanoid(16)}`;

  // =========================================================================
  // STEP 2: ADD REQUEST ID TO RESPONSE HEADERS
  // =========================================================================
  // Frontend can read this header and log it for debugging
  // If user encounters error, they can report: "Error with request ID req_abc123"

  res.setHeader('X-Request-Id', req.requestId);

  // =========================================================================
  // STEP 3: CAPTURE START TIME
  // =========================================================================
  // Record when request started so we can calculate duration later

  const startTime = Date.now();

  // =========================================================================
  // STEP 4: PREPARE TO OVERRIDE res.end
  // =========================================================================
  // We'll override res.end() to capture when the response is actually sent.
  // This lets us log the final status code and duration.

  const originalEnd = res.end;

  // =========================================================================
  // STEP 5: INITIALIZE ENTITY ID COLLECTION
  // =========================================================================
  // Routes can populate this with IDs of entities they work with
  // Example: req.entityIds.noteId = noteId
  // These will appear in logs for easier searching

  req.entityIds = {};

  // =========================================================================
  // STEP 6: OVERRIDE res.end TO CAPTURE RESPONSE
  // =========================================================================

  /**
   * Express calls res.end() when it's ready to send the response.
   * We override it to run our logging code at that moment.
   * This lets us capture:
   * - The final HTTP status code
   * - The exact duration of the request
   * - Any errors that occurred
   *
   * IMPORTANT: We restore the original res.end immediately to avoid
   * infinite loops (if we didn't, calling res.end inside would override
   * our override again).
   */
  res.end = function(chunk, encoding) {
    // Restore original end function immediately
    // (Important: do this BEFORE calling res.end())
    res.end = originalEnd;

    // Call original end to actually send the response
    // This is what Express expects
    res.end(chunk, encoding);

    // =========================================================================
    // CALCULATE REQUEST DURATION
    // =========================================================================

    const durationMs = Date.now() - startTime;

    // =========================================================================
    // SKIP LOGGING FOR CERTAIN PATHS
    // =========================================================================
    // Some paths are high-frequency and not useful for debugging:
    // - /health: Health check endpoints (run every second)
    // - /favicon.ico: Browser requests favicon (noise)
    // - /_next: Next.js internals (development only)

    const skipPaths = ['/health', '/favicon.ico', '/_next'];
    if (skipPaths.some(path => req.path.startsWith(path))) {
      return;  // Skip logging and exit
    }

    // =========================================================================
    // SANITIZE REQUEST BODY
    // =========================================================================
    /**
     * Remove sensitive fields from request body before logging.
     * We want to log request details for debugging, but NOT passwords!
     *
     * We replace sensitive fields with '[REDACTED]' so logs don't
     * contain passwords, API keys, etc.
     */
    const sanitizeBody = (body) => {
      // Return null if body is empty or not an object
      if (!body || typeof body !== 'object') return null;

      // Create a shallow copy to avoid modifying the original request
      const sanitized = { ...body };

      // List of sensitive field names to redact
      const sensitiveFields = [
        'password',        // User password
        'newPassword',     // Password change
        'currentPassword', // Current password
        'token',           // Auth tokens
        'secret',          // Secrets
        'apiKey'           // API keys
      ];

      // Replace each sensitive field with [REDACTED]
      sensitiveFields.forEach(field => {
        if (field in sanitized) sanitized[field] = '[REDACTED]';
      });

      return sanitized;
    };

    // =========================================================================
    // BUILD LOG DATA
    // =========================================================================
    // Collect all information about this request into a single object
    // This is the "wide event" - one comprehensive log per request

    const logData = {
      // ===== REQUEST IDENTIFICATION =====
      // These help you find and link log entries

      requestId: req.requestId,                    // Unique ID for this request
      method: req.method,                          // GET, POST, PUT, DELETE, etc.
      route: req.originalUrl || req.url,           // Full URL path (including query string)

      // ===== RESPONSE INFO =====
      // What happened when we processed the request?

      statusCode: res.statusCode,                  // HTTP response code (200, 404, 500, etc.)
      durationMs,                                  // How long it took (in milliseconds)

      // ===== USER INFO (if authenticated) =====
      // Who made this request?

      userId: req.user?._id || null,               // User ID (set by requireAuth)
      userRole: req.user?.role || null,            // User's role (admin, user, etc.)
      userEmail: req.user?.email || null,          // User's email
      featureFlags: req.user?.flags ? Object.fromEntries(req.user.flags) : {},

      // ===== ENTITY IDS =====
      // Which resources were touched by this request?
      // Routes populate req.entityIds with: { noteId: '123', userId: '456' }

      entityIds: req.entityIds || {},

      // ===== ERROR INFO =====
      // Did anything go wrong?

      error: req.error || null,

      // ===== CUSTOM EVENT NAME =====
      // Routes can set req.eventName for important operations
      // Example: 'note.archive.success' or 'user.banned'

      eventName: req.eventName || null,

      // ===== CLIENT INFORMATION =====
      // Where did the request come from?

      clientInfo: {
        ip: req.ip || req.connection?.remoteAddress || null,
        userAgent: req.get('User-Agent') || null,  // Browser/app info
        origin: req.get('Origin') || null          // Domain that made request
      },

      // ===== ADDITIONAL METADATA =====
      // Extra information for debugging

      metadata: {
        // Query parameters (if any)
        // Example: /notes?limit=10&sort=created
        query: Object.keys(req.query).length > 0 ? req.query : undefined,

        // Response size in bytes
        contentLength: res.get('Content-Length') || null,

        // Request body (for mutation operations only)
        // Only log body for POST, PUT, PATCH, DELETE
        // Don't log body for GET (GET requests don't have bodies)
        requestBody: ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)
          ? sanitizeBody(req.body)
          : undefined,

        // Mutation context (before/after state)
        // Routes can set req.mutation with before/after data
        // Example: { before: { status: 'pending' }, after: { status: 'done' } }
        mutation: req.mutation || undefined
      }
    };

    // =========================================================================
    // SEND LOG DATA ASYNCHRONOUSLY (FIRE AND FORGET)
    // =========================================================================
    // Log the request without waiting for logging to complete.
    // This prevents logging from slowing down responses.
    //
    // How this works:
    // 1. Response is sent immediately (via res.end())
    // 2. logWideEvent() is called to store the log asynchronously
    // 3. If logging fails, we catch it and log the error (but don't fail request)

    logWideEvent(logData).catch(err => {
      // Logging failed, but request already went out
      // Log the logging error so we know something's wrong
      console.error('Logging error:', err.message);
    });
  };

  // =========================================================================
  // CONTINUE TO NEXT MIDDLEWARE/ROUTE
  // =========================================================================
  // Everything is set up. Continue to the next middleware or route handler.

  next();
}

// =============================================================================
// HELPER: ATTACH ENTITY ID
// =============================================================================

/**
 * attachEntityId(req, type, id) - Attach Entity ID to Request for Logging
 * =========================================================================
 * This helper function attaches entity IDs to the request so they appear
 * in logs. This makes it easy to search logs by entity: "Show me all
 * operations that touched note 507f1f77bcf86cd799439011".
 *
 * WHAT ARE ENTITY IDS?
 * -------------------
 * Entity IDs are the IDs of records your route operates on:
 * - noteId: The note being created/updated/deleted
 * - userId: The user being operated on
 * - taskId: The task being worked with
 * - projectId: The project being accessed
 * - etc.
 *
 * WHY TRACK ENTITY IDS?
 * --------------------
 * When debugging or troubleshooting:
 * - User says: "My note disappeared"
 * - Admin searches logs: entityIds.noteId = "abc123"
 * - Finds: All operations on that note (create, update, delete, etc.)
 * - Can see: Who accessed it, when, what changed
 * - Result: Quickly identifies what happened and who did it
 *
 * WIDE EVENTS PATTERN:
 * This is part of the Wide Events logging pattern (loggingsucks.com).
 * One comprehensive log entry per request with all context.
 *
 * @param {Request} req - Express request object
 *   - Will modify: req.entityIds
 *
 * @param {string} type - Type/name of entity ID
 *   Common values:
 *   - 'noteId': A note's ID
 *   - 'userId': A user's ID
 *   - 'taskId': A task's ID
 *   - 'projectId': A project's ID
 *   - 'conversationId': A message conversation ID
 *   - 'imageId': An image's ID
 *
 * @param {string|ObjectId} id - The entity's actual ID value
 *   - Can be a string or MongoDB ObjectId
 *   - Function converts ObjectId to string automatically
 *   - Handles null/undefined gracefully
 *
 * EXAMPLE USAGE:
 * ```javascript
 * // In a route handler that archives a note:
 * router.put('/notes/:id/archive', requireAuth, async (req, res) => {
 *   const note = await Note.findById(req.params.id);
 *
 *   if (!note) {
 *     throw new AppError('Note not found', 404, 'NOTE_NOT_FOUND');
 *   }
 *
 *   // Attach entity IDs for logging
 *   attachEntityId(req, 'noteId', note._id);
 *   attachEntityId(req, 'userId', req.user._id);
 *
 *   // Set event name for analytics
 *   req.eventName = 'note.archive.success';
 *
 *   // Later, requestLogger will log:
 *   // {
 *   //   eventName: 'note.archive.success',
 *   //   entityIds: { noteId: '507f1f77bcf86cd799439011', userId: '507f1f77bcf86cd799439012' },
 *   //   method: 'PUT',
 *   //   route: '/notes/507f1f77bcf86cd799439011/archive',
 *   //   statusCode: 200,
 *   //   ...
 *   // }
 *
 *   const archived = await note.archive();
 *   res.json(archived);
 * });
 *
 * // Later, admin can search logs:
 * // "Show all operations on noteId 507f1f77bcf86cd799439011"
 * // Finds: create, update, archive (whoever did what when)
 * ```
 *
 * LOGGING PATTERNS:
 * ----------------
 * When you modify an entity, attach:
 * 1. The entity being modified (noteId, userId, etc.)
 * 2. The user doing the modification (userId from req.user)
 * 3. Any other related entity (projectId if modifying task in project)
 *
 * This makes logs searchable by any entity involved in the operation.
 */
export function attachEntityId(req, type, id) {
  // =========================================================================
  // INITIALIZE ENTITY IDS OBJECT (if needed)
  // =========================================================================
  // The first time this is called, req.entityIds might not exist
  // Create it if needed

  if (!req.entityIds) {
    req.entityIds = {};
  }

  // =========================================================================
  // ATTACH ENTITY ID
  // =========================================================================
  // Convert to string (in case it's a MongoDB ObjectId)
  // ObjectId's toString() method returns the string representation
  // Optional chaining (?.) handles null/undefined gracefully

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
