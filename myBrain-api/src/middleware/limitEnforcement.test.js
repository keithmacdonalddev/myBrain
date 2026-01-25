/**
 * =============================================================================
 * LIMITENFORCEMENT.TEST.JS - Limit Enforcement Middleware Tests
 * =============================================================================
 *
 * Tests for the resource limit enforcement middleware including:
 * - requireLimit: Middleware factory for checking resource limits
 * - requireStorageLimit: Middleware for checking image storage limits
 * - requireCategoryLimit: Pre-configured middleware for category limits
 *
 * These are unit tests that mock the limitService.
 */

import { jest, describe, test, expect, beforeEach } from '@jest/globals';

// =============================================================================
// MOCK SETUP - Must be before imports
// =============================================================================

const mockCanCreate = jest.fn();
const mockCanUploadImage = jest.fn();

jest.unstable_mockModule('../services/limitService.js', () => ({
  default: {
    canCreate: mockCanCreate,
    canUploadImage: mockCanUploadImage
  }
}));

// Import after mocking
const { requireLimit, requireStorageLimit, requireCategoryLimit } = await import('./limitEnforcement.js');

// =============================================================================
// TEST HELPERS
// =============================================================================

const createMockReq = (user, reqOverrides = {}) => ({
  requestId: 'req_test123',
  user: user,
  file: reqOverrides.file,
  limitInfo: undefined,
  storageLimitInfo: undefined,
  ...reqOverrides
});

