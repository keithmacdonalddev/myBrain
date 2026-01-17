/**
 * Global Error Handler Middleware
 *
 * Catches all errors and returns safe error responses with requestId.
 * Attaches error to request for logging middleware to capture.
 */
export function errorHandler(err, req, res, next) {
  // If headers already sent, delegate to default handler
  if (res.headersSent) {
    return next(err);
  }

  // Determine status code
  let statusCode = err.status || err.statusCode || 500;

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
  } else if (err.name === 'CastError') {
    statusCode = 400;
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
  }

  // Build safe error message
  let safeMessage = 'An error occurred';
  let errorCode = 'UNKNOWN_ERROR';

  if (statusCode < 500) {
    // Client errors - can show actual message
    safeMessage = err.message || safeMessage;
    errorCode = err.code || errorCode;
  } else {
    // Server errors - hide internal details in production
    if (process.env.NODE_ENV !== 'production') {
      safeMessage = err.message || safeMessage;
    } else {
      safeMessage = 'Internal server error';
    }
    errorCode = 'SERVER_ERROR';
  }

  // Attach error to request for logging
  req.error = {
    message: safeMessage,
    code: errorCode,
    stack: err.stack
  };

  // Log to console in development
  if (process.env.NODE_ENV !== 'production') {
    console.error(`[${req.requestId}] Error:`, err);
  }

  // Send response
  res.status(statusCode).json({
    error: safeMessage,
    code: errorCode,
    requestId: req.requestId // Include for support reference
  });
}

/**
 * Not Found Handler
 *
 * Catches 404s for undefined routes
 */
export function notFoundHandler(req, res, next) {
  res.status(404).json({
    error: 'Not found',
    code: 'NOT_FOUND',
    requestId: req.requestId
  });
}

/**
 * Create an operational error with status code
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'APP_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export default {
  errorHandler,
  notFoundHandler,
  AppError
};
