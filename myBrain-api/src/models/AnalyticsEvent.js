/**
 * =============================================================================
 * ANALYTICSEVENT.JS - User Interaction and Usage Tracking
 * =============================================================================
 *
 * This file defines the AnalyticsEvent model - the data structure for tracking
 * how users interact with myBrain, what features they use, and how they
 * navigate the application.
 *
 * WHAT IS AN ANALYTICS EVENT?
 * ---------------------------
 * An analytics event is a recorded action or interaction. Every time a user
 * does something meaningful (views a page, creates a note, searches, etc.),
 * we can record it as an event.
 *
 * WHY TRACK ANALYTICS?
 * --------------------
 * Analytics help us understand:
 * 1. FEATURE USAGE: Which features are most/least used?
 * 2. USER BEHAVIOR: How do users navigate the app?
 * 3. PERFORMANCE: Where do users encounter errors?
 * 4. ENGAGEMENT: How often do users return? How long do they stay?
 * 5. TRENDS: Is a feature becoming more or less popular?
 *
 * EXAMPLE EVENTS:
 * ---------------
 * - User views the Dashboard → category: 'page_view', page: '/app'
 * - User creates a new note → category: 'feature', action: 'create_note'
 * - User searches for "meeting" → category: 'search', action: 'search'
 * - User encounters an error → category: 'error', action: 'api_error'
 *
 * PRIVACY CONSIDERATIONS:
 * -----------------------
 * - Anonymous events (no userId) are allowed for pre-login tracking
 * - Events auto-delete after 1 year (TTL index)
 * - No personal content is stored, just actions and metadata
 *
 * DATA RETENTION:
 * ---------------
 * Events older than 1 year are automatically deleted by MongoDB's
 * TTL (Time To Live) index. This keeps the database manageable
 * and respects user privacy.
 *
 * =============================================================================
 */

// =============================================================================
// IMPORTS
// =============================================================================

/**
 * Mongoose is the library we use to interact with MongoDB.
 * It provides schemas (blueprints) and models (tools to work with data).
 */
import mongoose from 'mongoose';

// =============================================================================
// ANALYTICS EVENT SCHEMA DEFINITION
// =============================================================================

/**
 * The Analytics Event Schema
 * --------------------------
 * Tracks user interactions and feature usage across the application.
 * Designed for aggregation and trend analysis.
 */