const createMockRes = () => {
  const res = {
    statusCode: null,
    jsonData: null,
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

const createMockNext = () => jest.fn();

const createMockFile = (size = 1024) => ({
  buffer: Buffer.alloc(size),
  originalname: 'test-image.jpg',
  mimetype: 'image/jpeg',
  size: size
});

const createMockUser = () => ({
  _id: 'user123',
  role: 'free'
});

// =============================================================================
// REQUIRELIMIT TESTS
// =============================================================================

describe('requireLimit middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ===========================================================================
  // USER UNDER LIMIT TESTS
  // ===========================================================================

  describe('user under limit', () => {
    test('allows request when user is under notes limit', async () => {
      mockCanCreate.mockResolvedValue({
        allowed: true,
        current: 50,
        max: 100
      });

      const req = createMockReq(createMockUser());
      const res = createMockRes();
      const next = createMockNext();
      const middleware = requireLimit('notes');

      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('attaches limitInfo to request', async () => {
      const limitResult = {
        allowed: true,
        current: 5,
        max: 10
      };
      mockCanCreate.mockResolvedValue(limitResult);

      const req = createMockReq(createMockUser());
      const res = createMockRes();
      const next = createMockNext();
      const middleware = requireLimit('projects');

      await middleware(req, res, next);

      expect(req.limitInfo).toEqual(limitResult);
    });
  });

  // ===========================================================================
  // USER AT LIMIT TESTS
  // ===========================================================================

  describe('user at limit (blocked)', () => {
    test('returns 403 when user has reached notes limit', async () => {
      mockCanCreate.mockResolvedValue({
        allowed: false,
        message: 'You have reached your notes limit (100). Upgrade to create more.',
        current: 100,
        max: 100
      });

      const req = createMockReq(createMockUser());
      const res = createMockRes();
      const next = createMockNext();
      const middleware = requireLimit('notes');

      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.jsonData.code).toBe('LIMIT_EXCEEDED');
      expect(next).not.toHaveBeenCalled();
    });

    test('includes limit details in error response', async () => {
      mockCanCreate.mockResolvedValue({
        allowed: false,
        message: 'You have reached your projects limit (10).',
        current: 10,
        max: 10
      });

      const req = createMockReq(createMockUser());
      const res = createMockRes();
      const next = createMockNext();
      const middleware = requireLimit('projects');

      await middleware(req, res, next);

      expect(res.jsonData.limitType).toBe('projects');
      expect(res.jsonData.current).toBe(10);
      expect(res.jsonData.max).toBe(10);
    });
  });

  // ===========================================================================
  // MISSING USER TESTS
  // ===========================================================================

  describe('missing user (authentication required)', () => {
    test('returns 401 when no user is present', async () => {
      const req = createMockReq(undefined);
      const res = createMockRes();
      const next = createMockNext();
      const middleware = requireLimit('notes');

      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.jsonData.code).toBe('AUTH_REQUIRED');
      expect(next).not.toHaveBeenCalled();
    });

    test('does not call limitService when no user', async () => {
      const req = createMockReq(undefined);
      const res = createMockRes();
      const next = createMockNext();
      const middleware = requireLimit('tasks');

      await middleware(req, res, next);

      expect(mockCanCreate).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // ERROR HANDLING TESTS (FAIL-OPEN)
  // ===========================================================================

  describe('error handling (fail-open)', () => {
    test('allows request through when limitService throws error', async () => {
      mockCanCreate.mockRejectedValue(new Error('Database error'));

      const req = createMockReq(createMockUser());
      const res = createMockRes();
      const next = createMockNext();
      const middleware = requireLimit('notes');

      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });
});

// =============================================================================
// REQUIRESTORAGELIMIT TESTS
// =============================================================================

describe('requireStorageLimit middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ===========================================================================
  // STORAGE UNDER LIMIT TESTS
  // ===========================================================================

  describe('storage under limit', () => {
    test('allows upload when user is under storage limit', async () => {
      mockCanUploadImage.mockResolvedValue({
        allowed: true,
        currentBytes: 50 * 1024 * 1024,
        maxBytes: 100 * 1024 * 1024,
        currentCount: 50,
        maxCount: 100
      });

      const file = createMockFile(5 * 1024 * 1024);
      const req = createMockReq(createMockUser(), { file });
      const res = createMockRes();
      const next = createMockNext();

      await requireStorageLimit(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('attaches storageLimitInfo to request', async () => {
      const limitResult = {
        allowed: true,
        currentBytes: 10 * 1024 * 1024,
        maxBytes: 100 * 1024 * 1024,
        currentCount: 10,
        maxCount: 100
      };
      mockCanUploadImage.mockResolvedValue(limitResult);

      const file = createMockFile(1024);
      const req = createMockReq(createMockUser(), { file });
      const res = createMockRes();
      const next = createMockNext();

      await requireStorageLimit(req, res, next);

      expect(req.storageLimitInfo).toEqual(limitResult);
    });
  });

  // ===========================================================================
  // STORAGE LIMIT EXCEEDED TESTS
  // ===========================================================================

  describe('storage limit exceeded', () => {
    test('returns 403 when storage limit exceeded', async () => {
      mockCanUploadImage.mockResolvedValue({
        allowed: false,
        message: "You have exceeded your storage limit.",
        reason: 'STORAGE',
        currentBytes: 100 * 1024 * 1024,
        maxBytes: 100 * 1024 * 1024,
        currentCount: 50,
        maxCount: 100
      });

      const file = createMockFile(1024);
      const req = createMockReq(createMockUser(), { file });
      const res = createMockRes();
      const next = createMockNext();

      await requireStorageLimit(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.jsonData.code).toBe('LIMIT_EXCEEDED');
      expect(next).not.toHaveBeenCalled();
    });

    test('returns 403 when image count limit exceeded', async () => {
      mockCanUploadImage.mockResolvedValue({
        allowed: false,
        message: 'You have reached your image limit (100).',
        reason: 'IMAGE_COUNT',
        currentBytes: 50 * 1024 * 1024,
        maxBytes: 100 * 1024 * 1024,
        currentCount: 100,
        maxCount: 100
      });

      const file = createMockFile(1024);
      const req = createMockReq(createMockUser(), { file });
      const res = createMockRes();
      const next = createMockNext();

      await requireStorageLimit(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.jsonData.limitType).toBe('IMAGE_COUNT');
    });
  });

  // ===========================================================================
  // NO FILE UPLOADED TESTS
  // ===========================================================================

  describe('no file uploaded', () => {
    test('continues without checking limits when no file', async () => {
      const req = createMockReq(createMockUser(), { file: undefined });
      const res = createMockRes();
      const next = createMockNext();

      await requireStorageLimit(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(mockCanUploadImage).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // MISSING USER TESTS
  // ===========================================================================

  describe('missing user (authentication required)', () => {
    test('returns 401 when no user is present', async () => {
      const file = createMockFile(1024);
      const req = createMockReq(undefined, { file });
      const res = createMockRes();
      const next = createMockNext();

      await requireStorageLimit(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.jsonData.code).toBe('AUTH_REQUIRED');
      expect(next).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // ERROR HANDLING TESTS (FAIL-OPEN)
  // ===========================================================================

  describe('error handling (fail-open)', () => {
    test('allows upload when limitService throws error', async () => {
      mockCanUploadImage.mockRejectedValue(new Error('Service unavailable'));

      const file = createMockFile(1024);
      const req = createMockReq(createMockUser(), { file });
      const res = createMockRes();
      const next = createMockNext();

      await requireStorageLimit(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });
});

// =============================================================================
// REQUIRECATEGORYLIMIT TESTS
// =============================================================================

describe('requireCategoryLimit middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('is a pre-configured middleware for categories', async () => {
    mockCanCreate.mockResolvedValue({
      allowed: true,
      current: 3,
      max: 10
    });

    const req = createMockReq(createMockUser());
    const res = createMockRes();
    const next = createMockNext();

    await requireCategoryLimit(req, res, next);

    expect(mockCanCreate).toHaveBeenCalledWith(
      expect.anything(),
      'categories'
    );
  });

  test('blocks when category limit reached', async () => {
    mockCanCreate.mockResolvedValue({
      allowed: false,
      message: 'You have reached your category limit (10).',
      current: 10,
      max: 10
    });

    const req = createMockReq(createMockUser());
    const res = createMockRes();
    const next = createMockNext();

    await requireCategoryLimit(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.jsonData.limitType).toBe('categories');
  });

  test('allows when under category limit', async () => {
    mockCanCreate.mockResolvedValue({
      allowed: true,
      current: 5,
      max: 10
    });

    const req = createMockReq(createMockUser());
    const res = createMockRes();
    const next = createMockNext();

    await requireCategoryLimit(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});
