/**
 * =============================================================================
 * ANALYTICSSERVICE.JS - User Analytics and Tracking Service
 * =============================================================================
 *
 * This service handles tracking user interactions and generating analytics
 * reports. It provides insights into how users engage with myBrain features.
 *
 * WHAT IS ANALYTICS?
 * ------------------
 * Analytics means collecting and analyzing data about user behavior:
 * - Which features do users use most?
 * - How often do users return?
 * - What devices do users prefer?
 * - Where do users encounter errors?
 *
 * WHY TRACK ANALYTICS?
 * --------------------
 * 1. PRODUCT IMPROVEMENT: See what features need work
 * 2. USER EXPERIENCE: Identify pain points
 * 3. BUSINESS DECISIONS: Prioritize development
 * 4. ERROR DETECTION: Find and fix problems
 * 5. ENGAGEMENT: Understand user retention
 *
 * DATA TRACKED:
 * -------------
 * - EVENTS: User actions (clicks, creates, updates, deletes)
 * - SESSIONS: Groups of events from a single visit
 * - PAGES: Which pages users visit
 * - DEVICES: Browser, OS, device type
 * - ERRORS: Application errors encountered
 *
 * PRIVACY NOTE:
 * -------------
 * Analytics data is stored for 1 year (TTL index on AnalyticsEvent model).
 * Personal data is anonymized where possible. Users can request data deletion.
 *
 * ADMIN-ONLY:
 * -----------
 * Analytics reports are only accessible to admin users.
 *
 * =============================================================================
 */

// =============================================================================
// IMPORTS
// =============================================================================

/**
 * AnalyticsEvent model - Stores individual tracking events.
 */
import AnalyticsEvent from '../models/AnalyticsEvent.js';

// =============================================================================
// USER AGENT PARSING
// =============================================================================

/**
 * parseUserAgent(userAgent)
 * -------------------------
 * Extracts device information from a browser's User-Agent string.
 *
 * @param {string} userAgent - The User-Agent header from the request
 *
 * @returns {Object} Device information
 *   - deviceType: 'desktop', 'mobile', 'tablet', or 'unknown'
 *   - browser: 'Chrome', 'Firefox', 'Safari', 'Edge', 'Opera', or 'unknown'
 *   - os: 'Windows', 'macOS', 'Linux', 'Android', 'iOS', or 'unknown'
 *
 * WHAT IS A USER-AGENT?
 * ---------------------
 * Every web browser sends a User-Agent string that identifies:
 * - Browser name and version
 * - Operating system
 * - Device type
 *
 * EXAMPLE USER-AGENT:
 * "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36
 *  (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
 *
 * This tells us: Windows 10, 64-bit, Chrome browser
 */
function parseUserAgent(userAgent) {
  // Handle missing user agent
  if (!userAgent) {
    return { deviceType: 'unknown', browser: 'unknown', os: 'unknown' };
  }

  // Convert to lowercase for easier matching
  const ua = userAgent.toLowerCase();

  // =========================================================================
  // DETECT DEVICE TYPE
  // =========================================================================

  let deviceType = 'desktop';  // Default to desktop

  // Check for mobile devices
  if (/mobile|android|iphone|ipod|blackberry|windows phone/i.test(ua)) {
    deviceType = 'mobile';
  }
  // Check for tablets (before desktop since tablets often have "mobile" in UA)
  else if (/ipad|tablet|playbook|silk/i.test(ua)) {
    deviceType = 'tablet';
  }

  // =========================================================================
  // DETECT BROWSER
  // =========================================================================

  let browser = 'unknown';

  // Order matters! Edge contains "chrome", Chrome contains "safari"
  if (ua.includes('firefox')) browser = 'Firefox';
  else if (ua.includes('edg')) browser = 'Edge';  // Edge uses "edg" not "edge"
  else if (ua.includes('chrome')) browser = 'Chrome';
  else if (ua.includes('safari')) browser = 'Safari';
  else if (ua.includes('opera') || ua.includes('opr')) browser = 'Opera';

  // =========================================================================
  // DETECT OPERATING SYSTEM
  // =========================================================================

  let os = 'unknown';

  if (ua.includes('windows')) os = 'Windows';
  else if (ua.includes('mac')) os = 'macOS';
  else if (ua.includes('linux')) os = 'Linux';
  else if (ua.includes('android')) os = 'Android';
  else if (ua.includes('iphone') || ua.includes('ipad')) os = 'iOS';

  return { deviceType, browser, os };
}

