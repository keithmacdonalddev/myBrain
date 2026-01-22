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
 * AnalyticsEvent model - MongoDB schema for tracking individual user events.
 * Each document represents one action: a feature use, click, page view, or error.
 * Includes userId, event name, properties, timestamp, device info, and error details.
 * Has TTL index to auto-delete after 1 year for privacy compliance.
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
 * Records a single analytics event for tracking user interactions.
 * Designed to be fail-safe - errors won't break the main application.
 *
 * BUSINESS LOGIC:
 * Every user action creates an event that helps us understand how the app
 * is being used. Events are stored in AnalyticsEvent collection and used
 * to generate reports, detect patterns, and improve the product.
 *
 * @param {Object} eventData - Event details
 *   @param {string} eventData.userId - User who performed action (null = anonymous)
 *   @param {string} eventData.sessionId - Current session identifier
 *   @param {string} eventData.category - Event category:
 *     - 'feature': Feature usage (create, update, delete, view)
 *     - 'navigation': Page views and transitions
 *     - 'error': Application errors
 *     - 'interaction': UI interactions (clicks, hovers)
 *     - 'performance': Timing metrics
 *   @param {string} eventData.action - Specific action ('create_note', 'click_button', etc.)
 *   @param {string} eventData.feature - Which feature ('notes', 'tasks', 'calendar', etc.)
 *   @param {Object} eventData.metadata - Additional context data (optional)
 *   @param {string} eventData.page - Current page URL (optional)
 *   @param {string} eventData.referrer - Previous page URL (optional)
 *   @param {string} eventData.userAgent - Browser User-Agent string (optional)
 *   @param {Object} eventData.screenSize - Screen dimensions (optional)
 *   @param {number} eventData.duration - Time spent in ms (optional)
 *
 * @returns {Promise<Object|null>} Created event document or null if tracking failed
 *
 * EXAMPLE USAGE:
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
 * FAIL-SAFE BEHAVIOR:
 * This function catches all errors and returns null instead of throwing.
 * Analytics tracking should NEVER break the main application flow.
 * Errors are logged to console for debugging but don't propagate.
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
    // =====================================================
    // PARSE DEVICE INFORMATION
    // =====================================================
    // Extract browser, OS, and device type from User-Agent string
    const deviceInfo = parseUserAgent(userAgent);

    // =====================================================
    // CREATE THE EVENT
    // =====================================================
    // Use the AnalyticsEvent model's track method to save event
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
      deviceType: deviceInfo.deviceType,  // desktop, mobile, tablet, unknown
      browser: deviceInfo.browser,        // Chrome, Firefox, Safari, etc.
      os: deviceInfo.os,                  // Windows, macOS, Linux, Android, iOS
      screenSize,
      duration
    });

    return event;
  } catch (error) {
    // =====================================================
    // ERROR HANDLING - FAIL GRACEFULLY
    // =====================================================
    // Log the error for debugging but don't throw
    // Analytics must never break the main application
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
 * Generates a comprehensive analytics overview for a date range.
 * Provides high-level insights into platform usage, popular features, and user behavior.
 *
 * BUSINESS LOGIC:
 * The overview snapshot helps product managers and admins understand:
 * - How much activity happened (total events, active users)
 * - Which features are most used
 * - What actions users perform most
 * - Device/browser distribution (helps prioritize optimization)
 * All metrics are aggregated in parallel for performance.
 *
 * @param {Date} startDate - Start of the date range (inclusive)
 * @param {Date} endDate - End of the date range (inclusive)
 *
 * @returns {Promise<Object>} Analytics overview object
 *
 * RETURNED DATA STRUCTURE:
 * ```javascript
 * {
 *   summary: {
 *     totalEvents: 15000,        // Total events tracked in period
 *     uniqueUsers: 250,          // Distinct users who had events
 *     avgEventsPerUser: 60       // Average events per active user
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
 *     { date: '2024-01-15', count: 150 },  // Users active each day
 *     { date: '2024-01-16', count: 142 },
 *     // ...
 *   ],
 *   pageViews: [
 *     { page: '/dashboard', count: 3000 },  // Top 10 pages
 *     { page: '/notes', count: 2500 },
 *     // ...
 *   ],
 *   deviceBreakdown: {
 *     desktop: 70,    // Percentage
 *     mobile: 25,
 *     tablet: 5
 *   }
 * }
 * ```
 *
 * EXAMPLE USAGE:
 * ```javascript
 * const lastMonth = new Date();
 * lastMonth.setDate(lastMonth.getDate() - 30);
 * const overview = await getOverview(lastMonth, new Date());
 * ```
 *
 * @throws {Error} If any database query fails
 */
async function getOverview(startDate, endDate) {
  // =====================================================
  // GATHER ALL OVERVIEW DATA IN PARALLEL
  // =====================================================
  // Use Promise.all for performance - queries run simultaneously
  const [
    totalEvents,
    uniqueUsers,
    featureUsage,
    popularActions,
    dailyActiveUsers,
    pageViews,
    deviceBreakdown
  ] = await Promise.all([
    // =====================================================
    // TOTAL EVENTS AND USERS
    // =====================================================
    // Count all events in the date range
    AnalyticsEvent.countDocuments({
      timestamp: { $gte: startDate, $lte: endDate }
    }),

    // Get distinct users who had events (for unique user count)
    AnalyticsEvent.distinct('userId', {
      timestamp: { $gte: startDate, $lte: endDate },
      userId: { $ne: null }  // Exclude anonymous events
    }),

    // =====================================================
    // FEATURE AND ACTION USAGE
    // =====================================================
    // Which features are being used most
    AnalyticsEvent.getFeatureUsage(startDate, endDate),

    // Which actions are most common
    AnalyticsEvent.getPopularActions(startDate, endDate, 10),

    // =====================================================
    // TRENDS AND BREAKDOWNS
    // =====================================================
    // How many active users per day
    AnalyticsEvent.getDailyActiveUsers(startDate, endDate),

    // Which pages get most visits
    AnalyticsEvent.getPageViews(startDate, endDate),

    // Device type distribution
    AnalyticsEvent.getDeviceBreakdown(startDate, endDate)
  ]);

  // =====================================================
  // CALCULATE SUMMARY METRICS
  // =====================================================
  return {
    summary: {
      totalEvents,                                          // Total tracked events
      uniqueUsers: uniqueUsers.length,                      // Distinct active users
      avgEventsPerUser: uniqueUsers.length > 0
        ? Math.round(totalEvents / uniqueUsers.length)      // Average activity per user
        : 0
    },
    featureUsage,          // Which features are used most
    popularActions,        // Most common user actions
    dailyActiveUsers,      // Trend of active users over time
    pageViews: pageViews.slice(0, 10),  // Top 10 pages only
    deviceBreakdown        // Device type distribution
  };
}

// =============================================================================
// FEATURE ANALYTICS
// =============================================================================

/**
 * getFeatureAnalytics(startDate, endDate, feature)
 * ------------------------------------------------
 * Generates detailed analytics for specific features or all features.
 * Shows usage patterns, popular actions, and user engagement by feature.
 *
 * BUSINESS LOGIC:
 * Feature-level analytics help product teams understand:
 * - Which features get used (popularity)
 * - How users interact with each feature (which actions?)
 * - When features are used (daily trends)
 * - Who uses features most (power users vs casual users)
 *
 * @param {Date} startDate - Start of the date range (inclusive)
 * @param {Date} endDate - End of the date range (inclusive)
 * @param {string} feature - Optional: specific feature to analyze
 *   If not provided, gets analytics for all features
 *
 * @returns {Promise<Object>} Feature analytics object
 *
 * RETURNED DATA STRUCTURE:
 * ```javascript
 * {
 *   usage: [
 *     {
 *       feature: 'notes',
 *       totalActions: 5000,
 *       uniqueUsers: 450,
 *       createActions: 1200,
 *       updateActions: 2500,
 *       deleteActions: 300,
 *       viewActions: 1000
 *     },
 *     // ... other features
 *   ],
 *   actionBreakdown: [
 *     {
 *       feature: 'notes',
 *       actions: [
 *         { action: 'view_note', count: 2000 },
 *         { action: 'create_note', count: 1200 },
 *         // ... top 10 actions
 *       ]
 *     }
 *   ],
 *   dailyUsage: [
 *     {
 *       date: '2024-01-15',
 *       features: [
 *         { feature: 'notes', count: 500 },
 *         { feature: 'tasks', count: 300 }
 *       ],
 *       total: 800
 *     }
 *   ],
 *   userEngagement: [
 *     { userId: '...', actionCount: 523, featureCount: 4 },
 *     // ... top 10 users
 *   ]
 * }
 * ```
 *
 * ACTION CATEGORIZATION:
 * Actions are automatically categorized by pattern matching:
 * - createActions: Contains "create" (user-initiated creation)
 * - updateActions: Contains "update" or "edit" (modifications)
 * - deleteActions: Contains "delete" or "remove" (removals)
 * - viewActions: Contains "view" or "open" (consumption)
 *
 * EXAMPLE USAGE:
 * ```javascript
 * // Get analytics for notes feature only
 * const notesAnalytics = await getFeatureAnalytics(startDate, endDate, 'notes');
 *
 * // Get analytics for all features
 * const allAnalytics = await getFeatureAnalytics(startDate, endDate);
 * ```
 */
async function getFeatureAnalytics(startDate, endDate, feature = null) {
  // =====================================================
  // BUILD QUERY FILTER
  // =====================================================
  // Start with date range and category filter
  const matchStage = {
    timestamp: { $gte: startDate, $lte: endDate },
    category: 'feature'  // Only feature-related events
  };

  // Optionally filter to specific feature if provided
  if (feature) {
    matchStage.feature = feature;
  }

  // =====================================================
  // GATHER ALL FEATURE ANALYTICS IN PARALLEL
  // =====================================================
  // Run all aggregations simultaneously for performance
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

  // =====================================================
  // RETURN COMBINED ANALYTICS
  // =====================================================
  return {
    usage,             // Overall usage stats by feature
    actionBreakdown,   // Which actions are popular in each feature
    dailyUsage,        // How usage varies by day
    userEngagement     // Which users are most active
  };
}

// =============================================================================
// USER ANALYTICS
// =============================================================================

/**
 * getUserAnalytics(startDate, endDate)
 * ------------------------------------
 * Generates analytics focused on user behavior and engagement patterns.
 * Shows who's active, how engaged they are, and when they're most active.
 *
 * BUSINESS LOGIC:
 * User analytics help understand engagement metrics:
 * - Who's most active (power users vs casual users)
 * - How long users stay engaged (session duration)
 * - When users are most active (time of day patterns)
 * - How retention trends (daily active users over time)
 * This helps identify engaged users and retention problems.
 *
 * @param {Date} startDate - Start of the date range (inclusive)
 * @param {Date} endDate - End of the date range (inclusive)
 *
 * @returns {Promise<Object>} User analytics object
 *
 * RETURNED DATA STRUCTURE:
 * ```javascript
 * {
 *   activeUsers: [
 *     {
 *       userId: '...',
 *       eventCount: 523,
 *       sessionCount: 12,
 *       featureCount: 4,
 *       lastActive: '2024-01-20T15:30:00Z'
 *     },
 *     // ... top 20 users
 *   ],
 *   sessionStats: {
 *     totalSessions: 1500,
 *     avgEventsPerSession: 3.2,
 *     avgSessionDurationMs: 180000  // 3 minutes
 *   },
 *   dailyActiveUsers: [
 *     { date: '2024-01-15', count: 450 },
 *     { date: '2024-01-16', count: 435 },
 *     // ... daily trend
 *   ],
 *   hourlyActivity: [
 *     { hour: 0, count: 50 },   // Midnight
 *     { hour: 8, count: 250 },  // 8 AM (peak)
 *     // ... 24 hours
 *   ]
 * }
 * ```
 *
 * EXAMPLE USAGE:
 * ```javascript
 * const userAnalytics = await getUserAnalytics(startDate, endDate);
 * console.log(`Average session duration: ${userAnalytics.sessionStats.avgSessionDurationMs}ms`);
 * console.log(`Daily active users: ${userAnalytics.dailyActiveUsers[0].count}`);
 * ```
 */
async function getUserAnalytics(startDate, endDate) {
  // =====================================================
  // GATHER ALL USER ANALYTICS IN PARALLEL
  // =====================================================
  const [
    activeUsers,
    newVsReturning,
    userSessions,
    hourlyActivity
  ] = await Promise.all([
    // =====================================================
    // MOST ACTIVE USERS IN PERIOD
    // =====================================================
    // Top 20 users ranked by event count (power users)
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
          sessions: { $addToSet: '$sessionId' },      // Which sessions
          features: { $addToSet: '$feature' },        // Which features used
          lastActive: { $max: '$timestamp' }          // Last activity time
        }
      },
      {
        $project: {
          userId: '$_id',
          eventCount: 1,
          sessionCount: { $size: '$sessions' },       // How many sessions
          featureCount: { $size: '$features' },       // How many features used
          lastActive: 1,
          _id: 0
        }
      },
      { $sort: { eventCount: -1 } },
      { $limit: 20 }
    ]),

    // =====================================================
    // SESSION STATISTICS
    // =====================================================
    // Aggregate session data to show engagement patterns
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
          duration: { $subtract: ['$endTime', '$startTime'] },  // Session length
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

    // Daily active users trend (see if retention improving/declining)
    AnalyticsEvent.getDailyActiveUsers(startDate, endDate),

    // Hourly activity pattern (when are users most active)
    AnalyticsEvent.getHourlyActivity(startDate, endDate)
  ]);

  // =====================================================
  // RETURN COMBINED USER ANALYTICS
  // =====================================================
  return {
    activeUsers,              // Top users by activity
    sessionStats: newVsReturning[0] || { totalSessions: 0, avgEventsPerSession: 0, avgSessionDurationMs: 0 },
    dailyActiveUsers: userSessions,  // DAU trend
    hourlyActivity            // When users are active
  };
}

