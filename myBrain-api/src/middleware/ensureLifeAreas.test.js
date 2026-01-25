/**
 * =============================================================================
 * ENSURELIFEAREAS MIDDLEWARE TESTS
 * =============================================================================
 *
 * Comprehensive tests for the ensureLifeAreas middleware that creates default
 * life areas (categories) for new users on their first authenticated request.
 *
 * Test Categories:
 * 1. New user - Creates all 6 default life areas
 * 2. Existing user - Doesn't duplicate areas
 * 3. Partial areas - Behavior with existing areas
 * 4. Area structure - Correct name, icon, color, order
 * 5. User isolation - Areas scoped to user
 * 6. Error handling - Database errors
 * 7. Middleware flow - Calls next() correctly
 *
 * =============================================================================
 */

import '../test/setup.js';
import mongoose from 'mongoose';
import { jest } from '@jest/globals';
import LifeArea from '../models/LifeArea.js';
import { ensureLifeAreas } from './ensureLifeAreas.js';

// =============================================================================
// EXPECTED DEFAULT CATEGORIES
// =============================================================================

/**
 * The expected default life areas that should be created for new users.
 * These match the DEFAULT_CATEGORIES in ensureLifeAreas.js
 */
const EXPECTED_DEFAULT_AREAS = [
  {
    name: 'Work & Career',
    description: 'Professional responsibilities, projects, meetings, and career development goals',
    color: '#3b82f6',
    icon: 'Briefcase',
    order: 0,
    isDefault: true
  },
  {
    name: 'Health & Fitness',
    description: 'Physical and mental wellbeing, exercise routines, medical appointments, and health goals',
    color: '#10b981',
    icon: 'Heart',
    order: 1
  },
  {
    name: 'Finance',
    description: 'Budgeting, investments, bills, financial planning, and money management',
    color: '#f59e0b',
    icon: 'DollarSign',
    order: 2
  },
  {
    name: 'Family & Relationships',
    description: 'Time with loved ones, family events, relationship maintenance, and social connections',
    color: '#ec4899',
    icon: 'Users',
    order: 3
  },
  {
    name: 'Personal Growth',
    description: 'Learning, hobbies, self-improvement, skill development, and personal projects',
    color: '#8b5cf6',
    icon: 'Book',
    order: 4
  },
  {
    name: 'Home & Living',
    description: 'Household maintenance, chores, home improvement, and living space organization',
    color: '#6366f1',
    icon: 'Home',
    order: 5
  }
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Creates a mock Express request object
 * @param {Object} overrides - Properties to override
 * @returns {Object} Mock request object
 */
function createMockRequest(overrides = {}) {
  return {
    headers: {},
    cookies: {},
    ...overrides
  };
}

/**
 * Creates a mock Express response object with jest spies
 * @returns {Object} Mock response object
 */
function createMockResponse() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

/**
 * Creates a mock next function
 * @returns {Function} Mock next function
 */
function createMockNext() {
  return jest.fn();
}

/**
 * Creates a mock user object with a valid MongoDB ObjectId
 * @param {Object} overrides - Properties to override
 * @returns {Object} Mock user object
 */
function createMockUser(overrides = {}) {
  return {
    _id: new mongoose.Types.ObjectId(),
    email: 'test@example.com',
    name: 'Test User',
    role: 'user',
    status: 'active',
    ...overrides
  };
}

// =============================================================================
// TEST SUITES
// =============================================================================

describe('ensureLifeAreas Middleware', () => {
  // Clear the database before each test (handled by setup.js)
  beforeEach(async () => {
    await LifeArea.deleteMany({});
  });

  // ===========================================================================
  // AUTHENTICATION CHECK TESTS
  // ===========================================================================

  describe('Authentication Check', () => {
    it('should call next() immediately when no user is authenticated', async () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      await ensureLifeAreas(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();

      // No life areas should be created
      const areas = await LifeArea.find({});
      expect(areas).toHaveLength(0);
    });

    it('should call next() immediately when req.user is undefined', async () => {
      const req = createMockRequest({ user: undefined });
      const res = createMockResponse();
      const next = createMockNext();

      await ensureLifeAreas(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
    });

    it('should call next() immediately when req.user is null', async () => {
      const req = createMockRequest({ user: null });
      const res = createMockResponse();
      const next = createMockNext();

      await ensureLifeAreas(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
    });
  });

  // ===========================================================================
  // NEW USER TESTS - Creates all 6 default life areas
  // ===========================================================================

  describe('New User - Default Life Area Creation', () => {
    it('should create all 6 default life areas for a new user', async () => {
      const user = createMockUser();
      const req = createMockRequest({ user });
      const res = createMockResponse();
      const next = createMockNext();

      await ensureLifeAreas(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);

      const areas = await LifeArea.find({ userId: user._id }).sort({ order: 1 });
      expect(areas).toHaveLength(6);
    });

    it('should create life areas with correct names', async () => {
      const user = createMockUser();
      const req = createMockRequest({ user });
      const res = createMockResponse();
      const next = createMockNext();

      await ensureLifeAreas(req, res, next);

      const areas = await LifeArea.find({ userId: user._id }).sort({ order: 1 });

      const expectedNames = [
        'Work & Career',
        'Health & Fitness',
        'Finance',
        'Family & Relationships',
        'Personal Growth',
        'Home & Living'
      ];

      areas.forEach((area, index) => {
        expect(area.name).toBe(expectedNames[index]);
      });
    });

    it('should create life areas with correct order values (0-5)', async () => {
      const user = createMockUser();
      const req = createMockRequest({ user });
      const res = createMockResponse();
      const next = createMockNext();

      await ensureLifeAreas(req, res, next);

      const areas = await LifeArea.find({ userId: user._id }).sort({ order: 1 });

      areas.forEach((area, index) => {
        expect(area.order).toBe(index);
      });
    });

    it('should create life areas with correct colors', async () => {
      const user = createMockUser();
      const req = createMockRequest({ user });
      const res = createMockResponse();
      const next = createMockNext();

      await ensureLifeAreas(req, res, next);

      const areas = await LifeArea.find({ userId: user._id }).sort({ order: 1 });

      const expectedColors = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#6366f1'];

      areas.forEach((area, index) => {
        expect(area.color).toBe(expectedColors[index]);
      });
    });

    it('should create life areas with correct icons', async () => {
      const user = createMockUser();
      const req = createMockRequest({ user });
      const res = createMockResponse();
      const next = createMockNext();

      await ensureLifeAreas(req, res, next);

      const areas = await LifeArea.find({ userId: user._id }).sort({ order: 1 });

      const expectedIcons = ['Briefcase', 'Heart', 'DollarSign', 'Users', 'Book', 'Home'];

      areas.forEach((area, index) => {
        expect(area.icon).toBe(expectedIcons[index]);
      });
    });

    it('should create life areas with correct descriptions', async () => {
      const user = createMockUser();
      const req = createMockRequest({ user });
      const res = createMockResponse();
      const next = createMockNext();

      await ensureLifeAreas(req, res, next);

      const areas = await LifeArea.find({ userId: user._id }).sort({ order: 1 });

      EXPECTED_DEFAULT_AREAS.forEach((expected, index) => {
        expect(areas[index].description).toBe(expected.description);
      });
    });

    it('should set Work & Career as the default life area (isDefault: true)', async () => {
      const user = createMockUser();
      const req = createMockRequest({ user });
      const res = createMockResponse();
      const next = createMockNext();

      await ensureLifeAreas(req, res, next);

      const defaultArea = await LifeArea.findOne({ userId: user._id, isDefault: true });

      expect(defaultArea).not.toBeNull();
      expect(defaultArea.name).toBe('Work & Career');
    });

    it('should set only one life area as default', async () => {
      const user = createMockUser();
      const req = createMockRequest({ user });
      const res = createMockResponse();
      const next = createMockNext();

      await ensureLifeAreas(req, res, next);

      const defaultAreas = await LifeArea.find({ userId: user._id, isDefault: true });

      expect(defaultAreas).toHaveLength(1);
    });

    it('should assign correct userId to all created life areas', async () => {
      const user = createMockUser();
      const req = createMockRequest({ user });
      const res = createMockResponse();
      const next = createMockNext();

      await ensureLifeAreas(req, res, next);

      const areas = await LifeArea.find({ userId: user._id });

      areas.forEach(area => {
        expect(area.userId.toString()).toBe(user._id.toString());
      });
    });
  });

  // ===========================================================================
  // EXISTING USER TESTS - Idempotency
  // ===========================================================================

  describe('Existing User - Idempotency', () => {
    it('should not create duplicate areas when middleware runs multiple times', async () => {
      const user = createMockUser();
      const req = createMockRequest({ user });
      const res = createMockResponse();
      const next = createMockNext();

      // Run middleware first time
      await ensureLifeAreas(req, res, next);

      // Run middleware second time
      await ensureLifeAreas(req, res, next);

      // Run middleware third time
      await ensureLifeAreas(req, res, next);

      const areas = await LifeArea.find({ userId: user._id });
      expect(areas).toHaveLength(6);
    });

    it('should not modify existing areas when middleware runs again', async () => {
      const user = createMockUser();
      const req = createMockRequest({ user });
      const res = createMockResponse();
      const next = createMockNext();

      // Run middleware first time
      await ensureLifeAreas(req, res, next);

      // Get original areas
      const originalAreas = await LifeArea.find({ userId: user._id }).sort({ order: 1 });
      const originalIds = originalAreas.map(a => a._id.toString());

      // Run middleware again
      await ensureLifeAreas(req, res, next);

      // Get areas after second run
      const areasAfter = await LifeArea.find({ userId: user._id }).sort({ order: 1 });
      const afterIds = areasAfter.map(a => a._id.toString());

      // IDs should be the same (no new documents created)
      expect(afterIds).toEqual(originalIds);
    });

    it('should not create defaults if user already has any life areas', async () => {
      const user = createMockUser();

      // Create a single custom life area for the user
      await LifeArea.create({
        userId: user._id,
        name: 'My Custom Area',
        color: '#ff0000',
        icon: 'Star',
        order: 0
      });

      const req = createMockRequest({ user });
      const res = createMockResponse();
      const next = createMockNext();

      await ensureLifeAreas(req, res, next);

      // Should still only have the one custom area
      const areas = await LifeArea.find({ userId: user._id });
      expect(areas).toHaveLength(1);
      expect(areas[0].name).toBe('My Custom Area');
    });

    it('should not fill in missing defaults for users with partial areas', async () => {
      const user = createMockUser();

      // Create only 2 life areas (simulating user deleted some defaults)
      await LifeArea.insertMany([
        { userId: user._id, name: 'Work', color: '#000000', icon: 'Work', order: 0 },
        { userId: user._id, name: 'Personal', color: '#ffffff', icon: 'User', order: 1 }
      ]);

      const req = createMockRequest({ user });
      const res = createMockResponse();
      const next = createMockNext();

      await ensureLifeAreas(req, res, next);

      // Should still only have the 2 areas (respects user's choices)
      const areas = await LifeArea.find({ userId: user._id });
      expect(areas).toHaveLength(2);
    });
  });

  // ===========================================================================
  // USER ISOLATION TESTS
  // ===========================================================================

  describe('User Isolation', () => {
    it('should create separate life areas for different users', async () => {
      const user1 = createMockUser();
      const user2 = createMockUser();

      const req1 = createMockRequest({ user: user1 });
      const req2 = createMockRequest({ user: user2 });
      const res = createMockResponse();
      const next = createMockNext();

      await ensureLifeAreas(req1, res, next);
      await ensureLifeAreas(req2, res, next);

      const user1Areas = await LifeArea.find({ userId: user1._id });
      const user2Areas = await LifeArea.find({ userId: user2._id });

      expect(user1Areas).toHaveLength(6);
      expect(user2Areas).toHaveLength(6);

      // Verify areas are actually different documents
      const user1Ids = user1Areas.map(a => a._id.toString());
      const user2Ids = user2Areas.map(a => a._id.toString());

      user1Ids.forEach(id => {
        expect(user2Ids).not.toContain(id);
      });
    });

    it('should not affect other users when creating defaults', async () => {
      const existingUser = createMockUser();
      const newUser = createMockUser();

      // Create custom areas for existing user
      await LifeArea.insertMany([
        { userId: existingUser._id, name: 'Custom 1', color: '#111', icon: 'X', order: 0 },
        { userId: existingUser._id, name: 'Custom 2', color: '#222', icon: 'Y', order: 1 }
      ]);

      // Run middleware for new user
      const req = createMockRequest({ user: newUser });
      const res = createMockResponse();
      const next = createMockNext();

      await ensureLifeAreas(req, res, next);

      // Existing user should still have only their 2 custom areas
      const existingUserAreas = await LifeArea.find({ userId: existingUser._id });
      expect(existingUserAreas).toHaveLength(2);
      expect(existingUserAreas[0].name).toBe('Custom 1');
      expect(existingUserAreas[1].name).toBe('Custom 2');

      // New user should have 6 defaults
      const newUserAreas = await LifeArea.find({ userId: newUser._id });
      expect(newUserAreas).toHaveLength(6);
    });
  });

  // ===========================================================================
  // MIDDLEWARE FLOW TESTS
  // ===========================================================================

  describe('Middleware Flow', () => {
    it('should always call next() for authenticated users', async () => {
      const user = createMockUser();
      const req = createMockRequest({ user });
      const res = createMockResponse();
      const next = createMockNext();

      await ensureLifeAreas(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith(); // Called with no arguments
    });

    it('should not send any response (leave that to the route handler)', async () => {
      const user = createMockUser();
      const req = createMockRequest({ user });
      const res = createMockResponse();
      const next = createMockNext();

      await ensureLifeAreas(req, res, next);

      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });

    it('should not modify the request object (except through side effects)', async () => {
      const user = createMockUser();
      const originalUser = { ...user };
      const req = createMockRequest({ user });
      const res = createMockResponse();
      const next = createMockNext();

      await ensureLifeAreas(req, res, next);

      // User object should still be the same
      expect(req.user._id).toEqual(originalUser._id);
      expect(req.user.email).toBe(originalUser.email);
    });
  });

  // ===========================================================================
  // ERROR HANDLING TESTS
  // ===========================================================================

  describe('Error Handling', () => {
    it('should call next() even when database error occurs during count', async () => {
      const user = createMockUser();
      const req = createMockRequest({ user });
      const res = createMockResponse();
      const next = createMockNext();

      // Spy on console.error to verify it logs the error
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Mock countDocuments to throw an error
      const originalCountDocuments = LifeArea.countDocuments;
      LifeArea.countDocuments = jest.fn().mockRejectedValue(new Error('Database connection failed'));

      await ensureLifeAreas(req, res, next);

      // Should still call next (fail gracefully)
      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();

      // Should log the error
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error ensuring life areas:',
        expect.any(Error)
      );

      // Restore
      LifeArea.countDocuments = originalCountDocuments;
      consoleErrorSpy.mockRestore();
    });

    it('should call next() even when database error occurs during insert', async () => {
      const user = createMockUser();
      const req = createMockRequest({ user });
      const res = createMockResponse();
      const next = createMockNext();

      // Spy on console.error
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Mock insertMany to throw an error
      const originalInsertMany = LifeArea.insertMany;
      LifeArea.insertMany = jest.fn().mockRejectedValue(new Error('Insert failed'));

      await ensureLifeAreas(req, res, next);

      // Should still call next (fail gracefully)
      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();

      // Restore
      LifeArea.insertMany = originalInsertMany;
      consoleErrorSpy.mockRestore();
    });

    it('should not block the user when life area creation fails', async () => {
      const user = createMockUser();
      const req = createMockRequest({ user });
      const res = createMockResponse();
      const next = createMockNext();

      // Suppress console.error for this test
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Mock insertMany to throw
      const originalInsertMany = LifeArea.insertMany;
      LifeArea.insertMany = jest.fn().mockRejectedValue(new Error('Insert failed'));

      await ensureLifeAreas(req, res, next);

      // User should still be able to proceed
      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith(); // No error passed to next

      // Restore
      LifeArea.insertMany = originalInsertMany;
      consoleErrorSpy.mockRestore();
    });
  });

  // ===========================================================================
  // AREA STRUCTURE VALIDATION TESTS
  // ===========================================================================

  describe('Life Area Structure Validation', () => {
    it('should create areas with all required fields', async () => {
      const user = createMockUser();
      const req = createMockRequest({ user });
      const res = createMockResponse();
      const next = createMockNext();

      await ensureLifeAreas(req, res, next);

      const areas = await LifeArea.find({ userId: user._id });

      areas.forEach(area => {
        expect(area.userId).toBeDefined();
        expect(area.name).toBeDefined();
        expect(area.description).toBeDefined();
        expect(area.color).toBeDefined();
        expect(area.icon).toBeDefined();
        expect(typeof area.order).toBe('number');
      });
    });

    it('should create areas with valid timestamps', async () => {
      const user = createMockUser();
      const req = createMockRequest({ user });
      const res = createMockResponse();
      const next = createMockNext();

      const beforeCreate = new Date();
      await ensureLifeAreas(req, res, next);
      const afterCreate = new Date();

      const areas = await LifeArea.find({ userId: user._id });

      areas.forEach(area => {
        expect(area.createdAt).toBeDefined();
        expect(area.updatedAt).toBeDefined();
        expect(area.createdAt >= beforeCreate).toBe(true);
        expect(area.createdAt <= afterCreate).toBe(true);
      });
    });

    it('should create areas that are not archived by default', async () => {
      const user = createMockUser();
      const req = createMockRequest({ user });
      const res = createMockResponse();
      const next = createMockNext();

      await ensureLifeAreas(req, res, next);

      const areas = await LifeArea.find({ userId: user._id });

      areas.forEach(area => {
        expect(area.isArchived).toBe(false);
      });
    });
  });
});