// =============================================================================
// EVENT TRACKING
// =============================================================================

/**
 * trackEvent(eventData)
 * ---------------------
 * Records a single analytics event.
 *
 * @param {Object} eventData - Event details
 *   - userId: User who performed the action (null for anonymous)
 *   - sessionId: Current session identifier
 *   - category: Event category ('feature', 'navigation', 'error', etc.)
 *   - action: What happened ('create_note', 'click_button', etc.)
 *   - feature: Which feature ('notes', 'tasks', 'calendar', etc.)
 *   - metadata: Additional context (any object)
 *   - page: Current page URL
 *   - referrer: Previous page URL
 *   - userAgent: Browser User-Agent string
 *   - screenSize: User's screen dimensions
 *   - duration: Time spent (for timing events)
 *
 * @returns {Object|null} The created event or null if tracking failed
 *
 * EVENT CATEGORIES:
 * - 'feature': Feature usage (create, update, delete, view)
 * - 'navigation': Page views and transitions
 * - 'error': Application errors
 * - 'interaction': UI interactions (clicks, hovers)
 * - 'performance': Timing metrics
 *
 * EXAMPLE:
 * ```javascript
 * await trackEvent({
 *   userId: user._id,
 *   sessionId: req.sessionId,
 *   category: 'feature',
 *   action: 'create_note',
 *   feature: 'notes',
 *   page: '/notes',
 *   userAgent: req.headers['user-agent']
 * });
 * ```
 *
 * FAIL-SAFE:
 * This function catches all errors and returns null instead of throwing.
 * Analytics should never break the main application.
 */
async function trackEvent({
  userId = null,
  sessionId = null,
  category,
  action,
  feature = 'other',
  metadata = {},
  page = null,
  referrer = null,
  userAgent = null,
  screenSize = null,
  duration = null
}) {
  try {
    // Parse user agent to get device info
    const deviceInfo = parseUserAgent(userAgent);

    // Create the event using the model's track method
    const event = await AnalyticsEvent.track({
      userId,
      sessionId,
      category,
      action,
      feature,
      metadata,
      page,
      referrer,
      userAgent,
      deviceType: deviceInfo.deviceType,
      browser: deviceInfo.browser,
      os: deviceInfo.os,
      screenSize,
      duration
    });

    return event;
  } catch (error) {
    // Log but don't throw - analytics should never break the app
    console.error('Analytics tracking error:', error);
    return null;
  }
}

// =============================================================================
// ANALYTICS OVERVIEW
// =============================================================================

/**
 * getOverview(startDate, endDate)
 * -------------------------------
 * Gets a comprehensive analytics overview for a date range.
 *
 * @param {Date} startDate - Start of the date range
 * @param {Date} endDate - End of the date range
 *
 * @returns {Object} Analytics overview
 *
 * RETURNED DATA:
 * ```javascript
 * {
 *   summary: {
 *     totalEvents: 15000,        // Total events tracked
 *     uniqueUsers: 250,          // Distinct users
 *     avgEventsPerUser: 60       // Events per user
 *   },
 *   featureUsage: [
 *     { feature: 'notes', count: 5000 },
 *     { feature: 'tasks', count: 3000 },
 *     // ...
 *   ],
 *   popularActions: [
 *     { action: 'view_note', count: 2000 },
 *     { action: 'create_task', count: 1500 },
 *     // ...
 *   ],
 *   dailyActiveUsers: [
 *     { date: '2024-01-15', count: 150 },
 *     { date: '2024-01-16', count: 142 },
 *     // ...
 *   ],
 *   pageViews: [
 *     { page: '/dashboard', count: 3000 },
 *     { page: '/notes', count: 2500 },
 *     // ...
 *   ],
 *   deviceBreakdown: {
 *     desktop: 70,
 *     mobile: 25,
 *     tablet: 5
 *   }
 * }
 * ```
 */
