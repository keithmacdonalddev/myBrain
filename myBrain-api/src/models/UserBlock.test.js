/**
 * =============================================================================
 * USERBLOCK.TEST.JS - Tests for User Blocking Model
 * =============================================================================
 *
 * Tests covering:
 * - CRUD operations for blocks
 * - Validation of required fields
 * - Block checking (one-way and bidirectional)
 * - Getting blocked users and IDs
 * - Query helpers for exclusion lists
 * - Unique constraint (no duplicate blocks)
 */

import '../test/setup.js';
import mongoose from 'mongoose';
import UserBlock from './UserBlock.js';
import User from './User.js';

// =============================================================================
// TEST HELPERS
// =============================================================================

/**
 * Creates a test user with minimal required fields
 */
const createTestUser = async (emailSuffix) => {
  return User.create({
    email: `testuser${emailSuffix}@example.com`,
    passwordHash: 'hashedpassword123'
  });
};

// =============================================================================
// CRUD OPERATIONS
// =============================================================================

describe('UserBlock Model - CRUD Operations', () => {
  let blocker, blocked;

  beforeEach(async () => {
    blocker = await createTestUser('blocker');
    blocked = await createTestUser('blocked');
  });

  describe('Create', () => {
    test('should create a block between two users', async () => {
      const block = await UserBlock.create({
        blockerId: blocker._id,
        blockedId: blocked._id
      });

      expect(block).toBeDefined();
      expect(block.blockerId.toString()).toBe(blocker._id.toString());
      expect(block.blockedId.toString()).toBe(blocked._id.toString());
      expect(block.reason).toBe('other'); // Default value
      expect(block.createdAt).toBeDefined();
    });

    test('should create a block with reason', async () => {
      const block = await UserBlock.create({
        blockerId: blocker._id,
        blockedId: blocked._id,
        reason: 'spam'
      });

      expect(block.reason).toBe('spam');
    });

    test('should create a block with notes', async () => {
      const block = await UserBlock.create({
        blockerId: blocker._id,
        blockedId: blocked._id,
        reason: 'harassment',
        notes: 'Kept sending unwanted messages'
      });

      expect(block.notes).toBe('Kept sending unwanted messages');
    });

    test('should create a block with all valid reasons', async () => {
      const reasons = ['spam', 'harassment', 'inappropriate', 'other'];

      for (let i = 0; i < reasons.length; i++) {
        const user1 = await createTestUser(`reason${i}a`);
        const user2 = await createTestUser(`reason${i}b`);

        const block = await UserBlock.create({
          blockerId: user1._id,
          blockedId: user2._id,
          reason: reasons[i]
        });

        expect(block.reason).toBe(reasons[i]);
      }
    });
  });

  describe('Read', () => {
    test('should find a block by id', async () => {
      const created = await UserBlock.create({
        blockerId: blocker._id,
        blockedId: blocked._id
      });

      const found = await UserBlock.findById(created._id);
      expect(found).toBeDefined();
      expect(found.blockerId.toString()).toBe(blocker._id.toString());
    });

    test('should find blocks by blocker', async () => {
      const user2 = await createTestUser('blocked2');
      const user3 = await createTestUser('blocked3');

      await UserBlock.create({ blockerId: blocker._id, blockedId: blocked._id });
      await UserBlock.create({ blockerId: blocker._id, blockedId: user2._id });
      await UserBlock.create({ blockerId: user3._id, blockedId: blocker._id });

      const blocks = await UserBlock.find({ blockerId: blocker._id });
      expect(blocks).toHaveLength(2);
    });
  });

  describe('Update', () => {
    test('should update block reason', async () => {
      const block = await UserBlock.create({
        blockerId: blocker._id,
        blockedId: blocked._id,
        reason: 'other'
      });

      block.reason = 'harassment';
      await block.save();

      const updated = await UserBlock.findById(block._id);
      expect(updated.reason).toBe('harassment');
    });

    test('should update block notes', async () => {
      const block = await UserBlock.create({
        blockerId: blocker._id,
        blockedId: blocked._id
      });

      block.notes = 'Updated reason for blocking';
      await block.save();

      const updated = await UserBlock.findById(block._id);
      expect(updated.notes).toBe('Updated reason for blocking');
    });
  });

  describe('Delete (Unblock)', () => {
    test('should delete a block (unblock user)', async () => {
      const block = await UserBlock.create({
        blockerId: blocker._id,
        blockedId: blocked._id
      });

      await UserBlock.findByIdAndDelete(block._id);

      const found = await UserBlock.findById(block._id);
      expect(found).toBeNull();
    });

    test('should unblock by blocker and blocked ids', async () => {
      await UserBlock.create({
        blockerId: blocker._id,
        blockedId: blocked._id
      });

      await UserBlock.deleteOne({ blockerId: blocker._id, blockedId: blocked._id });

      const found = await UserBlock.findOne({ blockerId: blocker._id, blockedId: blocked._id });
      expect(found).toBeNull();
    });
  });
});

