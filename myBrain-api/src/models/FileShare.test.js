/**
 * =============================================================================
 * FILESHARE MODEL TESTS
 * =============================================================================
 *
 * Comprehensive tests for the FileShare model, covering:
 * - Schema validation (required fields, enums, defaults)
 * - Share token generation
 * - Permission levels (view, download, comment)
 * - Expiration handling
 * - Password protection
 * - Access logging
 * - Share revocation/deactivation
 * - Static methods (findByToken, getFileShares, etc.)
 * - Instance methods (isValid, recordAccess, toSafeJSON)
 *
 * Uses mongodb-memory-server for real MongoDB behavior without external deps.
 */

import mongoose from 'mongoose';
import '../test/setup.js';
import FileShare from './FileShare.js';
import File from './File.js';
import User from './User.js';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Creates a test user with sensible defaults.
 */
async function createTestUser(overrides = {}) {
  const defaults = {
    email: `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}@example.com`,
    passwordHash: '$2a$10$hashedpassword123',
    role: 'free',
    status: 'active',
  };
  return User.create({ ...defaults, ...overrides });
}

/**
 * Creates a test file for sharing.
 */
async function createTestFile(userId, overrides = {}) {
  const defaults = {
    userId,
    storageProvider: 's3',
    storageKey: `files/${userId}/${Date.now()}/test-file.pdf`,
    storageBucket: 'mybrain-files-test',
    filename: `test-file-${Date.now()}.pdf`,
    originalName: 'Test Document.pdf',
    mimeType: 'application/pdf',
    size: 1024 * 100,
    fileCategory: 'document',
  };
  return File.create({ ...defaults, ...overrides });
}

/**
 * Creates a file share with sensible defaults for testing.
 */
async function createTestShare(fileId, userId, overrides = {}) {
  const defaults = {
    fileId,
    userId,
    shareToken: FileShare.generateToken(),
    shareType: 'public',
    isActive: true,
  };
  return FileShare.create({ ...defaults, ...overrides });
}

// =============================================================================
// TEST SUITE: SCHEMA VALIDATION
// =============================================================================

