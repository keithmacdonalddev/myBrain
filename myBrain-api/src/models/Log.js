/**
 * =============================================================================
 * LOG.JS - System Log Data Model
 * =============================================================================
 *
 * This file defines the Log model - the data structure for storing API request
 * logs in myBrain. Logs help track what's happening in the system, debug issues,
 * and monitor performance.
 *
 * WHAT IS A LOG?
 * --------------
 * A log is a record of something that happened in the system. Every time a user
 * makes an API request (like loading notes, creating a task, or logging in),
 * we can create a log entry that records:
 * - What was requested (route, method)
 * - Who made the request (user ID, email)
 * - What happened (success, error, how long it took)
 * - Context (client info, error details)
 *
 * WHY LOGGING MATTERS:
 * --------------------
 * 1. DEBUGGING: When something goes wrong, logs help find out why
 *    - "Why did John's note not save?" → Check logs for that request
 *    - "What error occurred at 3pm yesterday?" → Search logs by time
 *
 * 2. MONITORING: Track system health over time
 *    - "Are there more errors than usual?"
 *    - "Which endpoints are slowest?"
 *    - "How many requests do we get per hour?"
 *
 * 3. SECURITY: Detect suspicious activity
 *    - "Who accessed admin routes?"
 *    - "Were there failed login attempts?"
 *    - "Did someone try to access unauthorized data?"
 *
 * 4. ANALYTICS: Understand usage patterns
 *    - "Which features are most used?"
 *    - "What times are busiest?"
 *    - "How long do users stay logged in?"
 *
 * SAMPLING:
 * ---------
 * We don't log EVERY request (that would be too much data). Instead, we use
 * "tail sampling" - always logging important events (errors, auth) and randomly
 * sampling normal successful requests. The sampleReason field records WHY
 * a particular log was kept.
 *
 * AUTO-DELETION (TTL):
 * --------------------
 * Logs are automatically deleted after a configurable number of days
 * (default 90). This is handled by a MongoDB TTL (Time To Live) index
 * on the timestamp field.
 *
 * =============================================================================
 */

// =============================================================================
// IMPORTS
// =============================================================================

/**
 * Mongoose is the library we use to interact with MongoDB.
 * It provides schemas (blueprints) and models (tools to work with data).
 */
import mongoose from 'mongoose';

// =============================================================================
// LOG SCHEMA DEFINITION
// =============================================================================

/**
 * The Log Schema
 * --------------
 * Defines all the fields a Log document can have.
 */
