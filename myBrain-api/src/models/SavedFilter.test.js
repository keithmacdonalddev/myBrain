/**
 * =============================================================================
 * SAVED FILTER MODEL TESTS
 * =============================================================================
 *
 * Comprehensive tests for the SavedFilter model, covering:
 * - Schema validation (required fields, field lengths, enum values)
 * - Default values (filters, sortBy, icon, color)
 * - CRUD operations (create, read, update, delete)
 * - User isolation (users can only access their own filters)
 * - Instance methods (toSafeJSON)
 * - Edge cases (filter structure, complex queries)
 *
 * Uses mongodb-memory-server for real MongoDB behavior without external deps.
 */

import mongoose from 'mongoose';
import SavedFilter from './SavedFilter.js';
import User from './User.js';

// Import test setup for MongoDB Memory Server
import '../test/setup.js';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Creates a test user with sensible defaults.
 * Override any field by passing in the overrides object.
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
 * Creates a saved filter with sensible defaults.
 * Override any field by passing in the overrides object.
 */
async function createTestFilter(userId, overrides = {}) {
  const defaults = {
    userId,
    name: 'Test Filter',
    entityType: 'note',
    filters: {
      q: '',
      status: null,
      tags: [],
      priority: null,
      dueDate: null,
      processed: null,
    },
    sortBy: '-updatedAt',
    icon: 'filter',
    color: null,
  };
  return SavedFilter.create({ ...defaults, ...overrides });
}

// =============================================================================
// TEST SUITE: SCHEMA VALIDATION
// =============================================================================