describe('FileShare Model', () => {
  describe('Schema Validation', () => {
    describe('Required fields', () => {
      it('should require fileId', async () => {
        const user = await createTestUser();
        await expect(
          FileShare.create({
            userId: user._id,
            shareToken: 'test-token',
          })
        ).rejects.toThrow(/fileId.*required/i);
      });

      it('should require userId', async () => {
        const user = await createTestUser();
        const file = await createTestFile(user._id);
        await expect(
          FileShare.create({
            fileId: file._id,
            shareToken: 'test-token',
          })
        ).rejects.toThrow(/userId.*required/i);
      });

      it('should require shareToken', async () => {
        const user = await createTestUser();
        const file = await createTestFile(user._id);
        await expect(
          FileShare.create({
            fileId: file._id,
            userId: user._id,
          })
        ).rejects.toThrow(/shareToken.*required/i);
      });
    });

    describe('Enum validations', () => {
      it('should accept valid share types', async () => {
        const user = await createTestUser();
        const file = await createTestFile(user._id);
        const types = ['public', 'password', 'users', 'expiring'];

        for (const shareType of types) {
          const share = await createTestShare(file._id, user._id, { shareType });
          expect(share.shareType).toBe(shareType);
        }
      });

      it('should reject invalid share type', async () => {
        const user = await createTestUser();
        const file = await createTestFile(user._id);
        await expect(
          createTestShare(file._id, user._id, { shareType: 'invalid' })
        ).rejects.toThrow();
      });
    });

    describe('Default values', () => {
      it('should default shareType to public', async () => {
        const user = await createTestUser();
        const file = await createTestFile(user._id);
        const share = await createTestShare(file._id, user._id);
        expect(share.shareType).toBe('public');
      });

      it('should default isActive to true', async () => {
        const user = await createTestUser();
        const file = await createTestFile(user._id);
        const share = await createTestShare(file._id, user._id);
        expect(share.isActive).toBe(true);
      });

      it('should default accessCount to 0', async () => {
        const user = await createTestUser();
        const file = await createTestFile(user._id);
        const share = await createTestShare(file._id, user._id);
        expect(share.accessCount).toBe(0);
      });

      it('should default maxAccessCount to null (unlimited)', async () => {
        const user = await createTestUser();
        const file = await createTestFile(user._id);
        const share = await createTestShare(file._id, user._id);
        expect(share.maxAccessCount).toBeNull();
      });

      it('should default expiresAt to null (never expires)', async () => {
        const user = await createTestUser();
        const file = await createTestFile(user._id);
        const share = await createTestShare(file._id, user._id);
        expect(share.expiresAt).toBeNull();
      });

      it('should default permissions.canView to true', async () => {
        const user = await createTestUser();
        const file = await createTestFile(user._id);
        const share = await createTestShare(file._id, user._id);
        expect(share.permissions.canView).toBe(true);
      });

      it('should default permissions.canDownload to true', async () => {
        const user = await createTestUser();
        const file = await createTestFile(user._id);
        const share = await createTestShare(file._id, user._id);
        expect(share.permissions.canDownload).toBe(true);
      });

      it('should default permissions.canComment to false', async () => {
        const user = await createTestUser();
        const file = await createTestFile(user._id);
        const share = await createTestShare(file._id, user._id);
        expect(share.permissions.canComment).toBe(false);
      });
    });

    describe('Unique constraints', () => {
      it('should enforce unique shareToken', async () => {
        const user = await createTestUser();
        const file = await createTestFile(user._id);
        const token = FileShare.generateToken();

        await createTestShare(file._id, user._id, { shareToken: token });

        await expect(
          createTestShare(file._id, user._id, { shareToken: token })
        ).rejects.toThrow(/duplicate key/i);
      });
    });
  });

  // =============================================================================
  // TEST SUITE: TOKEN GENERATION
  // =============================================================================

  describe('Token Generation', () => {
    describe('generateToken()', () => {
      it('should generate a valid UUID', () => {
        const token = FileShare.generateToken();
        // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        expect(token).toMatch(uuidRegex);
      });

      it('should generate unique tokens each time', () => {
        const tokens = new Set();
        for (let i = 0; i < 100; i++) {
          tokens.add(FileShare.generateToken());
        }
        expect(tokens.size).toBe(100);
      });
    });
  });

  // =============================================================================
  // TEST SUITE: PERMISSION LEVELS
  // =============================================================================

  describe('Permission Levels', () => {
    it('should create share with view-only permissions', async () => {
      const user = await createTestUser();
      const file = await createTestFile(user._id);
      const share = await createTestShare(file._id, user._id, {
        permissions: {
          canView: true,
          canDownload: false,
          canComment: false,
        },
      });

      expect(share.permissions.canView).toBe(true);
      expect(share.permissions.canDownload).toBe(false);
      expect(share.permissions.canComment).toBe(false);
    });

    it('should create share with view and download permissions', async () => {
      const user = await createTestUser();
      const file = await createTestFile(user._id);
      const share = await createTestShare(file._id, user._id, {
        permissions: {
          canView: true,
          canDownload: true,
          canComment: false,
        },
      });

      expect(share.permissions.canView).toBe(true);
      expect(share.permissions.canDownload).toBe(true);
      expect(share.permissions.canComment).toBe(false);
    });

    it('should create share with full permissions', async () => {
      const user = await createTestUser();
      const file = await createTestFile(user._id);
      const share = await createTestShare(file._id, user._id, {
        permissions: {
          canView: true,
          canDownload: true,
          canComment: true,
        },
      });

      expect(share.permissions.canView).toBe(true);
      expect(share.permissions.canDownload).toBe(true);
      expect(share.permissions.canComment).toBe(true);
    });
  });

  // =============================================================================
  // TEST SUITE: EXPIRATION HANDLING
  // =============================================================================

  describe('Expiration Handling', () => {
    it('should create share with expiration date', async () => {
      const user = await createTestUser();
      const file = await createTestFile(user._id);
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow

      const share = await createTestShare(file._id, user._id, {
        shareType: 'expiring',
        expiresAt,
      });

      expect(share.expiresAt).toEqual(expiresAt);
    });

    it('should mark expired share as invalid', async () => {
      const user = await createTestUser();
      const file = await createTestFile(user._id);
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // Yesterday

      const share = await createTestShare(file._id, user._id, {
        expiresAt: pastDate,
      });

      expect(share.isValid()).toBe(false);
    });

    it('should mark non-expired share as valid', async () => {
      const user = await createTestUser();
      const file = await createTestFile(user._id);
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow

      const share = await createTestShare(file._id, user._id, {
        expiresAt: futureDate,
      });

      expect(share.isValid()).toBe(true);
    });

    it('should treat null expiresAt as never expires', async () => {
      const user = await createTestUser();
      const file = await createTestFile(user._id);

      const share = await createTestShare(file._id, user._id, {
        expiresAt: null,
      });

      expect(share.isValid()).toBe(true);
    });
  });

  // =============================================================================
  // TEST SUITE: PASSWORD PROTECTION
  // =============================================================================

  describe('Password Protection', () => {
    it('should create password-protected share', async () => {
      const user = await createTestUser();
      const file = await createTestFile(user._id);

      const share = await createTestShare(file._id, user._id, {
        shareType: 'password',
        password: '$2a$10$hashedpassword', // Pre-hashed password
      });

      expect(share.shareType).toBe('password');
      expect(share.password).toBe('$2a$10$hashedpassword');
    });

    it('should indicate password protection in toPublicJSON', async () => {
      const user = await createTestUser();
      const file = await createTestFile(user._id);

      const share = await createTestShare(file._id, user._id, {
        shareType: 'password',
        password: '$2a$10$hashedpassword',
      });

      const publicJson = share.toPublicJSON();
      expect(publicJson.hasPassword).toBe(true);
    });

    it('should not indicate password when not set', async () => {
      const user = await createTestUser();
      const file = await createTestFile(user._id);

      const share = await createTestShare(file._id, user._id, {
        shareType: 'public',
      });

      const publicJson = share.toPublicJSON();
      expect(publicJson.hasPassword).toBe(false);
    });
  });

  // =============================================================================
  // TEST SUITE: USER-RESTRICTED SHARES
  // =============================================================================

  describe('User-Restricted Shares', () => {
    it('should create share limited to specific users', async () => {
      const owner = await createTestUser();
      const allowedUser1 = await createTestUser();
      const allowedUser2 = await createTestUser();
      const file = await createTestFile(owner._id);

      const share = await createTestShare(file._id, owner._id, {
        shareType: 'users',
        allowedUsers: [allowedUser1._id, allowedUser2._id],
      });

      expect(share.shareType).toBe('users');
      expect(share.allowedUsers).toHaveLength(2);
      expect(share.allowedUsers.map(id => id.toString())).toContain(allowedUser1._id.toString());
      expect(share.allowedUsers.map(id => id.toString())).toContain(allowedUser2._id.toString());
    });
  });

  // =============================================================================
  // TEST SUITE: ACCESS COUNT LIMITS
  // =============================================================================

  describe('Access Count Limits', () => {
    it('should create share with access limit', async () => {
      const user = await createTestUser();
      const file = await createTestFile(user._id);

      const share = await createTestShare(file._id, user._id, {
        maxAccessCount: 10,
      });

      expect(share.maxAccessCount).toBe(10);
    });

    it('should mark share invalid when access limit reached', async () => {
      const user = await createTestUser();
      const file = await createTestFile(user._id);

      const share = await createTestShare(file._id, user._id, {
        maxAccessCount: 5,
        accessCount: 5,
      });

      expect(share.isValid()).toBe(false);
    });

    it('should mark share valid when under access limit', async () => {
      const user = await createTestUser();
      const file = await createTestFile(user._id);

      const share = await createTestShare(file._id, user._id, {
        maxAccessCount: 10,
        accessCount: 5,
      });

      expect(share.isValid()).toBe(true);
    });

    it('should treat null maxAccessCount as unlimited', async () => {
      const user = await createTestUser();
      const file = await createTestFile(user._id);

      const share = await createTestShare(file._id, user._id, {
        maxAccessCount: null,
        accessCount: 1000000,
      });

      expect(share.isValid()).toBe(true);
    });
  });

  // =============================================================================
  // TEST SUITE: ACCESS LOGGING
  // =============================================================================

  describe('Access Logging', () => {
    describe('recordAccess()', () => {
      it('should increment access count', async () => {
        const user = await createTestUser();
        const file = await createTestFile(user._id);
        const share = await createTestShare(file._id, user._id);

        expect(share.accessCount).toBe(0);

        await share.recordAccess({});

        expect(share.accessCount).toBe(1);
      });

      it('should update lastAccessedAt', async () => {
        const user = await createTestUser();
        const file = await createTestFile(user._id);
        const share = await createTestShare(file._id, user._id);

        const before = new Date();
        await share.recordAccess({});
        const after = new Date();

        expect(share.lastAccessedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
        expect(share.lastAccessedAt.getTime()).toBeLessThanOrEqual(after.getTime());
      });

      it('should set lastAccessedBy when userId provided', async () => {
        const owner = await createTestUser();
        const accessor = await createTestUser();
        const file = await createTestFile(owner._id);
        const share = await createTestShare(file._id, owner._id);

        await share.recordAccess({ userId: accessor._id });

        expect(share.lastAccessedBy.toString()).toBe(accessor._id.toString());
      });

      it('should add entry to access log', async () => {
        const owner = await createTestUser();
        const accessor = await createTestUser();
        const file = await createTestFile(owner._id);
        const share = await createTestShare(file._id, owner._id);

        await share.recordAccess({
          userId: accessor._id,
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
        });

        expect(share.accessLog).toHaveLength(1);
        expect(share.accessLog[0].accessedBy.toString()).toBe(accessor._id.toString());
        expect(share.accessLog[0].ipAddress).toBe('192.168.1.1');
        expect(share.accessLog[0].userAgent).toBe('Mozilla/5.0');
      });

      it('should keep only last 100 access log entries', async () => {
        const user = await createTestUser();
        const file = await createTestFile(user._id);
        const share = await createTestShare(file._id, user._id);

        // Pre-populate with 100 entries
        share.accessLog = Array(100).fill(null).map((_, i) => ({
          accessedAt: new Date(Date.now() - i * 1000),
          ipAddress: `192.168.1.${i}`,
        }));
        await share.save();

        // Add one more
        await share.recordAccess({ ipAddress: '10.0.0.1' });

        expect(share.accessLog).toHaveLength(100);
        expect(share.accessLog[99].ipAddress).toBe('10.0.0.1');
      });

      it('should persist changes to database', async () => {
        const user = await createTestUser();
        const file = await createTestFile(user._id);
        const share = await createTestShare(file._id, user._id);

        await share.recordAccess({ ipAddress: '10.0.0.1' });

        const freshShare = await FileShare.findById(share._id);
        expect(freshShare.accessCount).toBe(1);
        expect(freshShare.accessLog).toHaveLength(1);
      });
    });
  });

  // =============================================================================
  // TEST SUITE: SHARE REVOCATION
  // =============================================================================

  describe('Share Revocation', () => {
    it('should deactivate share by setting isActive to false', async () => {
      const user = await createTestUser();
      const file = await createTestFile(user._id);
      const share = await createTestShare(file._id, user._id);

      share.isActive = false;
      await share.save();

      expect(share.isActive).toBe(false);
      expect(share.isValid()).toBe(false);
    });

    it('should not find deactivated share by token', async () => {
      const user = await createTestUser();
      const file = await createTestFile(user._id);
      const share = await createTestShare(file._id, user._id, { isActive: false });

      const found = await FileShare.findByToken(share.shareToken);
      expect(found).toBeNull();
    });

    describe('deactivateFileShares()', () => {
      it('should deactivate all shares for a file', async () => {
        const user = await createTestUser();
        const file = await createTestFile(user._id);

        await createTestShare(file._id, user._id);
        await createTestShare(file._id, user._id);
        await createTestShare(file._id, user._id);

        const count = await FileShare.deactivateFileShares(file._id);

        expect(count).toBe(3);

        const activeShares = await FileShare.find({ fileId: file._id, isActive: true });
        expect(activeShares).toHaveLength(0);
      });

      it('should only deactivate shares for specified file', async () => {
        const user = await createTestUser();
        const file1 = await createTestFile(user._id);
        const file2 = await createTestFile(user._id);

        await createTestShare(file1._id, user._id);
        await createTestShare(file2._id, user._id);

        await FileShare.deactivateFileShares(file1._id);

        const file1Shares = await FileShare.find({ fileId: file1._id, isActive: true });
        const file2Shares = await FileShare.find({ fileId: file2._id, isActive: true });

        expect(file1Shares).toHaveLength(0);
        expect(file2Shares).toHaveLength(1);
      });
    });
  });

  // =============================================================================
  // TEST SUITE: STATIC METHODS
  // =============================================================================

  describe('Static Methods', () => {
    describe('findByToken()', () => {
      it('should find active share by token', async () => {
        const user = await createTestUser();
        const file = await createTestFile(user._id);
        const share = await createTestShare(file._id, user._id);

        const found = await FileShare.findByToken(share.shareToken);

        expect(found).not.toBeNull();
        expect(found._id.toString()).toBe(share._id.toString());
      });

      it('should populate fileId reference', async () => {
        const user = await createTestUser();
        const file = await createTestFile(user._id);
        const share = await createTestShare(file._id, user._id);

        const found = await FileShare.findByToken(share.shareToken);

        expect(found.fileId).toBeDefined();
        expect(found.fileId.originalName).toBe(file.originalName);
      });

      it('should return null for non-existent token', async () => {
        const found = await FileShare.findByToken('non-existent-token');
        expect(found).toBeNull();
      });

      it('should return null for inactive share', async () => {
        const user = await createTestUser();
        const file = await createTestFile(user._id);
        const share = await createTestShare(file._id, user._id, { isActive: false });

        const found = await FileShare.findByToken(share.shareToken);
        expect(found).toBeNull();
      });

      it('should deactivate and return null for expired share', async () => {
        const user = await createTestUser();
        const file = await createTestFile(user._id);
        const pastDate = new Date(Date.now() - 1000);
        const share = await createTestShare(file._id, user._id, { expiresAt: pastDate });

        const found = await FileShare.findByToken(share.shareToken);

        expect(found).toBeNull();

        const freshShare = await FileShare.findById(share._id);
        expect(freshShare.isActive).toBe(false);
      });

      it('should deactivate and return null for exhausted share', async () => {
        const user = await createTestUser();
        const file = await createTestFile(user._id);
        const share = await createTestShare(file._id, user._id, {
          maxAccessCount: 5,
          accessCount: 5,
        });

        const found = await FileShare.findByToken(share.shareToken);

        expect(found).toBeNull();

        const freshShare = await FileShare.findById(share._id);
        expect(freshShare.isActive).toBe(false);
      });
    });

    describe('getFileShares()', () => {
      it('should return all active shares for a file', async () => {
        const user = await createTestUser();
        const file = await createTestFile(user._id);

        await createTestShare(file._id, user._id);
        await createTestShare(file._id, user._id);
        await createTestShare(file._id, user._id, { isActive: false });

        const shares = await FileShare.getFileShares(file._id);

        expect(shares).toHaveLength(2);
      });

      it('should filter out expired shares', async () => {
        const user = await createTestUser();
        const file = await createTestFile(user._id);
        const pastDate = new Date(Date.now() - 1000);

        await createTestShare(file._id, user._id);
        await createTestShare(file._id, user._id, { expiresAt: pastDate });

        const shares = await FileShare.getFileShares(file._id);

        expect(shares).toHaveLength(1);
      });

      it('should return shares sorted by newest first', async () => {
        const user = await createTestUser();
        const file = await createTestFile(user._id);

        const share1 = await createTestShare(file._id, user._id);
        await new Promise(resolve => setTimeout(resolve, 10));
        const share2 = await createTestShare(file._id, user._id);

        const shares = await FileShare.getFileShares(file._id);

        expect(shares[0]._id.toString()).toBe(share2._id.toString());
        expect(shares[1]._id.toString()).toBe(share1._id.toString());
      });
    });

    describe('getUserShareCount()', () => {
      it('should count active shares for user', async () => {
        const user = await createTestUser();
        const file = await createTestFile(user._id);

        await createTestShare(file._id, user._id);
        await createTestShare(file._id, user._id);
        await createTestShare(file._id, user._id, { isActive: false });

        const count = await FileShare.getUserShareCount(user._id);

        expect(count).toBe(2);
      });

      it('should return 0 for user with no shares', async () => {
        const user = await createTestUser();

        const count = await FileShare.getUserShareCount(user._id);

        expect(count).toBe(0);
      });
    });
  });

  // =============================================================================
  // TEST SUITE: INSTANCE METHODS
  // =============================================================================

  describe('Instance Methods', () => {
    describe('isValid()', () => {
      it('should return true for active, non-expired, under-limit share', async () => {
        const user = await createTestUser();
        const file = await createTestFile(user._id);
        const share = await createTestShare(file._id, user._id, {
          isActive: true,
          expiresAt: new Date(Date.now() + 86400000), // Tomorrow
          maxAccessCount: 100,
          accessCount: 50,
        });

        expect(share.isValid()).toBe(true);
      });

      it('should return false for inactive share', async () => {
        const user = await createTestUser();
        const file = await createTestFile(user._id);
        const share = await createTestShare(file._id, user._id, { isActive: false });

        expect(share.isValid()).toBe(false);
      });

      it('should return false for expired share', async () => {
        const user = await createTestUser();
        const file = await createTestFile(user._id);
        const share = await createTestShare(file._id, user._id, {
          expiresAt: new Date(Date.now() - 1000),
        });

        expect(share.isValid()).toBe(false);
      });

      it('should return false for exhausted share', async () => {
        const user = await createTestUser();
        const file = await createTestFile(user._id);
        const share = await createTestShare(file._id, user._id, {
          maxAccessCount: 10,
          accessCount: 10,
        });

        expect(share.isValid()).toBe(false);
      });
    });

    describe('toSafeJSON()', () => {
      it('should remove __v', async () => {
        const user = await createTestUser();
        const file = await createTestFile(user._id);
        const share = await createTestShare(file._id, user._id);

        const json = share.toSafeJSON();

        expect(json.__v).toBeUndefined();
      });

      it('should remove password', async () => {
        const user = await createTestUser();
        const file = await createTestFile(user._id);
        const share = await createTestShare(file._id, user._id, {
          password: '$2a$10$hashedpassword',
        });

        const json = share.toSafeJSON();

        expect(json.password).toBeUndefined();
      });

      it('should remove accessLog', async () => {
        const user = await createTestUser();
        const file = await createTestFile(user._id);
        const share = await createTestShare(file._id, user._id);
        await share.recordAccess({ ipAddress: '10.0.0.1' });

        const json = share.toSafeJSON();

        expect(json.accessLog).toBeUndefined();
      });

      it('should include other fields', async () => {
        const user = await createTestUser();
        const file = await createTestFile(user._id);
        const share = await createTestShare(file._id, user._id);

        const json = share.toSafeJSON();

        expect(json.shareToken).toBeDefined();
        expect(json.shareType).toBe('public');
        expect(json.isActive).toBe(true);
      });
    });

    describe('toPublicJSON()', () => {
      it('should return minimal public info', async () => {
        const user = await createTestUser();
        const file = await createTestFile(user._id);
        const expiresAt = new Date(Date.now() + 86400000);
        const share = await createTestShare(file._id, user._id, {
          shareType: 'expiring',
          expiresAt,
          permissions: { canView: true, canDownload: false, canComment: false },
        });

        const json = share.toPublicJSON();

        expect(json.shareToken).toBe(share.shareToken);
        expect(json.shareType).toBe('expiring');
        expect(json.expiresAt).toEqual(expiresAt);
        expect(json.permissions.canView).toBe(true);
        expect(json.permissions.canDownload).toBe(false);
        expect(json.hasPassword).toBe(false);
      });

      it('should not include sensitive fields', async () => {
        const user = await createTestUser();
        const file = await createTestFile(user._id);
        const share = await createTestShare(file._id, user._id, {
          password: 'secret',
        });

        const json = share.toPublicJSON();

        expect(json.password).toBeUndefined();
        expect(json.userId).toBeUndefined();
        expect(json.fileId).toBeUndefined();
        expect(json.accessLog).toBeUndefined();
        expect(json.accessCount).toBeUndefined();
      });
    });
  });

  // =============================================================================
  // TEST SUITE: TIMESTAMPS
  // =============================================================================

  describe('Timestamps', () => {
    it('should set createdAt on creation', async () => {
      const user = await createTestUser();
      const file = await createTestFile(user._id);
      const share = await createTestShare(file._id, user._id);

      expect(share.createdAt).toBeInstanceOf(Date);
    });

    it('should set updatedAt on creation', async () => {
      const user = await createTestUser();
      const file = await createTestFile(user._id);
      const share = await createTestShare(file._id, user._id);

      expect(share.updatedAt).toBeInstanceOf(Date);
    });

    it('should update updatedAt on modification', async () => {
      const user = await createTestUser();
      const file = await createTestFile(user._id);
      const share = await createTestShare(file._id, user._id);

      const originalUpdatedAt = share.updatedAt;
      await new Promise(resolve => setTimeout(resolve, 10));

      share.accessCount = 5;
      await share.save();

      expect(share.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });

  // =============================================================================
  // TEST SUITE: EDGE CASES
  // =============================================================================

  describe('Edge Cases', () => {
    it('should handle share with all restrictions at once', async () => {
      const user = await createTestUser();
      const file = await createTestFile(user._id);
      const allowedUser = await createTestUser();

      const share = await createTestShare(file._id, user._id, {
        shareType: 'users',
        expiresAt: new Date(Date.now() + 86400000),
        maxAccessCount: 10,
        password: '$2a$10$hashedpassword',
        allowedUsers: [allowedUser._id],
        permissions: { canView: true, canDownload: false, canComment: false },
      });

      expect(share.isValid()).toBe(true);
      expect(share.allowedUsers).toHaveLength(1);
      expect(share.permissions.canDownload).toBe(false);
    });

    it('should handle boundary condition for access count', async () => {
      const user = await createTestUser();
      const file = await createTestFile(user._id);

      const share = await createTestShare(file._id, user._id, {
        maxAccessCount: 1,
        accessCount: 0,
      });

      // Should be valid with 0 accesses
      expect(share.isValid()).toBe(true);

      // Record one access
      await share.recordAccess({});

      // Should now be invalid
      expect(share.isValid()).toBe(false);
    });

    it('should handle boundary condition for expiration', async () => {
      const user = await createTestUser();
      const file = await createTestFile(user._id);

      // Set expiration to exactly now
      const now = new Date();
      const share = await createTestShare(file._id, user._id, {
        expiresAt: now,
      });

      // Should be invalid since expiration has passed
      expect(share.isValid()).toBe(false);
    });
  });
});
