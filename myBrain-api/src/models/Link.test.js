/**
 * =============================================================================
 * LINK MODEL TESTS
 * =============================================================================
 *
 * Comprehensive tests for the Link model, covering:
 * - Schema validation (required fields, enums)
 * - CRUD operations (create, read, delete)
 * - Bidirectional links (source/target)
 * - Link types (reference, converted_from, related)
 * - Static methods (getLinks, getBacklinks)
 * - Instance methods (toSafeJSON)
 * - User isolation (links belong to users)
 * - Unique constraint (no duplicate links)
 *
 * Uses mongodb-memory-server for real MongoDB behavior without external deps.
 */

import '../test/setup.js';
import mongoose from 'mongoose';
import Link from './Link.js';
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
 * Creates a test link with sensible defaults.
 */
async function createTestLink(userId, overrides = {}) {
  const defaults = {
    userId,
    sourceType: 'note',
    sourceId: new mongoose.Types.ObjectId(),
    targetType: 'task',
    targetId: new mongoose.Types.ObjectId(),
    linkType: 'reference',
  };
  return Link.create({ ...defaults, ...overrides });
}

// =============================================================================
// TEST SUITE: SCHEMA VALIDATION
// =============================================================================

describe('Link Model', () => {
  describe('Schema Validation', () => {
    let user;

    beforeEach(async () => {
      user = await createTestUser();
    });

    it('should require userId', async () => {
      await expect(
        Link.create({
          sourceType: 'note',
          sourceId: new mongoose.Types.ObjectId(),
          targetType: 'task',
          targetId: new mongoose.Types.ObjectId(),
        })
      ).rejects.toThrow(/userId.*required/i);
    });

    it('should require sourceType', async () => {
      await expect(
        Link.create({
          userId: user._id,
          sourceId: new mongoose.Types.ObjectId(),
          targetType: 'task',
          targetId: new mongoose.Types.ObjectId(),
        })
      ).rejects.toThrow(/sourceType.*required/i);
    });

    it('should require sourceId', async () => {
      await expect(
        Link.create({
          userId: user._id,
          sourceType: 'note',
          targetType: 'task',
          targetId: new mongoose.Types.ObjectId(),
        })
      ).rejects.toThrow(/sourceId.*required/i);
    });

    it('should require targetType', async () => {
      await expect(
        Link.create({
          userId: user._id,
          sourceType: 'note',
          sourceId: new mongoose.Types.ObjectId(),
          targetId: new mongoose.Types.ObjectId(),
        })
      ).rejects.toThrow(/targetType.*required/i);
    });

    it('should require targetId', async () => {
      await expect(
        Link.create({
          userId: user._id,
          sourceType: 'note',
          sourceId: new mongoose.Types.ObjectId(),
          targetType: 'task',
        })
      ).rejects.toThrow(/targetId.*required/i);
    });

    it('should reject invalid sourceType', async () => {
      await expect(
        Link.create({
          userId: user._id,
          sourceType: 'invalid',
          sourceId: new mongoose.Types.ObjectId(),
          targetType: 'task',
          targetId: new mongoose.Types.ObjectId(),
        })
      ).rejects.toThrow(/sourceType/i);
    });

    it('should reject invalid targetType', async () => {
      await expect(
        Link.create({
          userId: user._id,
          sourceType: 'note',
          sourceId: new mongoose.Types.ObjectId(),
          targetType: 'invalid',
          targetId: new mongoose.Types.ObjectId(),
        })
      ).rejects.toThrow(/targetType/i);
    });

    it('should accept valid sourceType values', async () => {
      const validTypes = ['note', 'task', 'event', 'project'];

      for (const type of validTypes) {
        const link = await Link.create({
          userId: user._id,
          sourceType: type,
          sourceId: new mongoose.Types.ObjectId(),
          targetType: 'task',
          targetId: new mongoose.Types.ObjectId(),
        });
        expect(link.sourceType).toBe(type);
      }
    });

    it('should accept valid targetType values', async () => {
      const validTypes = ['note', 'task', 'event', 'project'];

      for (const type of validTypes) {
        const link = await Link.create({
          userId: user._id,
          sourceType: 'note',
          sourceId: new mongoose.Types.ObjectId(),
          targetType: type,
          targetId: new mongoose.Types.ObjectId(),
        });
        expect(link.targetType).toBe(type);
      }
    });

    it('should default linkType to reference', async () => {
      const link = await createTestLink(user._id);
      expect(link.linkType).toBe('reference');
    });

    it('should accept valid linkType values', async () => {
      const validTypes = ['reference', 'converted_from', 'related'];

      for (const type of validTypes) {
        const link = await Link.create({
          userId: user._id,
          sourceType: 'note',
          sourceId: new mongoose.Types.ObjectId(),
          targetType: 'task',
          targetId: new mongoose.Types.ObjectId(),
          linkType: type,
        });
        expect(link.linkType).toBe(type);
      }
    });

    it('should reject invalid linkType', async () => {
      await expect(
        Link.create({
          userId: user._id,
          sourceType: 'note',
          sourceId: new mongoose.Types.ObjectId(),
          targetType: 'task',
          targetId: new mongoose.Types.ObjectId(),
          linkType: 'invalid',
        })
      ).rejects.toThrow(/linkType/i);
    });
  });

  // =============================================================================
  // TEST SUITE: CRUD OPERATIONS
  // =============================================================================

  describe('CRUD Operations', () => {
    let user;

    beforeEach(async () => {
      user = await createTestUser();
    });

    it('should create a link successfully', async () => {
      const sourceId = new mongoose.Types.ObjectId();
      const targetId = new mongoose.Types.ObjectId();

      const link = await Link.create({
        userId: user._id,
        sourceType: 'note',
        sourceId,
        targetType: 'task',
        targetId,
        linkType: 'reference',
      });

      expect(link._id).toBeDefined();
      expect(link.userId.toString()).toBe(user._id.toString());
      expect(link.sourceType).toBe('note');
      expect(link.sourceId.toString()).toBe(sourceId.toString());
      expect(link.targetType).toBe('task');
      expect(link.targetId.toString()).toBe(targetId.toString());
      expect(link.linkType).toBe('reference');
      expect(link.createdAt).toBeDefined();
      expect(link.updatedAt).toBeDefined();
    });

    it('should find a link by id', async () => {
      const created = await createTestLink(user._id);
      const found = await Link.findById(created._id);

      expect(found).not.toBeNull();
      expect(found._id.toString()).toBe(created._id.toString());
    });

    it('should update a link', async () => {
      const link = await createTestLink(user._id);

      link.linkType = 'related';
      await link.save();

      const updated = await Link.findById(link._id);
      expect(updated.linkType).toBe('related');
    });

    it('should delete a link', async () => {
      const link = await createTestLink(user._id);

      await Link.deleteOne({ _id: link._id });

      const found = await Link.findById(link._id);
      expect(found).toBeNull();
    });

    it('should find links by sourceId', async () => {
      const sourceId = new mongoose.Types.ObjectId();

      await Link.create({
        userId: user._id,
        sourceType: 'note',
        sourceId,
        targetType: 'task',
        targetId: new mongoose.Types.ObjectId(),
      });
      await Link.create({
        userId: user._id,
        sourceType: 'note',
        sourceId,
        targetType: 'event',
        targetId: new mongoose.Types.ObjectId(),
      });

      const links = await Link.find({ sourceId });
      expect(links).toHaveLength(2);
    });

    it('should find links by targetId', async () => {
      const targetId = new mongoose.Types.ObjectId();

      await Link.create({
        userId: user._id,
        sourceType: 'note',
        sourceId: new mongoose.Types.ObjectId(),
        targetType: 'task',
        targetId,
      });
      await Link.create({
        userId: user._id,
        sourceType: 'project',
        sourceId: new mongoose.Types.ObjectId(),
        targetType: 'task',
        targetId,
      });

      const links = await Link.find({ targetId });
      expect(links).toHaveLength(2);
    });
  });

  // =============================================================================
  // TEST SUITE: BIDIRECTIONAL LINKS
  // =============================================================================

  describe('Bidirectional Links', () => {
    let user;

    beforeEach(async () => {
      user = await createTestUser();
    });

    it('should create note-to-task link', async () => {
      const noteId = new mongoose.Types.ObjectId();
      const taskId = new mongoose.Types.ObjectId();

      const link = await Link.create({
        userId: user._id,
        sourceType: 'note',
        sourceId: noteId,
        targetType: 'task',
        targetId: taskId,
      });

      expect(link.sourceType).toBe('note');
      expect(link.targetType).toBe('task');
    });

    it('should create task-to-project link', async () => {
      const taskId = new mongoose.Types.ObjectId();
      const projectId = new mongoose.Types.ObjectId();

      const link = await Link.create({
        userId: user._id,
        sourceType: 'task',
        sourceId: taskId,
        targetType: 'project',
        targetId: projectId,
      });

      expect(link.sourceType).toBe('task');
      expect(link.targetType).toBe('project');
    });

    it('should create event-to-note link', async () => {
      const eventId = new mongoose.Types.ObjectId();
      const noteId = new mongoose.Types.ObjectId();

      const link = await Link.create({
        userId: user._id,
        sourceType: 'event',
        sourceId: eventId,
        targetType: 'note',
        targetId: noteId,
      });

      expect(link.sourceType).toBe('event');
      expect(link.targetType).toBe('note');
    });

    it('should create project-to-project link', async () => {
      const projectId1 = new mongoose.Types.ObjectId();
      const projectId2 = new mongoose.Types.ObjectId();

      const link = await Link.create({
        userId: user._id,
        sourceType: 'project',
        sourceId: projectId1,
        targetType: 'project',
        targetId: projectId2,
        linkType: 'related',
      });

      expect(link.sourceType).toBe('project');
      expect(link.targetType).toBe('project');
    });
  });

  // =============================================================================
  // TEST SUITE: LINK TYPES
  // =============================================================================

  describe('Link Types', () => {
    let user;

    beforeEach(async () => {
      user = await createTestUser();
    });

    it('should create reference link', async () => {
      const link = await Link.create({
        userId: user._id,
        sourceType: 'note',
        sourceId: new mongoose.Types.ObjectId(),
        targetType: 'task',
        targetId: new mongoose.Types.ObjectId(),
        linkType: 'reference',
      });

      expect(link.linkType).toBe('reference');
    });

    it('should create converted_from link', async () => {
      const link = await Link.create({
        userId: user._id,
        sourceType: 'note',
        sourceId: new mongoose.Types.ObjectId(),
        targetType: 'task',
        targetId: new mongoose.Types.ObjectId(),
        linkType: 'converted_from',
      });

      expect(link.linkType).toBe('converted_from');
    });

    it('should create related link', async () => {
      const link = await Link.create({
        userId: user._id,
        sourceType: 'project',
        sourceId: new mongoose.Types.ObjectId(),
        targetType: 'project',
        targetId: new mongoose.Types.ObjectId(),
        linkType: 'related',
      });

      expect(link.linkType).toBe('related');
    });
  });

  // =============================================================================
  // TEST SUITE: STATIC METHODS
  // =============================================================================

  describe('Static Methods', () => {
    let user;

    beforeEach(async () => {
      user = await createTestUser();
    });

    describe('getLinks()', () => {
      it('should return empty arrays for entity with no links', async () => {
        const entityId = new mongoose.Types.ObjectId();

        const result = await Link.getLinks(user._id, 'note', entityId);

        expect(result.outgoing).toHaveLength(0);
        expect(result.incoming).toHaveLength(0);
      });

      it('should return outgoing links (source = this entity)', async () => {
        const noteId = new mongoose.Types.ObjectId();
        const taskId = new mongoose.Types.ObjectId();

        await Link.create({
          userId: user._id,
          sourceType: 'note',
          sourceId: noteId,
          targetType: 'task',
          targetId: taskId,
        });

        const result = await Link.getLinks(user._id, 'note', noteId);

        expect(result.outgoing).toHaveLength(1);
        expect(result.outgoing[0].targetId.toString()).toBe(taskId.toString());
        expect(result.incoming).toHaveLength(0);
      });

      it('should return incoming links (target = this entity)', async () => {
        const noteId = new mongoose.Types.ObjectId();
        const taskId = new mongoose.Types.ObjectId();

        await Link.create({
          userId: user._id,
          sourceType: 'note',
          sourceId: noteId,
          targetType: 'task',
          targetId: taskId,
        });

        const result = await Link.getLinks(user._id, 'task', taskId);

        expect(result.incoming).toHaveLength(1);
        expect(result.incoming[0].sourceId.toString()).toBe(noteId.toString());
        expect(result.outgoing).toHaveLength(0);
      });

      it('should return both outgoing and incoming links', async () => {
        const noteId = new mongoose.Types.ObjectId();
        const taskId1 = new mongoose.Types.ObjectId();
        const taskId2 = new mongoose.Types.ObjectId();

        // Outgoing: note -> task1
        await Link.create({
          userId: user._id,
          sourceType: 'note',
          sourceId: noteId,
          targetType: 'task',
          targetId: taskId1,
        });

        // Incoming: task2 -> note
        await Link.create({
          userId: user._id,
          sourceType: 'task',
          sourceId: taskId2,
          targetType: 'note',
          targetId: noteId,
        });

        const result = await Link.getLinks(user._id, 'note', noteId);

        expect(result.outgoing).toHaveLength(1);
        expect(result.incoming).toHaveLength(1);
      });

      it('should only return links for specified user', async () => {
        const otherUser = await createTestUser();
        const noteId = new mongoose.Types.ObjectId();

        await Link.create({
          userId: user._id,
          sourceType: 'note',
          sourceId: noteId,
          targetType: 'task',
          targetId: new mongoose.Types.ObjectId(),
        });

        const result = await Link.getLinks(otherUser._id, 'note', noteId);

        expect(result.outgoing).toHaveLength(0);
        expect(result.incoming).toHaveLength(0);
      });
    });

    describe('getBacklinks()', () => {
      it('should return empty array for entity with no backlinks', async () => {
        const entityId = new mongoose.Types.ObjectId();

        const backlinks = await Link.getBacklinks(user._id, 'task', entityId);

        expect(backlinks).toHaveLength(0);
      });

      it('should return all links pointing to entity', async () => {
        const taskId = new mongoose.Types.ObjectId();

        // Create multiple backlinks to the task
        await Link.create({
          userId: user._id,
          sourceType: 'note',
          sourceId: new mongoose.Types.ObjectId(),
          targetType: 'task',
          targetId: taskId,
        });
        await Link.create({
          userId: user._id,
          sourceType: 'project',
          sourceId: new mongoose.Types.ObjectId(),
          targetType: 'task',
          targetId: taskId,
        });

        const backlinks = await Link.getBacklinks(user._id, 'task', taskId);

        expect(backlinks).toHaveLength(2);
      });

      it('should not return outgoing links', async () => {
        const taskId = new mongoose.Types.ObjectId();

        // Outgoing link (task -> note)
        await Link.create({
          userId: user._id,
          sourceType: 'task',
          sourceId: taskId,
          targetType: 'note',
          targetId: new mongoose.Types.ObjectId(),
        });

        const backlinks = await Link.getBacklinks(user._id, 'task', taskId);

        expect(backlinks).toHaveLength(0);
      });

      it('should only return backlinks for specified user', async () => {
        const otherUser = await createTestUser();
        const taskId = new mongoose.Types.ObjectId();

        await Link.create({
          userId: user._id,
          sourceType: 'note',
          sourceId: new mongoose.Types.ObjectId(),
          targetType: 'task',
          targetId: taskId,
        });

        const backlinks = await Link.getBacklinks(otherUser._id, 'task', taskId);

        expect(backlinks).toHaveLength(0);
      });
    });
  });

  // =============================================================================
  // TEST SUITE: INSTANCE METHODS
  // =============================================================================

  describe('Instance Methods', () => {
    let user;

    beforeEach(async () => {
      user = await createTestUser();
    });

    describe('toSafeJSON()', () => {
      it('should return link data without __v', async () => {
        const link = await createTestLink(user._id);

        const safeJson = link.toSafeJSON();

        expect(safeJson.__v).toBeUndefined();
        expect(safeJson._id).toBeDefined();
        expect(safeJson.userId).toBeDefined();
        expect(safeJson.sourceType).toBe('note');
        expect(safeJson.targetType).toBe('task');
        expect(safeJson.linkType).toBe('reference');
      });

      it('should include timestamps', async () => {
        const link = await createTestLink(user._id);

        const safeJson = link.toSafeJSON();

        expect(safeJson.createdAt).toBeDefined();
        expect(safeJson.updatedAt).toBeDefined();
      });
    });
  });

  // =============================================================================
  // TEST SUITE: USER ISOLATION
  // =============================================================================

  describe('User Isolation', () => {
    it('should not find links from other users', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();

      await createTestLink(user1._id);
      await createTestLink(user2._id);

      const user1Links = await Link.find({ userId: user1._id });
      const user2Links = await Link.find({ userId: user2._id });

      expect(user1Links).toHaveLength(1);
      expect(user2Links).toHaveLength(1);
      expect(user1Links[0].userId.toString()).toBe(user1._id.toString());
      expect(user2Links[0].userId.toString()).toBe(user2._id.toString());
    });

    it('should prevent same source/target pair even for different users (unique constraint)', async () => {
      // Note: The unique constraint is on sourceId + targetId only, not userId.
      // This is a design decision in the schema - items can only be linked once globally.
      const user1 = await createTestUser();
      const user2 = await createTestUser();
      const sourceId = new mongoose.Types.ObjectId();
      const targetId = new mongoose.Types.ObjectId();

      await Link.create({
        userId: user1._id,
        sourceType: 'note',
        sourceId,
        targetType: 'task',
        targetId,
      });

      // Second user trying to create same link should fail
      await expect(
        Link.create({
          userId: user2._id,
          sourceType: 'note',
          sourceId,
          targetType: 'task',
          targetId,
        })
      ).rejects.toThrow(/duplicate key/i);
    });
  });

  // =============================================================================
  // TEST SUITE: UNIQUE CONSTRAINT
  // =============================================================================

  describe('Unique Constraint', () => {
    let user;

    beforeEach(async () => {
      user = await createTestUser();
    });

    it('should prevent duplicate links between same source and target', async () => {
      const sourceId = new mongoose.Types.ObjectId();
      const targetId = new mongoose.Types.ObjectId();

      await Link.create({
        userId: user._id,
        sourceType: 'note',
        sourceId,
        targetType: 'task',
        targetId,
      });

      await expect(
        Link.create({
          userId: user._id,
          sourceType: 'note',
          sourceId,
          targetType: 'task',
          targetId,
        })
      ).rejects.toThrow(/duplicate key/i);
    });

    it('should allow different source to same target', async () => {
      const sourceId1 = new mongoose.Types.ObjectId();
      const sourceId2 = new mongoose.Types.ObjectId();
      const targetId = new mongoose.Types.ObjectId();

      const link1 = await Link.create({
        userId: user._id,
        sourceType: 'note',
        sourceId: sourceId1,
        targetType: 'task',
        targetId,
      });

      const link2 = await Link.create({
        userId: user._id,
        sourceType: 'note',
        sourceId: sourceId2,
        targetType: 'task',
        targetId,
      });

      expect(link1._id).not.toEqual(link2._id);
    });

    it('should allow same source to different targets', async () => {
      const sourceId = new mongoose.Types.ObjectId();
      const targetId1 = new mongoose.Types.ObjectId();
      const targetId2 = new mongoose.Types.ObjectId();

      const link1 = await Link.create({
        userId: user._id,
        sourceType: 'note',
        sourceId,
        targetType: 'task',
        targetId: targetId1,
      });

      const link2 = await Link.create({
        userId: user._id,
        sourceType: 'note',
        sourceId,
        targetType: 'task',
        targetId: targetId2,
      });

      expect(link1._id).not.toEqual(link2._id);
    });
  });

  // =============================================================================
  // TEST SUITE: TIMESTAMPS
  // =============================================================================

  describe('Timestamps', () => {
    let user;

    beforeEach(async () => {
      user = await createTestUser();
    });

    it('should set createdAt on creation', async () => {
      const before = new Date();
      const link = await createTestLink(user._id);
      const after = new Date();

      expect(link.createdAt).toBeDefined();
      expect(link.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(link.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should update updatedAt on modification', async () => {
      const link = await createTestLink(user._id);
      const originalUpdatedAt = link.updatedAt;

      // Wait a bit to ensure time difference
      await new Promise(resolve => setTimeout(resolve, 10));

      link.linkType = 'related';
      await link.save();

      expect(link.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });
});
