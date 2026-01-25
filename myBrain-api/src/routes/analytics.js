/**
 * =============================================================================
 * ANALYTICS.JS - Analytics Tracking Routes
 * =============================================================================
 *
 * This file handles event tracking for myBrain's analytics system.
 * Analytics help us understand how users interact with the app, so we can
 * improve features and fix problems.
 *
 * WHAT IS ANALYTICS?
 * ------------------
 * Analytics is the practice of collecting and analyzing data about how users
 * interact with the app. Examples:
 * - Which features do users use most?
 * - Which features don't get used?
 * - How long do users spend on each page?
 * - What's the conversion rate (free → premium)?
 * - Where do users abandon tasks?
 *
 * HOW IT WORKS IN MYBRAIN:
 * ------------------------
 * 1. FRONTEND TRACKS EVENTS: When users do something (create note, view task),
 *    the frontend sends an event to this API
 * 2. EVENT STORED: The event is saved to database with details
 * 3. ADMINS VIEW REPORTS: Admins can view analytics dashboard to see patterns
 * 4. IMPROVE APP: We use this data to make better features
 *
 * PRIVACY NOTES:
 * ---------------
 * - Users consent to analytics in terms of service
 * - Only aggregated data shared publicly (not individual user data)
 * - Users can opt-out in settings
 * - Data is never sold to third parties
 *
 * ANALYTICS ENDPOINTS:
 * --------------------
 * - POST /analytics/track - Track a single event
 * - POST /analytics/track/batch - Track multiple events at once
 * - GET /analytics/summary - Get summary statistics (admin only)
 * - GET /analytics/events - Get list of tracked events (admin only)
 * - GET /analytics/by-feature - Break down analytics by feature
 *
 * EXAMPLE EVENT DATA:
 * -------------------
 * {
 *   category: "note",        // What feature (note, task, project, etc)
 *   action: "create",        // What action (create, update, delete, view)
 *   feature: "rich_editor",  // Optional: specific feature used
 *   metadata: {...},         // Optional: additional context
 *   duration: 1234           // How long user spent (ms)
 * }
 *
 * =============================================================================
 */

// =============================================================================
// IMPORTS - Loading External Libraries and Internal Modules
// =============================================================================
// The imports section loads all the tools we need to track user analytics
// and handle analytics requests. We import both external libraries and
// internal models and services for analytics tracking.

/**
 * Express is a web framework for Node.js that makes it easy to:
 * - Handle HTTP requests (GET, POST, PUT, DELETE)
 * - Define routes (URLs that the frontend calls to track events)
 * - Use middleware (functions that process requests before handlers run)
 */
import express from 'express';

/**
 * Authentication middleware for protecting routes.
 * - requireAuth ensures only logged-in users can track events
 * - requireAdmin restricts admin-only analytics endpoints to admins only
 * This prevents anonymous users from submitting fake analytics data.
 */
import { requireAuth, requireAdmin } from '../middleware/auth.js';

/**
 * Request logging middleware to attach entity IDs to requests.
 * We use this to associate analytics tracking with the user who tracked it,
 * so we can maintain an audit trail of who sent what event data.
 */
import { attachEntityId } from '../middleware/requestLogger.js';

/**
 * Analytics service contains the business logic for:
 * - Storing analytics events in the database
 * - Querying analytics data for reports
 * - Calculating summaries and statistics
 * - Processing batch event submissions
 */
import analyticsService from '../services/analyticsService.js';

/**
 * AnalyticsEvent is the database model for analytics events.
 * We use it to query raw analytics data for advanced filtering,
 * summaries, and real-time dashboards.
 */
import AnalyticsEvent from '../models/AnalyticsEvent.js';

// Create an Express router to group all analytics-related routes together
const router = express.Router();

// =============================================================================
// USER-FACING ANALYTICS - Track Events from Frontend
// =============================================================================
// These endpoints are available to ALL authenticated users.
// The frontend calls these when users interact with the app so we can
// understand how the app is being used.