const analyticsEventSchema = new mongoose.Schema({

  // ===========================================================================
  // USER IDENTIFICATION
  // ===========================================================================

  /**
   * userId: Which user triggered this event
   * - null: Anonymous/pre-login events
   * - Index: For finding a user's activity
   *
   * WHY NULLABLE?
   * Some events happen before login (landing page views, signup attempts)
   * or we want to track anonymous usage patterns.
   */
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true,
    default: null
  },

  /**
   * sessionId: Groups events from the same browsing session
   * - Generated on the client when user starts using the app
   * - Helps track user journeys across multiple events
   *
   * EXAMPLE:
   * All events from one visit might share: "sess_abc123xyz"
   * This lets us see: "User viewed dashboard → created note → logged out"
   */
  sessionId: {
    type: String,
    index: true
  },

  // ===========================================================================
  // EVENT CATEGORIZATION
  // ===========================================================================

  /**
   * category: High-level grouping of event types
   * - Required: Every event needs a category
   * - Index: For filtering reports by category
   *
   * VALUES:
   * - 'page_view': User visited a page/route
   * - 'feature': User used a feature (create, update, delete)
   * - 'engagement': Engagement metrics (time spent, scroll depth)
   * - 'navigation': How users move through the app
   * - 'search': Search queries and results
   * - 'error': Errors encountered by users
   * - 'auth': Login, logout, signup events
   * - 'settings': Settings changes
   */
  category: {
    type: String,
    required: true,
    enum: [
      'page_view',      // Page/route views
      'feature',        // Feature usage (create, update, delete actions)
      'engagement',     // User engagement (time spent, scroll depth, etc.)
      'navigation',     // Navigation patterns
      'search',         // Search queries
      'error',          // Errors encountered
      'auth',           // Authentication events
      'settings'        // Settings changes
    ],
    index: true
  },

  /**
   * action: Specific action/event name within the category
   * - Required: Describes what happened
   * - Index: For counting specific actions
   *
   * EXAMPLES:
   * - category: 'feature', action: 'create_note'
   * - category: 'feature', action: 'complete_task'
   * - category: 'auth', action: 'login_success'
   * - category: 'error', action: 'api_500_error'
   */
  action: {
    type: String,
    required: true,
    index: true
  },

  /**
   * feature: Which feature or component this event relates to
   * - Default: 'other' if not specified
   * - Index: For feature usage reports
   *
   * VALUES:
   * Core features: notes, tasks, calendar, events, projects
   * Utilities: life_areas, weather, search, inbox, dashboard
   * User: profile, settings, admin, auth
   * Other: tags, locations, other
   */
  feature: {
    type: String,
    enum: [
      'notes',          // Notes feature
      'tasks',          // Tasks feature
      'calendar',       // Calendar views
      'events',         // Calendar events
      'projects',       // Projects feature
      'life_areas',     // Life areas/categories
      'weather',        // Weather widget
      'search',         // Global search
      'inbox',          // Inbox feature
      'dashboard',      // Dashboard
      'profile',        // User profile
      'settings',       // User settings
      'admin',          // Admin features
      'auth',           // Authentication
      'tags',           // Tags management
      'locations',      // Saved locations
      'other'           // Everything else
    ],
    default: 'other',
    index: true
  },

  // ===========================================================================
  // EVENT CONTEXT
  // ===========================================================================

  /**
   * metadata: Additional context/data about the event
   * - Mixed type: Can hold any JSON data
   * - Use for event-specific details
   *
   * EXAMPLES:
   * - For search: { query: 'meeting', resultsCount: 5 }
   * - For error: { errorCode: 500, endpoint: '/api/notes' }
   * - For feature: { noteId: '123', wordCount: 150 }
   */
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },

  /**
   * page: The page/route where the event occurred
   *
   * EXAMPLES:
   * - '/app' (dashboard)
   * - '/app/notes' (notes list)
   * - '/app/notes/123' (specific note)
   */
  page: {
    type: String
  },

  /**
   * referrer: The previous page the user came from
   * - Helps understand navigation patterns
   *
   * EXAMPLE:
   * User on '/app/notes' with referrer '/app' means they
   * navigated from dashboard to notes.
   */
  referrer: {
    type: String
  },

  // ===========================================================================
  // DEVICE INFORMATION
  // ===========================================================================

  /**
   * userAgent: The full user agent string from the browser
   * - Contains browser, OS, and device information
   *
   * EXAMPLE:
   * "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0"
   */
  userAgent: {
    type: String
  },

  /**
   * deviceType: Parsed device category
   * - Easier to query than parsing userAgent
   *
   * VALUES:
   * - 'desktop': Desktop/laptop computers
   * - 'tablet': Tablets (iPad, Android tablets)
   * - 'mobile': Smartphones
   * - 'unknown': Could not be determined
   */
  deviceType: {
    type: String,
    enum: ['desktop', 'tablet', 'mobile', 'unknown'],
    default: 'unknown'
  },

  /**
   * browser: Browser name
   *
   * EXAMPLES: 'Chrome', 'Firefox', 'Safari', 'Edge'
   */
  browser: {
    type: String
  },

  /**
   * os: Operating system name
   *
   * EXAMPLES: 'Windows', 'macOS', 'iOS', 'Android', 'Linux'
   */
  os: {
    type: String
  },

  /**
   * screenSize: User's screen dimensions
   * - Helps understand device capabilities
   */
  screenSize: {
    /**
     * width: Screen width in pixels
     * EXAMPLES: 1920, 1366, 375
     */
    width: Number,

    /**
     * height: Screen height in pixels
     * EXAMPLES: 1080, 768, 812
     */
    height: Number
  },

  // ===========================================================================
  // TIMING
  // ===========================================================================

  /**
   * timestamp: When the event occurred
   * - Default: Current time when created
   * - Index: For time-based queries and TTL deletion
   */
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },

  /**
   * duration: How long the action took (in milliseconds)
   * - Useful for page views (time on page)
   * - Useful for tracking slow operations
   * - null if not applicable
   *
   * EXAMPLES:
   * - Page view duration: 45000 (45 seconds on page)
   * - API call duration: 250 (250ms to complete)
   */
  duration: {
    type: Number,
    default: null
  }
}, {
  /**
   * timestamps: true automatically adds:
   * - createdAt: When the event was recorded
   * - updatedAt: When it was last modified (rarely used for events)
   */
  timestamps: true
});