async function getOverview(startDate, endDate) {
  // Run all queries in parallel for performance
  const [
    totalEvents,
    uniqueUsers,
    featureUsage,
    popularActions,
    dailyActiveUsers,
    pageViews,
    deviceBreakdown
  ] = await Promise.all([
    // Total event count
    AnalyticsEvent.countDocuments({
      timestamp: { $gte: startDate, $lte: endDate }
    }),

    // Unique users (distinct userId values)
    AnalyticsEvent.distinct('userId', {
      timestamp: { $gte: startDate, $lte: endDate },
      userId: { $ne: null }  // Exclude anonymous events
    }),

    // Feature usage breakdown
    AnalyticsEvent.getFeatureUsage(startDate, endDate),

    // Most common actions
    AnalyticsEvent.getPopularActions(startDate, endDate, 10),

    // Daily active users trend
    AnalyticsEvent.getDailyActiveUsers(startDate, endDate),

    // Most viewed pages
    AnalyticsEvent.getPageViews(startDate, endDate),

    // Device type breakdown
    AnalyticsEvent.getDeviceBreakdown(startDate, endDate)
  ]);

  return {
    summary: {
      totalEvents,
      uniqueUsers: uniqueUsers.length,
      avgEventsPerUser: uniqueUsers.length > 0
        ? Math.round(totalEvents / uniqueUsers.length)
        : 0
    },
    featureUsage,
    popularActions,
    dailyActiveUsers,
    pageViews: pageViews.slice(0, 10),  // Top 10 pages
    deviceBreakdown
  };
}

// =============================================================================
// FEATURE ANALYTICS
// =============================================================================

/**
 * getFeatureAnalytics(startDate, endDate, feature)
 * ------------------------------------------------
 * Gets detailed analytics for specific features.
 *
 * @param {Date} startDate - Start of the date range
 * @param {Date} endDate - End of the date range
 * @param {string} feature - Optional feature name to filter by
 *
 * @returns {Object} Feature analytics
 *
 * RETURNED DATA:
 * - usage: Overall usage stats per feature
 * - actionBreakdown: Actions taken within each feature
 * - dailyUsage: Usage trend over time
 * - userEngagement: Top users by feature usage
 *
 * ACTION CATEGORIZATION:
 * Actions are automatically categorized:
 * - createActions: Actions containing "create"
 * - updateActions: Actions containing "update" or "edit"
 * - deleteActions: Actions containing "delete" or "remove"
 * - viewActions: Actions containing "view" or "open"
 */
async function getFeatureAnalytics(startDate, endDate, feature = null) {
  // Build match stage for MongoDB aggregation
  const matchStage = {
    timestamp: { $gte: startDate, $lte: endDate },
    category: 'feature'  // Only feature-related events
  };

  // Optionally filter to specific feature
  if (feature) {
    matchStage.feature = feature;
  }

  // Run all aggregations in parallel
  const [usage, actionBreakdown, dailyUsage, userEngagement] = await Promise.all([
    // =========================================================================
    // OVERALL USAGE STATS
    // =========================================================================
    // Groups by feature and counts actions, users, and action types
    AnalyticsEvent.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$feature',
          totalActions: { $sum: 1 },
          uniqueUsers: { $addToSet: '$userId' },
          // Count different action types using regex matching
          createActions: {
            $sum: { $cond: [{ $regexMatch: { input: '$action', regex: /create/i } }, 1, 0] }
          },
          updateActions: {
            $sum: { $cond: [{ $regexMatch: { input: '$action', regex: /update|edit/i } }, 1, 0] }
          },
          deleteActions: {
            $sum: { $cond: [{ $regexMatch: { input: '$action', regex: /delete|remove/i } }, 1, 0] }
          },
          viewActions: {
            $sum: { $cond: [{ $regexMatch: { input: '$action', regex: /view|open/i } }, 1, 0] }
          }
        }
      },
      {
        $project: {
          feature: '$_id',
          totalActions: 1,
          uniqueUsers: { $size: '$uniqueUsers' },
          createActions: 1,
          updateActions: 1,
          deleteActions: 1,
          viewActions: 1,
          _id: 0
        }
      },
      { $sort: { totalActions: -1 } }
    ]),

    // =========================================================================
    // ACTION BREAKDOWN PER FEATURE
    // =========================================================================
    // Shows top 10 actions for each feature
    AnalyticsEvent.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: { feature: '$feature', action: '$action' },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.feature',
          actions: {
            $push: {
              action: '$_id.action',
              count: '$count'
            }
          }
        }
      },
      {
        $project: {
          feature: '$_id',
          actions: { $slice: [{ $sortArray: { input: '$actions', sortBy: { count: -1 } } }, 10] },
          _id: 0
        }
      }
    ]),

    // =========================================================================
    // DAILY USAGE TREND
    // =========================================================================
    // Shows usage per day, broken down by feature
    AnalyticsEvent.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
            feature: '$feature'
          },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.date',
          features: {
            $push: {
              feature: '$_id.feature',
              count: '$count'
            }
          },
          total: { $sum: '$count' }
        }
      },
      {
        $project: {
          date: '$_id',
          features: 1,
          total: 1,
          _id: 0
        }
      },
      { $sort: { date: 1 } }
    ]),

    // =========================================================================
    // USER ENGAGEMENT
    // =========================================================================
    // Top 10 users by feature usage
    AnalyticsEvent.aggregate([
      { $match: { ...matchStage, userId: { $ne: null } } },
      {
        $group: {
          _id: '$userId',
          actionCount: { $sum: 1 },
          features: { $addToSet: '$feature' }
        }
      },
      {
        $project: {
          userId: '$_id',
          actionCount: 1,
          featureCount: { $size: '$features' },
          _id: 0
        }
      },
      { $sort: { actionCount: -1 } },
      { $limit: 10 }
    ])
  ]);

  return {
    usage,
    actionBreakdown,
    dailyUsage,
    userEngagement
  };
}

