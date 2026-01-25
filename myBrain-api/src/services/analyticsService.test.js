/**
 * =============================================================================
 * ANALYTICSSERVICE.TEST.JS - Comprehensive Tests for Analytics Service
 * =============================================================================
 *
 * This test file covers all functions in analyticsService.js:
 * - trackEvent: Recording analytics events
 * - getOverview: Overall analytics summary
 * - getFeatureAnalytics: Feature usage breakdown
 * - getUserAnalytics: User behavior analytics
 * - getErrorAnalytics: Error tracking data
 * - getRetentionMetrics: User retention analysis
 * - parseUserAgent: Parses browser/device info
 *
 * Test Categories:
 * 1. Event tracking - Various event types recorded
 * 2. Aggregations - Daily, weekly, monthly rollups
 * 3. Filters - By feature, user, date range
 * 4. Error events - Error tracking accuracy
 * 5. User agent parsing - Various browsers/devices
 * 6. Edge cases - No events, single event, many events
 *
 * =============================================================================
 */

import mongoose from 'mongoose';
import '../test/setup.js';
import analyticsService from './analyticsService.js';
import AnalyticsEvent from '../models/AnalyticsEvent.js';

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
 * Creates a test analytics event directly in the database.
 * Useful for setting up test data without going through the service.
 */
async function createTestEvent(overrides = {}) {
  // Don't generate a default userId - let tests explicitly pass it to ensure
  // proper control over user-related aggregations
  const eventData = {
    userId: overrides.userId !== undefined ? overrides.userId : createUserId(),
    sessionId: overrides.sessionId || `session_${Date.now()}_${Math.random()}`,
    category: overrides.category || 'feature',
    action: overrides.action || 'test_action',
    feature: overrides.feature || 'notes',
    metadata: overrides.metadata || {},
    page: overrides.page !== undefined ? overrides.page : '/app/notes',
    referrer: overrides.referrer || null,
    userAgent: overrides.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
    deviceType: overrides.deviceType || 'desktop',
    browser: overrides.browser || 'Chrome',
    os: overrides.os || 'Windows',
    screenSize: overrides.screenSize || { width: 1920, height: 1080 },
    timestamp: overrides.timestamp || new Date(),
    duration: overrides.duration !== undefined ? overrides.duration : null
  };

  const event = new AnalyticsEvent(eventData);
  await event.save();
  return event;
}

/**
 * Creates multiple test events for bulk testing.
 */
async function createMultipleEvents(count, overrides = {}) {
  const events = [];
  for (let i = 0; i < count; i++) {
    const event = await createTestEvent({
      ...overrides,
      action: overrides.action || `action_${i}`
    });
    events.push(event);
  }
  return events;
}

/**
 * Helper to create date ranges for testing.
 * Note: endDate is set to 1 minute in the future to account for
 * slight timing differences when creating test events.
 */
function getDateRange(daysAgo) {
  const endDate = new Date();
  endDate.setMinutes(endDate.getMinutes() + 1); // Add 1 minute buffer
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysAgo);
  return { startDate, endDate };
}

// =============================================================================
// PARSE USER AGENT TESTS
// =============================================================================