// =============================================================================
// DATABASE INDEXES
// =============================================================================

/**
 * Index for Event Analysis
 * ------------------------
 * Quickly query events by category and action over time.
 * Used for reports like "How many notes were created this week?"
 */
analyticsEventSchema.index({ category: 1, action: 1, timestamp: -1 });

/**
 * Index for Feature Usage
 * -----------------------
 * Quickly get all events for a specific feature over time.
 * Used for reports like "How is the calendar feature being used?"
 */
analyticsEventSchema.index({ feature: 1, timestamp: -1 });

/**
 * Index for User Activity
 * -----------------------
 * Get all events for a specific user over time.
 * Used for user activity reports and debugging.
 */
analyticsEventSchema.index({ userId: 1, timestamp: -1 });

/**
 * Index for Time-Based Queries
 * ----------------------------
 * General index for any time-based queries.
 */
analyticsEventSchema.index({ timestamp: -1 });

/**
 * TTL Index - Auto-Delete Old Events
 * ----------------------------------
 * Automatically delete events older than 1 year.
 *
 * HOW IT WORKS:
 * MongoDB checks this index periodically (usually every 60 seconds).
 * If timestamp + 365 days < now, the document is deleted.
 *
 * WHY 1 YEAR?
 * - Keeps database size manageable
 * - Older analytics data has diminishing value
 * - Respects user privacy
 *
 * CALCULATION:
 * 365 days × 24 hours × 60 minutes × 60 seconds = 31,536,000 seconds
 */
analyticsEventSchema.index(
  { timestamp: 1 },
  { expireAfterSeconds: 365 * 24 * 60 * 60 }
);

// =============================================================================
// STATIC METHODS (Called on the Model, not an instance)
// =============================================================================

/**
 * track(eventData)
 * ----------------
 * Record a new analytics event.
 * Designed to be fire-and-forget (won't throw errors).
 *
 * @param {Object} eventData - Event data to record
 * @returns {Object|null} - The created event or null if failed
 *
 * WHY FIRE-AND-FORGET?
 * Analytics should never break the user experience.
 * If tracking fails, we log it but don't crash the app.
 *
 * EXAMPLE:
 * await AnalyticsEvent.track({
 *   userId: user._id,
 *   category: 'feature',
 *   action: 'create_note',
 *   feature: 'notes',
 *   metadata: { wordCount: 150 }
 * });
 */
analyticsEventSchema.statics.track = async function(eventData) {
  try {
    const event = new this(eventData);
    await event.save();
    return event;
  } catch (error) {
    // Log but don't throw - analytics shouldn't break the app
    console.error('Failed to track analytics event:', error);
    return null;
  }
};

/**
 * getFeatureUsage(startDate, endDate)
 * -----------------------------------
 * Get usage statistics for each feature.
 *
 * @param {Date} startDate - Start of date range
 * @param {Date} endDate - End of date range
 * @returns {Array} - Array of { feature, count, uniqueUsers }
 *
 * EXAMPLE OUTPUT:
 * [
 *   { feature: 'notes', count: 1250, uniqueUsers: 89 },
 *   { feature: 'tasks', count: 980, uniqueUsers: 72 },
 *   { feature: 'calendar', count: 450, uniqueUsers: 45 }
 * ]
 *
 * USAGE:
 * Shows which features are most popular and how many
 * unique users are engaging with each feature.
 */
analyticsEventSchema.statics.getFeatureUsage = async function(startDate, endDate) {
  return this.aggregate([
    // Filter to date range and feature events
    {
      $match: {
        timestamp: { $gte: startDate, $lte: endDate },
        category: 'feature'
      }
    },
    // Group by feature
    {
      $group: {
        _id: '$feature',
        count: { $sum: 1 },                    // Total events
        uniqueUsers: { $addToSet: '$userId' }, // Collect unique user IDs
        actions: { $push: '$action' }          // All action names
      }
    },
    // Format the output
    {
      $project: {
        feature: '$_id',
        count: 1,
        uniqueUsers: { $size: '$uniqueUsers' }, // Count unique users
        _id: 0
      }
    },
    // Sort by most used
    { $sort: { count: -1 } }
  ]);
};