describe('SavedFilter Model', () => {
  describe('Schema Validation', () => {
    // -------------------------------------------------------------------------
    // Required Fields
    // -------------------------------------------------------------------------
    describe('Required fields', () => {
      it('should require userId', async () => {
        await expect(
          SavedFilter.create({
            name: 'Test Filter',
            entityType: 'note',
          })
        ).rejects.toThrow(/Path `userId` is required/);
      });

      it('should require name', async () => {
        const user = await createTestUser();
        await expect(
          SavedFilter.create({
            userId: user._id,
            entityType: 'note',
          })
        ).rejects.toThrow(/Filter name is required/);
      });

      it('should require entityType', async () => {
        const user = await createTestUser();
        await expect(
          SavedFilter.create({
            userId: user._id,
            name: 'Test Filter',
          })
        ).rejects.toThrow(/Path `entityType` is required/);
      });
    });

    // -------------------------------------------------------------------------
    // Name Validation
    // -------------------------------------------------------------------------
    describe('Name validation', () => {
      it('should trim whitespace from name', async () => {
        const user = await createTestUser();
        const filter = await createTestFilter(user._id, {
          name: '  Work Priorities  ',
        });
        expect(filter.name).toBe('Work Priorities');
      });

      it('should reject name exceeding 50 characters', async () => {
        const user = await createTestUser();
        await expect(
          createTestFilter(user._id, {
            name: 'a'.repeat(51),
          })
        ).rejects.toThrow(/Name cannot exceed 50 characters/);
      });

      it('should accept name at exactly 50 characters', async () => {
        const user = await createTestUser();
        const filter = await createTestFilter(user._id, {
          name: 'a'.repeat(50),
        });
        expect(filter.name).toBe('a'.repeat(50));
      });
    });

    // -------------------------------------------------------------------------
    // EntityType Validation
    // -------------------------------------------------------------------------
    describe('EntityType validation', () => {
      it('should accept note as entityType', async () => {
        const user = await createTestUser();
        const filter = await createTestFilter(user._id, { entityType: 'note' });
        expect(filter.entityType).toBe('note');
      });

      it('should accept task as entityType', async () => {
        const user = await createTestUser();
        const filter = await createTestFilter(user._id, { entityType: 'task' });
        expect(filter.entityType).toBe('task');
      });

      it('should reject invalid entityType', async () => {
        const user = await createTestUser();
        await expect(
          createTestFilter(user._id, { entityType: 'project' })
        ).rejects.toThrow();
      });
    });
  });

  // ===========================================================================
  // TEST SUITE: DEFAULT VALUES
  // ===========================================================================

  describe('Default Values', () => {
    it('should set default filters.q to empty string', async () => {
      const user = await createTestUser();
      const filter = await SavedFilter.create({
        userId: user._id,
        name: 'Test Filter',
        entityType: 'note',
      });
      expect(filter.filters.q).toBe('');
    });

    it('should set default filters.status to null', async () => {
      const user = await createTestUser();
      const filter = await SavedFilter.create({
        userId: user._id,
        name: 'Test Filter',
        entityType: 'note',
      });
      expect(filter.filters.status).toBeNull();
    });

    it('should set default filters.tags to empty array', async () => {
      const user = await createTestUser();
      const filter = await SavedFilter.create({
        userId: user._id,
        name: 'Test Filter',
        entityType: 'note',
      });
      expect(filter.filters.tags).toEqual([]);
    });

    it('should set default filters.priority to null', async () => {
      const user = await createTestUser();
      const filter = await SavedFilter.create({
        userId: user._id,
        name: 'Test Filter',
        entityType: 'note',
      });
      expect(filter.filters.priority).toBeNull();
    });

    it('should set default filters.dueDate to null', async () => {
      const user = await createTestUser();
      const filter = await SavedFilter.create({
        userId: user._id,
        name: 'Test Filter',
        entityType: 'note',
      });
      expect(filter.filters.dueDate).toBeNull();
    });

    it('should set default filters.processed to null', async () => {
      const user = await createTestUser();
      const filter = await SavedFilter.create({
        userId: user._id,
        name: 'Test Filter',
        entityType: 'note',
      });
      expect(filter.filters.processed).toBeNull();
    });

    it('should set default sortBy to -updatedAt', async () => {
      const user = await createTestUser();
      const filter = await SavedFilter.create({
        userId: user._id,
        name: 'Test Filter',
        entityType: 'note',
      });
      expect(filter.sortBy).toBe('-updatedAt');
    });

    it('should set default icon to filter', async () => {
      const user = await createTestUser();
      const filter = await SavedFilter.create({
        userId: user._id,
        name: 'Test Filter',
        entityType: 'note',
      });
      expect(filter.icon).toBe('filter');
    });

    it('should set default color to null', async () => {
      const user = await createTestUser();
      const filter = await SavedFilter.create({
        userId: user._id,
        name: 'Test Filter',
        entityType: 'note',
      });
      expect(filter.color).toBeNull();
    });

    it('should add timestamps (createdAt and updatedAt)', async () => {
      const user = await createTestUser();
      const filter = await createTestFilter(user._id);
      expect(filter.createdAt).toBeInstanceOf(Date);
      expect(filter.updatedAt).toBeInstanceOf(Date);
    });
  });

  // ===========================================================================
  // TEST SUITE: FILTER STRUCTURE
  // ===========================================================================

  describe('Filter Structure', () => {
    it('should store search query in filters.q', async () => {
      const user = await createTestUser();
      const filter = await createTestFilter(user._id, {
        filters: { q: 'meeting notes' },
      });
      expect(filter.filters.q).toBe('meeting notes');
    });

    it('should store status as string', async () => {
      const user = await createTestUser();
      const filter = await createTestFilter(user._id, {
        entityType: 'task',
        filters: { status: 'done' },
      });
      expect(filter.filters.status).toBe('done');
    });

    it('should store status as array (Mixed type)', async () => {
      const user = await createTestUser();
      const filter = await createTestFilter(user._id, {
        entityType: 'task',
        filters: { status: ['todo', 'in_progress'] },
      });
      expect(filter.filters.status).toEqual(['todo', 'in_progress']);
    });

    it('should store tags as array of strings', async () => {
      const user = await createTestUser();
      const filter = await createTestFilter(user._id, {
        filters: { tags: ['work', 'urgent'] },
      });
      expect(filter.filters.tags).toEqual(['work', 'urgent']);
    });

    it('should store priority string', async () => {
      const user = await createTestUser();
      const filter = await createTestFilter(user._id, {
        entityType: 'task',
        filters: { priority: 'high' },
      });
      expect(filter.filters.priority).toBe('high');
    });

    it('should store dueDate as string (e.g., overdue)', async () => {
      const user = await createTestUser();
      const filter = await createTestFilter(user._id, {
        entityType: 'task',
        filters: { dueDate: 'overdue' },
      });
      expect(filter.filters.dueDate).toBe('overdue');
    });

    it('should store dueDate as object with date range (Mixed type)', async () => {
      const user = await createTestUser();
      const dateObj = { $lte: new Date() };
      const filter = await createTestFilter(user._id, {
        entityType: 'task',
        filters: { dueDate: dateObj },
      });
      expect(filter.filters.dueDate.$lte).toBeDefined();
    });

    it('should store processed as boolean', async () => {
      const user = await createTestUser();
      const filter = await createTestFilter(user._id, {
        entityType: 'note',
        filters: { processed: true },
      });
      expect(filter.filters.processed).toBe(true);
    });

    it('should store custom sortBy value', async () => {
      const user = await createTestUser();
      const filter = await createTestFilter(user._id, {
        sortBy: 'dueDate',
      });
      expect(filter.sortBy).toBe('dueDate');
    });

    it('should store custom icon', async () => {
      const user = await createTestUser();
      const filter = await createTestFilter(user._id, {
        icon: 'star',
      });
      expect(filter.icon).toBe('star');
    });

    it('should store custom color', async () => {
      const user = await createTestUser();
      const filter = await createTestFilter(user._id, {
        color: '#ff0000',
      });
      expect(filter.color).toBe('#ff0000');
    });
  });

  // ===========================================================================
  // TEST SUITE: CRUD OPERATIONS
  // ===========================================================================

  describe('CRUD Operations', () => {
    describe('Create', () => {
      it('should create a saved filter with minimal required fields', async () => {
        const user = await createTestUser();
        const filter = await SavedFilter.create({
          userId: user._id,
          name: 'My Filter',
          entityType: 'note',
        });

        expect(filter._id).toBeDefined();
        expect(filter.userId.toString()).toBe(user._id.toString());
        expect(filter.name).toBe('My Filter');
        expect(filter.entityType).toBe('note');
      });

      it('should create a saved filter with all fields specified', async () => {
        const user = await createTestUser();
        const filter = await SavedFilter.create({
          userId: user._id,
          name: 'Complete Filter',
          entityType: 'task',
          filters: {
            q: 'search term',
            status: 'in_progress',
            tags: ['urgent', 'work'],
            priority: 'high',
            dueDate: 'today',
            processed: null,
          },
          sortBy: '-priority',
          icon: 'flag',
          color: '#blue',
        });

        expect(filter.filters.q).toBe('search term');
        expect(filter.filters.status).toBe('in_progress');
        expect(filter.filters.tags).toEqual(['urgent', 'work']);
        expect(filter.filters.priority).toBe('high');
        expect(filter.sortBy).toBe('-priority');
        expect(filter.icon).toBe('flag');
        expect(filter.color).toBe('#blue');
      });
    });

    describe('Read', () => {
      it('should find a saved filter by ID', async () => {
        const user = await createTestUser();
        const created = await createTestFilter(user._id, { name: 'Find Me' });

        const found = await SavedFilter.findById(created._id);
        expect(found.name).toBe('Find Me');
      });

      it('should find all filters for a user', async () => {
        const user = await createTestUser();
        await createTestFilter(user._id, { name: 'Filter 1' });
        await createTestFilter(user._id, { name: 'Filter 2' });
        await createTestFilter(user._id, { name: 'Filter 3' });

        const filters = await SavedFilter.find({ userId: user._id });
        expect(filters.length).toBe(3);
      });

      it('should find filters by entityType', async () => {
        const user = await createTestUser();
        await createTestFilter(user._id, { name: 'Note Filter', entityType: 'note' });
        await createTestFilter(user._id, { name: 'Task Filter', entityType: 'task' });

        const noteFilters = await SavedFilter.find({ userId: user._id, entityType: 'note' });
        const taskFilters = await SavedFilter.find({ userId: user._id, entityType: 'task' });

        expect(noteFilters.length).toBe(1);
        expect(noteFilters[0].name).toBe('Note Filter');
        expect(taskFilters.length).toBe(1);
        expect(taskFilters[0].name).toBe('Task Filter');
      });
    });

    describe('Update', () => {
      it('should update filter name', async () => {
        const user = await createTestUser();
        const filter = await createTestFilter(user._id, { name: 'Old Name' });

        filter.name = 'New Name';
        await filter.save();

        const updated = await SavedFilter.findById(filter._id);
        expect(updated.name).toBe('New Name');
      });

      it('should update filter criteria', async () => {
        const user = await createTestUser();
        const filter = await createTestFilter(user._id);

        filter.filters.q = 'updated search';
        filter.filters.tags = ['new', 'tags'];
        await filter.save();

        const updated = await SavedFilter.findById(filter._id);
        expect(updated.filters.q).toBe('updated search');
        expect(updated.filters.tags).toEqual(['new', 'tags']);
      });

      it('should update using findByIdAndUpdate', async () => {
        const user = await createTestUser();
        const filter = await createTestFilter(user._id, { sortBy: '-updatedAt' });

        const updated = await SavedFilter.findByIdAndUpdate(
          filter._id,
          { sortBy: 'createdAt', icon: 'star' },
          { new: true }
        );

        expect(updated.sortBy).toBe('createdAt');
        expect(updated.icon).toBe('star');
      });

      it('should update updatedAt timestamp on save', async () => {
        const user = await createTestUser();
        const filter = await createTestFilter(user._id);
        const originalUpdatedAt = filter.updatedAt;

        // Wait a small amount to ensure timestamp difference
        await new Promise(resolve => setTimeout(resolve, 10));

        filter.name = 'Updated Name';
        await filter.save();

        expect(filter.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
      });
    });

    describe('Delete', () => {
      it('should delete a filter by ID', async () => {
        const user = await createTestUser();
        const filter = await createTestFilter(user._id);

        await SavedFilter.findByIdAndDelete(filter._id);

        const found = await SavedFilter.findById(filter._id);
        expect(found).toBeNull();
      });

      it('should delete multiple filters for a user', async () => {
        const user = await createTestUser();
        await createTestFilter(user._id, { name: 'Filter 1' });
        await createTestFilter(user._id, { name: 'Filter 2' });

        await SavedFilter.deleteMany({ userId: user._id });

        const remaining = await SavedFilter.find({ userId: user._id });
        expect(remaining.length).toBe(0);
      });
    });
  });

  // ===========================================================================
  // TEST SUITE: USER ISOLATION
  // ===========================================================================

  describe('User Isolation', () => {
    it('should not return filters belonging to other users', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();

      await createTestFilter(user1._id, { name: 'User1 Filter' });
      await createTestFilter(user2._id, { name: 'User2 Filter' });

      const user1Filters = await SavedFilter.find({ userId: user1._id });
      const user2Filters = await SavedFilter.find({ userId: user2._id });

      expect(user1Filters.length).toBe(1);
      expect(user1Filters[0].name).toBe('User1 Filter');
      expect(user2Filters.length).toBe(1);
      expect(user2Filters[0].name).toBe('User2 Filter');
    });

    it('should allow same filter name for different users', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();

      const filter1 = await createTestFilter(user1._id, { name: 'Work Tasks' });
      const filter2 = await createTestFilter(user2._id, { name: 'Work Tasks' });

      expect(filter1.name).toBe('Work Tasks');
      expect(filter2.name).toBe('Work Tasks');
      expect(filter1._id.toString()).not.toBe(filter2._id.toString());
    });

    it('should correctly count filters per user', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();

      await createTestFilter(user1._id, { name: 'Filter 1' });
      await createTestFilter(user1._id, { name: 'Filter 2' });
      await createTestFilter(user1._id, { name: 'Filter 3' });
      await createTestFilter(user2._id, { name: 'Filter A' });

      const user1Count = await SavedFilter.countDocuments({ userId: user1._id });
      const user2Count = await SavedFilter.countDocuments({ userId: user2._id });

      expect(user1Count).toBe(3);
      expect(user2Count).toBe(1);
    });
  });

  // ===========================================================================
  // TEST SUITE: INSTANCE METHODS
  // ===========================================================================

  describe('Instance Methods', () => {
    describe('toSafeJSON()', () => {
      it('should return an object without __v field', async () => {
        const user = await createTestUser();
        const filter = await createTestFilter(user._id);

        const safeJson = filter.toSafeJSON();

        expect(safeJson.__v).toBeUndefined();
      });

      it('should include all essential fields', async () => {
        const user = await createTestUser();
        const filter = await createTestFilter(user._id, {
          name: 'Test Filter',
          entityType: 'task',
          filters: { q: 'search', priority: 'high' },
          sortBy: '-priority',
          icon: 'flag',
          color: '#red',
        });

        const safeJson = filter.toSafeJSON();

        expect(safeJson._id).toBeDefined();
        expect(safeJson.userId).toBeDefined();
        expect(safeJson.name).toBe('Test Filter');
        expect(safeJson.entityType).toBe('task');
        expect(safeJson.filters.q).toBe('search');
        expect(safeJson.filters.priority).toBe('high');
        expect(safeJson.sortBy).toBe('-priority');
        expect(safeJson.icon).toBe('flag');
        expect(safeJson.color).toBe('#red');
        expect(safeJson.createdAt).toBeDefined();
        expect(safeJson.updatedAt).toBeDefined();
      });
    });
  });

  // ===========================================================================
  // TEST SUITE: INDEXES
  // ===========================================================================

  describe('Indexes', () => {
    it('should efficiently query by userId and entityType (compound index)', async () => {
      const user = await createTestUser();
      await createTestFilter(user._id, { entityType: 'note', name: 'Note 1' });
      await createTestFilter(user._id, { entityType: 'note', name: 'Note 2' });
      await createTestFilter(user._id, { entityType: 'task', name: 'Task 1' });

      // This query uses the compound index { userId: 1, entityType: 1 }
      const noteFilters = await SavedFilter.find({
        userId: user._id,
        entityType: 'note',
      });

      expect(noteFilters.length).toBe(2);
    });
  });

  // ===========================================================================
  // TEST SUITE: EDGE CASES
  // ===========================================================================

  describe('Edge Cases', () => {
    it('should handle empty filters object', async () => {
      const user = await createTestUser();
      const filter = await SavedFilter.create({
        userId: user._id,
        name: 'Empty Filter',
        entityType: 'note',
        filters: {},
      });

      // Empty object should get defaults applied
      expect(filter.filters.q).toBe('');
      expect(filter.filters.tags).toEqual([]);
    });

    it('should handle filter with all criteria set', async () => {
      const user = await createTestUser();
      const filter = await createTestFilter(user._id, {
        entityType: 'task',
        filters: {
          q: 'urgent meeting',
          status: 'todo',
          tags: ['work', 'urgent', 'meeting'],
          priority: 'high',
          dueDate: 'today',
          processed: false,
        },
      });

      expect(filter.filters.q).toBe('urgent meeting');
      expect(filter.filters.status).toBe('todo');
      expect(filter.filters.tags.length).toBe(3);
      expect(filter.filters.priority).toBe('high');
      expect(filter.filters.dueDate).toBe('today');
      expect(filter.filters.processed).toBe(false);
    });

    it('should handle filter with empty tags array', async () => {
      const user = await createTestUser();
      const filter = await createTestFilter(user._id, {
        filters: { tags: [] },
      });
      expect(filter.filters.tags).toEqual([]);
    });

    it('should handle special characters in filter name', async () => {
      const user = await createTestUser();
      const filter = await createTestFilter(user._id, {
        name: 'Work & Personal - Tasks (2024)',
      });
      expect(filter.name).toBe('Work & Personal - Tasks (2024)');
    });

    it('should handle unicode characters in search query', async () => {
      const user = await createTestUser();
      const filter = await createTestFilter(user._id, {
        filters: { q: '会议笔记 Meeting Notes' },
      });
      expect(filter.filters.q).toBe('会议笔记 Meeting Notes');
    });
  });
});
