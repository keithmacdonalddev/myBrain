/**
 * =============================================================================
 * TAG MODEL TESTS
 * =============================================================================
 *
 * Comprehensive tests for the Tag model, covering:
 * - Schema validation (required fields, uniqueness)
 * - Tag colors and categories
 * - Default values
 * - User isolation
 * - Tag usage counts
 * - Unique constraints within user (prevent duplicate names)
 * - Static methods (trackUsage, decrementUsage, getPopularTags, searchTags, etc.)
 *
 * Uses mongodb-memory-server for real MongoDB behavior without external deps.
 */

import mongoose from 'mongoose';
import Tag from './Tag.js';
import User from './User.js';
import '../test/setup.js';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Creates a test user for tag ownership.
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
 * Creates a tag with sensible defaults for testing.
 * Override any field by passing in the overrides object.
 */
async function createTestTag(userId, overrides = {}) {
  const defaults = {
    userId,
    name: `tag-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
  };
  return Tag.create({ ...defaults, ...overrides });
}

// =============================================================================
// TEST SUITE: SCHEMA VALIDATION
// =============================================================================

describe('Tag Model', () => {

  describe('Schema Validation', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await createTestUser();
    });

    // -------------------------------------------------------------------------
    // Required Fields
    // -------------------------------------------------------------------------
    describe('Required Fields', () => {
      it('should require userId', async () => {
        await expect(
          Tag.create({
            name: 'work',
          })
        ).rejects.toThrow(/userId.*required|Path `userId` is required/i);
      });

      it('should require name', async () => {
        await expect(
          Tag.create({
            userId: testUser._id,
          })
        ).rejects.toThrow(/name.*required|Path `name` is required/i);
      });

      it('should create tag with all required fields', async () => {
        const tag = await createTestTag(testUser._id, { name: 'work' });
        expect(tag._id).toBeDefined();
        expect(tag.name).toBe('work');
        expect(tag.userId).toEqual(testUser._id);
      });
    });

    // -------------------------------------------------------------------------
    // Name Validation
    // -------------------------------------------------------------------------
    describe('Name Validation', () => {
      it('should trim whitespace from name', async () => {
        const tag = await createTestTag(testUser._id, {
          name: '  important  ',
        });
        expect(tag.name).toBe('important');
      });

      it('should convert name to lowercase', async () => {
        const tag = await createTestTag(testUser._id, {
          name: 'WORK',
        });
        expect(tag.name).toBe('work');
      });

      it('should convert mixed case to lowercase', async () => {
        const tag = await createTestTag(testUser._id, {
          name: 'MeetingNotes',
        });
        expect(tag.name).toBe('meetingnotes');
      });

      it('should reject name exceeding 50 characters', async () => {
        await expect(
          createTestTag(testUser._id, {
            name: 'a'.repeat(51),
          })
        ).rejects.toThrow();
      });

      it('should accept name at exactly 50 characters', async () => {
        const tag = await createTestTag(testUser._id, {
          name: 'a'.repeat(50),
        });
        expect(tag.name.length).toBe(50);
      });
    });
  });

  // ===========================================================================
  // TEST SUITE: DEFAULT VALUES
  // ===========================================================================

  describe('Default Values', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await createTestUser();
    });

    it('should set correct defaults for new tag', async () => {
      const tag = await createTestTag(testUser._id, { name: 'test' });

      expect(tag.usageCount).toBe(1);
      expect(tag.color).toBeNull();
      expect(tag.isActive).toBe(true);
      expect(tag.lastUsed).toBeDefined();
      expect(tag.lastUsed instanceof Date).toBe(true);
    });

    it('should set timestamps on creation', async () => {
      const tag = await createTestTag(testUser._id, { name: 'test' });

      expect(tag.createdAt).toBeDefined();
      expect(tag.updatedAt).toBeDefined();
      expect(tag.createdAt instanceof Date).toBe(true);
      expect(tag.updatedAt instanceof Date).toBe(true);
    });

    it('should update updatedAt on modification', async () => {
      const tag = await createTestTag(testUser._id, { name: 'test' });
      const originalUpdatedAt = tag.updatedAt;

      // Wait a bit to ensure time difference
      await new Promise(resolve => setTimeout(resolve, 10));

      tag.usageCount = 5;
      await tag.save();

      expect(tag.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });

  // ===========================================================================
  // TEST SUITE: TAG COLORS
  // ===========================================================================

  describe('Tag Colors', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await createTestUser();
    });

    it('should default color to null', async () => {
      const tag = await createTestTag(testUser._id, { name: 'test' });
      expect(tag.color).toBeNull();
    });

    it('should accept custom color', async () => {
      const tag = await createTestTag(testUser._id, {
        name: 'urgent',
        color: '#ef4444',
      });
      expect(tag.color).toBe('#ef4444');
    });

    it('should accept various color formats', async () => {
      const colors = ['#3b82f6', '#10b981', 'rgb(239, 68, 68)', 'blue'];

      for (let i = 0; i < colors.length; i++) {
        const tag = await createTestTag(testUser._id, {
          name: `color-test-${i}`,
          color: colors[i],
        });
        expect(tag.color).toBe(colors[i]);
      }
    });
  });

  // ===========================================================================
  // TEST SUITE: USER ISOLATION
  // ===========================================================================

  describe('User Isolation', () => {
    let user1, user2;

    beforeEach(async () => {
      user1 = await createTestUser();
      user2 = await createTestUser();
    });

    it('should only find tags for the correct user', async () => {
      await createTestTag(user1._id, { name: 'user1-tag' });
      await createTestTag(user2._id, { name: 'user2-tag' });

      const user1Tags = await Tag.find({ userId: user1._id });
      const user2Tags = await Tag.find({ userId: user2._id });

      expect(user1Tags).toHaveLength(1);
      expect(user1Tags[0].name).toBe('user1-tag');
      expect(user2Tags).toHaveLength(1);
      expect(user2Tags[0].name).toBe('user2-tag');
    });

    it('should not return tags from other users', async () => {
      await createTestTag(user1._id, { name: 'work' });
      await createTestTag(user1._id, { name: 'personal' });
      await createTestTag(user2._id, { name: 'urgent' });

      const user1Tags = await Tag.find({ userId: user1._id });
      expect(user1Tags).toHaveLength(2);
      expect(user1Tags.every(t => t.userId.equals(user1._id))).toBe(true);
    });

    it('should allow same tag name for different users', async () => {
      const tag1 = await createTestTag(user1._id, { name: 'work' });
      const tag2 = await createTestTag(user2._id, { name: 'work' });

      expect(tag1.name).toBe('work');
      expect(tag2.name).toBe('work');
      expect(tag1._id).not.toEqual(tag2._id);
    });
  });

  // ===========================================================================
  // TEST SUITE: UNIQUE CONSTRAINTS (Prevent Duplicate Names)
  // ===========================================================================

  describe('Unique Constraints', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await createTestUser();
    });

    it('should prevent duplicate tag names for same user', async () => {
      await createTestTag(testUser._id, { name: 'work' });

      await expect(
        createTestTag(testUser._id, { name: 'work' })
      ).rejects.toThrow(/duplicate key|E11000/i);
    });

    it('should prevent duplicate tag names regardless of case', async () => {
      await createTestTag(testUser._id, { name: 'work' });

      // Since names are lowercased, "WORK" becomes "work" and should conflict
      await expect(
        createTestTag(testUser._id, { name: 'WORK' })
      ).rejects.toThrow(/duplicate key|E11000/i);
    });

    it('should prevent duplicate after trimming whitespace', async () => {
      await createTestTag(testUser._id, { name: 'work' });

      await expect(
        createTestTag(testUser._id, { name: '  work  ' })
      ).rejects.toThrow(/duplicate key|E11000/i);
    });

    it('should allow duplicate names for different users', async () => {
      const user2 = await createTestUser();

      await createTestTag(testUser._id, { name: 'work' });
      const tag2 = await createTestTag(user2._id, { name: 'work' });

      expect(tag2.name).toBe('work');
    });
  });

  // ===========================================================================
  // TEST SUITE: USAGE COUNTS
  // ===========================================================================

  describe('Usage Counts', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await createTestUser();
    });

    it('should default usageCount to 1', async () => {
      const tag = await createTestTag(testUser._id, { name: 'test' });
      expect(tag.usageCount).toBe(1);
    });

    it('should accept custom usageCount', async () => {
      const tag = await createTestTag(testUser._id, {
        name: 'popular',
        usageCount: 10,
      });
      expect(tag.usageCount).toBe(10);
    });

    it('should not allow negative usageCount', async () => {
      await expect(
        createTestTag(testUser._id, {
          name: 'test',
          usageCount: -1,
        })
      ).rejects.toThrow();
    });

    it('should allow zero usageCount', async () => {
      const tag = await createTestTag(testUser._id, {
        name: 'unused',
        usageCount: 0,
      });
      expect(tag.usageCount).toBe(0);
    });

    it('should increment usageCount', async () => {
      const tag = await createTestTag(testUser._id, { name: 'test', usageCount: 1 });

      await Tag.updateOne({ _id: tag._id }, { $inc: { usageCount: 1 } });

      const updated = await Tag.findById(tag._id);
      expect(updated.usageCount).toBe(2);
    });

    it('should decrement usageCount', async () => {
      const tag = await createTestTag(testUser._id, { name: 'test', usageCount: 5 });

      await Tag.updateOne({ _id: tag._id }, { $inc: { usageCount: -1 } });

      const updated = await Tag.findById(tag._id);
      expect(updated.usageCount).toBe(4);
    });
  });

  // ===========================================================================
  // TEST SUITE: ACTIVE STATUS
  // ===========================================================================

  describe('Active Status', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await createTestUser();
    });

    it('should default isActive to true', async () => {
      const tag = await createTestTag(testUser._id, { name: 'test' });
      expect(tag.isActive).toBe(true);
    });

    it('should accept isActive false', async () => {
      const tag = await createTestTag(testUser._id, {
        name: 'deprecated',
        isActive: false,
      });
      expect(tag.isActive).toBe(false);
    });

    it('should be able to deactivate and reactivate', async () => {
      const tag = await createTestTag(testUser._id, { name: 'test' });
      expect(tag.isActive).toBe(true);

      tag.isActive = false;
      await tag.save();
      expect(tag.isActive).toBe(false);

      tag.isActive = true;
      await tag.save();
      expect(tag.isActive).toBe(true);
    });
  });

  // ===========================================================================
  // TEST SUITE: STATIC METHODS
  // ===========================================================================

  describe('Static Methods', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await createTestUser();
    });

    // -------------------------------------------------------------------------
    // trackUsage()
    // -------------------------------------------------------------------------
    describe('trackUsage()', () => {
      it('should create new tags when tracking usage', async () => {
        const tags = await Tag.trackUsage(testUser._id, ['work', 'urgent']);

        expect(tags).toHaveLength(2);

        const work = tags.find(t => t.name === 'work');
        const urgent = tags.find(t => t.name === 'urgent');

        expect(work).toBeDefined();
        expect(urgent).toBeDefined();
      });

      it('should increment usageCount for existing tags', async () => {
        // First track creates the tag with usageCount 1
        await Tag.trackUsage(testUser._id, ['work']);

        // Second track increments to 2
        await Tag.trackUsage(testUser._id, ['work']);

        const tag = await Tag.findOne({ userId: testUser._id, name: 'work' });
        expect(tag.usageCount).toBe(2);
      });

      it('should normalize tag names to lowercase', async () => {
        await Tag.trackUsage(testUser._id, ['WORK', 'Urgent']);

        const tags = await Tag.find({ userId: testUser._id });
        expect(tags.map(t => t.name).sort()).toEqual(['urgent', 'work']);
      });

      it('should trim whitespace from tag names', async () => {
        await Tag.trackUsage(testUser._id, ['  work  ', '  urgent  ']);

        const tags = await Tag.find({ userId: testUser._id });
        expect(tags.map(t => t.name).sort()).toEqual(['urgent', 'work']);
      });

      it('should filter out empty tag names', async () => {
        await Tag.trackUsage(testUser._id, ['work', '', '   ', 'urgent']);

        const tags = await Tag.find({ userId: testUser._id });
        expect(tags).toHaveLength(2);
      });

      it('should return empty array for empty input', async () => {
        const result = await Tag.trackUsage(testUser._id, []);
        expect(result).toEqual([]);
      });

      it('should return empty array for null input', async () => {
        const result = await Tag.trackUsage(testUser._id, null);
        expect(result).toEqual([]);
      });

      it('should update lastUsed timestamp', async () => {
        await Tag.trackUsage(testUser._id, ['work']);
        const tag1 = await Tag.findOne({ userId: testUser._id, name: 'work' });

        // Wait and track again
        await new Promise(resolve => setTimeout(resolve, 10));
        await Tag.trackUsage(testUser._id, ['work']);

        const tag2 = await Tag.findOne({ userId: testUser._id, name: 'work' });
        expect(tag2.lastUsed.getTime()).toBeGreaterThanOrEqual(tag1.lastUsed.getTime());
      });
    });

    // -------------------------------------------------------------------------
    // decrementUsage()
    // -------------------------------------------------------------------------
    describe('decrementUsage()', () => {
      it('should decrement usageCount for existing tags', async () => {
        await createTestTag(testUser._id, { name: 'work', usageCount: 5 });

        await Tag.decrementUsage(testUser._id, ['work']);

        const tag = await Tag.findOne({ userId: testUser._id, name: 'work' });
        expect(tag.usageCount).toBe(4);
      });

      it('should delete tags that reach zero usageCount', async () => {
        await createTestTag(testUser._id, { name: 'work', usageCount: 1 });

        await Tag.decrementUsage(testUser._id, ['work']);

        const tag = await Tag.findOne({ userId: testUser._id, name: 'work' });
        expect(tag).toBeNull();
      });

      it('should normalize tag names when decrementing', async () => {
        await createTestTag(testUser._id, { name: 'work', usageCount: 3 });

        await Tag.decrementUsage(testUser._id, ['WORK']);

        const tag = await Tag.findOne({ userId: testUser._id, name: 'work' });
        expect(tag.usageCount).toBe(2);
      });

      it('should handle non-existent tags gracefully', async () => {
        // Should not throw
        await Tag.decrementUsage(testUser._id, ['nonexistent']);

        const tags = await Tag.find({ userId: testUser._id });
        expect(tags).toHaveLength(0);
      });

      it('should handle empty input gracefully', async () => {
        // Should not throw
        await Tag.decrementUsage(testUser._id, []);
        await Tag.decrementUsage(testUser._id, null);
      });
    });

    // -------------------------------------------------------------------------
    // getPopularTags()
    // -------------------------------------------------------------------------
    describe('getPopularTags()', () => {
      it('should return tags sorted by usageCount descending', async () => {
        await createTestTag(testUser._id, { name: 'low', usageCount: 1 });
        await createTestTag(testUser._id, { name: 'high', usageCount: 10 });
        await createTestTag(testUser._id, { name: 'medium', usageCount: 5 });

        const popular = await Tag.getPopularTags(testUser._id);

        expect(popular[0].name).toBe('high');
        expect(popular[1].name).toBe('medium');
        expect(popular[2].name).toBe('low');
      });

      it('should respect limit parameter', async () => {
        for (let i = 0; i < 10; i++) {
          await createTestTag(testUser._id, { name: `tag${i}`, usageCount: i });
        }

        const popular = await Tag.getPopularTags(testUser._id, 5);
        expect(popular).toHaveLength(5);
      });

      it('should only return active tags', async () => {
        await createTestTag(testUser._id, { name: 'active', usageCount: 5, isActive: true });
        await createTestTag(testUser._id, { name: 'inactive', usageCount: 10, isActive: false });

        const popular = await Tag.getPopularTags(testUser._id);

        expect(popular).toHaveLength(1);
        expect(popular[0].name).toBe('active');
      });

      it('should return plain objects (lean)', async () => {
        await createTestTag(testUser._id, { name: 'test' });

        const popular = await Tag.getPopularTags(testUser._id);

        // Lean objects don't have mongoose methods
        expect(typeof popular[0].save).toBe('undefined');
      });

      it('should return empty array for user with no tags', async () => {
        const popular = await Tag.getPopularTags(testUser._id);
        expect(popular).toEqual([]);
      });
    });

    // -------------------------------------------------------------------------
    // searchTags()
    // -------------------------------------------------------------------------
    describe('searchTags()', () => {
      beforeEach(async () => {
        await createTestTag(testUser._id, { name: 'work', usageCount: 10 });
        await createTestTag(testUser._id, { name: 'workflow', usageCount: 5 });
        await createTestTag(testUser._id, { name: 'workshop', usageCount: 3 });
        await createTestTag(testUser._id, { name: 'personal', usageCount: 8 });
      });

      it('should find tags matching query', async () => {
        const results = await Tag.searchTags(testUser._id, 'wor');

        expect(results).toHaveLength(3);
        expect(results.map(t => t.name)).toEqual(
          expect.arrayContaining(['work', 'workflow', 'workshop'])
        );
      });

      it('should be case insensitive', async () => {
        const results = await Tag.searchTags(testUser._id, 'WOR');
        expect(results).toHaveLength(3);
      });

      it('should sort results by popularity', async () => {
        const results = await Tag.searchTags(testUser._id, 'work');

        expect(results[0].name).toBe('work'); // usageCount: 10
        expect(results[1].name).toBe('workflow'); // usageCount: 5
        expect(results[2].name).toBe('workshop'); // usageCount: 3
      });

      it('should respect limit parameter', async () => {
        const results = await Tag.searchTags(testUser._id, 'work', 2);
        expect(results).toHaveLength(2);
      });

      it('should only return active tags', async () => {
        await Tag.updateOne(
          { userId: testUser._id, name: 'workflow' },
          { isActive: false }
        );

        const results = await Tag.searchTags(testUser._id, 'work');
        expect(results.map(t => t.name)).not.toContain('workflow');
      });

      it('should escape regex special characters', async () => {
        await createTestTag(testUser._id, { name: 'test.tag' });

        // "." is a regex special character
        const results = await Tag.searchTags(testUser._id, 'test.');
        expect(results).toHaveLength(1);
        expect(results[0].name).toBe('test.tag');
      });

      it('should return empty array for no matches', async () => {
        const results = await Tag.searchTags(testUser._id, 'xyz');
        expect(results).toEqual([]);
      });
    });

    // -------------------------------------------------------------------------
    // getAllTags()
    // -------------------------------------------------------------------------
    describe('getAllTags()', () => {
      beforeEach(async () => {
        await createTestTag(testUser._id, { name: 'active1', usageCount: 5, isActive: true });
        await createTestTag(testUser._id, { name: 'active2', usageCount: 10, isActive: true });
        await createTestTag(testUser._id, { name: 'inactive', usageCount: 3, isActive: false });
      });

      it('should return all tags by default', async () => {
        const tags = await Tag.getAllTags(testUser._id);
        expect(tags).toHaveLength(3);
      });

      it('should sort by usageCount descending by default', async () => {
        const tags = await Tag.getAllTags(testUser._id);
        expect(tags[0].name).toBe('active2'); // usageCount: 10
      });

      it('should filter out inactive when requested', async () => {
        const tags = await Tag.getAllTags(testUser._id, { includeInactive: false });
        expect(tags).toHaveLength(2);
        expect(tags.map(t => t.name)).not.toContain('inactive');
      });

      it('should allow custom sorting', async () => {
        const tags = await Tag.getAllTags(testUser._id, {
          sortBy: 'name',
          sortOrder: 1,
        });

        expect(tags[0].name).toBe('active1');
        expect(tags[1].name).toBe('active2');
        expect(tags[2].name).toBe('inactive');
      });

      it('should return plain objects (lean)', async () => {
        const tags = await Tag.getAllTags(testUser._id);
        expect(typeof tags[0].save).toBe('undefined');
      });
    });

    // -------------------------------------------------------------------------
    // renameTag()
    // -------------------------------------------------------------------------
    describe('renameTag()', () => {
      it('should rename a tag', async () => {
        await createTestTag(testUser._id, { name: 'work' });

        const renamed = await Tag.renameTag(testUser._id, 'work', 'professional');

        expect(renamed.name).toBe('professional');
      });

      it('should normalize new name to lowercase', async () => {
        await createTestTag(testUser._id, { name: 'work' });

        const renamed = await Tag.renameTag(testUser._id, 'work', 'PROFESSIONAL');

        expect(renamed.name).toBe('professional');
      });

      it('should throw if new name already exists', async () => {
        await createTestTag(testUser._id, { name: 'work' });
        await createTestTag(testUser._id, { name: 'professional' });

        await expect(
          Tag.renameTag(testUser._id, 'work', 'professional')
        ).rejects.toThrow('A tag with this name already exists');
      });

      it('should return null if same name after normalization', async () => {
        await createTestTag(testUser._id, { name: 'work' });

        const result = await Tag.renameTag(testUser._id, 'work', 'WORK');

        expect(result).toBeNull();
      });

      it('should return null if tag not found', async () => {
        const result = await Tag.renameTag(testUser._id, 'nonexistent', 'newname');
        expect(result).toBeNull();
      });
    });

    // -------------------------------------------------------------------------
    // mergeTags()
    // -------------------------------------------------------------------------
    describe('mergeTags()', () => {
      it('should merge tags and combine usage counts', async () => {
        await createTestTag(testUser._id, { name: 'work', usageCount: 5 });
        await createTestTag(testUser._id, { name: 'job', usageCount: 3 });
        await createTestTag(testUser._id, { name: 'career', usageCount: 2 });

        const result = await Tag.mergeTags(
          testUser._id,
          ['work', 'job', 'career'],
          'professional'
        );

        expect(result.targetTag.name).toBe('professional');
        expect(result.targetTag.usageCount).toBe(10); // 5 + 3 + 2
        expect(result.mergedCount).toBe(3);
        expect(result.addedUsage).toBe(10);
      });

      it('should delete source tags after merge', async () => {
        await createTestTag(testUser._id, { name: 'work', usageCount: 5 });
        await createTestTag(testUser._id, { name: 'job', usageCount: 3 });

        await Tag.mergeTags(testUser._id, ['work', 'job'], 'professional');

        const work = await Tag.findOne({ userId: testUser._id, name: 'work' });
        const job = await Tag.findOne({ userId: testUser._id, name: 'job' });

        expect(work).toBeNull();
        expect(job).toBeNull();
      });

      it('should create target tag if it does not exist', async () => {
        await createTestTag(testUser._id, { name: 'work', usageCount: 5 });

        await Tag.mergeTags(testUser._id, ['work'], 'newname');

        const newTag = await Tag.findOne({ userId: testUser._id, name: 'newname' });
        expect(newTag).not.toBeNull();
        expect(newTag.usageCount).toBe(5);
      });

      it('should add to existing target tag usageCount', async () => {
        await createTestTag(testUser._id, { name: 'work', usageCount: 5 });
        await createTestTag(testUser._id, { name: 'professional', usageCount: 3 });

        await Tag.mergeTags(testUser._id, ['work'], 'professional');

        const target = await Tag.findOne({ userId: testUser._id, name: 'professional' });
        expect(target.usageCount).toBe(8); // 5 + 3
      });

      it('should exclude target from sources if included', async () => {
        await createTestTag(testUser._id, { name: 'work', usageCount: 5 });

        // Include target in sources - should not count twice
        const result = await Tag.mergeTags(
          testUser._id,
          ['work', 'professional'],
          'professional'
        );

        // Only 'work' should be merged
        expect(result.mergedCount).toBe(1);
      });

      it('should return null for empty sources', async () => {
        const result = await Tag.mergeTags(testUser._id, [], 'target');
        expect(result).toBeNull();
      });
    });
  });

  // ===========================================================================
  // TEST SUITE: CRUD OPERATIONS
  // ===========================================================================

  describe('CRUD Operations', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await createTestUser();
    });

    it('should create a tag', async () => {
      const tag = await createTestTag(testUser._id, {
        name: 'important',
        color: '#ef4444',
      });

      expect(tag._id).toBeDefined();
      expect(tag.name).toBe('important');
    });

    it('should read a tag by ID', async () => {
      const created = await createTestTag(testUser._id, { name: 'findme' });
      const found = await Tag.findById(created._id);

      expect(found).not.toBeNull();
      expect(found.name).toBe('findme');
    });

    it('should update a tag', async () => {
      const tag = await createTestTag(testUser._id, { name: 'original' });

      const updated = await Tag.findByIdAndUpdate(
        tag._id,
        { color: '#10b981', usageCount: 5 },
        { new: true }
      );

      expect(updated.color).toBe('#10b981');
      expect(updated.usageCount).toBe(5);
    });

    it('should delete a tag', async () => {
      const tag = await createTestTag(testUser._id, { name: 'deleteme' });
      await Tag.findByIdAndDelete(tag._id);

      const found = await Tag.findById(tag._id);
      expect(found).toBeNull();
    });

    it('should find tag by userId and name', async () => {
      await createTestTag(testUser._id, { name: 'work' });

      const found = await Tag.findOne({ userId: testUser._id, name: 'work' });
      expect(found).not.toBeNull();
      expect(found.name).toBe('work');
    });
  });

  // ===========================================================================
  // TEST SUITE: EDGE CASES
  // ===========================================================================

  describe('Edge Cases', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await createTestUser();
    });

    it('should handle hyphenated tag names', async () => {
      const tag = await createTestTag(testUser._id, { name: 'meeting-notes' });
      expect(tag.name).toBe('meeting-notes');
    });

    it('should handle underscored tag names', async () => {
      const tag = await createTestTag(testUser._id, { name: 'project_alpha' });
      expect(tag.name).toBe('project_alpha');
    });

    it('should handle numeric tag names', async () => {
      const tag = await createTestTag(testUser._id, { name: '2026' });
      expect(tag.name).toBe('2026');
    });

    it('should handle tag with numbers and letters', async () => {
      const tag = await createTestTag(testUser._id, { name: 'q4-2026' });
      expect(tag.name).toBe('q4-2026');
    });

    it('should handle single character tag', async () => {
      const tag = await createTestTag(testUser._id, { name: 'x' });
      expect(tag.name).toBe('x');
    });

    it('should handle unicode characters', async () => {
      const tag = await createTestTag(testUser._id, { name: 'café' });
      expect(tag.name).toBe('café');
    });
  });
});