/**
 * getPopularActions(startDate, endDate, limit)
 * --------------------------------------------
 * Get the most common actions across all features.
 *
 * @param {Date} startDate - Start of date range
 * @param {Date} endDate - End of date range
 * @param {number} limit - Max results to return (default 20)
 * @returns {Array} - Array of { feature, action, count, uniqueUsers }
 *
 * EXAMPLE OUTPUT:
 * [
 *   { feature: 'notes', action: 'view_note', count: 520, uniqueUsers: 78 },
 *   { feature: 'tasks', action: 'complete_task', count: 380, uniqueUsers: 65 },
 *   { feature: 'notes', action: 'create_note', count: 250, uniqueUsers: 45 }
 * ]
 *
 * USAGE:
 * Understand what users actually DO in the app.
 * Are they viewing more than creating? Completing tasks?
 */
analyticsEventSchema.statics.getPopularActions = async function(startDate, endDate, limit = 20) {
  return this.aggregate([
    // Filter to date range and feature events
    {
      $match: {
        timestamp: { $gte: startDate, $lte: endDate },
        category: 'feature'
      }
    },
    // Group by feature AND action combination
    {
      $group: {
        _id: { feature: '$feature', action: '$action' },
        count: { $sum: 1 },
        uniqueUsers: { $addToSet: '$userId' }
      }
    },
    // Format the output
    {
      $project: {
        feature: '$_id.feature',
        action: '$_id.action',
        count: 1,
        uniqueUsers: { $size: '$uniqueUsers' },
        _id: 0
      }
    },
    // Sort by most common
    { $sort: { count: -1 } },
    // Limit results
    { $limit: limit }
  ]);
};

/**
 * getDailyActiveUsers(startDate, endDate)
 * ---------------------------------------
 * Get the count of unique active users per day.
 *
 * @param {Date} startDate - Start of date range
 * @param {Date} endDate - End of date range
 * @returns {Array} - Array of { date, count }
 *
 * EXAMPLE OUTPUT:
 * [
 *   { date: '2024-01-15', count: 125 },
 *   { date: '2024-01-16', count: 142 },
 *   { date: '2024-01-17', count: 118 }
 * ]
 *
 * USAGE:
 * Track daily active users (DAU) over time.
 * See trends, growth, and impact of new features.
 */
analyticsEventSchema.statics.getDailyActiveUsers = async function(startDate, endDate) {
  return this.aggregate([
    // Filter to date range, exclude anonymous events
    {
      $match: {
        timestamp: { $gte: startDate, $lte: endDate },
        userId: { $ne: null }
      }
    },
    // Group by day
    {
      $group: {
        _id: {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } }
        },
        uniqueUsers: { $addToSet: '$userId' }
      }
    },
    // Format the output
    {
      $project: {
        date: '$_id.date',
        count: { $size: '$uniqueUsers' },
        _id: 0
      }
    },
    // Sort chronologically
    { $sort: { date: 1 } }
  ]);
};

/**
 * getPageViews(startDate, endDate)
 * --------------------------------
 * Get page view statistics.
 *
 * @param {Date} startDate - Start of date range
 * @param {Date} endDate - End of date range
 * @returns {Array} - Array of { page, count, uniqueUsers, avgDuration }
 *
 * EXAMPLE OUTPUT:
 * [
 *   { page: '/app', count: 1500, uniqueUsers: 150, avgDuration: 45000 },
 *   { page: '/app/notes', count: 980, uniqueUsers: 95, avgDuration: 120000 },
 *   { page: '/app/tasks', count: 750, uniqueUsers: 82, avgDuration: 60000 }
 * ]
 *
 * USAGE:
 * See which pages are most visited, how long users spend on each,
 * and how many unique users visit each page.
 */
analyticsEventSchema.statics.getPageViews = async function(startDate, endDate) {
  return this.aggregate([
    // Filter to date range and page view events
    {
      $match: {
        timestamp: { $gte: startDate, $lte: endDate },
        category: 'page_view'
      }
    },
    // Group by page
    {
      $group: {
        _id: '$page',
        count: { $sum: 1 },
        uniqueUsers: { $addToSet: '$userId' },
        avgDuration: { $avg: '$duration' }
      }
    },
    // Format the output
    {
      $project: {
        page: '$_id',
        count: 1,
        uniqueUsers: { $size: '$uniqueUsers' },
        avgDuration: { $round: ['$avgDuration', 0] }, // Round to whole ms
        _id: 0
      }
    },
    // Sort by most views
    { $sort: { count: -1 } }
  ]);
};