// =============================================================================
// ERROR ANALYTICS
// =============================================================================

/**
 * getErrorAnalytics(startDate, endDate)
 * -------------------------------------
 * Analyzes application errors to identify bugs and stability issues.
 * Shows which errors are most common and which users are affected.
 *
 * BUSINESS LOGIC:
 * Error analytics help identify and prioritize bugs:
 * - High frequency errors block many users
 * - Page-specific errors help localize the problem
 * - User count shows how many people are impacted
 * - Last occurred shows if error is ongoing or historical
 * Admins use this to decide what to fix first.
 *
 * @param {Date} startDate - Start of the date range (inclusive)
 * @param {Date} endDate - End of the date range (inclusive)
 *
 * @returns {Promise<Array>} Top 20 errors by frequency
 *
 * RETURNED DATA STRUCTURE:
 * ```javascript
 * [
 *   {
 *     error: 'network_error',              // Error type/name
 *     page: '/notes',                      // Page where it occurred
 *     count: 150,                          // How many times
 *     lastOccurred: '2024-01-15T10:30:00Z', // Most recent occurrence
 *     affectedUsers: 45                    // Distinct users impacted
 *   },
 *   // ... more errors
 * ]
 * ```
 *
 * EXAMPLE USAGE:
 * ```javascript
 * const errors = await getErrorAnalytics(startDate, endDate);
 *
 * // Check most impactful errors
 * const topErrors = errors.slice(0, 5);
 * topErrors.forEach(err => {
 *   console.log(`${err.error} on ${err.page}: ${err.count} occurrences, ${err.affectedUsers} users`);
 * });
 * ```
 *
 * USE CASES:
 * - Identify most common bugs to prioritize fixes
 * - See which pages are unstable
 * - Track error trends over time
 * - Understand impact scope (how many users affected)
 */
