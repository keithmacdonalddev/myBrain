/**
 * =============================================================================
 * DASHBOARD.JS - Dashboard API Routes
 * =============================================================================
 *
 * This file defines the API endpoints for the intelligent dashboard feature.
 * The main endpoint aggregates all dashboard data in a single request.
 *
 * ENDPOINTS:
 * ----------
 * GET /dashboard          - Get all dashboard data (aggregated)
 * POST /dashboard/session - Track a dashboard session/visit
 *
 * =============================================================================
 */

/**
 * Express is the web framework that handles HTTP requests and routing.
 * We use it to define API endpoints (URLs that the frontend can call).
 * Each router.get/post defines a different dashboard operation.
 */
import express from 'express';

/**
 * Auth middleware checks that the user is logged in.
 * Every dashboard request must include a valid JWT token in the Authorization header.
 * If not, the request is rejected with a 401 Unauthorized response.
 */
import { requireAuth } from '../middleware/auth.js';

/**
 * Request logger middleware tracks entity IDs and event names for analytics.
 * When we attach an entity ID, it lets us search logs for dashboard activity.
 * Example: attachEntityId(req, 'userId', req.user._id) for usage tracking.
 */
import { attachEntityId } from '../middleware/requestLogger.js';

/**
 * Dashboard service contains the core logic for aggregating dashboard data.
 * Instead of building queries in this route file, we call getDashboardData()
 * which handles:
 * - Fetching urgent items (overdue tasks, upcoming events)
 * - Fetching attention items (unread messages, notifications)
 * - Fetching recent items (new notes, tasks, projects)
 * - Calculating completion stats
 * - Getting user preferences
 * - All in a single optimized query
 */
import { getDashboardData } from '../services/dashboardService.js';

/**
 * Usage service tracks when users access the app.
 * Used for analytics and understanding which features users engage with.
 * We call trackSession() when dashboard is viewed for usage statistics.
 */
import { trackSession } from '../services/usageService.js';

// =============================================================================
// ROUTER SETUP
// =============================================================================
// Create an Express router to group all dashboard-related endpoints together
const router = express.Router();

// =============================================================================
// ROUTE: GET /dashboard
// =============================================================================

