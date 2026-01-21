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
 * Global Error Handler Middleware
 * -------------------------------
 * Catches all errors and returns safe, formatted error responses.
 *
 * @param {Error} err - The error that was thrown or passed via next(err)
 * @param {Request} req - Express request object (has requestId)
 * @param {Response} res - Express response object
 * @param {Function} next - Express next function
 *
 * HOW IT WORKS:
 * 1. Check if response already started (can't change it then)
 * 2. Determine appropriate HTTP status code
 * 3. Build safe error message (hide internal details in production)
 * 4. Attach error to request for logging
 * 5. Send formatted error response
 *
 * SECURITY:
 * - Client errors (4xx): Show actual error message
 * - Server errors (5xx): Hide details in production, show generic message
 */
export function errorHandler(err, req, res, next) {
  // If headers already sent, delegate to default Express handler
  // This prevents "Cannot set headers after they are sent" errors
  if (res.headersSent) {
    return next(err);
  }

  // Determine HTTP status code
  // Use error's status if provided, otherwise default to 500
  let statusCode = err.status || err.statusCode || 500;

  // Handle specific error types from various libraries
  // These errors have known causes, so we can set appropriate status codes
  if (err.name === 'ValidationError') {
    // Mongoose validation error (e.g., required field missing)
    statusCode = 400;
  } else if (err.name === 'CastError') {
    // Mongoose cast error (e.g., invalid ObjectId format)
    statusCode = 400;
  } else if (err.name === 'JsonWebTokenError') {
    // JWT library error (e.g., malformed token)
    statusCode = 401;
  } else if (err.name === 'TokenExpiredError') {
    // JWT library error (token expired)
    statusCode = 401;
  }

  // Build safe error message and code
  let safeMessage = 'An error occurred';
  let errorCode = 'UNKNOWN_ERROR';

  if (statusCode < 500) {
    // CLIENT ERRORS (4xx): Safe to show actual message
    // These are errors caused by the client (bad input, unauthorized, etc.)
    safeMessage = err.message || safeMessage;
    errorCode = err.code || errorCode;
  } else {
    // SERVER ERRORS (5xx): Hide internal details in production
    // These might contain sensitive info like file paths or database errors
    if (process.env.NODE_ENV !== 'production') {
      // Development: Show full error for debugging
      safeMessage = err.message || safeMessage;
    } else {
      // Production: Generic message to hide internals
      safeMessage = 'Internal server error';
    }
    errorCode = 'SERVER_ERROR';
  }

  // Attach error to request for the request logger middleware
  // This ensures errors are captured in the API logs
  req.error = {
    message: safeMessage,
    code: errorCode,
    stack: err.stack
  };

  // Log to console in development for immediate visibility
  if (process.env.NODE_ENV !== 'production') {
    console.error(`[${req.requestId}] Error:`, err);
  }

  // Send the error response
  res.status(statusCode).json({
    error: safeMessage,
    code: errorCode,
    requestId: req.requestId // Include for support reference
  });
}

// =============================================================================
// NOT FOUND HANDLER
// =============================================================================

/**
 * Not Found Handler
 * -----------------
 * Catches 404 errors for undefined routes.
 * Should be registered AFTER all other routes in Express.
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {Function} next - Express next function
 *
 * EXAMPLE:
 * User requests: GET /api/nonexistent
 * Response: { error: 'Not found', code: 'NOT_FOUND', requestId: 'req_xxx' }
 */
export function notFoundHandler(req, res, next) {
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
 * AppError Class
 * --------------
 * Custom error class for creating operational errors with status codes.
 * Use this in route handlers to throw errors with proper HTTP status.
 *
 * @param {string} message - Error message to display
 * @param {number} statusCode - HTTP status code (default: 500)
 * @param {string} code - Machine-readable error code (default: 'APP_ERROR')
 *
 * EXAMPLE:
 * throw new AppError('Note not found', 404, 'NOTE_NOT_FOUND');
 *
 * EXAMPLE:
 * throw new AppError('Invalid input', 400, 'VALIDATION_ERROR');
 *
 * OPERATIONAL vs PROGRAMMING ERRORS:
 * - Operational: Expected errors (not found, validation, auth)
 * - Programming: Bugs (undefined errors, type errors)
 *
 * The isOperational flag helps distinguish these:
 * - Operational errors: Show message to user
 * - Programming errors: Log and show generic message
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'APP_ERROR') {
    // Call parent Error constructor
    super(message);

    // Set HTTP status code
    this.statusCode = statusCode;

    // Set machine-readable error code
    this.code = code;

    // Mark as operational (expected) error
    this.isOperational = true;

    // Capture stack trace, excluding this constructor from it
    Error.captureStackTrace(this, this.constructor);
  }
}

// =============================================================================
// ERROR ATTACHMENT HELPER
// =============================================================================

/**
 * attachError(req, error, context)
 * --------------------------------
 * Attach error information to the request for logging.
 * Use this in try-catch blocks to ensure errors are captured in logs
 * even when you handle them gracefully.
 *
 * @param {Request} req - Express request object
 * @param {Error} error - The caught error
 * @param {Object} context - Additional context for debugging
 *
 * EXAMPLE:
 * try {
 *   await riskyOperation();
 * } catch (error) {
 *   attachError(req, error, { operation: 'riskyOperation', userId: user._id });
 *   // Handle gracefully but ensure it's logged
 *   res.status(200).json({ data: fallbackData });
 * }
 *
 * WHY USE THIS?
 * Sometimes you catch an error and handle it gracefully (no 500 error),
 * but you still want it logged for debugging. This helper ensures the
 * error appears in your request logs.
 */
export function attachError(req, error, context = {}) {
  req.error = {
    message: error.message || 'Unknown error',
    code: error.code || 'UNKNOWN_ERROR',
    name: error.name || 'Error',
    stack: error.stack,
    context
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
