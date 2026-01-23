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
// CONSOLE LOGGING - Verbose Terminal Output for Development
// =============================================================================
/**
 * This section provides colorized console logging for development.
 *
 * WHY CONSOLE LOGGING?
 * -------------------
 * The Wide Events system (logWideEvent) stores logs in MongoDB for analytics
 * and debugging, but you can't see what's happening in real-time during
 * development. Console logging shows every request as it happens.
 *
 * LOG LEVELS:
 * -----------
 * Controlled by LOG_LEVEL environment variable:
 * - none (0): Silent - no console output (production default)
 * - minimal (1): Just request line: "POST /api/notes 201 142ms"
 * - normal (2): + user, event name, entity IDs
 * - verbose (3): + request body, mutations, query params, errors
 *
 * COLOR CODING:
 * -------------
 * - Green: Success (2xx)
 * - Yellow: Client errors (4xx)
 * - Red: Server errors (5xx)
 * - Cyan: Slow requests (>1 second)
 * - Magenta: Mutations (state changes)
 * - Dim: Metadata (user, entities, body)
 *
 * EXAMPLE OUTPUT (verbose):
 * -------------------------
 * POST /api/notes 201 142ms
 *   user: user@example.com
 *   event: note.create.success
 *   entities: { noteId: 507f... }
 *   body: { title: "My Note", content: "..." }
 */

// =============================================================================
// ANSI COLOR CODES
// =============================================================================
/**
 * ANSI escape codes for terminal colors.
 * These work in most terminals (macOS, Linux, Windows Terminal, VS Code).
 *
 * HOW ANSI COLORS WORK:
 * --------------------
 * ANSI codes are special character sequences that terminals interpret
 * as formatting instructions rather than text to display.
 *
 * Format: \x1b[<code>m
 * - \x1b is the escape character (ESC)
 * - [ starts the control sequence
 * - <code> is the color/style number
 * - m ends the sequence
 *
 * EXAMPLE:
 * console.log('\x1b[32mGreen text\x1b[0m Normal text')
 *            ↑ Start green  ↑ Text    ↑ Reset to normal
 */
const colors = {
  reset: '\x1b[0m',      // Reset all styles back to normal
  dim: '\x1b[2m',        // Dim/faded text (for metadata)
  green: '\x1b[32m',     // Success (2xx responses)
  yellow: '\x1b[33m',    // Client errors (4xx responses)
  red: '\x1b[31m',       // Server errors (5xx responses)
  cyan: '\x1b[36m',      // Slow requests (>1 second)
  magenta: '\x1b[35m'    // Mutations/state changes
};

// =============================================================================
// LOG LEVEL CONFIGURATION
// =============================================================================
/**
 * LOG_LEVEL controls how much detail is shown in console output.
 *
 * Set in .env file:
 *   LOG_LEVEL=verbose   # Full detail during development
 *   LOG_LEVEL=minimal   # Just request lines
 *   LOG_LEVEL=none      # Silent (production)
 *
 * Or override temporarily:
 *   LOG_LEVEL=verbose npm run dev
 *
 * LEVELS:
 * - 0 (none): No output - current production behavior
 * - 1 (minimal): Just the request line
 * - 2 (normal): + user, event, entities
 * - 3 (verbose): + body, mutations, query, errors
 */
/**
 * Get the current log level from environment.
 * This is a function (not a constant) so it reads the env var at runtime,
 * AFTER dotenv.config() has been called in server.js.
 */
const getLogLevel = () => process.env.LOG_LEVEL || 'none';
const LOG_LEVELS = { none: 0, minimal: 1, normal: 2, verbose: 3 };

// =============================================================================
// CONSOLE LOGGING HELPER FUNCTIONS
// =============================================================================

/**
 * getStatusColor(statusCode) - Get Terminal Color for HTTP Status
 * ================================================================
 * Returns the appropriate ANSI color code based on HTTP status code.
 *
 * COLOR MAPPING:
 * - 2xx (Success): Green - Everything worked
 * - 4xx (Client Error): Yellow - Client sent bad request
 * - 5xx (Server Error): Red - Server failed
 * - Other: No color (reset)
 *
 * @param {number} statusCode - HTTP status code (200, 404, 500, etc.)
 * @returns {string} ANSI color code
 *
 * EXAMPLE:
 * getStatusColor(200) → '\x1b[32m' (green)
 * getStatusColor(404) → '\x1b[33m' (yellow)
 * getStatusColor(500) → '\x1b[31m' (red)
 */
