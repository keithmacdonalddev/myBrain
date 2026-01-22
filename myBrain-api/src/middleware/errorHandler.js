/**
 * =============================================================================
 * ERRORHANDLER.JS - Global Error Handling Middleware
 * =============================================================================
 *
 * This file provides centralized error handling for the entire myBrain API.
 * Instead of handling errors in every route, we catch them here and respond
 * consistently.
 *
 * WHAT IS ERROR HANDLING MIDDLEWARE?
 * ----------------------------------
 * In Express.js, middleware with 4 parameters (err, req, res, next) is
 * special - it's an "error-handling middleware". When any route or middleware
 * calls next(error) or throws an error, Express routes it here.
 *
 * WHY CENTRALIZED ERROR HANDLING?
 * -------------------------------
 * 1. CONSISTENCY: All errors have the same response format
 * 2. SECURITY: Server errors don't leak sensitive information
 * 3. DEBUGGING: Errors are logged with request IDs for tracking
 * 4. SEPARATION: Routes focus on business logic, not error formatting
 *
 * ERROR RESPONSE FORMAT:
 * ----------------------
 * All error responses include:
 * {
 *   error: "Human-readable error message",
 *   code: "MACHINE_READABLE_CODE",
 *   requestId: "req_abc123" // For support tickets
 * }
 *
 * HTTP STATUS CODES:
 * ------------------
 * 400 - Bad Request (validation errors, invalid input)
 * 401 - Unauthorized (authentication required or failed)
 * 403 - Forbidden (authorized but not allowed)
 * 404 - Not Found (resource doesn't exist)
 * 500 - Server Error (unexpected errors)
 *
 * =============================================================================
 */

// =============================================================================
// ERROR HANDLER MIDDLEWARE
// =============================================================================

/**
 * errorHandler(err, req, res, next) - Global Error Handling Middleware
 * =====================================================================
 * This middleware catches ALL errors thrown in route handlers and transforms
 * them into safe, consistent HTTP error responses. It's the final safety net
 * preventing raw error messages from reaching clients.
 *
 * WHAT IS ERROR-HANDLING MIDDLEWARE?
 * ----------------------------------
 * In Express, middleware with 4 parameters (err, req, res, next) is special.
 * Express automatically routes any thrown or passed errors to this middleware.
 * It acts as a global error catcher for the entire API.
 *
 * WHY CENTRALIZE ERROR HANDLING?
 * ------------------------------
 * 1. CONSISTENCY: All errors follow the same format
 *    Client always gets: { error: "...", code: "...", requestId: "..." }
 *
 * 2. SECURITY: Hide sensitive internals in production
 *    If database error: Show "Internal server error" instead of SQL details
 *    If file error: Show "Processing error" instead of file paths
 *
 * 3. DEBUGGING: Request ID links errors to logs
 *    Client reports: "Error with request ID req_abc123"
 *    Admin finds exact request in logs to debug
 *
 * 4. LOGGING: All errors automatically logged with context
 *    Stack traces, user IDs, request bodies all included
 *
 * SECURITY STRATEGY:
 * -----------------
 * 4xx Client Errors (400-499):
 *   - Show detailed error messages
 *   - These are user mistakes (bad input, unauthorized)
 *   - Helpful message tells user what to fix
 *
 * 5xx Server Errors (500-599):
 *   - Hide details in production
 *   - Show only "Internal server error"
 *   - Prevents exposing database structure, file paths, etc.
 *   - In development: Show actual error for debugging
 *
 * HOW ERROR FLOW WORKS:
 * ---------------------
 * 1. Route handler throws error or calls next(err)
 * 2. Express catches it and routes to this middleware
 * 3. Middleware determines HTTP status (or uses error.status)
 * 4. Middleware builds safe response message
 * 5. Middleware attaches error to request for logging
 * 6. Middleware sends JSON response to client
 *
 * @param {Error} err - The error object
 *   - err.message: Error description
 *   - err.status or err.statusCode: HTTP status (e.g., 404, 500)
 *   - err.code: Machine-readable code (e.g., 'NOT_FOUND')
 *   - err.stack: Stack trace for debugging
 *   - err.name: Error type (ValidationError, CastError, etc.)
 *
 * @param {Object} req - Express request object
 *   - req.requestId: Unique ID for this request (set by requestLogger)
 *   - Used to track error through logs
 *
 * @param {Object} res - Express response object
 *
 * @param {Function} next - Express next function
 *   - Only called if headers already sent (can't handle it)
 *
 * ERROR RESPONSES ARE ALWAYS:
 * ```json
 * {
 *   "error": "Human-readable message",
 *   "code": "MACHINE_READABLE_CODE",
 *   "requestId": "req_abc123"  // For support tickets
 * }
 * ```
 *
 * EXAMPLE USAGE:
 * ```javascript
 * // In Express app setup (at the END, after all routes):
 * app.use(errorHandler);  // Catches any unhandled errors
 *
 * // In a route handler:
 * router.post('/notes', requireAuth, async (req, res) => {
 *   const note = await Note.create(req.body);
 *   if (!note) {
 *     // Can throw errors - errorHandler will catch them
 *     throw new AppError('Failed to create note', 500, 'CREATE_FAILED');
 *   }
 *   res.json(note);
 * });
 * ```
 */