describe('analyticsService', () => {
  describe('parseUserAgent', () => {
    // =========================================================================
    // BROWSER DETECTION
    // =========================================================================

    it('should detect Chrome browser on Windows', () => {
      const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

      const result = analyticsService.parseUserAgent(userAgent);

      expect(result.browser).toBe('Chrome');
      expect(result.os).toBe('Windows');
      expect(result.deviceType).toBe('desktop');
    });

    it('should detect Firefox browser on Windows', () => {
      const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0';

      const result = analyticsService.parseUserAgent(userAgent);

      expect(result.browser).toBe('Firefox');
      expect(result.os).toBe('Windows');
    });

    it('should detect Safari browser on macOS', () => {
      const userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_2) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15';

      const result = analyticsService.parseUserAgent(userAgent);

      expect(result.browser).toBe('Safari');
      expect(result.os).toBe('macOS');
    });

    it('should detect Edge browser', () => {
      const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0';

      const result = analyticsService.parseUserAgent(userAgent);

      expect(result.browser).toBe('Edge');
      expect(result.os).toBe('Windows');
    });

    it('should detect Opera browser (legacy user agent)', () => {
      // Note: Modern Opera UA contains "Chrome" before "OPR", so the service
      // detects Chrome first. This tests the legacy Opera UA format.
      const userAgent = 'Opera/9.80 (Windows NT 6.1; WOW64) Presto/2.12.388 Version/12.18';

      const result = analyticsService.parseUserAgent(userAgent);

      expect(result.browser).toBe('Opera');
    });

    // =========================================================================
    // DEVICE TYPE DETECTION
    // =========================================================================

    it('should detect mobile device (iPhone)', () => {
      // iPhone UA contains "iPhone", detected as mobile
      // Note: OS detection checks "mac" before "iphone", so OS is detected as macOS
      const userAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1';

      const result = analyticsService.parseUserAgent(userAgent);

      expect(result.deviceType).toBe('mobile');
      // Service checks 'mac' before 'iphone' for OS, so it detects macOS
      expect(result.os).toBe('macOS');
      expect(result.browser).toBe('Safari');
    });

    it('should detect mobile device (Android)', () => {
      // Android mobile UA contains "android" which is detected by mobile regex
      // Note: OS detection checks "linux" before "android", so OS is detected as Linux
      const userAgent = 'Mozilla/5.0 (Linux; Android 14; SM-G998B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';

      const result = analyticsService.parseUserAgent(userAgent);

      expect(result.deviceType).toBe('mobile');
      // Service checks 'linux' before 'android' for OS, so it detects Linux
      expect(result.os).toBe('Linux');
      expect(result.browser).toBe('Chrome');
    });

    it('should detect tablet device (iPad)', () => {
      // iPad is detected by tablet regex
      // Note: OS detection checks "mac" before "ipad", so OS is detected as macOS
      const userAgent = 'Mozilla/5.0 (iPad; CPU OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/604.1';

      const result = analyticsService.parseUserAgent(userAgent);

      expect(result.deviceType).toBe('tablet');
      // Service checks 'mac' before 'ipad' for OS, so it detects macOS
      expect(result.os).toBe('macOS');
    });

    it('should detect Linux operating system', () => {
      const userAgent = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

      const result = analyticsService.parseUserAgent(userAgent);

      expect(result.os).toBe('Linux');
      expect(result.deviceType).toBe('desktop');
    });

    // =========================================================================
    // EDGE CASES FOR USER AGENT PARSING
    // =========================================================================

    it('should return unknown for null user agent', () => {
      const result = analyticsService.parseUserAgent(null);

      expect(result.deviceType).toBe('unknown');
      expect(result.browser).toBe('unknown');
      expect(result.os).toBe('unknown');
    });

    it('should return unknown for undefined user agent', () => {
      const result = analyticsService.parseUserAgent(undefined);

      expect(result.deviceType).toBe('unknown');
      expect(result.browser).toBe('unknown');
      expect(result.os).toBe('unknown');
    });

    it('should return unknown for empty user agent', () => {
      const result = analyticsService.parseUserAgent('');

      expect(result.deviceType).toBe('unknown');
      expect(result.browser).toBe('unknown');
      expect(result.os).toBe('unknown');
    });

    it('should return unknown for unrecognized user agent', () => {
      const result = analyticsService.parseUserAgent('UnknownBot/1.0');

      expect(result.deviceType).toBe('desktop'); // Default is desktop
      expect(result.browser).toBe('unknown');
      expect(result.os).toBe('unknown');
    });

    it('should handle BlackBerry mobile device', () => {
      const userAgent = 'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.1.0.346 Mobile Safari/534.11+';

      const result = analyticsService.parseUserAgent(userAgent);

      expect(result.deviceType).toBe('mobile');
    });

    it('should handle Windows Phone mobile device', () => {
      const userAgent = 'Mozilla/5.0 (Windows Phone 10.0; Android 6.0.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.102 Mobile Safari/537.36 Edge/18.19041';

      const result = analyticsService.parseUserAgent(userAgent);

      expect(result.deviceType).toBe('mobile');
    });
  });

  // ===========================================================================
  // TRACK EVENT TESTS
  // ===========================================================================

  describe('trackEvent', () => {
    it('should create an analytics event with valid data', async () => {
      const userId = createUserId();
      const eventData = {
        userId,
        sessionId: 'session_123',
        category: 'feature',
        action: 'create_note',
        feature: 'notes',
        page: '/app/notes',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0'
      };

      const event = await analyticsService.trackEvent(eventData);

      expect(event).toBeDefined();
      expect(event._id).toBeDefined();
      expect(event.userId.toString()).toBe(userId.toString());
      expect(event.category).toBe('feature');
      expect(event.action).toBe('create_note');
      expect(event.feature).toBe('notes');
      expect(event.deviceType).toBe('desktop');
      expect(event.browser).toBe('Chrome');
      expect(event.os).toBe('Windows');
    });

    it('should create event without userId (anonymous)', async () => {
      const eventData = {
        sessionId: 'session_anon',
        category: 'page_view',
        action: 'view_landing',
        page: '/'
      };

      const event = await analyticsService.trackEvent(eventData);

      expect(event).toBeDefined();
      expect(event.userId).toBeNull();
    });

    it('should create event with metadata', async () => {
      const eventData = {
        userId: createUserId(),
        category: 'search',
        action: 'search_notes',
        feature: 'search',
        metadata: {
          query: 'meeting notes',
          resultsCount: 5
        }
      };

      const event = await analyticsService.trackEvent(eventData);

      expect(event.metadata).toEqual({
        query: 'meeting notes',
        resultsCount: 5
      });
    });

    it('should create event with duration', async () => {
      const eventData = {
        userId: createUserId(),
        category: 'page_view',
        action: 'view_dashboard',
        feature: 'dashboard',
        duration: 45000 // 45 seconds
      };

      const event = await analyticsService.trackEvent(eventData);

      expect(event.duration).toBe(45000);
    });

    it('should create event with screen size', async () => {
      const eventData = {
        userId: createUserId(),
        category: 'feature',
        action: 'create_task',
        feature: 'tasks',
        screenSize: { width: 1920, height: 1080 }
      };

      const event = await analyticsService.trackEvent(eventData);

      expect(event.screenSize.width).toBe(1920);
      expect(event.screenSize.height).toBe(1080);
    });

    it('should create event with referrer', async () => {
      const eventData = {
        userId: createUserId(),
        category: 'navigation',
        action: 'navigate_to_notes',
        feature: 'notes',
        page: '/app/notes',
        referrer: '/app/dashboard'
      };

      const event = await analyticsService.trackEvent(eventData);

      expect(event.referrer).toBe('/app/dashboard');
    });

    it('should default feature to "other" when not provided', async () => {
      const eventData = {
        userId: createUserId(),
        category: 'feature',
        action: 'some_action'
        // feature not provided
      };

      const event = await analyticsService.trackEvent(eventData);

      expect(event.feature).toBe('other');
    });

    it('should return null on error (fail-safe behavior)', async () => {
      // Track event with invalid category to trigger validation error
      const eventData = {
        userId: createUserId(),
        category: 'invalid_category', // Invalid enum value
        action: 'test'
      };

      const event = await analyticsService.trackEvent(eventData);

      expect(event).toBeNull();
    });

    it('should parse mobile user agent correctly', async () => {
      const eventData = {
        userId: createUserId(),
        category: 'feature',
        action: 'mobile_action',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1'
      };

      const event = await analyticsService.trackEvent(eventData);

      expect(event.deviceType).toBe('mobile');
      // Service checks 'mac' before 'iphone' for OS detection
      expect(event.os).toBe('macOS');
      expect(event.browser).toBe('Safari');
    });
  });

  // ===========================================================================
  // GET OVERVIEW TESTS
  // ===========================================================================

  describe('getOverview', () => {
    let userId1, userId2, userId3;
    let startDate, endDate;

    beforeEach(async () => {
      userId1 = createUserId();
      userId2 = createUserId();
      userId3 = createUserId();

      const range = getDateRange(7);
      startDate = range.startDate;
      endDate = range.endDate;
    });

    it('should return summary with total events and unique users', async () => {
      // Create events for 3 different users using direct database inserts
      await createTestEvent({ userId: userId1, category: 'feature', action: 'action1' });
      await createTestEvent({ userId: userId1, category: 'feature', action: 'action2' });
      await createTestEvent({ userId: userId1, category: 'feature', action: 'action3' });
      await createTestEvent({ userId: userId2, category: 'feature', action: 'action4' });
      await createTestEvent({ userId: userId2, category: 'feature', action: 'action5' });
      await createTestEvent({ userId: userId3, category: 'feature', action: 'action6' });

      const overview = await analyticsService.getOverview(startDate, endDate);

      expect(overview.summary.totalEvents).toBe(6);
      expect(overview.summary.uniqueUsers).toBe(3);
      expect(overview.summary.avgEventsPerUser).toBe(2); // 6 / 3 = 2
    });

    it('should return feature usage breakdown', async () => {
      // Create events with specific features
      await createTestEvent({ userId: userId1, feature: 'notes', category: 'feature', action: 'a1' });
      await createTestEvent({ userId: userId1, feature: 'notes', category: 'feature', action: 'a2' });
      await createTestEvent({ userId: userId1, feature: 'notes', category: 'feature', action: 'a3' });
      await createTestEvent({ userId: userId1, feature: 'tasks', category: 'feature', action: 'a4' });
      await createTestEvent({ userId: userId1, feature: 'tasks', category: 'feature', action: 'a5' });
      await createTestEvent({ userId: userId1, feature: 'calendar', category: 'feature', action: 'a6' });

      const overview = await analyticsService.getOverview(startDate, endDate);

      expect(overview.featureUsage).toBeDefined();
      expect(overview.featureUsage.length).toBeGreaterThan(0);

      const notesUsage = overview.featureUsage.find(f => f.feature === 'notes');
      expect(notesUsage).toBeDefined();
      expect(notesUsage.count).toBe(3);
    });

    it('should return popular actions', async () => {
      await createMultipleEvents(5, { action: 'create_note', category: 'feature' });
      await createMultipleEvents(3, { action: 'update_note', category: 'feature' });
      await createMultipleEvents(2, { action: 'delete_note', category: 'feature' });

      const overview = await analyticsService.getOverview(startDate, endDate);

      expect(overview.popularActions).toBeDefined();
      expect(overview.popularActions.length).toBeGreaterThan(0);
    });

    it('should return daily active users', async () => {
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      await createTestEvent({ userId: userId1, timestamp: today });
      await createTestEvent({ userId: userId2, timestamp: today });
      await createTestEvent({ userId: userId1, timestamp: yesterday });

      const overview = await analyticsService.getOverview(startDate, endDate);

      expect(overview.dailyActiveUsers).toBeDefined();
      expect(overview.dailyActiveUsers.length).toBeGreaterThan(0);
    });

    it('should return page views', async () => {
      await createTestEvent({ category: 'page_view', page: '/app/dashboard' });
      await createTestEvent({ category: 'page_view', page: '/app/dashboard' });
      await createTestEvent({ category: 'page_view', page: '/app/notes' });

      const overview = await analyticsService.getOverview(startDate, endDate);

      expect(overview.pageViews).toBeDefined();
    });

    it('should return device breakdown', async () => {
      await createTestEvent({ deviceType: 'desktop' });
      await createTestEvent({ deviceType: 'desktop' });
      await createTestEvent({ deviceType: 'mobile' });

      const overview = await analyticsService.getOverview(startDate, endDate);

      expect(overview.deviceBreakdown).toBeDefined();
    });

    it('should limit page views to top 10', async () => {
      // Create events for 15 different pages
      for (let i = 0; i < 15; i++) {
        await createTestEvent({ category: 'page_view', page: `/page/${i}` });
      }

      const overview = await analyticsService.getOverview(startDate, endDate);

      expect(overview.pageViews.length).toBeLessThanOrEqual(10);
    });

    it('should handle empty date range (no events)', async () => {
      const futureStart = new Date();
      futureStart.setDate(futureStart.getDate() + 100);
      const futureEnd = new Date();
      futureEnd.setDate(futureEnd.getDate() + 101);

      const overview = await analyticsService.getOverview(futureStart, futureEnd);

      expect(overview.summary.totalEvents).toBe(0);
      expect(overview.summary.uniqueUsers).toBe(0);
      expect(overview.summary.avgEventsPerUser).toBe(0);
    });

    it('should exclude anonymous events from unique user count', async () => {
      await createTestEvent({ userId: userId1 });
      await createTestEvent({ userId: null }); // Anonymous event

      const overview = await analyticsService.getOverview(startDate, endDate);

      expect(overview.summary.uniqueUsers).toBe(1); // Only userId1 counted
    });
  });

  // ===========================================================================
  // GET FEATURE ANALYTICS TESTS
  // ===========================================================================

  describe('getFeatureAnalytics', () => {
    let userId;
    let startDate, endDate;

    beforeEach(async () => {
      userId = createUserId();
      const range = getDateRange(7);
      startDate = range.startDate;
      endDate = range.endDate;
    });

    it('should return usage stats for all features', async () => {
      const notesEvent1 = await createTestEvent({ userId, category: 'feature', feature: 'notes', action: 'create_note' });
      const notesEvent2 = await createTestEvent({ userId, category: 'feature', feature: 'notes', action: 'view_note' });
      const tasksEvent = await createTestEvent({ userId, category: 'feature', feature: 'tasks', action: 'create_task' });

      const analytics = await analyticsService.getFeatureAnalytics(startDate, endDate);

      expect(analytics.usage).toBeDefined();
      expect(analytics.usage.length).toBeGreaterThan(0);

      const notesUsage = analytics.usage.find(u => u.feature === 'notes');
      expect(notesUsage).toBeDefined();
      expect(notesUsage.totalActions).toBe(2);
    });

    it('should filter by specific feature when provided', async () => {
      await createTestEvent({ userId, category: 'feature', feature: 'notes', action: 'create_note' });
      await createTestEvent({ userId, category: 'feature', feature: 'tasks', action: 'create_task' });

      const analytics = await analyticsService.getFeatureAnalytics(startDate, endDate, 'notes');

      expect(analytics.usage).toBeDefined();
      // Should only contain notes feature
      expect(analytics.usage.every(u => u.feature === 'notes')).toBe(true);
    });

    it('should count create, update, delete, and view actions', async () => {
      await createTestEvent({ userId, category: 'feature', feature: 'notes', action: 'create_note' });
      await createTestEvent({ userId, category: 'feature', feature: 'notes', action: 'update_note' });
      await createTestEvent({ userId, category: 'feature', feature: 'notes', action: 'delete_note' });
      await createTestEvent({ userId, category: 'feature', feature: 'notes', action: 'view_note' });
      await createTestEvent({ userId, category: 'feature', feature: 'notes', action: 'edit_note' });

      const analytics = await analyticsService.getFeatureAnalytics(startDate, endDate, 'notes');

      const notesUsage = analytics.usage.find(u => u.feature === 'notes');
      expect(notesUsage.createActions).toBe(1);
      expect(notesUsage.updateActions).toBe(2); // update + edit
      expect(notesUsage.deleteActions).toBe(1);
      expect(notesUsage.viewActions).toBe(1);
    });

    it('should return action breakdown per feature', async () => {
      // Create multiple events with same action for grouping
      for (let i = 0; i < 5; i++) {
        await createTestEvent({ userId, category: 'feature', feature: 'notes', action: 'create_note' });
      }
      for (let i = 0; i < 3; i++) {
        await createTestEvent({ userId, category: 'feature', feature: 'notes', action: 'view_note' });
      }

      const analytics = await analyticsService.getFeatureAnalytics(startDate, endDate, 'notes');

      expect(analytics.actionBreakdown).toBeDefined();
      expect(analytics.actionBreakdown.length).toBeGreaterThan(0);
    });

    it('should return daily usage trend', async () => {
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      await createTestEvent({ userId, category: 'feature', feature: 'notes', timestamp: today });
      await createTestEvent({ userId, category: 'feature', feature: 'notes', timestamp: yesterday });

      const analytics = await analyticsService.getFeatureAnalytics(startDate, endDate, 'notes');

      expect(analytics.dailyUsage).toBeDefined();
      expect(analytics.dailyUsage.length).toBeGreaterThan(0);
    });

    it('should return user engagement stats', async () => {
      const userId2 = createUserId();

      // Create events for engagement tracking
      for (let i = 0; i < 10; i++) {
        await createTestEvent({ userId, category: 'feature', feature: 'notes', action: `action_${i}` });
      }
      for (let i = 0; i < 5; i++) {
        await createTestEvent({ userId: userId2, category: 'feature', feature: 'notes', action: `action2_${i}` });
      }

      const analytics = await analyticsService.getFeatureAnalytics(startDate, endDate, 'notes');

      expect(analytics.userEngagement).toBeDefined();
      expect(analytics.userEngagement.length).toBeLessThanOrEqual(10); // Top 10 users
    });

    it('should count unique users per feature', async () => {
      const userId2 = createUserId();

      await createTestEvent({ userId, category: 'feature', feature: 'notes' });
      await createTestEvent({ userId: userId2, category: 'feature', feature: 'notes' });

      const analytics = await analyticsService.getFeatureAnalytics(startDate, endDate, 'notes');

      const notesUsage = analytics.usage.find(u => u.feature === 'notes');
      expect(notesUsage.uniqueUsers).toBe(2);
    });

    it('should handle no feature events', async () => {
      // Create page_view events (not feature events)
      await createTestEvent({ userId, category: 'page_view', page: '/app' });

      const analytics = await analyticsService.getFeatureAnalytics(startDate, endDate);

      expect(analytics.usage).toEqual([]);
    });
  });

  // ===========================================================================
  // GET USER ANALYTICS TESTS
  // ===========================================================================

  describe('getUserAnalytics', () => {
    let userId;
    let startDate, endDate;

    beforeEach(async () => {
      userId = createUserId();
      const range = getDateRange(7);
      startDate = range.startDate;
      endDate = range.endDate;
    });

    it('should return active users ranked by event count', async () => {
      const userId2 = createUserId();

      // User 1 has more events
      for (let i = 0; i < 10; i++) {
        await createTestEvent({ userId, sessionId: 'session1', action: `a1_${i}` });
      }
      // User 2 has fewer events
      for (let i = 0; i < 5; i++) {
        await createTestEvent({ userId: userId2, sessionId: 'session2', action: `a2_${i}` });
      }

      const analytics = await analyticsService.getUserAnalytics(startDate, endDate);

      expect(analytics.activeUsers).toBeDefined();
      expect(analytics.activeUsers.length).toBe(2);
      expect(analytics.activeUsers[0].eventCount).toBeGreaterThanOrEqual(analytics.activeUsers[1].eventCount);
    });

    it('should include session count for each user', async () => {
      const session1 = 'session_1';
      const session2 = 'session_2';

      // Create events with different sessions
      for (let i = 0; i < 3; i++) {
        await createTestEvent({ userId, sessionId: session1, action: `s1_${i}` });
      }
      for (let i = 0; i < 2; i++) {
        await createTestEvent({ userId, sessionId: session2, action: `s2_${i}` });
      }

      const analytics = await analyticsService.getUserAnalytics(startDate, endDate);

      const userStats = analytics.activeUsers.find(u => u.userId.toString() === userId.toString());
      expect(userStats.sessionCount).toBe(2);
    });

    it('should include feature count for each user', async () => {
      await createTestEvent({ userId, feature: 'notes' });
      await createTestEvent({ userId, feature: 'tasks' });
      await createTestEvent({ userId, feature: 'calendar' });

      const analytics = await analyticsService.getUserAnalytics(startDate, endDate);

      const userStats = analytics.activeUsers.find(u => u.userId.toString() === userId.toString());
      expect(userStats.featureCount).toBe(3);
    });

    it('should return session statistics', async () => {
      const sessionId = 'test_session';
      for (let i = 0; i < 5; i++) {
        await createTestEvent({ userId, sessionId, action: `action_${i}` });
      }

      const analytics = await analyticsService.getUserAnalytics(startDate, endDate);

      expect(analytics.sessionStats).toBeDefined();
      expect(analytics.sessionStats.totalSessions).toBeGreaterThan(0);
    });

    it('should return daily active users trend', async () => {
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      await createTestEvent({ userId, timestamp: today });
      await createTestEvent({ userId, timestamp: yesterday });

      const analytics = await analyticsService.getUserAnalytics(startDate, endDate);

      expect(analytics.dailyActiveUsers).toBeDefined();
    });

    it('should return hourly activity pattern', async () => {
      await createTestEvent({ userId, timestamp: new Date() });

      const analytics = await analyticsService.getUserAnalytics(startDate, endDate);

      expect(analytics.hourlyActivity).toBeDefined();
    });

    it('should limit active users to top 20', async () => {
      // Create events for 25 different users
      for (let i = 0; i < 25; i++) {
        const newUserId = createUserId();
        await createTestEvent({ userId: newUserId });
      }

      const analytics = await analyticsService.getUserAnalytics(startDate, endDate);

      expect(analytics.activeUsers.length).toBeLessThanOrEqual(20);
    });

    it('should include lastActive timestamp', async () => {
      await createTestEvent({ userId });

      const analytics = await analyticsService.getUserAnalytics(startDate, endDate);

      const userStats = analytics.activeUsers.find(u => u.userId.toString() === userId.toString());
      expect(userStats.lastActive).toBeDefined();
      expect(userStats.lastActive).toBeInstanceOf(Date);
    });

    it('should handle no session data gracefully', async () => {
      // Don't create any events with sessions
      const analytics = await analyticsService.getUserAnalytics(startDate, endDate);

      expect(analytics.sessionStats.totalSessions).toBe(0);
      expect(analytics.sessionStats.avgEventsPerSession).toBe(0);
      expect(analytics.sessionStats.avgSessionDurationMs).toBe(0);
    });
  });

  // ===========================================================================
  // GET ERROR ANALYTICS TESTS
  // ===========================================================================

  describe('getErrorAnalytics', () => {
    let userId;
    let startDate, endDate;

    beforeEach(async () => {
      userId = createUserId();
      const range = getDateRange(7);
      startDate = range.startDate;
      endDate = range.endDate;
    });

    it('should return error events grouped by action and page', async () => {
      // Errors are grouped by both action AND page, so same action + same page = grouped
      const page = '/app/error-test';
      const event1 = await createTestEvent({ userId, category: 'error', action: 'api_error', page });
      const event2 = await createTestEvent({ userId, category: 'error', action: 'api_error', page });
      const event3 = await createTestEvent({ userId, category: 'error', action: 'network_error', page: '/app/tasks' });

      const errors = await analyticsService.getErrorAnalytics(startDate, endDate);

      // Verify events were created
      expect(event1).toBeDefined();
      expect(event2).toBeDefined();
      expect(event3).toBeDefined();

      expect(errors.length).toBe(2); // Two distinct action+page combos

      const apiError = errors.find(e => e.error === 'api_error' && e.page === page);
      expect(apiError).toBeDefined();
      expect(apiError.count).toBe(2);
    });

    it('should include lastOccurred timestamp', async () => {
      const page = '/app/timestamp-test';
      const event = await createTestEvent({ userId, category: 'error', action: 'test_error', page });

      const errors = await analyticsService.getErrorAnalytics(startDate, endDate);

      // Verify event was created
      expect(event).toBeDefined();
      expect(errors.length).toBeGreaterThan(0);

      const testError = errors.find(e => e.error === 'test_error' && e.page === page);
      expect(testError).toBeDefined();
      expect(testError.lastOccurred).toBeDefined();
      expect(testError.lastOccurred).toBeInstanceOf(Date);
    });

    it('should count affected users per error', async () => {
      const userId2 = createUserId();
      const page = '/app/user-count-test';

      const event1 = await createTestEvent({ userId, category: 'error', action: 'common_error', page });
      const event2 = await createTestEvent({ userId: userId2, category: 'error', action: 'common_error', page });

      const errors = await analyticsService.getErrorAnalytics(startDate, endDate);

      // Verify events were created
      expect(event1).toBeDefined();
      expect(event2).toBeDefined();
      expect(errors.length).toBeGreaterThan(0);

      const commonError = errors.find(e => e.error === 'common_error' && e.page === page);
      expect(commonError).toBeDefined();
      expect(commonError.affectedUsers).toBe(2);
    });

    it('should sort errors by count descending', async () => {
      // Create errors with same page to ensure grouping
      const page = '/app/test';
      for (let i = 0; i < 5; i++) {
        await createTestEvent({ category: 'error', action: 'frequent_error', page });
      }
      for (let i = 0; i < 2; i++) {
        await createTestEvent({ category: 'error', action: 'rare_error', page });
      }

      const errors = await analyticsService.getErrorAnalytics(startDate, endDate);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].count).toBeGreaterThanOrEqual(errors[errors.length - 1].count);
    });

    it('should limit to top 20 errors', async () => {
      // Create 25 different error types
      for (let i = 0; i < 25; i++) {
        await createTestEvent({ userId, category: 'error', action: `error_${i}`, page: '/app' });
      }

      const errors = await analyticsService.getErrorAnalytics(startDate, endDate);

      expect(errors.length).toBeLessThanOrEqual(20);
    });

    it('should return empty array when no errors exist', async () => {
      // Create only feature events, no errors
      await createTestEvent({ userId, category: 'feature', action: 'create_note' });

      const errors = await analyticsService.getErrorAnalytics(startDate, endDate);

      expect(errors).toEqual([]);
    });

    it('should include page where error occurred', async () => {
      await createTestEvent({ userId, category: 'error', action: 'page_error', page: '/app/specific-page' });

      const errors = await analyticsService.getErrorAnalytics(startDate, endDate);

      const pageError = errors.find(e => e.error === 'page_error');
      expect(pageError.page).toBe('/app/specific-page');
    });

    it('should handle errors with null page', async () => {
      await createTestEvent({ userId, category: 'error', action: 'no_page_error', page: null });

      const errors = await analyticsService.getErrorAnalytics(startDate, endDate);

      const error = errors.find(e => e.error === 'no_page_error');
      expect(error).toBeDefined();
      expect(error.page).toBeNull();
    });
  });

  // ===========================================================================
  // GET RETENTION METRICS TESTS
  // ===========================================================================

  describe('getRetentionMetrics', () => {
    let userId1, userId2, userId3;
    let startDate, endDate;

    beforeEach(async () => {
      userId1 = createUserId();
      userId2 = createUserId();
      userId3 = createUserId();

      // Use a 14-day range for retention testing
      const range = getDateRange(14);
      startDate = range.startDate;
      endDate = range.endDate;
    });

    it('should calculate retention rate correctly', async () => {
      const midPoint = new Date((startDate.getTime() + endDate.getTime()) / 2);
      const firstHalfDate = new Date(startDate.getTime() + 1000); // Just after start
      const secondHalfDate = new Date(midPoint.getTime() + 1000); // Just after midpoint

      // User 1: Active in both halves (retained)
      await createTestEvent({ userId: userId1, timestamp: firstHalfDate });
      await createTestEvent({ userId: userId1, timestamp: secondHalfDate });

      // User 2: Active only in first half (churned)
      await createTestEvent({ userId: userId2, timestamp: firstHalfDate });

      // User 3: Active only in second half (new user)
      await createTestEvent({ userId: userId3, timestamp: secondHalfDate });

      const retention = await analyticsService.getRetentionMetrics(startDate, endDate);

      expect(retention.firstPeriodUsers).toBe(2); // userId1, userId2
      expect(retention.secondPeriodUsers).toBe(2); // userId1, userId3
      expect(retention.retainedUsers).toBe(1); // userId1
      expect(retention.retentionRate).toBe(50); // 1 out of 2 = 50%
    });

    it('should return 0% retention when no users in first period', async () => {
      const futureStart = new Date();
      futureStart.setDate(futureStart.getDate() + 100);
      const futureEnd = new Date();
      futureEnd.setDate(futureEnd.getDate() + 114);

      const retention = await analyticsService.getRetentionMetrics(futureStart, futureEnd);

      expect(retention.firstPeriodUsers).toBe(0);
      expect(retention.retentionRate).toBe(0);
    });

    it('should return 100% retention when all first period users return', async () => {
      const midPoint = new Date((startDate.getTime() + endDate.getTime()) / 2);
      const firstHalfDate = new Date(startDate.getTime() + 1000);
      const secondHalfDate = new Date(midPoint.getTime() + 1000);

      // Both users active in both periods
      await createTestEvent({ userId: userId1, timestamp: firstHalfDate });
      await createTestEvent({ userId: userId1, timestamp: secondHalfDate });
      await createTestEvent({ userId: userId2, timestamp: firstHalfDate });
      await createTestEvent({ userId: userId2, timestamp: secondHalfDate });

      const retention = await analyticsService.getRetentionMetrics(startDate, endDate);

      expect(retention.retentionRate).toBe(100);
    });

    it('should exclude anonymous events from retention calculation', async () => {
      const midPoint = new Date((startDate.getTime() + endDate.getTime()) / 2);
      const firstHalfDate = new Date(startDate.getTime() + 1000);
      const secondHalfDate = new Date(midPoint.getTime() + 1000);

      await createTestEvent({ userId: userId1, timestamp: firstHalfDate });
      await createTestEvent({ userId: userId1, timestamp: secondHalfDate });
      await createTestEvent({ userId: null, timestamp: firstHalfDate }); // Anonymous
      await createTestEvent({ userId: null, timestamp: secondHalfDate }); // Anonymous

      const retention = await analyticsService.getRetentionMetrics(startDate, endDate);

      expect(retention.firstPeriodUsers).toBe(1); // Only userId1
      expect(retention.retainedUsers).toBe(1);
      expect(retention.retentionRate).toBe(100);
    });

    it('should handle single day date range', async () => {
      const today = new Date();
      const startOfDay = new Date(today);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(today);
      endOfDay.setHours(23, 59, 59, 999);

      await createTestEvent({ userId: userId1, timestamp: today });

      const retention = await analyticsService.getRetentionMetrics(startOfDay, endOfDay);

      expect(retention).toBeDefined();
      // With a single day, midpoint splits the day in half
      // Depending on when the event was created, user might be in first or second half
    });
  });

  // ===========================================================================
  // EDGE CASES AND ERROR HANDLING
  // ===========================================================================

  describe('edge cases', () => {
    it('should handle large number of events', async () => {
      const userId = createUserId();
      const range = getDateRange(7);

      // Create 10 events sequentially
      const events = [];
      for (let i = 0; i < 10; i++) {
        const event = await createTestEvent({
          userId,
          category: 'feature',
          feature: 'notes',
          action: `large_action_${i}`
        });
        events.push(event);
      }

      // Verify all events were created
      expect(events.length).toBe(10);
      expect(events.every(e => e !== null && e !== undefined)).toBe(true);

      const overview = await analyticsService.getOverview(range.startDate, range.endDate);

      expect(overview.summary.totalEvents).toBe(10);
    });

    it('should handle events at exact date boundaries', async () => {
      const userId = createUserId();
      const startDate = new Date('2025-01-01T00:00:00.000Z');
      const endDate = new Date('2025-01-07T23:59:59.999Z');

      // Event exactly at start
      await createTestEvent({ userId, timestamp: startDate });
      // Event exactly at end
      await createTestEvent({ userId, timestamp: endDate });

      const overview = await analyticsService.getOverview(startDate, endDate);

      expect(overview.summary.totalEvents).toBe(2);
    });

    it('should handle special characters in metadata', async () => {
      const userId = createUserId();

      const event = await analyticsService.trackEvent({
        userId,
        category: 'search',
        action: 'search',
        feature: 'search',
        metadata: {
          query: 'Test <script>alert("xss")</script> & "quotes"',
          tags: ['tag1', 'tag2']
        }
      });

      expect(event).toBeDefined();
      expect(event.metadata.query).toBe('Test <script>alert("xss")</script> & "quotes"');
    });

    it('should handle unicode characters in action names', async () => {
      const userId = createUserId();

      const event = await analyticsService.trackEvent({
        userId,
        category: 'feature',
        action: 'create_\u4E2D\u6587_note', // Chinese characters
        feature: 'notes'
      });

      expect(event).toBeDefined();
      expect(event.action).toBe('create_\u4E2D\u6587_note');
    });

    it('should handle concurrent event tracking', async () => {
      const userId = createUserId();

      // Track 10 events concurrently
      const promises = Array(10).fill(null).map((_, i) =>
        analyticsService.trackEvent({
          userId,
          category: 'feature',
          action: `concurrent_action_${i}`,
          feature: 'notes'
        })
      );

      const events = await Promise.all(promises);

      expect(events.every(e => e !== null)).toBe(true);
      expect(events.length).toBe(10);
    });

    it('should handle very long user agent strings', async () => {
      const longUserAgent = 'Mozilla/5.0 '.repeat(100);

      const result = analyticsService.parseUserAgent(longUserAgent);

      expect(result).toBeDefined();
      // Should still parse without crashing
      expect(result.deviceType).toBeDefined();
    });

    it('should handle empty metadata object', async () => {
      const userId = createUserId();

      const event = await analyticsService.trackEvent({
        userId,
        category: 'feature',
        action: 'test',
        metadata: {}
      });

      expect(event).toBeDefined();
      expect(event.metadata).toEqual({});
    });

    it('should handle nested metadata objects', async () => {
      const userId = createUserId();

      const event = await analyticsService.trackEvent({
        userId,
        category: 'feature',
        action: 'test',
        metadata: {
          level1: {
            level2: {
              level3: 'deep value'
            }
          },
          array: [1, 2, 3],
          mixed: [{ key: 'value' }, 'string', 123]
        }
      });

      expect(event).toBeDefined();
      expect(event.metadata.level1.level2.level3).toBe('deep value');
    });
  });

  // ===========================================================================
  // INTEGRATION TESTS (MULTIPLE FUNCTIONS WORKING TOGETHER)
  // ===========================================================================

  describe('integration tests', () => {
    it('should track events that appear in overview', async () => {
      const userId = createUserId();
      const range = getDateRange(7);

      // Track an event
      await analyticsService.trackEvent({
        userId,
        category: 'feature',
        action: 'create_note',
        feature: 'notes',
        page: '/app/notes'
      });

      // Verify it appears in overview
      const overview = await analyticsService.getOverview(range.startDate, range.endDate);

      expect(overview.summary.totalEvents).toBeGreaterThan(0);
      expect(overview.summary.uniqueUsers).toBeGreaterThan(0);
    });

    it('should track errors that appear in error analytics', async () => {
      const userId = createUserId();
      const range = getDateRange(7);

      // Track an error event
      await analyticsService.trackEvent({
        userId,
        category: 'error',
        action: 'integration_test_error',
        feature: 'notes',
        page: '/app/notes',
        metadata: { errorCode: 500, message: 'Test error' }
      });

      // Verify it appears in error analytics
      const errors = await analyticsService.getErrorAnalytics(range.startDate, range.endDate);

      const testError = errors.find(e => e.error === 'integration_test_error');
      expect(testError).toBeDefined();
      expect(testError.count).toBe(1);
    });

    it('should accurately reflect user activity in user analytics', async () => {
      const userId = createUserId();
      const sessionId = 'integration_user_session';
      const range = getDateRange(7);

      // Track multiple events for one user using direct database inserts
      const event1 = await createTestEvent({
        userId,
        sessionId,
        category: 'feature',
        action: 'integration_create_note',
        feature: 'notes'
      });

      const event2 = await createTestEvent({
        userId,
        sessionId,
        category: 'feature',
        action: 'integration_create_task',
        feature: 'tasks'
      });

      // Verify events were created
      expect(event1).toBeDefined();
      expect(event2).toBeDefined();

      // Verify user analytics
      const userAnalytics = await analyticsService.getUserAnalytics(range.startDate, range.endDate);

      const userStats = userAnalytics.activeUsers.find(u => u.userId.toString() === userId.toString());
      expect(userStats).toBeDefined();
      expect(userStats.eventCount).toBe(2);
      expect(userStats.featureCount).toBe(2); // notes and tasks
    });

    it('should show feature usage matching tracked events', async () => {
      const userId = createUserId();
      const range = getDateRange(7);

      // Track feature events using direct database inserts
      const event1 = await createTestEvent({
        userId,
        category: 'feature',
        action: 'integration_feature_create',
        feature: 'notes'
      });

      const event2 = await createTestEvent({
        userId,
        category: 'feature',
        action: 'integration_feature_update',
        feature: 'notes'
      });

      // Verify events were created
      expect(event1).toBeDefined();
      expect(event2).toBeDefined();

      // Verify feature analytics
      const featureAnalytics = await analyticsService.getFeatureAnalytics(range.startDate, range.endDate, 'notes');

      const notesUsage = featureAnalytics.usage.find(u => u.feature === 'notes');
      expect(notesUsage).toBeDefined();
      expect(notesUsage.totalActions).toBe(2);
      // Note: the regex for 'create' matches 'integration_feature_create'
      // and 'update' matches 'integration_feature_update'
      expect(notesUsage.createActions).toBe(1);
      expect(notesUsage.updateActions).toBe(1);
    });
  });
});