async function getErrorAnalytics(startDate, endDate) {
  // =====================================================
  // AGGREGATE AND ANALYZE ERRORS
  // =====================================================
  return AnalyticsEvent.aggregate([
    {
      // Match only error events in the date range
      $match: {
        timestamp: { $gte: startDate, $lte: endDate },
        category: 'error'  // Only error-category events
      }
    },
    {
      // Group by error type and page (to see where it happens)
      $group: {
        _id: { action: '$action', page: '$page' },
        count: { $sum: 1 },                         // How many times occurred
        lastOccurred: { $max: '$timestamp' },       // Most recent time
        affectedUsers: { $addToSet: '$userId' }     // Which users were hit
      }
    },
    {
      // Transform to readable format
      $project: {
        error: '$_id.action',
        page: '$_id.page',
        count: 1,
        lastOccurred: 1,
        affectedUsers: { $size: '$affectedUsers' },  // Count distinct users
        _id: 0
      }
    },
    { $sort: { count: -1 } },  // Most frequent errors first
    { $limit: 20 }             // Top 20 errors
  ]);
}

// =============================================================================
// RETENTION METRICS
// =============================================================================

/**
 * getRetentionMetrics(startDate, endDate)
 * ---------------------------------------
 * Calculates user retention metrics by comparing activity across two time periods.
 * Shows what percentage of users return after their initial activity.
 *
 * BUSINESS LOGIC:
 * Retention is a key success metric:
 * - High retention = users find value and keep coming back
 * - Low retention = users try app once and abandon it
 * We calculate by splitting the date range in half and counting users
 * who were active in BOTH periods.
 *
 * @param {Date} startDate - Start of the date range (inclusive)
 * @param {Date} endDate - End of the date range (inclusive)
 *
 * @returns {Promise<Object>} Retention metrics object
 *
 * RETURNED DATA:
 * ```javascript
 * {
 *   firstPeriodUsers: 200,    // Users active in first half of period
 *   secondPeriodUsers: 180,   // Users active in second half of period
 *   retainedUsers: 150,       // Users who were active in BOTH halves
 *   retentionRate: 75         // Percentage: (retained / first) * 100
 * }
 * ```
 *
 * INTERPRETATION GUIDE:
 * - Retention > 70%: Excellent - users find value
 * - Retention 40-70%: Good - decent return rate
 * - Retention 20-40%: Fair - room for improvement
 * - Retention < 20%: Poor - users aren't coming back
 *
 * EXAMPLE USAGE:
 * ```javascript
 * // Get retention for last 30 days
 * const lastMonth = new Date();
 * lastMonth.setDate(lastMonth.getDate() - 30);
 * const retention = await getRetentionMetrics(lastMonth, new Date());
 *
 * console.log(`${retention.retentionRate}% of users returned`);
 * if (retention.retentionRate < 30) {
 *   // Alert: very low retention, investigate UX issues
 * }
 * ```
 */
