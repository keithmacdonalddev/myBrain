/**
 * =============================================================================
 * USAGESERVICE.TEST.JS - Comprehensive Tests for Usage Service
 * =============================================================================
 *
 * This test file covers all functions in usageService.js:
 * - trackInteraction: Recording user interactions
 * - trackCreate/trackView/trackEdit/trackComplete: Convenience wrappers
 * - getUsageProfile: Getting feature usage percentages
 * - trackSession: Recording app sessions
 * - flushBuffer: Buffer management (future optimization)
 *
 * Test Categories:
 * 1. Interaction tracking - Increment counts for various actions
 * 2. User isolation - Each user's own usage data
 * 3. Usage profile calculation - Percentages and weighting
 * 4. Session tracking - App open counts
 * 5. Error handling - Graceful failure scenarios
 *
 * =============================================================================
 */

import '../test/setup.js';
import mongoose from 'mongoose';
import * as usageService from './usageService.js';
import UsageStats from '../models/UsageStats.js';

// =============================================================================
// TEST UTILITIES
// =============================================================================

/**
 * Creates a mock user ID for testing.
 * Uses mongoose.Types.ObjectId to create a valid MongoDB ObjectId.
 */
function createUserId() {
  return new mongoose.Types.ObjectId();
}

/**
 * Creates test usage stats directly in the database.
 * Useful for setting up test data without going through the service.
 */
async function createTestUsageStats(userId, overrides = {}) {
  const date = overrides.date || new Date();
  date.setUTCHours(0, 0, 0, 0);

  const statsData = {
    userId,
    date,
    interactions: {
      tasks: {
        creates: overrides.tasksCreates || 0,
        views: overrides.tasksViews || 0,
        edits: overrides.tasksEdits || 0,
        completes: overrides.tasksCompletes || 0
      },
      notes: {
        creates: overrides.notesCreates || 0,
        views: overrides.notesViews || 0,
        edits: overrides.notesEdits || 0,
        completes: overrides.notesCompletes || 0
      },
      projects: {
        creates: overrides.projectsCreates || 0,
        views: overrides.projectsViews || 0,
        edits: overrides.projectsEdits || 0,
        completes: overrides.projectsCompletes || 0
      },
      events: {
        creates: overrides.eventsCreates || 0,
        views: overrides.eventsViews || 0,
        edits: overrides.eventsEdits || 0,
        completes: overrides.eventsCompletes || 0
      },
      messages: {
        creates: overrides.messagesCreates || 0,
        views: overrides.messagesViews || 0
      },
      images: {
        creates: overrides.imagesCreates || 0,
        views: overrides.imagesViews || 0
      },
      files: {
        creates: overrides.filesCreates || 0,
        views: overrides.filesViews || 0
      }
    },
    sessionCount: overrides.sessionCount || 0,
    totalInteractions: overrides.totalInteractions || 0
  };

  const stats = new UsageStats(statsData);
  await stats.save();
  return stats;
}

/**
 * Helper to get a date N days ago (normalized to midnight UTC)
 */
function daysAgo(n) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - n);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

// =============================================================================
// TRACK INTERACTION TESTS
// =============================================================================