function getStatusColor(statusCode) {
  // Server errors (5xx) - Something went wrong on our end
  if (statusCode >= 500) return colors.red;

  // Client errors (4xx) - Bad request, not found, unauthorized, etc.
  if (statusCode >= 400) return colors.yellow;

  // Success (2xx) - Request completed successfully
  if (statusCode >= 200 && statusCode < 300) return colors.green;

  // Other status codes (1xx, 3xx) - No special color
  return colors.reset;
}

/**
 * formatDuration(ms) - Format Request Duration with Slow Highlighting
 * ====================================================================
 * Formats request duration in milliseconds, highlighting slow requests
 * in cyan to make them stand out.
 *
 * WHAT IS "SLOW"?
 * --------------
 * Requests taking more than 1 second (1000ms) are considered slow
 * and are highlighted. This helps spot performance issues quickly.
 *
 * @param {number} ms - Duration in milliseconds
 * @returns {string} Formatted duration string, with cyan color if slow
 *
 * EXAMPLE:
 * formatDuration(142) → '142ms'
 * formatDuration(1500) → '\x1b[36m1500ms\x1b[0m' (cyan)
 */
function formatDuration(ms) {
  const text = `${ms}ms`;
  // Highlight slow requests (>1 second) in cyan
  return ms > 1000 ? `${colors.cyan}${text}${colors.reset}` : text;
}

/**
 * truncate(str, maxLen) - Truncate Long Strings for Display
 * ==========================================================
 * Cuts off long strings and adds "..." to prevent log lines from
 * becoming unreadable when request bodies are large.
 *
 * @param {string} str - String to potentially truncate
 * @param {number} maxLen - Maximum length before truncating (default: 100)
 * @returns {string} Original string or truncated with "..."
 *
 * EXAMPLE:
 * truncate('short', 100) → 'short'
 * truncate('very long text...', 10) → 'very long ...'
 */
function truncate(str, maxLen = 100) {
  // Return as-is if null, undefined, or short enough
  if (!str || str.length <= maxLen) return str;
  // Truncate and add ellipsis
  return str.slice(0, maxLen) + '...';
}

/**
 * formatTimestamp() - Get Current Time as Formatted String
 * =========================================================
 * Returns a timestamp string for log output in HH:MM:SS.mmm format.
 * Uses 24-hour time for clarity in logs.
 *
 * @returns {string} Formatted timestamp like "14:32:05.123"
 *
 * EXAMPLE OUTPUT:
 * "09:15:42.567" - 9:15 AM, 42 seconds, 567 milliseconds
 * "23:59:01.012" - 11:59 PM, 1 second, 12 milliseconds
 */
function formatTimestamp() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const ms = String(now.getMilliseconds()).padStart(3, '0');
  return `${hours}:${minutes}:${seconds}.${ms}`;
}

/**
 * logToConsole(logData) - Print Request to Terminal
 * ==================================================
 * Main console logging function. Outputs colorized request information
 * to the terminal based on the configured LOG_LEVEL.
 *
 * HOW IT WORKS:
 * 1. Check LOG_LEVEL - if 'none', exit immediately
 * 2. Print request line (method, URL, status, duration) - minimal level
 * 3. Print user/event/entities - normal level
 * 4. Print body/mutations/query/errors - verbose level
 *
 * OUTPUT FORMAT:
 * --------------
 * POST /api/notes 201 142ms
 *   user: user@example.com
 *   event: note.create.success
 *   entities: { noteId: 507f... }
 *   body: { title: "My Note" }
 *   mutation: status: pending → completed
 *
 * @param {Object} logData - The same data object passed to logWideEvent
 *   - method: HTTP method (GET, POST, PUT, DELETE)
 *   - route: Request URL
 *   - statusCode: HTTP response status
 *   - durationMs: Request duration
 *   - userEmail: User's email (if authenticated)
 *   - eventName: Custom event name (if set by route)
 *   - entityIds: Object of entity IDs { noteId, taskId, etc. }
 *   - error: Error object (if any)
 *   - metadata: { query, requestBody, mutation }
 */
