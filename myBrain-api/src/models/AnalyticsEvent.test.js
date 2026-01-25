/**
 * =============================================================================
 * ANALYTICS EVENT MODEL TESTS
 * =============================================================================
 *
 * Comprehensive tests for the AnalyticsEvent model, covering:
 * - Event tracking (track static method)
 * - Feature usage analytics (getFeatureUsage)
 * - Popular actions aggregation (getPopularActions)
 * - Daily active users (getDailyActiveUsers)
 * - Page view analytics (getPageViews)
 * - Device breakdown (getDeviceBreakdown)
 * - Hourly activity patterns (getHourlyActivity)
 * - Data integrity and validation
 *
 * Uses mongodb-memory-server for real MongoDB behavior without external deps.
 */

import '../test/setup.js';
import mongoose from 'mongoose';
import AnalyticsEvent from './AnalyticsEvent.js';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Creates an analytics event with sensible defaults for testing.
 * Override any field by passing in the overrides object.
 */
async function createTestEvent(overrides = {}) {
  const defaults = {
    category: 'feature',
    action: 'test_action',
    feature: 'notes',
    timestamp: new Date(),
  };
  return AnalyticsEvent.create({ ...defaults, ...overrides });
}

/**
 * Creates a test user ID for event association.
 */
function createUserId() {
  return new mongoose.Types.ObjectId();
}

/**
 * Creates a date N days ago from now.
 */
function daysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

/**
 * Creates a date N hours ago from now.
 */
function hoursAgo(hours) {
  const date = new Date();
  date.setHours(date.getHours() - hours);
  return date;
}

// =============================================================================
// TEST SUITE: EVENT TRACKING
// =============================================================================

