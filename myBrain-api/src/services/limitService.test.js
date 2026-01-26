/**
 * =============================================================================
 * LIMITSERVICE.TEST.JS - Comprehensive Tests for Limit Service
 * =============================================================================
 *
 * Tests the limit service functions for quota management in myBrain.
 * Uses Jest mocks for database models to test business logic in isolation.
 *
 * TEST CATEGORIES:
 * - canCreate() - Generic resource limit checking
 * - canUploadFile() - File upload validation (size, type, quota)
 * - canUploadImage() - Image-specific upload validation
 * - canCreateFolder() - Folder limit checking
 * - canCreateShare() - Share link limit checking
 * - isFileTypeAllowed() - File type validation logic
 * - formatBytes() - Byte formatting utility
 * - getUserLimitStatus() - Comprehensive status report
 * - getFileLimitStatus() - File-specific status report
 * - Edge cases and error handling
 * =============================================================================
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// =============================================================================
// MOCK SETUP - Must happen before importing the module under test
// =============================================================================

// Mock RoleConfig
const mockGetConfig = jest.fn();
jest.unstable_mockModule('../models/RoleConfig.js', () => ({
  default: {
    getConfig: mockGetConfig,
  },
}));

// Mock File
const mockGetStorageUsage = jest.fn();
jest.unstable_mockModule('../models/File.js', () => ({
  default: {
    getStorageUsage: mockGetStorageUsage,
  },
}));

// Mock Folder
const mockCountDocuments = jest.fn();
jest.unstable_mockModule('../models/Folder.js', () => ({
  default: {
    countDocuments: mockCountDocuments,
  },
}));

// Mock FileShare
const mockGetUserShareCount = jest.fn();
jest.unstable_mockModule('../models/FileShare.js', () => ({
  default: {
    getUserShareCount: mockGetUserShareCount,
  },
}));

// Import the module under test AFTER mocks are set up
const { default: limitService } = await import('./limitService.js');

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Create a mock user object with all required methods
 * @param {Object} overrides - Override default values
 * @returns {Object} Mock user object
 */
function createMockUser(overrides = {}) {
  const defaults = {
    _id: 'user123',
    role: 'free',
    limitOverrides: new Map(),
    getEffectiveLimits: jest.fn(),
    getCurrentUsage: jest.fn(),
  };

  return { ...defaults, ...overrides };
}

/**
 * Create mock role config with limits
 * @param {Object} limitOverrides - Override default limits
 * @returns {Object} Mock role config
 */
function createMockRoleConfig(limitOverrides = {}) {
  const defaultLimits = {
    maxNotes: 100,
    maxTasks: 50,
    maxProjects: 5,
    maxEvents: 50,
    maxImages: 20,
    maxStorageBytes: 100 * 1024 * 1024, // 100MB
    maxCategories: 3,
    maxFiles: 100,
    maxFileSize: 25 * 1024 * 1024, // 25MB
    maxFolders: 10,
    maxVersionsPerFile: 3,
    maxPublicShares: 5,
    allowedFileTypes: ['*'],
    forbiddenFileTypes: [],
  };

  return {
    limits: { ...defaultLimits, ...limitOverrides },
  };
}

// =============================================================================
// SETUP & TEARDOWN
// =============================================================================

beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
});

// =============================================================================
// canCreate() TESTS
// =============================================================================