/**
 * getDeviceBreakdown(startDate, endDate)
 * --------------------------------------
 * Get breakdown of users by device type.
 *
 * @param {Date} startDate - Start of date range
 * @param {Date} endDate - End of date range
 * @returns {Array} - Array of { deviceType, count, uniqueUsers }
 *
 * EXAMPLE OUTPUT:
 * [
 *   { deviceType: 'desktop', count: 8500, uniqueUsers: 120 },
 *   { deviceType: 'mobile', count: 3200, uniqueUsers: 85 },
 *   { deviceType: 'tablet', count: 450, uniqueUsers: 25 }
 * ]
 *
 * USAGE:
 * Understand what devices your users prefer.
 * Helps prioritize mobile vs desktop development.
 */
analyticsEventSchema.statics.getDeviceBreakdown = async function(startDate, endDate) {
  return this.aggregate([
    // Filter to date range
    {
      $match: {
        timestamp: { $gte: startDate, $lte: endDate }
      }
    },
    // Group by device type
    {
      $group: {
        _id: '$deviceType',
        count: { $sum: 1 },
        uniqueUsers: { $addToSet: '$userId' }
      }
    },
    // Format the output
    {
      $project: {
        deviceType: '$_id',
        count: 1,
        uniqueUsers: { $size: '$uniqueUsers' },
        _id: 0
      }
    },
    // Sort by most events
    { $sort: { count: -1 } }
  ]);
};

/**
 * getHourlyActivity(startDate, endDate)
 * -------------------------------------
 * Get activity patterns by hour of day.
 *
 * @param {Date} startDate - Start of date range
 * @param {Date} endDate - End of date range
 * @returns {Array} - Array of { hour, count } for hours 0-23
 *
 * EXAMPLE OUTPUT:
 * [
 *   { hour: 0, count: 120 },   // Midnight
 *   { hour: 1, count: 45 },    // 1 AM
 *   ...
 *   { hour: 9, count: 850 },   // 9 AM (peak)
 *   { hour: 14, count: 920 },  // 2 PM (peak)
 *   ...
 *   { hour: 23, count: 180 }   // 11 PM
 * ]
 *
 * USAGE:
 * Understand when users are most active.
 * Schedule maintenance during low-activity hours.
 * Target notifications during peak hours.
 */
analyticsEventSchema.statics.getHourlyActivity = async function(startDate, endDate) {
  return this.aggregate([
    // Filter to date range
    {
      $match: {
        timestamp: { $gte: startDate, $lte: endDate }
      }
    },
    // Group by hour of day (0-23)
    {
      $group: {
        _id: { $hour: '$timestamp' },
        count: { $sum: 1 }
      }
    },
    // Format the output
    {
      $project: {
        hour: '$_id',
        count: 1,
        _id: 0
      }
    },
    // Sort by hour
    { $sort: { hour: 1 } }
  ]);
};

// =============================================================================
// CREATE AND EXPORT MODEL
// =============================================================================

/**
 * Create the AnalyticsEvent model from the schema.
 * This gives us methods to:
 * - Track events: AnalyticsEvent.track(eventData)
 * - Get feature usage: AnalyticsEvent.getFeatureUsage(start, end)
 * - Get popular actions: AnalyticsEvent.getPopularActions(start, end)
 * - Get DAU: AnalyticsEvent.getDailyActiveUsers(start, end)
 * - Get page views: AnalyticsEvent.getPageViews(start, end)
 * - Get devices: AnalyticsEvent.getDeviceBreakdown(start, end)
 * - Get hourly patterns: AnalyticsEvent.getHourlyActivity(start, end)
 *
 * TYPICAL USAGE:
 * 1. Track events throughout the app as users interact
 * 2. Build admin dashboard to visualize analytics
 * 3. Use insights to improve features and UX
 * 4. Old events auto-delete after 1 year
 */
const AnalyticsEvent = mongoose.model('AnalyticsEvent', analyticsEventSchema);

export default AnalyticsEvent;
