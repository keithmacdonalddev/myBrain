/**
 * =============================================================================
 * ERRORHANDLER.TEST.JS - Error Handler Middleware Tests
 * =============================================================================
 *
 * Tests for the centralized error handling middleware including:
 * - errorHandler: Main error handler for all errors
 * - notFoundHandler: 404 handler for undefined routes
 * - AppError: Custom error class with HTTP status codes
 * - attachError: Helper for attaching errors to requests
 *
 * TEST CATEGORIES:
 * 1. Client errors (4xx) - Show actual message
 * 2. Server errors (5xx) - Hide details in production, show in development
 * 3. Error type detection - Mongoose, JWT errors map correctly
 * 4. AppError class - Custom error with status codes
 * 5. notFoundHandler - Returns 404 for undefined routes
 * 6. attachError - Attaches error info to request
 * =============================================================================
 */

import { jest, describe, test, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import {
  errorHandler,
  notFoundHandler,
  AppError,
  attachError
} from './errorHandler.js';

// =============================================================================
// TEST HELPERS
// =============================================================================

/**
 * Create a mock Express request object
 */
const createMockReq = (overrides = {}) => ({
  requestId: 'req_test123',
  ...overrides
});

/**
 * Create a mock Express response object
 */
const createMockRes = () => {
  const res = {
    statusCode: null,
    jsonData: null,
    headersSent: false,
    status: jest.fn(function(code) {
      this.statusCode = code;
      return this;
    }),
    json: jest.fn(function(data) {
      this.jsonData = data;
      return this;
    })
  };
  return res;
};

/**
 * Create a mock next function
 */
const createMockNext = () => jest.fn();

// =============================================================================
// ERRORHANDLER TESTS
// =============================================================================

describe('errorHandler middleware', () => {
  let originalEnv;

  beforeEach(() => {
    // Save original NODE_ENV
    originalEnv = process.env.NODE_ENV;
    // Suppress console.error during tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore NODE_ENV
    process.env.NODE_ENV = originalEnv;
    jest.restoreAllMocks();
  });

  // ===========================================================================
  // CLIENT ERRORS (4xx) - Should show actual message
  // ===========================================================================

  describe('4xx client errors', () => {
    test('400 error shows actual error message', () => {
      const req = createMockReq();
      const res = createMockRes();
      const next = createMockNext();
      const error = new Error('Invalid email format');
      error.status = 400;

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.jsonData.error).toBe('Invalid email format');
      expect(res.jsonData.requestId).toBe('req_test123');
    });

    test('401 error shows actual error message', () => {
      const req = createMockReq();
      const res = createMockRes();
      const next = createMockNext();
      const error = new Error('Authentication required');
      error.status = 401;

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.jsonData.error).toBe('Authentication required');
    });

    test('403 error shows actual error message', () => {
      const req = createMockReq();
      const res = createMockRes();
      const next = createMockNext();
      const error = new Error('You do not have permission');
      error.status = 403;

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.jsonData.error).toBe('You do not have permission');
    });

    test('404 error shows actual error message', () => {
      const req = createMockReq();
      const res = createMockRes();
      const next = createMockNext();
      const error = new Error('Note not found');
      error.status = 404;

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.jsonData.error).toBe('Note not found');
    });

    test('4xx error with custom code includes the code', () => {
      const req = createMockReq();
      const res = createMockRes();
      const next = createMockNext();
      const error = new Error('Email already exists');
      error.status = 400;
      error.code = 'EMAIL_EXISTS';

      errorHandler(error, req, res, next);

      expect(res.jsonData.code).toBe('EMAIL_EXISTS');
    });
  });

  // ===========================================================================
  // SERVER ERRORS (5xx) - Hide details in production
  // ===========================================================================

  describe('5xx server errors in production', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
    });

    test('500 error hides actual message in production', () => {
      const req = createMockReq();
      const res = createMockRes();
      const next = createMockNext();
      const error = new Error('MongoDB connection string: mongodb+srv://secret...');
      error.status = 500;

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.jsonData.error).toBe('Internal server error');
      expect(res.jsonData.error).not.toContain('MongoDB');
      expect(res.jsonData.error).not.toContain('secret');
    });

    test('502 error hides details in production', () => {
      const req = createMockReq();
      const res = createMockRes();
      const next = createMockNext();
      const error = new Error('Upstream service at 10.0.0.5 failed');
      error.status = 502;

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(502);
      expect(res.jsonData.error).toBe('Internal server error');
    });

    test('5xx error uses SERVER_ERROR code', () => {
      const req = createMockReq();
      const res = createMockRes();
      const next = createMockNext();
      const error = new Error('Database crash');
      error.status = 500;

      errorHandler(error, req, res, next);

      expect(res.jsonData.code).toBe('SERVER_ERROR');
    });

    test('request ID is still included for tracking', () => {
      const req = createMockReq({ requestId: 'req_production123' });
      const res = createMockRes();
      const next = createMockNext();
      const error = new Error('Sensitive server error');
      error.status = 500;

      errorHandler(error, req, res, next);

      expect(res.jsonData.requestId).toBe('req_production123');
    });
  });

  // ===========================================================================
  // SERVER ERRORS (5xx) - Show details in development
  // ===========================================================================

  describe('5xx server errors in development', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    test('500 error shows actual message in development', () => {
      const req = createMockReq();
      const res = createMockRes();
      const next = createMockNext();
      const error = new Error('Cannot read property x of undefined');
      error.status = 500;

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.jsonData.error).toBe('Cannot read property x of undefined');
    });

    test('error without status defaults to 500', () => {
      const req = createMockReq();
      const res = createMockRes();
      const next = createMockNext();
      const error = new Error('Some unexpected error');

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
    });

    test('logs error to console in development', () => {
      const req = createMockReq();
      const res = createMockRes();
      const next = createMockNext();
      const error = new Error('Debug this error');

      errorHandler(error, req, res, next);

      expect(console.error).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // MONGOOSE ERROR DETECTION
  // ===========================================================================

  describe('Mongoose error detection', () => {
    test('ValidationError maps to 400', () => {
      const req = createMockReq();
      const res = createMockRes();
      const next = createMockNext();
      const error = new Error('User validation failed: email is required');
      error.name = 'ValidationError';

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.jsonData.error).toBe('User validation failed: email is required');
    });

    test('CastError maps to 400', () => {
      const req = createMockReq();
      const res = createMockRes();
      const next = createMockNext();
      const error = new Error('Cast to ObjectId failed for value "invalid-id"');
      error.name = 'CastError';

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ===========================================================================
  // JWT ERROR DETECTION
  // ===========================================================================

  describe('JWT error detection', () => {
    test('JsonWebTokenError maps to 401', () => {
      const req = createMockReq();
      const res = createMockRes();
      const next = createMockNext();
      const error = new Error('jwt malformed');
      error.name = 'JsonWebTokenError';

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.jsonData.error).toBe('jwt malformed');
    });

    test('TokenExpiredError maps to 401', () => {
      const req = createMockReq();
      const res = createMockRes();
      const next = createMockNext();
      const error = new Error('jwt expired');
      error.name = 'TokenExpiredError';

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  // ===========================================================================
  // HEADERS ALREADY SENT
  // ===========================================================================

  describe('headers already sent handling', () => {
    test('delegates to Express default handler when headers sent', () => {
      const req = createMockReq();
      const res = createMockRes();
      res.headersSent = true;
      const next = createMockNext();
      const error = new Error('Error after response');

      errorHandler(error, req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // REQUEST ERROR ATTACHMENT
  // ===========================================================================

  describe('error attachment to request', () => {
    test('attaches error info to req.error for logging', () => {
      const req = createMockReq();
      const res = createMockRes();
      const next = createMockNext();
      const error = new Error('Test error');
      error.status = 400;
      error.stack = 'Error: Test error\n    at test.js:1:1';

      errorHandler(error, req, res, next);

      expect(req.error).toBeDefined();
      expect(req.error.message).toBe('Test error');
      expect(req.error.stack).toBe('Error: Test error\n    at test.js:1:1');
    });
  });
});

// =============================================================================
// NOTFOUNDHANDLER TESTS
// =============================================================================

describe('notFoundHandler middleware', () => {
  test('returns 404 status', () => {
    const req = createMockReq();
    const res = createMockRes();
    const next = createMockNext();

    notFoundHandler(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('returns "Not found" error message', () => {
    const req = createMockReq();
    const res = createMockRes();
    const next = createMockNext();

    notFoundHandler(req, res, next);

    expect(res.jsonData.error).toBe('Not found');
  });

  test('returns NOT_FOUND code', () => {
    const req = createMockReq();
    const res = createMockRes();
    const next = createMockNext();

    notFoundHandler(req, res, next);

    expect(res.jsonData.code).toBe('NOT_FOUND');
  });

  test('includes requestId in response', () => {
    const req = createMockReq({ requestId: 'req_notfound123' });
    const res = createMockRes();
    const next = createMockNext();

    notFoundHandler(req, res, next);

    expect(res.jsonData.requestId).toBe('req_notfound123');
  });
});

// =============================================================================
// APPERROR CLASS TESTS
// =============================================================================

describe('AppError class', () => {
  test('creates error with message', () => {
    const error = new AppError('Note not found');

    expect(error.message).toBe('Note not found');
    expect(error instanceof Error).toBe(true);
    expect(error instanceof AppError).toBe(true);
  });

  test('creates error with status code', () => {
    const error = new AppError('Not found', 404);

    expect(error.statusCode).toBe(404);
  });

  test('creates error with custom code', () => {
    const error = new AppError('Email exists', 400, 'EMAIL_EXISTS');

    expect(error.code).toBe('EMAIL_EXISTS');
  });

  test('defaults status code to 500', () => {
    const error = new AppError('Server error');

    expect(error.statusCode).toBe(500);
  });

  test('defaults code to APP_ERROR', () => {
    const error = new AppError('Some error', 400);

    expect(error.code).toBe('APP_ERROR');
  });

  test('marks error as operational', () => {
    const error = new AppError('User error', 400);

    expect(error.isOperational).toBe(true);
  });

  test('captures stack trace', () => {
    const error = new AppError('Test error');

    expect(error.stack).toBeDefined();
    // Stack trace should contain the error message
    expect(error.stack).toContain('Test error');
  });

  test('works correctly with errorHandler', () => {
    const req = createMockReq();
    const res = createMockRes();
    const next = createMockNext();
    const error = new AppError('Note not found', 404, 'NOTE_NOT_FOUND');

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.jsonData.error).toBe('Note not found');
    expect(res.jsonData.code).toBe('NOTE_NOT_FOUND');
  });

  test('common use cases work correctly', () => {
    // 400 - Bad Request
    const badRequest = new AppError('Invalid email format', 400, 'INVALID_EMAIL');
    expect(badRequest.statusCode).toBe(400);

    // 401 - Unauthorized
    const unauthorized = new AppError('Please log in', 401, 'AUTH_REQUIRED');
    expect(unauthorized.statusCode).toBe(401);

    // 403 - Forbidden
    const forbidden = new AppError('Not allowed', 403, 'FORBIDDEN');
    expect(forbidden.statusCode).toBe(403);

    // 404 - Not Found
    const notFound = new AppError('User not found', 404, 'USER_NOT_FOUND');
    expect(notFound.statusCode).toBe(404);

    // 409 - Conflict
    const conflict = new AppError('Email already in use', 409, 'DUPLICATE');
    expect(conflict.statusCode).toBe(409);
  });
});

// =============================================================================
// ATTACHERROR HELPER TESTS
// =============================================================================

describe('attachError helper', () => {
  test('attaches error message to request', () => {
    const req = createMockReq();
    const error = new Error('Email service timeout');

    attachError(req, error);

    expect(req.error.message).toBe('Email service timeout');
  });

  test('attaches error code to request', () => {
    const req = createMockReq();
    const error = new Error('Service failed');
    error.code = 'SERVICE_TIMEOUT';

    attachError(req, error);

    expect(req.error.code).toBe('SERVICE_TIMEOUT');
  });

  test('attaches error name to request', () => {
    const req = createMockReq();
    const error = new TypeError('Type mismatch');

    attachError(req, error);

    expect(req.error.name).toBe('TypeError');
  });

  test('attaches stack trace to request', () => {
    const req = createMockReq();
    const error = new Error('Stack test');

    attachError(req, error);

    expect(req.error.stack).toBeDefined();
    expect(req.error.stack).toContain('Stack test');
  });

  test('attaches custom context to request', () => {
    const req = createMockReq();
    const error = new Error('Notification failed');
    const context = {
      operation: 'sendNotification',
      userId: '123',
      retryCount: 2
    };

    attachError(req, error, context);

    expect(req.error.context).toEqual(context);
  });

  test('defaults to UNKNOWN_ERROR code if none provided', () => {
    const req = createMockReq();
    const error = new Error('Generic error');

    attachError(req, error);

    expect(req.error.code).toBe('UNKNOWN_ERROR');
  });

  test('defaults message if error has no message', () => {
    const req = createMockReq();
    const error = new Error();
    error.message = '';

    attachError(req, error);

    expect(req.error.message).toBe('Unknown error');
  });

  test('handles errors without name property', () => {
    const req = createMockReq();
    const error = { message: 'Plain object error' };

    attachError(req, error);

    expect(req.error.name).toBe('Error');
  });
});