describe('usageService', () => {
  describe('trackInteraction', () => {
    it('should track a task create interaction', async () => {
      const userId = createUserId();

      await usageService.trackInteraction(userId, 'tasks', 'creates');

      const stats = await UsageStats.findOne({ userId });
      expect(stats).toBeDefined();
      expect(stats.interactions.tasks.creates).toBe(1);
      expect(stats.totalInteractions).toBe(1);
    });

    it('should track a note view interaction', async () => {
      const userId = createUserId();

      await usageService.trackInteraction(userId, 'notes', 'views');

      const stats = await UsageStats.findOne({ userId });
      expect(stats).toBeDefined();
      expect(stats.interactions.notes.views).toBe(1);
    });

    it('should track a project edit interaction', async () => {
      const userId = createUserId();

      await usageService.trackInteraction(userId, 'projects', 'edits');

      const stats = await UsageStats.findOne({ userId });
      expect(stats.interactions.projects.edits).toBe(1);
    });

    it('should track a task complete interaction', async () => {
      const userId = createUserId();

      await usageService.trackInteraction(userId, 'tasks', 'completes');

      const stats = await UsageStats.findOne({ userId });
      expect(stats.interactions.tasks.completes).toBe(1);
    });

    it('should increment counts on subsequent interactions', async () => {
      const userId = createUserId();

      await usageService.trackInteraction(userId, 'tasks', 'creates');
      await usageService.trackInteraction(userId, 'tasks', 'creates');
      await usageService.trackInteraction(userId, 'tasks', 'creates');

      const stats = await UsageStats.findOne({ userId });
      expect(stats.interactions.tasks.creates).toBe(3);
      expect(stats.totalInteractions).toBe(3);
    });

    it('should track multiple different features', async () => {
      const userId = createUserId();

      await usageService.trackInteraction(userId, 'tasks', 'creates');
      await usageService.trackInteraction(userId, 'notes', 'creates');
      await usageService.trackInteraction(userId, 'projects', 'views');

      const stats = await UsageStats.findOne({ userId });
      expect(stats.interactions.tasks.creates).toBe(1);
      expect(stats.interactions.notes.creates).toBe(1);
      expect(stats.interactions.projects.views).toBe(1);
      expect(stats.totalInteractions).toBe(3);
    });

    it('should track events feature', async () => {
      const userId = createUserId();

      await usageService.trackInteraction(userId, 'events', 'creates');

      const stats = await UsageStats.findOne({ userId });
      expect(stats.interactions.events.creates).toBe(1);
    });

    it('should track messages feature (creates only)', async () => {
      const userId = createUserId();

      await usageService.trackInteraction(userId, 'messages', 'creates');
      await usageService.trackInteraction(userId, 'messages', 'views');

      const stats = await UsageStats.findOne({ userId });
      expect(stats.interactions.messages.creates).toBe(1);
      expect(stats.interactions.messages.views).toBe(1);
    });

    it('should track images feature (creates and views only)', async () => {
      const userId = createUserId();

      await usageService.trackInteraction(userId, 'images', 'creates');
      await usageService.trackInteraction(userId, 'images', 'views');

      const stats = await UsageStats.findOne({ userId });
      expect(stats.interactions.images.creates).toBe(1);
      expect(stats.interactions.images.views).toBe(1);
    });

    it('should track files feature (creates and views only)', async () => {
      const userId = createUserId();

      await usageService.trackInteraction(userId, 'files', 'creates');
      await usageService.trackInteraction(userId, 'files', 'views');

      const stats = await UsageStats.findOne({ userId });
      expect(stats.interactions.files.creates).toBe(1);
      expect(stats.interactions.files.views).toBe(1);
    });

    it('should silently ignore invalid actions for limited features', async () => {
      const userId = createUserId();

      // Messages, images, files don't support edits or completes
      await usageService.trackInteraction(userId, 'messages', 'edits');
      await usageService.trackInteraction(userId, 'images', 'completes');

      // Should not throw, just silently ignore
      const stats = await UsageStats.findOne({ userId });
      expect(stats).toBeNull(); // No stats created because no valid interactions
    });

    it('should not throw for invalid feature', async () => {
      const userId = createUserId();

      // Should log error but not throw
      await expect(
        usageService.trackInteraction(userId, 'invalid_feature', 'creates')
      ).resolves.not.toThrow();
    });

    it('should not throw for invalid action', async () => {
      const userId = createUserId();

      // Should log error but not throw
      await expect(
        usageService.trackInteraction(userId, 'tasks', 'invalid_action')
      ).resolves.not.toThrow();
    });
  });

  // =============================================================================
  // CONVENIENCE FUNCTION TESTS
  // =============================================================================

  describe('convenience functions', () => {
    describe('trackCreate', () => {
      it('should track a create interaction', async () => {
        const userId = createUserId();

        await usageService.trackCreate(userId, 'notes');

        const stats = await UsageStats.findOne({ userId });
        expect(stats.interactions.notes.creates).toBe(1);
      });

      it('should work with all supported features', async () => {
        const userId = createUserId();
        const features = ['tasks', 'notes', 'projects', 'events', 'messages', 'images', 'files'];

        for (const feature of features) {
          await usageService.trackCreate(userId, feature);
        }

        const stats = await UsageStats.findOne({ userId });
        expect(stats.totalInteractions).toBe(7);
      });
    });

    describe('trackView', () => {
      it('should track a view interaction', async () => {
        const userId = createUserId();

        await usageService.trackView(userId, 'projects');

        const stats = await UsageStats.findOne({ userId });
        expect(stats.interactions.projects.views).toBe(1);
      });
    });

    describe('trackEdit', () => {
      it('should track an edit interaction', async () => {
        const userId = createUserId();

        await usageService.trackEdit(userId, 'tasks');

        const stats = await UsageStats.findOne({ userId });
        expect(stats.interactions.tasks.edits).toBe(1);
      });
    });

    describe('trackComplete', () => {
      it('should track a complete interaction', async () => {
        const userId = createUserId();

        await usageService.trackComplete(userId, 'tasks');

        const stats = await UsageStats.findOne({ userId });
        expect(stats.interactions.tasks.completes).toBe(1);
      });
    });
  });

  // =============================================================================
  // USER ISOLATION TESTS
  // =============================================================================

  describe('user isolation', () => {
    it('should keep separate stats for different users', async () => {
      const userId1 = createUserId();
      const userId2 = createUserId();

      await usageService.trackInteraction(userId1, 'tasks', 'creates');
      await usageService.trackInteraction(userId1, 'tasks', 'creates');
      await usageService.trackInteraction(userId2, 'notes', 'creates');

      const stats1 = await UsageStats.findOne({ userId: userId1 });
      const stats2 = await UsageStats.findOne({ userId: userId2 });

      expect(stats1.interactions.tasks.creates).toBe(2);
      expect(stats1.interactions.notes.creates).toBe(0);
      expect(stats2.interactions.tasks.creates).toBe(0);
      expect(stats2.interactions.notes.creates).toBe(1);
    });

    it('should not allow user to see another user usage profile', async () => {
      const userId1 = createUserId();
      const userId2 = createUserId();

      await usageService.trackInteraction(userId1, 'tasks', 'creates');

      const profile = await usageService.getUsageProfile(userId2);

      // userId2 should have zero usage
      expect(profile.totalInteractions).toBe(0);
      expect(profile.tasks).toBe(0);
    });
  });

  // =============================================================================
  // GET USAGE PROFILE TESTS
  // =============================================================================

  describe('getUsageProfile', () => {
    it('should return zero profile for user with no interactions', async () => {
      const userId = createUserId();

      const profile = await usageService.getUsageProfile(userId);

      expect(profile.tasks).toBe(0);
      expect(profile.notes).toBe(0);
      expect(profile.projects).toBe(0);
      expect(profile.events).toBe(0);
      expect(profile.messages).toBe(0);
      expect(profile.images).toBe(0);
      expect(profile.files).toBe(0);
      expect(profile.totalInteractions).toBe(0);
    });

    it('should calculate percentages correctly', async () => {
      const userId = createUserId();

      // Create usage stats with known values
      // 10 task interactions + 10 note interactions = 20 total
      await createTestUsageStats(userId, {
        tasksCreates: 5,
        tasksViews: 5,
        notesCreates: 5,
        notesViews: 5,
        totalInteractions: 20
      });

      const profile = await usageService.getUsageProfile(userId);

      // With weighting, recent interactions count 2x
      // All from today = all weighted 2x
      // tasks: 10 * 2 = 20 weighted
      // notes: 10 * 2 = 20 weighted
      // Total weighted: 40
      // Each should be 50%
      expect(profile.tasks).toBe(50);
      expect(profile.notes).toBe(50);
      expect(profile.totalInteractions).toBe(20);
    });

    it('should return lastActivityDays for each feature', async () => {
      const userId = createUserId();

      await createTestUsageStats(userId, {
        date: daysAgo(0),
        tasksCreates: 1,
        totalInteractions: 1
      });

      await createTestUsageStats(userId, {
        date: daysAgo(5),
        notesCreates: 1,
        totalInteractions: 1
      });

      const profile = await usageService.getUsageProfile(userId);

      expect(profile.lastActivityDays.tasks).toBe(0); // Today
      expect(profile.lastActivityDays.notes).toBe(5); // 5 days ago
      expect(profile.lastActivityDays.projects).toBeNull(); // No activity
    });

    it('should apply 2x weighting for recent interactions (last 7 days)', async () => {
      const userId = createUserId();

      // 10 interactions today (recent, weighted 2x = 20)
      await createTestUsageStats(userId, {
        date: daysAgo(0),
        tasksCreates: 10,
        totalInteractions: 10
      });

      // 10 interactions 20 days ago (old, weighted 1x = 10)
      await createTestUsageStats(userId, {
        date: daysAgo(20),
        notesCreates: 10,
        totalInteractions: 10
      });

      const profile = await usageService.getUsageProfile(userId);

      // tasks: 20 weighted, notes: 10 weighted
      // Total: 30 weighted
      // tasks: 20/30 = 66.67% -> 67%
      // notes: 10/30 = 33.33% -> 33%
      expect(profile.tasks).toBeGreaterThan(profile.notes);
      expect(profile.totalInteractions).toBe(20);
    });

    it('should apply 50% decay for features unused 14+ days', async () => {
      const userId = createUserId();

      // Activity 20 days ago for tasks (will decay by 50%)
      await createTestUsageStats(userId, {
        date: daysAgo(20),
        tasksCreates: 10,
        totalInteractions: 10
      });

      // Activity today for notes (no decay)
      await createTestUsageStats(userId, {
        date: daysAgo(0),
        notesCreates: 5,
        totalInteractions: 5
      });

      const profile = await usageService.getUsageProfile(userId);

      // tasks: 10 * 1 (old) * 0.5 (decay) = 5 weighted
      // notes: 5 * 2 (recent) = 10 weighted
      // Total: 15 weighted
      // tasks: 5/15 = 33%
      // notes: 10/15 = 67%
      expect(profile.notes).toBeGreaterThan(profile.tasks);
    });

    it('should respect days parameter', async () => {
      const userId = createUserId();

      // Activity 10 days ago
      await createTestUsageStats(userId, {
        date: daysAgo(10),
        tasksCreates: 10,
        totalInteractions: 10
      });

      // Activity 40 days ago (outside 30-day window)
      await createTestUsageStats(userId, {
        date: daysAgo(40),
        notesCreates: 10,
        totalInteractions: 10
      });

      // Default 30 days - should only include tasks
      const profile30 = await usageService.getUsageProfile(userId, 30);
      expect(profile30.totalInteractions).toBe(10);

      // 60 days - should include both
      const profile60 = await usageService.getUsageProfile(userId, 60);
      expect(profile60.totalInteractions).toBe(20);
    });

    it('should handle multiple days of data correctly', async () => {
      const userId = createUserId();

      // Create 7 days of task activity
      for (let i = 0; i < 7; i++) {
        await createTestUsageStats(userId, {
          date: daysAgo(i),
          tasksCreates: 1,
          totalInteractions: 1
        });
      }

      const profile = await usageService.getUsageProfile(userId);

      expect(profile.totalInteractions).toBe(7);
      expect(profile.tasks).toBe(100); // 100% task interactions
    });

    it('should return correct structure even on error', async () => {
      // Create a userId that will work but with no data
      const userId = createUserId();

      const profile = await usageService.getUsageProfile(userId);

      // Should return default structure
      expect(profile).toHaveProperty('tasks');
      expect(profile).toHaveProperty('notes');
      expect(profile).toHaveProperty('projects');
      expect(profile).toHaveProperty('events');
      expect(profile).toHaveProperty('messages');
      expect(profile).toHaveProperty('images');
      expect(profile).toHaveProperty('files');
      expect(profile).toHaveProperty('totalInteractions');
      expect(profile).toHaveProperty('lastActivityDays');
    });
  });

  // =============================================================================
  // TRACK SESSION TESTS
  // =============================================================================

  describe('trackSession', () => {
    it('should track a session', async () => {
      const userId = createUserId();

      await usageService.trackSession(userId);

      const stats = await UsageStats.findOne({ userId });
      expect(stats).toBeDefined();
      expect(stats.sessionCount).toBe(1);
    });

    it('should increment session count on subsequent sessions', async () => {
      const userId = createUserId();

      await usageService.trackSession(userId);
      await usageService.trackSession(userId);
      await usageService.trackSession(userId);

      const stats = await UsageStats.findOne({ userId });
      expect(stats.sessionCount).toBe(3);
    });

    it('should not affect interaction counts', async () => {
      const userId = createUserId();

      await usageService.trackSession(userId);

      const stats = await UsageStats.findOne({ userId });
      expect(stats.sessionCount).toBe(1);
      expect(stats.totalInteractions).toBe(0);
    });

    it('should track sessions for different users separately', async () => {
      const userId1 = createUserId();
      const userId2 = createUserId();

      await usageService.trackSession(userId1);
      await usageService.trackSession(userId1);
      await usageService.trackSession(userId2);

      const stats1 = await UsageStats.findOne({ userId: userId1 });
      const stats2 = await UsageStats.findOne({ userId: userId2 });

      expect(stats1.sessionCount).toBe(2);
      expect(stats2.sessionCount).toBe(1);
    });

    it('should create new document for each day', async () => {
      const userId = createUserId();

      // Create stats for yesterday
      await createTestUsageStats(userId, {
        date: daysAgo(1),
        sessionCount: 5
      });

      // Track session today
      await usageService.trackSession(userId);

      const allStats = await UsageStats.find({ userId }).sort({ date: -1 });
      expect(allStats.length).toBe(2);
      expect(allStats[0].sessionCount).toBe(1); // Today
      expect(allStats[1].sessionCount).toBe(5); // Yesterday
    });
  });

  // =============================================================================
  // FLUSH BUFFER TESTS
  // =============================================================================

  describe('flushBuffer', () => {
    it('should complete without error when buffer is empty', async () => {
      await expect(usageService.flushBuffer()).resolves.not.toThrow();
    });

    it('should be callable multiple times', async () => {
      await usageService.flushBuffer();
      await usageService.flushBuffer();
      await usageService.flushBuffer();

      // Just verifying no errors
      expect(true).toBe(true);
    });
  });

  // =============================================================================
  // DAILY AGGREGATION TESTS
  // =============================================================================

  describe('daily aggregation', () => {
    it('should aggregate interactions to the same day document', async () => {
      const userId = createUserId();

      // Multiple interactions on the same day
      await usageService.trackInteraction(userId, 'tasks', 'creates');
      await usageService.trackInteraction(userId, 'notes', 'views');
      await usageService.trackInteraction(userId, 'projects', 'edits');

      // Should be one document for today
      const stats = await UsageStats.find({ userId });
      expect(stats.length).toBe(1);
      expect(stats[0].totalInteractions).toBe(3);
    });

    it('should normalize date to midnight UTC', async () => {
      const userId = createUserId();

      await usageService.trackInteraction(userId, 'tasks', 'creates');

      const stats = await UsageStats.findOne({ userId });
      expect(stats.date.getUTCHours()).toBe(0);
      expect(stats.date.getUTCMinutes()).toBe(0);
      expect(stats.date.getUTCSeconds()).toBe(0);
      expect(stats.date.getUTCMilliseconds()).toBe(0);
    });
  });

  // =============================================================================
  // DEFAULT EXPORT TESTS
  // =============================================================================

  describe('default export', () => {
    it('should export all functions', async () => {
      const defaultExport = (await import('./usageService.js')).default;

      expect(defaultExport.trackInteraction).toBeDefined();
      expect(defaultExport.trackCreate).toBeDefined();
      expect(defaultExport.trackView).toBeDefined();
      expect(defaultExport.trackEdit).toBeDefined();
      expect(defaultExport.trackComplete).toBeDefined();
      expect(defaultExport.getUsageProfile).toBeDefined();
      expect(defaultExport.trackSession).toBeDefined();
    });
  });
});