/**
 * POST /analytics/track
 * Track a single analytics event
 *
 * PURPOSE:
 * Records when a user performs an action in the app (creates note, completes task, etc).
 * Used to understand user behavior, engagement, and feature adoption.
 *
 * WHAT IS AN EVENT?
 * An event is a record of something a user did in the app. Each event has:
 * - category: What feature was used (note, task, project, settings, etc)
 * - action: What the user did (create, update, delete, view, share, etc)
 * - metadata: Optional additional context (size of note, task priority, etc)
 * - duration: How long the user spent on this action (milliseconds)
 * - page: Which page/view the action happened in
 * - sessionId: Groups related events from same session
 *
 * EXAMPLE EVENT PAYLOADS:
 * User creates a note:
 * {
 *   "category": "note",
 *   "action": "create",
 *   "duration": 45000,
 *   "metadata": { "wordCount": 150, "hasImages": true }
 * }
 *
 * User completes a task:
 * {
 *   "category": "task",
 *   "action": "complete",
 *   "duration": 12000,
 *   "metadata": { "priority": "high", "daysOpen": 5 }
 * }
 *
 * WHY TRACKING MATTERS:
 * - Understand which features are popular (data-driven feature decisions)
 * - Find features users struggle with (identifies UX problems)
 * - Track engagement metrics (are users actually using the app?)
 * - Identify power users vs casual users (different support/retention strategies)
 * - Monitor for suspicious activity (account takeovers, bots, abuse)
 * - Track conversions (free → premium, feature adoption)
 *
 * @body {string} category - Feature category (required)
 *   Enum: "note", "task", "project", "event", "message", "settings", etc
 * @body {string} action - Action type (required)
 *   Enum: "create", "update", "delete", "view", "share", "complete", etc
 * @body {string} feature - Specific feature used (optional)
 *   Example: "rich_editor", "markdown", "ai_suggestions"
 * @body {object} metadata - Additional context data (optional)
 *   Example: { "wordCount": 150, "hasImages": true }
 * @body {string} page - Which page/view action happened on (optional)
 *   Example: "notes", "dashboard", "settings", "admin"
 * @body {string} referrer - Where user came from (optional)
 *   Example: "/dashboard" (previous page)
 * @body {string} screenSize - User's device screen size (optional)
 *   Example: "mobile", "tablet", "desktop"
 * @body {number} duration - Milliseconds spent on this action (optional)
 *   Example: 45000 (45 seconds)
 * @body {string} sessionId - User's session ID (optional)
 *   Used to group related events from same session
 *
 * @returns {Object} - Success response:
 * {
 *   "success": true,
 *   "data": {
 *     "tracked": true
 *   }
 * }
 *
 * @throws {400} - Missing required fields (category or action)
 * @throws {401} - User not authenticated
 * @throws {500} - Server error
 *
 * EXAMPLE REQUEST:
 * POST /analytics/track
 * Authorization: Bearer <JWT_TOKEN>
 * Content-Type: application/json
 * {
 *   "category": "note",
 *   "action": "create",
 *   "duration": 45000,
 *   "metadata": { "wordCount": 150, "hasImages": true },
 *   "page": "notes"
 * }
 *
 * EXAMPLE RESPONSE:
 * {
 *   "success": true,
 *   "data": { "tracked": true }
 * }
 *
 * WIDE EVENTS LOGGING:
 * - Event name: 'analytics.track.success' - tracks when events are recorded
 * - Used to monitor analytics system itself
 */