export function errorHandler(err, req, res, next) {
  // =========================================================================
  // CHECK IF RESPONSE ALREADY SENT
  // =========================================================================
  // In some cases, headers might already be sent (e.g., streaming responses).
  // If headers are sent, we can't send a new status code or body.
  // In this case, delegate to Express's default error handler.

  if (res.headersSent) {
    return next(err);
  }

  // =========================================================================
  // DETERMINE HTTP STATUS CODE
  // =========================================================================
  // Different errors map to different HTTP status codes.
  // Start with error.status if provided, otherwise default to 500 (server error).

  let statusCode = err.status || err.statusCode || 500;

  // =========================================================================
  // DETECT SPECIFIC ERROR TYPES
  // =========================================================================
  // Different libraries throw different error types. We detect them
  // and map to appropriate HTTP status codes.

  if (err.name === 'ValidationError') {
    // Mongoose validation error: Required field missing, type wrong, etc.
    // Example: User.create({ name: 123 }) - name should be string
    statusCode = 400;  // Bad Request - client's input is wrong
  } else if (err.name === 'CastError') {
    // Mongoose cast error: ID format is invalid
    // Example: User.findById('not-an-id') - invalid ObjectId format
    statusCode = 400;  // Bad Request - ID format is wrong
  } else if (err.name === 'JsonWebTokenError') {
    // JWT library error: Token is malformed or signature is invalid
    // Example: Token was tampered with or corrupted
    statusCode = 401;  // Unauthorized - token is invalid
  } else if (err.name === 'TokenExpiredError') {
    // JWT library error: Token has passed its expiration time
    // Example: User hasn't logged in for 30 days, token expired
    statusCode = 401;  // Unauthorized - token is no longer valid
  }

  // =========================================================================
  // BUILD SAFE ERROR MESSAGE
  // =========================================================================
  // Different HTTP status codes get different treatment for security.

  let safeMessage = 'An error occurred';
  let errorCode = 'UNKNOWN_ERROR';

  // =========================================================================
  // CLIENT ERRORS (4xx): Show actual message
  // =========================================================================
  // These are errors the client caused:
  // - Bad input (validation error)
  // - Not found (requested ID doesn't exist)
  // - Unauthorized (not logged in)
  // - Forbidden (logged in but not allowed)
  //
  // Showing the actual message helps users understand what went wrong
  // and how to fix it.

  if (statusCode < 500) {
    safeMessage = err.message || safeMessage;
    errorCode = err.code || errorCode;
  }
  // =========================================================================
  // SERVER ERRORS (5xx): Hide details in production
  // =========================================================================
  // These are server-side errors:
  // - Database connection failed
  // - File system error
  // - External API error
  // - Bug in our code
  //
  // We hide details in production because they might expose:
  // - Database structure (MongoDB connection string, collection names)
  // - File paths (where uploads are stored)
  // - Code structure (library names, module structure)
  //
  // This is a security best practice. Developers shouldn't see internals.
  else {
    if (process.env.NODE_ENV !== 'production') {
      // DEVELOPMENT: Show full error for debugging
      // You're running locally, you need the details
      safeMessage = err.message || safeMessage;
    } else {
      // PRODUCTION: Generic message to prevent information leakage
      // Real users shouldn't see "MongoDB connection failed" or file paths
      safeMessage = 'Internal server error';
    }
    errorCode = 'SERVER_ERROR';
  }

  // =========================================================================
  // ATTACH ERROR TO REQUEST FOR LOGGING
  // =========================================================================
  // The requestLogger middleware picks this up and includes it in logs.
  // This ensures every error is tracked with full context.

  req.error = {
    message: safeMessage,
    code: errorCode,
    stack: err.stack  // Stack trace for debugging
  };

  // =========================================================================
  // LOG TO CONSOLE (DEVELOPMENT ONLY)
  // =========================================================================
  // In development, also log to console for immediate visibility.
  // This helps you quickly spot errors while developing.

  if (process.env.NODE_ENV !== 'production') {
    console.error(`[${req.requestId}] Error:`, err);
  }

  // =========================================================================
  // SEND ERROR RESPONSE TO CLIENT
  // =========================================================================
  // Always include requestId so client can report "Error with request ID abc123"
  // This links the client's complaint to our server logs.

  res.status(statusCode).json({
    error: safeMessage,
    code: errorCode,
    requestId: req.requestId  // Client includes this in error reports
  });
}