// =============================================================================
// USER ANALYTICS
// =============================================================================

/**
 * getUserAnalytics(startDate, endDate)
 * ------------------------------------
 * Gets analytics focused on user behavior.
 *
 * @param {Date} startDate - Start of the date range
 * @param {Date} endDate - End of the date range
 *
 * @returns {Object} User analytics
 *
 * RETURNED DATA:
 * - activeUsers: Top 20 most active users
 * - sessionStats: Average session metrics
 * - dailyActiveUsers: DAU trend
 * - hourlyActivity: Activity by hour of day
 */
async function getUserAnalytics(startDate, endDate) {
  const [
    activeUsers,
    newVsReturning,
    userSessions,
    hourlyActivity
  ] = await Promise.all([
    // =========================================================================
    // MOST ACTIVE USERS
    // =========================================================================
    // Top 20 users by event count
    AnalyticsEvent.aggregate([
      {
        $match: {
          timestamp: { $gte: startDate, $lte: endDate },
          userId: { $ne: null }
        }
      },
      {
        $group: {
          _id: '$userId',
          eventCount: { $sum: 1 },
          sessions: { $addToSet: '$sessionId' },
          features: { $addToSet: '$feature' },
          lastActive: { $max: '$timestamp' }
        }
      },
      {
        $project: {
          userId: '$_id',
          eventCount: 1,
          sessionCount: { $size: '$sessions' },
          featureCount: { $size: '$features' },
          lastActive: 1,
          _id: 0
        }
      },
      { $sort: { eventCount: -1 } },
      { $limit: 20 }
    ]),

    // =========================================================================
    // SESSION STATISTICS
    // =========================================================================
    // Average events per session, average session duration
    AnalyticsEvent.aggregate([
      {
        $match: {
          timestamp: { $gte: startDate, $lte: endDate },
          sessionId: { $ne: null }
        }
      },
      {
        $group: {
          _id: '$sessionId',
          userId: { $first: '$userId' },
          eventCount: { $sum: 1 },
          startTime: { $min: '$timestamp' },
          endTime: { $max: '$timestamp' }
        }
      },
      {
        $project: {
          sessionId: '$_id',
          userId: 1,
          eventCount: 1,
          duration: { $subtract: ['$endTime', '$startTime'] },
          _id: 0
        }
      },
      {
        $group: {
          _id: null,
          totalSessions: { $sum: 1 },
          avgEventsPerSession: { $avg: '$eventCount' },
          avgSessionDuration: { $avg: '$duration' }
        }
      },
      {
        $project: {
          totalSessions: 1,
          avgEventsPerSession: { $round: ['$avgEventsPerSession', 1] },
          avgSessionDurationMs: { $round: ['$avgSessionDuration', 0] },
          _id: 0
        }
      }
    ]),

    // Daily active users trend
    AnalyticsEvent.getDailyActiveUsers(startDate, endDate),

    // Hourly activity pattern (which hours are busiest)
    AnalyticsEvent.getHourlyActivity(startDate, endDate)
  ]);

  return {
    activeUsers,
    sessionStats: newVsReturning[0] || { totalSessions: 0, avgEventsPerSession: 0, avgSessionDurationMs: 0 },
    dailyActiveUsers: userSessions,
    hourlyActivity
  };
}

// =============================================================================
// ERROR ANALYTICS
// =============================================================================

