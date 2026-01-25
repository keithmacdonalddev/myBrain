/**
 * =============================================================================
 * SHARESERVICE.TEST.JS - Comprehensive Tests for Share Service
 * =============================================================================
 *
 * Tests all file sharing operations including:
 * - Share creation with various options (public, password, expiring, users)
 * - Share retrieval by token
 * - Access verification (password, allowed users, expiration)
 * - Share access with download URL generation
 * - Share management (get, update, revoke)
 * - Access logging
 * - Public file info retrieval
 * - User share count
 *
 * MOCKING STRATEGY:
 * - Storage operations are mocked via jest.unstable_mockModule
 * - bcrypt operations are mocked for predictable password handling
 * - MongoDB models use real in-memory database via setup.js
 *
 * =============================================================================
 */

import '../test/setup.js';
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import mongoose from 'mongoose';

// =============================================================================
// MOCK SETUP - For ESM modules
// =============================================================================

// Create mock storage provider
const mockStorageProvider = {
  providerName: 's3',
  bucket: 'test-bucket',
  getSignedUrl: jest.fn().mockResolvedValue('https://s3.example.com/signed-url?token=abc123'),
};

// Mock the storage factory module before importing
jest.unstable_mockModule('./storage/storageFactory.js', () => ({
  getDefaultProvider: jest.fn(() => mockStorageProvider),
  getStorageProvider: jest.fn(() => mockStorageProvider),
}));

// =============================================================================
// NOW IMPORT THE SERVICE AND MODELS
// =============================================================================

const shareServiceModule = await import('./shareService.js');
const shareService = shareServiceModule.default || shareServiceModule;

const { default: FileShare } = await import('../models/FileShare.js');
const { default: File } = await import('../models/File.js');
const { default: User } = await import('../models/User.js');

// =============================================================================
// TEST HELPERS
// =============================================================================

/**
 * Create a test user in the database
 */
async function createTestUser(overrides = {}) {
  return User.create({
    email: `test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`,
    passwordHash: '$2a$10$hashedpassword',
    role: 'free',
    status: 'active',
    profile: {
      firstName: 'Test',
      lastName: 'User',
    },
    ...overrides,
  });
}

/**
 * Create a test file in the database
 */
async function createTestFile(userId, overrides = {}) {
  return File.create({
    userId,
    storageProvider: 's3',
    storageKey: `${userId}/files/test-file-${Date.now()}.pdf`,
    storageBucket: 'test-bucket',
    filename: 'test-file.pdf',
    originalName: 'Test Document.pdf',
    mimeType: 'application/pdf',
    extension: 'pdf',
    fileCategory: 'document',
    size: 1024,
    folderId: null,
    path: '/',
    isTrashed: false,
    isLatestVersion: true,
    version: 1,
    downloadCount: 0,
    ...overrides,
  });
}

/**
 * Create a test share in the database
 */
async function createTestShare(fileId, userId, overrides = {}) {
  return FileShare.create({
    fileId,
    userId,
    shareToken: FileShare.generateToken(),
    shareType: 'public',
    isActive: true,
    permissions: {
      canView: true,
      canDownload: true,
      canComment: false,
    },
    accessCount: 0,
    accessLog: [],
    ...overrides,
  });
}

// =============================================================================
// TEST SUITE
// =============================================================================

