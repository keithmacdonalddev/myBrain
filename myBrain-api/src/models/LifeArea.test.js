/**
 * =============================================================================
 * LIFEAREA MODEL TESTS
 * =============================================================================
 *
 * Comprehensive tests for the LifeArea model, covering:
 * - Schema validation (required fields, maxlengths)
 * - Default life areas creation
 * - Color and icon handling
 * - Order/priority management
 * - User isolation
 * - Unique constraints within user
 * - Static methods (getByUser, getOrCreateDefault, setDefault, reorder)
 * - Instance methods (toSafeJSON)
 *
 * Uses mongodb-memory-server for real MongoDB behavior without external deps.
 */

import mongoose from 'mongoose';
import LifeArea from './LifeArea.js';
import User from './User.js';
import '../test/setup.js';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Creates a test user for life area ownership.
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
 * Creates a life area with sensible defaults for testing.
 * Override any field by passing in the overrides object.
 */
async function createTestLifeArea(userId, overrides = {}) {
  const defaults = {
    userId,
    name: `Test Area ${Date.now()}`,
  };
  return LifeArea.create({ ...defaults, ...overrides });
}

// =============================================================================
// TEST SUITE: SCHEMA VALIDATION
// =============================================================================

describe('LifeArea Model', () => {

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
          LifeArea.create({
            name: 'Test Area',
          })
        ).rejects.toThrow(/userId.*required|Path `userId` is required/i);
      });

      it('should require name', async () => {
        await expect(
          LifeArea.create({
            userId: testUser._id,
          })
        ).rejects.toThrow(/Category name is required/i);
      });

      it('should create life area with all required fields', async () => {
        const area = await createTestLifeArea(testUser._id);
        expect(area._id).toBeDefined();
        expect(area.name).toBeDefined();
        expect(area.userId).toEqual(testUser._id);
      });
    });

    // -------------------------------------------------------------------------
    // Name Validation
    // -------------------------------------------------------------------------
    describe('Name Validation', () => {
      it('should trim whitespace from name', async () => {
        const area = await createTestLifeArea(testUser._id, {
          name: '  Work & Career  ',
        });
        expect(area.name).toBe('Work & Career');
      });

      it('should reject name exceeding 50 characters', async () => {
        await expect(
          createTestLifeArea(testUser._id, {
            name: 'a'.repeat(51),
          })
        ).rejects.toThrow(/Name cannot exceed 50 characters/i);
      });

      it('should accept name at exactly 50 characters', async () => {
        const area = await createTestLifeArea(testUser._id, {
          name: 'a'.repeat(50),
        });
        expect(area.name.length).toBe(50);
      });
    });

    // -------------------------------------------------------------------------
    // Description Validation
    // -------------------------------------------------------------------------
    describe('Description Validation', () => {
      it('should default description to empty string', async () => {
        const area = await createTestLifeArea(testUser._id);
        expect(area.description).toBe('');
      });

      it('should accept optional description', async () => {
        const area = await createTestLifeArea(testUser._id, {
          description: 'Professional responsibilities and projects',
        });
        expect(area.description).toBe('Professional responsibilities and projects');
      });

      it('should trim whitespace from description', async () => {
        const area = await createTestLifeArea(testUser._id, {
          description: '  Career goals  ',
        });
        expect(area.description).toBe('Career goals');
      });

      it('should reject description exceeding 200 characters', async () => {
        await expect(
          createTestLifeArea(testUser._id, {
            description: 'a'.repeat(201),
          })
        ).rejects.toThrow(/Description cannot exceed 200 characters/i);
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

    it('should set correct defaults for new life area', async () => {
      const area = await createTestLifeArea(testUser._id, { name: 'Test' });

      expect(area.color).toBe('#6366f1'); // Indigo
      expect(area.icon).toBe('Folder');
      expect(area.order).toBe(0);
      expect(area.isDefault).toBe(false);
      expect(area.isArchived).toBe(false);
      expect(area.description).toBe('');
    });

    it('should set timestamps on creation', async () => {
      const area = await createTestLifeArea(testUser._id, { name: 'Test' });

      expect(area.createdAt).toBeDefined();
      expect(area.updatedAt).toBeDefined();
      expect(area.createdAt instanceof Date).toBe(true);
      expect(area.updatedAt instanceof Date).toBe(true);
    });

    it('should update updatedAt on modification', async () => {
      const area = await createTestLifeArea(testUser._id, { name: 'Test' });
      const originalUpdatedAt = area.updatedAt;

      // Wait a bit to ensure time difference
      await new Promise(resolve => setTimeout(resolve, 10));

      area.name = 'Updated Name';
      await area.save();

      expect(area.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });

  // ===========================================================================
  // TEST SUITE: COLOR AND ICON
  // ===========================================================================

  describe('Color and Icon', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await createTestUser();
    });

    it('should default color to indigo', async () => {
      const area = await createTestLifeArea(testUser._id, { name: 'Test' });
      expect(area.color).toBe('#6366f1');
    });

    it('should accept custom color', async () => {
      const area = await createTestLifeArea(testUser._id, {
        name: 'Health',
        color: '#10b981', // Green
      });
      expect(area.color).toBe('#10b981');
    });

    it('should default icon to Folder', async () => {
      const area = await createTestLifeArea(testUser._id, { name: 'Test' });
      expect(area.icon).toBe('Folder');
    });

    it('should accept custom icon', async () => {
      const area = await createTestLifeArea(testUser._id, {
        name: 'Work',
        icon: 'Briefcase',
      });
      expect(area.icon).toBe('Briefcase');
    });

    it('should accept various icon names', async () => {
      const icons = ['Heart', 'Home', 'DollarSign', 'Book', 'Users'];

      for (const icon of icons) {
        const area = await createTestLifeArea(testUser._id, {
          name: `Area with ${icon}`,
          icon,
        });
        expect(area.icon).toBe(icon);
      }
    });
  });

  // ===========================================================================
  // TEST SUITE: ORDER/PRIORITY
  // ===========================================================================

  describe('Order/Priority', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await createTestUser();
    });

    it('should default order to 0', async () => {
      const area = await createTestLifeArea(testUser._id, { name: 'Test' });
      expect(area.order).toBe(0);
    });

    it('should accept custom order values', async () => {
      const area1 = await createTestLifeArea(testUser._id, { name: 'First', order: 0 });
      const area2 = await createTestLifeArea(testUser._id, { name: 'Second', order: 1 });
      const area3 = await createTestLifeArea(testUser._id, { name: 'Third', order: 2 });

      expect(area1.order).toBe(0);
      expect(area2.order).toBe(1);
      expect(area3.order).toBe(2);
    });

    it('should allow negative order values', async () => {
      const area = await createTestLifeArea(testUser._id, { name: 'Test', order: -1 });
      expect(area.order).toBe(-1);
    });

    it('should sort by order when queried', async () => {
      await createTestLifeArea(testUser._id, { name: 'Third', order: 2 });
      await createTestLifeArea(testUser._id, { name: 'First', order: 0 });
      await createTestLifeArea(testUser._id, { name: 'Second', order: 1 });

      const areas = await LifeArea.find({ userId: testUser._id }).sort({ order: 1 });

      expect(areas[0].name).toBe('First');
      expect(areas[1].name).toBe('Second');
      expect(areas[2].name).toBe('Third');
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

    it('should only find life areas for the correct user', async () => {
      await createTestLifeArea(user1._id, { name: 'User 1 Work' });
      await createTestLifeArea(user2._id, { name: 'User 2 Work' });

      const user1Areas = await LifeArea.find({ userId: user1._id });
      const user2Areas = await LifeArea.find({ userId: user2._id });

      expect(user1Areas).toHaveLength(1);
      expect(user1Areas[0].name).toBe('User 1 Work');
      expect(user2Areas).toHaveLength(1);
      expect(user2Areas[0].name).toBe('User 2 Work');
    });

    it('should not return life areas from other users', async () => {
      await createTestLifeArea(user1._id, { name: 'Work' });
      await createTestLifeArea(user1._id, { name: 'Personal' });
      await createTestLifeArea(user2._id, { name: 'Health' });

      const user1Areas = await LifeArea.find({ userId: user1._id });
      expect(user1Areas).toHaveLength(2);
      expect(user1Areas.every(a => a.userId.equals(user1._id))).toBe(true);
    });

    it('should allow same name for different users', async () => {
      const area1 = await createTestLifeArea(user1._id, { name: 'Work' });
      const area2 = await createTestLifeArea(user2._id, { name: 'Work' });

      expect(area1.name).toBe('Work');
      expect(area2.name).toBe('Work');
      expect(area1._id).not.toEqual(area2._id);
    });

    it('should allow each user to have their own default', async () => {
      const area1 = await createTestLifeArea(user1._id, { name: 'Work', isDefault: true });
      const area2 = await createTestLifeArea(user2._id, { name: 'Work', isDefault: true });

      expect(area1.isDefault).toBe(true);
      expect(area2.isDefault).toBe(true);
    });
  });

  // ===========================================================================
  // TEST SUITE: UNIQUE CONSTRAINTS
  // ===========================================================================

  describe('Unique Constraints', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await createTestUser();
    });

    it('should allow only one default life area per user', async () => {
      // Create first default
      await createTestLifeArea(testUser._id, { name: 'Work', isDefault: true });

      // Try to create second default - should fail due to unique partial index
      await expect(
        createTestLifeArea(testUser._id, { name: 'Personal', isDefault: true })
      ).rejects.toThrow(/duplicate key|E11000/i);
    });

    it('should allow multiple non-default life areas per user', async () => {
      await createTestLifeArea(testUser._id, { name: 'Work', isDefault: false });
      await createTestLifeArea(testUser._id, { name: 'Personal', isDefault: false });
      await createTestLifeArea(testUser._id, { name: 'Health', isDefault: false });

      const areas = await LifeArea.find({ userId: testUser._id });
      expect(areas).toHaveLength(3);
    });
  });

  // ===========================================================================
  // TEST SUITE: ARCHIVED STATUS
  // ===========================================================================

  describe('Archived Status', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await createTestUser();
    });

    it('should default isArchived to false', async () => {
      const area = await createTestLifeArea(testUser._id, { name: 'Test' });
      expect(area.isArchived).toBe(false);
    });

    it('should accept isArchived true', async () => {
      const area = await createTestLifeArea(testUser._id, {
        name: 'Archived Area',
        isArchived: true,
      });
      expect(area.isArchived).toBe(true);
    });

    it('should be able to archive and unarchive', async () => {
      const area = await createTestLifeArea(testUser._id, { name: 'Test' });
      expect(area.isArchived).toBe(false);

      area.isArchived = true;
      await area.save();
      expect(area.isArchived).toBe(true);

      area.isArchived = false;
      await area.save();
      expect(area.isArchived).toBe(false);
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
    // getByUser()
    // -------------------------------------------------------------------------
    describe('getByUser()', () => {
      it('should return life areas sorted by order', async () => {
        await createTestLifeArea(testUser._id, { name: 'Third', order: 2 });
        await createTestLifeArea(testUser._id, { name: 'First', order: 0 });
        await createTestLifeArea(testUser._id, { name: 'Second', order: 1 });

        const areas = await LifeArea.getByUser(testUser._id);

        expect(areas).toHaveLength(3);
        expect(areas[0].name).toBe('First');
        expect(areas[1].name).toBe('Second');
        expect(areas[2].name).toBe('Third');
      });

      it('should exclude archived areas by default', async () => {
        await createTestLifeArea(testUser._id, { name: 'Active', isArchived: false });
        await createTestLifeArea(testUser._id, { name: 'Archived', isArchived: true });

        const areas = await LifeArea.getByUser(testUser._id);

        expect(areas).toHaveLength(1);
        expect(areas[0].name).toBe('Active');
      });

      it('should include archived areas when requested', async () => {
        await createTestLifeArea(testUser._id, { name: 'Active', isArchived: false });
        await createTestLifeArea(testUser._id, { name: 'Archived', isArchived: true });

        const areas = await LifeArea.getByUser(testUser._id, true);

        expect(areas).toHaveLength(2);
      });

      it('should return empty array for user with no areas', async () => {
        const areas = await LifeArea.getByUser(testUser._id);
        expect(areas).toEqual([]);
      });
    });

    // -------------------------------------------------------------------------
    // getOrCreateDefault()
    // -------------------------------------------------------------------------
    describe('getOrCreateDefault()', () => {
      it('should create default life area if none exists', async () => {
        const defaultArea = await LifeArea.getOrCreateDefault(testUser._id);

        expect(defaultArea).toBeDefined();
        expect(defaultArea.name).toBe('Work & Career');
        expect(defaultArea.isDefault).toBe(true);
        expect(defaultArea.color).toBe('#3b82f6');
        expect(defaultArea.icon).toBe('Briefcase');
        expect(defaultArea.order).toBe(0);
      });

      it('should return existing default life area', async () => {
        // Create a default area first
        const existingDefault = await createTestLifeArea(testUser._id, {
          name: 'My Default',
          isDefault: true,
        });

        const defaultArea = await LifeArea.getOrCreateDefault(testUser._id);

        expect(defaultArea._id).toEqual(existingDefault._id);
        expect(defaultArea.name).toBe('My Default');
      });

      it('should not create duplicate when called multiple times', async () => {
        await LifeArea.getOrCreateDefault(testUser._id);
        await LifeArea.getOrCreateDefault(testUser._id);

        const areas = await LifeArea.find({ userId: testUser._id, isDefault: true });
        expect(areas).toHaveLength(1);
      });
    });

    // -------------------------------------------------------------------------
    // setDefault()
    // -------------------------------------------------------------------------
    describe('setDefault()', () => {
      it('should set a life area as default', async () => {
        const area = await createTestLifeArea(testUser._id, { name: 'Work' });

        const updated = await LifeArea.setDefault(testUser._id, area._id);

        expect(updated.isDefault).toBe(true);
      });

      it('should unset previous default when setting new default', async () => {
        const area1 = await createTestLifeArea(testUser._id, {
          name: 'Work',
          isDefault: true,
        });
        const area2 = await createTestLifeArea(testUser._id, { name: 'Personal' });

        await LifeArea.setDefault(testUser._id, area2._id);

        const updatedArea1 = await LifeArea.findById(area1._id);
        const updatedArea2 = await LifeArea.findById(area2._id);

        expect(updatedArea1.isDefault).toBe(false);
        expect(updatedArea2.isDefault).toBe(true);
      });

      it('should return null if area not found', async () => {
        const fakeId = new mongoose.Types.ObjectId();
        const result = await LifeArea.setDefault(testUser._id, fakeId);

        expect(result).toBeNull();
      });

      it('should not set default for wrong user', async () => {
        const otherUser = await createTestUser();
        const area = await createTestLifeArea(testUser._id, { name: 'Work' });

        const result = await LifeArea.setDefault(otherUser._id, area._id);

        expect(result).toBeNull();
      });
    });

    // -------------------------------------------------------------------------
    // reorder()
    // -------------------------------------------------------------------------
    describe('reorder()', () => {
      it('should reorder life areas based on provided array', async () => {
        const area1 = await createTestLifeArea(testUser._id, { name: 'First', order: 0 });
        const area2 = await createTestLifeArea(testUser._id, { name: 'Second', order: 1 });
        const area3 = await createTestLifeArea(testUser._id, { name: 'Third', order: 2 });

        // Reverse the order
        await LifeArea.reorder(testUser._id, [area3._id, area2._id, area1._id]);

        const areas = await LifeArea.find({ userId: testUser._id }).sort({ order: 1 });

        expect(areas[0].name).toBe('Third');
        expect(areas[0].order).toBe(0);
        expect(areas[1].name).toBe('Second');
        expect(areas[1].order).toBe(1);
        expect(areas[2].name).toBe('First');
        expect(areas[2].order).toBe(2);
      });

      it('should not affect areas of other users', async () => {
        const otherUser = await createTestUser();
        const otherArea = await createTestLifeArea(otherUser._id, { name: 'Other', order: 5 });
        const myArea = await createTestLifeArea(testUser._id, { name: 'Mine', order: 0 });

        await LifeArea.reorder(testUser._id, [myArea._id]);

        const unchangedArea = await LifeArea.findById(otherArea._id);
        expect(unchangedArea.order).toBe(5);
      });
    });
  });

  // ===========================================================================
  // TEST SUITE: INSTANCE METHODS
  // ===========================================================================

  describe('Instance Methods', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await createTestUser();
    });

    // -------------------------------------------------------------------------
    // toSafeJSON()
    // -------------------------------------------------------------------------
    describe('toSafeJSON()', () => {
      it('should return object without __v field', async () => {
        const area = await createTestLifeArea(testUser._id, {
          name: 'Work',
          description: 'Professional stuff',
        });

        const safeJson = area.toSafeJSON();

        expect(safeJson.__v).toBeUndefined();
        expect(safeJson.name).toBe('Work');
        expect(safeJson.description).toBe('Professional stuff');
      });

      it('should include all relevant fields', async () => {
        const area = await createTestLifeArea(testUser._id, {
          name: 'Health',
          description: 'Fitness and wellness',
          color: '#10b981',
          icon: 'Heart',
          order: 3,
          isDefault: false,
          isArchived: false,
        });

        const safeJson = area.toSafeJSON();

        expect(safeJson._id).toBeDefined();
        expect(safeJson.userId).toBeDefined();
        expect(safeJson.name).toBe('Health');
        expect(safeJson.description).toBe('Fitness and wellness');
        expect(safeJson.color).toBe('#10b981');
        expect(safeJson.icon).toBe('Heart');
        expect(safeJson.order).toBe(3);
        expect(safeJson.isDefault).toBe(false);
        expect(safeJson.isArchived).toBe(false);
        expect(safeJson.createdAt).toBeDefined();
        expect(safeJson.updatedAt).toBeDefined();
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

    it('should create a life area', async () => {
      const area = await createTestLifeArea(testUser._id, {
        name: 'New Area',
        description: 'Description',
        color: '#ef4444',
      });

      expect(area._id).toBeDefined();
      expect(area.name).toBe('New Area');
    });

    it('should read a life area by ID', async () => {
      const created = await createTestLifeArea(testUser._id, { name: 'Find Me' });
      const found = await LifeArea.findById(created._id);

      expect(found).not.toBeNull();
      expect(found.name).toBe('Find Me');
    });

    it('should update a life area', async () => {
      const area = await createTestLifeArea(testUser._id, { name: 'Original' });

      const updated = await LifeArea.findByIdAndUpdate(
        area._id,
        { name: 'Updated', color: '#ef4444' },
        { new: true }
      );

      expect(updated.name).toBe('Updated');
      expect(updated.color).toBe('#ef4444');
    });

    it('should delete a life area', async () => {
      const area = await createTestLifeArea(testUser._id, { name: 'Delete Me' });
      await LifeArea.findByIdAndDelete(area._id);

      const found = await LifeArea.findById(area._id);
      expect(found).toBeNull();
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

    it('should handle empty name after trimming', async () => {
      await expect(
        createTestLifeArea(testUser._id, { name: '   ' })
      ).rejects.toThrow();
    });

    it('should handle special characters in name', async () => {
      const area = await createTestLifeArea(testUser._id, {
        name: 'Work & Career (2026)',
      });
      expect(area.name).toBe('Work & Career (2026)');
    });

    it('should handle unicode in name', async () => {
      const area = await createTestLifeArea(testUser._id, {
        name: 'Santé & Bien-être',
      });
      expect(area.name).toBe('Santé & Bien-être');
    });

    it('should handle emojis in name', async () => {
      const area = await createTestLifeArea(testUser._id, {
        name: 'Health & Fitness',
      });
      expect(area.name).toBe('Health & Fitness');
    });
  });
});
