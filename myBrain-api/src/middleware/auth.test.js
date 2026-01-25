/**
 * =============================================================================
 * AUTH MIDDLEWARE TESTS
 * =============================================================================
 *
 * Comprehensive tests for the authentication middleware functions:
 * - requireAuth: Protects routes that need logged-in users
 * - requireAdmin: Protects admin-only routes
 * - optionalAuth: Allows both authenticated and anonymous access
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

// Create mock functions that will be used by the mocked modules
const mockFindById = jest.fn();

// Mock the User model
jest.unstable_mockModule('../models/User.js', () => ({
  default: {
    findById: mockFindById,
  },
}));

// Now import the auth middleware after setting up mocks
const { requireAuth, requireAdmin, optionalAuth } = await import('./auth.js');
const { default: jwt } = await import('jsonwebtoken');

// =============================================================================
// CONFIGURATION
// =============================================================================

// JWT_SECRET must match the one in auth.js
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Creates a mock Express request object
 */
function createMockRequest(overrides = {}) {
  return {
    headers: {},
    cookies: {},
    ...overrides,
  };
}

/**
 * Creates a mock Express response object
 */
function createMockResponse() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

/**
 * Creates a mock next function
 */
function createMockNext() {
  return jest.fn();
}

/**
 * Creates a valid JWT token for testing
 */
function createValidToken(userId = 'user123') {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '1h' });
}

/**
 * Creates an expired JWT token for testing
 */
function createExpiredToken(userId = 'user123') {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '-1h' });
}

/**
 * Creates a mock user object
 */
function createMockUser(overrides = {}) {
  return {
    _id: 'user123',
    email: 'test@example.com',
    role: 'user',
    status: 'active',
    moderationStatus: {
      isBanned: false,
      isSuspended: false,
      banReason: null,
      suspendReason: null,
      suspendedUntil: null,
    },
    checkAndClearSuspension: jest.fn().mockResolvedValue(false),
    isSuspendedNow: jest.fn().mockReturnValue(false),
    ...overrides,
  };
}

// =============================================================================
// TEST SUITES
// =============================================================================