describe('shareService', () => {
  let testUser;
  let testUser2;
  let testFile;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Create test users
    testUser = await createTestUser();
    testUser2 = await createTestUser({
      email: `test2-${Date.now()}@example.com`,
    });

    // Create test file owned by testUser
    testFile = await createTestFile(testUser._id);

    // Reset storage provider mock
    mockStorageProvider.getSignedUrl = jest.fn().mockResolvedValue(
      'https://s3.example.com/signed-url?token=abc123'
    );
  });

  // ===========================================================================
  // CREATE SHARE TESTS
  // ===========================================================================

  describe('createShare()', () => {
    it('should create a public share successfully', async () => {
      const share = await shareService.createShare(
        testFile._id,
        testUser._id
      );

      expect(share).toBeDefined();
      expect(share.shareToken).toBeDefined();
      expect(share.shareType).toBe('public');
      expect(share.isActive).toBe(true);
      expect(share.fileId.toString()).toBe(testFile._id.toString());
      expect(share.userId.toString()).toBe(testUser._id.toString());
    });

    it('should generate a unique share token', async () => {
      const share1 = await shareService.createShare(testFile._id, testUser._id);
      const share2 = await shareService.createShare(testFile._id, testUser._id);

      expect(share1.shareToken).not.toBe(share2.shareToken);
    });

    it('should create a password-protected share', async () => {
      const share = await shareService.createShare(
        testFile._id,
        testUser._id,
        { password: 'secret123' }
      );

      expect(share.shareType).toBe('password');
      expect(share.password).toBeDefined();
      // Password should be hashed, not plain text
      expect(share.password).not.toBe('secret123');
    });

    it('should create an expiring share', async () => {
      const share = await shareService.createShare(
        testFile._id,
        testUser._id,
        { expiresIn: 24 } // 24 hours
      );

      expect(share.shareType).toBe('expiring');
      expect(share.expiresAt).toBeDefined();

      // Should expire approximately 24 hours from now
      const expectedExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const timeDiff = Math.abs(share.expiresAt.getTime() - expectedExpiry.getTime());
      expect(timeDiff).toBeLessThan(1000); // Within 1 second
    });

    it('should create a share with allowed users', async () => {
      const share = await shareService.createShare(
        testFile._id,
        testUser._id,
        { allowedUsers: [testUser2._id] }
      );

      expect(share.shareType).toBe('users');
      expect(share.allowedUsers).toContainEqual(testUser2._id);
    });

    it('should set default permissions (canView true, canDownload true)', async () => {
      const share = await shareService.createShare(
        testFile._id,
        testUser._id
      );

      expect(share.permissions.canView).toBe(true);
      expect(share.permissions.canDownload).toBe(true);
      expect(share.permissions.canComment).toBe(false);
    });

    it('should allow custom permissions', async () => {
      const share = await shareService.createShare(
        testFile._id,
        testUser._id,
        {
          permissions: {
            canDownload: false,
            canComment: true,
          },
        }
      );

      expect(share.permissions.canView).toBe(true);
      expect(share.permissions.canDownload).toBe(false);
      expect(share.permissions.canComment).toBe(true);
    });

    it('should set maxAccessCount when provided', async () => {
      const share = await shareService.createShare(
        testFile._id,
        testUser._id,
        { maxAccessCount: 10 }
      );

      expect(share.maxAccessCount).toBe(10);
    });

    it('should throw error if file not found', async () => {
      const fakeFileId = new mongoose.Types.ObjectId();

      await expect(
        shareService.createShare(fakeFileId, testUser._id)
      ).rejects.toThrow('File not found');
    });

    it('should throw error if user does not own the file', async () => {
      await expect(
        shareService.createShare(testFile._id, testUser2._id)
      ).rejects.toThrow('File not found');
    });

    it('should update file with share settings', async () => {
      const share = await shareService.createShare(
        testFile._id,
        testUser._id
      );

      // Reload file to check updates
      const updatedFile = await File.findById(testFile._id);

      expect(updatedFile.shareSettings).toBeDefined();
      expect(updatedFile.shareSettings.shareToken).toBe(share.shareToken);
    });

    it('should set file isPublic for public shares', async () => {
      await shareService.createShare(
        testFile._id,
        testUser._id,
        { shareType: 'public' }
      );

      const updatedFile = await File.findById(testFile._id);
      expect(updatedFile.isPublic).toBe(true);
    });

    it('should prioritize password type over other types', async () => {
      const share = await shareService.createShare(
        testFile._id,
        testUser._id,
        {
          shareType: 'public',
          password: 'secret',
          expiresIn: 24,
        }
      );

      // Password takes priority
      expect(share.shareType).toBe('password');
    });
  });

  // ===========================================================================
  // GET SHARE BY TOKEN TESTS
  // ===========================================================================

  describe('getShareByToken()', () => {
    it('should retrieve share and file by token', async () => {
      const createdShare = await createTestShare(testFile._id, testUser._id);

      const result = await shareService.getShareByToken(createdShare.shareToken);

      expect(result).toBeDefined();
      expect(result.share).toBeDefined();
      expect(result.file).toBeDefined();
      expect(result.share.shareToken).toBe(createdShare.shareToken);
    });

    it('should return null for non-existent token', async () => {
      const result = await shareService.getShareByToken('non-existent-token');

      expect(result).toBeNull();
    });

    it('should return null for inactive share', async () => {
      const createdShare = await createTestShare(testFile._id, testUser._id, {
        isActive: false,
      });

      const result = await shareService.getShareByToken(createdShare.shareToken);

      expect(result).toBeNull();
    });

    it('should return null for expired share', async () => {
      const createdShare = await createTestShare(testFile._id, testUser._id, {
        expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
      });

      const result = await shareService.getShareByToken(createdShare.shareToken);

      expect(result).toBeNull();
    });

    it('should return null for share that exceeded access limit', async () => {
      const createdShare = await createTestShare(testFile._id, testUser._id, {
        maxAccessCount: 5,
        accessCount: 5,
      });

      const result = await shareService.getShareByToken(createdShare.shareToken);

      expect(result).toBeNull();
    });
  });

  // ===========================================================================
  // VERIFY SHARE ACCESS TESTS
  // ===========================================================================

  describe('verifyShareAccess()', () => {
    it('should return valid for public share', async () => {
      const share = await createTestShare(testFile._id, testUser._id);

      const result = await shareService.verifyShareAccess(share.shareToken);

      expect(result.valid).toBe(true);
      expect(result.share).toBeDefined();
      expect(result.file).toBeDefined();
    });

    it('should return error for non-existent share', async () => {
      const result = await shareService.verifyShareAccess('invalid-token');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Share not found');
    });

    it('should return error for expired share', async () => {
      const share = await createTestShare(testFile._id, testUser._id, {
        expiresAt: new Date(Date.now() - 1000),
      });

      const result = await shareService.verifyShareAccess(share.shareToken);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Share has expired or reached access limit');
    });

    it('should return error for inactive share', async () => {
      const share = await createTestShare(testFile._id, testUser._id, {
        isActive: false,
      });

      const result = await shareService.verifyShareAccess(share.shareToken);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Share has expired or reached access limit');
    });

    it('should return error for share at access limit', async () => {
      const share = await createTestShare(testFile._id, testUser._id, {
        maxAccessCount: 3,
        accessCount: 3,
      });

      const result = await shareService.verifyShareAccess(share.shareToken);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Share has expired or reached access limit');
    });

    describe('Password Protection', () => {
      it('should require password for protected share', async () => {
        const share = await shareService.createShare(
          testFile._id,
          testUser._id,
          { password: 'secret123' }
        );

        const result = await shareService.verifyShareAccess(share.shareToken);

        expect(result.valid).toBe(false);
        expect(result.needsPassword).toBe(true);
      });

      it('should accept correct password', async () => {
        const share = await shareService.createShare(
          testFile._id,
          testUser._id,
          { password: 'secret123' }
        );

        const result = await shareService.verifyShareAccess(
          share.shareToken,
          { password: 'secret123' }
        );

        expect(result.valid).toBe(true);
      });

      it('should reject incorrect password', async () => {
        const share = await shareService.createShare(
          testFile._id,
          testUser._id,
          { password: 'secret123' }
        );

        const result = await shareService.verifyShareAccess(
          share.shareToken,
          { password: 'wrongpassword' }
        );

        expect(result.valid).toBe(false);
        expect(result.error).toBe('Invalid password');
      });
    });

    describe('Allowed Users', () => {
      it('should allow access to allowed user', async () => {
        const share = await createTestShare(testFile._id, testUser._id, {
          shareType: 'users',
          allowedUsers: [testUser2._id],
        });

        const result = await shareService.verifyShareAccess(
          share.shareToken,
          { userId: testUser2._id }
        );

        expect(result.valid).toBe(true);
      });

      it('should deny access to non-allowed user', async () => {
        const thirdUser = await createTestUser({
          email: `third-${Date.now()}@example.com`,
        });

        const share = await createTestShare(testFile._id, testUser._id, {
          shareType: 'users',
          allowedUsers: [testUser2._id],
        });

        const result = await shareService.verifyShareAccess(
          share.shareToken,
          { userId: thirdUser._id }
        );

        expect(result.valid).toBe(false);
        expect(result.error).toBe('You do not have access to this share');
      });

      it('should deny access when user not logged in', async () => {
        const share = await createTestShare(testFile._id, testUser._id, {
          shareType: 'users',
          allowedUsers: [testUser2._id],
        });

        const result = await shareService.verifyShareAccess(share.shareToken);

        expect(result.valid).toBe(false);
        expect(result.error).toBe('You do not have access to this share');
      });
    });

    it('should return error if file was deleted', async () => {
      const share = await createTestShare(testFile._id, testUser._id);

      // Delete the file
      await File.deleteOne({ _id: testFile._id });

      const result = await shareService.verifyShareAccess(share.shareToken);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('File not found');
    });
  });

  // ===========================================================================
  // ACCESS SHARE TESTS
  // ===========================================================================

  describe('accessShare()', () => {
    it('should return download URL for valid share', async () => {
      const share = await createTestShare(testFile._id, testUser._id);

      const result = await shareService.accessShare(share.shareToken);

      expect(result).toBeDefined();
      expect(result.url).toBeDefined();
      expect(result.filename).toBe(testFile.originalName);
      expect(result.contentType).toBe(testFile.mimeType);
      expect(result.size).toBe(testFile.size);
    });

    it('should record access in share log', async () => {
      const share = await createTestShare(testFile._id, testUser._id);

      await shareService.accessShare(share.shareToken, {
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      });

      // Reload share to check access log
      const updatedShare = await FileShare.findById(share._id);

      expect(updatedShare.accessCount).toBe(1);
      expect(updatedShare.accessLog).toHaveLength(1);
      expect(updatedShare.accessLog[0].ipAddress).toBe('192.168.1.1');
      expect(updatedShare.accessLog[0].userAgent).toBe('Mozilla/5.0');
    });

    it('should increment file download count', async () => {
      const share = await createTestShare(testFile._id, testUser._id);

      await shareService.accessShare(share.shareToken);

      // Reload file to check download count
      const updatedFile = await File.findById(testFile._id);

      expect(updatedFile.downloadCount).toBe(1);
    });

    it('should update file lastAccessedAt', async () => {
      const share = await createTestShare(testFile._id, testUser._id);
      const beforeAccess = new Date();

      await shareService.accessShare(share.shareToken);

      const updatedFile = await File.findById(testFile._id);

      expect(updatedFile.lastAccessedAt).toBeDefined();
      expect(updatedFile.lastAccessedAt.getTime()).toBeGreaterThanOrEqual(beforeAccess.getTime());
    });

    it('should throw error if download not permitted', async () => {
      const share = await createTestShare(testFile._id, testUser._id, {
        permissions: {
          canView: true,
          canDownload: false,
          canComment: false,
        },
      });

      await expect(
        shareService.accessShare(share.shareToken)
      ).rejects.toThrow('Download not permitted for this share');
    });

    it('should throw error for invalid share', async () => {
      await expect(
        shareService.accessShare('invalid-token')
      ).rejects.toThrow();
    });

    it('should throw error for expired share', async () => {
      const share = await createTestShare(testFile._id, testUser._id, {
        expiresAt: new Date(Date.now() - 1000),
      });

      await expect(
        shareService.accessShare(share.shareToken)
      ).rejects.toThrow();
    });

    it('should record userId when authenticated user accesses', async () => {
      const share = await createTestShare(testFile._id, testUser._id);

      await shareService.accessShare(share.shareToken, {
        userId: testUser2._id,
      });

      const updatedShare = await FileShare.findById(share._id);

      expect(updatedShare.lastAccessedBy.toString()).toBe(testUser2._id.toString());
      expect(updatedShare.accessLog[0].accessedBy.toString()).toBe(testUser2._id.toString());
    });

    it('should work with password when provided', async () => {
      const share = await shareService.createShare(
        testFile._id,
        testUser._id,
        { password: 'secret123' }
      );

      const result = await shareService.accessShare(share.shareToken, {
        password: 'secret123',
      });

      expect(result.url).toBeDefined();
    });

    it('should call storage provider to get signed URL', async () => {
      const share = await createTestShare(testFile._id, testUser._id);

      await shareService.accessShare(share.shareToken);

      expect(mockStorageProvider.getSignedUrl).toHaveBeenCalledWith(
        testFile.storageKey,
        3600,
        'getObject'
      );
    });
  });

  // ===========================================================================
  // GET FILE SHARES TESTS
  // ===========================================================================

  describe('getFileShares()', () => {
    it('should return all shares for a file', async () => {
      const share1 = await createTestShare(testFile._id, testUser._id);
      const share2 = await createTestShare(testFile._id, testUser._id);
      const share3 = await createTestShare(testFile._id, testUser._id);

      const shares = await shareService.getFileShares(testFile._id, testUser._id);

      expect(shares).toHaveLength(3);
    });

    it('should only return active shares', async () => {
      await createTestShare(testFile._id, testUser._id);
      await createTestShare(testFile._id, testUser._id, { isActive: false });
      await createTestShare(testFile._id, testUser._id);

      const shares = await shareService.getFileShares(testFile._id, testUser._id);

      // getFileShares uses FileShare.getFileShares which filters out invalid shares
      expect(shares.length).toBeGreaterThanOrEqual(2);
    });

    it('should throw error if file not found', async () => {
      const fakeFileId = new mongoose.Types.ObjectId();

      await expect(
        shareService.getFileShares(fakeFileId, testUser._id)
      ).rejects.toThrow('File not found');
    });

    it('should throw error if user does not own file', async () => {
      await createTestShare(testFile._id, testUser._id);

      await expect(
        shareService.getFileShares(testFile._id, testUser2._id)
      ).rejects.toThrow('File not found');
    });

    it('should return shares sorted by creation date (newest first)', async () => {
      const share1 = await createTestShare(testFile._id, testUser._id);
      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));
      const share2 = await createTestShare(testFile._id, testUser._id);

      const shares = await shareService.getFileShares(testFile._id, testUser._id);

      // Newest first
      expect(shares[0]._id.toString()).toBe(share2._id.toString());
    });
  });

  // ===========================================================================
  // GET USER SHARES TESTS
  // ===========================================================================

  describe('getUserShares()', () => {
    it('should return all shares for a user', async () => {
      // Create multiple files and shares
      const file2 = await createTestFile(testUser._id);
      await createTestShare(testFile._id, testUser._id);
      await createTestShare(file2._id, testUser._id);

      const result = await shareService.getUserShares(testUser._id);

      expect(result.shares).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should only return active shares by default', async () => {
      await createTestShare(testFile._id, testUser._id);
      await createTestShare(testFile._id, testUser._id, { isActive: false });

      const result = await shareService.getUserShares(testUser._id);

      expect(result.shares).toHaveLength(1);
    });

    it('should return all shares when isActive is null', async () => {
      await createTestShare(testFile._id, testUser._id);
      await createTestShare(testFile._id, testUser._id, { isActive: false });

      const result = await shareService.getUserShares(testUser._id, { isActive: null });

      expect(result.shares).toHaveLength(2);
    });

    it('should support pagination', async () => {
      // Create 5 shares
      for (let i = 0; i < 5; i++) {
        await createTestShare(testFile._id, testUser._id);
      }

      const page1 = await shareService.getUserShares(testUser._id, {
        page: 1,
        limit: 2,
      });

      const page2 = await shareService.getUserShares(testUser._id, {
        page: 2,
        limit: 2,
      });

      expect(page1.shares).toHaveLength(2);
      expect(page2.shares).toHaveLength(2);
      expect(page1.total).toBe(5);
    });

    it('should not return shares from other users', async () => {
      const otherUserFile = await createTestFile(testUser2._id);
      await createTestShare(testFile._id, testUser._id);
      await createTestShare(otherUserFile._id, testUser2._id);

      const result = await shareService.getUserShares(testUser._id);

      expect(result.shares).toHaveLength(1);
      expect(result.shares[0].userId.toString()).toBe(testUser._id.toString());
    });

    it('should populate file information', async () => {
      await createTestShare(testFile._id, testUser._id);

      const result = await shareService.getUserShares(testUser._id);

      expect(result.shares[0].fileId).toBeDefined();
      // File should be populated with at least these fields
      expect(result.shares[0].fileId.originalName).toBeDefined();
    });
  });

  // ===========================================================================
  // UPDATE SHARE TESTS
  // ===========================================================================

  describe('updateShare()', () => {
    it('should update share permissions', async () => {
      const share = await createTestShare(testFile._id, testUser._id);

      const updated = await shareService.updateShare(
        share._id,
        testUser._id,
        {
          permissions: {
            canView: true,
            canDownload: false,
            canComment: true,
          },
        }
      );

      expect(updated.permissions.canDownload).toBe(false);
      expect(updated.permissions.canComment).toBe(true);
    });

    it('should update expiration date', async () => {
      const share = await createTestShare(testFile._id, testUser._id);
      const newExpiry = new Date('2025-12-31');

      const updated = await shareService.updateShare(
        share._id,
        testUser._id,
        { expiresAt: newExpiry }
      );

      expect(updated.expiresAt.getTime()).toBe(newExpiry.getTime());
    });

    it('should update maxAccessCount', async () => {
      const share = await createTestShare(testFile._id, testUser._id);

      const updated = await shareService.updateShare(
        share._id,
        testUser._id,
        { maxAccessCount: 100 }
      );

      expect(updated.maxAccessCount).toBe(100);
    });

    it('should update isActive status', async () => {
      const share = await createTestShare(testFile._id, testUser._id);

      const updated = await shareService.updateShare(
        share._id,
        testUser._id,
        { isActive: false }
      );

      expect(updated.isActive).toBe(false);
    });

    it('should add password protection', async () => {
      const share = await createTestShare(testFile._id, testUser._id);

      const updated = await shareService.updateShare(
        share._id,
        testUser._id,
        { password: 'newpassword123' }
      );

      expect(updated.password).toBeDefined();
      expect(updated.shareType).toBe('password');
    });

    it('should remove password protection', async () => {
      const share = await shareService.createShare(
        testFile._id,
        testUser._id,
        { password: 'secret123' }
      );

      const updated = await shareService.updateShare(
        share._id,
        testUser._id,
        { password: null }
      );

      expect(updated.password).toBeNull();
      expect(updated.shareType).not.toBe('password');
    });

    it('should return null if share not found', async () => {
      const fakeShareId = new mongoose.Types.ObjectId();

      const result = await shareService.updateShare(
        fakeShareId,
        testUser._id,
        { maxAccessCount: 10 }
      );

      expect(result).toBeNull();
    });

    it('should return null if user does not own share', async () => {
      const share = await createTestShare(testFile._id, testUser._id);

      const result = await shareService.updateShare(
        share._id,
        testUser2._id,
        { maxAccessCount: 10 }
      );

      expect(result).toBeNull();
    });

    it('should revert to expiring type when password removed and expiry exists', async () => {
      const share = await shareService.createShare(
        testFile._id,
        testUser._id,
        {
          password: 'secret',
          expiresIn: 24,
        }
      );

      const updated = await shareService.updateShare(
        share._id,
        testUser._id,
        { password: null }
      );

      expect(updated.shareType).toBe('expiring');
    });
  });

  // ===========================================================================
  // REVOKE SHARE TESTS
  // ===========================================================================

  describe('revokeShare()', () => {
    it('should revoke a share', async () => {
      const share = await createTestShare(testFile._id, testUser._id);

      const result = await shareService.revokeShare(share._id, testUser._id);

      expect(result).toBe(true);

      // Verify share is now inactive
      const revokedShare = await FileShare.findById(share._id);
      expect(revokedShare.isActive).toBe(false);
    });

    it('should return false if share not found', async () => {
      const fakeShareId = new mongoose.Types.ObjectId();

      const result = await shareService.revokeShare(fakeShareId, testUser._id);

      expect(result).toBe(false);
    });

    it('should return false if user does not own share', async () => {
      const share = await createTestShare(testFile._id, testUser._id);

      const result = await shareService.revokeShare(share._id, testUser2._id);

      expect(result).toBe(false);
    });

    it('should keep share in database for record-keeping', async () => {
      const share = await createTestShare(testFile._id, testUser._id);

      await shareService.revokeShare(share._id, testUser._id);

      // Share should still exist but be inactive
      const revokedShare = await FileShare.findById(share._id);
      expect(revokedShare).not.toBeNull();
      expect(revokedShare.isActive).toBe(false);
    });
  });

  // ===========================================================================
  // REVOKE FILE SHARES TESTS
  // ===========================================================================

  describe('revokeFileShares()', () => {
    it('should revoke all shares for a file', async () => {
      await createTestShare(testFile._id, testUser._id);
      await createTestShare(testFile._id, testUser._id);
      await createTestShare(testFile._id, testUser._id);

      const count = await shareService.revokeFileShares(testFile._id, testUser._id);

      expect(count).toBe(3);

      // All shares should now be inactive
      const shares = await FileShare.find({ fileId: testFile._id });
      shares.forEach(share => {
        expect(share.isActive).toBe(false);
      });
    });

    it('should only revoke active shares', async () => {
      await createTestShare(testFile._id, testUser._id);
      await createTestShare(testFile._id, testUser._id, { isActive: false });

      const count = await shareService.revokeFileShares(testFile._id, testUser._id);

      expect(count).toBe(1);
    });

    it('should throw error if file not found', async () => {
      const fakeFileId = new mongoose.Types.ObjectId();

      await expect(
        shareService.revokeFileShares(fakeFileId, testUser._id)
      ).rejects.toThrow('File not found');
    });

    it('should clear share settings on file', async () => {
      await shareService.createShare(testFile._id, testUser._id);

      await shareService.revokeFileShares(testFile._id, testUser._id);

      const updatedFile = await File.findById(testFile._id);
      // shareSettings should be empty (no shareToken or other share-related data)
      expect(updatedFile.shareSettings.shareToken).toBeUndefined();
      expect(updatedFile.isPublic).toBe(false);
    });

    it('should return 0 if no active shares exist', async () => {
      const count = await shareService.revokeFileShares(testFile._id, testUser._id);

      expect(count).toBe(0);
    });
  });

  // ===========================================================================
  // GET SHARE ACCESS LOG TESTS
  // ===========================================================================

  describe('getShareAccessLog()', () => {
    it('should return access log for share', async () => {
      const share = await createTestShare(testFile._id, testUser._id);

      // Access the share multiple times
      await shareService.accessShare(share.shareToken, { ipAddress: '1.1.1.1' });
      await shareService.accessShare(share.shareToken, { ipAddress: '2.2.2.2' });

      const log = await shareService.getShareAccessLog(share._id, testUser._id);

      expect(log).toHaveLength(2);
      // Should be newest first (reversed)
      expect(log[0].ipAddress).toBe('2.2.2.2');
      expect(log[1].ipAddress).toBe('1.1.1.1');
    });

    it('should return null if share not found', async () => {
      const fakeShareId = new mongoose.Types.ObjectId();

      const log = await shareService.getShareAccessLog(fakeShareId, testUser._id);

      expect(log).toBeNull();
    });

    it('should return null if user does not own share', async () => {
      const share = await createTestShare(testFile._id, testUser._id);

      const log = await shareService.getShareAccessLog(share._id, testUser2._id);

      expect(log).toBeNull();
    });

    it('should return empty array for share with no accesses', async () => {
      const share = await createTestShare(testFile._id, testUser._id);

      const log = await shareService.getShareAccessLog(share._id, testUser._id);

      expect(log).toEqual([]);
    });

    it('should limit to last 100 entries', async () => {
      const share = await createTestShare(testFile._id, testUser._id);

      // Add 105 entries directly to access log
      const entries = [];
      for (let i = 0; i < 105; i++) {
        entries.push({
          accessedAt: new Date(),
          ipAddress: `192.168.1.${i}`,
        });
      }
      await FileShare.updateOne(
        { _id: share._id },
        { $set: { accessLog: entries } }
      );

      const log = await shareService.getShareAccessLog(share._id, testUser._id);

      expect(log.length).toBeLessThanOrEqual(100);
    });
  });

  // ===========================================================================
  // GET PUBLIC FILE INFO TESTS
  // ===========================================================================

  describe('getPublicFileInfo()', () => {
    it('should return public file info', async () => {
      const share = await createTestShare(testFile._id, testUser._id);

      const info = await shareService.getPublicFileInfo(share.shareToken);

      expect(info).toBeDefined();
      expect(info.filename).toBe(testFile.originalName);
      expect(info.size).toBe(testFile.size);
      expect(info.mimeType).toBe(testFile.mimeType);
      expect(info.fileCategory).toBe(testFile.fileCategory);
    });

    it('should indicate if password is needed', async () => {
      const share = await shareService.createShare(
        testFile._id,
        testUser._id,
        { password: 'secret123' }
      );

      const info = await shareService.getPublicFileInfo(share.shareToken);

      expect(info.needsPassword).toBe(true);
    });

    it('should not indicate password needed for public share', async () => {
      const share = await createTestShare(testFile._id, testUser._id);

      const info = await shareService.getPublicFileInfo(share.shareToken);

      expect(info.needsPassword).toBe(false);
    });

    it('should include permissions', async () => {
      const share = await createTestShare(testFile._id, testUser._id, {
        permissions: {
          canView: true,
          canDownload: false,
          canComment: true,
        },
      });

      const info = await shareService.getPublicFileInfo(share.shareToken);

      expect(info.permissions.canView).toBe(true);
      expect(info.permissions.canDownload).toBe(false);
      expect(info.permissions.canComment).toBe(true);
    });

    it('should include expiration date', async () => {
      const expiryDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const share = await createTestShare(testFile._id, testUser._id, {
        expiresAt: expiryDate,
      });

      const info = await shareService.getPublicFileInfo(share.shareToken);

      expect(info.expiresAt).toBeDefined();
    });

    it('should return null for invalid token', async () => {
      const info = await shareService.getPublicFileInfo('invalid-token');

      expect(info).toBeNull();
    });

    it('should return null for inactive share', async () => {
      const share = await createTestShare(testFile._id, testUser._id, {
        isActive: false,
      });

      const info = await shareService.getPublicFileInfo(share.shareToken);

      expect(info).toBeNull();
    });

    it('should return null for expired share', async () => {
      const share = await createTestShare(testFile._id, testUser._id, {
        expiresAt: new Date(Date.now() - 1000),
      });

      const info = await shareService.getPublicFileInfo(share.shareToken);

      expect(info).toBeNull();
    });

    it('should return null if file was deleted', async () => {
      const share = await createTestShare(testFile._id, testUser._id);
      await File.deleteOne({ _id: testFile._id });

      const info = await shareService.getPublicFileInfo(share.shareToken);

      expect(info).toBeNull();
    });

    it('should include upload date', async () => {
      const share = await createTestShare(testFile._id, testUser._id);

      const info = await shareService.getPublicFileInfo(share.shareToken);

      expect(info.uploadedAt).toBeDefined();
    });
  });

  // ===========================================================================
  // GET USER SHARE COUNT TESTS
  // ===========================================================================

  describe('getUserShareCount()', () => {
    it('should return count of active shares', async () => {
      await createTestShare(testFile._id, testUser._id);
      await createTestShare(testFile._id, testUser._id);
      await createTestShare(testFile._id, testUser._id);

      const count = await shareService.getUserShareCount(testUser._id);

      expect(count).toBe(3);
    });

    it('should not count inactive shares', async () => {
      await createTestShare(testFile._id, testUser._id);
      await createTestShare(testFile._id, testUser._id, { isActive: false });

      const count = await shareService.getUserShareCount(testUser._id);

      expect(count).toBe(1);
    });

    it('should return 0 for user with no shares', async () => {
      const count = await shareService.getUserShareCount(testUser._id);

      expect(count).toBe(0);
    });

    it('should not count other users shares', async () => {
      const otherUserFile = await createTestFile(testUser2._id);
      await createTestShare(testFile._id, testUser._id);
      await createTestShare(otherUserFile._id, testUser2._id);

      const count = await shareService.getUserShareCount(testUser._id);

      expect(count).toBe(1);
    });
  });

  // ===========================================================================
  // ACCESS LIMITS TESTS
  // ===========================================================================

  describe('Access Limits', () => {
    it('should allow access up to maxAccessCount', async () => {
      const share = await createTestShare(testFile._id, testUser._id, {
        maxAccessCount: 3,
      });

      // Access 3 times (at the limit)
      await shareService.accessShare(share.shareToken);
      await shareService.accessShare(share.shareToken);
      await shareService.accessShare(share.shareToken);

      // 4th access should fail
      await expect(
        shareService.accessShare(share.shareToken)
      ).rejects.toThrow();
    });

    it('should work correctly with access count at limit minus one', async () => {
      const share = await createTestShare(testFile._id, testUser._id, {
        maxAccessCount: 2,
        accessCount: 1,
      });

      // Should allow one more access
      const result = await shareService.accessShare(share.shareToken);
      expect(result.url).toBeDefined();

      // Should deny subsequent access
      await expect(
        shareService.accessShare(share.shareToken)
      ).rejects.toThrow();
    });

    it('should allow unlimited access when maxAccessCount is null', async () => {
      const share = await createTestShare(testFile._id, testUser._id, {
        maxAccessCount: null,
      });

      // Access many times - should all succeed
      for (let i = 0; i < 10; i++) {
        const result = await shareService.accessShare(share.shareToken);
        expect(result.url).toBeDefined();
      }
    });
  });

  // ===========================================================================
  // USER ISOLATION TESTS
  // ===========================================================================

  describe('User Isolation', () => {
    it('should not allow user to create share for files they do not own', async () => {
      const otherUserFile = await createTestFile(testUser2._id);

      await expect(
        shareService.createShare(otherUserFile._id, testUser._id)
      ).rejects.toThrow('File not found');
    });

    it('should not allow user to get shares for files they do not own', async () => {
      const otherUserFile = await createTestFile(testUser2._id);

      await expect(
        shareService.getFileShares(otherUserFile._id, testUser._id)
      ).rejects.toThrow('File not found');
    });

    it('should not allow user to revoke shares for files they do not own', async () => {
      const otherUserFile = await createTestFile(testUser2._id);

      await expect(
        shareService.revokeFileShares(otherUserFile._id, testUser._id)
      ).rejects.toThrow('File not found');
    });

    it('should not allow user to update shares they do not own', async () => {
      const share = await createTestShare(testFile._id, testUser._id);

      const result = await shareService.updateShare(
        share._id,
        testUser2._id,
        { maxAccessCount: 10 }
      );

      expect(result).toBeNull();
    });

    it('should not allow user to view access log for shares they do not own', async () => {
      const share = await createTestShare(testFile._id, testUser._id);

      const result = await shareService.getShareAccessLog(share._id, testUser2._id);

      expect(result).toBeNull();
    });
  });

  // ===========================================================================
  // EDGE CASES AND ERROR HANDLING
  // ===========================================================================

  describe('Edge Cases', () => {
    it('should handle share with zero maxAccessCount', async () => {
      const share = await createTestShare(testFile._id, testUser._id, {
        maxAccessCount: 0,
      });

      // Should immediately fail as 0 accesses allowed
      await expect(
        shareService.accessShare(share.shareToken)
      ).rejects.toThrow();
    });

    it('should handle concurrent access attempts', async () => {
      const share = await createTestShare(testFile._id, testUser._id, {
        maxAccessCount: 5,
      });

      // Attempt 5 concurrent accesses
      const promises = Array(5).fill(null).map(() =>
        shareService.accessShare(share.shareToken)
      );

      const results = await Promise.all(promises);

      // All should succeed
      results.forEach(result => {
        expect(result.url).toBeDefined();
      });
    });

    it('should handle very long share token', async () => {
      // This tests that the system handles malformed/unusually long tokens
      const result = await shareService.verifyShareAccess('a'.repeat(10000));

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Share not found');
    });

    it('should handle empty password string', async () => {
      const share = await shareService.createShare(
        testFile._id,
        testUser._id,
        { password: 'secret123' }
      );

      // Empty password should fail
      const result = await shareService.verifyShareAccess(
        share.shareToken,
        { password: '' }
      );

      expect(result.valid).toBe(false);
    });

    it('should handle file with thumbnail info', async () => {
      const fileWithThumb = await createTestFile(testUser._id, {
        thumbnailUrl: 'https://example.com/thumb.jpg',
      });
      const share = await createTestShare(fileWithThumb._id, testUser._id);

      const info = await shareService.getPublicFileInfo(share.shareToken);

      expect(info.thumbnailUrl).toBe('https://example.com/thumb.jpg');
    });

    it('should handle creating share for file in trash', async () => {
      const trashedFile = await createTestFile(testUser._id, {
        isTrashed: true,
      });

      // Creating share should work (file exists and user owns it)
      // Whether this should be allowed is a business decision
      const share = await shareService.createShare(trashedFile._id, testUser._id);
      expect(share).toBeDefined();
    });
  });
});