router.post('/track', requireAuth, async (req, res, next) => {
  try {
    // Extract all event data from the request body
    // These fields describe what the user did and when
    const {
      category,        // Required: feature category (note, task, project, etc)
      action,         // Required: what action they performed (create, update, etc)
      feature,        // Optional: specific feature used (rich_editor, markdown, etc)
      metadata,       // Optional: additional context (size, priority, tags, etc)
      page,           // Optional: which page/view (dashboard, inbox, today, etc)
      referrer,       // Optional: where they came from (internal URL)
      screenSize,     // Optional: device screen size (mobile, tablet, desktop, etc)
      duration,       // Optional: milliseconds spent on action
      sessionId       // Optional: session ID to group related events
    } = req.body;

    // =============================================================================
    // STEP 1: Validate Required Fields
    // =============================================================================
    // Category and action are REQUIRED for every event
    // WHY: Without these, we can't categorize what the user did
    if (!category || !action) {
      return res.status(400).json({
        success: false,
        error: 'Category and action are required'
      });
    }

    // =============================================================================
    // STEP 2: Call Analytics Service to Store Event
    // =============================================================================
    // The service handles the database insertion and any processing
    const event = await analyticsService.trackEvent({
      userId: req.user._id,         // Which user performed this action
      sessionId,                    // Group events from same session
      category,                     // Feature category
      action,                       // Action performed
      feature,                      // Specific feature used
      metadata,                     // Extra context
      page,                         // Which page they were on
      referrer,                     // Where they came from
      userAgent: req.headers['user-agent'],  // Browser/device info for analytics
      screenSize,                   // Screen size for UX decisions
      duration                      // Time spent on action
    });

    // =============================================================================
    // STEP 3: Return Success Response
    // =============================================================================
    // Return whether event was successfully tracked
    res.status(201).json({
      success: true,
      data: { tracked: !!event }  // !!event converts to true/false
    });
  } catch (error) {
    // Error handling: pass to error middleware
    next(error);
  }
});

/**
 * POST /analytics/track/batch
 * Track multiple analytics events in a single request
 *
 * This is an optimized endpoint for tracking multiple events at once.
 * Instead of making 50 separate requests (slow), the frontend can send
 * 50 events in one request (fast).
 *
 * WHEN TO USE:
 * -----------
 * - When user navigates away from a page with many pending events
 * - When collecting events locally and syncing periodically
 * - When the frontend wants to batch events from a session
 * - When tracking rapid user interactions (e.g., typing, scrolling)
 *
 * EXAMPLE REQUEST:
 * ---------------
 * POST /analytics/track/batch
 * {
 *   events: [
 *     { category: "note", action: "view", duration: 5000 },
 *     { category: "note", action: "edit", duration: 8000 },
 *     { category: "note", action: "save", duration: 1000 }
 *   ]
 * }
 *
 * LIMITS:
 * -------
 * - Maximum 50 events per batch (prevents abuse)
 * - All events from same user (req.user._id)
 * - Each event follows same validation as single track endpoint
 *
 * @body {array} events - Array of event objects (required)
 * @returns {Object} { success: true, data: { tracked: number } }
 */
router.post('/track/batch', requireAuth, async (req, res, next) => {
  try {
    // Extract events array from request body
    const { events } = req.body;

    // =============================================================================
    // STEP 1: Validate Events Array
    // =============================================================================
    // Check that events is an array and not empty
    // WHY: Without this, malicious users could send invalid data
    if (!Array.isArray(events) || events.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Events array is required'
      });
    }

    // =============================================================================
    // STEP 2: Get User Agent From Request Headers
    // =============================================================================
    // User agent is the same for all events in this batch
    // Extract it once instead of from headers for each event
    const userAgent = req.headers['user-agent'];

    // =============================================================================
    // STEP 3: Track All Events in Parallel
    // =============================================================================
    // Use Promise.all to process all events concurrently (faster than sequential)
    // Limit to 50 events max to prevent abuse (database query overload)
    // WHY: Sending 10,000 events at once could crash the server
    const results = await Promise.all(
      events.slice(0, 50).map(event =>  // Limit to first 50 events
        analyticsService.trackEvent({
          userId: req.user._id,         // All events from same user
          sessionId: event.sessionId,   // Optional: group events by session
          category: event.category,     // Feature (note, task, etc)
          action: event.action,         // Action (create, update, etc)
          feature: event.feature,       // Optional: specific feature
          metadata: event.metadata,     // Optional: extra context
          page: event.page,             // Optional: which page
          referrer: event.referrer,     // Optional: where from
          userAgent,                    // Same for all events
          screenSize: event.screenSize, // Optional: device size
          duration: event.duration      // Optional: time spent
        })
      )
    );

    // =============================================================================
    // STEP 4: Return Count of Successfully Tracked Events
    // =============================================================================
    // Count how many events were successfully stored (non-null results)
    res.status(201).json({
      success: true,
      data: { tracked: results.filter(Boolean).length }  // Filter out failures
    });
  } catch (error) {
    next(error);
  }
});