const logSchema = new mongoose.Schema({

  // ===========================================================================
  // REQUEST IDENTIFICATION
  // ===========================================================================

  /**
   * requestId: Unique identifier for this specific request
   * - Required: Every log must have a unique ID
   * - Unique: No two logs can have the same requestId
   * - Index: Fast lookup by requestId
   *
   * This ID is generated at the start of each request and included in
   * all related logs and error messages. If a user reports "Error X happened",
   * we can use the requestId to find exactly what occurred.
   *
   * EXAMPLE: "req_abc123xyz789"
   */
  requestId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  /**
   * timestamp: When this log was created
   * - Default: Current time
   * - Index: For time-based queries and TTL (auto-deletion)
   *
   * The timestamp is crucial for:
   * - Sorting logs chronologically
   * - Finding logs in a time range
   * - Automatic deletion via TTL index
   */
  timestamp: {
    type: Date,
    default: Date.now
    // Note: index defined via schema.index() below for TTL support
  },

  // ===========================================================================
  // REQUEST INFORMATION
  // ===========================================================================

  /**
   * route: The API endpoint that was called
   * - Required: Every log must record what was requested
   *
   * EXAMPLES:
   * - "/api/notes"
   * - "/api/users/profile"
   * - "/api/auth/login"
   * - "/api/admin/users/123"
   */
  route: {
    type: String,
    required: true
  },

  /**
   * method: The HTTP method used
   * - Required: Every request has a method
   *
   * VALUES:
   * - 'GET': Retrieve data (reading)
   * - 'POST': Create new data
   * - 'PUT': Replace existing data
   * - 'PATCH': Update part of existing data
   * - 'DELETE': Remove data
   * - 'OPTIONS': CORS preflight check
   * - 'HEAD': Check if resource exists
   * - 'CLIENT': Client-side error log (not a real HTTP method)
   */
  method: {
    type: String,
    required: true,
    enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD', 'CLIENT']
  },

  /**
   * statusCode: HTTP response status code
   * - Required: Every completed request has a status
   * - Index: For filtering by success/failure
   *
   * COMMON CODES:
   * - 200: OK (success)
   * - 201: Created (new resource created)
   * - 400: Bad Request (invalid input)
   * - 401: Unauthorized (not logged in)
   * - 403: Forbidden (not allowed)
   * - 404: Not Found
   * - 500: Server Error (something broke)
   */
  statusCode: {
    type: Number,
    required: true,
    index: true
  },

  /**
   * durationMs: How long the request took in milliseconds
   * - Required: Every completed request has a duration
   *
   * Used for performance monitoring.
   * EXAMPLES:
   * - 50: Very fast (typical for simple queries)
   * - 200: Normal (average request)
   * - 1000: Slow (might need optimization)
   * - 5000+: Very slow (potential problem)
   */
  durationMs: {
    type: Number,
    required: true
  },

  // ===========================================================================
  // USER CONTEXT
  // ===========================================================================

  /**
   * userId: Which user made this request (if authenticated)
   * - Optional: Anonymous requests won't have a userId
   * - Index: For finding all requests by a user
   * - References: Points to a User document
   */
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true,
    default: null
  },

  /**
   * userRole: The user's role at the time of the request
   * - Optional: Only present if user is authenticated
   *
   * VALUES: "user", "admin", etc.
   * Useful for security analysis ("Who used admin routes?")
   */
  userRole: {
    type: String,
    default: null
  },

  /**
   * userEmail: The user's email at the time of the request
   * - Optional: Only present if user is authenticated
   *
   * Stored for convenience - makes logs easier to read without
   * needing to look up the user document.
   */
  userEmail: {
    type: String,
    default: null
  },

  // ===========================================================================
  // FEATURE FLAGS SNAPSHOT
  // ===========================================================================

  /**
   * featureFlags: The user's feature flags at request time
   * - Stores a snapshot of which features the user had enabled
   * - Useful for debugging feature-specific issues
   *
   * EXAMPLE: { betaFeatures: true, advancedSearch: false }
   */
  featureFlags: {
    type: Object,
    default: {}
  },

  // ===========================================================================
  // ENTITY IDS (What data was accessed/modified)
  // ===========================================================================

  /**
   * entityIds: IDs of data objects involved in this request
   * - Helps trace requests to specific pieces of data
   * - All fields optional (depends on what the request was about)
   */
  entityIds: {
    /**
     * noteId: If a specific note was accessed/modified
     * EXAMPLE: A request to GET /api/notes/123 would have noteId: "123"
     */
    noteId: { type: String, default: null },

    /**
     * workflowId: If a workflow was involved
     */
    workflowId: { type: String, default: null },

    /**
     * runId: If a workflow run was involved
     */
    runId: { type: String, default: null },

    /**
     * areaId: If a life area was involved
     */
    areaId: { type: String, default: null },

    /**
     * targetUserId: For admin operations on other users
     * EXAMPLE: Admin viewing user 456's profile would have targetUserId: "456"
     */
    targetUserId: { type: String, default: null }
  },

  // ===========================================================================
  // ERROR DETAILS
  // ===========================================================================

  /**
   * error: Information about any error that occurred
   * - Only populated if the request failed
   * - Helps debug what went wrong
   */
  error: {
    /**
     * category: Type of error for grouping
     * EXAMPLES: 'validation', 'auth', 'notFound', 'server', 'database'
     */
    category: { type: String, default: null },

    /**
     * code: Specific error code
     * EXAMPLES: 'INVALID_TOKEN', 'USER_NOT_FOUND', 'DUPLICATE_EMAIL'
     */
    code: { type: String, default: null },

    /**
     * name: JavaScript error type name
     * EXAMPLES: 'ValidationError', 'CastError', 'MongooseError'
     */
    name: { type: String, default: null },

    /**
     * messageSafe: User-friendly error message (safe to show to users)
     * Contains no sensitive data or internal details
     */
    messageSafe: { type: String, default: null },

    /**
     * stack: Full error stack trace
     * - Only stored in development or for server errors
     * - Contains detailed debugging information
     * - Should NOT be shown to users
     */
    stack: { type: String, default: null },

    /**
     * context: Additional debugging context
     * - Any extra information that helps understand the error
     * EXAMPLE: { attemptedEmail: "test@example.com", validationErrors: [...] }
     */
    context: { type: Object, default: null }
  },

  // ===========================================================================
  // CLIENT INFORMATION
  // ===========================================================================

  /**
   * clientInfo: Information about the client making the request
   * - Helps identify where requests come from
   * - Useful for security analysis
   */
  clientInfo: {
    /**
     * ip: Client's IP address
     * - Used for rate limiting, security, geographic analysis
     * - May be anonymized in production for privacy
     */
    ip: { type: String, default: null },

    /**
     * userAgent: Browser/client identification string
     * EXAMPLE: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0"
     */
    userAgent: { type: String, default: null },

    /**
     * origin: The origin header (which site made the request)
     * EXAMPLE: "https://mybrain.app"
     */
    origin: { type: String, default: null },

    /**
     * device: Parsed device information from User-Agent
     * - Extracted using deviceParser utility
     * - Used for activity logs and security analysis
     */
    device: {
      /**
       * deviceType: Category of device
       * VALUES: 'desktop', 'mobile', 'tablet', 'unknown'
       */
      deviceType: {
        type: String,
        enum: ['desktop', 'mobile', 'tablet', 'unknown'],
        default: 'unknown'
      },

      /**
       * browser: Name of the browser
       * EXAMPLES: "Chrome", "Firefox", "Safari", "Edge"
       */
      browser: { type: String, default: null },

      /**
       * os: Operating system name
       * EXAMPLES: "Windows", "macOS", "iOS", "Android", "Linux"
       */
      os: { type: String, default: null }
    }
  },

  // ===========================================================================
  // ACTIVITY CATEGORY
  // ===========================================================================

  /**
   * category: Category of the request for activity filtering
   * - Derived from route at log time for efficient querying
   * - Used by activity timeline feature to filter by category
   * - Indexed for fast filtering without regex on route
   *
   * CATEGORIES:
   * - 'content': Notes, tasks, projects, events, files, images, folders
   * - 'account': Profile updates
   * - 'security': Authentication actions
   * - 'social': Connections, messages, shares
   * - 'settings': User settings, filters, saved locations, tags, life areas
   * - 'other': Anything else
   */
  category: {
    type: String,
    enum: ['content', 'account', 'security', 'social', 'settings', 'other'],
    default: 'other',
    index: true
  },

  // ===========================================================================
  // EVENT CATEGORIZATION
  // ===========================================================================

  /**
   * eventName: A descriptive name for this type of request
   * - Generated automatically from route + method + status
   * - Makes logs easier to search and group
   * - Index: For fast filtering by event type
   *
   * EXAMPLES:
   * - "notes.list.success" (GET /api/notes → 200)
   * - "notes.create.success" (POST /api/notes → 201)
   * - "auth.login.failure" (POST /api/auth/login → 401)
   * - "admin.users.update.success" (PATCH /api/admin/users/123 → 200)
   */
  eventName: {
    type: String,
    required: true,
    index: true
  },

  // ===========================================================================
  // SAMPLING INFORMATION
  // ===========================================================================

  /**
   * sampled: Whether this log was kept through sampling
   * - Always true for logs in the database (by definition)
   * - If false, the log would have been discarded
   */
  sampled: {
    type: Boolean,
    default: true
  },

  /**
   * sampleReason: Why this log was kept (sampling reason)
   * - Explains the sampling decision
   *
   * VALUES:
   * - 'error': Request resulted in an error (always logged)
   * - 'slow': Request was slow (always logged for performance monitoring)
   * - 'debug_user': User is flagged for debugging (always logged)
   * - 'random': Randomly selected for sampling
   * - 'always': This route type is always logged
   * - 'admin': Admin action (always logged for audit trail)
   * - 'client_error': Client-side error report (always logged)
   * - 'mutation': Data-changing operation (POST/PUT/DELETE, higher priority)
   * - 'auth': Authentication action (always logged for security)
   */
  sampleReason: {
    type: String,
    enum: ['error', 'slow', 'debug_user', 'random', 'always', 'admin', 'client_error', 'mutation', 'auth'],
    default: 'random'
  },

  // ===========================================================================
  // ADDITIONAL METADATA
  // ===========================================================================

  /**
   * metadata: Catch-all for any additional data
   * - Flexible storage for request-specific information
   * - Used for data that doesn't fit other fields
   *
   * EXAMPLE: { queryParams: { page: 1, limit: 20 }, responseSize: 4523 }
   */
  metadata: {
    type: Object,
    default: {}
  }

}, {
  /**
   * timestamps: true automatically adds:
   * - createdAt: When the log document was created
   * - updatedAt: When the log document was last modified
   *
   * Note: We also have our own 'timestamp' field for the actual event time.
   * The createdAt might differ slightly if logs are batched or delayed.
   */
  timestamps: true
});