describe('limitService.canCreate()', () => {
  describe('User under quota', () => {
    it('should allow creation when user is under quota', async () => {
      const mockUser = createMockUser();
      const mockConfig = createMockRoleConfig({ maxNotes: 100 });

      mockGetConfig.mockResolvedValue(mockConfig);
      mockUser.getEffectiveLimits.mockReturnValue(mockConfig.limits);
      mockUser.getCurrentUsage.mockResolvedValue({ notes: 45 });

      const result = await limitService.canCreate(mockUser, 'notes');

      expect(result.allowed).toBe(true);
      expect(result.current).toBe(45);
      expect(result.max).toBe(100);
      expect(result.message).toContain('55 notes remaining');
    });

    it('should allow creation with 1 remaining slot', async () => {
      const mockUser = createMockUser();
      const mockConfig = createMockRoleConfig({ maxNotes: 100 });

      mockGetConfig.mockResolvedValue(mockConfig);
      mockUser.getEffectiveLimits.mockReturnValue(mockConfig.limits);
      mockUser.getCurrentUsage.mockResolvedValue({ notes: 99 });

      const result = await limitService.canCreate(mockUser, 'notes');

      expect(result.allowed).toBe(true);
      expect(result.current).toBe(99);
      expect(result.message).toContain('1 notes remaining');
    });
  });

  describe('User at quota', () => {
    it('should deny creation when user is exactly at quota', async () => {
      const mockUser = createMockUser();
      const mockConfig = createMockRoleConfig({ maxNotes: 100 });

      mockGetConfig.mockResolvedValue(mockConfig);
      mockUser.getEffectiveLimits.mockReturnValue(mockConfig.limits);
      mockUser.getCurrentUsage.mockResolvedValue({ notes: 100 });

      const result = await limitService.canCreate(mockUser, 'notes');

      expect(result.allowed).toBe(false);
      expect(result.current).toBe(100);
      expect(result.max).toBe(100);
      expect(result.message).toContain('reached your limit');
      expect(result.message).toContain('Upgrade to premium');
    });

    it('should deny creation when user is over quota', async () => {
      const mockUser = createMockUser();
      const mockConfig = createMockRoleConfig({ maxNotes: 100 });

      mockGetConfig.mockResolvedValue(mockConfig);
      mockUser.getEffectiveLimits.mockReturnValue(mockConfig.limits);
      mockUser.getCurrentUsage.mockResolvedValue({ notes: 150 });

      const result = await limitService.canCreate(mockUser, 'notes');

      expect(result.allowed).toBe(false);
      expect(result.current).toBe(150);
    });
  });

  describe('Unlimited access (-1)', () => {
    it('should allow creation when limit is -1 (unlimited)', async () => {
      const mockUser = createMockUser({ role: 'premium' });
      const mockConfig = createMockRoleConfig({ maxNotes: -1 });

      mockGetConfig.mockResolvedValue(mockConfig);
      mockUser.getEffectiveLimits.mockReturnValue(mockConfig.limits);

      const result = await limitService.canCreate(mockUser, 'notes');

      expect(result.allowed).toBe(true);
      expect(result.max).toBe(-1);
      expect(result.message).toBe('Unlimited');
      // getCurrentUsage should not be called for unlimited
      expect(mockUser.getCurrentUsage).not.toHaveBeenCalled();
    });
  });

  describe('Different resource types', () => {
    it.each([
      ['notes', 'maxNotes'],
      ['tasks', 'maxTasks'],
      ['projects', 'maxProjects'],
      ['events', 'maxEvents'],
      ['images', 'maxImages'],
      ['files', 'maxFiles'],
      ['folders', 'maxFolders'],
    ])('should check limits for %s resource type', async (resourceType, limitKey) => {
      const mockUser = createMockUser();
      const mockConfig = createMockRoleConfig({ [limitKey]: 50 });

      mockGetConfig.mockResolvedValue(mockConfig);
      mockUser.getEffectiveLimits.mockReturnValue(mockConfig.limits);
      mockUser.getCurrentUsage.mockResolvedValue({ [resourceType]: 25 });

      const result = await limitService.canCreate(mockUser, resourceType);

      expect(result.allowed).toBe(true);
      expect(result.current).toBe(25);
      expect(result.max).toBe(50);
    });
  });

  describe('Unknown resource type (fail-open)', () => {
    it('should allow unknown resource types (fail-open behavior)', async () => {
      const mockUser = createMockUser();

      const result = await limitService.canCreate(mockUser, 'unknownResource');

      expect(result.allowed).toBe(true);
      expect(result.max).toBe(-1);
      expect(result.message).toBe('Unknown resource type');
    });
  });

  describe('Error handling (fail-open)', () => {
    it('should allow creation when database error occurs', async () => {
      const mockUser = createMockUser();

      mockGetConfig.mockRejectedValue(new Error('Database error'));

      const result = await limitService.canCreate(mockUser, 'notes');

      expect(result.allowed).toBe(true);
      expect(result.message).toBe('Unable to verify limits');
    });

    it('should allow creation when getCurrentUsage throws', async () => {
      const mockUser = createMockUser();
      const mockConfig = createMockRoleConfig({ maxNotes: 100 });

      mockGetConfig.mockResolvedValue(mockConfig);
      mockUser.getEffectiveLimits.mockReturnValue(mockConfig.limits);
      mockUser.getCurrentUsage.mockRejectedValue(new Error('Usage fetch failed'));

      const result = await limitService.canCreate(mockUser, 'notes');

      expect(result.allowed).toBe(true);
      expect(result.message).toBe('Unable to verify limits');
    });
  });
});

// =============================================================================
// canUploadFile() TESTS
// =============================================================================