function logToConsole(logData) {
  // =========================================================================
  // CHECK LOG LEVEL
  // =========================================================================
  // Convert string level to number, default to 0 (none)
  // Use getLogLevel() to read env var at runtime (after dotenv.config() has run)
  const level = LOG_LEVELS[getLogLevel()] || 0;

  // If level is 0 (none), don't output anything
  if (level === 0) return;

  // =========================================================================
  // EXTRACT DATA FROM LOG OBJECT
  // =========================================================================
  const {
    method,       // HTTP method: GET, POST, PUT, DELETE
    route,        // Full URL path: /api/notes?limit=10
    statusCode,   // HTTP status: 200, 404, 500
    durationMs,   // Time taken: 142
    userEmail,    // User email: user@example.com
    eventName,    // Custom event: note.create.success
    entityIds,    // Entity IDs: { noteId: '507f...' }
    error,        // Error info: { code, messageSafe }
    metadata      // Extra data: { query, requestBody, mutation }
  } = logData;

  // =========================================================================
  // LEVEL 1 (MINIMAL): REQUEST LINE
  // =========================================================================
  // Always shown if level >= 1
  // Format: [14:32:05.123] POST /api/notes 201 142ms [ERROR]

  const timestamp = `${colors.dim}[${formatTimestamp()}]${colors.reset}`;
  const statusColor = getStatusColor(statusCode);
  const errorTag = statusCode >= 400 ? ` ${colors.red}[ERROR]${colors.reset}` : '';

  console.log(
    `${timestamp} ${statusColor}${method}${colors.reset} ${route} ` +
    `${statusColor}${statusCode}${colors.reset} ${formatDuration(durationMs)}${errorTag}`
  );

  // If minimal level, stop here
  if (level < 2) return;

  // =========================================================================
  // LEVEL 2 (NORMAL): USER, EVENT, ENTITIES
  // =========================================================================
  // Shows who made the request and what resources were touched

  // User email (if authenticated)
  if (userEmail) {
    console.log(`${colors.dim}  user: ${userEmail}${colors.reset}`);
  }

  // Custom event name (if set by route)
  if (eventName) {
    console.log(`${colors.dim}  event: ${eventName}${colors.reset}`);
  }

  // Entity IDs (noteId, taskId, userId, etc.)
  if (entityIds && Object.keys(entityIds).length > 0) {
    const ids = Object.entries(entityIds)
      .map(([key, value]) => `${key}: ${truncate(String(value), 24)}`)
      .join(', ');
    console.log(`${colors.dim}  entities: { ${ids} }${colors.reset}`);
  }

  // If normal level, stop here
  if (level < 3) return;

  // =========================================================================
  // LEVEL 3 (VERBOSE): BODY, MUTATIONS, QUERY, ERRORS
  // =========================================================================
  // Full detail for debugging

  // Query parameters
  if (metadata?.query && Object.keys(metadata.query).length > 0) {
    console.log(`${colors.dim}  query: ${JSON.stringify(metadata.query)}${colors.reset}`);
  }

  // Request body (already sanitized - passwords removed)
  if (metadata?.requestBody && Object.keys(metadata.requestBody).length > 0) {
    const bodyStr = JSON.stringify(metadata.requestBody);
    console.log(`${colors.dim}  body: ${truncate(bodyStr, 200)}${colors.reset}`);
  }

  // Mutation context (before/after state)
  if (metadata?.mutation) {
    const { before, after } = metadata.mutation;
    // Show what changed: "status: pending → completed"
    const changes = Object.keys(after || {})
      .map(key => `${key}: ${before?.[key]} → ${after[key]}`)
      .join(', ');
    console.log(`${colors.magenta}  mutation: ${changes}${colors.reset}`);
  }

  // Error details
  if (error) {
    console.log(`${colors.red}  error: ${error.code || 'UNKNOWN'} - ${error.messageSafe || error.message}${colors.reset}`);
  }

  // Blank line between requests for readability
  console.log('');
}

// =============================================================================
// EXPORT FOR USE IN OTHER MODULES
// =============================================================================
/**
 * Export logToConsole and related utilities so WebSocket and other
 * modules can use the same logging style.
 */
export { logToConsole, colors, getLogLevel, LOG_LEVELS, truncate, formatTimestamp };

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
    // LOG TO CONSOLE (DEVELOPMENT)
    // =========================================================================
    // Print colorized request info to terminal based on LOG_LEVEL.
    // This runs synchronously but is fast (just console.log).

    logToConsole(logData);

    // =========================================================================
    // SEND LOG DATA TO MONGODB ASYNCHRONOUSLY (FIRE AND FORGET)
    // =========================================================================
    // Log the request without waiting for logging to complete.
    // This prevents logging from slowing down responses.
    //
    // How this works:
    // 1. Response is sent immediately (via res.end())
    // 2. logToConsole() prints to terminal (if LOG_LEVEL is set)
    // 3. logWideEvent() stores the log in MongoDB asynchronously
    // 4. If MongoDB logging fails, we catch it and log the error

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
