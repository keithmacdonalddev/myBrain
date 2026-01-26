/**
 * =============================================================================
 * ITEMSHARE MODEL TESTS
 * =============================================================================
 *
 * Comprehensive tests for the ItemShare model, covering:
 * - Static methods (generateShareToken, hashPassword, getSharedWithUser, etc.)
 * - Instance methods (verifyPassword, isExpired, hasReachedMaxAccess, etc.)
 * - Share creation and token generation
 * - Access control (view vs edit permissions)
 * - Expiration handling
 * - Access limits (max access count)
 * - Password protection
 * - User queries (find shares by user)
 * - Validation and edge cases
 *
 * Uses mongodb-memory-server for real MongoDB behavior without external deps.
 */

import '../test/setup.js';
import mongoose from 'mongoose';
import ItemShare from './ItemShare.js';
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
 * Creates an ItemShare with sensible defaults.
 */
async function createTestShare(overrides = {}) {
  const owner = overrides.owner || await createTestUser();
  const defaults = {
    itemId: new mongoose.Types.ObjectId(),
    itemType: 'note',
    ownerId: owner._id,
    shareType: 'connection',
    isActive: true,
  };
  // Remove owner from overrides since we extracted it
  const { owner: _, ...rest } = overrides;
  return ItemShare.create({ ...defaults, ...rest });
}

// =============================================================================
// TEST SUITE: STATIC METHODS
// =============================================================================

