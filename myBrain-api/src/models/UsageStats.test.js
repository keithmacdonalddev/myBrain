/**
 * =============================================================================
 * USAGESTATS MODEL TESTS
 * =============================================================================
 *
 * Comprehensive tests for the UsageStats model, covering:
 * - Schema validation (required fields, defaults)
 * - Static methods (getOrCreateForDate, trackInteraction, getUsageProfile, trackSession)
 * - Daily/monthly aggregation behavior
 * - Feature usage counts
 * - User activity metrics
 * - Reset periods (daily document creation)
 * - Weighting algorithm (recent interactions, decay)
 *
 * Uses mongodb-memory-server for real MongoDB behavior without external deps.
 */

import '../test/setup.js';
import mongoose from 'mongoose';
import UsageStats from './UsageStats.js';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Creates a test user ObjectId.
 */
function createTestUserId() {
  return new mongoose.Types.ObjectId();
}

/**
 * Normalizes a date to midnight UTC.
 */
function normalizeToMidnight(date) {
  const normalized = new Date(date);
  normalized.setUTCHours(0, 0, 0, 0);
  return normalized;
}

/**
 * Creates a date N days ago from today.
 */
function daysAgo(days) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return normalizeToMidnight(date);
}

// =============================================================================
// TEST SUITE: SCHEMA VALIDATION
// =============================================================================