/**
 * getErrorAnalytics(startDate, endDate)
 * -------------------------------------
 * Gets analytics about application errors.
 *
 * @param {Date} startDate - Start of the date range
 * @param {Date} endDate - End of the date range
 *
 * @returns {Array} Top 20 errors by frequency
 *
 * RETURNED DATA:
 * ```javascript
 * [
 *   {
 *     error: 'network_error',
 *     page: '/notes',
 *     count: 150,
 *     lastOccurred: '2024-01-15T10:30:00Z',
 *     affectedUsers: 45
 *   },
 *   // ...
 * ]
 * ```
 *
 * USE CASES:
 * - Identify most common errors
 * - See which pages have issues
 * - Track error trends over time
 * - Prioritize bug fixes
 */
async function getErrorAnalytics(startDate, endDate) {
  return AnalyticsEvent.aggregate([
    {
      $match: {
        timestamp: { $gte: startDate, $lte: endDate },
        category: 'error'  // Only error events
      }
    },
    {
      $group: {
        _id: { action: '$action', page: '$page' },
        count: { $sum: 1 },
        lastOccurred: { $max: '$timestamp' },
        affectedUsers: { $addToSet: '$userId' }
      }
    },
    {
      $project: {
        error: '$_id.action',
        page: '$_id.page',
        count: 1,
        lastOccurred: 1,
        affectedUsers: { $size: '$affectedUsers' },
        _id: 0
      }
    },
    { $sort: { count: -1 } },
    { $limit: 20 }
  ]);
}

// =============================================================================
// RETENTION METRICS
// =============================================================================

/**
 * getRetentionMetrics(startDate, endDate)
 * ---------------------------------------
 * Calculates user retention between two time periods.
 *
 * @param {Date} startDate - Start of the date range
 * @param {Date} endDate - End of the date range
 *
 * @returns {Object} Retention metrics
 *
 * WHAT IS RETENTION?
 * ------------------
 * Retention measures how many users return after their first visit.
 * It's calculated by comparing users in two consecutive periods:
 * - First period: Users active in first half of date range
 * - Second period: Users active in second half
 * - Retained: Users who were active in BOTH periods
 *
 * RETURNED DATA:
 * ```javascript
 * {
 *   firstPeriodUsers: 200,    // Users in first half
 *   secondPeriodUsers: 180,   // Users in second half
 *   retainedUsers: 150,       // Users in both
 *   retentionRate: 75         // Percentage retained
 * }
 * ```
 *
 * INTERPRETATION:
 * - High retention (>70%): Users find value, keep coming back
 * - Low retention (<30%): Users try once and leave
 */
async function getRetentionMetrics(startDate, endDate) {
  // Split the date range into two equal periods
  const midPoint = new Date((startDate.getTime() + endDate.getTime()) / 2);

  // Get unique users in each period
  const [firstPeriodUsers, secondPeriodUsers] = await Promise.all([
    // Users active in first half
    AnalyticsEvent.distinct('userId', {
      timestamp: { $gte: startDate, $lt: midPoint },
      userId: { $ne: null }
    }),
    // Users active in second half
    AnalyticsEvent.distinct('userId', {
      timestamp: { $gte: midPoint, $lte: endDate },
      userId: { $ne: null }
    })
  ]);

  // Convert to sets for efficient intersection
  const firstSet = new Set(firstPeriodUsers.map(id => id?.toString()));
  const secondSet = new Set(secondPeriodUsers.map(id => id?.toString()));

  // Find users who appear in both periods
  const retained = [...firstSet].filter(id => secondSet.has(id)).length;

  // Calculate retention rate as percentage
  const retentionRate = firstSet.size > 0
    ? Math.round((retained / firstSet.size) * 100)
    : 0;

  return {
    firstPeriodUsers: firstSet.size,
    secondPeriodUsers: secondSet.size,
    retainedUsers: retained,
    retentionRate
  };
}

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

/**
 * Export all analytics service functions.
 *
 * USAGE:
 * ```javascript
 * import analyticsService from './services/analyticsService.js';
 *
 * // Track an event
 * await analyticsService.trackEvent({
 *   userId: user._id,
 *   category: 'feature',
 *   action: 'create_note',
 *   feature: 'notes'
 * });
 *
 * // Get overview (admin only)
 * const overview = await analyticsService.getOverview(startDate, endDate);
 * ```
 */
export default {
  trackEvent,
  getOverview,
  getFeatureAnalytics,
  getUserAnalytics,
  getErrorAnalytics,
  getRetentionMetrics,
  parseUserAgent
};