/**
 * GET /dashboard
 * Get all dashboard data (aggregated in single request)
 *
 * PURPOSE:
 * Returns all data needed to render the intelligent dashboard in one request.
 * Combines data from multiple sources (tasks, notes, messages, projects, events)
 * into a single optimized response structure optimized for performance.
 *
 * DATA AGGREGATED:
 * - Urgent items: Overdue tasks, due today, upcoming events in next 24 hours
 * - Attention items: Unread messages, pending shares, unread notifications
 * - Recent items: Recently created/modified notes, tasks, projects
 * - Usage profile: What features user engages with most (for recommendations)
 * - Events: Today's and tomorrow's calendar events
 * - Tasks: Priority tasks (critical/high priority)
 * - Projects: Active projects user is working on
 * - Messages: Recent unread messages and conversations
 * - Inbox: Unprocessed notes needing organization
 * - Notifications: Unread notifications from other users/system
 * - Shared items: Content shared with user by others
 * - Activity: Recent activity feed from connections
 * - Stats: Completion rates, productivity metrics, trends
 * - Preferences: User's widget preferences (pinned, hidden, settings)
 *
 * WHY AGGREGATE EVERYTHING?
 * - Reduces network requests (1 request instead of 10+)
 * - Faster dashboard load time (parallel queries in service layer)
 * - Consistent data snapshot (all data from same timestamp)
 * - Easier to implement caching on frontend
 *
 * TIMEZONE SUPPORT:
 * All date calculations respect user's timezone to show:
 * - "Due Today" based on user's local date (not UTC)
 * - "This Week" boundaries correct for user's timezone
 * - "Tomorrow" events in user's timezone
 *
 * @query {string} timezone - User's timezone for date calculations (default: 'UTC')
 *   Supported: Any IANA timezone (America/New_York, Europe/London, Asia/Tokyo, etc)
 *   Example: timezone=America/New_York
 *   Used to calculate "today", "tomorrow", "this week" correctly
 *
 * @returns {Object} - Complete dashboard data:
 * {
 *   urgentItems: {
 *     overdueTasks: [{ _id, title, dueDate, priority, project }],
 *     dueTodayTasks: [{ _id, title, dueDate, priority, project }],
 *     upcomingEvents: [{ _id, title, startTime, endTime, location }],
 *     counts: { overdue: number, today: number, upcoming: number }
 *   },
 *   attentionItems: {
 *     unreadMessages: number,
 *     pendingShares: number,
 *     unreadNotifications: number,
 *     total: number
 *   },
 *   recentItems: {
 *     notes: [{ _id, title, snippet, updatedAt }],
 *     tasks: [{ _id, title, status, dueDate, project }],
 *     projects: [{ _id, name, status, taskCount, progress }]
 *   },
 *   usageProfile: {
 *     tasks: number (percentage),
 *     notes: number,
 *     projects: number,
 *     messages: number,
 *     events: number
 *   },
 *   events: {
 *     today: [{ _id, title, startTime, endTime }],
 *     tomorrow: [{ _id, title, startTime, endTime }]
 *   },
 *   stats: {
 *     tasks: { total: number, completed: number, completionRate: number },
 *     projects: { active: number, completed: number }
 *   },
 *   preferences: {
 *     pinnedWidgets: [string],
 *     hiddenWidgets: [string],
 *     widgetSettings: {}
 *   },
 *   timestamp: "2025-02-15T10:30:00.000Z"
 * }
 *
 * @throws {401} - User not authenticated
 * @throws {500} - Server error fetching dashboard data
 *
 * EXAMPLE REQUEST:
 * GET /dashboard?timezone=America/New_York
 * Authorization: Bearer <JWT_TOKEN>
 *
 * EXAMPLE RESPONSE:
 * {
 *   "urgentItems": {
 *     "overdueTasks": [
 *       { "title": "Fix critical bug", "dueDate": "2025-02-10", "priority": "high" }
 *     ],
 *     "dueTodayTasks": [
 *       { "title": "Meeting prep", "dueDate": "2025-02-15", "priority": "normal" },
 *       { "title": "Send report", "dueDate": "2025-02-15", "priority": "low" }
 *     ],
 *     "upcomingEvents": [
 *       { "title": "Team standup", "startTime": "10:00 AM", "endTime": "10:30 AM" }
 *     ],
 *     "counts": { "overdue": 1, "today": 2, "upcoming": 1 }
 *   },
 *   "attentionItems": {
 *     "unreadMessages": 5,
 *     "pendingShares": 2,
 *     "unreadNotifications": 7,
 *     "total": 14
 *   },
 *   "stats": {
 *     "tasks": { "total": 47, "completed": 23, "completionRate": 49 },
 *     "projects": { "active": 5, "completed": 12 }
 *   },
 *   "timestamp": "2025-02-15T10:30:00.000Z"
 * }
 *
 * PERFORMANCE NOTES:
 * - Dashboard service runs multiple queries in parallel (Promise.all)
 * - Typical response time: 200-500ms for normal user loads
 * - Recommended frontend caching: 30-60 seconds (reduce polling overhead)
 * - Use WebSocket for real-time updates of critical items (urgent tasks, messages)
 *
 * CACHING STRATEGY:
 * - Frontend should cache response for 30-60 seconds
 * - User can manually refresh to get latest data
 * - Use polling (every 60s) for updates instead of WebSocket for simplicity
 * - WebSocket can be used for real-time updates of high-priority items
 *
 * WIDE EVENTS LOGGING:
 * - Event name: 'dashboard.view' - tracks dashboard access
 * - User ID attached for analytics
 * - Used to understand which users actively use dashboard feature
 */
router.get('/', requireAuth, async (req, res, next) => {
  try {
    // =============================================================================
    // STEP 1: Extract and Validate Query Parameters
    // =============================================================================
    // Timezone is optional (defaults to UTC if not provided)
    // Used to calculate "today", "tomorrow", "this week" in user's local timezone
    const { timezone = 'UTC' } = req.query;

    // =============================================================================
    // STEP 2: Aggregate Dashboard Data
    // =============================================================================
    // Call dashboard service to fetch and organize all dashboard data
    // Service handles:
    // - Running multiple queries in parallel for performance
    // - Organizing data into dashboard structure
    // - Respecting user's timezone for date calculations
    // - Applying user's widget preferences
    const dashboardData = await getDashboardData(req.user._id, { timezone });

    // =============================================================================
    // STEP 3: Log Dashboard View for Usage Analytics
    // =============================================================================
    // Track which users actively use the dashboard (for feature adoption metrics)
    attachEntityId(req, 'userId', req.user._id);
    // Set event name for Wide Events logging system
    req.eventName = 'dashboard.view';
    // Optional: track timezone for understanding geographic/timezone distribution
    req.mutation = {
      after: {
        timezone: timezone,
        itemCounts: {
          urgentTasks: dashboardData.urgentItems?.overdueTasks?.length || 0,
          attentionItems: dashboardData.attentionItems?.total || 0
        }
      }
    };

    // =============================================================================
    // STEP 4: Return Complete Dashboard Data
    // =============================================================================
    // Send the aggregated dashboard data to frontend
    res.json(dashboardData);

  } catch (error) {
    // =============================================================================
    // ERROR HANDLING
    // =============================================================================
    // Log error details for debugging
    console.error('Dashboard fetch error:', error);

    // Pass error to error handler middleware for consistent formatting
    next(error);
  }
});