// =============================================================================
// ADMIN-ONLY ANALYTICS - Reports and Dashboards (Admins Only)
// =============================================================================
// These endpoints provide detailed analytics reports for platform admins.
// Only users with admin role can access these endpoints.
// They show aggregated analytics data that helps admins understand platform usage,
// identify trends, and make data-driven decisions about features.

/**
 * GET /analytics/overview
 * Get high-level analytics overview for dashboard
 *
 * This endpoint provides a summary of how the platform is being used.
 * Admins can see:
 * - Total events tracked
 * - Total active users
 * - Top features being used
 * - Event trends over time
 * - User engagement metrics
 *
 * EXAMPLE USES:
 * -----------
 * - Executives reviewing platform growth metrics
 * - Product managers deciding which features to invest in
 * - Operations monitoring system health
 *
 * DATE RANGE OPTIONS:
 * ------------------
 * - period=24h: Last 24 hours (real-time monitoring)
 * - period=7d: Last 7 days (weekly trends)
 * - period=30d: Last 30 days (monthly metrics)
 * - period=90d: Last 90 days (quarterly review)
 * - OR custom: startDate=2026-01-01&endDate=2026-01-31
 *
 * @query {string} period - Time period (24h, 7d, 30d, 90d) default: 7d
 * @query {string} startDate - Custom start date (ISO format)
 * @query {string} endDate - Custom end date (ISO format)
 * @returns {Object} Overview with events, users, features, trends
 */
router.get('/overview', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    // Extract date range parameters
    const { startDate, endDate, period = '7d' } = req.query;

    // =============================================================================
    // STEP 1: Determine Date Range for Query
    // =============================================================================
    // Support two approaches: custom dates OR predefined period
    let start, end;
    if (startDate && endDate) {
      // Custom date range (user specified exact start/end)
      start = new Date(startDate);
      end = new Date(endDate);
    } else {
      // Predefined period (calculate range based on today)
      end = new Date();  // Now
      start = new Date();  // Also now, but we'll subtract time below

      switch (period) {
        case '24h':
          // Real-time monitoring: last 24 hours
          start.setHours(start.getHours() - 24);
          break;
        case '7d':
          // Weekly trends: last 7 days (default)
          start.setDate(start.getDate() - 7);
          break;
        case '30d':
          // Monthly metrics: last 30 days
          start.setDate(start.getDate() - 30);
          break;
        case '90d':
          // Quarterly review: last 90 days
          start.setDate(start.getDate() - 90);
          break;
        default:
          // Unknown period, default to 7 days
          start.setDate(start.getDate() - 7);
      }
    }

    // =============================================================================
    // STEP 2: Fetch Analytics Overview From Service
    // =============================================================================
    // The service queries the analytics database and calculates summaries
    // (total events, active users, top features, etc) for the time range
    const overview = await analyticsService.getOverview(start, end);

    // =============================================================================
    // STEP 3: Return Analytics Overview to Admin
    // =============================================================================
    // Return the time period queried plus all analytics data
    res.json({
      success: true,
      data: {
        period: { start, end },  // The date range that was analyzed
        ...overview              // All analytics metrics (spread operator unpacks overview object)
      }
    });
  } catch (error) {
    // Error handling
    next(error);
  }
});