// =============================================================================
// DATABASE INDEXES
// =============================================================================

/**
 * Compound Indexes for Common Queries
 * -----------------------------------
 * These indexes speed up the most common ways logs are queried.
 * Log queries often involve time ranges and event filtering.
 */

// For filtering by event type over time
// Used by: Event-specific dashboards, error tracking
logSchema.index({ eventName: 1, timestamp: -1 });

// For finding all logs by a user over time
// Used by: User activity investigation, debugging user issues
logSchema.index({ userId: 1, timestamp: -1 });

// For filtering by status code over time
// Used by: Error monitoring, success rate tracking
logSchema.index({ statusCode: 1, timestamp: -1 });

// For finding logs by specific error code
// Used by: Error investigation, bug tracking
logSchema.index({ 'error.code': 1, timestamp: -1 });

// For activity queries with event name filtering
// Used by: User activity logs, filtering by specific events
logSchema.index({ userId: 1, eventName: 1, timestamp: -1 });

// For activity queries with route filtering
// Used by: User activity logs, category-based filtering
logSchema.index({ userId: 1, route: 1, timestamp: -1 });

// For activity queries with category filtering
// Used by: Enhanced activity API with category filter
logSchema.index({ userId: 1, category: 1, timestamp: -1 });

// =============================================================================
// TTL INDEX (Automatic Deletion)
// =============================================================================