// =============================================================================
// ROUTE: POST /dashboard/session
// =============================================================================

/**
 * POST /dashboard/session
 * Track user dashboard session/visit
 *
 * PURPOSE:
 * Tracks that the user has opened/returned to the dashboard.
 * Records when user last accessed the app for metrics like:
 * - Daily Active Users (DAU) - how many users used app today?
 * - Session counts - total sessions per user
 * - Last seen timestamp - when was user last active?
 * - Activity frequency - is engagement increasing or decreasing?
 *
 * USAGE TRACKING FOR:
 * - Usage analytics: How often do users access dashboard?
 * - Activity tracking: When did user last use the app? (for recommendations)
 * - Engagement metrics: DAU, session count, retention
 * - Churn detection: Users who stop using dashboard might be churning
 * - Feature adoption: Which users actively use dashboard vs other features?
 *
 * WHEN TO CALL:
 * - When user opens the app (first dashboard view of session)
 * - When user returns to dashboard from another feature
 * - Once per session (batch or throttle to avoid excessive logs)
 * - NOT on every dashboard refresh (that would create noise)
 *
 * GRACEFUL DEGRADATION:
 * - This endpoint never fails with 5xx errors (analytics should not break user experience)
 * - Even if session tracking fails, response is still 200 OK
 * - Errors logged to console but don't affect user experience
 * - Frontend should not show error UI if session tracking fails
 *
 * @returns {Object} - Success message:
 * {
 *   "message": "Session tracked"
 * }
 *
 * @throws - Does NOT throw errors (graceful degradation)
 *   Even if tracking fails, still returns 200 OK
 *   Frontend should never display error UI for session tracking
 *
 * EXAMPLE REQUEST:
 * POST /dashboard/session
 * Authorization: Bearer <JWT_TOKEN>
 *
 * EXAMPLE RESPONSE:
 * {
 *   "message": "Session tracked"
 * }
 *
 * PERFORMANCE NOTES:
 * - Call once per session, not on every dashboard refresh
 * - Throttle to avoid excessive logging (e.g., max once per 5 minutes)
 * - Backend handles deduplication (same userId + sessionId = one session)
 * - Should complete in <100ms
 *
 * RECOMMENDATION:
 * - Call this endpoint when user opens app or navigates back to dashboard
 * - Don't call on every dashboard refresh (batch calls or throttle calls)
 * - Batch multiple calls if tracking many events at once
 * - Frontend should not retry this endpoint if it fails (graceful degradation)
 *
 * WIDE EVENTS LOGGING:
 * - Event name: 'dashboard.session' - marks session/visit
 * - User ID attached for tracking active users
 * - Used to calculate DAU and engagement metrics
 * - Soft error handling - never impacts user experience even if logging fails
 */
router.post('/session', requireAuth, async (req, res, next) => {
  try {
    // =============================================================================
    // STEP 1: Track User Session Activity
    // =============================================================================
    // Call usage service to update user's session information:
    // - Updates lastSeenAt timestamp (when user last accessed app)
    // - Increments sessionCount (total number of times user accessed)
    // - Records session metadata (duration, features used, etc)
    // Service handles deduplication (avoids double-counting same session)
    await trackSession(req.user._id);

    // =============================================================================
    // STEP 2: Log Session Event for Analytics
    // =============================================================================
    // Attach user ID for audit trail and analytics
    attachEntityId(req, 'userId', req.user._id);
    // Set event name for Wide Events logging system
    req.eventName = 'dashboard.session';

    // =============================================================================
    // STEP 3: Return Success Message
    // =============================================================================
    // Return success confirmation to client
    // Frontend can use this to verify session was tracked
    res.json({ message: 'Session tracked' });

  } catch (error) {
    // =============================================================================
    // ERROR HANDLING - GRACEFUL DEGRADATION
    // =============================================================================
    // This is critical: Analytics/tracking should NEVER break user experience
    // WHY: User opening the dashboard should work even if metrics fail

    // Log error to console for debugging
    // Admins can check logs to see if tracking is failing silently
    console.error('Dashboard session tracking error:', error.message);

    // =============================================================================
    // GRACEFUL ERROR RESPONSE
    // =============================================================================
    // Still return 200 OK to client (not 500)
    // WHY: Frontend shouldn't show error UI for session tracking failures
    // Analytics failures should be invisible to users
    res.json({ message: 'Session tracked' });

    // Still log to error handler for monitoring (but don't fail the response)
    // This allows admins to see tracking failures without breaking UX
    // Attach error for logging but don't call next(error) as that would fail the request
    req.error = error;
  }
});

export default router;