// =============================================================================
// VALIDATION
// =============================================================================

describe('UserBlock Model - Validation', () => {
  let blocker, blocked;

  beforeEach(async () => {
    blocker = await createTestUser('vblocker');
    blocked = await createTestUser('vblocked');
  });

  describe('Required Fields', () => {
    test('should fail without blockerId', async () => {
      const block = new UserBlock({
        blockedId: blocked._id
      });

      await expect(block.save()).rejects.toThrow();
    });

    test('should fail without blockedId', async () => {
      const block = new UserBlock({
        blockerId: blocker._id
      });

      await expect(block.save()).rejects.toThrow();
    });
  });

  describe('Enum Validation', () => {
    test('should fail with invalid reason', async () => {
      const block = new UserBlock({
        blockerId: blocker._id,
        blockedId: blocked._id,
        reason: 'invalid_reason'
      });

      await expect(block.save()).rejects.toThrow();
    });
  });

  describe('Notes Length', () => {
    test('should allow notes up to 500 characters', async () => {
      const longNotes = 'a'.repeat(500);
      const block = await UserBlock.create({
        blockerId: blocker._id,
        blockedId: blocked._id,
        notes: longNotes
      });

      expect(block.notes).toHaveLength(500);
    });

    test('should fail with notes over 500 characters', async () => {
      const tooLongNotes = 'a'.repeat(501);
      const block = new UserBlock({
        blockerId: blocker._id,
        blockedId: blocked._id,
        notes: tooLongNotes
      });

      await expect(block.save()).rejects.toThrow();
    });
  });

  describe('Unique Constraint', () => {
    test('should not allow duplicate blocks between same users', async () => {
      await UserBlock.create({
        blockerId: blocker._id,
        blockedId: blocked._id
      });

      // Try to create duplicate
      await expect(
        UserBlock.create({
          blockerId: blocker._id,
          blockedId: blocked._id
        })
      ).rejects.toThrow();
    });

    test('should allow reverse block (A blocks B, B can also block A)', async () => {
      await UserBlock.create({
        blockerId: blocker._id,
        blockedId: blocked._id
      });

      // Reverse block should work
      const reverseBlock = await UserBlock.create({
        blockerId: blocked._id,
        blockedId: blocker._id
      });

      expect(reverseBlock).toBeDefined();
    });
  });
});

// =============================================================================
// STATIC METHODS - BLOCK CHECKING
// =============================================================================