/**
 * TTL Index for Automatic Log Cleanup
 * -----------------------------------
 * MongoDB's TTL (Time To Live) indexes automatically delete documents
 * after a specified time. This keeps the logs collection from growing
 * indefinitely.
 *
 * LOG_RETENTION_DAYS is configured via environment variable (default: 90)
 *
 * HOW IT WORKS:
 * - MongoDB checks the timestamp field against the current time
 * - If (now - timestamp) > expireAfterSeconds, the document is deleted
 * - This runs automatically in the background
 *
 * WHY THIS MATTERS:
 * - Prevents database from filling up
 * - Keeps queries fast (smaller collection)
 * - Ensures compliance with data retention policies
 */
const LOG_RETENTION_DAYS = parseInt(process.env.LOG_RETENTION_DAYS) || 90;
logSchema.index(
  { timestamp: 1 },
  { expireAfterSeconds: LOG_RETENTION_DAYS * 24 * 60 * 60 } // Convert days to seconds
);

// =============================================================================
// STATIC METHODS (Called on the Model, not an instance)
// =============================================================================

/**
 * searchLogs(options)
 * -------------------
 * Advanced search function to find logs matching various criteria.
 * Used by the admin logs viewer to investigate issues.
 *
 * @param {Object} options - Search options:
 *   - requestId: Find specific request by ID
 *   - userId: Filter by user
 *   - eventName: Filter by event name (partial match)
 *   - statusCode: Filter by exact status code
 *   - minStatusCode: Filter by minimum status code (e.g., 400 for all errors)
 *   - maxStatusCode: Filter by maximum status code
 *   - from: Start of time range (Date or string)
 *   - to: End of time range (Date or string)
 *   - hasError: Filter to only logs with errors
 *   - limit: Max results to return (default 50)
 *   - skip: Number of results to skip (for pagination)
 *   - sort: Sort field (default '-timestamp' = newest first)
 *
 * @returns {Object} - { logs: Array, total: Number }
 *
 * EXAMPLE USAGE:
 * ```
 * // Find all errors in the last hour
 * const { logs } = await Log.searchLogs({
 *   minStatusCode: 400,
 *   from: new Date(Date.now() - 3600000), // 1 hour ago
 *   limit: 100
 * });
 *
 * // Find all requests by a specific user
 * const { logs } = await Log.searchLogs({
 *   userId: 'user123',
 *   sort: '-timestamp'
 * });
 *
 * // Find auth failures
 * const { logs } = await Log.searchLogs({
 *   eventName: 'auth',
 *   statusCode: 401
 * });
 * ```
 */