describe('AnalyticsEvent Model', () => {
  // ---------------------------------------------------------------------------
  // track(eventData)
  // ---------------------------------------------------------------------------
  describe('track()', () => {
    it('should create and return a new analytics event', async () => {
      const userId = createUserId();
      const event = await AnalyticsEvent.track({
        userId,
        category: 'feature',
        action: 'create_note',
        feature: 'notes',
      });

      expect(event).not.toBeNull();
      expect(event._id).toBeDefined();
      expect(event.category).toBe('feature');
      expect(event.action).toBe('create_note');
      expect(event.feature).toBe('notes');
      expect(event.userId.toString()).toBe(userId.toString());
    });

    it('should create event with all optional fields', async () => {
      const userId = createUserId();
      const event = await AnalyticsEvent.track({
        userId,
        sessionId: 'sess_abc123',
        category: 'page_view',
        action: 'view',
        feature: 'dashboard',
        metadata: { source: 'sidebar' },
        page: '/app',
        referrer: '/login',
        userAgent: 'Mozilla/5.0',
        deviceType: 'desktop',
        browser: 'Chrome',
        os: 'Windows',
        screenSize: { width: 1920, height: 1080 },
        duration: 45000,
      });

      expect(event.sessionId).toBe('sess_abc123');
      expect(event.metadata).toEqual({ source: 'sidebar' });
      expect(event.page).toBe('/app');
      expect(event.referrer).toBe('/login');
      expect(event.userAgent).toBe('Mozilla/5.0');
      expect(event.deviceType).toBe('desktop');
      expect(event.browser).toBe('Chrome');
      expect(event.os).toBe('Windows');
      expect(event.screenSize.width).toBe(1920);
      expect(event.screenSize.height).toBe(1080);
      expect(event.duration).toBe(45000);
    });

    it('should allow anonymous events (no userId)', async () => {
      const event = await AnalyticsEvent.track({
        category: 'page_view',
        action: 'landing_view',
        page: '/',
      });

      expect(event).not.toBeNull();
      expect(event.userId).toBeNull();
    });

    it('should return null and not throw on invalid data', async () => {
      // Missing required fields should cause validation error
      // but track() catches it and returns null
      const event = await AnalyticsEvent.track({
        // Missing category and action
        feature: 'notes',
      });

      expect(event).toBeNull();
    });

    it('should set default timestamp to current time', async () => {
      const before = new Date();
      const event = await AnalyticsEvent.track({
        category: 'feature',
        action: 'test',
      });
      const after = new Date();

      expect(event.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(event.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should set default feature to "other"', async () => {
      const event = await AnalyticsEvent.track({
        category: 'feature',
        action: 'unknown_action',
      });

      expect(event.feature).toBe('other');
    });

    it('should track page_view events', async () => {
      const event = await AnalyticsEvent.track({
        category: 'page_view',
        action: 'view',
        page: '/app/notes',
        duration: 30000,
      });

      expect(event.category).toBe('page_view');
      expect(event.page).toBe('/app/notes');
    });

    it('should track search events with metadata', async () => {
      const event = await AnalyticsEvent.track({
        category: 'search',
        action: 'search',
        feature: 'search',
        metadata: { query: 'meeting notes', resultsCount: 5 },
      });

      expect(event.category).toBe('search');
      expect(event.metadata.query).toBe('meeting notes');
      expect(event.metadata.resultsCount).toBe(5);
    });

    it('should track error events', async () => {
      const event = await AnalyticsEvent.track({
        category: 'error',
        action: 'api_error',
        metadata: { errorCode: 500, endpoint: '/api/notes' },
      });

      expect(event.category).toBe('error');
      expect(event.metadata.errorCode).toBe(500);
    });

    it('should track auth events', async () => {
      const event = await AnalyticsEvent.track({
        category: 'auth',
        action: 'login_success',
        feature: 'auth',
      });

      expect(event.category).toBe('auth');
      expect(event.action).toBe('login_success');
    });

    it('should track settings events', async () => {
      const event = await AnalyticsEvent.track({
        category: 'settings',
        action: 'theme_change',
        feature: 'settings',
        metadata: { theme: 'dark' },
      });

      expect(event.category).toBe('settings');
      expect(event.metadata.theme).toBe('dark');
    });

    it('should track navigation events', async () => {
      const event = await AnalyticsEvent.track({
        category: 'navigation',
        action: 'sidebar_click',
        metadata: { destination: '/app/tasks' },
      });

      expect(event.category).toBe('navigation');
    });

    it('should track engagement events', async () => {
      const event = await AnalyticsEvent.track({
        category: 'engagement',
        action: 'scroll_depth',
        metadata: { depth: 75 },
      });

      expect(event.category).toBe('engagement');
      expect(event.metadata.depth).toBe(75);
    });
  });

  // =============================================================================
  // TEST SUITE: FEATURE USAGE ANALYTICS
  // =============================================================================

  describe('getFeatureUsage()', () => {
    it('should return empty array when no events exist', async () => {
      const startDate = daysAgo(7);
      const endDate = new Date();

      const usage = await AnalyticsEvent.getFeatureUsage(startDate, endDate);

      expect(usage).toEqual([]);
    });

    it('should aggregate events by feature', async () => {
      const userId1 = createUserId();
      const userId2 = createUserId();

      // Create events for different features
      await createTestEvent({ userId: userId1, feature: 'notes', category: 'feature' });
      await createTestEvent({ userId: userId1, feature: 'notes', category: 'feature' });
      await createTestEvent({ userId: userId2, feature: 'notes', category: 'feature' });
      await createTestEvent({ userId: userId1, feature: 'tasks', category: 'feature' });

      const startDate = daysAgo(1);
      const endDate = new Date();
      const usage = await AnalyticsEvent.getFeatureUsage(startDate, endDate);

      const notesUsage = usage.find(u => u.feature === 'notes');
      const tasksUsage = usage.find(u => u.feature === 'tasks');

      expect(notesUsage).toBeDefined();
      expect(notesUsage.count).toBe(3);
      expect(notesUsage.uniqueUsers).toBe(2);

      expect(tasksUsage).toBeDefined();
      expect(tasksUsage.count).toBe(1);
      expect(tasksUsage.uniqueUsers).toBe(1);
    });

    it('should only count feature category events', async () => {
      await createTestEvent({ category: 'feature', feature: 'notes' });
      await createTestEvent({ category: 'page_view', feature: 'notes' });

      const startDate = daysAgo(1);
      const endDate = new Date();
      const usage = await AnalyticsEvent.getFeatureUsage(startDate, endDate);

      const notesUsage = usage.find(u => u.feature === 'notes');
      expect(notesUsage.count).toBe(1);
    });

    it('should filter by date range', async () => {
      // Event within range
      await createTestEvent({
        category: 'feature',
        feature: 'notes',
        timestamp: daysAgo(3),
      });

      // Event outside range
      await createTestEvent({
        category: 'feature',
        feature: 'tasks',
        timestamp: daysAgo(10),
      });

      const startDate = daysAgo(7);
      const endDate = new Date();
      const usage = await AnalyticsEvent.getFeatureUsage(startDate, endDate);

      expect(usage.length).toBe(1);
      expect(usage[0].feature).toBe('notes');
    });

    it('should sort by most used features', async () => {
      await createTestEvent({ category: 'feature', feature: 'calendar' });
      await createTestEvent({ category: 'feature', feature: 'notes' });
      await createTestEvent({ category: 'feature', feature: 'notes' });
      await createTestEvent({ category: 'feature', feature: 'notes' });
      await createTestEvent({ category: 'feature', feature: 'tasks' });
      await createTestEvent({ category: 'feature', feature: 'tasks' });

      const startDate = daysAgo(1);
      const endDate = new Date();
      const usage = await AnalyticsEvent.getFeatureUsage(startDate, endDate);

      expect(usage[0].feature).toBe('notes');
      expect(usage[1].feature).toBe('tasks');
      expect(usage[2].feature).toBe('calendar');
    });

    it('should count anonymous events (null userId) in uniqueUsers', async () => {
      await createTestEvent({ category: 'feature', feature: 'notes', userId: null });
      await createTestEvent({ category: 'feature', feature: 'notes', userId: null });

      const startDate = daysAgo(1);
      const endDate = new Date();
      const usage = await AnalyticsEvent.getFeatureUsage(startDate, endDate);

      // Two events with null userId should count as 1 unique user (null)
      expect(usage[0].count).toBe(2);
      expect(usage[0].uniqueUsers).toBe(1);
    });
  });

  // =============================================================================
  // TEST SUITE: POPULAR ACTIONS
  // =============================================================================

  describe('getPopularActions()', () => {
    it('should return empty array when no events exist', async () => {
      const startDate = daysAgo(7);
      const endDate = new Date();

      const actions = await AnalyticsEvent.getPopularActions(startDate, endDate);

      expect(actions).toEqual([]);
    });

    it('should aggregate actions by feature and action combination', async () => {
      const userId = createUserId();

      await createTestEvent({ userId, category: 'feature', feature: 'notes', action: 'create_note' });
      await createTestEvent({ userId, category: 'feature', feature: 'notes', action: 'create_note' });
      await createTestEvent({ userId, category: 'feature', feature: 'notes', action: 'view_note' });
      await createTestEvent({ userId, category: 'feature', feature: 'tasks', action: 'complete_task' });

      const startDate = daysAgo(1);
      const endDate = new Date();
      const actions = await AnalyticsEvent.getPopularActions(startDate, endDate);

      const createNote = actions.find(a => a.action === 'create_note');
      expect(createNote).toBeDefined();
      expect(createNote.count).toBe(2);
      expect(createNote.feature).toBe('notes');
    });

    it('should respect the limit parameter', async () => {
      // Create many different actions
      for (let i = 0; i < 30; i++) {
        await createTestEvent({
          category: 'feature',
          feature: 'notes',
          action: `action_${i}`,
        });
      }

      const startDate = daysAgo(1);
      const endDate = new Date();

      const actionsDefault = await AnalyticsEvent.getPopularActions(startDate, endDate);
      expect(actionsDefault.length).toBe(20); // Default limit

      const actionsLimited = await AnalyticsEvent.getPopularActions(startDate, endDate, 5);
      expect(actionsLimited.length).toBe(5);
    });

    it('should sort by most popular actions', async () => {
      const userId = createUserId();

      // Create actions with different counts
      for (let i = 0; i < 5; i++) {
        await createTestEvent({ userId, category: 'feature', feature: 'notes', action: 'view_note' });
      }
      for (let i = 0; i < 3; i++) {
        await createTestEvent({ userId, category: 'feature', feature: 'notes', action: 'create_note' });
      }
      await createTestEvent({ userId, category: 'feature', feature: 'notes', action: 'delete_note' });

      const startDate = daysAgo(1);
      const endDate = new Date();
      const actions = await AnalyticsEvent.getPopularActions(startDate, endDate);

      expect(actions[0].action).toBe('view_note');
      expect(actions[0].count).toBe(5);
      expect(actions[1].action).toBe('create_note');
      expect(actions[1].count).toBe(3);
      expect(actions[2].action).toBe('delete_note');
      expect(actions[2].count).toBe(1);
    });

    it('should only count feature category events', async () => {
      await createTestEvent({ category: 'feature', feature: 'notes', action: 'create' });
      await createTestEvent({ category: 'page_view', feature: 'notes', action: 'view' });

      const startDate = daysAgo(1);
      const endDate = new Date();
      const actions = await AnalyticsEvent.getPopularActions(startDate, endDate);

      expect(actions.length).toBe(1);
      expect(actions[0].action).toBe('create');
    });

    it('should count unique users per action', async () => {
      const userId1 = createUserId();
      const userId2 = createUserId();
      const userId3 = createUserId();

      await createTestEvent({ userId: userId1, category: 'feature', feature: 'notes', action: 'create_note' });
      await createTestEvent({ userId: userId2, category: 'feature', feature: 'notes', action: 'create_note' });
      await createTestEvent({ userId: userId3, category: 'feature', feature: 'notes', action: 'create_note' });
      await createTestEvent({ userId: userId1, category: 'feature', feature: 'notes', action: 'create_note' }); // Same user

      const startDate = daysAgo(1);
      const endDate = new Date();
      const actions = await AnalyticsEvent.getPopularActions(startDate, endDate);

      expect(actions[0].count).toBe(4);
      expect(actions[0].uniqueUsers).toBe(3);
    });
  });

  // =============================================================================
  // TEST SUITE: DAILY ACTIVE USERS
  // =============================================================================

  describe('getDailyActiveUsers()', () => {
    it('should return empty array when no events exist', async () => {
      const startDate = daysAgo(7);
      const endDate = new Date();

      const dau = await AnalyticsEvent.getDailyActiveUsers(startDate, endDate);

      expect(dau).toEqual([]);
    });

    it('should count unique users per day', async () => {
      const userId1 = createUserId();
      const userId2 = createUserId();
      const now = new Date();

      // Multiple events from same user on same day should count as 1
      await createTestEvent({ userId: userId1, timestamp: now });
      await createTestEvent({ userId: userId1, timestamp: now });
      await createTestEvent({ userId: userId2, timestamp: now });

      const startDate = daysAgo(1);
      const endDate = new Date();
      endDate.setHours(23, 59, 59, 999); // End of today
      const dau = await AnalyticsEvent.getDailyActiveUsers(startDate, endDate);

      expect(dau.length).toBeGreaterThanOrEqual(1);
      // Find today's entry
      const todayEntry = dau[dau.length - 1]; // Last entry is most recent
      expect(todayEntry.count).toBe(2); // 2 unique users
    });

    it('should exclude anonymous events', async () => {
      const userId = createUserId();

      await createTestEvent({ userId, timestamp: new Date() });
      await createTestEvent({ userId: null, timestamp: new Date() });

      const startDate = daysAgo(1);
      const endDate = new Date();
      const dau = await AnalyticsEvent.getDailyActiveUsers(startDate, endDate);

      expect(dau[0].count).toBe(1);
    });

    it('should group by date correctly', async () => {
      const userId = createUserId();

      // Events on different days
      const day1 = daysAgo(2);
      const day2 = daysAgo(1);
      const day3 = new Date();

      await createTestEvent({ userId, timestamp: day1 });
      await createTestEvent({ userId, timestamp: day2 });
      await createTestEvent({ userId, timestamp: day3 });

      const startDate = daysAgo(7);
      const endDate = new Date();
      const dau = await AnalyticsEvent.getDailyActiveUsers(startDate, endDate);

      expect(dau.length).toBe(3); // 3 different days
    });

    it('should sort results chronologically', async () => {
      const userId = createUserId();

      await createTestEvent({ userId, timestamp: daysAgo(3) });
      await createTestEvent({ userId, timestamp: daysAgo(1) });
      await createTestEvent({ userId, timestamp: daysAgo(5) });

      const startDate = daysAgo(7);
      const endDate = new Date();
      const dau = await AnalyticsEvent.getDailyActiveUsers(startDate, endDate);

      // Should be sorted oldest to newest
      const dates = dau.map(d => d.date);
      expect(dates).toEqual([...dates].sort());
    });

    it('should filter by date range', async () => {
      const userId = createUserId();

      await createTestEvent({ userId, timestamp: daysAgo(3) }); // Within range
      await createTestEvent({ userId, timestamp: daysAgo(10) }); // Outside range

      const startDate = daysAgo(7);
      const endDate = new Date();
      const dau = await AnalyticsEvent.getDailyActiveUsers(startDate, endDate);

      expect(dau.length).toBe(1);
    });
  });

  // =============================================================================
  // TEST SUITE: PAGE VIEWS
  // =============================================================================

  describe('getPageViews()', () => {
    it('should return empty array when no page views exist', async () => {
      const startDate = daysAgo(7);
      const endDate = new Date();

      const views = await AnalyticsEvent.getPageViews(startDate, endDate);

      expect(views).toEqual([]);
    });

    it('should aggregate page views by page', async () => {
      const userId1 = createUserId();
      const userId2 = createUserId();

      await createTestEvent({ userId: userId1, category: 'page_view', page: '/app', action: 'view' });
      await createTestEvent({ userId: userId1, category: 'page_view', page: '/app', action: 'view' });
      await createTestEvent({ userId: userId2, category: 'page_view', page: '/app', action: 'view' });
      await createTestEvent({ userId: userId1, category: 'page_view', page: '/app/notes', action: 'view' });

      const startDate = daysAgo(1);
      const endDate = new Date();
      const views = await AnalyticsEvent.getPageViews(startDate, endDate);

      const appViews = views.find(v => v.page === '/app');
      const notesViews = views.find(v => v.page === '/app/notes');

      expect(appViews).toBeDefined();
      expect(appViews.count).toBe(3);
      expect(appViews.uniqueUsers).toBe(2);

      expect(notesViews).toBeDefined();
      expect(notesViews.count).toBe(1);
    });

    it('should calculate average duration', async () => {
      const userId = createUserId();

      await createTestEvent({ userId, category: 'page_view', page: '/app', action: 'view', duration: 30000 });
      await createTestEvent({ userId, category: 'page_view', page: '/app', action: 'view', duration: 60000 });
      await createTestEvent({ userId, category: 'page_view', page: '/app', action: 'view', duration: 90000 });

      const startDate = daysAgo(1);
      const endDate = new Date();
      const views = await AnalyticsEvent.getPageViews(startDate, endDate);

      expect(views[0].avgDuration).toBe(60000); // Average of 30k, 60k, 90k
    });

    it('should handle null duration values', async () => {
      const userId = createUserId();

      await createTestEvent({ userId, category: 'page_view', page: '/app', action: 'view', duration: null });
      await createTestEvent({ userId, category: 'page_view', page: '/app', action: 'view', duration: 60000 });

      const startDate = daysAgo(1);
      const endDate = new Date();
      const views = await AnalyticsEvent.getPageViews(startDate, endDate);

      // MongoDB $avg ignores null values
      expect(views[0].avgDuration).toBe(60000);
    });

    it('should only count page_view category events', async () => {
      await createTestEvent({ category: 'page_view', page: '/app', action: 'view' });
      await createTestEvent({ category: 'feature', page: '/app', action: 'create' });

      const startDate = daysAgo(1);
      const endDate = new Date();
      const views = await AnalyticsEvent.getPageViews(startDate, endDate);

      expect(views.length).toBe(1);
      expect(views[0].count).toBe(1);
    });

    it('should sort by most views', async () => {
      await createTestEvent({ category: 'page_view', page: '/app/tasks', action: 'view' });
      await createTestEvent({ category: 'page_view', page: '/app', action: 'view' });
      await createTestEvent({ category: 'page_view', page: '/app', action: 'view' });
      await createTestEvent({ category: 'page_view', page: '/app', action: 'view' });
      await createTestEvent({ category: 'page_view', page: '/app/notes', action: 'view' });
      await createTestEvent({ category: 'page_view', page: '/app/notes', action: 'view' });

      const startDate = daysAgo(1);
      const endDate = new Date();
      const views = await AnalyticsEvent.getPageViews(startDate, endDate);

      expect(views[0].page).toBe('/app');
      expect(views[0].count).toBe(3);
      expect(views[1].page).toBe('/app/notes');
      expect(views[1].count).toBe(2);
    });
  });

  // =============================================================================
  // TEST SUITE: DEVICE BREAKDOWN
  // =============================================================================

  describe('getDeviceBreakdown()', () => {
    it('should return empty array when no events exist', async () => {
      const startDate = daysAgo(7);
      const endDate = new Date();

      const breakdown = await AnalyticsEvent.getDeviceBreakdown(startDate, endDate);

      expect(breakdown).toEqual([]);
    });

    it('should aggregate events by device type', async () => {
      const userId1 = createUserId();
      const userId2 = createUserId();

      await createTestEvent({ userId: userId1, deviceType: 'desktop' });
      await createTestEvent({ userId: userId1, deviceType: 'desktop' });
      await createTestEvent({ userId: userId2, deviceType: 'desktop' });
      await createTestEvent({ userId: userId1, deviceType: 'mobile' });
      await createTestEvent({ userId: userId2, deviceType: 'tablet' });

      const startDate = daysAgo(1);
      const endDate = new Date();
      const breakdown = await AnalyticsEvent.getDeviceBreakdown(startDate, endDate);

      const desktop = breakdown.find(d => d.deviceType === 'desktop');
      const mobile = breakdown.find(d => d.deviceType === 'mobile');
      const tablet = breakdown.find(d => d.deviceType === 'tablet');

      expect(desktop.count).toBe(3);
      expect(desktop.uniqueUsers).toBe(2);
      expect(mobile.count).toBe(1);
      expect(tablet.count).toBe(1);
    });

    it('should count unknown device types', async () => {
      await createTestEvent({ deviceType: 'unknown' });
      await createTestEvent({ deviceType: 'unknown' });

      const startDate = daysAgo(1);
      const endDate = new Date();
      const breakdown = await AnalyticsEvent.getDeviceBreakdown(startDate, endDate);

      const unknown = breakdown.find(d => d.deviceType === 'unknown');
      expect(unknown.count).toBe(2);
    });

    it('should sort by most events', async () => {
      await createTestEvent({ deviceType: 'tablet' });
      await createTestEvent({ deviceType: 'desktop' });
      await createTestEvent({ deviceType: 'desktop' });
      await createTestEvent({ deviceType: 'desktop' });
      await createTestEvent({ deviceType: 'mobile' });
      await createTestEvent({ deviceType: 'mobile' });

      const startDate = daysAgo(1);
      const endDate = new Date();
      const breakdown = await AnalyticsEvent.getDeviceBreakdown(startDate, endDate);

      expect(breakdown[0].deviceType).toBe('desktop');
      expect(breakdown[1].deviceType).toBe('mobile');
      expect(breakdown[2].deviceType).toBe('tablet');
    });

    it('should filter by date range', async () => {
      await createTestEvent({ deviceType: 'desktop', timestamp: daysAgo(3) });
      await createTestEvent({ deviceType: 'mobile', timestamp: daysAgo(10) });

      const startDate = daysAgo(7);
      const endDate = new Date();
      const breakdown = await AnalyticsEvent.getDeviceBreakdown(startDate, endDate);

      expect(breakdown.length).toBe(1);
      expect(breakdown[0].deviceType).toBe('desktop');
    });
  });

  // =============================================================================
  // TEST SUITE: HOURLY ACTIVITY
  // =============================================================================

  describe('getHourlyActivity()', () => {
    it('should return empty array when no events exist', async () => {
      const startDate = daysAgo(7);
      const endDate = new Date();

      const activity = await AnalyticsEvent.getHourlyActivity(startDate, endDate);

      expect(activity).toEqual([]);
    });

    it('should aggregate events by hour of day', async () => {
      // Use UTC times to avoid timezone issues with MongoDB aggregation
      const hour9 = new Date();
      hour9.setUTCHours(9, 0, 0, 0);

      const hour14 = new Date();
      hour14.setUTCHours(14, 0, 0, 0);

      // Events at 9 AM UTC
      await createTestEvent({ timestamp: hour9 });
      await createTestEvent({ timestamp: hour9 });
      await createTestEvent({ timestamp: hour9 });

      // Events at 2 PM UTC
      await createTestEvent({ timestamp: hour14 });
      await createTestEvent({ timestamp: hour14 });

      const startDate = daysAgo(1);
      const endDate = new Date();
      endDate.setHours(23, 59, 59, 999); // End of day

      const activity = await AnalyticsEvent.getHourlyActivity(startDate, endDate);

      // MongoDB $hour returns UTC hour
      const hour9Activity = activity.find(a => a.hour === 9);
      const hour14Activity = activity.find(a => a.hour === 14);

      expect(hour9Activity).toBeDefined();
      expect(hour9Activity.count).toBe(3);
      expect(hour14Activity).toBeDefined();
      expect(hour14Activity.count).toBe(2);
    });

    it('should sort by hour ascending', async () => {
      const now = new Date();

      const hour15 = new Date(now);
      hour15.setHours(15, 0, 0, 0);

      const hour3 = new Date(now);
      hour3.setHours(3, 0, 0, 0);

      const hour22 = new Date(now);
      hour22.setHours(22, 0, 0, 0);

      await createTestEvent({ timestamp: hour15 });
      await createTestEvent({ timestamp: hour3 });
      await createTestEvent({ timestamp: hour22 });

      const startDate = daysAgo(1);
      const endDate = new Date();
      endDate.setHours(23, 59, 59, 999);

      const activity = await AnalyticsEvent.getHourlyActivity(startDate, endDate);

      const hours = activity.map(a => a.hour);
      expect(hours).toEqual([...hours].sort((a, b) => a - b));
    });

    it('should filter by date range', async () => {
      const recentTime = new Date();
      recentTime.setHours(12, 0, 0, 0);

      const oldTime = daysAgo(10);
      oldTime.setHours(12, 0, 0, 0);

      await createTestEvent({ timestamp: recentTime });
      await createTestEvent({ timestamp: oldTime });

      const startDate = daysAgo(7);
      const endDate = new Date();
      endDate.setHours(23, 59, 59, 999);

      const activity = await AnalyticsEvent.getHourlyActivity(startDate, endDate);

      expect(activity.length).toBe(1);
    });
  });

  // =============================================================================
  // TEST SUITE: DATA INTEGRITY AND VALIDATION
  // =============================================================================

  describe('Data Integrity', () => {
    describe('Required fields', () => {
      it('should require category field', async () => {
        const eventPromise = AnalyticsEvent.create({
          action: 'test_action',
        });

        await expect(eventPromise).rejects.toThrow(/category.*required/i);
      });

      it('should require action field', async () => {
        const eventPromise = AnalyticsEvent.create({
          category: 'feature',
        });

        await expect(eventPromise).rejects.toThrow(/action.*required/i);
      });
    });

    describe('Enum validation', () => {
      it('should reject invalid category', async () => {
        const eventPromise = AnalyticsEvent.create({
          category: 'invalid_category',
          action: 'test',
        });

        await expect(eventPromise).rejects.toThrow();
      });

      it('should accept all valid categories', async () => {
        const categories = ['page_view', 'feature', 'engagement', 'navigation', 'search', 'error', 'auth', 'settings'];

        for (const category of categories) {
          const event = await AnalyticsEvent.create({
            category,
            action: 'test',
          });
          expect(event.category).toBe(category);
        }
      });

      it('should reject invalid device type', async () => {
        const eventPromise = AnalyticsEvent.create({
          category: 'feature',
          action: 'test',
          deviceType: 'smartwatch',
        });

        await expect(eventPromise).rejects.toThrow();
      });

      it('should accept all valid device types', async () => {
        const deviceTypes = ['desktop', 'tablet', 'mobile', 'unknown'];

        for (const deviceType of deviceTypes) {
          const event = await AnalyticsEvent.create({
            category: 'feature',
            action: `test_${deviceType}`,
            deviceType,
          });
          expect(event.deviceType).toBe(deviceType);
        }
      });

      it('should reject invalid feature', async () => {
        const eventPromise = AnalyticsEvent.create({
          category: 'feature',
          action: 'test',
          feature: 'invalid_feature',
        });

        await expect(eventPromise).rejects.toThrow();
      });

      it('should accept all valid features', async () => {
        const features = [
          'notes', 'tasks', 'calendar', 'events', 'projects',
          'life_areas', 'weather', 'search', 'inbox', 'dashboard',
          'profile', 'settings', 'admin', 'auth', 'tags', 'locations', 'other'
        ];

        for (const feature of features) {
          const event = await AnalyticsEvent.create({
            category: 'feature',
            action: `test_${feature}`,
            feature,
          });
          expect(event.feature).toBe(feature);
        }
      });
    });

    describe('Default values', () => {
      it('should set default feature to "other"', async () => {
        const event = await AnalyticsEvent.create({
          category: 'feature',
          action: 'test',
        });

        expect(event.feature).toBe('other');
      });

      it('should set default deviceType to "unknown"', async () => {
        const event = await AnalyticsEvent.create({
          category: 'feature',
          action: 'test',
        });

        expect(event.deviceType).toBe('unknown');
      });

      it('should set default userId to null', async () => {
        const event = await AnalyticsEvent.create({
          category: 'feature',
          action: 'test',
        });

        expect(event.userId).toBeNull();
      });

      it('should set default metadata to empty object', async () => {
        const event = await AnalyticsEvent.create({
          category: 'feature',
          action: 'test',
        });

        expect(event.metadata).toEqual({});
      });

      it('should set default duration to null', async () => {
        const event = await AnalyticsEvent.create({
          category: 'feature',
          action: 'test',
        });

        expect(event.duration).toBeNull();
      });
    });

    describe('Timestamps', () => {
      it('should automatically set createdAt and updatedAt', async () => {
        const event = await AnalyticsEvent.create({
          category: 'feature',
          action: 'test',
        });

        expect(event.createdAt).toBeDefined();
        expect(event.updatedAt).toBeDefined();
        expect(event.createdAt).toBeInstanceOf(Date);
        expect(event.updatedAt).toBeInstanceOf(Date);
      });

      it('should set timestamp to current time by default', async () => {
        const before = new Date();
        const event = await AnalyticsEvent.create({
          category: 'feature',
          action: 'test',
        });
        const after = new Date();

        expect(event.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
        expect(event.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
      });

      it('should allow custom timestamp', async () => {
        const customTime = daysAgo(5);
        const event = await AnalyticsEvent.create({
          category: 'feature',
          action: 'test',
          timestamp: customTime,
        });

        expect(event.timestamp.getTime()).toBe(customTime.getTime());
      });
    });

    describe('Mixed type metadata', () => {
      it('should store complex metadata objects', async () => {
        const event = await AnalyticsEvent.create({
          category: 'search',
          action: 'search',
          metadata: {
            query: 'meeting',
            filters: {
              dateRange: { start: '2024-01-01', end: '2024-12-31' },
              tags: ['work', 'important'],
            },
            resultsCount: 42,
            searchTime: 150,
          },
        });

        expect(event.metadata.query).toBe('meeting');
        expect(event.metadata.filters.tags).toEqual(['work', 'important']);
        expect(event.metadata.resultsCount).toBe(42);
      });

      it('should store arrays in metadata', async () => {
        const event = await AnalyticsEvent.create({
          category: 'feature',
          action: 'bulk_action',
          metadata: {
            itemIds: ['id1', 'id2', 'id3'],
            count: 3,
          },
        });

        expect(event.metadata.itemIds.length).toBe(3);
      });
    });

    describe('Screen size', () => {
      it('should store screen dimensions', async () => {
        const event = await AnalyticsEvent.create({
          category: 'page_view',
          action: 'view',
          screenSize: { width: 1920, height: 1080 },
        });

        expect(event.screenSize.width).toBe(1920);
        expect(event.screenSize.height).toBe(1080);
      });
    });
  });

  // =============================================================================
  // TEST SUITE: EDGE CASES
  // =============================================================================

  describe('Edge Cases', () => {
    it('should handle events at exact boundary dates', async () => {
      const startDate = new Date('2024-01-01T00:00:00.000Z');
      const endDate = new Date('2024-01-31T23:59:59.999Z');

      // Event at exact start
      await createTestEvent({
        category: 'feature',
        feature: 'notes',
        timestamp: startDate,
      });

      // Event at exact end
      await createTestEvent({
        category: 'feature',
        feature: 'tasks',
        timestamp: endDate,
      });

      const usage = await AnalyticsEvent.getFeatureUsage(startDate, endDate);

      expect(usage.length).toBe(2);
    });

    it('should handle large number of events', async () => {
      const userId = createUserId();

      // Create 100 events
      const events = [];
      for (let i = 0; i < 100; i++) {
        events.push({
          userId,
          category: 'feature',
          action: `action_${i % 10}`,
          feature: ['notes', 'tasks', 'calendar'][i % 3],
          timestamp: new Date(),
        });
      }
      await AnalyticsEvent.insertMany(events);

      const startDate = daysAgo(1);
      const endDate = new Date();
      const usage = await AnalyticsEvent.getFeatureUsage(startDate, endDate);

      expect(usage.length).toBe(3); // 3 features
      const totalCount = usage.reduce((sum, u) => sum + u.count, 0);
      expect(totalCount).toBe(100);
    });

    it('should handle same user on multiple devices', async () => {
      const userId = createUserId();

      await createTestEvent({ userId, deviceType: 'desktop' });
      await createTestEvent({ userId, deviceType: 'mobile' });
      await createTestEvent({ userId, deviceType: 'tablet' });

      const startDate = daysAgo(1);
      const endDate = new Date();
      const breakdown = await AnalyticsEvent.getDeviceBreakdown(startDate, endDate);

      // Each device type should have 1 unique user (same user)
      expect(breakdown.length).toBe(3);
      breakdown.forEach(d => {
        expect(d.uniqueUsers).toBe(1);
      });
    });

    it('should handle events with same timestamp', async () => {
      const exactTime = new Date();
      const userId = createUserId();

      await createTestEvent({ userId, category: 'feature', feature: 'notes', timestamp: exactTime });
      await createTestEvent({ userId, category: 'feature', feature: 'notes', timestamp: exactTime });
      await createTestEvent({ userId, category: 'feature', feature: 'notes', timestamp: exactTime });

      const startDate = daysAgo(1);
      const endDate = new Date();
      const usage = await AnalyticsEvent.getFeatureUsage(startDate, endDate);

      expect(usage[0].count).toBe(3);
    });

    it('should handle empty sessionId', async () => {
      const event = await AnalyticsEvent.create({
        category: 'feature',
        action: 'test',
        sessionId: '',
      });

      expect(event.sessionId).toBe('');
    });
  });
});