/**
 * GET /analytics/features
 * Get detailed feature-by-feature analytics
 *
 * This endpoint breaks down analytics by feature to answer:
 * - Which features do users engage with most?
 * - Which features have low engagement (might need redesign)?
 * - Are features trending up or down?
 * - How much time do users spend in each feature?
 *
 * EXAMPLE USES:
 * -----------
 * - Product team analyzing notes feature adoption
 * - Finding underused features to deprecate or redesign
 * - Understanding which feature combinations users prefer
 *
 * @query {string} feature - Optional: filter to specific feature only
 * @query {string} period - Time period (24h, 7d, 30d, 90d) default: 7d
 * @query {string} startDate - Custom start date
 * @query {string} endDate - Custom end date
 * @returns {Object} Analytics grouped by feature
 */
router.get('/features', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    // Extract parameters
    const { startDate, endDate, period = '7d', feature } = req.query;

    // Parse date range (same pattern as /overview endpoint)
    let start, end;
    if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
    } else {
      end = new Date();
      start = new Date();

      switch (period) {
        case '24h':
          start.setHours(start.getHours() - 24);
          break;
        case '7d':
          start.setDate(start.getDate() - 7);
          break;
        case '30d':
          start.setDate(start.getDate() - 30);
          break;
        case '90d':
          start.setDate(start.getDate() - 90);
          break;
        default:
          start.setDate(start.getDate() - 7);
      }
    }

    // Get feature-level analytics (optionally filtered to one feature)
    const analytics = await analyticsService.getFeatureAnalytics(start, end, feature || null);

    res.json({
      success: true,
      data: {
        period: { start, end },
        ...analytics  // Feature breakdown data
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /analytics/users
 * Get user engagement and retention analytics
 *
 * This endpoint shows how users are engaging with the platform:
 * - Active users (total and daily)
 * - New users (sign-ups, adoption)
 * - User retention (coming back next day/week/month)
 * - User segments (power users vs casual users)
 * - Churn metrics (users leaving the platform)
 *
 * RETENTION METRICS:
 * ----------------
 * - Day 1 retention: % of new users who return next day
 * - Day 7 retention: % of new users who return after 7 days
 * - Monthly retention: % of new users still active 30 days later
 * - Cohort analysis: Group users by signup date, track retention
 *
 * WHY IT MATTERS:
 * ---------------
 * - Retention is the best predictor of long-term success
 * - A 50% retention drop signals a major UX problem
 * - Cohort trends show if you're getting better at retention
 *
 * @query {string} period - Time period (24h, 7d, 30d, 90d) default: 7d
 * @query {string} startDate - Custom start date
 * @query {string} endDate - Custom end date
 * @returns {Object} User metrics and retention cohorts
 */
router.get('/users', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    // Extract parameters
    const { startDate, endDate, period = '7d' } = req.query;

    // Parse date range
    let start, end;
    if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
    } else {
      end = new Date();
      start = new Date();

      switch (period) {
        case '24h':
          start.setHours(start.getHours() - 24);
          break;
        case '7d':
          start.setDate(start.getDate() - 7);
          break;
        case '30d':
          start.setDate(start.getDate() - 30);
          break;
        case '90d':
          start.setDate(start.getDate() - 90);
          break;
        default:
          start.setDate(start.getDate() - 7);
      }
    }

    // Fetch user analytics and retention metrics in parallel for efficiency
    // Promise.all runs both queries concurrently (faster than sequential)
    const [userAnalytics, retentionMetrics] = await Promise.all([
      analyticsService.getUserAnalytics(start, end),    // Active users, growth
      analyticsService.getRetentionMetrics(start, end)  // Retention cohorts
    ]);

    res.json({
      success: true,
      data: {
        period: { start, end },
        ...userAnalytics,              // User counts and engagement
        retention: retentionMetrics    // Retention by cohort
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /analytics/errors
 * Get system error analytics and trends
 *
 * This endpoint tracks server-side errors to identify:
 * - Error spikes (sudden increase = emergency)
 * - Most common error types (what's breaking?)
 * - Which endpoints have the most errors
 * - Error trends over time (is stability improving?)
 *
 * ERROR CATEGORIES:
 * ----------------
 * - 4xx errors: Client errors (bad requests, auth failures)
 * - 5xx errors: Server errors (bugs, database failures)
 *
 * ALARM THRESHOLDS:
 * ----------------
 * - > 1% error rate = investigate immediately
 * - > 5% error rate = emergency, possible outage
 * - Errors in critical endpoints (auth, notes) need priority
 *
 * @query {string} period - Time period (24h, 7d, 30d) default: 7d
 * @returns {Object} Error counts, trends, top errors
 */
router.get('/errors', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    // Extract period parameter
    const { period = '7d' } = req.query;

    // Calculate date range
    const end = new Date();
    const start = new Date();

    switch (period) {
      case '24h':
        // Real-time: last 24 hours
        start.setHours(start.getHours() - 24);
        break;
      case '7d':
        // Weekly: last 7 days (default)
        start.setDate(start.getDate() - 7);
        break;
      case '30d':
        // Monthly: last 30 days
        start.setDate(start.getDate() - 30);
        break;
      default:
        // Unknown period, default to 7 days
        start.setDate(start.getDate() - 7);
    }

    // Fetch error analytics from service
    const errors = await analyticsService.getErrorAnalytics(start, end);

    res.json({
      success: true,
      data: {
        period: { start, end },
        errors  // Error counts, trends, top endpoints
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /analytics/realtime
 * Get real-time analytics dashboard (last hour only)
 *
 * This endpoint shows what's happening RIGHT NOW on the platform.
 * Admins use this to monitor live activity:
 * - Is the platform being used? (total events, active users)
 * - Are there any problems? (error spikes, slow responses)
 * - What are users doing? (most recent events)
 *
 * REAL-TIME INSIGHTS:
 * ------------------
 * - Total events in last hour: Is there activity?
 * - Active users in last hour: How many people online?
 * - Recent events: What did they just do?
 *
 * USE CASES:
 * ---------
 * - Monitoring during launch day (is it working?)
 * - After deploying new feature (are users trying it?)
 * - Incident response (when did the errors start?)
 * - Watching user behavior live (for support/debugging)
 *
 * @returns {Object} { totalEvents, activeUsers, recentEvents }
 */
router.get('/realtime', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    // =============================================================================
    // STEP 1: Get Time Range (Last Hour Only)
    // =============================================================================
    // Realtime means the last 60 minutes, not configurable
    const end = new Date();  // Now
    const start = new Date();
    start.setHours(start.getHours() - 1);  // One hour ago

    // =============================================================================
    // STEP 2: Query for Three Key Real-Time Metrics
    // =============================================================================
    // Use Promise.all to fetch all metrics in parallel (faster)
    const [
      totalEvents,      // Total number of events tracked
      activeUsers,      // List of unique user IDs who were active
      recentEvents      // Last 20 events (what just happened)
    ] = await Promise.all([
      // Count total events in the last hour
      AnalyticsEvent.countDocuments({
        timestamp: { $gte: start, $lte: end }
      }),

      // Get distinct user IDs who created events in the last hour
      // This gives us the count of currently active users
      AnalyticsEvent.distinct('userId', {
        timestamp: { $gte: start, $lte: end },
        userId: { $ne: null }  // Exclude anonymous/null users
      }),

      // Get the 20 most recent events for the live feed
      // Only select fields we need (not full event data)
      AnalyticsEvent.find({
        timestamp: { $gte: start, $lte: end }
      })
        .sort({ timestamp: -1 })  // Most recent first
        .limit(20)  // Top 20 events
        .select('category action feature page timestamp userId')  // Minimal fields
        .lean()  // Return plain JavaScript objects (faster than Mongoose documents)
    ]);

    // =============================================================================
    // STEP 3: Return Real-Time Data
    // =============================================================================
    res.json({
      success: true,
      data: {
        period: { start, end },           // Time range (always last 1 hour)
        totalEvents,                      // Total event count
        activeUsers: activeUsers.length,  // Number of unique active users
        recentEvents                      // Most recent 20 events (live feed)
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