// =============================================================================
// NOT FOUND HANDLER
// =============================================================================

/**
 * notFoundHandler(req, res, next) - Handle 404 Not Found Routes
 * ==============================================================
 * This middleware catches requests to undefined routes and returns a 404 error.
 * It should be registered AFTER all other routes in Express.
 *
 * WHAT IS A 404 ERROR?
 * -------------------
 * HTTP 404 means "Not Found" - the requested resource doesn't exist.
 * Examples:
 * - GET /api/nonexistent → 404
 * - POST /users/notes → 404 (wrong path)
 * - GET /notes/123 where 123 doesn't exist → 404 (but handled in route, not here)
 *
 * WHY THIS MIDDLEWARE?
 * -------------------
 * If no route matches the request, Express would normally send a
 * built-in 404 response. This middleware replaces that with our
 * standard error format (so clients always get consistent responses).
 *
 * MIDDLEWARE CHAIN PLACEMENT:
 * ---------------------------
 * This should be registered LAST, after all actual routes:
 *
 * app.use('/api/notes', noteRoutes);      // Real route
 * app.use('/api/tasks', taskRoutes);      // Real route
 * app.use(notFoundHandler);               // Catch everything else ← At bottom!
 * app.use(errorHandler);                  // General error handler
 *
 * If you register this BEFORE other routes, it will catch everything
 * and real routes will never run!
 *
 * @param {Request} req - Express request object
 *   - req.requestId: Unique ID for this request (set by requestLogger)
 * @param {Response} res - Express response object
 * @param {Function} next - Express next function
 *
 * EXAMPLE:
 * ```javascript
 * // User requests: GET /api/nonexistent
 * // No route matches this path
 * // notFoundHandler catches it and sends:
 * // {
 * //   "error": "Not found",
 * //   "code": "NOT_FOUND",
 * //   "requestId": "req_abc123"
 * // }
 * ```
 */
export function notFoundHandler(req, res, next) {
  // Respond with 404 and standard error format
  res.status(404).json({
    error: 'Not found',
    code: 'NOT_FOUND',
    requestId: req.requestId
  });
}

// =============================================================================
// APP ERROR CLASS
// =============================================================================