describe('Auth Middleware', () => {
  // Clear all mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ===========================================================================
  // requireAuth TESTS
  // ===========================================================================

  describe('requireAuth', () => {
    // -------------------------------------------------------------------------
    // Token Validation Tests
    // -------------------------------------------------------------------------

    describe('Token Validation', () => {
      it('should return 401 when no token is provided', async () => {
        const req = createMockRequest();
        const res = createMockResponse();
        const next = createMockNext();

        await requireAuth(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
          error: 'Authentication required',
          code: 'NO_TOKEN',
        });
        expect(next).not.toHaveBeenCalled();
      });

      it('should return 401 when token has invalid signature', async () => {
        // Create a token with a different secret
        const invalidToken = jwt.sign({ userId: 'user123' }, 'wrong-secret');

        const req = createMockRequest({
          headers: { authorization: `Bearer ${invalidToken}` },
        });
        const res = createMockResponse();
        const next = createMockNext();

        await requireAuth(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
          error: 'Invalid token',
          code: 'INVALID_TOKEN',
        });
        expect(next).not.toHaveBeenCalled();
      });

      it('should return 401 when token is expired', async () => {
        const expiredToken = createExpiredToken();

        const req = createMockRequest({
          headers: { authorization: `Bearer ${expiredToken}` },
        });
        const res = createMockResponse();
        const next = createMockNext();

        await requireAuth(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
          error: 'Token expired',
          code: 'TOKEN_EXPIRED',
        });
        expect(next).not.toHaveBeenCalled();
      });

      it('should return 401 when token is malformed', async () => {
        const req = createMockRequest({
          headers: { authorization: 'Bearer not-a-valid-jwt' },
        });
        const res = createMockResponse();
        const next = createMockNext();

        await requireAuth(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
          error: 'Invalid token',
          code: 'INVALID_TOKEN',
        });
        expect(next).not.toHaveBeenCalled();
      });
    });

    // -------------------------------------------------------------------------
    // User Lookup Tests
    // -------------------------------------------------------------------------

    describe('User Lookup', () => {
      it('should return 401 when user is not found in database', async () => {
        const token = createValidToken('nonexistent-user');

        mockFindById.mockResolvedValue(null);

        const req = createMockRequest({
          headers: { authorization: `Bearer ${token}` },
        });
        const res = createMockResponse();
        const next = createMockNext();

        await requireAuth(req, res, next);

        expect(mockFindById).toHaveBeenCalledWith('nonexistent-user');
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
          error: 'User not found',
          code: 'USER_NOT_FOUND',
        });
        expect(next).not.toHaveBeenCalled();
      });
    });

    // -------------------------------------------------------------------------
    // Account Status Tests
    // -------------------------------------------------------------------------

    describe('Account Status Checks', () => {
      it('should return 403 when user is banned', async () => {
        const token = createValidToken();
        const bannedUser = createMockUser({
          moderationStatus: {
            isBanned: true,
            banReason: 'Violated terms of service',
          },
        });

        mockFindById.mockResolvedValue(bannedUser);

        const req = createMockRequest({
          headers: { authorization: `Bearer ${token}` },
        });
        const res = createMockResponse();
        const next = createMockNext();

        await requireAuth(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({
          error: 'Account is permanently banned',
          code: 'ACCOUNT_BANNED',
          banReason: 'Violated terms of service',
        });
        expect(next).not.toHaveBeenCalled();
      });

      it('should return 403 when user is suspended', async () => {
        const token = createValidToken();
        const suspendedUntil = new Date(Date.now() + 86400000); // 24 hours from now
        const suspendedUser = createMockUser({
          status: 'suspended',
          moderationStatus: {
            isSuspended: true,
            suspendedUntil,
            suspendReason: 'Temporary suspension for review',
          },
          checkAndClearSuspension: jest.fn().mockResolvedValue(false),
          isSuspendedNow: jest.fn().mockReturnValue(true),
        });

        mockFindById.mockResolvedValue(suspendedUser);

        const req = createMockRequest({
          headers: { authorization: `Bearer ${token}` },
        });
        const res = createMockResponse();
        const next = createMockNext();

        await requireAuth(req, res, next);

        expect(suspendedUser.checkAndClearSuspension).toHaveBeenCalled();
        expect(suspendedUser.isSuspendedNow).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({
          error: 'Account is suspended',
          code: 'ACCOUNT_SUSPENDED',
          suspendedUntil,
          suspendReason: 'Temporary suspension for review',
        });
        expect(next).not.toHaveBeenCalled();
      });

      it('should return 403 when user is disabled', async () => {
        const token = createValidToken();
        const disabledUser = createMockUser({
          status: 'disabled',
        });

        mockFindById.mockResolvedValue(disabledUser);

        const req = createMockRequest({
          headers: { authorization: `Bearer ${token}` },
        });
        const res = createMockResponse();
        const next = createMockNext();

        await requireAuth(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({
          error: 'Account is disabled',
          code: 'ACCOUNT_DISABLED',
        });
        expect(next).not.toHaveBeenCalled();
      });

      it('should allow access when suspension has expired', async () => {
        const token = createValidToken();
        const expiredSuspensionUser = createMockUser({
          status: 'suspended',
          moderationStatus: {
            isSuspended: true,
            suspendedUntil: new Date(Date.now() - 86400000), // 24 hours ago
          },
          checkAndClearSuspension: jest.fn().mockResolvedValue(true), // Suspension was cleared
          isSuspendedNow: jest.fn().mockReturnValue(false),
        });

        mockFindById.mockResolvedValue(expiredSuspensionUser);

        const req = createMockRequest({
          headers: { authorization: `Bearer ${token}` },
        });
        const res = createMockResponse();
        const next = createMockNext();

        await requireAuth(req, res, next);

        expect(expiredSuspensionUser.checkAndClearSuspension).toHaveBeenCalled();
        expect(next).toHaveBeenCalled();
        expect(req.user).toBe(expiredSuspensionUser);
      });
    });

    // -------------------------------------------------------------------------
    // Successful Authentication Tests
    // -------------------------------------------------------------------------

    describe('Successful Authentication', () => {
      it('should set req.user and call next() with valid token from header', async () => {
        const token = createValidToken();
        const mockUser = createMockUser();

        mockFindById.mockResolvedValue(mockUser);

        const req = createMockRequest({
          headers: { authorization: `Bearer ${token}` },
        });
        const res = createMockResponse();
        const next = createMockNext();

        await requireAuth(req, res, next);

        expect(mockFindById).toHaveBeenCalledWith('user123');
        expect(req.user).toBe(mockUser);
        expect(req.authMethod).toBe('jwt');
        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
      });

      it('should set req.user and call next() with valid token from cookie', async () => {
        const token = createValidToken();
        const mockUser = createMockUser();

        mockFindById.mockResolvedValue(mockUser);

        const req = createMockRequest({
          cookies: { token },
        });
        const res = createMockResponse();
        const next = createMockNext();

        await requireAuth(req, res, next);

        expect(req.user).toBe(mockUser);
        expect(req.authMethod).toBe('jwt');
        expect(next).toHaveBeenCalled();
      });

      it('should prefer Authorization header over cookie', async () => {
        const headerToken = createValidToken('header-user');
        const cookieToken = createValidToken('cookie-user');
        const mockUser = createMockUser({ _id: 'header-user' });

        mockFindById.mockResolvedValue(mockUser);

        const req = createMockRequest({
          headers: { authorization: `Bearer ${headerToken}` },
          cookies: { token: cookieToken },
        });
        const res = createMockResponse();
        const next = createMockNext();

        await requireAuth(req, res, next);

        expect(mockFindById).toHaveBeenCalledWith('header-user');
        expect(req.user).toBe(mockUser);
      });
    });

    // -------------------------------------------------------------------------
    // Error Handling Tests
    // -------------------------------------------------------------------------

    describe('Error Handling', () => {
      it('should return 500 for unexpected errors', async () => {
        const token = createValidToken();

        // Simulate a database error
        mockFindById.mockRejectedValue(new Error('Database connection failed'));

        // Capture console.error
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

        const req = createMockRequest({
          headers: { authorization: `Bearer ${token}` },
        });
        const res = createMockResponse();
        const next = createMockNext();

        await requireAuth(req, res, next);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
          error: 'Authentication error',
          code: 'AUTH_ERROR',
        });
        expect(consoleErrorSpy).toHaveBeenCalled();

        consoleErrorSpy.mockRestore();
      });
    });
  });

  // ===========================================================================
  // requireAdmin TESTS
  // ===========================================================================

  describe('requireAdmin', () => {
    it('should return 401 when req.user is not set', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      requireAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Authentication required',
        code: 'NO_USER',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 403 when user is not admin', () => {
      const req = createMockRequest();
      req.user = createMockUser({ role: 'user' });
      const res = createMockResponse();
      const next = createMockNext();

      requireAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Admin access required',
        code: 'NOT_ADMIN',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 403 when user is moderator (not admin)', () => {
      const req = createMockRequest();
      req.user = createMockUser({ role: 'moderator' });
      const res = createMockResponse();
      const next = createMockNext();

      requireAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Admin access required',
        code: 'NOT_ADMIN',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should call next() when user is admin', () => {
      const req = createMockRequest();
      req.user = createMockUser({ role: 'admin' });
      const res = createMockResponse();
      const next = createMockNext();

      requireAdmin(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should work correctly after requireAuth', async () => {
      // Simulate requireAuth setting req.user
      const token = createValidToken();
      const adminUser = createMockUser({ role: 'admin' });

      mockFindById.mockResolvedValue(adminUser);

      const req = createMockRequest({
        headers: { authorization: `Bearer ${token}` },
      });
      const res = createMockResponse();
      const next = createMockNext();

      // First run requireAuth
      await requireAuth(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBe(adminUser);

      // Reset next mock
      next.mockClear();

      // Then run requireAdmin
      requireAdmin(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // optionalAuth TESTS
  // ===========================================================================

  describe('optionalAuth', () => {
    it('should call next() without setting req.user when no token is provided', async () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      await optionalAuth(req, res, next);

      expect(req.user).toBeUndefined();
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should set req.user and call next() with valid token', async () => {
      const token = createValidToken();
      const mockUser = createMockUser();

      mockFindById.mockResolvedValue(mockUser);

      const req = createMockRequest({
        headers: { authorization: `Bearer ${token}` },
      });
      const res = createMockResponse();
      const next = createMockNext();

      await optionalAuth(req, res, next);

      expect(req.user).toBe(mockUser);
      expect(next).toHaveBeenCalled();
    });

    it('should call next() without blocking when token is invalid', async () => {
      const invalidToken = jwt.sign({ userId: 'user123' }, 'wrong-secret');

      const req = createMockRequest({
        headers: { authorization: `Bearer ${invalidToken}` },
      });
      const res = createMockResponse();
      const next = createMockNext();

      await optionalAuth(req, res, next);

      expect(req.user).toBeUndefined();
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled(); // No error response
    });

    it('should call next() without blocking when token is expired', async () => {
      const expiredToken = createExpiredToken();

      const req = createMockRequest({
        headers: { authorization: `Bearer ${expiredToken}` },
      });
      const res = createMockResponse();
      const next = createMockNext();

      await optionalAuth(req, res, next);

      expect(req.user).toBeUndefined();
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled(); // No error response
    });

    it('should call next() without blocking when token is malformed', async () => {
      const req = createMockRequest({
        headers: { authorization: 'Bearer not-a-jwt' },
      });
      const res = createMockResponse();
      const next = createMockNext();

      await optionalAuth(req, res, next);

      expect(req.user).toBeUndefined();
      expect(next).toHaveBeenCalled();
    });

    it('should not set req.user when user is not found', async () => {
      const token = createValidToken('nonexistent-user');

      mockFindById.mockResolvedValue(null);

      const req = createMockRequest({
        headers: { authorization: `Bearer ${token}` },
      });
      const res = createMockResponse();
      const next = createMockNext();

      await optionalAuth(req, res, next);

      expect(req.user).toBeUndefined();
      expect(next).toHaveBeenCalled();
    });

    it('should not set req.user when user status is not active', async () => {
      const token = createValidToken();
      const disabledUser = createMockUser({ status: 'disabled' });

      mockFindById.mockResolvedValue(disabledUser);

      const req = createMockRequest({
        headers: { authorization: `Bearer ${token}` },
      });
      const res = createMockResponse();
      const next = createMockNext();

      await optionalAuth(req, res, next);

      expect(req.user).toBeUndefined();
      expect(next).toHaveBeenCalled();
    });

    it('should not set req.user when user is suspended', async () => {
      const token = createValidToken();
      const suspendedUser = createMockUser({ status: 'suspended' });

      mockFindById.mockResolvedValue(suspendedUser);

      const req = createMockRequest({
        headers: { authorization: `Bearer ${token}` },
      });
      const res = createMockResponse();
      const next = createMockNext();

      await optionalAuth(req, res, next);

      expect(req.user).toBeUndefined();
      expect(next).toHaveBeenCalled();
    });

    it('should read token from cookie when not in header', async () => {
      const token = createValidToken();
      const mockUser = createMockUser();

      mockFindById.mockResolvedValue(mockUser);

      const req = createMockRequest({
        cookies: { token },
      });
      const res = createMockResponse();
      const next = createMockNext();

      await optionalAuth(req, res, next);

      expect(req.user).toBe(mockUser);
      expect(next).toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      const token = createValidToken();

      mockFindById.mockRejectedValue(new Error('Database error'));

      const req = createMockRequest({
        headers: { authorization: `Bearer ${token}` },
      });
      const res = createMockResponse();
      const next = createMockNext();

      await optionalAuth(req, res, next);

      // Should still call next() and not block
      expect(req.user).toBeUndefined();
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // INTEGRATION TESTS (Middleware Chain)
  // ===========================================================================

  describe('Middleware Chain Integration', () => {
    it('should work with requireAuth followed by requireAdmin for admin users', async () => {
      const token = createValidToken();
      const adminUser = createMockUser({ role: 'admin' });

      mockFindById.mockResolvedValue(adminUser);

      const req = createMockRequest({
        headers: { authorization: `Bearer ${token}` },
      });
      const res = createMockResponse();
      const next = createMockNext();

      // Run requireAuth
      await requireAuth(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);

      // Run requireAdmin
      next.mockClear();
      requireAdmin(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);

      // No errors should have been sent
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should block at requireAdmin for non-admin users', async () => {
      const token = createValidToken();
      const regularUser = createMockUser({ role: 'user' });

      mockFindById.mockResolvedValue(regularUser);

      const req = createMockRequest({
        headers: { authorization: `Bearer ${token}` },
      });
      const res = createMockResponse();
      const next = createMockNext();

      // Run requireAuth
      await requireAuth(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);

      // Run requireAdmin
      next.mockClear();
      requireAdmin(req, res, next);

      // Should be blocked
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });
});
