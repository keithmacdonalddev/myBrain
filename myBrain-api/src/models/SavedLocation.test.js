/**
 * =============================================================================
 * SAVED LOCATION MODEL TESTS
 * =============================================================================
 *
 * Comprehensive tests for the SavedLocation model, covering:
 * - Schema validation (required fields, field lengths, enum values)
 * - Default values (category, order, isDefault, coordinates)
 * - Coordinate validation (latitude and longitude ranges)
 * - Default location flag (only one per user)
 * - CRUD operations (create, read, update, delete)
 * - User isolation (users can only access their own locations)
 * - Static methods (getUserLocations, setDefault, reorder)
 * - Instance methods (toSafeJSON)
 * - Edge cases
 *
 * Uses mongodb-memory-server for real MongoDB behavior without external deps.
 */

import mongoose from 'mongoose';
import SavedLocation from './SavedLocation.js';
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
 * Creates a saved location with sensible defaults.
 * Override any field by passing in the overrides object.
 */
async function createTestLocation(userId, overrides = {}) {
  const defaults = {
    userId,
    name: 'Test Location',
    address: '123 Test Street, Test City, TS 12345',
    category: 'other',
    order: 0,
    isDefault: false,
  };
  return SavedLocation.create({ ...defaults, ...overrides });
}

// =============================================================================
// TEST SUITE: SCHEMA VALIDATION
// =============================================================================