describe('limitService.canUploadFile()', () => {
  describe('Forbidden extensions (security)', () => {
    it.each([
      ['.exe', 'Windows executable'],
      ['.bat', 'Batch script'],
      ['.cmd', 'Command script'],
      ['.sh', 'Shell script'],
      ['.ps1', 'PowerShell script'],
      ['.vbs', 'VBScript'],
      ['.jar', 'Java archive'],
      ['.msi', 'Windows installer'],
      ['.dll', 'Dynamic link library'],
      ['.scr', 'Screensaver'],
      ['.com', 'DOS executable'],
      ['.pif', 'Program Information File'],
      ['.hta', 'HTML Application'],
      ['.cpl', 'Control Panel extension'],
      ['.msc', 'Management Console snap-in'],
    ])('should block %s files (%s)', async (extension, description) => {
      const mockUser = createMockUser();

      const result = await limitService.canUploadFile(
        mockUser,
        1024, // 1KB file
        'application/octet-stream',
        extension
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('FORBIDDEN_TYPE');
      expect(result.message).toContain('not allowed for security reasons');
    });

    it('should block forbidden extensions regardless of case', async () => {
      const mockUser = createMockUser();

      const result = await limitService.canUploadFile(
        mockUser,
        1024,
        'application/octet-stream',
        '.EXE'
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('FORBIDDEN_TYPE');
    });

    it('should block .Bat with mixed case', async () => {
      const mockUser = createMockUser();

      const result = await limitService.canUploadFile(
        mockUser,
        1024,
        'text/plain',
        '.Bat'
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('FORBIDDEN_TYPE');
    });
  });

  describe('File size validation', () => {
    it('should allow file under size limit', async () => {
      const mockUser = createMockUser();
      const mockConfig = createMockRoleConfig({
        maxFileSize: 25 * 1024 * 1024, // 25MB
        maxFiles: -1,
        maxStorageBytes: -1,
      });

      mockGetConfig.mockResolvedValue(mockConfig);
      mockUser.getEffectiveLimits.mockReturnValue(mockConfig.limits);
      mockGetStorageUsage.mockResolvedValue({
        fileCount: 10,
        trashedCount: 0,
        totalSize: 50 * 1024 * 1024, // 50MB
        trashedSize: 0,
      });

      const result = await limitService.canUploadFile(
        mockUser,
        10 * 1024 * 1024, // 10MB file
        'application/pdf',
        '.pdf'
      );

      expect(result.allowed).toBe(true);
    });

    it('should reject file exceeding per-file size limit', async () => {
      const mockUser = createMockUser();
      const mockConfig = createMockRoleConfig({
        maxFileSize: 25 * 1024 * 1024, // 25MB
      });

      mockGetConfig.mockResolvedValue(mockConfig);
      mockUser.getEffectiveLimits.mockReturnValue(mockConfig.limits);

      const result = await limitService.canUploadFile(
        mockUser,
        30 * 1024 * 1024, // 30MB file
        'application/pdf',
        '.pdf'
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('FILE_TOO_LARGE');
      expect(result.message).toContain('exceeds the maximum allowed file size');
    });

    it('should allow file when size limit is -1 (unlimited)', async () => {
      const mockUser = createMockUser({ role: 'admin' });
      const mockConfig = createMockRoleConfig({
        maxFileSize: -1,
        maxFiles: -1,
        maxStorageBytes: -1,
      });

      mockGetConfig.mockResolvedValue(mockConfig);
      mockUser.getEffectiveLimits.mockReturnValue(mockConfig.limits);
      mockGetStorageUsage.mockResolvedValue({
        fileCount: 0,
        trashedCount: 0,
        totalSize: 0,
        trashedSize: 0,
      });

      const result = await limitService.canUploadFile(
        mockUser,
        500 * 1024 * 1024, // 500MB file
        'video/mp4',
        '.mp4'
      );

      expect(result.allowed).toBe(true);
    });
  });

  describe('File count validation', () => {
    it('should reject when user at file count limit', async () => {
      const mockUser = createMockUser();
      const mockConfig = createMockRoleConfig({
        maxFiles: 100,
        maxFileSize: -1,
        maxStorageBytes: -1,
      });

      mockGetConfig.mockResolvedValue(mockConfig);
      mockUser.getEffectiveLimits.mockReturnValue(mockConfig.limits);
      mockGetStorageUsage.mockResolvedValue({
        fileCount: 100,
        trashedCount: 0,
        totalSize: 50 * 1024 * 1024,
        trashedSize: 0,
      });

      const result = await limitService.canUploadFile(
        mockUser,
        1024,
        'application/pdf',
        '.pdf'
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('FILE_COUNT_EXCEEDED');
      expect(result.message).toContain('reached your limit of 100 files');
    });

    it('should not count trashed files against limit', async () => {
      const mockUser = createMockUser();
      const mockConfig = createMockRoleConfig({
        maxFiles: 100,
        maxFileSize: -1,
        maxStorageBytes: -1,
      });

      mockGetConfig.mockResolvedValue(mockConfig);
      mockUser.getEffectiveLimits.mockReturnValue(mockConfig.limits);
      mockGetStorageUsage.mockResolvedValue({
        fileCount: 110, // Total files
        trashedCount: 15, // 15 in trash
        totalSize: 50 * 1024 * 1024,
        trashedSize: 5 * 1024 * 1024,
      });

      // Active files = 110 - 15 = 95, under limit
      const result = await limitService.canUploadFile(
        mockUser,
        1024,
        'application/pdf',
        '.pdf'
      );

      expect(result.allowed).toBe(true);
    });
  });

  describe('Storage quota validation', () => {
    it('should reject when upload would exceed storage quota', async () => {
      const mockUser = createMockUser();
      const mockConfig = createMockRoleConfig({
        maxFiles: -1,
        maxFileSize: -1,
        maxStorageBytes: 100 * 1024 * 1024, // 100MB
      });

      mockGetConfig.mockResolvedValue(mockConfig);
      mockUser.getEffectiveLimits.mockReturnValue(mockConfig.limits);
      mockGetStorageUsage.mockResolvedValue({
        fileCount: 50,
        trashedCount: 0,
        totalSize: 95 * 1024 * 1024, // 95MB used
        trashedSize: 0,
      });

      const result = await limitService.canUploadFile(
        mockUser,
        10 * 1024 * 1024, // 10MB file would exceed limit
        'application/pdf',
        '.pdf'
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('STORAGE_EXCEEDED');
      expect(result.message).toContain('would exceed your storage limit');
    });

    it('should allow upload exactly at quota boundary', async () => {
      const mockUser = createMockUser();
      const mockConfig = createMockRoleConfig({
        maxFiles: -1,
        maxFileSize: -1,
        maxStorageBytes: 100 * 1024 * 1024, // 100MB
      });

      mockGetConfig.mockResolvedValue(mockConfig);
      mockUser.getEffectiveLimits.mockReturnValue(mockConfig.limits);
      mockGetStorageUsage.mockResolvedValue({
        fileCount: 50,
        trashedCount: 0,
        totalSize: 95 * 1024 * 1024, // 95MB used
        trashedSize: 0,
      });

      const result = await limitService.canUploadFile(
        mockUser,
        5 * 1024 * 1024, // 5MB file exactly reaches limit
        'application/pdf',
        '.pdf'
      );

      expect(result.allowed).toBe(true);
    });
  });

  describe('File type restrictions', () => {
    it('should reject when file type not in allowed list', async () => {
      const mockUser = createMockUser();
      const mockConfig = createMockRoleConfig({
        maxFiles: -1,
        maxFileSize: -1,
        maxStorageBytes: -1,
        allowedFileTypes: ['image/*', 'application/pdf'],
        forbiddenFileTypes: [],
      });

      mockGetConfig.mockResolvedValue(mockConfig);
      mockUser.getEffectiveLimits.mockReturnValue(mockConfig.limits);
      mockGetStorageUsage.mockResolvedValue({
        fileCount: 0,
        trashedCount: 0,
        totalSize: 0,
        trashedSize: 0,
      });

      const result = await limitService.canUploadFile(
        mockUser,
        1024,
        'video/mp4',
        '.mp4'
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('TYPE_NOT_ALLOWED');
    });

    it('should allow when file type is in allowed list', async () => {
      const mockUser = createMockUser();
      const mockConfig = createMockRoleConfig({
        maxFiles: -1,
        maxFileSize: -1,
        maxStorageBytes: -1,
        allowedFileTypes: ['image/*', 'application/pdf'],
        forbiddenFileTypes: [],
      });

      mockGetConfig.mockResolvedValue(mockConfig);
      mockUser.getEffectiveLimits.mockReturnValue(mockConfig.limits);
      mockGetStorageUsage.mockResolvedValue({
        fileCount: 0,
        trashedCount: 0,
        totalSize: 0,
        trashedSize: 0,
      });

      const result = await limitService.canUploadFile(
        mockUser,
        1024,
        'image/png',
        '.png'
      );

      expect(result.allowed).toBe(true);
    });
  });

  describe('Admin unlimited access', () => {
    it('should allow admin to upload any file size', async () => {
      const mockUser = createMockUser({ role: 'admin' });
      const mockConfig = createMockRoleConfig({
        maxFiles: -1,
        maxFileSize: -1,
        maxStorageBytes: -1,
      });

      mockGetConfig.mockResolvedValue(mockConfig);
      mockUser.getEffectiveLimits.mockReturnValue(mockConfig.limits);
      mockGetStorageUsage.mockResolvedValue({
        fileCount: 1000,
        trashedCount: 0,
        totalSize: 100 * 1024 * 1024 * 1024, // 100GB
        trashedSize: 0,
      });

      const result = await limitService.canUploadFile(
        mockUser,
        1 * 1024 * 1024 * 1024, // 1GB file
        'video/mp4',
        '.mp4'
      );

      expect(result.allowed).toBe(true);
    });

    it('should still block forbidden extensions for admin', async () => {
      const mockUser = createMockUser({ role: 'admin' });
      const mockConfig = createMockRoleConfig({
        maxFiles: -1,
        maxFileSize: -1,
        maxStorageBytes: -1,
      });

      mockGetConfig.mockResolvedValue(mockConfig);
      mockUser.getEffectiveLimits.mockReturnValue(mockConfig.limits);

      const result = await limitService.canUploadFile(
        mockUser,
        1024,
        'application/octet-stream',
        '.exe'
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('FORBIDDEN_TYPE');
    });
  });

  describe('Error handling (fail-open)', () => {
    it('should allow upload when database error occurs', async () => {
      const mockUser = createMockUser();

      mockGetConfig.mockRejectedValue(new Error('Database error'));

      const result = await limitService.canUploadFile(
        mockUser,
        1024,
        'application/pdf',
        '.pdf'
      );

      expect(result.allowed).toBe(true);
      expect(result.message).toBe('Unable to verify limits');
    });
  });

  describe('Return values', () => {
    it('should return remaining files and storage when allowed', async () => {
      const mockUser = createMockUser();
      const mockConfig = createMockRoleConfig({
        maxFiles: 100,
        maxFileSize: -1,
        maxStorageBytes: 100 * 1024 * 1024,
      });

      mockGetConfig.mockResolvedValue(mockConfig);
      mockUser.getEffectiveLimits.mockReturnValue(mockConfig.limits);
      mockGetStorageUsage.mockResolvedValue({
        fileCount: 50,
        trashedCount: 0,
        totalSize: 40 * 1024 * 1024,
        trashedSize: 0,
      });

      const result = await limitService.canUploadFile(
        mockUser,
        1024,
        'application/pdf',
        '.pdf'
      );

      expect(result.allowed).toBe(true);
      expect(result.remainingFiles).toBe(50);
      expect(result.remainingStorage).toBe(60 * 1024 * 1024);
      expect(result.currentFiles).toBe(50);
      expect(result.currentBytes).toBe(40 * 1024 * 1024);
    });
  });
});

// =============================================================================
// canUploadImage() TESTS
// =============================================================================

describe('limitService.canUploadImage()', () => {
  describe('Image count limits', () => {
    it('should allow upload when under image limit', async () => {
      const mockUser = createMockUser();
      const mockConfig = createMockRoleConfig({
        maxImages: 20,
        maxStorageBytes: 100 * 1024 * 1024,
      });

      mockGetConfig.mockResolvedValue(mockConfig);
      mockUser.getEffectiveLimits.mockReturnValue(mockConfig.limits);
      mockUser.getCurrentUsage.mockResolvedValue({
        images: 10,
        storageBytes: 50 * 1024 * 1024,
      });

      const result = await limitService.canUploadImage(
        mockUser,
        1 * 1024 * 1024 // 1MB file
      );

      expect(result.allowed).toBe(true);
      expect(result.currentCount).toBe(10);
      expect(result.maxCount).toBe(20);
    });

    it('should reject when at image count limit', async () => {
      const mockUser = createMockUser();
      const mockConfig = createMockRoleConfig({
        maxImages: 20,
        maxStorageBytes: -1,
      });

      mockGetConfig.mockResolvedValue(mockConfig);
      mockUser.getEffectiveLimits.mockReturnValue(mockConfig.limits);
      mockUser.getCurrentUsage.mockResolvedValue({
        images: 20,
        storageBytes: 50 * 1024 * 1024,
      });

      const result = await limitService.canUploadImage(
        mockUser,
        1 * 1024 * 1024
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('IMAGE_COUNT_EXCEEDED');
      expect(result.message).toContain('reached your limit of 20 images');
    });
  });

  describe('Storage quota limits', () => {
    it('should reject when upload would exceed storage', async () => {
      const mockUser = createMockUser();
      const mockConfig = createMockRoleConfig({
        maxImages: -1,
        maxStorageBytes: 100 * 1024 * 1024,
      });

      mockGetConfig.mockResolvedValue(mockConfig);
      mockUser.getEffectiveLimits.mockReturnValue(mockConfig.limits);
      mockUser.getCurrentUsage.mockResolvedValue({
        images: 10,
        storageBytes: 95 * 1024 * 1024, // 95MB used
      });

      const result = await limitService.canUploadImage(
        mockUser,
        10 * 1024 * 1024 // 10MB file would exceed
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('STORAGE_EXCEEDED');
    });
  });

  describe('Role-based limits', () => {
    it('should allow unlimited images for premium user', async () => {
      const mockUser = createMockUser({ role: 'premium' });
      const mockConfig = createMockRoleConfig({
        maxImages: -1,
        maxStorageBytes: -1,
      });

      mockGetConfig.mockResolvedValue(mockConfig);
      mockUser.getEffectiveLimits.mockReturnValue(mockConfig.limits);
      mockUser.getCurrentUsage.mockResolvedValue({
        images: 1000,
        storageBytes: 5 * 1024 * 1024 * 1024, // 5GB
      });

      const result = await limitService.canUploadImage(
        mockUser,
        50 * 1024 * 1024 // 50MB file
      );

      expect(result.allowed).toBe(true);
    });
  });

  describe('Error handling (fail-open)', () => {
    it('should allow upload when error occurs', async () => {
      const mockUser = createMockUser();

      mockGetConfig.mockRejectedValue(new Error('Database error'));

      const result = await limitService.canUploadImage(mockUser, 1024);

      expect(result.allowed).toBe(true);
      expect(result.message).toBe('Unable to verify limits');
    });
  });
});

// =============================================================================
// isFileTypeAllowed() TESTS
// =============================================================================

describe('limitService.isFileTypeAllowed()', () => {
  describe('Allowed extensions', () => {
    it('should allow extension when in allowed list', () => {
      const result = limitService.isFileTypeAllowed(
        'application/pdf',
        '.pdf',
        ['.pdf', '.doc'],
        []
      );

      expect(result).toBe(true);
    });

    it('should allow extension case-insensitively', () => {
      const result = limitService.isFileTypeAllowed(
        'application/pdf',
        '.PDF',
        ['.pdf'],
        []
      );

      expect(result).toBe(true);
    });
  });

  describe('Forbidden extensions', () => {
    it('should block extension when in forbidden list', () => {
      const result = limitService.isFileTypeAllowed(
        'video/mp4',
        '.mp4',
        ['*'],
        ['.mp4']
      );

      expect(result).toBe(false);
    });

    it('should block forbidden extension case-insensitively', () => {
      const result = limitService.isFileTypeAllowed(
        'video/mp4',
        '.MP4',
        ['*'],
        ['.mp4']
      );

      expect(result).toBe(false);
    });

    it('should block exact MIME type in forbidden list', () => {
      const result = limitService.isFileTypeAllowed(
        'video/mp4',
        '.mp4',
        ['*'],
        ['video/mp4']
      );

      expect(result).toBe(false);
    });
  });

  describe('Wildcard matching', () => {
    it('should allow any type when allowed list contains *', () => {
      const result = limitService.isFileTypeAllowed(
        'application/octet-stream',
        '.xyz',
        ['*'],
        []
      );

      expect(result).toBe(true);
    });

    it('should allow any type when allowed list is empty', () => {
      const result = limitService.isFileTypeAllowed(
        'application/pdf',
        '.pdf',
        [],
        []
      );

      expect(result).toBe(true);
    });

    it('should match MIME wildcard patterns', () => {
      const result = limitService.isFileTypeAllowed(
        'image/png',
        '.png',
        ['image/*'],
        []
      );

      expect(result).toBe(true);
    });

    it('should match any image type with image/* pattern', () => {
      expect(limitService.isFileTypeAllowed('image/jpeg', '.jpg', ['image/*'], [])).toBe(true);
      expect(limitService.isFileTypeAllowed('image/gif', '.gif', ['image/*'], [])).toBe(true);
      expect(limitService.isFileTypeAllowed('image/webp', '.webp', ['image/*'], [])).toBe(true);
    });

    it('should not match video when only image/* is allowed', () => {
      const result = limitService.isFileTypeAllowed(
        'video/mp4',
        '.mp4',
        ['image/*'],
        []
      );

      expect(result).toBe(false);
    });

    it('should block wildcard MIME patterns in forbidden list', () => {
      const result = limitService.isFileTypeAllowed(
        'image/png',
        '.png',
        ['*'],
        ['image/*']
      );

      expect(result).toBe(false);
    });
  });

  describe('Precedence rules', () => {
    it('should block type in forbidden list even if in allowed list', () => {
      const result = limitService.isFileTypeAllowed(
        'image/png',
        '.png',
        ['.png', 'image/*'],
        ['.png']
      );

      expect(result).toBe(false);
    });

    it('should check forbidden list before allowed list', () => {
      const result = limitService.isFileTypeAllowed(
        'image/png',
        '.png',
        ['image/*'],
        ['image/*']
      );

      expect(result).toBe(false);
    });
  });

  describe('Edge cases', () => {
    it('should handle null mimeType', () => {
      const result = limitService.isFileTypeAllowed(
        null,
        '.pdf',
        ['.pdf'],
        []
      );

      expect(result).toBe(true);
    });

    it('should handle null extension', () => {
      const result = limitService.isFileTypeAllowed(
        'application/pdf',
        null,
        ['application/pdf'],
        []
      );

      expect(result).toBe(true);
    });

    it('should handle both null', () => {
      const result = limitService.isFileTypeAllowed(
        null,
        null,
        ['*'],
        []
      );

      expect(result).toBe(true);
    });

    it('should reject when nothing matches and allowed list is restrictive', () => {
      const result = limitService.isFileTypeAllowed(
        'text/plain',
        '.txt',
        ['image/*', 'application/pdf'],
        []
      );

      expect(result).toBe(false);
    });
  });
});

// =============================================================================
// canCreateFolder() TESTS
// =============================================================================

describe('limitService.canCreateFolder()', () => {
  it('should allow folder creation when under limit', async () => {
    const mockUser = createMockUser();
    const mockConfig = createMockRoleConfig({ maxFolders: 10 });

    mockGetConfig.mockResolvedValue(mockConfig);
    mockUser.getEffectiveLimits.mockReturnValue(mockConfig.limits);
    mockCountDocuments.mockResolvedValue(5);

    const result = await limitService.canCreateFolder(mockUser);

    expect(result.allowed).toBe(true);
    expect(result.current).toBe(5);
    expect(result.max).toBe(10);
    expect(result.message).toContain('5 folders remaining');
  });

  it('should deny folder creation when at limit', async () => {
    const mockUser = createMockUser();
    const mockConfig = createMockRoleConfig({ maxFolders: 10 });

    mockGetConfig.mockResolvedValue(mockConfig);
    mockUser.getEffectiveLimits.mockReturnValue(mockConfig.limits);
    mockCountDocuments.mockResolvedValue(10);

    const result = await limitService.canCreateFolder(mockUser);

    expect(result.allowed).toBe(false);
    expect(result.message).toContain('reached your limit of 10 folders');
  });

  it('should allow unlimited folders when limit is -1', async () => {
    const mockUser = createMockUser({ role: 'premium' });
    const mockConfig = createMockRoleConfig({ maxFolders: -1 });

    mockGetConfig.mockResolvedValue(mockConfig);
    mockUser.getEffectiveLimits.mockReturnValue(mockConfig.limits);

    const result = await limitService.canCreateFolder(mockUser);

    expect(result.allowed).toBe(true);
    expect(result.max).toBe(-1);
    expect(result.message).toBe('Unlimited folders');
  });

  it('should not count trashed folders', async () => {
    const mockUser = createMockUser();
    const mockConfig = createMockRoleConfig({ maxFolders: 10 });

    mockGetConfig.mockResolvedValue(mockConfig);
    mockUser.getEffectiveLimits.mockReturnValue(mockConfig.limits);

    // Verify the query filters out trashed folders
    mockCountDocuments.mockImplementation((query) => {
      expect(query.isTrashed).toBe(false);
      return Promise.resolve(5);
    });

    await limitService.canCreateFolder(mockUser);

    expect(mockCountDocuments).toHaveBeenCalledWith({
      userId: mockUser._id,
      isTrashed: false,
    });
  });

  it('should handle errors gracefully', async () => {
    const mockUser = createMockUser();

    mockGetConfig.mockRejectedValue(new Error('Database error'));

    const result = await limitService.canCreateFolder(mockUser);

    expect(result.allowed).toBe(true);
    expect(result.message).toBe('Unable to verify limits');
  });
});

// =============================================================================
// canCreateShare() TESTS
// =============================================================================

describe('limitService.canCreateShare()', () => {
  it('should allow share creation when under limit', async () => {
    const mockUser = createMockUser();
    const mockConfig = createMockRoleConfig({ maxPublicShares: 5 });

    mockGetConfig.mockResolvedValue(mockConfig);
    mockUser.getEffectiveLimits.mockReturnValue(mockConfig.limits);
    mockGetUserShareCount.mockResolvedValue(2);

    const result = await limitService.canCreateShare(mockUser);

    expect(result.allowed).toBe(true);
    expect(result.current).toBe(2);
    expect(result.max).toBe(5);
    expect(result.message).toContain('3 share links remaining');
  });

  it('should deny share creation when at limit', async () => {
    const mockUser = createMockUser();
    const mockConfig = createMockRoleConfig({ maxPublicShares: 5 });

    mockGetConfig.mockResolvedValue(mockConfig);
    mockUser.getEffectiveLimits.mockReturnValue(mockConfig.limits);
    mockGetUserShareCount.mockResolvedValue(5);

    const result = await limitService.canCreateShare(mockUser);

    expect(result.allowed).toBe(false);
    expect(result.message).toContain('reached your limit of 5 share links');
  });

  it('should allow unlimited shares when limit is -1', async () => {
    const mockUser = createMockUser({ role: 'premium' });
    const mockConfig = createMockRoleConfig({ maxPublicShares: -1 });

    mockGetConfig.mockResolvedValue(mockConfig);
    mockUser.getEffectiveLimits.mockReturnValue(mockConfig.limits);

    const result = await limitService.canCreateShare(mockUser);

    expect(result.allowed).toBe(true);
    expect(result.max).toBe(-1);
    expect(result.message).toBe('Unlimited shares');
  });

  it('should handle errors gracefully', async () => {
    const mockUser = createMockUser();

    mockGetConfig.mockRejectedValue(new Error('Database error'));

    const result = await limitService.canCreateShare(mockUser);

    expect(result.allowed).toBe(true);
    expect(result.message).toBe('Unable to verify limits');
  });
});

// =============================================================================
// formatBytes() TESTS
// =============================================================================

describe('limitService.formatBytes()', () => {
  it('should format 0 bytes', () => {
    expect(limitService.formatBytes(0)).toBe('0 Bytes');
  });

  it('should format bytes (< 1KB)', () => {
    expect(limitService.formatBytes(500)).toBe('500 Bytes');
  });

  it('should format kilobytes', () => {
    expect(limitService.formatBytes(1024)).toBe('1 KB');
    expect(limitService.formatBytes(1536)).toBe('1.5 KB');
  });

  it('should format megabytes', () => {
    expect(limitService.formatBytes(1048576)).toBe('1 MB');
    expect(limitService.formatBytes(52428800)).toBe('50 MB');
  });

  it('should format gigabytes', () => {
    expect(limitService.formatBytes(1073741824)).toBe('1 GB');
    expect(limitService.formatBytes(1610612736)).toBe('1.5 GB');
  });

  it('should round to 2 decimal places', () => {
    // 1.234 MB
    expect(limitService.formatBytes(1294336)).toBe('1.23 MB');
  });
});

// =============================================================================
// getUserLimitStatus() TESTS
// =============================================================================

describe('limitService.getUserLimitStatus()', () => {
  it('should return comprehensive status report', async () => {
    const mockUser = createMockUser();
    mockUser.limitOverrides = null;

    const mockConfig = createMockRoleConfig({
      maxNotes: 100,
      maxTasks: 50,
      maxStorageBytes: 100 * 1024 * 1024,
    });

    mockGetConfig.mockResolvedValue(mockConfig);
    mockUser.getEffectiveLimits.mockReturnValue(mockConfig.limits);
    mockUser.getCurrentUsage.mockResolvedValue({
      notes: 45,
      tasks: 30,
      storageBytes: 50 * 1024 * 1024,
    });

    const result = await limitService.getUserLimitStatus(mockUser);

    expect(result.role).toBe('free');
    expect(result.status.notes.current).toBe(45);
    expect(result.status.notes.max).toBe(100);
    expect(result.status.notes.percentage).toBe(45);
    expect(result.status.notes.remaining).toBe(55);
    expect(result.status.storage).toBeDefined();
  });

  it('should calculate correct percentage', async () => {
    const mockUser = createMockUser();
    mockUser.limitOverrides = null;

    const mockConfig = createMockRoleConfig({ maxNotes: 100 });

    mockGetConfig.mockResolvedValue(mockConfig);
    mockUser.getEffectiveLimits.mockReturnValue(mockConfig.limits);
    mockUser.getCurrentUsage.mockResolvedValue({ notes: 75 });

    const result = await limitService.getUserLimitStatus(mockUser);

    expect(result.status.notes.percentage).toBe(75);
  });

  it('should show unlimited correctly', async () => {
    const mockUser = createMockUser({ role: 'premium' });
    mockUser.limitOverrides = null;

    const mockConfig = createMockRoleConfig({ maxNotes: -1 });

    mockGetConfig.mockResolvedValue(mockConfig);
    mockUser.getEffectiveLimits.mockReturnValue(mockConfig.limits);
    mockUser.getCurrentUsage.mockResolvedValue({ notes: 1000 });

    const result = await limitService.getUserLimitStatus(mockUser);

    expect(result.status.notes.unlimited).toBe(true);
    expect(result.status.notes.remaining).toBeNull();
    expect(result.status.notes.percentage).toBe(0);
  });

  it('should throw on error (not fail-open)', async () => {
    const mockUser = createMockUser();

    mockGetConfig.mockRejectedValue(new Error('Database error'));

    await expect(limitService.getUserLimitStatus(mockUser))
      .rejects.toThrow('Database error');
  });
});

// =============================================================================
// getFileLimitStatus() TESTS
// =============================================================================

describe('limitService.getFileLimitStatus()', () => {
  it('should return detailed file status', async () => {
    const mockUser = createMockUser();
    const mockConfig = createMockRoleConfig({
      maxFiles: 100,
      maxFileSize: 25 * 1024 * 1024,
      maxFolders: 10,
      maxStorageBytes: 100 * 1024 * 1024,
      maxPublicShares: 5,
      maxVersionsPerFile: 3,
    });

    mockGetConfig.mockResolvedValue(mockConfig);
    mockUser.getEffectiveLimits.mockReturnValue(mockConfig.limits);
    mockGetStorageUsage.mockResolvedValue({
      fileCount: 50,
      trashedCount: 5,
      totalSize: 60 * 1024 * 1024,
      trashedSize: 10 * 1024 * 1024,
    });
    mockCountDocuments.mockResolvedValue(3);
    mockGetUserShareCount.mockResolvedValue(2);

    const result = await limitService.getFileLimitStatus(mockUser);

    // Active files = 50 - 5 = 45
    expect(result.files.current).toBe(45);
    expect(result.files.max).toBe(100);
    expect(result.files.remaining).toBe(55);

    // Active storage = 60MB - 10MB = 50MB
    expect(result.storage.currentBytes).toBe(50 * 1024 * 1024);

    expect(result.folders.current).toBe(3);
    expect(result.shares.current).toBe(2);
    expect(result.maxFileSize.bytes).toBe(25 * 1024 * 1024);

    // Trashed info
    expect(result.trashed.files).toBe(5);
    expect(result.trashed.size).toBe(10 * 1024 * 1024);
  });

  it('should show unlimited status correctly', async () => {
    const mockUser = createMockUser({ role: 'admin' });
    const mockConfig = createMockRoleConfig({
      maxFiles: -1,
      maxFileSize: -1,
      maxFolders: -1,
      maxStorageBytes: -1,
      maxPublicShares: -1,
      maxVersionsPerFile: -1,
    });

    mockGetConfig.mockResolvedValue(mockConfig);
    mockUser.getEffectiveLimits.mockReturnValue(mockConfig.limits);
    mockGetStorageUsage.mockResolvedValue({
      fileCount: 1000,
      trashedCount: 0,
      totalSize: 500 * 1024 * 1024 * 1024,
      trashedSize: 0,
    });
    mockCountDocuments.mockResolvedValue(100);
    mockGetUserShareCount.mockResolvedValue(50);

    const result = await limitService.getFileLimitStatus(mockUser);

    expect(result.files.unlimited).toBe(true);
    expect(result.storage.unlimited).toBe(true);
    expect(result.maxFileSize.unlimited).toBe(true);
    expect(result.versioning.unlimited).toBe(true);
  });

  it('should throw on error (not fail-open)', async () => {
    const mockUser = createMockUser();

    mockGetConfig.mockRejectedValue(new Error('Database error'));

    await expect(limitService.getFileLimitStatus(mockUser))
      .rejects.toThrow('Database error');
  });
});

// =============================================================================
// EXPORTED CONSTANTS TESTS
// =============================================================================

describe('limitService exported constants', () => {
  describe('FORBIDDEN_EXTENSIONS', () => {
    it('should contain all dangerous extensions', () => {
      const { FORBIDDEN_EXTENSIONS } = limitService;

      expect(FORBIDDEN_EXTENSIONS).toContain('.exe');
      expect(FORBIDDEN_EXTENSIONS).toContain('.bat');
      expect(FORBIDDEN_EXTENSIONS).toContain('.sh');
      expect(FORBIDDEN_EXTENSIONS).toContain('.ps1');
      expect(FORBIDDEN_EXTENSIONS).toContain('.dll');
    });

    it('should have all extensions in lowercase', () => {
      const { FORBIDDEN_EXTENSIONS } = limitService;

      FORBIDDEN_EXTENSIONS.forEach((ext) => {
        expect(ext).toBe(ext.toLowerCase());
      });
    });
  });

  describe('RESOURCE_LIMIT_MAP', () => {
    it('should map resource types to limit keys', () => {
      const { RESOURCE_LIMIT_MAP } = limitService;

      expect(RESOURCE_LIMIT_MAP.notes).toBe('maxNotes');
      expect(RESOURCE_LIMIT_MAP.tasks).toBe('maxTasks');
      expect(RESOURCE_LIMIT_MAP.projects).toBe('maxProjects');
      expect(RESOURCE_LIMIT_MAP.files).toBe('maxFiles');
    });
  });

  describe('RESOURCE_USAGE_MAP', () => {
    it('should map resource types to usage keys', () => {
      const { RESOURCE_USAGE_MAP } = limitService;

      expect(RESOURCE_USAGE_MAP.notes).toBe('notes');
      expect(RESOURCE_USAGE_MAP.tasks).toBe('tasks');
      expect(RESOURCE_USAGE_MAP.projects).toBe('projects');
      expect(RESOURCE_USAGE_MAP.files).toBe('files');
    });
  });
});

// =============================================================================
// BOUNDARY CONDITION TESTS
// =============================================================================

describe('Boundary conditions', () => {
  describe('Exactly at limit', () => {
    it('should deny when exactly at quota for canCreate', async () => {
      const mockUser = createMockUser();
      const mockConfig = createMockRoleConfig({ maxNotes: 100 });

      mockGetConfig.mockResolvedValue(mockConfig);
      mockUser.getEffectiveLimits.mockReturnValue(mockConfig.limits);
      mockUser.getCurrentUsage.mockResolvedValue({ notes: 100 });

      const result = await limitService.canCreate(mockUser, 'notes');

      expect(result.allowed).toBe(false);
    });

    it('should allow when at quota minus one for canCreate', async () => {
      const mockUser = createMockUser();
      const mockConfig = createMockRoleConfig({ maxNotes: 100 });

      mockGetConfig.mockResolvedValue(mockConfig);
      mockUser.getEffectiveLimits.mockReturnValue(mockConfig.limits);
      mockUser.getCurrentUsage.mockResolvedValue({ notes: 99 });

      const result = await limitService.canCreate(mockUser, 'notes');

      expect(result.allowed).toBe(true);
    });
  });

  describe('Zero limits', () => {
    it('should deny when limit is 0', async () => {
      const mockUser = createMockUser();
      const mockConfig = createMockRoleConfig({ maxNotes: 0 });

      mockGetConfig.mockResolvedValue(mockConfig);
      mockUser.getEffectiveLimits.mockReturnValue(mockConfig.limits);
      mockUser.getCurrentUsage.mockResolvedValue({ notes: 0 });

      const result = await limitService.canCreate(mockUser, 'notes');

      expect(result.allowed).toBe(false);
    });
  });

  describe('Large numbers', () => {
    it('should handle very large file sizes', async () => {
      const mockUser = createMockUser({ role: 'admin' });
      const mockConfig = createMockRoleConfig({
        maxFiles: -1,
        maxFileSize: -1,
        maxStorageBytes: -1,
      });

      mockGetConfig.mockResolvedValue(mockConfig);
      mockUser.getEffectiveLimits.mockReturnValue(mockConfig.limits);
      mockGetStorageUsage.mockResolvedValue({
        fileCount: 0,
        trashedCount: 0,
        totalSize: 0,
        trashedSize: 0,
      });

      const result = await limitService.canUploadFile(
        mockUser,
        10 * 1024 * 1024 * 1024, // 10GB file
        'video/mp4',
        '.mp4'
      );

      expect(result.allowed).toBe(true);
    });
  });

  describe('Missing usage data', () => {
    it('should handle missing usage key with default 0', async () => {
      const mockUser = createMockUser();
      const mockConfig = createMockRoleConfig({ maxNotes: 100 });

      mockGetConfig.mockResolvedValue(mockConfig);
      mockUser.getEffectiveLimits.mockReturnValue(mockConfig.limits);
      mockUser.getCurrentUsage.mockResolvedValue({}); // No notes key

      const result = await limitService.canCreate(mockUser, 'notes');

      expect(result.allowed).toBe(true);
      expect(result.current).toBe(0);
    });
  });
});