async function getRetentionMetrics(startDate, endDate) {
  // =====================================================
  // CALCULATE MIDPOINT
  // =====================================================
  // Split the date range exactly in half
  const midPoint = new Date((startDate.getTime() + endDate.getTime()) / 2);

  // =====================================================
  // GET USERS ACTIVE IN EACH PERIOD
  // =====================================================
  // Query users separately for first and second half
  const [firstPeriodUsers, secondPeriodUsers] = await Promise.all([
    // Users who had any activity in the first half of the period
    AnalyticsEvent.distinct('userId', {
      timestamp: { $gte: startDate, $lt: midPoint },
      userId: { $ne: null }  // Exclude anonymous
    }),
    // Users who had any activity in the second half of the period
    AnalyticsEvent.distinct('userId', {
      timestamp: { $gte: midPoint, $lte: endDate },
      userId: { $ne: null }  // Exclude anonymous
    })
  ]);

  // =====================================================
  // CALCULATE RETAINED USERS
  // =====================================================
  // Convert to Sets for efficient intersection (finding common IDs)
  const firstSet = new Set(firstPeriodUsers.map(id => id?.toString()));
  const secondSet = new Set(secondPeriodUsers.map(id => id?.toString()));

  // Find users who appear in BOTH periods (retained = returned)
  const retained = [...firstSet].filter(id => secondSet.has(id)).length;

  // =====================================================
  // CALCULATE RETENTION RATE
  // =====================================================
  // Retention % = (users who returned) / (users in first period) * 100
  const retentionRate = firstSet.size > 0
    ? Math.round((retained / firstSet.size) * 100)
    : 0;

  return {
    firstPeriodUsers: firstSet.size,     // How many users in first half
    secondPeriodUsers: secondSet.size,   // How many users in second half
    retainedUsers: retained,             // How many came back (in both)
    retentionRate                        // Percentage retained
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