/**
 * AppError Class - Custom Error with HTTP Status
 * ================================================
 * This custom error class allows route handlers to throw errors with built-in
 * HTTP status codes and machine-readable error codes. The errorHandler middleware
 * recognizes this class and formats the response appropriately.
 *
 * WHAT IS A CUSTOM ERROR CLASS?
 * ----------------------------
 * Instead of throwing generic Error() objects, we use AppError to include
 * context about what went wrong and how the client should handle it.
 *
 * OPERATIONAL vs PROGRAMMING ERRORS:
 * ----------------------------------
 * OPERATIONAL ERRORS (expected, should show to user):
 * - Resource not found (404)
 * - Validation failed (400)
 * - Authentication required (401)
 * - Permission denied (403)
 * → User input or application state caused this
 * → Show helpful message to user
 * → These are throwable with AppError
 *
 * PROGRAMMING ERRORS (bugs in our code):
 * - Undefined variable reference
 * - Type mismatch
 * - Logic error
 * → Our code is broken
 * → Log for debugging
 * → Show generic error to user
 * → These would be regular Error objects, not AppError
 *
 * USAGE IN ROUTE HANDLERS:
 * -----------------------
 * ```javascript
 * router.get('/notes/:id', requireAuth, async (req, res) => {
 *   const note = await Note.findById(req.params.id);
 *
 *   // Operational error: resource not found
 *   if (!note) {
 *     throw new AppError('Note not found', 404, 'NOTE_NOT_FOUND');
 *   }
 *
 *   // Operational error: user doesn't have permission
 *   if (note.userId !== req.user._id) {
 *     throw new AppError(
 *       'You do not have permission to access this note',
 *       403,
 *       'NOT_AUTHORIZED'
 *     );
 *   }
 *
 *   res.json(note);
 * });
 * ```
 *
 * HOW IT WORKS WITH errorHandler:
 * 1. Route throws: new AppError('Not found', 404, 'NOT_FOUND')
 * 2. Express catches and routes to errorHandler middleware
 * 3. errorHandler sees err.statusCode = 404, err.code = 'NOT_FOUND'
 * 4. errorHandler sends: { error: 'Not found', code: 'NOT_FOUND', ... }
 *
 * @param {string} message - User-facing error message
 *   Example: "Note not found" or "You don't have permission"
 *
 * @param {number} statusCode - HTTP status code (default: 500)
 *   Common values:
 *   - 400: Bad Request (validation error)
 *   - 401: Unauthorized (authentication required)
 *   - 403: Forbidden (authenticated but not allowed)
 *   - 404: Not Found (resource doesn't exist)
 *   - 409: Conflict (e.g., email already exists)
 *   - 500: Internal Server Error (default)
 *
 * @param {string} code - Machine-readable error code (default: 'APP_ERROR')
 *   Used for client-side error handling
 *   Examples: 'NOTE_NOT_FOUND', 'INVALID_EMAIL', 'PERMISSION_DENIED'
 *
 * EXAMPLES:
 * ```javascript
 * // Resource not found
 * throw new AppError('User not found', 404, 'USER_NOT_FOUND');
 *
 * // Validation error
 * throw new AppError('Email is already in use', 400, 'EMAIL_EXISTS');
 *
 * // Permission error
 * throw new AppError('You cannot delete other users', 403, 'NOT_AUTHORIZED');
 *
 * // Conflict
 * throw new AppError('Note with this title already exists', 409, 'DUPLICATE');
 * ```
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'APP_ERROR') {
    // =========================================================================
    // CALL PARENT ERROR CONSTRUCTOR
    // =========================================================================
    // This initializes the Error class with the message.
    // From here on, this.message contains the error message.

    super(message);

    // =========================================================================
    // SET HTTP STATUS CODE
    // =========================================================================
    // errorHandler middleware looks for this property to determine
    // which HTTP status code to send to the client.

    this.statusCode = statusCode;

    // =========================================================================
    // SET MACHINE-READABLE ERROR CODE
    // =========================================================================
    // Clients can check err.code to handle specific error types.
    // Example: if (error.code === 'NOTE_NOT_FOUND') { showMessage(...) }

    this.code = code;

    // =========================================================================
    // MARK AS OPERATIONAL ERROR
    // =========================================================================
    // This flag indicates this is an expected operational error,
    // not a programming bug. errorHandler uses this to decide
    // whether to show the message to the user.

    this.isOperational = true;

    // =========================================================================
    // CAPTURE STACK TRACE
    // =========================================================================
    // For debugging: this records the JavaScript call stack when the
    // error was created, but excludes this constructor from the trace.
    // This keeps the stack trace focused on the actual problem.

    Error.captureStackTrace(this, this.constructor);
  }
}

// =============================================================================
// ERROR ATTACHMENT HELPER
// =============================================================================

/**
 * attachError(req, error, context) - Attach Error to Request for Logging
 * =======================================================================
 * This helper function attaches error information to the request object
 * so it gets captured in request logs, even when you handle the error
 * gracefully (without throwing or returning an error response).
 *
 * WHEN TO USE THIS:
 * ----------------
 * Some operations can fail in non-critical ways that you want to handle
 * gracefully while still tracking them in logs for monitoring.
 *
 * SCENARIOS:
 * 1. Sending email fails (but request succeeds without email)
 * 2. Cache update fails (but return stale cache)
 * 3. Optional image processing fails (but return unprocessed image)
 * 4. Background job fails (but return success to client)
 *
 * In these cases, the request completes successfully (200 response),
 * but you want the error logged for debugging/monitoring.
 *
 * @param {Request} req - Express request object
 *   - attachError adds req.error property
 *
 * @param {Error} error - The error that was caught
 *   - Can be any Error object (AppError, ValidationError, etc.)
 *
 * @param {Object} context - Additional debugging context
 *   - Custom object with details about what was being attempted
 *   - Example: { operation: 'sendEmail', userId: '123', retryCount: 2 }
 *
 * EXAMPLE USAGE:
 * ```javascript
 * router.post('/notes', requireAuth, async (req, res) => {
 *   // Create the note
 *   const note = await Note.create({
 *     userId: req.user._id,
 *     ...req.body
 *   });
 *
 *   // Try to send notification (not critical)
 *   try {
 *     await sendNotification(req.user._id, 'Note created');
 *   } catch (error) {
 *     // Email service is down, but note was created successfully
 *     // Log this error for monitoring, but don't fail the request
 *     attachError(req, error, {
 *       operation: 'sendNotification',
 *       userId: req.user._id,
 *       noteId: note._id
 *     });
 *   }
 *
 *   // Return success even though notification failed
 *   res.status(201).json(note);
 * });
 * ```
 *
 * HOW IT'S LOGGED:
 * ---------------
 * The requestLogger middleware sees req.error and includes it in logs:
 *
 * {
 *   requestId: 'req_abc123',
 *   method: 'POST',
 *   route: '/notes',
 *   statusCode: 201,        // Still 201 success!
 *   error: {
 *     message: 'Email service timeout',
 *     code: 'SERVICE_TIMEOUT',
 *     name: 'TimeoutError',
 *     context: { operation: 'sendNotification', ... }
 *   }
 * }
 *
 * This allows monitoring/alerting on failures that didn't break the request.
 */
export function attachError(req, error, context = {}) {
  // =========================================================================
  // BUILD ERROR OBJECT FOR LOGGING
  // =========================================================================
  // Attach structured error information to the request.
  // requestLogger middleware will pick this up and include it in logs.

  req.error = {
    message: error.message || 'Unknown error',
    code: error.code || 'UNKNOWN_ERROR',
    name: error.name || 'Error',
    stack: error.stack,
    context  // Custom context for debugging
  };
}

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

/**
 * Export all error handling utilities.
 *
 * USAGE IN EXPRESS APP:
 *
 * import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
 *
 * // After all routes:
 * app.use(notFoundHandler);  // Catch 404s
 * app.use(errorHandler);      // Catch all other errors
 */
export default {
  errorHandler,
  notFoundHandler,
  AppError,
  attachError
};
