/**
 * =============================================================================
 * ENSURETAGS.TEST.JS - Default Tags Setup Middleware Tests
 * =============================================================================
 *
 * Comprehensive tests for the ensureTags middleware which creates default tags
 * for new users. Tests cover:
 *
 * 1. NEW USER SETUP - Creates all 31 default tags
 * 2. IDEMPOTENCY - Running multiple times doesn't duplicate
 * 3. PARTIAL TAGS - Fills in missing tags (not implemented - middleware is all-or-nothing)
 * 4. TAG STRUCTURE - Correct name, color, category
 * 5. USER ISOLATION - Tags scoped to user
 * 6. ERROR HANDLING - Database errors
 * 7. MIDDLEWARE FLOW - Calls next() correctly
 *
 * Uses MongoDB Memory Server for isolated database testing.
 */

import { jest, describe, test, expect, beforeEach, beforeAll, afterEach, afterAll } from '@jest/globals';
import '../test/setup.js';
import mongoose from 'mongoose';
import Tag from '../models/Tag.js';
import { ensureTags } from './ensureTags.js';

// =============================================================================
// TEST DATA - Expected Default Tags
// =============================================================================

/**
 * All 31 default tags that should be created for new users.
 * Organized by category for readability.
 *
 * Categories:
 * - Priority & Status: 6 tags
 * - Time-Related: 5 tags
 * - Work & Productivity: 5 tags
 * - Content & Ideas: 5 tags
 * - Personal & Goals: 5 tags
 * - Organization: 5 tags
 * Total: 31 tags
 */
const EXPECTED_DEFAULT_TAGS = [
  // Priority & Status (Red/Orange spectrum) - 6 tags
  { name: 'urgent', color: '#ef4444' },
  { name: 'important', color: '#f97316' },
  { name: 'blocked', color: '#dc2626' },
  { name: 'in-progress', color: '#eab308' },
  { name: 'review', color: '#f59e0b' },
  { name: 'done', color: '#22c55e' },

  // Time-Related (Blue spectrum) - 5 tags
  { name: 'today', color: '#3b82f6' },
  { name: 'this-week', color: '#6366f1' },
  { name: 'someday', color: '#8b5cf6' },
  { name: 'recurring', color: '#a855f7' },
  { name: 'deadline', color: '#ec4899' },

  // Work & Productivity (Teal/Cyan spectrum) - 5 tags
  { name: 'meeting', color: '#14b8a6' },
  { name: 'follow-up', color: '#06b6d4' },
  { name: 'client', color: '#0891b2' },
  { name: 'project', color: '#0d9488' },
  { name: 'email', color: '#2dd4bf' },

  // Content & Ideas (Green spectrum) - 5 tags
  { name: 'idea', color: '#84cc16' },
  { name: 'research', color: '#22c55e' },
  { name: 'reference', color: '#10b981' },
  { name: 'draft', color: '#34d399' },
  { name: 'template', color: '#4ade80' },

  // Personal & Goals (Purple/Pink spectrum) - 5 tags
  { name: 'goal', color: '#d946ef' },
  { name: 'reminder', color: '#c026d3' },
  { name: 'habit', color: '#a21caf' },
  { name: 'learning', color: '#9333ea' },
  { name: 'personal', color: '#7c3aed' },

  // Organization (Gray/Neutral spectrum) - 5 tags
  { name: 'archive', color: '#6b7280' },
  { name: 'later', color: '#9ca3af' },
  { name: 'maybe', color: '#a3a3a3' },
  { name: 'waiting', color: '#78716c' },
  { name: 'delegated', color: '#71717a' },
];

// =============================================================================
// TEST HELPERS
// =============================================================================

/**
 * Creates a mock request object with user authentication
 */
const createMockReq = (userOverrides = {}) => ({
  user: userOverrides.noUser ? undefined : {
    _id: userOverrides._id || new mongoose.Types.ObjectId(),
    ...userOverrides
  }
});