describe('UserBlock Model - Block Checking', () => {
  let userA, userB, userC;

  beforeEach(async () => {
    userA = await createTestUser('checka');
    userB = await createTestUser('checkb');
    userC = await createTestUser('checkc');
  });

  describe('isBlocked (one-way)', () => {
    test('should return true when user is blocked', async () => {
      await UserBlock.create({
        blockerId: userA._id,
        blockedId: userB._id
      });

      const result = await UserBlock.isBlocked(userA._id, userB._id);
      expect(result).toBe(true);
    });

    test('should return false when user is not blocked', async () => {
      const result = await UserBlock.isBlocked(userA._id, userB._id);
      expect(result).toBe(false);
    });

    test('should return false for reverse direction (A blocked B, check if B blocked A)', async () => {
      await UserBlock.create({
        blockerId: userA._id,
        blockedId: userB._id
      });

      // A blocked B, but B didn't block A
      const result = await UserBlock.isBlocked(userB._id, userA._id);
      expect(result).toBe(false);
    });
  });

  describe('hasBlockBetween (bidirectional)', () => {
    test('should return true when first user blocked second', async () => {
      await UserBlock.create({
        blockerId: userA._id,
        blockedId: userB._id
      });

      const result = await UserBlock.hasBlockBetween(userA._id, userB._id);
      expect(result).toBe(true);
    });

    test('should return true when second user blocked first', async () => {
      await UserBlock.create({
        blockerId: userB._id,
        blockedId: userA._id
      });

      const result = await UserBlock.hasBlockBetween(userA._id, userB._id);
      expect(result).toBe(true);
    });

    test('should return true when both users blocked each other', async () => {
      await UserBlock.create({ blockerId: userA._id, blockedId: userB._id });
      await UserBlock.create({ blockerId: userB._id, blockedId: userA._id });

      const result = await UserBlock.hasBlockBetween(userA._id, userB._id);
      expect(result).toBe(true);
    });

    test('should return false when no block exists', async () => {
      const result = await UserBlock.hasBlockBetween(userA._id, userB._id);
      expect(result).toBe(false);
    });

    test('should be order-independent', async () => {
      await UserBlock.create({
        blockerId: userA._id,
        blockedId: userB._id
      });

      const result1 = await UserBlock.hasBlockBetween(userA._id, userB._id);
      const result2 = await UserBlock.hasBlockBetween(userB._id, userA._id);

      expect(result1).toBe(true);
      expect(result2).toBe(true);
    });
  });
});

// =============================================================================
// STATIC METHODS - GETTING BLOCKED USERS
// =============================================================================