describe('UsageStats Model', () => {
  describe('Schema Validation', () => {
    describe('Required fields', () => {
      it('should require userId', async () => {
        await expect(
          UsageStats.create({
            date: new Date(),
          })
        ).rejects.toThrow(/userId.*required/i);
      });

      it('should require date', async () => {
        await expect(
          UsageStats.create({
            userId: createTestUserId(),
          })
        ).rejects.toThrow(/date.*required/i);
      });

      it('should create with minimal required fields', async () => {
        const userId = createTestUserId();
        const date = normalizeToMidnight(new Date());

        const stats = await UsageStats.create({ userId, date });

        expect(stats.userId.toString()).toBe(userId.toString());
        expect(stats.date.getTime()).toBe(date.getTime());
      });
    });

    describe('Index validation (Schema Definition)', () => {
      it('should have index on userId field', () => {
        const schema = UsageStats.schema;
        const userIdPath = schema.path('userId');

        expect(userIdPath.options.index).toBe(true);
      });

      it('should have index on date field', () => {
        const schema = UsageStats.schema;
        const datePath = schema.path('date');

        expect(datePath.options.index).toBe(true);
      });

      it('should have compound index on userId and date defined', () => {
        const schema = UsageStats.schema;
        const indexes = schema.indexes();

        // Find compound index with both userId and date
        const hasCompoundIndex = indexes.some(idx =>
          idx[0].userId !== undefined && idx[0].date !== undefined
        );

        expect(hasCompoundIndex).toBe(true);
      });
    });
  });

  // ===========================================================================
  // TEST SUITE: DEFAULT VALUES
  // ===========================================================================

  describe('Default Values', () => {
    it('should default sessionCount to 0', async () => {
      const userId = createTestUserId();
      const stats = await UsageStats.create({
        userId,
        date: new Date(),
      });

      expect(stats.sessionCount).toBe(0);
    });

    it('should default totalInteractions to 0', async () => {
      const userId = createTestUserId();
      const stats = await UsageStats.create({
        userId,
        date: new Date(),
      });

      expect(stats.totalInteractions).toBe(0);
    });

    it('should default all interaction counters to 0', async () => {
      const userId = createTestUserId();
      const stats = await UsageStats.create({
        userId,
        date: new Date(),
      });

      // Full interaction features
      const fullFeatures = ['tasks', 'notes', 'projects', 'events'];
      fullFeatures.forEach(feature => {
        expect(stats.interactions[feature].creates).toBe(0);
        expect(stats.interactions[feature].views).toBe(0);
        expect(stats.interactions[feature].edits).toBe(0);
        expect(stats.interactions[feature].completes).toBe(0);
      });

      // Limited interaction features
      const limitedFeatures = ['messages', 'images', 'files'];
      limitedFeatures.forEach(feature => {
        expect(stats.interactions[feature].creates).toBe(0);
        expect(stats.interactions[feature].views).toBe(0);
      });
    });
  });

  // ===========================================================================
  // TEST SUITE: STATIC METHODS
  // ===========================================================================

  describe('Static Methods', () => {
    describe('getOrCreateForDate()', () => {
      it('should create new stats document for user/date if not exists', async () => {
        const userId = createTestUserId();
        const date = new Date();

        const stats = await UsageStats.getOrCreateForDate(userId, date);

        expect(stats).toBeDefined();
        expect(stats.userId.toString()).toBe(userId.toString());
      });

      it('should return existing stats document if exists', async () => {
        const userId = createTestUserId();
        const date = new Date();

        // Create first
        const stats1 = await UsageStats.getOrCreateForDate(userId, date);

        // Get again
        const stats2 = await UsageStats.getOrCreateForDate(userId, date);

        expect(stats1._id.toString()).toBe(stats2._id.toString());
      });

      it('should normalize date to midnight UTC', async () => {
        const userId = createTestUserId();
        const date = new Date('2024-03-15T14:30:45.123Z');

        const stats = await UsageStats.getOrCreateForDate(userId, date);

        expect(stats.date.getUTCHours()).toBe(0);
        expect(stats.date.getUTCMinutes()).toBe(0);
        expect(stats.date.getUTCSeconds()).toBe(0);
        expect(stats.date.getUTCMilliseconds()).toBe(0);
      });

      it('should default to current date if not provided', async () => {
        const userId = createTestUserId();
        const today = normalizeToMidnight(new Date());

        const stats = await UsageStats.getOrCreateForDate(userId);

        expect(stats.date.getTime()).toBe(today.getTime());
      });

      it('should create separate documents for different dates', async () => {
        const userId = createTestUserId();
        const today = normalizeToMidnight(new Date());
        const yesterday = daysAgo(1);

        const statsToday = await UsageStats.getOrCreateForDate(userId, today);
        const statsYesterday = await UsageStats.getOrCreateForDate(userId, yesterday);

        expect(statsToday._id.toString()).not.toBe(statsYesterday._id.toString());
        expect(statsToday.date.getTime()).not.toBe(statsYesterday.date.getTime());
      });

      it('should create separate documents for different users', async () => {
        const user1 = createTestUserId();
        const user2 = createTestUserId();
        const date = new Date();

        const stats1 = await UsageStats.getOrCreateForDate(user1, date);
        const stats2 = await UsageStats.getOrCreateForDate(user2, date);

        expect(stats1._id.toString()).not.toBe(stats2._id.toString());
      });
    });

    describe('trackInteraction()', () => {
      it('should increment interaction counter', async () => {
        const userId = createTestUserId();

        const stats = await UsageStats.trackInteraction(userId, 'tasks', 'creates');

        expect(stats.interactions.tasks.creates).toBe(1);
      });

      it('should increment totalInteractions', async () => {
        const userId = createTestUserId();

        const stats = await UsageStats.trackInteraction(userId, 'tasks', 'creates');

        expect(stats.totalInteractions).toBe(1);
      });

      it('should accumulate multiple interactions', async () => {
        const userId = createTestUserId();

        await UsageStats.trackInteraction(userId, 'tasks', 'creates');
        await UsageStats.trackInteraction(userId, 'tasks', 'creates');
        const stats = await UsageStats.trackInteraction(userId, 'tasks', 'creates');

        expect(stats.interactions.tasks.creates).toBe(3);
        expect(stats.totalInteractions).toBe(3);
      });

      it('should track different action types separately', async () => {
        const userId = createTestUserId();

        await UsageStats.trackInteraction(userId, 'tasks', 'creates');
        await UsageStats.trackInteraction(userId, 'tasks', 'views');
        await UsageStats.trackInteraction(userId, 'tasks', 'edits');
        const stats = await UsageStats.trackInteraction(userId, 'tasks', 'completes');

        expect(stats.interactions.tasks.creates).toBe(1);
        expect(stats.interactions.tasks.views).toBe(1);
        expect(stats.interactions.tasks.edits).toBe(1);
        expect(stats.interactions.tasks.completes).toBe(1);
        expect(stats.totalInteractions).toBe(4);
      });

      it('should track different features separately', async () => {
        const userId = createTestUserId();

        await UsageStats.trackInteraction(userId, 'tasks', 'creates');
        await UsageStats.trackInteraction(userId, 'notes', 'creates');
        const stats = await UsageStats.trackInteraction(userId, 'projects', 'creates');

        expect(stats.interactions.tasks.creates).toBe(1);
        expect(stats.interactions.notes.creates).toBe(1);
        expect(stats.interactions.projects.creates).toBe(1);
      });

      it('should create stats document if not exists (upsert)', async () => {
        const userId = createTestUserId();

        // No stats exist yet
        const count = await UsageStats.countDocuments({ userId });
        expect(count).toBe(0);

        // Track interaction should create it
        await UsageStats.trackInteraction(userId, 'tasks', 'creates');

        const newCount = await UsageStats.countDocuments({ userId });
        expect(newCount).toBe(1);
      });

      it('should throw error for invalid feature', async () => {
        const userId = createTestUserId();

        await expect(
          UsageStats.trackInteraction(userId, 'invalidFeature', 'creates')
        ).rejects.toThrow(/Invalid feature/);
      });

      it('should throw error for invalid action', async () => {
        const userId = createTestUserId();

        await expect(
          UsageStats.trackInteraction(userId, 'tasks', 'invalidAction')
        ).rejects.toThrow(/Invalid action/);
      });

      it('should ignore edits/completes for limited features', async () => {
        const userId = createTestUserId();

        // These should silently return null
        const result1 = await UsageStats.trackInteraction(userId, 'messages', 'edits');
        const result2 = await UsageStats.trackInteraction(userId, 'images', 'completes');

        expect(result1).toBeNull();
        expect(result2).toBeNull();
      });

      it('should allow creates/views for limited features', async () => {
        const userId = createTestUserId();

        const stats1 = await UsageStats.trackInteraction(userId, 'messages', 'creates');
        const stats2 = await UsageStats.trackInteraction(userId, 'images', 'views');

        expect(stats1.interactions.messages.creates).toBe(1);
        expect(stats2.interactions.images.views).toBe(1);
      });
    });

    describe('trackSession()', () => {
      it('should increment session count', async () => {
        const userId = createTestUserId();

        await UsageStats.trackSession(userId);
        const stats = await UsageStats.getOrCreateForDate(userId);

        expect(stats.sessionCount).toBe(1);
      });

      it('should accumulate multiple sessions', async () => {
        const userId = createTestUserId();

        await UsageStats.trackSession(userId);
        await UsageStats.trackSession(userId);
        await UsageStats.trackSession(userId);

        const stats = await UsageStats.getOrCreateForDate(userId);
        expect(stats.sessionCount).toBe(3);
      });

      it('should create stats document if not exists', async () => {
        const userId = createTestUserId();

        await UsageStats.trackSession(userId);

        const count = await UsageStats.countDocuments({ userId });
        expect(count).toBe(1);
      });
    });

    describe('getUsageProfile()', () => {
      it('should return zeros when no usage data', async () => {
        const userId = createTestUserId();

        const profile = await UsageStats.getUsageProfile(userId);

        expect(profile.tasks).toBe(0);
        expect(profile.notes).toBe(0);
        expect(profile.projects).toBe(0);
        expect(profile.totalInteractions).toBe(0);
      });

      it('should calculate feature percentages', async () => {
        const userId = createTestUserId();

        // Create 10 task interactions and 10 note interactions
        for (let i = 0; i < 10; i++) {
          await UsageStats.trackInteraction(userId, 'tasks', 'creates');
          await UsageStats.trackInteraction(userId, 'notes', 'creates');
        }

        const profile = await UsageStats.getUsageProfile(userId);

        // Should be ~50% each (actual may vary due to weighting)
        expect(profile.tasks).toBeGreaterThan(0);
        expect(profile.notes).toBeGreaterThan(0);
        expect(profile.tasks + profile.notes).toBeGreaterThan(80); // Most of 100%
      });

      it('should weight recent interactions (last 7 days) 2x', async () => {
        const userId = createTestUserId();

        // Create old interactions (8 days ago)
        const oldDate = daysAgo(8);
        await UsageStats.create({
          userId,
          date: oldDate,
          interactions: {
            tasks: { creates: 10, views: 0, edits: 0, completes: 0 },
            notes: { creates: 0, views: 0, edits: 0, completes: 0 },
            projects: { creates: 0, views: 0, edits: 0, completes: 0 },
            events: { creates: 0, views: 0, edits: 0, completes: 0 },
            messages: { creates: 0, views: 0 },
            images: { creates: 0, views: 0 },
            files: { creates: 0, views: 0 },
          },
          totalInteractions: 10,
        });

        // Create recent interactions (today)
        await UsageStats.create({
          userId,
          date: normalizeToMidnight(new Date()),
          interactions: {
            tasks: { creates: 0, views: 0, edits: 0, completes: 0 },
            notes: { creates: 5, views: 0, edits: 0, completes: 0 },
            projects: { creates: 0, views: 0, edits: 0, completes: 0 },
            events: { creates: 0, views: 0, edits: 0, completes: 0 },
            messages: { creates: 0, views: 0 },
            images: { creates: 0, views: 0 },
            files: { creates: 0, views: 0 },
          },
          totalInteractions: 5,
        });

        const profile = await UsageStats.getUsageProfile(userId);

        // Recent notes (5 * 2 = 10 weighted) should equal old tasks (10 * 1 = 10 weighted)
        // So they should be roughly equal percentage
        // Notes might be slightly higher due to the 2x weighting
        expect(profile.notes).toBeGreaterThanOrEqual(profile.tasks - 10);
      });

      it('should apply decay for features unused 14+ days', async () => {
        const userId = createTestUserId();

        // Create old interactions (15 days ago)
        const oldDate = daysAgo(15);
        await UsageStats.create({
          userId,
          date: oldDate,
          interactions: {
            tasks: { creates: 20, views: 0, edits: 0, completes: 0 },
            notes: { creates: 0, views: 0, edits: 0, completes: 0 },
            projects: { creates: 0, views: 0, edits: 0, completes: 0 },
            events: { creates: 0, views: 0, edits: 0, completes: 0 },
            messages: { creates: 0, views: 0 },
            images: { creates: 0, views: 0 },
            files: { creates: 0, views: 0 },
          },
          totalInteractions: 20,
        });

        // Create recent interactions (today)
        await UsageStats.create({
          userId,
          date: normalizeToMidnight(new Date()),
          interactions: {
            tasks: { creates: 0, views: 0, edits: 0, completes: 0 },
            notes: { creates: 10, views: 0, edits: 0, completes: 0 },
            projects: { creates: 0, views: 0, edits: 0, completes: 0 },
            events: { creates: 0, views: 0, edits: 0, completes: 0 },
            messages: { creates: 0, views: 0 },
            images: { creates: 0, views: 0 },
            files: { creates: 0, views: 0 },
          },
          totalInteractions: 10,
        });

        const profile = await UsageStats.getUsageProfile(userId);

        // Old tasks: 20 * 1 weight * 0.5 decay = 10
        // Recent notes: 10 * 2 weight = 20
        // Notes should be higher due to recency
        expect(profile.notes).toBeGreaterThan(profile.tasks);
      });

      it('should track lastActivityDays', async () => {
        const userId = createTestUserId();

        // Create interactions 5 days ago
        const fiveDaysAgo = daysAgo(5);
        await UsageStats.create({
          userId,
          date: fiveDaysAgo,
          interactions: {
            tasks: { creates: 5, views: 0, edits: 0, completes: 0 },
            notes: { creates: 0, views: 0, edits: 0, completes: 0 },
            projects: { creates: 0, views: 0, edits: 0, completes: 0 },
            events: { creates: 0, views: 0, edits: 0, completes: 0 },
            messages: { creates: 0, views: 0 },
            images: { creates: 0, views: 0 },
            files: { creates: 0, views: 0 },
          },
          totalInteractions: 5,
        });

        const profile = await UsageStats.getUsageProfile(userId);

        expect(profile.lastActivityDays.tasks).toBe(5);
        expect(profile.lastActivityDays.notes).toBeNull();
      });

      it('should respect days parameter for lookback period', async () => {
        const userId = createTestUserId();

        // Create interactions 20 days ago
        const twentyDaysAgo = daysAgo(20);
        await UsageStats.create({
          userId,
          date: twentyDaysAgo,
          interactions: {
            tasks: { creates: 50, views: 0, edits: 0, completes: 0 },
            notes: { creates: 0, views: 0, edits: 0, completes: 0 },
            projects: { creates: 0, views: 0, edits: 0, completes: 0 },
            events: { creates: 0, views: 0, edits: 0, completes: 0 },
            messages: { creates: 0, views: 0 },
            images: { creates: 0, views: 0 },
            files: { creates: 0, views: 0 },
          },
          totalInteractions: 50,
        });

        // With 15 day lookback, shouldn't see the old data
        const shortProfile = await UsageStats.getUsageProfile(userId, 15);
        expect(shortProfile.totalInteractions).toBe(0);

        // With 30 day lookback, should see it
        const longProfile = await UsageStats.getUsageProfile(userId, 30);
        expect(longProfile.totalInteractions).toBe(50);
      });

      it('should return totalInteractions sum', async () => {
        const userId = createTestUserId();

        await UsageStats.trackInteraction(userId, 'tasks', 'creates');
        await UsageStats.trackInteraction(userId, 'tasks', 'views');
        await UsageStats.trackInteraction(userId, 'notes', 'creates');

        const profile = await UsageStats.getUsageProfile(userId);

        expect(profile.totalInteractions).toBe(3);
      });
    });
  });

  // ===========================================================================
  // TEST SUITE: DAILY AGGREGATION
  // ===========================================================================

  describe('Daily Aggregation', () => {
    it('should create one document per user per day', async () => {
      const userId = createTestUserId();
      const today = normalizeToMidnight(new Date());

      // Multiple interactions on same day
      await UsageStats.trackInteraction(userId, 'tasks', 'creates');
      await UsageStats.trackInteraction(userId, 'notes', 'creates');
      await UsageStats.trackInteraction(userId, 'projects', 'views');

      const count = await UsageStats.countDocuments({ userId, date: today });
      expect(count).toBe(1);
    });

    it('should aggregate all interactions into single document', async () => {
      const userId = createTestUserId();

      await UsageStats.trackInteraction(userId, 'tasks', 'creates');
      await UsageStats.trackInteraction(userId, 'tasks', 'views');
      await UsageStats.trackInteraction(userId, 'notes', 'edits');

      const stats = await UsageStats.getOrCreateForDate(userId);

      expect(stats.interactions.tasks.creates).toBe(1);
      expect(stats.interactions.tasks.views).toBe(1);
      expect(stats.interactions.notes.edits).toBe(1);
      expect(stats.totalInteractions).toBe(3);
    });

    it('should keep days separate', async () => {
      const userId = createTestUserId();

      // Create stats for yesterday
      const yesterday = daysAgo(1);
      await UsageStats.create({
        userId,
        date: yesterday,
        interactions: {
          tasks: { creates: 5, views: 0, edits: 0, completes: 0 },
          notes: { creates: 0, views: 0, edits: 0, completes: 0 },
          projects: { creates: 0, views: 0, edits: 0, completes: 0 },
          events: { creates: 0, views: 0, edits: 0, completes: 0 },
          messages: { creates: 0, views: 0 },
          images: { creates: 0, views: 0 },
          files: { creates: 0, views: 0 },
        },
        totalInteractions: 5,
      });

      // Track today
      await UsageStats.trackInteraction(userId, 'notes', 'creates');

      // Check they're separate
      const yesterdayStats = await UsageStats.findOne({ userId, date: yesterday });
      const todayStats = await UsageStats.getOrCreateForDate(userId);

      expect(yesterdayStats.interactions.tasks.creates).toBe(5);
      expect(yesterdayStats.totalInteractions).toBe(5);
      expect(todayStats.interactions.notes.creates).toBe(1);
      expect(todayStats.totalInteractions).toBe(1);
    });
  });

  // ===========================================================================
  // TEST SUITE: FEATURE USAGE COUNTS
  // ===========================================================================

  describe('Feature Usage Counts', () => {
    it('should count task interactions', async () => {
      const userId = createTestUserId();

      await UsageStats.trackInteraction(userId, 'tasks', 'creates');
      await UsageStats.trackInteraction(userId, 'tasks', 'views');
      await UsageStats.trackInteraction(userId, 'tasks', 'edits');
      await UsageStats.trackInteraction(userId, 'tasks', 'completes');

      const stats = await UsageStats.getOrCreateForDate(userId);

      expect(stats.interactions.tasks.creates).toBe(1);
      expect(stats.interactions.tasks.views).toBe(1);
      expect(stats.interactions.tasks.edits).toBe(1);
      expect(stats.interactions.tasks.completes).toBe(1);
    });

    it('should count note interactions', async () => {
      const userId = createTestUserId();

      await UsageStats.trackInteraction(userId, 'notes', 'creates');
      await UsageStats.trackInteraction(userId, 'notes', 'creates');
      await UsageStats.trackInteraction(userId, 'notes', 'views');

      const stats = await UsageStats.getOrCreateForDate(userId);

      expect(stats.interactions.notes.creates).toBe(2);
      expect(stats.interactions.notes.views).toBe(1);
    });

    it('should count project interactions', async () => {
      const userId = createTestUserId();

      await UsageStats.trackInteraction(userId, 'projects', 'creates');
      await UsageStats.trackInteraction(userId, 'projects', 'edits');

      const stats = await UsageStats.getOrCreateForDate(userId);

      expect(stats.interactions.projects.creates).toBe(1);
      expect(stats.interactions.projects.edits).toBe(1);
    });

    it('should count event interactions', async () => {
      const userId = createTestUserId();

      await UsageStats.trackInteraction(userId, 'events', 'creates');
      await UsageStats.trackInteraction(userId, 'events', 'views');
      await UsageStats.trackInteraction(userId, 'events', 'views');

      const stats = await UsageStats.getOrCreateForDate(userId);

      expect(stats.interactions.events.creates).toBe(1);
      expect(stats.interactions.events.views).toBe(2);
    });

    it('should count message interactions (limited)', async () => {
      const userId = createTestUserId();

      await UsageStats.trackInteraction(userId, 'messages', 'creates');
      await UsageStats.trackInteraction(userId, 'messages', 'views');

      const stats = await UsageStats.getOrCreateForDate(userId);

      expect(stats.interactions.messages.creates).toBe(1);
      expect(stats.interactions.messages.views).toBe(1);
    });

    it('should count image interactions (limited)', async () => {
      const userId = createTestUserId();

      await UsageStats.trackInteraction(userId, 'images', 'creates');
      await UsageStats.trackInteraction(userId, 'images', 'views');

      const stats = await UsageStats.getOrCreateForDate(userId);

      expect(stats.interactions.images.creates).toBe(1);
      expect(stats.interactions.images.views).toBe(1);
    });

    it('should count file interactions (limited)', async () => {
      const userId = createTestUserId();

      await UsageStats.trackInteraction(userId, 'files', 'creates');
      await UsageStats.trackInteraction(userId, 'files', 'views');

      const stats = await UsageStats.getOrCreateForDate(userId);

      expect(stats.interactions.files.creates).toBe(1);
      expect(stats.interactions.files.views).toBe(1);
    });
  });

  // ===========================================================================
  // TEST SUITE: USER ACTIVITY METRICS
  // ===========================================================================

  describe('User Activity Metrics', () => {
    it('should track session count separately from interactions', async () => {
      const userId = createTestUserId();

      await UsageStats.trackSession(userId);
      await UsageStats.trackInteraction(userId, 'tasks', 'creates');

      const stats = await UsageStats.getOrCreateForDate(userId);

      expect(stats.sessionCount).toBe(1);
      expect(stats.totalInteractions).toBe(1);
    });

    it('should track active users across days', async () => {
      const userId = createTestUserId();

      // Activity today
      await UsageStats.trackInteraction(userId, 'tasks', 'creates');

      // Activity yesterday
      const yesterday = daysAgo(1);
      await UsageStats.create({
        userId,
        date: yesterday,
        interactions: {
          tasks: { creates: 1, views: 0, edits: 0, completes: 0 },
          notes: { creates: 0, views: 0, edits: 0, completes: 0 },
          projects: { creates: 0, views: 0, edits: 0, completes: 0 },
          events: { creates: 0, views: 0, edits: 0, completes: 0 },
          messages: { creates: 0, views: 0 },
          images: { creates: 0, views: 0 },
          files: { creates: 0, views: 0 },
        },
        totalInteractions: 1,
      });

      // Count active days
      const activeDays = await UsageStats.countDocuments({
        userId,
        totalInteractions: { $gt: 0 },
      });

      expect(activeDays).toBe(2);
    });

    it('should calculate engagement metrics in profile', async () => {
      const userId = createTestUserId();

      // Heavy task user
      for (let i = 0; i < 20; i++) {
        await UsageStats.trackInteraction(userId, 'tasks', 'creates');
      }

      // Light notes user
      for (let i = 0; i < 5; i++) {
        await UsageStats.trackInteraction(userId, 'notes', 'creates');
      }

      const profile = await UsageStats.getUsageProfile(userId);

      // Tasks should dominate
      expect(profile.tasks).toBeGreaterThan(profile.notes);
      expect(profile.totalInteractions).toBe(25);
    });
  });

  // ===========================================================================
  // TEST SUITE: RESET PERIODS
  // ===========================================================================

  describe('Reset Periods (Daily Documents)', () => {
    it('should start fresh counters each day', async () => {
      const userId = createTestUserId();

      // Yesterday's stats
      const yesterday = daysAgo(1);
      await UsageStats.create({
        userId,
        date: yesterday,
        interactions: {
          tasks: { creates: 100, views: 50, edits: 25, completes: 10 },
          notes: { creates: 0, views: 0, edits: 0, completes: 0 },
          projects: { creates: 0, views: 0, edits: 0, completes: 0 },
          events: { creates: 0, views: 0, edits: 0, completes: 0 },
          messages: { creates: 0, views: 0 },
          images: { creates: 0, views: 0 },
          files: { creates: 0, views: 0 },
        },
        totalInteractions: 185,
        sessionCount: 10,
      });

      // Today should start fresh
      const todayStats = await UsageStats.getOrCreateForDate(userId);

      expect(todayStats.interactions.tasks.creates).toBe(0);
      expect(todayStats.totalInteractions).toBe(0);
      expect(todayStats.sessionCount).toBe(0);
    });

    it('should preserve history for lookback queries', async () => {
      const userId = createTestUserId();

      // Create multiple days of history
      for (let i = 1; i <= 5; i++) {
        const date = daysAgo(i);
        await UsageStats.create({
          userId,
          date,
          interactions: {
            tasks: { creates: i, views: 0, edits: 0, completes: 0 },
            notes: { creates: 0, views: 0, edits: 0, completes: 0 },
            projects: { creates: 0, views: 0, edits: 0, completes: 0 },
            events: { creates: 0, views: 0, edits: 0, completes: 0 },
            messages: { creates: 0, views: 0 },
            images: { creates: 0, views: 0 },
            files: { creates: 0, views: 0 },
          },
          totalInteractions: i,
        });
      }

      // All history should be preserved
      const profile = await UsageStats.getUsageProfile(userId, 30);

      // Total: 1+2+3+4+5 = 15
      expect(profile.totalInteractions).toBe(15);
    });
  });

  // ===========================================================================
  // TEST SUITE: EDGE CASES
  // ===========================================================================

  describe('Edge Cases', () => {
    it('should handle sequential rapid interactions', async () => {
      const userId = createTestUserId();

      // Sequential rapid interactions (avoiding race conditions)
      for (let i = 0; i < 10; i++) {
        await UsageStats.trackInteraction(userId, 'tasks', 'creates');
      }

      const stats = await UsageStats.getOrCreateForDate(userId);

      expect(stats.interactions.tasks.creates).toBe(10);
      expect(stats.totalInteractions).toBe(10);
    });

    it('should handle multiple users concurrently', async () => {
      const users = [createTestUserId(), createTestUserId(), createTestUserId()];

      // Concurrent tracking for all users
      await Promise.all(
        users.map(userId =>
          UsageStats.trackInteraction(userId, 'tasks', 'creates')
        )
      );

      // Each user should have their own stats
      for (const userId of users) {
        const stats = await UsageStats.getOrCreateForDate(userId);
        expect(stats.interactions.tasks.creates).toBe(1);
      }
    });

    it('should handle timezone edge cases (use UTC)', async () => {
      const userId = createTestUserId();

      // Create dates that might be different days in different timezones
      const late = new Date('2024-03-15T23:59:59.999Z');
      const early = new Date('2024-03-16T00:00:00.000Z');

      await UsageStats.getOrCreateForDate(userId, late);
      await UsageStats.getOrCreateForDate(userId, early);

      // Should be two different documents (different UTC dates)
      const count = await UsageStats.countDocuments({ userId });
      expect(count).toBe(2);
    });

    it('should handle very old dates', async () => {
      const userId = createTestUserId();
      const veryOld = new Date('2020-06-15T12:00:00.000Z'); // Use mid-year to avoid timezone issues

      const stats = await UsageStats.getOrCreateForDate(userId, veryOld);

      expect(stats.date.getUTCFullYear()).toBe(2020);
      expect(stats.date.getUTCMonth()).toBe(5); // June (0-indexed)
    });

    it('should handle empty usage profile gracefully', async () => {
      const userId = createTestUserId();

      const profile = await UsageStats.getUsageProfile(userId);

      // All features should be 0
      expect(profile.tasks).toBe(0);
      expect(profile.notes).toBe(0);
      expect(profile.projects).toBe(0);
      expect(profile.events).toBe(0);
      expect(profile.messages).toBe(0);
      expect(profile.images).toBe(0);
      expect(profile.files).toBe(0);
      expect(profile.totalInteractions).toBe(0);

      // All lastActivityDays should be null
      Object.values(profile.lastActivityDays).forEach(value => {
        expect(value).toBeNull();
      });
    });

    it('should handle single feature dominance', async () => {
      const userId = createTestUserId();

      // Only use tasks
      for (let i = 0; i < 100; i++) {
        await UsageStats.trackInteraction(userId, 'tasks', 'creates');
      }

      const profile = await UsageStats.getUsageProfile(userId);

      // Tasks should be 100%
      expect(profile.tasks).toBe(100);
      expect(profile.notes).toBe(0);
    });

    it('should handle interactions without creates', async () => {
      const userId = createTestUserId();

      // Only views and edits, no creates
      await UsageStats.trackInteraction(userId, 'tasks', 'views');
      await UsageStats.trackInteraction(userId, 'tasks', 'edits');
      await UsageStats.trackInteraction(userId, 'tasks', 'views');

      const stats = await UsageStats.getOrCreateForDate(userId);

      expect(stats.interactions.tasks.creates).toBe(0);
      expect(stats.interactions.tasks.views).toBe(2);
      expect(stats.interactions.tasks.edits).toBe(1);
      expect(stats.totalInteractions).toBe(3);
    });
  });

  // ===========================================================================
  // TEST SUITE: TIMESTAMPS
  // ===========================================================================

  describe('Timestamps', () => {
    it('should have createdAt and updatedAt', async () => {
      const userId = createTestUserId();

      const stats = await UsageStats.create({
        userId,
        date: new Date(),
      });

      expect(stats.createdAt).toBeInstanceOf(Date);
      expect(stats.updatedAt).toBeInstanceOf(Date);
    });

    it('should update updatedAt on modification', async () => {
      const userId = createTestUserId();

      const stats = await UsageStats.create({
        userId,
        date: new Date(),
      });

      const originalUpdatedAt = stats.updatedAt;

      // Wait a bit and update
      await new Promise(resolve => setTimeout(resolve, 10));
      await UsageStats.trackInteraction(userId, 'tasks', 'creates');

      const updatedStats = await UsageStats.getOrCreateForDate(userId);

      expect(updatedStats.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });
});