/**
 * Creates a mock response object
 */
const createMockRes = () => {
  const res = {
    statusCode: null,
    jsonData: null,
    status: jest.fn(function(code) {
      this.statusCode = code;
      return this;
    }),
    json: jest.fn(function(data) {
      this.jsonData = data;
      return this;
    })
  };
  return res;
};

/**
 * Creates a mock next function
 */
const createMockNext = () => jest.fn();

/**
 * Helper to create a test user ID
 */
const createUserId = () => new mongoose.Types.ObjectId();

// =============================================================================
// TEST SUITES
// =============================================================================

describe('ensureTags middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ===========================================================================
  // 1. NEW USER SETUP TESTS
  // ===========================================================================

  describe('new user - creates default tags', () => {
    test('creates all 31 default tags for a user with no tags', async () => {
      const userId = createUserId();
      const req = createMockReq({ _id: userId });
      const res = createMockRes();
      const next = createMockNext();

      await ensureTags(req, res, next);

      const tags = await Tag.find({ userId });
      expect(tags).toHaveLength(31);
      expect(next).toHaveBeenCalled();
    });

    test('creates tags with correct names', async () => {
      const userId = createUserId();
      const req = createMockReq({ _id: userId });
      const res = createMockRes();
      const next = createMockNext();

      await ensureTags(req, res, next);

      const tags = await Tag.find({ userId });
      const tagNames = tags.map(t => t.name).sort();
      const expectedNames = EXPECTED_DEFAULT_TAGS.map(t => t.name).sort();

      expect(tagNames).toEqual(expectedNames);
    });

    test('creates tags with correct colors', async () => {
      const userId = createUserId();
      const req = createMockReq({ _id: userId });
      const res = createMockRes();
      const next = createMockNext();

      await ensureTags(req, res, next);

      const tags = await Tag.find({ userId });

      for (const expectedTag of EXPECTED_DEFAULT_TAGS) {
        const tag = tags.find(t => t.name === expectedTag.name);
        expect(tag).toBeDefined();
        expect(tag.color).toBe(expectedTag.color);
      }
    });

    test('creates tags with usageCount of 0', async () => {
      const userId = createUserId();
      const req = createMockReq({ _id: userId });
      const res = createMockRes();
      const next = createMockNext();

      await ensureTags(req, res, next);

      const tags = await Tag.find({ userId });
      for (const tag of tags) {
        expect(tag.usageCount).toBe(0);
      }
    });

    test('creates tags with isActive set to true', async () => {
      const userId = createUserId();
      const req = createMockReq({ _id: userId });
      const res = createMockRes();
      const next = createMockNext();

      await ensureTags(req, res, next);

      const tags = await Tag.find({ userId });
      for (const tag of tags) {
        expect(tag.isActive).toBe(true);
      }
    });

    test('creates tags with lastUsed set', async () => {
      const userId = createUserId();
      const req = createMockReq({ _id: userId });
      const res = createMockRes();
      const next = createMockNext();

      const beforeTime = new Date();
      await ensureTags(req, res, next);
      const afterTime = new Date();

      const tags = await Tag.find({ userId });
      for (const tag of tags) {
        expect(tag.lastUsed).toBeDefined();
        expect(tag.lastUsed.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
        expect(tag.lastUsed.getTime()).toBeLessThanOrEqual(afterTime.getTime());
      }
    });

    test('creates tags with lowercase names', async () => {
      const userId = createUserId();
      const req = createMockReq({ _id: userId });
      const res = createMockRes();
      const next = createMockNext();

      await ensureTags(req, res, next);

      const tags = await Tag.find({ userId });
      for (const tag of tags) {
        expect(tag.name).toBe(tag.name.toLowerCase());
      }
    });
  });

  // ===========================================================================
  // 2. IDEMPOTENCY TESTS - Running multiple times
  // ===========================================================================

  describe('idempotency - running multiple times', () => {
    test('does not duplicate tags when run multiple times', async () => {
      const userId = createUserId();
      const req = createMockReq({ _id: userId });
      const res = createMockRes();
      const next = createMockNext();

      // Run middleware three times
      await ensureTags(req, res, next);
      await ensureTags(req, res, next);
      await ensureTags(req, res, next);

      const tags = await Tag.find({ userId });
      expect(tags).toHaveLength(31);
    });

    test('does not modify existing tags when run again', async () => {
      const userId = createUserId();
      const req = createMockReq({ _id: userId });
      const res = createMockRes();
      const next = createMockNext();

      // First run
      await ensureTags(req, res, next);

      // Modify a tag
      await Tag.findOneAndUpdate(
        { userId, name: 'urgent' },
        { usageCount: 10, color: '#000000' }
      );

      // Second run
      await ensureTags(req, res, next);

      // Verify tag was not reset
      const urgentTag = await Tag.findOne({ userId, name: 'urgent' });
      expect(urgentTag.usageCount).toBe(10);
      expect(urgentTag.color).toBe('#000000');
    });

    test('calls next() on subsequent runs even though no tags are created', async () => {
      const userId = createUserId();
      const req = createMockReq({ _id: userId });
      const res = createMockRes();
      const next = createMockNext();

      await ensureTags(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);

      const next2 = createMockNext();
      await ensureTags(req, res, next2);
      expect(next2).toHaveBeenCalledTimes(1);
    });
  });

  // ===========================================================================
  // 3. EXISTING TAGS TESTS
  // ===========================================================================

  describe('existing user with tags', () => {
    test('does not create tags if user already has any tags', async () => {
      const userId = createUserId();

      // Create a single existing tag
      await Tag.create({
        userId,
        name: 'custom-tag',
        color: '#123456',
        usageCount: 1,
        isActive: true
      });

      const req = createMockReq({ _id: userId });
      const res = createMockRes();
      const next = createMockNext();

      await ensureTags(req, res, next);

      const tags = await Tag.find({ userId });
      expect(tags).toHaveLength(1);
      expect(tags[0].name).toBe('custom-tag');
    });

    test('preserves custom tags when user has their own tags', async () => {
      const userId = createUserId();

      // Create multiple custom tags
      await Tag.insertMany([
        { userId, name: 'custom-one', color: '#111111', usageCount: 5, isActive: true },
        { userId, name: 'custom-two', color: '#222222', usageCount: 3, isActive: true },
        { userId, name: 'custom-three', color: '#333333', usageCount: 1, isActive: false }
      ]);

      const req = createMockReq({ _id: userId });
      const res = createMockRes();
      const next = createMockNext();

      await ensureTags(req, res, next);

      const tags = await Tag.find({ userId });
      expect(tags).toHaveLength(3);

      const tagNames = tags.map(t => t.name).sort();
      expect(tagNames).toEqual(['custom-one', 'custom-three', 'custom-two']);
    });

    test('does not add missing defaults when user has partial tags', async () => {
      const userId = createUserId();

      // Create only one of the default tags
      await Tag.create({
        userId,
        name: 'urgent', // This is a default tag name
        color: '#custom',
        usageCount: 1,
        isActive: true
      });

      const req = createMockReq({ _id: userId });
      const res = createMockRes();
      const next = createMockNext();

      await ensureTags(req, res, next);

      // Middleware only checks count > 0, does not fill in missing defaults
      const tags = await Tag.find({ userId });
      expect(tags).toHaveLength(1);
    });
  });

  // ===========================================================================
  // 4. TAG STRUCTURE TESTS - Verify categories and colors
  // ===========================================================================

  describe('tag structure - categories and colors', () => {
    test('creates priority & status tags with red/orange colors', async () => {
      const userId = createUserId();
      const req = createMockReq({ _id: userId });
      const res = createMockRes();
      const next = createMockNext();

      await ensureTags(req, res, next);

      const priorityTags = ['urgent', 'important', 'blocked', 'in-progress', 'review', 'done'];
      const tags = await Tag.find({ userId, name: { $in: priorityTags } });

      expect(tags).toHaveLength(6);

      // Verify each has expected color
      const urgentTag = tags.find(t => t.name === 'urgent');
      expect(urgentTag.color).toBe('#ef4444');

      const importantTag = tags.find(t => t.name === 'important');
      expect(importantTag.color).toBe('#f97316');

      const blockedTag = tags.find(t => t.name === 'blocked');
      expect(blockedTag.color).toBe('#dc2626');
    });

    test('creates time-related tags with blue spectrum colors', async () => {
      const userId = createUserId();
      const req = createMockReq({ _id: userId });
      const res = createMockRes();
      const next = createMockNext();

      await ensureTags(req, res, next);

      const timeTags = ['today', 'this-week', 'someday', 'recurring', 'deadline'];
      const tags = await Tag.find({ userId, name: { $in: timeTags } });

      expect(tags).toHaveLength(5);

      const todayTag = tags.find(t => t.name === 'today');
      expect(todayTag.color).toBe('#3b82f6');

      const thisWeekTag = tags.find(t => t.name === 'this-week');
      expect(thisWeekTag.color).toBe('#6366f1');
    });

    test('creates work & productivity tags with teal/cyan colors', async () => {
      const userId = createUserId();
      const req = createMockReq({ _id: userId });
      const res = createMockRes();
      const next = createMockNext();

      await ensureTags(req, res, next);

      const workTags = ['meeting', 'follow-up', 'client', 'project', 'email'];
      const tags = await Tag.find({ userId, name: { $in: workTags } });

      expect(tags).toHaveLength(5);

      const meetingTag = tags.find(t => t.name === 'meeting');
      expect(meetingTag.color).toBe('#14b8a6');

      const followUpTag = tags.find(t => t.name === 'follow-up');
      expect(followUpTag.color).toBe('#06b6d4');
    });

    test('creates content & ideas tags with green spectrum colors', async () => {
      const userId = createUserId();
      const req = createMockReq({ _id: userId });
      const res = createMockRes();
      const next = createMockNext();

      await ensureTags(req, res, next);

      const contentTags = ['idea', 'research', 'reference', 'draft', 'template'];
      const tags = await Tag.find({ userId, name: { $in: contentTags } });

      expect(tags).toHaveLength(5);

      const ideaTag = tags.find(t => t.name === 'idea');
      expect(ideaTag.color).toBe('#84cc16');

      const researchTag = tags.find(t => t.name === 'research');
      expect(researchTag.color).toBe('#22c55e');
    });

    test('creates personal & goals tags with purple/pink colors', async () => {
      const userId = createUserId();
      const req = createMockReq({ _id: userId });
      const res = createMockRes();
      const next = createMockNext();

      await ensureTags(req, res, next);

      const personalTags = ['goal', 'reminder', 'habit', 'learning', 'personal'];
      const tags = await Tag.find({ userId, name: { $in: personalTags } });

      expect(tags).toHaveLength(5);

      const goalTag = tags.find(t => t.name === 'goal');
      expect(goalTag.color).toBe('#d946ef');

      const habitTag = tags.find(t => t.name === 'habit');
      expect(habitTag.color).toBe('#a21caf');
    });

    test('creates organization tags with gray/neutral colors', async () => {
      const userId = createUserId();
      const req = createMockReq({ _id: userId });
      const res = createMockRes();
      const next = createMockNext();

      await ensureTags(req, res, next);

      const orgTags = ['archive', 'later', 'maybe', 'waiting', 'delegated'];
      const tags = await Tag.find({ userId, name: { $in: orgTags } });

      expect(tags).toHaveLength(5);

      const archiveTag = tags.find(t => t.name === 'archive');
      expect(archiveTag.color).toBe('#6b7280');

      const laterTag = tags.find(t => t.name === 'later');
      expect(laterTag.color).toBe('#9ca3af');
    });
  });

  // ===========================================================================
  // 5. USER ISOLATION TESTS - Tags scoped to user
  // ===========================================================================

  describe('user isolation - tags scoped to user', () => {
    test('creates separate tags for each user', async () => {
      const userId1 = createUserId();
      const userId2 = createUserId();

      const req1 = createMockReq({ _id: userId1 });
      const req2 = createMockReq({ _id: userId2 });
      const res = createMockRes();

      await ensureTags(req1, res, createMockNext());
      await ensureTags(req2, res, createMockNext());

      const tags1 = await Tag.find({ userId: userId1 });
      const tags2 = await Tag.find({ userId: userId2 });

      expect(tags1).toHaveLength(31);
      expect(tags2).toHaveLength(31);

      // Verify they are distinct documents
      const tag1Ids = tags1.map(t => t._id.toString());
      const tag2Ids = tags2.map(t => t._id.toString());
      const intersection = tag1Ids.filter(id => tag2Ids.includes(id));
      expect(intersection).toHaveLength(0);
    });

    test('user tags do not affect other users', async () => {
      const userId1 = createUserId();
      const userId2 = createUserId();

      // User 1 gets default tags
      const req1 = createMockReq({ _id: userId1 });
      await ensureTags(req1, createMockRes(), createMockNext());

      // Modify user 1's tag
      await Tag.findOneAndUpdate(
        { userId: userId1, name: 'urgent' },
        { color: '#000000', usageCount: 100 }
      );

      // User 2 gets default tags
      const req2 = createMockReq({ _id: userId2 });
      await ensureTags(req2, createMockRes(), createMockNext());

      // User 2's urgent tag should have original values
      const user2UrgentTag = await Tag.findOne({ userId: userId2, name: 'urgent' });
      expect(user2UrgentTag.color).toBe('#ef4444');
      expect(user2UrgentTag.usageCount).toBe(0);
    });

    test('one user with tags does not prevent another from getting defaults', async () => {
      const userId1 = createUserId();
      const userId2 = createUserId();

      // User 1 has custom tags
      await Tag.create({
        userId: userId1,
        name: 'custom-only',
        color: '#999999',
        usageCount: 1,
        isActive: true
      });

      // User 2 should still get defaults
      const req2 = createMockReq({ _id: userId2 });
      await ensureTags(req2, createMockRes(), createMockNext());

      const tags2 = await Tag.find({ userId: userId2 });
      expect(tags2).toHaveLength(31);
    });

    test('total tags in database are correct for multiple users', async () => {
      const userId1 = createUserId();
      const userId2 = createUserId();
      const userId3 = createUserId();

      await ensureTags(createMockReq({ _id: userId1 }), createMockRes(), createMockNext());
      await ensureTags(createMockReq({ _id: userId2 }), createMockRes(), createMockNext());
      await ensureTags(createMockReq({ _id: userId3 }), createMockRes(), createMockNext());

      const totalTags = await Tag.countDocuments({});
      expect(totalTags).toBe(93); // 31 * 3 users
    });
  });

  // ===========================================================================
  // 6. ERROR HANDLING TESTS
  // ===========================================================================

  describe('error handling', () => {
    test('calls next() even when database error occurs', async () => {
      const userId = createUserId();
      const req = createMockReq({ _id: userId });
      const res = createMockRes();
      const next = createMockNext();

      // Mock Tag.countDocuments to throw an error
      const originalCountDocuments = Tag.countDocuments;
      Tag.countDocuments = jest.fn().mockRejectedValue(new Error('Database connection failed'));

      await ensureTags(req, res, next);

      // Should still call next despite error
      expect(next).toHaveBeenCalled();

      // Restore original method
      Tag.countDocuments = originalCountDocuments;
    });

    test('does not throw error to caller on database failure', async () => {
      const userId = createUserId();
      const req = createMockReq({ _id: userId });
      const res = createMockRes();
      const next = createMockNext();

      // Mock Tag.insertMany to throw an error
      const originalInsertMany = Tag.insertMany;
      Tag.insertMany = jest.fn().mockRejectedValue(new Error('Insert failed'));

      // Should not throw
      await expect(ensureTags(req, res, next)).resolves.not.toThrow();

      // Should still call next
      expect(next).toHaveBeenCalled();

      // Restore original method
      Tag.insertMany = originalInsertMany;
    });

    test('logs error to console when database fails', async () => {
      const userId = createUserId();
      const req = createMockReq({ _id: userId });
      const res = createMockRes();
      const next = createMockNext();

      // Spy on console.error
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      // Mock Tag.countDocuments to throw an error
      const originalCountDocuments = Tag.countDocuments;
      Tag.countDocuments = jest.fn().mockRejectedValue(new Error('Database error'));

      await ensureTags(req, res, next);

      expect(consoleSpy).toHaveBeenCalled();
      expect(consoleSpy.mock.calls[0][0]).toBe('Error ensuring tags:');

      // Restore
      consoleSpy.mockRestore();
      Tag.countDocuments = originalCountDocuments;
    });
  });

  // ===========================================================================
  // 7. MIDDLEWARE FLOW TESTS
  // ===========================================================================

  describe('middleware flow - next() behavior', () => {
    test('calls next() for authenticated user with no tags', async () => {
      const userId = createUserId();
      const req = createMockReq({ _id: userId });
      const res = createMockRes();
      const next = createMockNext();

      await ensureTags(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith();
    });

    test('calls next() for authenticated user with existing tags', async () => {
      const userId = createUserId();
      await Tag.create({ userId, name: 'existing', color: '#000', usageCount: 1, isActive: true });

      const req = createMockReq({ _id: userId });
      const res = createMockRes();
      const next = createMockNext();

      await ensureTags(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
    });

    test('calls next() when no user is authenticated (req.user is undefined)', async () => {
      const req = createMockReq({ noUser: true });
      const res = createMockRes();
      const next = createMockNext();

      await ensureTags(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
    });

    test('does not call res.status or res.json', async () => {
      const userId = createUserId();
      const req = createMockReq({ _id: userId });
      const res = createMockRes();
      const next = createMockNext();

      await ensureTags(req, res, next);

      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });

    test('does not modify request object except implicitly through database', async () => {
      const userId = createUserId();
      const req = createMockReq({ _id: userId });
      const originalReq = { ...req };
      const res = createMockRes();
      const next = createMockNext();

      await ensureTags(req, res, next);

      expect(req.user).toEqual(originalReq.user);
    });
  });

  // ===========================================================================
  // 8. EDGE CASES
  // ===========================================================================

  describe('edge cases', () => {
    test('handles user with empty object as req.user', async () => {
      // req.user exists but has no _id
      const req = { user: {} };
      const res = createMockRes();
      const next = createMockNext();

      // Should not throw - _id will be undefined which is handled
      await ensureTags(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    test('handles rapid sequential calls for same user', async () => {
      const userId = createUserId();
      const req = createMockReq({ _id: userId });
      const res = createMockRes();

      // Fire multiple calls rapidly
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(ensureTags(req, res, createMockNext()));
      }

      await Promise.all(promises);

      // Should still only have 31 tags (first call creates, others skip)
      const tags = await Tag.find({ userId });
      expect(tags).toHaveLength(31);
    });

    test('handles concurrent calls for different users', async () => {
      const userIds = Array(5).fill(null).map(() => createUserId());
      const res = createMockRes();

      // Fire concurrent calls for different users
      const promises = userIds.map(userId =>
        ensureTags(createMockReq({ _id: userId }), res, createMockNext())
      );

      await Promise.all(promises);

      // Each user should have 31 tags
      for (const userId of userIds) {
        const tags = await Tag.find({ userId });
        expect(tags).toHaveLength(31);
      }
    });
  });
});