describe('SavedLocation Model', () => {
  describe('Schema Validation', () => {
    // -------------------------------------------------------------------------
    // Required Fields
    // -------------------------------------------------------------------------
    describe('Required fields', () => {
      it('should require userId', async () => {
        await expect(
          SavedLocation.create({
            name: 'Home',
            address: '123 Main St',
          })
        ).rejects.toThrow(/Path `userId` is required/);
      });

      it('should require name', async () => {
        const user = await createTestUser();
        await expect(
          SavedLocation.create({
            userId: user._id,
            address: '123 Main St',
          })
        ).rejects.toThrow(/Location name is required/);
      });

      it('should require address', async () => {
        const user = await createTestUser();
        await expect(
          SavedLocation.create({
            userId: user._id,
            name: 'Home',
          })
        ).rejects.toThrow(/Address is required/);
      });
    });

    // -------------------------------------------------------------------------
    // Name Validation
    // -------------------------------------------------------------------------
    describe('Name validation', () => {
      it('should trim whitespace from name', async () => {
        const user = await createTestUser();
        const location = await createTestLocation(user._id, {
          name: '  Home  ',
        });
        expect(location.name).toBe('Home');
      });

      it('should reject name exceeding 100 characters', async () => {
        const user = await createTestUser();
        await expect(
          createTestLocation(user._id, {
            name: 'a'.repeat(101),
          })
        ).rejects.toThrow(/Name cannot exceed 100 characters/);
      });

      it('should accept name at exactly 100 characters', async () => {
        const user = await createTestUser();
        const location = await createTestLocation(user._id, {
          name: 'a'.repeat(100),
        });
        expect(location.name).toBe('a'.repeat(100));
      });
    });

    // -------------------------------------------------------------------------
    // Address Validation
    // -------------------------------------------------------------------------
    describe('Address validation', () => {
      it('should trim whitespace from address', async () => {
        const user = await createTestUser();
        const location = await createTestLocation(user._id, {
          address: '  123 Main Street  ',
        });
        expect(location.address).toBe('123 Main Street');
      });

      it('should reject address exceeding 500 characters', async () => {
        const user = await createTestUser();
        await expect(
          createTestLocation(user._id, {
            address: 'a'.repeat(501),
          })
        ).rejects.toThrow(/Address cannot exceed 500 characters/);
      });

      it('should accept address at exactly 500 characters', async () => {
        const user = await createTestUser();
        const location = await createTestLocation(user._id, {
          address: 'a'.repeat(500),
        });
        expect(location.address).toBe('a'.repeat(500));
      });
    });

    // -------------------------------------------------------------------------
    // Category Validation
    // -------------------------------------------------------------------------
    describe('Category validation', () => {
      it('should accept home as category', async () => {
        const user = await createTestUser();
        const location = await createTestLocation(user._id, { category: 'home' });
        expect(location.category).toBe('home');
      });

      it('should accept work as category', async () => {
        const user = await createTestUser();
        const location = await createTestLocation(user._id, { category: 'work' });
        expect(location.category).toBe('work');
      });

      it('should accept other as category', async () => {
        const user = await createTestUser();
        const location = await createTestLocation(user._id, { category: 'other' });
        expect(location.category).toBe('other');
      });

      it('should reject invalid category', async () => {
        const user = await createTestUser();
        await expect(
          createTestLocation(user._id, { category: 'gym' })
        ).rejects.toThrow();
      });
    });
  });

  // ===========================================================================
  // TEST SUITE: DEFAULT VALUES
  // ===========================================================================

  describe('Default Values', () => {
    it('should set default category to other', async () => {
      const user = await createTestUser();
      const location = await SavedLocation.create({
        userId: user._id,
        name: 'Test',
        address: '123 Test St',
      });
      expect(location.category).toBe('other');
    });

    it('should set default order to 0', async () => {
      const user = await createTestUser();
      const location = await SavedLocation.create({
        userId: user._id,
        name: 'Test',
        address: '123 Test St',
      });
      expect(location.order).toBe(0);
    });

    it('should set default isDefault to false', async () => {
      const user = await createTestUser();
      const location = await SavedLocation.create({
        userId: user._id,
        name: 'Test',
        address: '123 Test St',
      });
      expect(location.isDefault).toBe(false);
    });

    it('should set default coordinates.lat to null', async () => {
      const user = await createTestUser();
      const location = await SavedLocation.create({
        userId: user._id,
        name: 'Test',
        address: '123 Test St',
      });
      expect(location.coordinates.lat).toBeNull();
    });

    it('should set default coordinates.lon to null', async () => {
      const user = await createTestUser();
      const location = await SavedLocation.create({
        userId: user._id,
        name: 'Test',
        address: '123 Test St',
      });
      expect(location.coordinates.lon).toBeNull();
    });

    it('should add timestamps (createdAt and updatedAt)', async () => {
      const user = await createTestUser();
      const location = await createTestLocation(user._id);
      expect(location.createdAt).toBeInstanceOf(Date);
      expect(location.updatedAt).toBeInstanceOf(Date);
    });
  });

  // ===========================================================================
  // TEST SUITE: COORDINATE VALIDATION
  // ===========================================================================

  describe('Coordinate Validation', () => {
    it('should store valid latitude', async () => {
      const user = await createTestUser();
      const location = await createTestLocation(user._id, {
        coordinates: { lat: 40.7128, lon: -74.0060 },
      });
      expect(location.coordinates.lat).toBe(40.7128);
    });

    it('should store valid longitude', async () => {
      const user = await createTestUser();
      const location = await createTestLocation(user._id, {
        coordinates: { lat: 40.7128, lon: -74.0060 },
      });
      expect(location.coordinates.lon).toBe(-74.0060);
    });

    it('should accept latitude at boundary -90', async () => {
      const user = await createTestUser();
      const location = await createTestLocation(user._id, {
        coordinates: { lat: -90, lon: 0 },
      });
      expect(location.coordinates.lat).toBe(-90);
    });

    it('should accept latitude at boundary 90', async () => {
      const user = await createTestUser();
      const location = await createTestLocation(user._id, {
        coordinates: { lat: 90, lon: 0 },
      });
      expect(location.coordinates.lat).toBe(90);
    });

    it('should accept longitude at boundary -180', async () => {
      const user = await createTestUser();
      const location = await createTestLocation(user._id, {
        coordinates: { lat: 0, lon: -180 },
      });
      expect(location.coordinates.lon).toBe(-180);
    });

    it('should accept longitude at boundary 180', async () => {
      const user = await createTestUser();
      const location = await createTestLocation(user._id, {
        coordinates: { lat: 0, lon: 180 },
      });
      expect(location.coordinates.lon).toBe(180);
    });

    it('should accept 0,0 coordinates (Null Island)', async () => {
      const user = await createTestUser();
      const location = await createTestLocation(user._id, {
        coordinates: { lat: 0, lon: 0 },
      });
      expect(location.coordinates.lat).toBe(0);
      expect(location.coordinates.lon).toBe(0);
    });

    it('should allow partial coordinates (only lat)', async () => {
      const user = await createTestUser();
      const location = await createTestLocation(user._id, {
        coordinates: { lat: 40.7128 },
      });
      expect(location.coordinates.lat).toBe(40.7128);
      expect(location.coordinates.lon).toBeNull();
    });

    it('should allow partial coordinates (only lon)', async () => {
      const user = await createTestUser();
      const location = await createTestLocation(user._id, {
        coordinates: { lon: -74.0060 },
      });
      expect(location.coordinates.lat).toBeNull();
      expect(location.coordinates.lon).toBe(-74.0060);
    });
  });

  // ===========================================================================
  // TEST SUITE: DEFAULT LOCATION FLAG
  // ===========================================================================

  describe('Default Location Flag', () => {
    it('should allow setting isDefault to true', async () => {
      const user = await createTestUser();
      const location = await createTestLocation(user._id, { isDefault: true });
      expect(location.isDefault).toBe(true);
    });

    it('should allow multiple non-default locations', async () => {
      const user = await createTestUser();
      await createTestLocation(user._id, { name: 'Location 1', isDefault: false });
      await createTestLocation(user._id, { name: 'Location 2', isDefault: false });
      await createTestLocation(user._id, { name: 'Location 3', isDefault: false });

      const locations = await SavedLocation.find({ userId: user._id });
      expect(locations.length).toBe(3);
      expect(locations.every(loc => loc.isDefault === false)).toBe(true);
    });

    it('should enforce unique default per user via index', async () => {
      const user = await createTestUser();
      await createTestLocation(user._id, { name: 'Default 1', isDefault: true });

      // The partial unique index should prevent this
      await expect(
        createTestLocation(user._id, { name: 'Default 2', isDefault: true })
      ).rejects.toThrow(/duplicate key/i);
    });

    it('should allow different users to each have a default', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();

      const loc1 = await createTestLocation(user1._id, { name: 'User1 Default', isDefault: true });
      const loc2 = await createTestLocation(user2._id, { name: 'User2 Default', isDefault: true });

      expect(loc1.isDefault).toBe(true);
      expect(loc2.isDefault).toBe(true);
    });
  });

  // ===========================================================================
  // TEST SUITE: CRUD OPERATIONS
  // ===========================================================================

  describe('CRUD Operations', () => {
    describe('Create', () => {
      it('should create a location with minimal required fields', async () => {
        const user = await createTestUser();
        const location = await SavedLocation.create({
          userId: user._id,
          name: 'Home',
          address: '123 Main St, City, ST 12345',
        });

        expect(location._id).toBeDefined();
        expect(location.userId.toString()).toBe(user._id.toString());
        expect(location.name).toBe('Home');
        expect(location.address).toBe('123 Main St, City, ST 12345');
      });

      it('should create a location with all fields specified', async () => {
        const user = await createTestUser();
        const location = await SavedLocation.create({
          userId: user._id,
          name: 'Office',
          address: '456 Business Ave, City, ST 67890',
          coordinates: { lat: 40.7128, lon: -74.0060 },
          category: 'work',
          order: 1,
          isDefault: true,
        });

        expect(location.name).toBe('Office');
        expect(location.address).toBe('456 Business Ave, City, ST 67890');
        expect(location.coordinates.lat).toBe(40.7128);
        expect(location.coordinates.lon).toBe(-74.0060);
        expect(location.category).toBe('work');
        expect(location.order).toBe(1);
        expect(location.isDefault).toBe(true);
      });
    });

    describe('Read', () => {
      it('should find a location by ID', async () => {
        const user = await createTestUser();
        const created = await createTestLocation(user._id, { name: 'Find Me' });

        const found = await SavedLocation.findById(created._id);
        expect(found.name).toBe('Find Me');
      });

      it('should find all locations for a user', async () => {
        const user = await createTestUser();
        await createTestLocation(user._id, { name: 'Location 1', order: 0 });
        await createTestLocation(user._id, { name: 'Location 2', order: 1 });
        await createTestLocation(user._id, { name: 'Location 3', order: 2 });

        const locations = await SavedLocation.find({ userId: user._id });
        expect(locations.length).toBe(3);
      });

      it('should find locations by category', async () => {
        const user = await createTestUser();
        await createTestLocation(user._id, { name: 'Home 1', category: 'home' });
        await createTestLocation(user._id, { name: 'Work 1', category: 'work' });
        await createTestLocation(user._id, { name: 'Gym', category: 'other' });

        const homeLocations = await SavedLocation.find({ userId: user._id, category: 'home' });
        expect(homeLocations.length).toBe(1);
        expect(homeLocations[0].name).toBe('Home 1');
      });
    });

    describe('Update', () => {
      it('should update location name', async () => {
        const user = await createTestUser();
        const location = await createTestLocation(user._id, { name: 'Old Name' });

        location.name = 'New Name';
        await location.save();

        const updated = await SavedLocation.findById(location._id);
        expect(updated.name).toBe('New Name');
      });

      it('should update location address', async () => {
        const user = await createTestUser();
        const location = await createTestLocation(user._id, { address: 'Old Address' });

        location.address = 'New Address, New City, NS 99999';
        await location.save();

        const updated = await SavedLocation.findById(location._id);
        expect(updated.address).toBe('New Address, New City, NS 99999');
      });

      it('should update coordinates', async () => {
        const user = await createTestUser();
        const location = await createTestLocation(user._id);

        location.coordinates = { lat: 51.5074, lon: -0.1278 }; // London
        await location.save();

        const updated = await SavedLocation.findById(location._id);
        expect(updated.coordinates.lat).toBe(51.5074);
        expect(updated.coordinates.lon).toBe(-0.1278);
      });

      it('should update using findByIdAndUpdate', async () => {
        const user = await createTestUser();
        const location = await createTestLocation(user._id, { category: 'other' });

        const updated = await SavedLocation.findByIdAndUpdate(
          location._id,
          { category: 'work', order: 5 },
          { new: true }
        );

        expect(updated.category).toBe('work');
        expect(updated.order).toBe(5);
      });

      it('should update updatedAt timestamp on save', async () => {
        const user = await createTestUser();
        const location = await createTestLocation(user._id);
        const originalUpdatedAt = location.updatedAt;

        // Wait a small amount to ensure timestamp difference
        await new Promise(resolve => setTimeout(resolve, 10));

        location.name = 'Updated Name';
        await location.save();

        expect(location.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
      });
    });

    describe('Delete', () => {
      it('should delete a location by ID', async () => {
        const user = await createTestUser();
        const location = await createTestLocation(user._id);

        await SavedLocation.findByIdAndDelete(location._id);

        const found = await SavedLocation.findById(location._id);
        expect(found).toBeNull();
      });

      it('should delete multiple locations for a user', async () => {
        const user = await createTestUser();
        await createTestLocation(user._id, { name: 'Location 1' });
        await createTestLocation(user._id, { name: 'Location 2' });

        await SavedLocation.deleteMany({ userId: user._id });

        const remaining = await SavedLocation.find({ userId: user._id });
        expect(remaining.length).toBe(0);
      });
    });
  });

  // ===========================================================================
  // TEST SUITE: USER ISOLATION
  // ===========================================================================

  describe('User Isolation', () => {
    it('should not return locations belonging to other users', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();

      await createTestLocation(user1._id, { name: 'User1 Home' });
      await createTestLocation(user2._id, { name: 'User2 Home' });

      const user1Locations = await SavedLocation.find({ userId: user1._id });
      const user2Locations = await SavedLocation.find({ userId: user2._id });

      expect(user1Locations.length).toBe(1);
      expect(user1Locations[0].name).toBe('User1 Home');
      expect(user2Locations.length).toBe(1);
      expect(user2Locations[0].name).toBe('User2 Home');
    });

    it('should allow same location name for different users', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();

      const loc1 = await createTestLocation(user1._id, { name: 'Home' });
      const loc2 = await createTestLocation(user2._id, { name: 'Home' });

      expect(loc1.name).toBe('Home');
      expect(loc2.name).toBe('Home');
      expect(loc1._id.toString()).not.toBe(loc2._id.toString());
    });

    it('should correctly count locations per user', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();

      await createTestLocation(user1._id, { name: 'Home', order: 0 });
      await createTestLocation(user1._id, { name: 'Office', order: 1 });
      await createTestLocation(user1._id, { name: 'Gym', order: 2 });
      await createTestLocation(user2._id, { name: 'Home' });

      const user1Count = await SavedLocation.countDocuments({ userId: user1._id });
      const user2Count = await SavedLocation.countDocuments({ userId: user2._id });

      expect(user1Count).toBe(3);
      expect(user2Count).toBe(1);
    });
  });

  // ===========================================================================
  // TEST SUITE: STATIC METHODS
  // ===========================================================================

  describe('Static Methods', () => {
    describe('getUserLocations()', () => {
      it('should return empty array for user with no locations', async () => {
        const user = await createTestUser();
        const locations = await SavedLocation.getUserLocations(user._id);
        expect(locations).toEqual([]);
      });

      it('should return locations sorted by order ascending', async () => {
        const user = await createTestUser();
        await createTestLocation(user._id, { name: 'Third', order: 2 });
        await createTestLocation(user._id, { name: 'First', order: 0 });
        await createTestLocation(user._id, { name: 'Second', order: 1 });

        const locations = await SavedLocation.getUserLocations(user._id);

        expect(locations[0].name).toBe('First');
        expect(locations[1].name).toBe('Second');
        expect(locations[2].name).toBe('Third');
      });

      it('should sort by createdAt as tiebreaker for same order', async () => {
        const user = await createTestUser();

        // Create with same order but different times
        await createTestLocation(user._id, { name: 'Older', order: 0 });
        await new Promise(resolve => setTimeout(resolve, 10));
        await createTestLocation(user._id, { name: 'Newer', order: 0 });

        const locations = await SavedLocation.getUserLocations(user._id);

        // Newer should come first (-1 sort on createdAt)
        expect(locations[0].name).toBe('Newer');
        expect(locations[1].name).toBe('Older');
      });

      it('should only return locations for specified user', async () => {
        const user1 = await createTestUser();
        const user2 = await createTestUser();

        await createTestLocation(user1._id, { name: 'User1 Location' });
        await createTestLocation(user2._id, { name: 'User2 Location' });

        const user1Locations = await SavedLocation.getUserLocations(user1._id);

        expect(user1Locations.length).toBe(1);
        expect(user1Locations[0].name).toBe('User1 Location');
      });
    });

    describe('setDefault()', () => {
      it('should set a location as default', async () => {
        const user = await createTestUser();
        const location = await createTestLocation(user._id, { isDefault: false });

        const updated = await SavedLocation.setDefault(user._id, location._id);

        expect(updated.isDefault).toBe(true);
      });

      it('should remove default from other locations when setting new default', async () => {
        const user = await createTestUser();
        const oldDefault = await createTestLocation(user._id, { name: 'Old Default', isDefault: true });
        const newDefault = await createTestLocation(user._id, { name: 'New Default', isDefault: false });

        await SavedLocation.setDefault(user._id, newDefault._id);

        const updatedOld = await SavedLocation.findById(oldDefault._id);
        const updatedNew = await SavedLocation.findById(newDefault._id);

        expect(updatedOld.isDefault).toBe(false);
        expect(updatedNew.isDefault).toBe(true);
      });

      it('should only affect the specified user locations', async () => {
        const user1 = await createTestUser();
        const user2 = await createTestUser();

        const user1Default = await createTestLocation(user1._id, { name: 'User1 Default', isDefault: true });
        const user2Location = await createTestLocation(user2._id, { name: 'User2 Location', isDefault: false });

        // Set user2's location as default
        await SavedLocation.setDefault(user2._id, user2Location._id);

        // User1's default should be unchanged
        const user1Updated = await SavedLocation.findById(user1Default._id);
        expect(user1Updated.isDefault).toBe(true);
      });

      it('should return the updated location', async () => {
        const user = await createTestUser();
        const location = await createTestLocation(user._id);

        const result = await SavedLocation.setDefault(user._id, location._id);

        expect(result._id.toString()).toBe(location._id.toString());
        expect(result.isDefault).toBe(true);
      });
    });

    describe('reorder()', () => {
      it('should reorder locations based on provided array', async () => {
        const user = await createTestUser();
        const loc1 = await createTestLocation(user._id, { name: 'First', order: 0 });
        const loc2 = await createTestLocation(user._id, { name: 'Second', order: 1 });
        const loc3 = await createTestLocation(user._id, { name: 'Third', order: 2 });

        // Reorder: Third, First, Second
        const newOrder = [loc3._id, loc1._id, loc2._id];
        const reordered = await SavedLocation.reorder(user._id, newOrder);

        expect(reordered[0].name).toBe('Third');
        expect(reordered[0].order).toBe(0);
        expect(reordered[1].name).toBe('First');
        expect(reordered[1].order).toBe(1);
        expect(reordered[2].name).toBe('Second');
        expect(reordered[2].order).toBe(2);
      });

      it('should only affect specified user locations', async () => {
        const user1 = await createTestUser();
        const user2 = await createTestUser();

        const loc1 = await createTestLocation(user1._id, { name: 'User1 Loc', order: 0 });
        const loc2 = await createTestLocation(user2._id, { name: 'User2 Loc', order: 0 });

        // Try to reorder with user2's location ID but user1's userId
        // Should not affect user2's location since filter checks userId
        await SavedLocation.reorder(user1._id, [loc1._id]);

        const user2Loc = await SavedLocation.findById(loc2._id);
        expect(user2Loc.order).toBe(0); // Unchanged
      });

      it('should return reordered locations via getUserLocations', async () => {
        const user = await createTestUser();
        const loc1 = await createTestLocation(user._id, { name: 'A', order: 0 });
        const loc2 = await createTestLocation(user._id, { name: 'B', order: 1 });

        const result = await SavedLocation.reorder(user._id, [loc2._id, loc1._id]);

        // Should be sorted by order
        expect(result[0].name).toBe('B');
        expect(result[1].name).toBe('A');
      });
    });
  });

  // ===========================================================================
  // TEST SUITE: INSTANCE METHODS
  // ===========================================================================

  describe('Instance Methods', () => {
    describe('toSafeJSON()', () => {
      it('should return an object without __v field', async () => {
        const user = await createTestUser();
        const location = await createTestLocation(user._id);

        const safeJson = location.toSafeJSON();

        expect(safeJson.__v).toBeUndefined();
      });

      it('should include all essential fields', async () => {
        const user = await createTestUser();
        const location = await createTestLocation(user._id, {
          name: 'Test Location',
          address: '123 Test St, Test City, TS 12345',
          coordinates: { lat: 40.7128, lon: -74.0060 },
          category: 'home',
          order: 1,
          isDefault: true,
        });

        const safeJson = location.toSafeJSON();

        expect(safeJson._id).toBeDefined();
        expect(safeJson.userId).toBeDefined();
        expect(safeJson.name).toBe('Test Location');
        expect(safeJson.address).toBe('123 Test St, Test City, TS 12345');
        expect(safeJson.coordinates.lat).toBe(40.7128);
        expect(safeJson.coordinates.lon).toBe(-74.0060);
        expect(safeJson.category).toBe('home');
        expect(safeJson.order).toBe(1);
        expect(safeJson.isDefault).toBe(true);
        expect(safeJson.createdAt).toBeDefined();
        expect(safeJson.updatedAt).toBeDefined();
      });
    });
  });

  // ===========================================================================
  // TEST SUITE: INDEXES
  // ===========================================================================

  describe('Indexes', () => {
    it('should efficiently query by userId and order (compound index)', async () => {
      const user = await createTestUser();
      await createTestLocation(user._id, { name: 'Loc 1', order: 0 });
      await createTestLocation(user._id, { name: 'Loc 2', order: 1 });
      await createTestLocation(user._id, { name: 'Loc 3', order: 2 });

      // This query uses the compound index { userId: 1, order: 1 }
      const locations = await SavedLocation.find({ userId: user._id }).sort({ order: 1 });

      expect(locations.length).toBe(3);
      expect(locations[0].name).toBe('Loc 1');
    });
  });

  // ===========================================================================
  // TEST SUITE: EDGE CASES
  // ===========================================================================

  describe('Edge Cases', () => {
    it('should handle location with empty coordinates object', async () => {
      const user = await createTestUser();
      const location = await SavedLocation.create({
        userId: user._id,
        name: 'No Coords',
        address: '123 Unknown St',
        coordinates: {},
      });

      expect(location.coordinates.lat).toBeNull();
      expect(location.coordinates.lon).toBeNull();
    });

    it('should handle special characters in name', async () => {
      const user = await createTestUser();
      const location = await createTestLocation(user._id, {
        name: "Mom's House - 123 & Main",
      });
      expect(location.name).toBe("Mom's House - 123 & Main");
    });

    it('should handle unicode characters in address', async () => {
      const user = await createTestUser();
      const location = await createTestLocation(user._id, {
        address: '123 日本橋, 東京, Japan',
      });
      expect(location.address).toBe('123 日本橋, 東京, Japan');
    });

    it('should handle negative coordinates', async () => {
      const user = await createTestUser();
      const location = await createTestLocation(user._id, {
        coordinates: { lat: -33.8688, lon: 151.2093 }, // Sydney
      });
      expect(location.coordinates.lat).toBe(-33.8688);
      expect(location.coordinates.lon).toBe(151.2093);
    });

    it('should handle very precise coordinates', async () => {
      const user = await createTestUser();
      const location = await createTestLocation(user._id, {
        coordinates: { lat: 40.71284567890123, lon: -74.00601234567890 },
      });
      // Numbers may be stored with some precision loss
      expect(location.coordinates.lat).toBeCloseTo(40.71284567890123, 10);
      expect(location.coordinates.lon).toBeCloseTo(-74.00601234567890, 10);
    });

    it('should handle clearing default by setting isDefault to false', async () => {
      const user = await createTestUser();
      const location = await createTestLocation(user._id, { isDefault: true });

      location.isDefault = false;
      await location.save();

      const updated = await SavedLocation.findById(location._id);
      expect(updated.isDefault).toBe(false);
    });

    it('should handle order as negative number', async () => {
      const user = await createTestUser();
      const location = await createTestLocation(user._id, { order: -1 });
      expect(location.order).toBe(-1);
    });

    it('should handle large order number', async () => {
      const user = await createTestUser();
      const location = await createTestLocation(user._id, { order: 999999 });
      expect(location.order).toBe(999999);
    });
  });
});