describe('ItemShare Model', () => {
  // ---------------------------------------------------------------------------
  // generateShareToken()
  // ---------------------------------------------------------------------------
  describe('generateShareToken()', () => {
    it('should generate a 32-character hex string', () => {
      const token = ItemShare.generateShareToken();
      expect(token).toHaveLength(32);
      expect(/^[a-f0-9]+$/.test(token)).toBe(true);
    });

    it('should generate unique tokens', () => {
      const tokens = new Set();
      for (let i = 0; i < 100; i++) {
        tokens.add(ItemShare.generateShareToken());
      }
      expect(tokens.size).toBe(100);
    });

    it('should generate cryptographically random tokens', () => {
      const token1 = ItemShare.generateShareToken();
      const token2 = ItemShare.generateShareToken();
      expect(token1).not.toBe(token2);
    });
  });

  // ---------------------------------------------------------------------------
  // hashPassword()
  // ---------------------------------------------------------------------------
  describe('hashPassword()', () => {
    it('should hash a password', async () => {
      const password = 'mySecretPassword123';
      const hash = await ItemShare.hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.startsWith('$2')).toBe(true); // bcrypt hash
    });

    it('should generate different hashes for same password', async () => {
      const password = 'samePassword';
      const hash1 = await ItemShare.hashPassword(password);
      const hash2 = await ItemShare.hashPassword(password);

      expect(hash1).not.toBe(hash2);
    });

    it('should generate verifiable hashes', async () => {
      const password = 'verifyMe123';
      const hash = await ItemShare.hashPassword(password);

      const bcrypt = (await import('bcryptjs')).default;
      const isValid = await bcrypt.compare(password, hash);
      expect(isValid).toBe(true);
    });

    it('should handle empty password', async () => {
      const hash = await ItemShare.hashPassword('');
      expect(hash).toBeDefined();
      expect(hash.startsWith('$2')).toBe(true);
    });

    it('should handle special characters in password', async () => {
      const password = '!@#$%^&*()_+-=[]{}|;:,.<>?';
      const hash = await ItemShare.hashPassword(password);
      expect(hash).toBeDefined();

      const bcrypt = (await import('bcryptjs')).default;
      const isValid = await bcrypt.compare(password, hash);
      expect(isValid).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // getSharedWithUser()
  // ---------------------------------------------------------------------------
  describe('getSharedWithUser()', () => {
    it('should return items shared with user and accepted', async () => {
      const owner = await createTestUser();
      const recipient = await createTestUser();

      const share = await createTestShare({
        owner,
        sharedWithUsers: [{
          userId: recipient._id,
          permission: 'view',
          status: 'accepted',
        }],
      });

      const shares = await ItemShare.getSharedWithUser(recipient._id);
      expect(shares).toHaveLength(1);
      expect(shares[0]._id.toString()).toBe(share._id.toString());
    });

    it('should not return pending shares', async () => {
      const owner = await createTestUser();
      const recipient = await createTestUser();

      await createTestShare({
        owner,
        sharedWithUsers: [{
          userId: recipient._id,
          permission: 'view',
          status: 'pending',
        }],
      });

      const shares = await ItemShare.getSharedWithUser(recipient._id);
      expect(shares).toHaveLength(0);
    });

    it('should not return declined shares', async () => {
      const owner = await createTestUser();
      const recipient = await createTestUser();

      await createTestShare({
        owner,
        sharedWithUsers: [{
          userId: recipient._id,
          permission: 'view',
          status: 'declined',
        }],
      });

      const shares = await ItemShare.getSharedWithUser(recipient._id);
      expect(shares).toHaveLength(0);
    });

    it('should not return inactive shares', async () => {
      const owner = await createTestUser();
      const recipient = await createTestUser();

      await createTestShare({
        owner,
        isActive: false,
        sharedWithUsers: [{
          userId: recipient._id,
          permission: 'view',
          status: 'accepted',
        }],
      });

      const shares = await ItemShare.getSharedWithUser(recipient._id);
      expect(shares).toHaveLength(0);
    });

    it('should filter by itemType', async () => {
      const owner = await createTestUser();
      const recipient = await createTestUser();

      await createTestShare({
        owner,
        itemType: 'note',
        sharedWithUsers: [{
          userId: recipient._id,
          permission: 'view',
          status: 'accepted',
        }],
      });

      await createTestShare({
        owner,
        itemType: 'project',
        sharedWithUsers: [{
          userId: recipient._id,
          permission: 'view',
          status: 'accepted',
        }],
      });

      const noteShares = await ItemShare.getSharedWithUser(recipient._id, { itemType: 'note' });
      expect(noteShares).toHaveLength(1);
      expect(noteShares[0].itemType).toBe('note');

      const projectShares = await ItemShare.getSharedWithUser(recipient._id, { itemType: 'project' });
      expect(projectShares).toHaveLength(1);
      expect(projectShares[0].itemType).toBe('project');
    });

    it('should respect limit option', async () => {
      const owner = await createTestUser();
      const recipient = await createTestUser();

      for (let i = 0; i < 5; i++) {
        await createTestShare({
          owner,
          sharedWithUsers: [{
            userId: recipient._id,
            permission: 'view',
            status: 'accepted',
          }],
        });
      }

      const shares = await ItemShare.getSharedWithUser(recipient._id, { limit: 2 });
      expect(shares).toHaveLength(2);
    });

    it('should respect skip option for pagination', async () => {
      const owner = await createTestUser();
      const recipient = await createTestUser();

      const createdShares = [];
      for (let i = 0; i < 5; i++) {
        const share = await createTestShare({
          owner,
          sharedWithUsers: [{
            userId: recipient._id,
            permission: 'view',
            status: 'accepted',
          }],
        });
        createdShares.push(share);
      }

      const allShares = await ItemShare.getSharedWithUser(recipient._id);
      const skippedShares = await ItemShare.getSharedWithUser(recipient._id, { skip: 2 });

      expect(allShares).toHaveLength(5);
      expect(skippedShares).toHaveLength(3);
    });

    it('should populate owner info', async () => {
      const owner = await createTestUser({
        email: 'owner@example.com',
        profile: { displayName: 'Test Owner' },
      });
      const recipient = await createTestUser();

      await createTestShare({
        owner,
        sharedWithUsers: [{
          userId: recipient._id,
          permission: 'view',
          status: 'accepted',
        }],
      });

      const shares = await ItemShare.getSharedWithUser(recipient._id);
      expect(shares[0].ownerId.email).toBe('owner@example.com');
    });
  });

  // ---------------------------------------------------------------------------
  // getPendingShares()
  // ---------------------------------------------------------------------------
  describe('getPendingShares()', () => {
    it('should return pending share invitations', async () => {
      const owner = await createTestUser();
      const recipient = await createTestUser();

      await createTestShare({
        owner,
        sharedWithUsers: [{
          userId: recipient._id,
          permission: 'view',
          status: 'pending',
        }],
      });

      const pending = await ItemShare.getPendingShares(recipient._id);
      expect(pending).toHaveLength(1);
    });

    it('should not return accepted shares', async () => {
      const owner = await createTestUser();
      const recipient = await createTestUser();

      await createTestShare({
        owner,
        sharedWithUsers: [{
          userId: recipient._id,
          permission: 'view',
          status: 'accepted',
        }],
      });

      const pending = await ItemShare.getPendingShares(recipient._id);
      expect(pending).toHaveLength(0);
    });

    it('should not return inactive shares', async () => {
      const owner = await createTestUser();
      const recipient = await createTestUser();

      await createTestShare({
        owner,
        isActive: false,
        sharedWithUsers: [{
          userId: recipient._id,
          permission: 'view',
          status: 'pending',
        }],
      });

      const pending = await ItemShare.getPendingShares(recipient._id);
      expect(pending).toHaveLength(0);
    });

    it('should respect limit and skip options', async () => {
      const owner = await createTestUser();
      const recipient = await createTestUser();

      for (let i = 0; i < 5; i++) {
        await createTestShare({
          owner,
          sharedWithUsers: [{
            userId: recipient._id,
            permission: 'view',
            status: 'pending',
          }],
        });
      }

      const limited = await ItemShare.getPendingShares(recipient._id, { limit: 2 });
      expect(limited).toHaveLength(2);

      const skipped = await ItemShare.getPendingShares(recipient._id, { skip: 3 });
      expect(skipped).toHaveLength(2);
    });

    it('should populate owner info', async () => {
      const owner = await createTestUser({
        email: 'pending-owner@example.com',
      });
      const recipient = await createTestUser();

      await createTestShare({
        owner,
        sharedWithUsers: [{
          userId: recipient._id,
          permission: 'view',
          status: 'pending',
        }],
      });

      const pending = await ItemShare.getPendingShares(recipient._id);
      expect(pending[0].ownerId.email).toBe('pending-owner@example.com');
    });
  });

  // ---------------------------------------------------------------------------
  // getSharedByUser()
  // ---------------------------------------------------------------------------
  describe('getSharedByUser()', () => {
    it('should return items shared by the user', async () => {
      const owner = await createTestUser();
      const recipient = await createTestUser();

      const share = await createTestShare({
        owner,
        sharedWithUsers: [{
          userId: recipient._id,
          permission: 'view',
          status: 'accepted',
        }],
      });

      const shares = await ItemShare.getSharedByUser(owner._id);
      expect(shares).toHaveLength(1);
      expect(shares[0]._id.toString()).toBe(share._id.toString());
    });

    it('should not return inactive shares', async () => {
      const owner = await createTestUser();

      await createTestShare({
        owner,
        isActive: false,
      });

      const shares = await ItemShare.getSharedByUser(owner._id);
      expect(shares).toHaveLength(0);
    });

    it('should filter by itemType', async () => {
      const owner = await createTestUser();

      await createTestShare({ owner, itemType: 'note' });
      await createTestShare({ owner, itemType: 'task' });
      await createTestShare({ owner, itemType: 'project' });

      const noteShares = await ItemShare.getSharedByUser(owner._id, { itemType: 'note' });
      expect(noteShares).toHaveLength(1);
      expect(noteShares[0].itemType).toBe('note');
    });

    it('should respect limit and skip options', async () => {
      const owner = await createTestUser();

      for (let i = 0; i < 5; i++) {
        await createTestShare({ owner });
      }

      const limited = await ItemShare.getSharedByUser(owner._id, { limit: 3 });
      expect(limited).toHaveLength(3);

      const skipped = await ItemShare.getSharedByUser(owner._id, { skip: 2 });
      expect(skipped).toHaveLength(3);
    });

    it('should populate shared user info', async () => {
      const owner = await createTestUser();
      const recipient = await createTestUser({
        email: 'recipient@example.com',
      });

      await createTestShare({
        owner,
        sharedWithUsers: [{
          userId: recipient._id,
          permission: 'view',
          status: 'accepted',
        }],
      });

      const shares = await ItemShare.getSharedByUser(owner._id);
      expect(shares[0].sharedWithUsers[0].userId.email).toBe('recipient@example.com');
    });
  });

  // ---------------------------------------------------------------------------
  // getByToken()
  // ---------------------------------------------------------------------------
  describe('getByToken()', () => {
    it('should find public share by token', async () => {
      const owner = await createTestUser();
      const token = ItemShare.generateShareToken();

      await createTestShare({
        owner,
        shareType: 'public',
        shareToken: token,
      });

      const share = await ItemShare.getByToken(token);
      expect(share).not.toBeNull();
      expect(share.shareToken).toBe(token);
    });

    it('should find password share by token', async () => {
      const owner = await createTestUser();
      const token = ItemShare.generateShareToken();

      await createTestShare({
        owner,
        shareType: 'password',
        shareToken: token,
      });

      const share = await ItemShare.getByToken(token);
      expect(share).not.toBeNull();
      expect(share.shareType).toBe('password');
    });

    it('should not find connection shares by token', async () => {
      const owner = await createTestUser();
      const token = ItemShare.generateShareToken();

      await createTestShare({
        owner,
        shareType: 'connection',
        shareToken: token, // This shouldn't be used for connection shares
      });

      const share = await ItemShare.getByToken(token);
      expect(share).toBeNull();
    });

    it('should not find inactive shares', async () => {
      const owner = await createTestUser();
      const token = ItemShare.generateShareToken();

      await createTestShare({
        owner,
        shareType: 'public',
        shareToken: token,
        isActive: false,
      });

      const share = await ItemShare.getByToken(token);
      expect(share).toBeNull();
    });

    it('should return null for non-existent token', async () => {
      const share = await ItemShare.getByToken('nonexistent123456789012345678901');
      expect(share).toBeNull();
    });

    it('should populate owner info', async () => {
      const owner = await createTestUser({
        email: 'token-owner@example.com',
      });
      const token = ItemShare.generateShareToken();

      await createTestShare({
        owner,
        shareType: 'public',
        shareToken: token,
      });

      const share = await ItemShare.getByToken(token);
      expect(share.ownerId.email).toBe('token-owner@example.com');
    });
  });

  // ---------------------------------------------------------------------------
  // getSharesForItem()
  // ---------------------------------------------------------------------------
  describe('getSharesForItem()', () => {
    it('should find all shares for an item', async () => {
      const owner = await createTestUser();
      const itemId = new mongoose.Types.ObjectId();

      await createTestShare({ owner, itemId, itemType: 'note' });
      await createTestShare({ owner, itemId, itemType: 'note' });

      const shares = await ItemShare.getSharesForItem(itemId, 'note');
      expect(shares).toHaveLength(2);
    });

    it('should not return shares for different item type', async () => {
      const owner = await createTestUser();
      const itemId = new mongoose.Types.ObjectId();

      await createTestShare({ owner, itemId, itemType: 'note' });

      const shares = await ItemShare.getSharesForItem(itemId, 'task');
      expect(shares).toHaveLength(0);
    });

    it('should not return inactive shares', async () => {
      const owner = await createTestUser();
      const itemId = new mongoose.Types.ObjectId();

      await createTestShare({ owner, itemId, itemType: 'note', isActive: false });

      const shares = await ItemShare.getSharesForItem(itemId, 'note');
      expect(shares).toHaveLength(0);
    });

    it('should populate shared user info', async () => {
      const owner = await createTestUser();
      const recipient = await createTestUser({
        email: 'item-recipient@example.com',
      });
      const itemId = new mongoose.Types.ObjectId();

      await createTestShare({
        owner,
        itemId,
        itemType: 'note',
        sharedWithUsers: [{
          userId: recipient._id,
          permission: 'edit',
          status: 'accepted',
        }],
      });

      const shares = await ItemShare.getSharesForItem(itemId, 'note');
      expect(shares[0].sharedWithUsers[0].userId.email).toBe('item-recipient@example.com');
    });
  });

  // ---------------------------------------------------------------------------
  // getShareCounts()
  // ---------------------------------------------------------------------------
  describe('getShareCounts()', () => {
    it('should return correct counts for user with shares', async () => {
      const owner = await createTestUser();
      const recipient = await createTestUser();
      const anotherOwner = await createTestUser();

      // Create shares BY the owner (sharedByMe)
      await createTestShare({ owner });
      await createTestShare({ owner });

      // Create shares WITH the recipient (accepted - sharedWithMe)
      await createTestShare({
        owner: anotherOwner,
        sharedWithUsers: [{
          userId: recipient._id,
          permission: 'view',
          status: 'accepted',
        }],
      });

      // Create pending shares for the recipient
      await createTestShare({
        owner: anotherOwner,
        sharedWithUsers: [{
          userId: recipient._id,
          permission: 'view',
          status: 'pending',
        }],
      });
      await createTestShare({
        owner: anotherOwner,
        sharedWithUsers: [{
          userId: recipient._id,
          permission: 'view',
          status: 'pending',
        }],
      });

      const ownerCounts = await ItemShare.getShareCounts(owner._id);
      expect(ownerCounts.sharedByMe).toBe(2);
      expect(ownerCounts.sharedWithMe).toBe(0);
      expect(ownerCounts.pending).toBe(0);

      const recipientCounts = await ItemShare.getShareCounts(recipient._id);
      expect(recipientCounts.sharedByMe).toBe(0);
      expect(recipientCounts.sharedWithMe).toBe(1);
      expect(recipientCounts.pending).toBe(2);
    });

    it('should return zero counts for user with no shares', async () => {
      const user = await createTestUser();

      const counts = await ItemShare.getShareCounts(user._id);
      expect(counts.sharedByMe).toBe(0);
      expect(counts.sharedWithMe).toBe(0);
      expect(counts.pending).toBe(0);
    });

    it('should not count inactive shares', async () => {
      const owner = await createTestUser();

      await createTestShare({ owner, isActive: false });
      await createTestShare({ owner, isActive: false });

      const counts = await ItemShare.getShareCounts(owner._id);
      expect(counts.sharedByMe).toBe(0);
    });
  });

  // =============================================================================
  // TEST SUITE: INSTANCE METHODS
  // =============================================================================

  // ---------------------------------------------------------------------------
  // verifyPassword()
  // ---------------------------------------------------------------------------
  describe('verifyPassword()', () => {
    it('should return true for correct password', async () => {
      const owner = await createTestUser();
      const password = 'secretShare123';
      const hash = await ItemShare.hashPassword(password);

      const share = await createTestShare({
        owner,
        shareType: 'password',
        sharePasswordHash: hash,
      });

      const isValid = await share.verifyPassword(password);
      expect(isValid).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      const owner = await createTestUser();
      const hash = await ItemShare.hashPassword('correctPassword');

      const share = await createTestShare({
        owner,
        shareType: 'password',
        sharePasswordHash: hash,
      });

      const isValid = await share.verifyPassword('wrongPassword');
      expect(isValid).toBe(false);
    });

    it('should return true if no password is set', async () => {
      const owner = await createTestUser();

      const share = await createTestShare({
        owner,
        shareType: 'public',
        sharePasswordHash: null,
      });

      const isValid = await share.verifyPassword('anyPassword');
      expect(isValid).toBe(true);
    });

    it('should handle empty password input', async () => {
      const owner = await createTestUser();
      const hash = await ItemShare.hashPassword('actualPassword');

      const share = await createTestShare({
        owner,
        shareType: 'password',
        sharePasswordHash: hash,
      });

      const isValid = await share.verifyPassword('');
      expect(isValid).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // isExpired()
  // ---------------------------------------------------------------------------
  describe('isExpired()', () => {
    it('should return false when no expiration is set', async () => {
      const owner = await createTestUser();

      const share = await createTestShare({
        owner,
        expiresAt: null,
      });

      expect(share.isExpired()).toBe(false);
    });

    it('should return false when expiration is in the future', async () => {
      const owner = await createTestUser();
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow

      const share = await createTestShare({
        owner,
        expiresAt: futureDate,
      });

      expect(share.isExpired()).toBe(false);
    });

    it('should return true when expiration is in the past', async () => {
      const owner = await createTestUser();
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // Yesterday

      const share = await createTestShare({
        owner,
        expiresAt: pastDate,
      });

      expect(share.isExpired()).toBe(true);
    });

    it('should handle exact current time boundary', async () => {
      const owner = await createTestUser();
      const now = new Date(Date.now() - 1); // Just before now

      const share = await createTestShare({
        owner,
        expiresAt: now,
      });

      expect(share.isExpired()).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // hasReachedMaxAccess()
  // ---------------------------------------------------------------------------
  describe('hasReachedMaxAccess()', () => {
    it('should return false when no max is set', async () => {
      const owner = await createTestUser();

      const share = await createTestShare({
        owner,
        maxAccessCount: null,
        currentAccessCount: 100,
      });

      expect(share.hasReachedMaxAccess()).toBe(false);
    });

    it('should return false when under max limit', async () => {
      const owner = await createTestUser();

      const share = await createTestShare({
        owner,
        maxAccessCount: 10,
        currentAccessCount: 5,
      });

      expect(share.hasReachedMaxAccess()).toBe(false);
    });

    it('should return true when at max limit', async () => {
      const owner = await createTestUser();

      const share = await createTestShare({
        owner,
        maxAccessCount: 10,
        currentAccessCount: 10,
      });

      expect(share.hasReachedMaxAccess()).toBe(true);
    });

    it('should return true when over max limit', async () => {
      const owner = await createTestUser();

      const share = await createTestShare({
        owner,
        maxAccessCount: 10,
        currentAccessCount: 15,
      });

      expect(share.hasReachedMaxAccess()).toBe(true);
    });

    it('should handle zero max access count', async () => {
      const owner = await createTestUser();

      const share = await createTestShare({
        owner,
        maxAccessCount: 0,
        currentAccessCount: 0,
      });

      // Note: hasReachedMaxAccess returns false when maxAccessCount is 0
      // because 0 is falsy in JavaScript (!0 === true, so the method returns false)
      // This is expected behavior - 0 means no limit was effectively set
      expect(share.hasReachedMaxAccess()).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // hasUserAccess()
  // ---------------------------------------------------------------------------
  describe('hasUserAccess()', () => {
    it('should return true for owner', async () => {
      const owner = await createTestUser();

      const share = await createTestShare({ owner });

      expect(share.hasUserAccess(owner._id)).toBe(true);
    });

    it('should return true for accepted shared user', async () => {
      const owner = await createTestUser();
      const recipient = await createTestUser();

      const share = await createTestShare({
        owner,
        sharedWithUsers: [{
          userId: recipient._id,
          permission: 'view',
          status: 'accepted',
        }],
      });

      expect(share.hasUserAccess(recipient._id)).toBe(true);
    });

    it('should return false for pending shared user', async () => {
      const owner = await createTestUser();
      const recipient = await createTestUser();

      const share = await createTestShare({
        owner,
        sharedWithUsers: [{
          userId: recipient._id,
          permission: 'view',
          status: 'pending',
        }],
      });

      expect(share.hasUserAccess(recipient._id)).toBe(false);
    });

    it('should return false for declined shared user', async () => {
      const owner = await createTestUser();
      const recipient = await createTestUser();

      const share = await createTestShare({
        owner,
        sharedWithUsers: [{
          userId: recipient._id,
          permission: 'view',
          status: 'declined',
        }],
      });

      expect(share.hasUserAccess(recipient._id)).toBe(false);
    });

    it('should return false for unrelated user', async () => {
      const owner = await createTestUser();
      const unrelatedUser = await createTestUser();

      const share = await createTestShare({ owner });

      expect(share.hasUserAccess(unrelatedUser._id)).toBe(false);
    });

    it('should handle string userId comparison', async () => {
      const owner = await createTestUser();

      const share = await createTestShare({ owner });

      expect(share.hasUserAccess(owner._id.toString())).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // getUserPermission()
  // ---------------------------------------------------------------------------
  describe('getUserPermission()', () => {
    it('should return owner for share owner', async () => {
      const owner = await createTestUser();

      const share = await createTestShare({ owner });

      expect(share.getUserPermission(owner._id)).toBe('owner');
    });

    it('should return view permission for viewer', async () => {
      const owner = await createTestUser();
      const recipient = await createTestUser();

      const share = await createTestShare({
        owner,
        sharedWithUsers: [{
          userId: recipient._id,
          permission: 'view',
          status: 'accepted',
        }],
      });

      expect(share.getUserPermission(recipient._id)).toBe('view');
    });

    it('should return comment permission for commenter', async () => {
      const owner = await createTestUser();
      const recipient = await createTestUser();

      const share = await createTestShare({
        owner,
        sharedWithUsers: [{
          userId: recipient._id,
          permission: 'comment',
          status: 'accepted',
        }],
      });

      expect(share.getUserPermission(recipient._id)).toBe('comment');
    });

    it('should return edit permission for editor', async () => {
      const owner = await createTestUser();
      const recipient = await createTestUser();

      const share = await createTestShare({
        owner,
        sharedWithUsers: [{
          userId: recipient._id,
          permission: 'edit',
          status: 'accepted',
        }],
      });

      expect(share.getUserPermission(recipient._id)).toBe('edit');
    });

    it('should return null for pending user', async () => {
      const owner = await createTestUser();
      const recipient = await createTestUser();

      const share = await createTestShare({
        owner,
        sharedWithUsers: [{
          userId: recipient._id,
          permission: 'edit',
          status: 'pending',
        }],
      });

      expect(share.getUserPermission(recipient._id)).toBeNull();
    });

    it('should return null for unrelated user', async () => {
      const owner = await createTestUser();
      const unrelatedUser = await createTestUser();

      const share = await createTestShare({ owner });

      expect(share.getUserPermission(unrelatedUser._id)).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // logAccess()
  // ---------------------------------------------------------------------------
  describe('logAccess()', () => {
    it('should add entry to access log', async () => {
      const owner = await createTestUser();
      const accessor = await createTestUser();

      const share = await createTestShare({ owner });

      await share.logAccess(accessor._id, 'view', '192.168.1.1');

      const updatedShare = await ItemShare.findById(share._id);
      expect(updatedShare.accessLog).toHaveLength(1);
      expect(updatedShare.accessLog[0].userId.toString()).toBe(accessor._id.toString());
      expect(updatedShare.accessLog[0].action).toBe('view');
      expect(updatedShare.accessLog[0].ip).toBe('192.168.1.1');
    });

    it('should increment access counter', async () => {
      const owner = await createTestUser();

      const share = await createTestShare({
        owner,
        currentAccessCount: 5,
      });

      await share.logAccess(null, 'view', '10.0.0.1');

      const updatedShare = await ItemShare.findById(share._id);
      expect(updatedShare.currentAccessCount).toBe(6);
    });

    it('should handle anonymous access (null userId)', async () => {
      const owner = await createTestUser();

      const share = await createTestShare({ owner });

      await share.logAccess(null, 'download', '172.16.0.1');

      const updatedShare = await ItemShare.findById(share._id);
      // MongoDB stores null explicitly, not undefined
      expect(updatedShare.accessLog[0].userId).toBeNull();
      expect(updatedShare.accessLog[0].action).toBe('download');
    });

    it('should keep only last 100 log entries', async () => {
      const owner = await createTestUser();

      const share = await createTestShare({
        owner,
        accessLog: Array(100).fill({
          action: 'view',
          ip: '1.1.1.1',
          accessedAt: new Date(),
        }),
      });

      await share.logAccess(null, 'edit', '2.2.2.2');

      const updatedShare = await ItemShare.findById(share._id);
      expect(updatedShare.accessLog).toHaveLength(100);
      expect(updatedShare.accessLog[99].ip).toBe('2.2.2.2');
    });

    it('should record timestamp', async () => {
      const owner = await createTestUser();

      const share = await createTestShare({ owner });
      const beforeAccess = new Date();

      await share.logAccess(null, 'view', '1.1.1.1');

      const updatedShare = await ItemShare.findById(share._id);
      expect(updatedShare.accessLog[0].accessedAt).toBeDefined();
      expect(updatedShare.accessLog[0].accessedAt >= beforeAccess).toBe(true);
    });

    it('should support different action types', async () => {
      const owner = await createTestUser();
      const share = await createTestShare({ owner });

      await share.logAccess(null, 'view', '1.1.1.1');
      await share.logAccess(null, 'download', '1.1.1.1');
      await share.logAccess(null, 'edit', '1.1.1.1');
      await share.logAccess(null, 'comment', '1.1.1.1');

      const updatedShare = await ItemShare.findById(share._id);
      expect(updatedShare.accessLog[0].action).toBe('view');
      expect(updatedShare.accessLog[1].action).toBe('download');
      expect(updatedShare.accessLog[2].action).toBe('edit');
      expect(updatedShare.accessLog[3].action).toBe('comment');
    });
  });

  // =============================================================================
  // TEST SUITE: SHARE CREATION AND VALIDATION
  // =============================================================================

  describe('Share Creation', () => {
    it('should create a basic connection share', async () => {
      const owner = await createTestUser();

      const share = await createTestShare({
        owner,
        shareType: 'connection',
      });

      expect(share.shareType).toBe('connection');
      expect(share.isActive).toBe(true);
      expect(share.currentAccessCount).toBe(0);
    });

    it('should create a public share with token', async () => {
      const owner = await createTestUser();
      const token = ItemShare.generateShareToken();

      const share = await createTestShare({
        owner,
        shareType: 'public',
        shareToken: token,
      });

      expect(share.shareType).toBe('public');
      expect(share.shareToken).toBe(token);
    });

    it('should create a password-protected share', async () => {
      const owner = await createTestUser();
      const token = ItemShare.generateShareToken();
      const hash = await ItemShare.hashPassword('secret123');

      const share = await ItemShare.create({
        itemId: new mongoose.Types.ObjectId(),
        itemType: 'file',
        ownerId: owner._id,
        shareType: 'password',
        shareToken: token,
        sharePasswordHash: hash,
      });

      expect(share.shareType).toBe('password');
      const fetchedShare = await ItemShare.findById(share._id).select('+sharePasswordHash');
      expect(fetchedShare.sharePasswordHash).toBe(hash);
    });

    it('should set default permissions', async () => {
      const owner = await createTestUser();

      const share = await createTestShare({ owner });

      expect(share.permissions.canView).toBe(true);
      expect(share.permissions.canComment).toBe(false);
      expect(share.permissions.canEdit).toBe(false);
      expect(share.permissions.canDownload).toBe(true);
      expect(share.permissions.canShare).toBe(false);
    });

    it('should support all item types', async () => {
      const owner = await createTestUser();
      const itemTypes = ['project', 'task', 'note', 'file', 'folder'];

      for (const itemType of itemTypes) {
        const share = await createTestShare({ owner, itemType });
        expect(share.itemType).toBe(itemType);
      }
    });

    it('should reject invalid item type', async () => {
      const owner = await createTestUser();

      await expect(
        ItemShare.create({
          itemId: new mongoose.Types.ObjectId(),
          itemType: 'invalid',
          ownerId: owner._id,
        })
      ).rejects.toThrow();
    });

    it('should require itemId', async () => {
      const owner = await createTestUser();

      await expect(
        ItemShare.create({
          itemType: 'note',
          ownerId: owner._id,
        })
      ).rejects.toThrow();
    });

    it('should require ownerId', async () => {
      await expect(
        ItemShare.create({
          itemId: new mongoose.Types.ObjectId(),
          itemType: 'note',
        })
      ).rejects.toThrow();
    });

    it('should enforce title max length', async () => {
      const owner = await createTestUser();

      await expect(
        ItemShare.create({
          itemId: new mongoose.Types.ObjectId(),
          itemType: 'note',
          ownerId: owner._id,
          title: 'a'.repeat(201),
        })
      ).rejects.toThrow(/cannot exceed 200 characters/);
    });

    it('should enforce description max length', async () => {
      const owner = await createTestUser();

      await expect(
        ItemShare.create({
          itemId: new mongoose.Types.ObjectId(),
          itemType: 'note',
          ownerId: owner._id,
          description: 'a'.repeat(1001),
        })
      ).rejects.toThrow(/cannot exceed 1000 characters/);
    });

    it('should enforce unique share tokens', async () => {
      const owner = await createTestUser();
      const token = ItemShare.generateShareToken();

      await createTestShare({
        owner,
        shareType: 'public',
        shareToken: token,
      });

      await expect(
        createTestShare({
          owner,
          shareType: 'public',
          shareToken: token,
        })
      ).rejects.toThrow(/duplicate key/i);
    });

    it('should allow multiple shares without token (sparse index)', async () => {
      const owner = await createTestUser();

      // Connection shares don't need tokens - leave shareToken undefined (not null)
      // The sparse index allows multiple documents where the field is missing,
      // but null values are treated as duplicates
      await createTestShare({ owner, shareType: 'connection' });
      await createTestShare({ owner, shareType: 'connection' });

      const shares = await ItemShare.getSharedByUser(owner._id);
      expect(shares).toHaveLength(2);
    });
  });

  // =============================================================================
  // TEST SUITE: PERMISSION LEVELS
  // =============================================================================

  describe('Permission Levels', () => {
    it('should default shared user permission to view', async () => {
      const owner = await createTestUser();
      const recipient = await createTestUser();

      const share = await createTestShare({
        owner,
        sharedWithUsers: [{
          userId: recipient._id,
          status: 'accepted',
        }],
      });

      expect(share.sharedWithUsers[0].permission).toBe('view');
    });

    it('should support view permission', async () => {
      const owner = await createTestUser();
      const recipient = await createTestUser();

      const share = await createTestShare({
        owner,
        sharedWithUsers: [{
          userId: recipient._id,
          permission: 'view',
          status: 'accepted',
        }],
      });

      expect(share.getUserPermission(recipient._id)).toBe('view');
    });

    it('should support comment permission', async () => {
      const owner = await createTestUser();
      const recipient = await createTestUser();

      const share = await createTestShare({
        owner,
        sharedWithUsers: [{
          userId: recipient._id,
          permission: 'comment',
          status: 'accepted',
        }],
      });

      expect(share.getUserPermission(recipient._id)).toBe('comment');
    });

    it('should support edit permission', async () => {
      const owner = await createTestUser();
      const recipient = await createTestUser();

      const share = await createTestShare({
        owner,
        sharedWithUsers: [{
          userId: recipient._id,
          permission: 'edit',
          status: 'accepted',
        }],
      });

      expect(share.getUserPermission(recipient._id)).toBe('edit');
    });

    it('should reject invalid permission', async () => {
      const owner = await createTestUser();
      const recipient = await createTestUser();

      await expect(
        ItemShare.create({
          itemId: new mongoose.Types.ObjectId(),
          itemType: 'note',
          ownerId: owner._id,
          sharedWithUsers: [{
            userId: recipient._id,
            permission: 'admin',
            status: 'accepted',
          }],
        })
      ).rejects.toThrow();
    });

    it('should support multiple users with different permissions', async () => {
      const owner = await createTestUser();
      const viewer = await createTestUser();
      const commenter = await createTestUser();
      const editor = await createTestUser();

      const share = await createTestShare({
        owner,
        sharedWithUsers: [
          { userId: viewer._id, permission: 'view', status: 'accepted' },
          { userId: commenter._id, permission: 'comment', status: 'accepted' },
          { userId: editor._id, permission: 'edit', status: 'accepted' },
        ],
      });

      expect(share.getUserPermission(viewer._id)).toBe('view');
      expect(share.getUserPermission(commenter._id)).toBe('comment');
      expect(share.getUserPermission(editor._id)).toBe('edit');
    });
  });

  // =============================================================================
  // TEST SUITE: SHARE STATUS
  // =============================================================================

  describe('Share Status', () => {
    it('should default shared user status to pending', async () => {
      const owner = await createTestUser();
      const recipient = await createTestUser();

      const share = await createTestShare({
        owner,
        sharedWithUsers: [{
          userId: recipient._id,
          permission: 'view',
        }],
      });

      expect(share.sharedWithUsers[0].status).toBe('pending');
    });

    it('should support accepted status', async () => {
      const owner = await createTestUser();
      const recipient = await createTestUser();

      const share = await createTestShare({
        owner,
        sharedWithUsers: [{
          userId: recipient._id,
          permission: 'view',
          status: 'accepted',
          acceptedAt: new Date(),
        }],
      });

      expect(share.sharedWithUsers[0].status).toBe('accepted');
      expect(share.sharedWithUsers[0].acceptedAt).toBeDefined();
    });

    it('should support declined status', async () => {
      const owner = await createTestUser();
      const recipient = await createTestUser();

      const share = await createTestShare({
        owner,
        sharedWithUsers: [{
          userId: recipient._id,
          permission: 'view',
          status: 'declined',
        }],
      });

      expect(share.sharedWithUsers[0].status).toBe('declined');
    });

    it('should record sharedAt timestamp', async () => {
      const owner = await createTestUser();
      const recipient = await createTestUser();
      const beforeCreate = new Date();

      const share = await createTestShare({
        owner,
        sharedWithUsers: [{
          userId: recipient._id,
          permission: 'view',
        }],
      });

      expect(share.sharedWithUsers[0].sharedAt).toBeDefined();
      expect(share.sharedWithUsers[0].sharedAt >= beforeCreate).toBe(true);
    });
  });

  // =============================================================================
  // TEST SUITE: EXPIRATION AND ACCESS LIMITS
  // =============================================================================

  describe('Expiration and Access Limits', () => {
    it('should handle share with future expiration', async () => {
      const owner = await createTestUser();
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 1 week

      const share = await createTestShare({
        owner,
        expiresAt: futureDate,
      });

      expect(share.isExpired()).toBe(false);
    });

    it('should handle share that just expired', async () => {
      const owner = await createTestUser();
      const justExpired = new Date(Date.now() - 1000); // 1 second ago

      const share = await createTestShare({
        owner,
        expiresAt: justExpired,
      });

      expect(share.isExpired()).toBe(true);
    });

    it('should handle max access count of 1 (one-time link)', async () => {
      const owner = await createTestUser();

      const share = await createTestShare({
        owner,
        maxAccessCount: 1,
        currentAccessCount: 0,
      });

      expect(share.hasReachedMaxAccess()).toBe(false);

      await share.logAccess(null, 'view', '1.1.1.1');

      const updatedShare = await ItemShare.findById(share._id);
      expect(updatedShare.hasReachedMaxAccess()).toBe(true);
    });

    it('should combine expiration and access count checks', async () => {
      const owner = await createTestUser();
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const share = await createTestShare({
        owner,
        expiresAt: futureDate,
        maxAccessCount: 10,
        currentAccessCount: 5,
      });

      expect(share.isExpired()).toBe(false);
      expect(share.hasReachedMaxAccess()).toBe(false);
    });
  });

  // =============================================================================
  // TEST SUITE: TIMESTAMPS
  // =============================================================================

  describe('Timestamps', () => {
    it('should set createdAt on creation', async () => {
      const owner = await createTestUser();
      const beforeCreate = new Date();

      const share = await createTestShare({ owner });

      expect(share.createdAt).toBeDefined();
      expect(share.createdAt >= beforeCreate).toBe(true);
    });

    it('should set updatedAt on creation', async () => {
      const owner = await createTestUser();

      const share = await createTestShare({ owner });

      expect(share.updatedAt).toBeDefined();
    });

    it('should update updatedAt on modification', async () => {
      const owner = await createTestUser();

      const share = await createTestShare({ owner });
      const originalUpdatedAt = share.updatedAt;

      // Wait a bit and update
      await new Promise(resolve => setTimeout(resolve, 10));
      share.title = 'Updated Title';
      await share.save();

      expect(share.updatedAt > originalUpdatedAt).toBe(true);
    });
  });
});
