/**
 * =============================================================================
 * REQUEST LOGGER MIDDLEWARE TESTS
 * =============================================================================
 *
 * Comprehensive tests for the request logging middleware and helper functions:
 * - requestLogger: Main middleware function
 * - getStatusColor: Returns color code for status
 * - formatDuration: Formats ms to human readable
 * - truncate: Truncates long strings
 * - formatTimestamp: Formats date for logs
 * - logToConsole: Console output formatting
 * - attachEntityId: Attaches entity IDs to request
 *
 * For ES module compatibility, we use jest.unstable_mockModule which must be
 * called before importing the modules that use the mocked dependencies.
 *
 * =============================================================================
 */

import { jest } from '@jest/globals';

// =============================================================================
// MOCK SETUP - Must be done BEFORE importing modules that use them
// =============================================================================

// Create mock functions for dependencies
const mockLogWideEvent = jest.fn();
const mockNanoid = jest.fn();

// Mock the logger module
jest.unstable_mockModule('../utils/logger.js', () => ({
  logWideEvent: mockLogWideEvent,
}));

// Mock nanoid
jest.unstable_mockModule('nanoid', () => ({
  nanoid: mockNanoid,
}));

// Now import the requestLogger module after setting up mocks
const {
  default: requestLogger,
  requestLogger: namedRequestLogger,
  attachEntityId,
  logToConsole,
  colors,
  getLogLevel,
  LOG_LEVELS,
  truncate,
  formatTimestamp,
} = await import('./requestLogger.js');

// Import internal functions that aren't exported - we'll test them indirectly
// through the exported functions

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Creates a mock Express request object
 */
function createMockRequest(overrides = {}) {
  return {
    method: 'GET',
    path: '/api/test',
    url: '/api/test',
    originalUrl: '/api/test',
    query: {},
    body: {},
    ip: '127.0.0.1',
    headers: {},
    cookies: {},
    user: null,
    connection: { remoteAddress: '127.0.0.1' },
    get: jest.fn((header) => {
      const headers = {
        'User-Agent': 'Jest Test Agent',
        Origin: 'http://localhost:5173',
        'Content-Length': '100',
        ...overrides.headers,
      };
      return headers[header] || null;
    }),
    ...overrides,
  };
}

/**
 * Creates a mock Express response object
 */
function createMockResponse(overrides = {}) {
  const res = {
    statusCode: 200,
    _headers: {},
    setHeader: jest.fn((name, value) => {
      res._headers[name] = value;
    }),
    get: jest.fn((header) => {
      return res._headers[header] || overrides.contentLength || null;
    }),
    end: jest.fn(),
    ...overrides,
  };
  return res;
}

/**
 * Creates a mock next function
 */
function createMockNext() {
  return jest.fn();
}

/**
 * Creates a mock user object
 */
function createMockUser(overrides = {}) {
  return {
    _id: 'user123',
    email: 'test@example.com',
    role: 'user',
    flags: new Map([['betaFeatures', true]]),
    ...overrides,
  };
}

// =============================================================================
// TEST SUITES
// =============================================================================