describe('UserBlock Model - Getting Blocked Users', () => {
  let mainUser, blocked1, blocked2, blocked3, blockerOfMain;

  beforeEach(async () => {
    mainUser = await createTestUser('main');
    blocked1 = await createTestUser('blocked1');
    blocked2 = await createTestUser('blocked2');
    blocked3 = await createTestUser('blocked3');
    blockerOfMain = await createTestUser('blocker');

    // mainUser blocked three users
    await UserBlock.create({ blockerId: mainUser._id, blockedId: blocked1._id, reason: 'spam' });
    await UserBlock.create({ blockerId: mainUser._id, blockedId: blocked2._id, reason: 'harassment' });
    await UserBlock.create({ blockerId: mainUser._id, blockedId: blocked3._id, reason: 'other' });

    // One user blocked mainUser
    await UserBlock.create({ blockerId: blockerOfMain._id, blockedId: mainUser._id });
  });

  describe('getBlockedUsers', () => {
    test('should return all users blocked by a user', async () => {
      const result = await UserBlock.getBlockedUsers(mainUser._id);

      expect(result).toHaveLength(3);
    });

    test('should populate blocked user details', async () => {
      const result = await UserBlock.getBlockedUsers(mainUser._id);

      // Check that blockedId is populated with user info
      expect(result[0].blockedId).toBeDefined();
      expect(result[0].blockedId.email).toBeDefined();
    });

    test('should respect limit option', async () => {
      const result = await UserBlock.getBlockedUsers(mainUser._id, { limit: 2 });

      expect(result).toHaveLength(2);
    });

    test('should respect skip option', async () => {
      const result = await UserBlock.getBlockedUsers(mainUser._id, { skip: 2 });

      expect(result).toHaveLength(1);
    });

    test('should sort by most recently blocked first', async () => {
      // Create blocks with deliberate time gaps for deterministic ordering
      const sortUser = await createTestUser('sortmain');
      const sortBlocked1 = await createTestUser('sortblocked1');
      const sortBlocked2 = await createTestUser('sortblocked2');

      // Create first block
      await UserBlock.create({ blockerId: sortUser._id, blockedId: sortBlocked1._id });

      // Wait a bit to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 50));

      // Create second block (should be first in results since it's newer)
      await UserBlock.create({ blockerId: sortUser._id, blockedId: sortBlocked2._id });

      const result = await UserBlock.getBlockedUsers(sortUser._id);

      // Most recent should be first (sortBlocked2 was created last)
      expect(result[0].blockedId._id.toString()).toBe(sortBlocked2._id.toString());
      expect(result[1].blockedId._id.toString()).toBe(sortBlocked1._id.toString());
    });

    test('should return empty array for user with no blocks', async () => {
      const newUser = await createTestUser('noblocks');
      const result = await UserBlock.getBlockedUsers(newUser._id);

      expect(result).toHaveLength(0);
    });
  });

  describe('getBlockedUserIds', () => {
    test('should return array of blocked user IDs', async () => {
      const result = await UserBlock.getBlockedUserIds(mainUser._id);

      expect(result).toHaveLength(3);
      expect(result.map(id => id.toString())).toContain(blocked1._id.toString());
      expect(result.map(id => id.toString())).toContain(blocked2._id.toString());
      expect(result.map(id => id.toString())).toContain(blocked3._id.toString());
    });

    test('should not include users who blocked this user', async () => {
      const result = await UserBlock.getBlockedUserIds(mainUser._id);

      expect(result.map(id => id.toString())).not.toContain(blockerOfMain._id.toString());
    });

    test('should return empty array for user with no blocks', async () => {
      const newUser = await createTestUser('noblocks2');
      const result = await UserBlock.getBlockedUserIds(newUser._id);

      expect(result).toHaveLength(0);
    });
  });

  describe('getBlockedByUserIds', () => {
    test('should return array of user IDs who blocked this user', async () => {
      const result = await UserBlock.getBlockedByUserIds(mainUser._id);

      expect(result).toHaveLength(1);
      expect(result[0].toString()).toBe(blockerOfMain._id.toString());
    });

    test('should not include users this user has blocked', async () => {
      const result = await UserBlock.getBlockedByUserIds(mainUser._id);

      expect(result.map(id => id.toString())).not.toContain(blocked1._id.toString());
    });

    test('should return empty array for user not blocked by anyone', async () => {
      const newUser = await createTestUser('notblocked');
      const result = await UserBlock.getBlockedByUserIds(newUser._id);

      expect(result).toHaveLength(0);
    });
  });

  describe('getAllExcludedUserIds', () => {
    test('should return combined blocked and blocked-by IDs', async () => {
      const result = await UserBlock.getAllExcludedUserIds(mainUser._id);

      // Should include all 3 users mainUser blocked + 1 user who blocked mainUser
      expect(result).toHaveLength(4);
    });

    test('should deduplicate mutual blocks', async () => {
      // Create mutual block
      await UserBlock.create({ blockerId: blocked1._id, blockedId: mainUser._id });

      const result = await UserBlock.getAllExcludedUserIds(mainUser._id);

      // blocked1 should only appear once despite being in both lists
      const blocked1Count = result.filter(id => id === blocked1._id.toString()).length;
      expect(blocked1Count).toBe(1);
    });

    test('should return strings not ObjectIds', async () => {
      const result = await UserBlock.getAllExcludedUserIds(mainUser._id);

      result.forEach(id => {
        expect(typeof id).toBe('string');
      });
    });

    test('should return empty array for user with no block relationships', async () => {
      const newUser = await createTestUser('isolated');
      const result = await UserBlock.getAllExcludedUserIds(newUser._id);

      expect(result).toHaveLength(0);
    });
  });
});

// =============================================================================
// TIMESTAMPS
// =============================================================================

describe('UserBlock Model - Timestamps', () => {
  test('should have createdAt timestamp', async () => {
    const blocker = await createTestUser('tsblocker');
    const blocked = await createTestUser('tsblocked');

    const block = await UserBlock.create({
      blockerId: blocker._id,
      blockedId: blocked._id
    });

    expect(block.createdAt).toBeDefined();
    expect(block.createdAt instanceof Date).toBe(true);
  });

  test('should have updatedAt timestamp', async () => {
    const blocker = await createTestUser('tsblocker2');
    const blocked = await createTestUser('tsblocked2');

    const block = await UserBlock.create({
      blockerId: blocker._id,
      blockedId: blocked._id
    });

    expect(block.updatedAt).toBeDefined();
    expect(block.updatedAt instanceof Date).toBe(true);
  });

  test('should update updatedAt when modified', async () => {
    const blocker = await createTestUser('tsblocker3');
    const blocked = await createTestUser('tsblocked3');

    const block = await UserBlock.create({
      blockerId: blocker._id,
      blockedId: blocked._id
    });

    const originalUpdatedAt = block.updatedAt;

    // Wait a small amount and update
    await new Promise(resolve => setTimeout(resolve, 10));
    block.notes = 'Updated notes';
    await block.save();

    expect(block.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
  });
});