logSchema.statics.searchLogs = async function(options = {}) {
  // Extract options with defaults
  const {
    requestId,
    userId,
    eventName,
    statusCode,
    minStatusCode,
    maxStatusCode,
    from,
    to,
    hasError,
    limit = 50,
    skip = 0,
    sort = '-timestamp'
  } = options;

  // -----------------------------------------
  // BUILD THE QUERY
  // -----------------------------------------

  const query = {};

  // Exact match on requestId
  if (requestId) {
    query.requestId = requestId;
  }

  // Filter by user
  if (userId) {
    query.userId = userId;
  }

  // Partial match on eventName (case-insensitive)
  if (eventName) {
    query.eventName = { $regex: eventName, $options: 'i' };
  }

  // Status code filtering
  if (statusCode) {
    // Exact match
    query.statusCode = parseInt(statusCode);
  } else {
    // Range filtering
    if (minStatusCode) {
      query.statusCode = { ...query.statusCode, $gte: parseInt(minStatusCode) };
    }
    if (maxStatusCode) {
      query.statusCode = { ...query.statusCode, $lte: parseInt(maxStatusCode) };
    }
  }

  // Time range filtering
  if (from || to) {
    query.timestamp = {};
    if (from) query.timestamp.$gte = new Date(from);
    if (to) query.timestamp.$lte = new Date(to);
  }

  // Filter for logs with errors
  if (hasError === 'true' || hasError === true) {
    query['error.code'] = { $ne: null }; // $ne = not equal to null
  }

  // -----------------------------------------
  // BUILD THE SORT ORDER
  // -----------------------------------------

  let sortObj = {};

  // Parse sort string: '-timestamp' → { timestamp: -1 }
  if (sort.startsWith('-')) {
    sortObj[sort.substring(1)] = -1; // Descending
  } else {
    sortObj[sort] = 1; // Ascending
  }

  // -----------------------------------------
  // EXECUTE THE QUERY
  // -----------------------------------------

  const logs = await this.find(query)
    .sort(sortObj)
    .skip(skip)
    .limit(limit);

  // Get total count for pagination info
  const total = await this.countDocuments(query);

  return { logs, total };
};

// =============================================================================
// INSTANCE METHODS
// =============================================================================

/**
 * toSafeJSON()
 * ------------
 * Convert log to a clean JSON object for API responses.
 * Removes internal MongoDB fields like __v (version key).
 *
 * @returns {Object} - Clean log object
 */
logSchema.methods.toSafeJSON = function() {
  const obj = this.toObject();
  delete obj.__v; // Remove MongoDB version field
  return obj;
};

// =============================================================================
// CREATE AND EXPORT MODEL
// =============================================================================

/**
 * Create the Log model from the schema.
 * This gives us methods to:
 * - Create logs: Log.create({ requestId, route, method, ... })
 * - Find logs: Log.find(query)
 * - Search logs: Log.searchLogs(options)
 *
 * IMPORTANT NOTES:
 * - Logs are automatically deleted after LOG_RETENTION_DAYS days
 * - Use sampling to avoid storing too many logs
 * - Always log errors, auth events, and admin actions
 * - Randomly sample successful GET requests
 */
const Log = mongoose.model('Log', logSchema);

export default Log;