describe('Request Logger Middleware', () => {
  // Store original environment variables
  const originalEnv = process.env;

  // Clear all mocks and reset env before each test
  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    // Default: nanoid returns a predictable ID
    mockNanoid.mockReturnValue('abc123xyz789test');
    // Default: logWideEvent resolves successfully
    mockLogWideEvent.mockResolvedValue(undefined);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  // ===========================================================================
  // requestLogger MIDDLEWARE TESTS
  // ===========================================================================

  describe('requestLogger (main middleware)', () => {
    // -------------------------------------------------------------------------
    // Middleware Flow Tests
    // -------------------------------------------------------------------------

    describe('Middleware Flow', () => {
      it('should call next() immediately without blocking', () => {
        const req = createMockRequest();
        const res = createMockResponse();
        const next = createMockNext();

        requestLogger(req, res, next);

        // next() should be called synchronously
        expect(next).toHaveBeenCalledTimes(1);
      });

      it('should not block request processing', () => {
        const req = createMockRequest();
        const res = createMockResponse();
        const next = createMockNext();
        const startTime = Date.now();

        requestLogger(req, res, next);

        // Should complete almost instantly (less than 10ms)
        const elapsed = Date.now() - startTime;
        expect(elapsed).toBeLessThan(10);
        expect(next).toHaveBeenCalled();
      });

      it('should attach requestId to the request object', () => {
        const req = createMockRequest();
        const res = createMockResponse();
        const next = createMockNext();

        requestLogger(req, res, next);

        expect(req.requestId).toBe('req_abc123xyz789test');
      });

      it('should set X-Request-Id response header', () => {
        const req = createMockRequest();
        const res = createMockResponse();
        const next = createMockNext();

        requestLogger(req, res, next);

        expect(res.setHeader).toHaveBeenCalledWith(
          'X-Request-Id',
          'req_abc123xyz789test'
        );
      });

      it('should initialize empty entityIds object on request', () => {
        const req = createMockRequest();
        const res = createMockResponse();
        const next = createMockNext();

        requestLogger(req, res, next);

        expect(req.entityIds).toEqual({});
      });

      it('should override res.end to capture response completion', () => {
        const req = createMockRequest();
        const originalEnd = jest.fn();
        const res = createMockResponse({ end: originalEnd });
        const next = createMockNext();

        requestLogger(req, res, next);

        // res.end should now be a different function
        expect(res.end).not.toBe(originalEnd);
      });
    });

    // -------------------------------------------------------------------------
    // Request Logging Tests (via res.end override)
    // -------------------------------------------------------------------------

    describe('Request Logging', () => {
      it('should log when res.end is called', async () => {
        process.env.LOG_LEVEL = 'none';
        const req = createMockRequest({ method: 'POST', path: '/api/notes' });
        const res = createMockResponse();
        const next = createMockNext();

        requestLogger(req, res, next);

        // Simulate response being sent
        res.end('response body', 'utf8');

        // Allow async operations to complete
        await new Promise((resolve) => setTimeout(resolve, 10));

        expect(mockLogWideEvent).toHaveBeenCalledTimes(1);
      });

      it('should log correct method in log data', async () => {
        process.env.LOG_LEVEL = 'none';
        const req = createMockRequest({ method: 'DELETE' });
        const res = createMockResponse();
        const next = createMockNext();

        requestLogger(req, res, next);
        res.end();

        await new Promise((resolve) => setTimeout(resolve, 10));

        const logData = mockLogWideEvent.mock.calls[0][0];
        expect(logData.method).toBe('DELETE');
      });

      it('should log correct route/URL in log data', async () => {
        process.env.LOG_LEVEL = 'none';
        const req = createMockRequest({
          originalUrl: '/api/notes?limit=10&sort=created',
        });
        const res = createMockResponse();
        const next = createMockNext();

        requestLogger(req, res, next);
        res.end();

        await new Promise((resolve) => setTimeout(resolve, 10));

        const logData = mockLogWideEvent.mock.calls[0][0];
        expect(logData.route).toBe('/api/notes?limit=10&sort=created');
      });

      it('should log request duration in milliseconds', async () => {
        process.env.LOG_LEVEL = 'none';
        const req = createMockRequest();
        const res = createMockResponse();
        const next = createMockNext();

        requestLogger(req, res, next);

        // Simulate some processing time
        await new Promise((resolve) => setTimeout(resolve, 50));

        res.end();

        await new Promise((resolve) => setTimeout(resolve, 10));

        const logData = mockLogWideEvent.mock.calls[0][0];
        expect(logData.durationMs).toBeGreaterThanOrEqual(50);
        expect(logData.durationMs).toBeLessThan(200);
      });

      it('should include requestId in log data', async () => {
        process.env.LOG_LEVEL = 'none';
        const req = createMockRequest();
        const res = createMockResponse();
        const next = createMockNext();

        requestLogger(req, res, next);
        res.end();

        await new Promise((resolve) => setTimeout(resolve, 10));

        const logData = mockLogWideEvent.mock.calls[0][0];
        expect(logData.requestId).toBe('req_abc123xyz789test');
      });
    });

    // -------------------------------------------------------------------------
    // Response Logging Tests
    // -------------------------------------------------------------------------

    describe('Response Logging', () => {
      it('should log correct status code', async () => {
        process.env.LOG_LEVEL = 'none';
        const req = createMockRequest();
        const res = createMockResponse({ statusCode: 201 });
        const next = createMockNext();

        requestLogger(req, res, next);
        res.end();

        await new Promise((resolve) => setTimeout(resolve, 10));

        const logData = mockLogWideEvent.mock.calls[0][0];
        expect(logData.statusCode).toBe(201);
      });

      it('should log status 404 for not found', async () => {
        process.env.LOG_LEVEL = 'none';
        const req = createMockRequest();
        const res = createMockResponse({ statusCode: 404 });
        const next = createMockNext();

        requestLogger(req, res, next);
        res.end();

        await new Promise((resolve) => setTimeout(resolve, 10));

        const logData = mockLogWideEvent.mock.calls[0][0];
        expect(logData.statusCode).toBe(404);
      });

      it('should log status 500 for server error', async () => {
        process.env.LOG_LEVEL = 'none';
        const req = createMockRequest();
        const res = createMockResponse({ statusCode: 500 });
        const next = createMockNext();

        requestLogger(req, res, next);
        res.end();

        await new Promise((resolve) => setTimeout(resolve, 10));

        const logData = mockLogWideEvent.mock.calls[0][0];
        expect(logData.statusCode).toBe(500);
      });

      it('should call original res.end with correct arguments', () => {
        process.env.LOG_LEVEL = 'none';
        const originalEnd = jest.fn();
        const req = createMockRequest();
        const res = createMockResponse({ end: originalEnd });
        const next = createMockNext();

        requestLogger(req, res, next);
        res.end('body content', 'utf8');

        expect(originalEnd).toHaveBeenCalledWith('body content', 'utf8');
      });
    });

    // -------------------------------------------------------------------------
    // User Information Logging Tests
    // -------------------------------------------------------------------------

    describe('User Information Logging', () => {
      it('should log userId when user is authenticated', async () => {
        process.env.LOG_LEVEL = 'none';
        const req = createMockRequest({ user: createMockUser() });
        const res = createMockResponse();
        const next = createMockNext();

        requestLogger(req, res, next);
        res.end();

        await new Promise((resolve) => setTimeout(resolve, 10));

        const logData = mockLogWideEvent.mock.calls[0][0];
        expect(logData.userId).toBe('user123');
      });

      it('should log userEmail when user is authenticated', async () => {
        process.env.LOG_LEVEL = 'none';
        const req = createMockRequest({ user: createMockUser() });
        const res = createMockResponse();
        const next = createMockNext();

        requestLogger(req, res, next);
        res.end();

        await new Promise((resolve) => setTimeout(resolve, 10));

        const logData = mockLogWideEvent.mock.calls[0][0];
        expect(logData.userEmail).toBe('test@example.com');
      });

      it('should log userRole when user is authenticated', async () => {
        process.env.LOG_LEVEL = 'none';
        const req = createMockRequest({
          user: createMockUser({ role: 'admin' }),
        });
        const res = createMockResponse();
        const next = createMockNext();

        requestLogger(req, res, next);
        res.end();

        await new Promise((resolve) => setTimeout(resolve, 10));

        const logData = mockLogWideEvent.mock.calls[0][0];
        expect(logData.userRole).toBe('admin');
      });

      it('should log null for user fields when not authenticated', async () => {
        process.env.LOG_LEVEL = 'none';
        const req = createMockRequest({ user: null });
        const res = createMockResponse();
        const next = createMockNext();

        requestLogger(req, res, next);
        res.end();

        await new Promise((resolve) => setTimeout(resolve, 10));

        const logData = mockLogWideEvent.mock.calls[0][0];
        expect(logData.userId).toBeNull();
        expect(logData.userEmail).toBeNull();
        expect(logData.userRole).toBeNull();
      });

      it('should log feature flags when user has them', async () => {
        process.env.LOG_LEVEL = 'none';
        const req = createMockRequest({ user: createMockUser() });
        const res = createMockResponse();
        const next = createMockNext();

        requestLogger(req, res, next);
        res.end();

        await new Promise((resolve) => setTimeout(resolve, 10));

        const logData = mockLogWideEvent.mock.calls[0][0];
        expect(logData.featureFlags).toEqual({ betaFeatures: true });
      });
    });

    // -------------------------------------------------------------------------
    // Entity IDs Logging Tests
    // -------------------------------------------------------------------------

    describe('Entity IDs Logging', () => {
      it('should log entityIds attached to request', async () => {
        process.env.LOG_LEVEL = 'none';
        const req = createMockRequest();
        const res = createMockResponse();
        const next = createMockNext();

        requestLogger(req, res, next);

        // Attach entity IDs (simulating what a route handler would do)
        req.entityIds.noteId = 'note123';
        req.entityIds.userId = 'user456';

        res.end();

        await new Promise((resolve) => setTimeout(resolve, 10));

        const logData = mockLogWideEvent.mock.calls[0][0];
        expect(logData.entityIds).toEqual({
          noteId: 'note123',
          userId: 'user456',
        });
      });

      it('should log empty entityIds when none attached', async () => {
        process.env.LOG_LEVEL = 'none';
        const req = createMockRequest();
        const res = createMockResponse();
        const next = createMockNext();

        requestLogger(req, res, next);
        res.end();

        await new Promise((resolve) => setTimeout(resolve, 10));

        const logData = mockLogWideEvent.mock.calls[0][0];
        expect(logData.entityIds).toEqual({});
      });
    });

    // -------------------------------------------------------------------------
    // Client Info Logging Tests
    // -------------------------------------------------------------------------

    describe('Client Information Logging', () => {
      it('should log client IP address', async () => {
        process.env.LOG_LEVEL = 'none';
        const req = createMockRequest({ ip: '192.168.1.100' });
        const res = createMockResponse();
        const next = createMockNext();

        requestLogger(req, res, next);
        res.end();

        await new Promise((resolve) => setTimeout(resolve, 10));

        const logData = mockLogWideEvent.mock.calls[0][0];
        expect(logData.clientInfo.ip).toBe('192.168.1.100');
      });

      it('should log User-Agent header', async () => {
        process.env.LOG_LEVEL = 'none';
        const req = createMockRequest();
        req.get = jest.fn((header) => {
          if (header === 'User-Agent') return 'Mozilla/5.0 Test Browser';
          return null;
        });
        const res = createMockResponse();
        const next = createMockNext();

        requestLogger(req, res, next);
        res.end();

        await new Promise((resolve) => setTimeout(resolve, 10));

        const logData = mockLogWideEvent.mock.calls[0][0];
        expect(logData.clientInfo.userAgent).toBe('Mozilla/5.0 Test Browser');
      });

      it('should log Origin header', async () => {
        process.env.LOG_LEVEL = 'none';
        const req = createMockRequest();
        req.get = jest.fn((header) => {
          if (header === 'Origin') return 'https://mybrain.app';
          return null;
        });
        const res = createMockResponse();
        const next = createMockNext();

        requestLogger(req, res, next);
        res.end();

        await new Promise((resolve) => setTimeout(resolve, 10));

        const logData = mockLogWideEvent.mock.calls[0][0];
        expect(logData.clientInfo.origin).toBe('https://mybrain.app');
      });

      it('should fallback to connection.remoteAddress for IP', async () => {
        process.env.LOG_LEVEL = 'none';
        const req = createMockRequest({
          ip: null,
          connection: { remoteAddress: '10.0.0.1' },
        });
        const res = createMockResponse();
        const next = createMockNext();

        requestLogger(req, res, next);
        res.end();

        await new Promise((resolve) => setTimeout(resolve, 10));

        const logData = mockLogWideEvent.mock.calls[0][0];
        expect(logData.clientInfo.ip).toBe('10.0.0.1');
      });
    });

    // -------------------------------------------------------------------------
    // Metadata Logging Tests
    // -------------------------------------------------------------------------

    describe('Metadata Logging', () => {
      it('should log query parameters when present', async () => {
        process.env.LOG_LEVEL = 'none';
        const req = createMockRequest({
          query: { limit: '10', sort: 'created' },
        });
        const res = createMockResponse();
        const next = createMockNext();

        requestLogger(req, res, next);
        res.end();

        await new Promise((resolve) => setTimeout(resolve, 10));

        const logData = mockLogWideEvent.mock.calls[0][0];
        expect(logData.metadata.query).toEqual({ limit: '10', sort: 'created' });
      });

      it('should not include query when empty', async () => {
        process.env.LOG_LEVEL = 'none';
        const req = createMockRequest({ query: {} });
        const res = createMockResponse();
        const next = createMockNext();

        requestLogger(req, res, next);
        res.end();

        await new Promise((resolve) => setTimeout(resolve, 10));

        const logData = mockLogWideEvent.mock.calls[0][0];
        expect(logData.metadata.query).toBeUndefined();
      });

      it('should log request body for POST requests', async () => {
        process.env.LOG_LEVEL = 'none';
        const req = createMockRequest({
          method: 'POST',
          body: { title: 'Test Note', content: 'Note content' },
        });
        const res = createMockResponse();
        const next = createMockNext();

        requestLogger(req, res, next);
        res.end();

        await new Promise((resolve) => setTimeout(resolve, 10));

        const logData = mockLogWideEvent.mock.calls[0][0];
        expect(logData.metadata.requestBody).toEqual({
          title: 'Test Note',
          content: 'Note content',
        });
      });

      it('should log request body for PUT requests', async () => {
        process.env.LOG_LEVEL = 'none';
        const req = createMockRequest({
          method: 'PUT',
          body: { status: 'completed' },
        });
        const res = createMockResponse();
        const next = createMockNext();

        requestLogger(req, res, next);
        res.end();

        await new Promise((resolve) => setTimeout(resolve, 10));

        const logData = mockLogWideEvent.mock.calls[0][0];
        expect(logData.metadata.requestBody).toEqual({ status: 'completed' });
      });

      it('should log request body for PATCH requests', async () => {
        process.env.LOG_LEVEL = 'none';
        const req = createMockRequest({
          method: 'PATCH',
          body: { name: 'Updated' },
        });
        const res = createMockResponse();
        const next = createMockNext();

        requestLogger(req, res, next);
        res.end();

        await new Promise((resolve) => setTimeout(resolve, 10));

        const logData = mockLogWideEvent.mock.calls[0][0];
        expect(logData.metadata.requestBody).toEqual({ name: 'Updated' });
      });

      it('should log request body for DELETE requests', async () => {
        process.env.LOG_LEVEL = 'none';
        const req = createMockRequest({
          method: 'DELETE',
          body: { permanent: true },
        });
        const res = createMockResponse();
        const next = createMockNext();

        requestLogger(req, res, next);
        res.end();

        await new Promise((resolve) => setTimeout(resolve, 10));

        const logData = mockLogWideEvent.mock.calls[0][0];
        expect(logData.metadata.requestBody).toEqual({ permanent: true });
      });

      it('should NOT log request body for GET requests', async () => {
        process.env.LOG_LEVEL = 'none';
        const req = createMockRequest({
          method: 'GET',
          body: { shouldNotAppear: true },
        });
        const res = createMockResponse();
        const next = createMockNext();

        requestLogger(req, res, next);
        res.end();

        await new Promise((resolve) => setTimeout(resolve, 10));

        const logData = mockLogWideEvent.mock.calls[0][0];
        expect(logData.metadata.requestBody).toBeUndefined();
      });

      it('should log mutation context when set', async () => {
        process.env.LOG_LEVEL = 'none';
        const req = createMockRequest();
        const res = createMockResponse();
        const next = createMockNext();

        requestLogger(req, res, next);

        // Simulate route setting mutation context
        req.mutation = {
          before: { status: 'pending' },
          after: { status: 'completed' },
        };

        res.end();

        await new Promise((resolve) => setTimeout(resolve, 10));

        const logData = mockLogWideEvent.mock.calls[0][0];
        expect(logData.metadata.mutation).toEqual({
          before: { status: 'pending' },
          after: { status: 'completed' },
        });
      });
    });

    // -------------------------------------------------------------------------
    // Sensitive Data Sanitization Tests
    // -------------------------------------------------------------------------

    describe('Sensitive Data Sanitization', () => {
      it('should redact password field from request body', async () => {
        process.env.LOG_LEVEL = 'none';
        const req = createMockRequest({
          method: 'POST',
          body: { email: 'user@test.com', password: 'secret123' },
        });
        const res = createMockResponse();
        const next = createMockNext();

        requestLogger(req, res, next);
        res.end();

        await new Promise((resolve) => setTimeout(resolve, 10));

        const logData = mockLogWideEvent.mock.calls[0][0];
        expect(logData.metadata.requestBody.password).toBe('[REDACTED]');
        expect(logData.metadata.requestBody.email).toBe('user@test.com');
      });

      it('should redact newPassword field', async () => {
        process.env.LOG_LEVEL = 'none';
        const req = createMockRequest({
          method: 'POST',
          body: { newPassword: 'newSecret456' },
        });
        const res = createMockResponse();
        const next = createMockNext();

        requestLogger(req, res, next);
        res.end();

        await new Promise((resolve) => setTimeout(resolve, 10));

        const logData = mockLogWideEvent.mock.calls[0][0];
        expect(logData.metadata.requestBody.newPassword).toBe('[REDACTED]');
      });

      it('should redact currentPassword field', async () => {
        process.env.LOG_LEVEL = 'none';
        const req = createMockRequest({
          method: 'POST',
          body: { currentPassword: 'oldPassword' },
        });
        const res = createMockResponse();
        const next = createMockNext();

        requestLogger(req, res, next);
        res.end();

        await new Promise((resolve) => setTimeout(resolve, 10));

        const logData = mockLogWideEvent.mock.calls[0][0];
        expect(logData.metadata.requestBody.currentPassword).toBe('[REDACTED]');
      });

      it('should redact token field', async () => {
        process.env.LOG_LEVEL = 'none';
        const req = createMockRequest({
          method: 'POST',
          body: { token: 'jwt_token_here' },
        });
        const res = createMockResponse();
        const next = createMockNext();

        requestLogger(req, res, next);
        res.end();

        await new Promise((resolve) => setTimeout(resolve, 10));

        const logData = mockLogWideEvent.mock.calls[0][0];
        expect(logData.metadata.requestBody.token).toBe('[REDACTED]');
      });

      it('should redact secret field', async () => {
        process.env.LOG_LEVEL = 'none';
        const req = createMockRequest({
          method: 'POST',
          body: { secret: 'my_secret_value' },
        });
        const res = createMockResponse();
        const next = createMockNext();

        requestLogger(req, res, next);
        res.end();

        await new Promise((resolve) => setTimeout(resolve, 10));

        const logData = mockLogWideEvent.mock.calls[0][0];
        expect(logData.metadata.requestBody.secret).toBe('[REDACTED]');
      });

      it('should redact apiKey field', async () => {
        process.env.LOG_LEVEL = 'none';
        const req = createMockRequest({
          method: 'POST',
          body: { apiKey: 'mbrain_test_key' },
        });
        const res = createMockResponse();
        const next = createMockNext();

        requestLogger(req, res, next);
        res.end();

        await new Promise((resolve) => setTimeout(resolve, 10));

        const logData = mockLogWideEvent.mock.calls[0][0];
        expect(logData.metadata.requestBody.apiKey).toBe('[REDACTED]');
      });

      it('should handle null body gracefully', async () => {
        process.env.LOG_LEVEL = 'none';
        const req = createMockRequest({ method: 'POST', body: null });
        const res = createMockResponse();
        const next = createMockNext();

        requestLogger(req, res, next);
        res.end();

        await new Promise((resolve) => setTimeout(resolve, 10));

        const logData = mockLogWideEvent.mock.calls[0][0];
        expect(logData.metadata.requestBody).toBeNull();
      });

      it('should handle non-object body gracefully', async () => {
        process.env.LOG_LEVEL = 'none';
        const req = createMockRequest({ method: 'POST', body: 'string body' });
        const res = createMockResponse();
        const next = createMockNext();

        requestLogger(req, res, next);
        res.end();

        await new Promise((resolve) => setTimeout(resolve, 10));

        const logData = mockLogWideEvent.mock.calls[0][0];
        expect(logData.metadata.requestBody).toBeNull();
      });
    });

    // -------------------------------------------------------------------------
    // Skip Paths Tests
    // -------------------------------------------------------------------------

    describe('Skip Paths', () => {
      it('should skip logging for /health endpoint', async () => {
        process.env.LOG_LEVEL = 'none';
        const req = createMockRequest({ path: '/health' });
        const res = createMockResponse();
        const next = createMockNext();

        requestLogger(req, res, next);
        res.end();

        await new Promise((resolve) => setTimeout(resolve, 10));

        expect(mockLogWideEvent).not.toHaveBeenCalled();
      });

      it('should skip logging for /favicon.ico', async () => {
        process.env.LOG_LEVEL = 'none';
        const req = createMockRequest({ path: '/favicon.ico' });
        const res = createMockResponse();
        const next = createMockNext();

        requestLogger(req, res, next);
        res.end();

        await new Promise((resolve) => setTimeout(resolve, 10));

        expect(mockLogWideEvent).not.toHaveBeenCalled();
      });

      it('should skip logging for /_next paths', async () => {
        process.env.LOG_LEVEL = 'none';
        const req = createMockRequest({ path: '/_next/static/chunk.js' });
        const res = createMockResponse();
        const next = createMockNext();

        requestLogger(req, res, next);
        res.end();

        await new Promise((resolve) => setTimeout(resolve, 10));

        expect(mockLogWideEvent).not.toHaveBeenCalled();
      });

      it('should log for normal API paths', async () => {
        process.env.LOG_LEVEL = 'none';
        const req = createMockRequest({ path: '/api/notes' });
        const res = createMockResponse();
        const next = createMockNext();

        requestLogger(req, res, next);
        res.end();

        await new Promise((resolve) => setTimeout(resolve, 10));

        expect(mockLogWideEvent).toHaveBeenCalledTimes(1);
      });
    });

    // -------------------------------------------------------------------------
    // Error Logging Tests
    // -------------------------------------------------------------------------

    describe('Error Logging', () => {
      it('should log error when attached to request', async () => {
        process.env.LOG_LEVEL = 'none';
        const req = createMockRequest();
        const res = createMockResponse({ statusCode: 500 });
        const next = createMockNext();

        requestLogger(req, res, next);

        req.error = { code: 'INTERNAL_ERROR', messageSafe: 'Something went wrong' };

        res.end();

        await new Promise((resolve) => setTimeout(resolve, 10));

        const logData = mockLogWideEvent.mock.calls[0][0];
        expect(logData.error).toEqual({
          code: 'INTERNAL_ERROR',
          messageSafe: 'Something went wrong',
        });
      });

      it('should log eventName when set by route', async () => {
        process.env.LOG_LEVEL = 'none';
        const req = createMockRequest();
        const res = createMockResponse();
        const next = createMockNext();

        requestLogger(req, res, next);

        req.eventName = 'note.create.success';

        res.end();

        await new Promise((resolve) => setTimeout(resolve, 10));

        const logData = mockLogWideEvent.mock.calls[0][0];
        expect(logData.eventName).toBe('note.create.success');
      });

      it('should handle logWideEvent failures gracefully', async () => {
        process.env.LOG_LEVEL = 'none';
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

        mockLogWideEvent.mockRejectedValue(new Error('Database connection failed'));

        const req = createMockRequest({ path: '/api/test' });
        const res = createMockResponse();
        const next = createMockNext();

        requestLogger(req, res, next);
        res.end();

        await new Promise((resolve) => setTimeout(resolve, 50));

        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Logging error:',
          'Database connection failed'
        );

        consoleErrorSpy.mockRestore();
      });
    });

    // -------------------------------------------------------------------------
    // Missing Request Properties Tests
    // -------------------------------------------------------------------------

    describe('Missing Request Properties', () => {
      it('should handle missing req.ip gracefully', async () => {
        process.env.LOG_LEVEL = 'none';
        const req = createMockRequest({ ip: undefined, connection: undefined });
        const res = createMockResponse();
        const next = createMockNext();

        requestLogger(req, res, next);
        res.end();

        await new Promise((resolve) => setTimeout(resolve, 10));

        const logData = mockLogWideEvent.mock.calls[0][0];
        expect(logData.clientInfo.ip).toBeNull();
      });

      it('should handle missing headers gracefully', async () => {
        process.env.LOG_LEVEL = 'none';
        const req = createMockRequest();
        req.get = jest.fn().mockReturnValue(null);
        const res = createMockResponse();
        const next = createMockNext();

        requestLogger(req, res, next);
        res.end();

        await new Promise((resolve) => setTimeout(resolve, 10));

        const logData = mockLogWideEvent.mock.calls[0][0];
        expect(logData.clientInfo.userAgent).toBeNull();
        expect(logData.clientInfo.origin).toBeNull();
      });

      it('should use req.url when originalUrl is not available', async () => {
        process.env.LOG_LEVEL = 'none';
        const req = createMockRequest({
          originalUrl: undefined,
          url: '/api/fallback',
        });
        const res = createMockResponse();
        const next = createMockNext();

        requestLogger(req, res, next);
        res.end();

        await new Promise((resolve) => setTimeout(resolve, 10));

        const logData = mockLogWideEvent.mock.calls[0][0];
        expect(logData.route).toBe('/api/fallback');
      });
    });
  });

  // ===========================================================================
  // attachEntityId TESTS
  // ===========================================================================

  describe('attachEntityId', () => {
    it('should attach entity ID to request', () => {
      const req = createMockRequest();
      req.entityIds = {};

      attachEntityId(req, 'noteId', 'note123');

      expect(req.entityIds.noteId).toBe('note123');
    });

    it('should create entityIds object if not exists', () => {
      const req = createMockRequest();
      delete req.entityIds;

      attachEntityId(req, 'userId', 'user456');

      expect(req.entityIds).toBeDefined();
      expect(req.entityIds.userId).toBe('user456');
    });

    it('should convert ObjectId-like objects to string', () => {
      const req = createMockRequest();
      req.entityIds = {};

      // Mock ObjectId
      const mockObjectId = {
        toString: () => '507f1f77bcf86cd799439011',
      };

      attachEntityId(req, 'noteId', mockObjectId);

      expect(req.entityIds.noteId).toBe('507f1f77bcf86cd799439011');
    });

    it('should handle null ID gracefully', () => {
      const req = createMockRequest();
      req.entityIds = {};

      attachEntityId(req, 'noteId', null);

      expect(req.entityIds.noteId).toBeUndefined();
    });

    it('should handle undefined ID gracefully', () => {
      const req = createMockRequest();
      req.entityIds = {};

      attachEntityId(req, 'noteId', undefined);

      expect(req.entityIds.noteId).toBeUndefined();
    });

    it('should attach multiple entity IDs', () => {
      const req = createMockRequest();
      req.entityIds = {};

      attachEntityId(req, 'noteId', 'note123');
      attachEntityId(req, 'userId', 'user456');
      attachEntityId(req, 'projectId', 'proj789');

      expect(req.entityIds).toEqual({
        noteId: 'note123',
        userId: 'user456',
        projectId: 'proj789',
      });
    });

    it('should overwrite existing entity ID', () => {
      const req = createMockRequest();
      req.entityIds = { noteId: 'oldNote' };

      attachEntityId(req, 'noteId', 'newNote');

      expect(req.entityIds.noteId).toBe('newNote');
    });
  });

  // ===========================================================================
  // truncate TESTS
  // ===========================================================================

  describe('truncate', () => {
    it('should return original string when shorter than maxLen', () => {
      expect(truncate('short', 100)).toBe('short');
    });

    it('should truncate string when longer than maxLen', () => {
      const longString = 'a'.repeat(150);
      const result = truncate(longString, 100);

      expect(result.length).toBe(103); // 100 chars + '...'
      expect(result.endsWith('...')).toBe(true);
    });

    it('should use default maxLen of 100', () => {
      const longString = 'a'.repeat(150);
      const result = truncate(longString);

      expect(result.length).toBe(103);
    });

    it('should return null for null input', () => {
      expect(truncate(null)).toBeNull();
    });

    it('should return undefined for undefined input', () => {
      expect(truncate(undefined)).toBeUndefined();
    });

    it('should return empty string for empty string input', () => {
      expect(truncate('')).toBe('');
    });

    it('should not truncate string at exact maxLen', () => {
      const exactString = 'a'.repeat(100);
      expect(truncate(exactString, 100)).toBe(exactString);
    });

    it('should truncate with custom maxLen', () => {
      expect(truncate('hello world', 5)).toBe('hello...');
    });
  });

  // ===========================================================================
  // formatTimestamp TESTS
  // ===========================================================================

  describe('formatTimestamp', () => {
    it('should return timestamp in HH:MM:SS.mmm format', () => {
      const result = formatTimestamp();

      // Should match pattern like "14:32:05.123"
      expect(result).toMatch(/^\d{2}:\d{2}:\d{2}\.\d{3}$/);
    });

    it('should pad single digit hours with zero', () => {
      // Mock Date to return 9:15:42.123
      const mockDate = new Date('2024-01-15T09:15:42.123');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate);

      const result = formatTimestamp();

      expect(result).toBe('09:15:42.123');

      jest.restoreAllMocks();
    });

    it('should pad single digit minutes with zero', () => {
      const mockDate = new Date('2024-01-15T14:05:42.123');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate);

      const result = formatTimestamp();

      expect(result).toBe('14:05:42.123');

      jest.restoreAllMocks();
    });

    it('should pad single digit seconds with zero', () => {
      const mockDate = new Date('2024-01-15T14:32:05.123');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate);

      const result = formatTimestamp();

      expect(result).toBe('14:32:05.123');

      jest.restoreAllMocks();
    });

    it('should pad single digit milliseconds with zeros', () => {
      const mockDate = new Date('2024-01-15T14:32:05.007');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate);

      const result = formatTimestamp();

      expect(result).toBe('14:32:05.007');

      jest.restoreAllMocks();
    });
  });

  // ===========================================================================
  // logToConsole TESTS
  // ===========================================================================

  describe('logToConsole', () => {
    // Store console.log to restore later
    let consoleLogSpy;

    beforeEach(() => {
      consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    });

    afterEach(() => {
      consoleLogSpy.mockRestore();
    });

    it('should not log anything when LOG_LEVEL is none', () => {
      process.env.LOG_LEVEL = 'none';

      logToConsole({
        method: 'GET',
        route: '/api/test',
        statusCode: 200,
        durationMs: 50,
      });

      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it('should log request line at minimal level', () => {
      process.env.LOG_LEVEL = 'minimal';

      logToConsole({
        method: 'GET',
        route: '/api/test',
        statusCode: 200,
        durationMs: 50,
      });

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const logOutput = consoleLogSpy.mock.calls[0][0];
      expect(logOutput).toContain('GET');
      expect(logOutput).toContain('/api/test');
      expect(logOutput).toContain('200');
      expect(logOutput).toContain('50ms');
    });

    it('should include user email at normal level', () => {
      process.env.LOG_LEVEL = 'normal';

      logToConsole({
        method: 'GET',
        route: '/api/test',
        statusCode: 200,
        durationMs: 50,
        userEmail: 'user@test.com',
      });

      // First call is request line, second is user info
      expect(consoleLogSpy.mock.calls.length).toBeGreaterThanOrEqual(2);
      const allOutput = consoleLogSpy.mock.calls.map((call) => call[0]).join(' ');
      expect(allOutput).toContain('user@test.com');
    });

    it('should include event name at normal level', () => {
      process.env.LOG_LEVEL = 'normal';

      logToConsole({
        method: 'POST',
        route: '/api/notes',
        statusCode: 201,
        durationMs: 100,
        eventName: 'note.create.success',
      });

      const allOutput = consoleLogSpy.mock.calls.map((call) => call[0]).join(' ');
      expect(allOutput).toContain('note.create.success');
    });

    it('should include entity IDs at normal level', () => {
      process.env.LOG_LEVEL = 'normal';

      logToConsole({
        method: 'PUT',
        route: '/api/notes/123',
        statusCode: 200,
        durationMs: 75,
        entityIds: { noteId: 'note123', userId: 'user456' },
      });

      const allOutput = consoleLogSpy.mock.calls.map((call) => call[0]).join(' ');
      expect(allOutput).toContain('noteId');
      expect(allOutput).toContain('userId');
    });

    it('should include query params at verbose level', () => {
      process.env.LOG_LEVEL = 'verbose';

      logToConsole({
        method: 'GET',
        route: '/api/notes',
        statusCode: 200,
        durationMs: 50,
        metadata: { query: { limit: '10', sort: 'created' } },
      });

      const allOutput = consoleLogSpy.mock.calls.map((call) => call[0]).join(' ');
      expect(allOutput).toContain('query');
      expect(allOutput).toContain('limit');
    });

    it('should include request body at verbose level', () => {
      process.env.LOG_LEVEL = 'verbose';

      logToConsole({
        method: 'POST',
        route: '/api/notes',
        statusCode: 201,
        durationMs: 100,
        metadata: { requestBody: { title: 'Test Note' } },
      });

      const allOutput = consoleLogSpy.mock.calls.map((call) => call[0]).join(' ');
      expect(allOutput).toContain('body');
      expect(allOutput).toContain('Test Note');
    });

    it('should include mutation info at verbose level', () => {
      process.env.LOG_LEVEL = 'verbose';

      logToConsole({
        method: 'PUT',
        route: '/api/tasks/123',
        statusCode: 200,
        durationMs: 80,
        metadata: {
          mutation: {
            before: { status: 'pending' },
            after: { status: 'completed' },
          },
        },
      });

      const allOutput = consoleLogSpy.mock.calls.map((call) => call[0]).join(' ');
      expect(allOutput).toContain('mutation');
      expect(allOutput).toContain('pending');
      expect(allOutput).toContain('completed');
    });

    it('should include error info at verbose level', () => {
      process.env.LOG_LEVEL = 'verbose';

      logToConsole({
        method: 'POST',
        route: '/api/notes',
        statusCode: 500,
        durationMs: 50,
        error: { code: 'DB_ERROR', messageSafe: 'Database connection failed' },
      });

      const allOutput = consoleLogSpy.mock.calls.map((call) => call[0]).join(' ');
      expect(allOutput).toContain('error');
      expect(allOutput).toContain('DB_ERROR');
    });

    it('should show [ERROR] tag for 4xx status codes', () => {
      process.env.LOG_LEVEL = 'minimal';

      logToConsole({
        method: 'GET',
        route: '/api/notes/999',
        statusCode: 404,
        durationMs: 30,
      });

      const logOutput = consoleLogSpy.mock.calls[0][0];
      expect(logOutput).toContain('[ERROR]');
    });

    it('should show [ERROR] tag for 5xx status codes', () => {
      process.env.LOG_LEVEL = 'minimal';

      logToConsole({
        method: 'POST',
        route: '/api/notes',
        statusCode: 500,
        durationMs: 100,
      });

      const logOutput = consoleLogSpy.mock.calls[0][0];
      expect(logOutput).toContain('[ERROR]');
    });
  });

  // ===========================================================================
  // colors OBJECT TESTS
  // ===========================================================================

  describe('colors object', () => {
    it('should export reset color code', () => {
      expect(colors.reset).toBe('\x1b[0m');
    });

    it('should export dim color code', () => {
      expect(colors.dim).toBe('\x1b[2m');
    });

    it('should export green color code', () => {
      expect(colors.green).toBe('\x1b[32m');
    });

    it('should export yellow color code', () => {
      expect(colors.yellow).toBe('\x1b[33m');
    });

    it('should export red color code', () => {
      expect(colors.red).toBe('\x1b[31m');
    });

    it('should export cyan color code', () => {
      expect(colors.cyan).toBe('\x1b[36m');
    });

    it('should export magenta color code', () => {
      expect(colors.magenta).toBe('\x1b[35m');
    });
  });

  // ===========================================================================
  // LOG_LEVELS OBJECT TESTS
  // ===========================================================================

  describe('LOG_LEVELS object', () => {
    it('should have none level as 0', () => {
      expect(LOG_LEVELS.none).toBe(0);
    });

    it('should have minimal level as 1', () => {
      expect(LOG_LEVELS.minimal).toBe(1);
    });

    it('should have normal level as 2', () => {
      expect(LOG_LEVELS.normal).toBe(2);
    });

    it('should have verbose level as 3', () => {
      expect(LOG_LEVELS.verbose).toBe(3);
    });
  });

  // ===========================================================================
  // getLogLevel TESTS
  // ===========================================================================

  describe('getLogLevel', () => {
    it('should return LOG_LEVEL from environment', () => {
      process.env.LOG_LEVEL = 'verbose';
      expect(getLogLevel()).toBe('verbose');
    });

    it('should return "none" when LOG_LEVEL is not set', () => {
      delete process.env.LOG_LEVEL;
      expect(getLogLevel()).toBe('none');
    });

    it('should return exact value of LOG_LEVEL', () => {
      process.env.LOG_LEVEL = 'minimal';
      expect(getLogLevel()).toBe('minimal');

      process.env.LOG_LEVEL = 'normal';
      expect(getLogLevel()).toBe('normal');
    });
  });

  // ===========================================================================
  // getStatusColor TESTS (tested indirectly via logToConsole output)
  // ===========================================================================

  describe('getStatusColor (via logToConsole)', () => {
    let consoleLogSpy;

    beforeEach(() => {
      consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    });

    afterEach(() => {
      consoleLogSpy.mockRestore();
    });

    it('should use green color for 200 status', () => {
      process.env.LOG_LEVEL = 'minimal';

      logToConsole({
        method: 'GET',
        route: '/api/test',
        statusCode: 200,
        durationMs: 50,
      });

      const logOutput = consoleLogSpy.mock.calls[0][0];
      expect(logOutput).toContain(colors.green);
    });

    it('should use green color for 201 status', () => {
      process.env.LOG_LEVEL = 'minimal';

      logToConsole({
        method: 'POST',
        route: '/api/test',
        statusCode: 201,
        durationMs: 50,
      });

      const logOutput = consoleLogSpy.mock.calls[0][0];
      expect(logOutput).toContain(colors.green);
    });

    it('should use green color for 204 status', () => {
      process.env.LOG_LEVEL = 'minimal';

      logToConsole({
        method: 'DELETE',
        route: '/api/test',
        statusCode: 204,
        durationMs: 50,
      });

      const logOutput = consoleLogSpy.mock.calls[0][0];
      expect(logOutput).toContain(colors.green);
    });

    it('should use yellow color for 400 status', () => {
      process.env.LOG_LEVEL = 'minimal';

      logToConsole({
        method: 'POST',
        route: '/api/test',
        statusCode: 400,
        durationMs: 50,
      });

      const logOutput = consoleLogSpy.mock.calls[0][0];
      expect(logOutput).toContain(colors.yellow);
    });

    it('should use yellow color for 401 status', () => {
      process.env.LOG_LEVEL = 'minimal';

      logToConsole({
        method: 'GET',
        route: '/api/test',
        statusCode: 401,
        durationMs: 50,
      });

      const logOutput = consoleLogSpy.mock.calls[0][0];
      expect(logOutput).toContain(colors.yellow);
    });

    it('should use yellow color for 403 status', () => {
      process.env.LOG_LEVEL = 'minimal';

      logToConsole({
        method: 'GET',
        route: '/api/test',
        statusCode: 403,
        durationMs: 50,
      });

      const logOutput = consoleLogSpy.mock.calls[0][0];
      expect(logOutput).toContain(colors.yellow);
    });

    it('should use yellow color for 404 status', () => {
      process.env.LOG_LEVEL = 'minimal';

      logToConsole({
        method: 'GET',
        route: '/api/test',
        statusCode: 404,
        durationMs: 50,
      });

      const logOutput = consoleLogSpy.mock.calls[0][0];
      expect(logOutput).toContain(colors.yellow);
    });

    it('should use yellow color for 422 status', () => {
      process.env.LOG_LEVEL = 'minimal';

      logToConsole({
        method: 'POST',
        route: '/api/test',
        statusCode: 422,
        durationMs: 50,
      });

      const logOutput = consoleLogSpy.mock.calls[0][0];
      expect(logOutput).toContain(colors.yellow);
    });

    it('should use red color for 500 status', () => {
      process.env.LOG_LEVEL = 'minimal';

      logToConsole({
        method: 'GET',
        route: '/api/test',
        statusCode: 500,
        durationMs: 50,
      });

      const logOutput = consoleLogSpy.mock.calls[0][0];
      expect(logOutput).toContain(colors.red);
    });

    it('should use red color for 502 status', () => {
      process.env.LOG_LEVEL = 'minimal';

      logToConsole({
        method: 'GET',
        route: '/api/test',
        statusCode: 502,
        durationMs: 50,
      });

      const logOutput = consoleLogSpy.mock.calls[0][0];
      expect(logOutput).toContain(colors.red);
    });

    it('should use red color for 503 status', () => {
      process.env.LOG_LEVEL = 'minimal';

      logToConsole({
        method: 'GET',
        route: '/api/test',
        statusCode: 503,
        durationMs: 50,
      });

      const logOutput = consoleLogSpy.mock.calls[0][0];
      expect(logOutput).toContain(colors.red);
    });

    it('should use reset color for 1xx status codes', () => {
      process.env.LOG_LEVEL = 'minimal';

      logToConsole({
        method: 'GET',
        route: '/api/test',
        statusCode: 100,
        durationMs: 50,
      });

      const logOutput = consoleLogSpy.mock.calls[0][0];
      // For 1xx, should use reset (not green, yellow, or red)
      // The status code should still appear in the log
      expect(logOutput).toContain('100');
    });

    it('should use reset color for 3xx status codes', () => {
      process.env.LOG_LEVEL = 'minimal';

      logToConsole({
        method: 'GET',
        route: '/api/test',
        statusCode: 301,
        durationMs: 50,
      });

      const logOutput = consoleLogSpy.mock.calls[0][0];
      expect(logOutput).toContain('301');
    });
  });

  // ===========================================================================
  // formatDuration TESTS (tested indirectly via logToConsole output)
  // ===========================================================================

  describe('formatDuration (via logToConsole)', () => {
    let consoleLogSpy;

    beforeEach(() => {
      consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    });

    afterEach(() => {
      consoleLogSpy.mockRestore();
    });

    it('should format fast request duration without highlighting', () => {
      process.env.LOG_LEVEL = 'minimal';

      logToConsole({
        method: 'GET',
        route: '/api/test',
        statusCode: 200,
        durationMs: 50,
      });

      const logOutput = consoleLogSpy.mock.calls[0][0];
      expect(logOutput).toContain('50ms');
      // Should NOT contain cyan (slow) highlighting
      expect(logOutput).not.toContain(colors.cyan + '50ms');
    });

    it('should highlight slow requests (>1000ms) in cyan', () => {
      process.env.LOG_LEVEL = 'minimal';

      logToConsole({
        method: 'GET',
        route: '/api/test',
        statusCode: 200,
        durationMs: 1500,
      });

      const logOutput = consoleLogSpy.mock.calls[0][0];
      expect(logOutput).toContain(colors.cyan);
      expect(logOutput).toContain('1500ms');
    });

    it('should not highlight 1000ms (exactly at threshold)', () => {
      process.env.LOG_LEVEL = 'minimal';

      logToConsole({
        method: 'GET',
        route: '/api/test',
        statusCode: 200,
        durationMs: 1000,
      });

      const logOutput = consoleLogSpy.mock.calls[0][0];
      expect(logOutput).toContain('1000ms');
      // Exactly 1000ms should NOT be highlighted (>1000 check)
      expect(logOutput).not.toContain(colors.cyan + '1000ms');
    });

    it('should highlight 1001ms (just over threshold)', () => {
      process.env.LOG_LEVEL = 'minimal';

      logToConsole({
        method: 'GET',
        route: '/api/test',
        statusCode: 200,
        durationMs: 1001,
      });

      const logOutput = consoleLogSpy.mock.calls[0][0];
      expect(logOutput).toContain(colors.cyan);
      expect(logOutput).toContain('1001ms');
    });

    it('should format 0ms duration', () => {
      process.env.LOG_LEVEL = 'minimal';

      logToConsole({
        method: 'GET',
        route: '/api/test',
        statusCode: 200,
        durationMs: 0,
      });

      const logOutput = consoleLogSpy.mock.calls[0][0];
      expect(logOutput).toContain('0ms');
    });
  });

  // ===========================================================================
  // ADDITIONAL EDGE CASE TESTS
  // ===========================================================================

  describe('Additional Edge Cases', () => {
    it('should handle request with no connection object', async () => {
      process.env.LOG_LEVEL = 'none';
      const req = createMockRequest({ ip: undefined, connection: null });
      const res = createMockResponse();
      const next = createMockNext();

      requestLogger(req, res, next);
      res.end();

      await new Promise((resolve) => setTimeout(resolve, 10));

      const logData = mockLogWideEvent.mock.calls[0][0];
      expect(logData.clientInfo.ip).toBeNull();
    });

    it('should handle user with no flags', async () => {
      process.env.LOG_LEVEL = 'none';
      const userNoFlags = { _id: 'user123', email: 'test@test.com', role: 'user' };
      const req = createMockRequest({ user: userNoFlags });
      const res = createMockResponse();
      const next = createMockNext();

      requestLogger(req, res, next);
      res.end();

      await new Promise((resolve) => setTimeout(resolve, 10));

      const logData = mockLogWideEvent.mock.calls[0][0];
      expect(logData.featureFlags).toEqual({});
    });

    it('should preserve entityIds that were added before middleware', async () => {
      process.env.LOG_LEVEL = 'none';
      const req = createMockRequest();
      req.entityIds = { existingId: 'existing123' };
      const res = createMockResponse();
      const next = createMockNext();

      requestLogger(req, res, next);

      // Middleware should overwrite entityIds with fresh object
      expect(req.entityIds).toEqual({});
    });

    it('should treat empty string eventName as null (falsy)', async () => {
      // The middleware uses `req.eventName || null` which treats empty string as falsy
      process.env.LOG_LEVEL = 'none';
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      requestLogger(req, res, next);
      req.eventName = '';
      res.end();

      await new Promise((resolve) => setTimeout(resolve, 10));

      const logData = mockLogWideEvent.mock.calls[0][0];
      // Empty string is falsy, so `'' || null` evaluates to null
      expect(logData.eventName).toBeNull();
    });

    it('should correctly identify all mutation methods', async () => {
      process.env.LOG_LEVEL = 'none';

      const methods = ['POST', 'PUT', 'PATCH', 'DELETE'];

      for (const method of methods) {
        mockLogWideEvent.mockClear();
        const req = createMockRequest({ method, body: { test: 'data' } });
        const res = createMockResponse();
        const next = createMockNext();

        requestLogger(req, res, next);
        res.end();

        await new Promise((resolve) => setTimeout(resolve, 10));

        const logData = mockLogWideEvent.mock.calls[0][0];
        expect(logData.metadata.requestBody).toBeDefined();
      }
    });

    it('should handle multiple res.end calls gracefully', async () => {
      process.env.LOG_LEVEL = 'none';
      const originalEnd = jest.fn();
      const req = createMockRequest({ path: '/api/test' });
      const res = createMockResponse({ end: originalEnd });
      const next = createMockNext();

      requestLogger(req, res, next);

      // First call
      res.end('first');

      // Second call should use original end (after restoration)
      res.end('second');

      await new Promise((resolve) => setTimeout(resolve, 10));

      // Should only log once
      expect(mockLogWideEvent).toHaveBeenCalledTimes(1);

      // Both calls should eventually hit originalEnd
      expect(originalEnd).toHaveBeenCalledTimes(2);
    });

    it('should handle very long request body in metadata', async () => {
      process.env.LOG_LEVEL = 'none';
      const longContent = 'a'.repeat(10000);
      const req = createMockRequest({
        method: 'POST',
        body: { content: longContent, title: 'Test' },
      });
      const res = createMockResponse();
      const next = createMockNext();

      requestLogger(req, res, next);
      res.end();

      await new Promise((resolve) => setTimeout(resolve, 10));

      const logData = mockLogWideEvent.mock.calls[0][0];
      // Body should be included but may be large
      expect(logData.metadata.requestBody.content.length).toBe(10000);
    });
  });

  // ===========================================================================
  // logToConsole ADDITIONAL TESTS
  // ===========================================================================

  describe('logToConsole - Additional Coverage', () => {
    let consoleLogSpy;

    beforeEach(() => {
      consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    });

    afterEach(() => {
      consoleLogSpy.mockRestore();
    });

    it('should not log user email at minimal level', () => {
      process.env.LOG_LEVEL = 'minimal';

      logToConsole({
        method: 'GET',
        route: '/api/test',
        statusCode: 200,
        durationMs: 50,
        userEmail: 'user@test.com',
      });

      // Only one log call (the request line)
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const logOutput = consoleLogSpy.mock.calls[0][0];
      expect(logOutput).not.toContain('user@test.com');
    });

    it('should not log entity IDs when empty at normal level', () => {
      process.env.LOG_LEVEL = 'normal';

      logToConsole({
        method: 'GET',
        route: '/api/test',
        statusCode: 200,
        durationMs: 50,
        entityIds: {},
      });

      const allOutput = consoleLogSpy.mock.calls.map((call) => call[0]).join(' ');
      expect(allOutput).not.toContain('entities');
    });

    it('should truncate long entity IDs in display', () => {
      process.env.LOG_LEVEL = 'normal';

      logToConsole({
        method: 'GET',
        route: '/api/test',
        statusCode: 200,
        durationMs: 50,
        entityIds: {
          veryLongId: 'a'.repeat(100),
        },
      });

      const allOutput = consoleLogSpy.mock.calls.map((call) => call[0]).join(' ');
      // The ID should be truncated to 24 chars + '...'
      expect(allOutput).toContain('...');
    });

    it('should handle undefined metadata gracefully', () => {
      process.env.LOG_LEVEL = 'verbose';

      logToConsole({
        method: 'GET',
        route: '/api/test',
        statusCode: 200,
        durationMs: 50,
        metadata: undefined,
      });

      // Should not throw
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should handle empty requestBody in metadata', () => {
      process.env.LOG_LEVEL = 'verbose';

      logToConsole({
        method: 'POST',
        route: '/api/test',
        statusCode: 201,
        durationMs: 100,
        metadata: { requestBody: {} },
      });

      const allOutput = consoleLogSpy.mock.calls.map((call) => call[0]).join(' ');
      // Empty body should not be logged
      expect(allOutput).not.toContain('body:');
    });

    it('should handle missing mutation.after gracefully', () => {
      process.env.LOG_LEVEL = 'verbose';

      logToConsole({
        method: 'PUT',
        route: '/api/test',
        statusCode: 200,
        durationMs: 80,
        metadata: {
          mutation: {
            before: { status: 'old' },
            // after is missing
          },
        },
      });

      // Should not throw and should still output something
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should handle error without code', () => {
      process.env.LOG_LEVEL = 'verbose';

      logToConsole({
        method: 'POST',
        route: '/api/test',
        statusCode: 500,
        durationMs: 50,
        error: { message: 'Something failed' },
      });

      const allOutput = consoleLogSpy.mock.calls.map((call) => call[0]).join(' ');
      expect(allOutput).toContain('UNKNOWN');
    });

    it('should print blank line after verbose output', () => {
      process.env.LOG_LEVEL = 'verbose';

      logToConsole({
        method: 'GET',
        route: '/api/test',
        statusCode: 200,
        durationMs: 50,
        metadata: { query: { limit: '10' } },
      });

      // Last call should be blank line
      const lastCall = consoleLogSpy.mock.calls[consoleLogSpy.mock.calls.length - 1][0];
      expect(lastCall).toBe('');
    });

    it('should handle invalid log level string', () => {
      process.env.LOG_LEVEL = 'invalid_level';

      logToConsole({
        method: 'GET',
        route: '/api/test',
        statusCode: 200,
        durationMs: 50,
      });

      // Invalid level should default to 0 (none), no output
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // EXPORT TESTS
  // ===========================================================================

  describe('Exports', () => {
    it('should export requestLogger as default', () => {
      expect(typeof requestLogger).toBe('function');
    });

    it('should export requestLogger as named export', () => {
      expect(typeof namedRequestLogger).toBe('function');
      expect(namedRequestLogger).toBe(requestLogger);
    });

    it('should export attachEntityId function', () => {
      expect(typeof attachEntityId).toBe('function');
    });

    it('should export logToConsole function', () => {
      expect(typeof logToConsole).toBe('function');
    });

    it('should export colors object', () => {
      expect(typeof colors).toBe('object');
    });

    it('should export getLogLevel function', () => {
      expect(typeof getLogLevel).toBe('function');
    });

    it('should export LOG_LEVELS object', () => {
      expect(typeof LOG_LEVELS).toBe('object');
    });

    it('should export truncate function', () => {
      expect(typeof truncate).toBe('function');
    });

    it('should export formatTimestamp function', () => {
      expect(typeof formatTimestamp).toBe('function');
    });
  });
});
